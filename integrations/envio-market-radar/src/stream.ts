// Envio HyperSync stream for the market radar — written against the INSTALLED
// @envio-dev/hypersync-client 1.4.1 typings (index.d.ts):
//   * FieldSelection uses PascalCase enums: BlockField 'Number'|'Hash'|'ParentHash'|'Timestamp',
//     LogField 'Address'|'BlockNumber'|'LogIndex'|'TransactionHash'|'BlockHash'|'Data'|'Topic0..3'|'Removed'
//     (there is no 'topics' field; the response Log.topics array is filled from Topic0..3).
//   * client.stream(query, config) → Promise<QueryResponseStream>; consume with recv() until null, then close().
//   * QueryResponse.nextBlock is the pagination cursor (advances on empty batches too);
//     rollbackGuard {blockNumber, hash, firstBlockNumber, firstParentHash} detects rollbacks.
//   * The client has no getBlockHash; a single-block get({includeAllBlocks}) is used instead,
//     with an optional read-only RPC fallback.
// Fails closed without a token or when the endpoint's chain id is not the configured one.
import { decodeEventLog, toEventSelector, type Hex } from 'viem';
import type { Query, QueryResponse, StreamConfig } from '@envio-dev/hypersync-client';
// Relative import keeps this integration standalone (not a pnpm workspace member).
import { indexerAbi } from '../../../packages/launchpad-sdk/src/events.ts';
import { RadarAggregator, eventId, bytes32ToAddress, type RadarEvent, type RadarMetrics, type VerifiedMarketParams } from './radar.ts';
import { marketParamsReader } from './market-params.ts';
import {
  appendJournal, findForkBlock, loadSnapshot, readJournal, resetState, rewriteJournal, ringGet, ringPut, sameIdentity,
  writeSnapshot, STATE_SCHEMA_VERSION, type Identity, type JournalEvent, type SnapshotState,
} from './journal.ts';

export const MONAD_TESTNET_HYPERSYNC = 'https://10143.hypersync.xyz';
export const DEFAULT_COORDINATOR = '0xaD62309242EA65BB07C833669EC6a4ED23AF738F';
const KURU_EVENTS = new Set(['Trade', 'OrderCreated', 'OrderCanceled', 'OrdersCanceled']);
const RELEVANT = new Set(['TokenLaunched', 'LaunchCommitted', 'GraduationSecured', 'GraduationCompleted', ...KURU_EVENTS]);

export const LOG_FIELDS = ['Address', 'BlockNumber', 'LogIndex', 'TransactionHash', 'BlockHash', 'Data', 'Topic0', 'Topic1', 'Topic2', 'Topic3', 'Removed'] as const;
export const BLOCK_FIELDS = ['Number', 'Hash', 'ParentHash', 'Timestamp'] as const;

export interface ResponseStream { recv(): Promise<QueryResponse | null>; close(): Promise<void> }
export interface HyperClient {
  getChainId(): Promise<number>;
  getHeight(): Promise<number>;
  get(query: Query): Promise<QueryResponse>;
  stream(query: Query, config: StreamConfig): Promise<ResponseStream>;
}

export interface RadarStreamOptions {
  url?: string;
  apiToken: string;
  factory: string;
  coordinator?: string;
  /** Optional bootstrap market → token map; GraduationCompleted is authoritative. */
  marketTokens: Record<string, string>;
  fromBlock: number;
  chainId: number;
  deployment: string;
  stateDir: string;
  /** Read-only JSON-RPC used only as a block-hash fallback. */
  rpcUrl?: string;
  /** Injectable read-only resolver for deterministic tests. Failures leave amounts null. */
  readMarketParams?: (market: string, token: string) => Promise<VerifiedMarketParams | null>;
  pollMs?: number;
  /** Explicit operator choice: discard state whose identity differs instead of refusing. */
  resetOnIdentityMismatch?: boolean;
  log?: (msg: string) => void;
}

