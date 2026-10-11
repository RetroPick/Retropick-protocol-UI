// Envio HyperSync stream wiring for the market radar. Fails closed without a token:
// Envio's HyperSync endpoints require an API token (verified 2026-10-11 — the client
// rejects construction without `apiToken` and the endpoint answers 401 anonymously).
import { decodeEventLog, type Hex } from 'viem';
// Relative import keeps this integration standalone (not a pnpm workspace member) so
// installing its deps never triggers a root-wide install that would write into apps/web.
import { indexerAbi } from '../../../packages/launchpad-sdk/src/events.ts';
import { RadarAggregator, type RadarEvent, type RadarMetrics } from './radar.ts';

export const MONAD_TESTNET_HYPERSYNC = 'https://10143.hypersync.xyz';

export interface RadarStreamOptions {
  url?: string;
  /** Required. Create one at envio.dev (operator action — see EXTERNAL-BLOCKERS). */
  apiToken: string;
  factory: string;
  /** Kuru market addresses to watch (market → token map for lifecycle join). */
  marketTokens: Record<string, string>;
  fromBlock: number;
  onMetrics?: (metrics: RadarMetrics) => void;
}

export interface RadarStream {
  aggregator: RadarAggregator;
  /** Resolves when the consumer stops it or the stream ends. */
  run(): Promise<void>;
  stop(): void;
}

interface MinimalClient {
  stream: (query: unknown, options?: unknown) => AsyncIterable<{ data?: { blocks?: Array<{ number?: number; timestamp?: number }>; logs?: Array<{ address?: string; blockNumber?: number; logIndex?: number; transactionHash?: string; data?: string; topics?: string[] }> } }>;
  getHeight: () => Promise<number>;
  destroy?: () => Promise<void>;
}

export async function createRadarStream(options: RadarStreamOptions, clientFactory?: (url: string, token: string) => Promise<MinimalClient>): Promise<RadarStream> {
  if (!options.apiToken) throw Error('Envio HyperSync requires an API token (ENVIO_API_TOKEN). Get one at envio.dev; see docs/metropolis/execution/EXTERNAL-BLOCKERS.md.');
  const url = options.url ?? MONAD_TESTNET_HYPERSYNC;
  const makeClient = clientFactory ?? (async () => {
    const { HypersyncClient } = await import('@envio-dev/hypersync-client');
    return new HypersyncClient({ url, apiToken: options.apiToken }) as unknown as MinimalClient;
  });
  const client = await makeClient(url, options.apiToken);
  const aggregator = new RadarAggregator(options.marketTokens);
  const addresses = [options.factory, ...Object.keys(options.marketTokens)].map((a) => a.toLowerCase());
  let stopped = false;

  return {
    aggregator,
    stop() { stopped = true; void client.destroy?.(); },
    async run() {
      const stream = client.stream({
        fromBlock: options.fromBlock,
        logs: [{ address: addresses, topics: [[]] }],
        fieldSelection: {
          log: ['address', 'block_number', 'log_index', 'transaction_hash', 'data', 'topics'],
          block: ['number', 'timestamp'],
        },
      });
      for await (const message of stream) {
        if (stopped) break;
        const logs = message.data?.logs ?? [];
        const blockTimestamps = new Map<number, number>();
        for (const block of message.data?.blocks ?? []) {
          if (block.number !== undefined && block.timestamp !== undefined) blockTimestamps.set(Number(block.number), Number(block.timestamp));
        }
        const events: RadarEvent[] = [];
        for (const log of logs) {
          try {
            const decoded = decodeEventLog({ abi: indexerAbi, data: (log.data ?? '0x') as Hex, topics: (log.topics ?? []) as [Hex, ...Hex[]] });
            if (!decoded.eventName) continue;
            events.push({
              name: decoded.eventName,
              address: (log.address ?? '').toLowerCase(),
              blockNumber: Number(log.blockNumber ?? 0),
              blockTimestamp: blockTimestamps.get(Number(log.blockNumber ?? 0)) ?? 0,
              logIndex: Number(log.logIndex ?? 0),
              transactionHash: log.transactionHash ?? '',
              args: decoded.args as Record<string, unknown>,
            });
          } catch { /* undecodable log for another contract at the same address filter — skip */ }
        }
        aggregator.ingest(events);
        options.onMetrics?.(aggregator.snapshot());
      }
    },
  };
}
