// Envio HyperSync stream wiring for the market radar. Fails closed without a token:
// Envio's HyperSync endpoints require an API token (verified 2026-10-11 — the client
// rejects construction without `apiToken` and the endpoint answers 401 anonymously).
//
// Durability (operator-corrected): every decoded event is journaled (append-only) with
// its block identity; the snapshot (cursor + full aggregator state) is atomically
// replaced after each batch. Resume replays from the snapshot cursor; duplicate
// deliveries are idempotent by event id; decode failures are COUNTED (never silently
// discarded); reorg detection compares the snapshot's anchor block hash against the
// chain and falls back to a conservative full replay on mismatch.
import { decodeEventLog, type Hex } from 'viem';
// Relative import keeps this integration standalone (not a pnpm workspace member) so
// installing its deps never triggers a root-wide install that would write into apps/web.
import { indexerAbi } from '../../../packages/launchpad-sdk/src/events.ts';
import { RadarAggregator, type RadarEvent, type RadarMetrics } from './radar.ts';
import { appendJournal, loadState, resolveResume, writeSnapshot, STATE_SCHEMA_VERSION, type JournalRecord, type SnapshotState } from './journal.ts';

export const MONAD_TESTNET_HYPERSYNC = 'https://10143.hypersync.xyz';

export interface RadarStreamOptions {
  url?: string;
  /** Required. Create one at envio.dev (operator action — see EXTERNAL-BLOCKERS). */
  apiToken: string;
  factory: string;
  /** Kuru market addresses to watch (market → token map for lifecycle join). */
  marketTokens: Record<string, string>;
  fromBlock: number;
  chainId: number;
  deployment: string;
  /** Durable state directory (journal + snapshot). */
  stateDir: string;
  onMetrics?: (metrics: RadarMetrics & { cursorBlock: number }) => void;
}

export interface RadarStream {
  aggregator: RadarAggregator;
  /** Current processing cursor (next block to read). */
  cursor(): number;
  /** Resolves when the consumer stops it or the stream ends. */
  run(): Promise<void>;
  stop(): void;
}

interface MinimalClient {
  stream: (query: unknown, options?: unknown) => AsyncIterable<{ data?: { blocks?: Array<{ number?: number; timestamp?: number; hash?: string }>; logs?: Array<{ address?: string; blockNumber?: number; logIndex?: number; transactionHash?: string; data?: string; topics?: string[] }> } }>;
  getHeight: () => Promise<number>;
  getBlockHash?: (block: number) => Promise<string | null>;
  destroy?: () => Promise<void>;
}

/** BigInt-aware JSON for snapshot state. */
function snapshotJson(state: unknown): string {
  return JSON.stringify(state, (_, v) => (typeof v === 'bigint' ? v.toString() : v));
}
/** Restore bigint fields inside persisted market state (best-effort, schema-known keys). */
function reviveAggregator(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.markets)) {
    obj.markets = obj.markets.map((m) => {
      const mm = m as Record<string, unknown>;
      for (const k of ['filledBaseUnits', 'quoteVolume18']) if (typeof mm[k] === 'string') mm[k] = BigInt(mm[k] as string);
      return mm;
    });
  }
  return obj;
}