export interface RadarStatus {
  cursorBlock: number;
  anchorVerified: boolean;
  lastError: string | null;
  lastErrorAt: number | null;
  lastBatchAt: number | null;
  recovery: string;
  counters: SnapshotState['counters'];
  journalCount: number;
}

export interface RadarStream {
  aggregator(): RadarAggregator;
  cursor(): number;
  status(): RadarStatus;
  metrics(): RadarMetrics;
  /** Process one stream session (until the stream ends at head, a reorg, or stop()). Exposed for tests. */
  runOnce(): Promise<'end' | 'reorg' | 'stopped'>;
  run(): Promise<void>;
  stop(): void;
}

/** Block timestamps arrive as number seconds; tolerate bigint / hex / ms defensively. */
export function normalizeTimestamp(value: unknown): number {
  if (value === undefined || value === null) return 0;
  let n: number;
  if (typeof value === 'bigint') n = Number(value);
  else if (typeof value === 'string') n = value.startsWith('0x') ? Number(BigInt(value)) : Number(value);
  else n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n > 1e12 ? Math.floor(n / 1000) : Math.floor(n);
}

const kuruTopics = [...new Set(indexerAbi.filter((e) => e.type === 'event' && KURU_EVENTS.has(e.name)).map((e) => toEventSelector(e as never)))];

export function buildQuery(fromBlock: number, addresses: string[]): Query {
  return {
    fromBlock,
    logs: [{ address: addresses }, { topics: [kuruTopics] }],
    fieldSelection: { log: [...LOG_FIELDS], block: [...BLOCK_FIELDS] },
  } as Query;
}