export async function createRadarStream(options: RadarStreamOptions, clientFactory?: (url: string, token: string) => Promise<MinimalClient>): Promise<RadarStream> {
  if (!options.apiToken) throw Error('Envio HyperSync requires an API token (ENVIO_API_TOKEN). Get one at envio.dev; see docs/metropolis/execution/EXTERNAL-BLOCKERS.md.');
  const url = options.url ?? MONAD_TESTNET_HYPERSYNC;
  const makeClient = clientFactory ?? (async () => {
    const { HypersyncClient } = await import('@envio-dev/hypersync-client');
    return new HypersyncClient({ url, apiToken: options.apiToken }) as unknown as MinimalClient;
  });
  const client = await makeClient(url, options.apiToken);

  // ---- durability resume ----
  const loaded = loadState(options.stateDir);
  let fromBlock = options.fromBlock;
  let journalLines = loaded.snapshot?.counters.journalLines ?? 0;
  let decodeErrors = loaded.snapshot?.counters.decodeErrors ?? 0;
  let replays = loaded.snapshot?.counters.replays ?? 0;
  if (loaded.snapshot) {
    const resume = await resolveResume(loaded.snapshot, async (block) => {
      try { return await client.getBlockHash?.(block) ?? null; } catch { return null; }
    }, options.fromBlock);
    fromBlock = resume.fromBlock;
    if (resume.reorged) replays++;
  }
  const aggregator = loaded.snapshot
    ? RadarAggregator.restore(reviveAggregator(loaded.snapshot.aggregator) as never, options.marketTokens)
    : new RadarAggregator(options.marketTokens);
  let cursorBlock = fromBlock;

  const addresses = [options.factory, ...Object.keys(options.marketTokens)].map((a) => a.toLowerCase());
  let stopped = false;
  let lastAnchor: { block: number; hash: string } | null = loaded.snapshot
    ? { block: loaded.snapshot.checkpoint.anchorBlock, hash: loaded.snapshot.checkpoint.anchorBlockHash }
    : null;

  const persist = (headHeight: number) => {
    const state: SnapshotState = {
      schemaVersion: STATE_SCHEMA_VERSION,
      chainId: options.chainId,
      deployment: options.deployment,
      checkpoint: { cursorBlock, anchorBlock: lastAnchor?.block ?? Math.max(0, cursorBlock - 1), anchorBlockHash: lastAnchor?.hash ?? '', ts: Date.now() },
      aggregator: aggregator.persist(),
      counters: { journalLines, decodeErrors, replays },
    };
    writeSnapshot(options.stateDir, state);
    aggregator.observeHead(Math.max(headHeight, cursorBlock));
  };

  return {
    aggregator,
    cursor: () => cursorBlock,
    stop() { stopped = true; void client.destroy?.(); },
    async run() {
      const stream = client.stream({
        fromBlock,
        logs: [{ address: addresses, topics: [[]] }],
        fieldSelection: {
          log: ['address', 'block_number', 'log_index', 'transaction_hash', 'data', 'topics'],
          block: ['number', 'timestamp', 'hash'],
        },
      });
      for await (const message of stream) {
        if (stopped) break;
        const logs = message.data?.logs ?? [];
        const blocks = message.data?.blocks ?? [];
        const blockTimestamps = new Map<number, number>();
        const blockHashes = new Map<number, string>();
        for (const block of blocks) {
          if (block.number !== undefined && block.timestamp !== undefined) blockTimestamps.set(Number(block.number), Number(block.timestamp));
          if (block.number !== undefined && block.hash) blockHashes.set(Number(block.number), block.hash);
        }
        const events: RadarEvent[] = [];
        const journalBatch: JournalRecord[] = [];
        for (const log of logs) {
          const blockNumber = Number(log.blockNumber ?? 0);
          try {
            const decoded = decodeEventLog({ abi: indexerAbi, data: (log.data ?? '0x') as Hex, topics: (log.topics ?? []) as [Hex, ...Hex[]] });
            if (!decoded.eventName) continue;
            events.push({
              name: decoded.eventName,
              address: (log.address ?? '').toLowerCase(),
              blockNumber,
              blockTimestamp: blockTimestamps.get(blockNumber) ?? 0,
              logIndex: Number(log.logIndex ?? 0),
              transactionHash: log.transactionHash ?? '',
              args: decoded.args as Record<string, unknown>,
            });
          } catch {
            // Decode failures are COUNTED and journaled as errors — never silent.
            aggregator.recordDecodeError();
            decodeErrors++;
          }
        }
        const { accepted } = aggregator.ingest(events);
        journalLines += accepted;
        for (const e of events) {
          journalBatch.push({ id: `${e.blockNumber}:${e.logIndex}:${e.transactionHash}`, blockNumber: e.blockNumber, blockHash: blockHashes.get(e.blockNumber) ?? '', name: e.name, ts: Date.now() });
        }
        appendJournal(options.stateDir, journalBatch);
        // Advance cursor + anchor to the newest observed block identity.
        for (const [number, hash] of blockHashes) {
          if (number >= cursorBlock) { cursorBlock = number + 1; lastAnchor = { block: number, hash }; }
        }
        let head = cursorBlock;
        try { head = Number(await client.getHeight()); } catch { /* informational */ }
        aggregator.observeHead(head);
        persist(head);
        const snap = aggregator.snapshot();
        options.onMetrics?.({ ...snap, freshness: { ...snap.freshness, cursorBlock } });
      }
    },
  };
}