async function rpcBlockHash(rpcUrl: string, block: number): Promise<string | null> {
  const r = await fetch(rpcUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBlockByNumber', params: ['0x' + block.toString(16), false] }), signal: AbortSignal.timeout(8000) });
  const j = await r.json() as { result?: { hash?: string } | null };
  return j.result?.hash ?? null;
}

export async function createRadarStream(options: RadarStreamOptions, clientFactory?: (url: string, token: string) => Promise<HyperClient>): Promise<RadarStream> {
  if (!options.apiToken) throw Error('Envio HyperSync requires an API token (ENVIO_API_TOKEN).');
  const log = options.log ?? ((m: string) => console.log(`[radar] ${m}`));
  const url = options.url ?? MONAD_TESTNET_HYPERSYNC;
  const client = clientFactory
    ? await clientFactory(url, options.apiToken)
    : await (async () => {
      const { HypersyncClient } = await import('@envio-dev/hypersync-client');
      return new HypersyncClient({ url, apiToken: options.apiToken, httpReqTimeoutMillis: 20_000 }) as unknown as HyperClient;
    })();

  const endpointChain = Number(await client.getChainId());
  if (endpointChain !== options.chainId) throw Error(`HyperSync endpoint chain ${endpointChain} ≠ configured ${options.chainId} — refusing`);

  const identity: Identity = { chainId: options.chainId, deployment: options.deployment, factory: options.factory.toLowerCase(), fromBlock: options.fromBlock };
  const dir = options.stateDir;
  const coordinator = (options.coordinator ?? DEFAULT_COORDINATOR).toLowerCase();
  const addresses = [...new Set([options.factory, coordinator, ...Object.keys(options.marketTokens)].map((a) => a.toLowerCase()))];

  const verify = async (block: number): Promise<string | null> => {
    try {
      const res = await client.get({ fromBlock: block, toBlock: block + 1, includeAllBlocks: true, fieldSelection: { block: ['Number', 'Hash'] } } as Query);
      const hit = res.data?.blocks?.find((b) => Number(b.number) === block)?.hash;
      if (hit) return hit.toLowerCase();
    } catch { /* fall through to RPC */ }
    if (options.rpcUrl) { try { return (await rpcBlockHash(options.rpcUrl, block))?.toLowerCase() ?? null; } catch { /* unavailable */ } }
    return null;
  };

  // ---------------- state ----------------
  let agg: RadarAggregator;
  let cursor = options.fromBlock;
  let ring: Array<[number, string]> = [];
  let journalCount = 0;
  let counters: SnapshotState['counters'] = { decodeErrors: 0, reorgs: 0, rebuilds: 0, removedLogs: 0, foreignLogs: 0 };
  const status = { anchorVerified: false, lastError: null as string | null, lastErrorAt: null as number | null, lastBatchAt: null as number | null, recovery: 'fresh' };
  let stopped = false;
  let active: ResponseStream | null = null;
  const readParams = options.readMarketParams ?? (options.rpcUrl ? marketParamsReader(options.rpcUrl, options.chainId) : async () => null);
  const params = new Map<string, { token: string; value: VerifiedMarketParams | null; checkedAt: number }>();
  const mappings = new Map(Object.entries(options.marketTokens).map(([m, t]) => [m.toLowerCase(), t.toLowerCase()]));

  const qualifyMappings = async (events: RadarEvent[], reset = false) => {
    if (reset) { params.clear(); mappings.clear(); for (const [m, t] of Object.entries(options.marketTokens)) mappings.set(m.toLowerCase(), t.toLowerCase()); }
    for (const e of events) {
      if (e.name !== 'GraduationCompleted') continue;
      const market = bytes32ToAddress(e.args.destination);
      if (market && market !== '0x' + '0'.repeat(40)) mappings.set(market, String(e.args.token).toLowerCase());
    }
    await Promise.all([...mappings].map(async ([market, token]) => {
      const prior = params.get(market);
      if (prior?.token === token && Date.now() - prior.checkedAt < 30_000) return;
      let value: VerifiedMarketParams | null = null;
      try { value = await readParams(market, token); } catch { /* preserve lifecycle availability */ }
      params.set(market, { token, value, checkedAt: Date.now() });
    }));
  };

  const applyParams = (a: RadarAggregator) => {
    for (const [market, entry] of params) a.setMarketParams(market, entry.value);
  };

  const rebuildFrom = async (events: JournalEvent[]) => {
    await qualifyMappings(events, true);
    const a = new RadarAggregator(options.marketTokens);
    applyParams(a);
    a.ingest(events);
    a.recordDecodeError(counters.decodeErrors);
    return a;
  };
  const persist = () => writeSnapshot(dir, { schemaVersion: STATE_SCHEMA_VERSION, identity, cursorBlock: cursor, journalCount, ring, aggregator: agg.persist(), counters, ts: Date.now() });

  /** Roll back to the fork point and rebuild the aggregate from canonical journal events only. */
  const rollback = async (why: string): Promise<boolean> => {
    const fork = await findForkBlock(ring, verify);
    if (fork.unverifiable) { status.lastError = `reorg suspected (${why}) but canonical hashes unavailable — not mutating state`; status.lastErrorAt = Date.now(); return false; }
    const { events } = readJournal(dir);
    const forkBlock = fork.forkBlock ?? options.fromBlock; // deeper than the ring → full replay
    const kept = fork.forkBlock === null ? [] : events.filter((e) => e.blockNumber < forkBlock);
    rewriteJournal(dir, kept);
    journalCount = kept.length;
    counters = { ...counters, reorgs: counters.reorgs + 1 };
    agg = await rebuildFrom(kept);
    ring = ring.filter(([b]) => b < forkBlock);
    cursor = forkBlock;
    persist();
    log(`reorg (${why}): rolled back to block ${forkBlock}, kept ${kept.length}/${events.length} journal events, aggregate rebuilt`);
    return true;
  };

  // ---------------- recovery ----------------
  {
    const { snapshot, previousIdentity, reason } = loadSnapshot(dir);
    const savedIdentity = snapshot?.identity ?? previousIdentity;
    if (savedIdentity && !sameIdentity(savedIdentity, identity)) {
      if (!options.resetOnIdentityMismatch) throw Error(`radar state in ${dir} belongs to ${JSON.stringify(savedIdentity)}, not ${JSON.stringify(identity)} — refusing (set RADAR_RESET_ON_IDENTITY_MISMATCH=1 to discard)`);
      resetState(dir);
      log('identity mismatch: state discarded by explicit operator flag');
    }
    const journal = readJournal(dir);
    const usable = snapshot && sameIdentity(snapshot.identity, identity) && snapshot.journalCount <= journal.events.length ? snapshot : null;
    if (usable) {
      await qualifyMappings(journal.events);
      counters = { ...counters, ...usable.counters };
      agg = RadarAggregator.restore(usable.aggregator as never, options.marketTokens);
      applyParams(agg);
      const tail = journal.events.slice(usable.journalCount);
      agg.ingest(tail); // crash between journal append and snapshot: fold the tail (idempotent)
      ring = usable.ring;
      for (const e of tail) if (e.blockHash) ring = ringPut(ring, e.blockNumber, e.blockHash);
      cursor = Math.max(usable.cursorBlock, ...tail.map((e) => e.blockNumber + 1));
      journalCount = journal.events.length;
      status.recovery = tail.length ? `snapshot+journal-tail(${tail.length})` : 'snapshot';
    } else {
      // Missing/corrupt/foreign snapshot or journal shorter than snapshot → rebuild from journal.
      counters = { ...counters, rebuilds: counters.rebuilds + (journal.events.length ? 1 : 0) };
      agg = await rebuildFrom(journal.events);
      for (const e of journal.events) if (e.blockHash) ring = ringPut(ring, e.blockNumber, e.blockHash);
      cursor = journal.events.length ? Math.max(options.fromBlock, ...journal.events.map((e) => e.blockNumber + 1)) : options.fromBlock;
      journalCount = journal.events.length;
      status.recovery = journal.events.length ? `rebuilt-from-journal(${reason}${journal.tornTail ? ',torn-tail-truncated' : ''})` : 'fresh';
    }
    // Verify the newest recorded block is still canonical before streaming past it.
    const anchor = ring.at(-1);
    if (!anchor) status.anchorVerified = true;
    else {
      const canonical = await verify(anchor[0]);
      if (canonical === null) status.anchorVerified = false;
      else if (canonical === anchor[1]) status.anchorVerified = true;
      else { await rollback('anchor hash mismatch on restart'); status.anchorVerified = true; }
    }
    persist();
    log(`recovered: ${status.recovery}; cursor ${cursor}; journal ${journalCount}; anchorVerified ${status.anchorVerified}`);
  }

  // ---------------- processing ----------------
  const handle = async (res: QueryResponse): Promise<'ok' | 'reorg'> => {
    const blocks = res.data?.blocks ?? [];
    // Rollback detection BEFORE any mutation.
    for (const b of blocks) {
      if (b.number === undefined || !b.hash) continue;
      const known = ringGet(ring, Number(b.number));
      if (known && known !== b.hash.toLowerCase()) { await rollback(`block ${b.number} hash changed`); return 'reorg'; }
      const parent = ringGet(ring, Number(b.number) - 1);
      if (parent && b.parentHash && parent !== b.parentHash.toLowerCase()) { await rollback(`block ${b.number} parent mismatch`); return 'reorg'; }
    }
    const guard = res.rollbackGuard;
    if (guard?.firstParentHash) {
      const parent = ringGet(ring, guard.firstBlockNumber - 1);
      if (parent && parent !== guard.firstParentHash.toLowerCase()) { await rollback(`rollbackGuard parent mismatch at ${guard.firstBlockNumber}`); return 'reorg'; }
    }
    const byNumber = new Map(blocks.filter((b) => b.number !== undefined).map((b) => [Number(b.number), b]));
    const logs = [...(res.data?.logs ?? [])].sort((a, b) => (Number(a.blockNumber) - Number(b.blockNumber)) || (Number(a.logIndex) - Number(b.logIndex)));
    const fresh: JournalEvent[] = [];
    let decodeErrors = 0, removed = 0, foreign = 0;
    for (const l of logs) {
      if (l.removed) { removed++; continue; }
      const topics = (l.topics ?? []).filter((t): t is string => typeof t === 'string');
      let decoded: { eventName?: string; args?: unknown };
      try { decoded = decodeEventLog({ abi: indexerAbi, data: (l.data ?? '0x') as Hex, topics: topics as [Hex, ...Hex[]] }); }
      catch { decodeErrors++; continue; }
      const name = decoded.eventName ?? '';
      if (!RELEVANT.has(name)) continue;
      const address = (l.address ?? '').toLowerCase();
      const blockNumber = Number(l.blockNumber);
      const block = byNumber.get(blockNumber);
      const e: JournalEvent = {
        id: '', name, address, blockNumber, logIndex: Number(l.logIndex ?? 0), transactionHash: (l.transactionHash ?? '').toLowerCase(),
        blockTimestamp: normalizeTimestamp(block?.timestamp), blockHash: (l.blockHash ?? block?.hash ?? '').toLowerCase(),
        args: decoded.args as Record<string, unknown>,
      };
      e.id = eventId(e);
      if (KURU_EVENTS.has(name) && !agg.isTrackedMarket(address)) { foreign++; continue; }
      if (agg.has(e.id)) continue;
      if (name === 'GraduationCompleted') { await qualifyMappings([e]); applyParams(agg); }
      agg.ingest([e]); // sequential: a GraduationCompleted earlier in the batch maps its market for later trades
      fresh.push(e);
    }
    // Durable order: journal (fsync) → snapshot (tmp+fsync+rename).
    appendJournal(dir, fresh);
    // Retry unresolved metadata without losing trades ingested while RPC was down.
    // Raw totals make the subsequent normalized snapshot cover the whole history.
    await qualifyMappings([]);
    applyParams(agg);
    journalCount += fresh.length;
    if (decodeErrors) agg.recordDecodeError(decodeErrors);
    counters = { ...counters, decodeErrors: counters.decodeErrors + decodeErrors, removedLogs: counters.removedLogs + removed, foreignLogs: counters.foreignLogs + foreign };
    for (const b of blocks) if (b.number !== undefined && b.hash) ring = ringPut(ring, Number(b.number), b.hash);
    if (guard?.hash) ring = ringPut(ring, guard.blockNumber, guard.hash);
    if (Number.isFinite(res.nextBlock) && res.nextBlock > cursor) cursor = res.nextBlock;
    if (res.archiveHeight) agg.observeHead(Number(res.archiveHeight));
    status.lastBatchAt = Date.now();
    persist();
    return 'ok';
  };

  const runOnce = async (): Promise<'end' | 'reorg' | 'stopped'> => {
    const s = await client.stream(buildQuery(cursor, addresses), {});
    active = s;
    try {
      for (;;) {
        if (stopped) return 'stopped';
        const res = await s.recv();
        if (!res) return 'end';
        if (await handle(res) === 'reorg') return 'reorg';
      }
    } finally { active = null; await s.close().catch(() => undefined); }
  };

  return {
    aggregator: () => agg,
    cursor: () => cursor,
    status: () => ({ cursorBlock: cursor, ...status, counters: { ...counters }, journalCount }),
    metrics: () => agg.snapshot(cursor),
    runOnce,
    stop() { stopped = true; void active?.close().catch(() => undefined); },
    async run() {
      let backoff = 1000;
      while (!stopped) {
        try {
          try { agg.observeHead(Number(await client.getHeight())); } catch { /* informational */ }
          const r = await runOnce();
          status.lastError = null;
          backoff = 1000;
          if (r === 'end') await new Promise((ok) => setTimeout(ok, options.pollMs ?? 2000));
        } catch (error) {
          status.lastError = error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300);
          status.lastErrorAt = Date.now();
          log(`stream error (retry in ${backoff}ms): ${status.lastError}`);
          await new Promise((ok) => setTimeout(ok, backoff));
          backoff = Math.min(backoff * 2, 60_000);
        }
      }
    },
  };
}
