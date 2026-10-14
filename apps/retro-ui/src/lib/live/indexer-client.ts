import type { IndexedCandle, IndexedLaunch, IndexedTrade, IndexEnvelope, IndexFreshness, IndexedHolder } from '@retropick/launchpad-sdk/read-model';
import { IncompleteDiscoveryError } from '@retropick/launchpad-sdk/discovery-snapshot';
import { measureStage } from './performance';
export type { IndexedCandle, IndexedLaunch, IndexedTrade, IndexEnvelope, IndexFreshness, IndexedHolder };
export const STALE_LAG_BLOCKS = 64;
export type QueryParams = Record<string, string | number | undefined>;
/** Failure classes for indexer reads — distinct from RPC failures and from a genuine empty result. */
export type IndexerFailureKind = 'unreachable' | 'timeout' | 'http' | 'not-found' | 'invalid-response' | 'wrong-chain';
export class IndexerUnavailableError extends Error {
  readonly kind: IndexerFailureKind;
  constructor(message: string, readonly status?: number, readonly cause?: unknown, kind?: IndexerFailureKind) {
    super(message); this.name = 'IndexerUnavailableError';
    this.kind = kind ?? (status === 404 ? 'not-found' : status ? 'http' : 'invalid-response');
  }
}
/** Human-facing title/text for an indexer read failure. Never phrased as an empty result. */
export function describeIndexerError(error: unknown): { kind: IndexerFailureKind; title: string; text: string } {
  if (error instanceof IncompleteDiscoveryError) return { kind: 'invalid-response', title: 'Complete discovery snapshot unavailable', text: error.message };
  const kind: IndexerFailureKind = error instanceof IndexerUnavailableError ? error.kind : 'unreachable';
  const status = error instanceof IndexerUnavailableError ? error.status : undefined;
  switch (kind) {
    case 'timeout': return { kind, title: 'Indexer timed out', text: 'The RetroPick indexer did not answer within 8 seconds. Launch data is not shown rather than guessed.' };
    case 'http': return { kind, title: 'Indexer unavailable', text: `The indexer gateway answered HTTP ${status ?? '?'}. This is a backend outage, not an empty market list.` };
    case 'not-found': return { kind, title: 'Indexer route not found', text: 'The indexer did not recognise this request (HTTP 404).' };
    case 'wrong-chain': return { kind, title: 'Indexer on the wrong network', text: 'The indexer response is not for Monad Testnet (10143); it was rejected.' };
    case 'invalid-response': return { kind, title: 'Indexer response rejected', text: 'The indexer response failed freshness/provenance validation and was not displayed.' };
    default: return { kind: 'unreachable', title: 'Indexer unreachable', text: 'The RetroPick indexer could not be reached (network/DNS). This is a backend outage, not an empty market list. Monad RPC reads are a separate path.' };
  }
}
export async function request<T>(base: string, path: string, signal?: AbortSignal): Promise<IndexEnvelope<T>> {
  const finish = measureStage('indexer:response');
  let response: Response;
  try {
    response = await fetch(base + path, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000), headers: { accept: 'application/json' } });
  } catch (error) {
    // Caller-initiated aborts propagate unchanged (react-query cancellation).
    if (signal?.aborted) throw error;
    const name = (error as { name?: string } | null)?.name;
    if (name === 'TimeoutError' || name === 'AbortError') throw new IndexerUnavailableError('Indexer timed out.', undefined, error, 'timeout');
    throw new IndexerUnavailableError('Indexer unreachable.', undefined, error, 'unreachable');
  }
  if (!response.ok) throw new IndexerUnavailableError(response.status === 404 ? 'Awaiting indexer confirmation.' : 'Indexer HTTP ' + response.status, response.status);
  const payload = await response.text();
  let body: IndexEnvelope<T>;
  try { body = JSON.parse(payload) as IndexEnvelope<T>; } catch (error) { throw new IndexerUnavailableError('Indexer returned non-JSON.', response.status, error, 'invalid-response'); }
  if (body?.freshness && body.freshness.chainId !== 10143) throw new IndexerUnavailableError('Indexer chain mismatch.', response.status, undefined, 'wrong-chain');
  if (!body || !('data' in body) || body.freshness?.chainId !== 10143 || body.freshness.source !== 'MONAD_EVENT_INDEXER') throw new IndexerUnavailableError('Invalid indexer freshness envelope.', undefined, undefined, 'invalid-response');
  finish({ bytes: new TextEncoder().encode(payload).length, count: 1 });
  return body;
}
export function queryPath(path: string, params: QueryParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') query.set(key, String(value));
  return path + (query.size ? '?' + query : '');
}
export const isStale = (freshness: IndexFreshness) => Boolean(freshness.error) || freshness.lagBlocks > STALE_LAG_BLOCKS;
export const fetchLaunches = (base: string, params: QueryParams = {}, signal?: AbortSignal) => request<IndexedLaunch[]>(base, queryPath('/v1/launches', { limit: 50, ...params }), signal);
export const fetchLaunch = (base: string, token: string, signal?: AbortSignal) => request<IndexedLaunch>(base, '/v1/launches/' + token, signal);
export const fetchTrades = (base: string, token: string, params: QueryParams | number = {}, signal?: AbortSignal) => request<IndexedTrade[]>(base, queryPath('/v1/launches/' + token + '/trades', { limit: 50, ...(typeof params === 'number' ? { limit: params } : params) }), signal);
export const fetchCandles = (base: string, token: string, params: QueryParams | number = {}, signal?: AbortSignal) => request<IndexedCandle[]>(base, queryPath('/v1/launches/' + token + '/candles', { resolution: '5m', range: '24h', ...(typeof params === 'number' ? { limit: params } : params) }), signal);
export const fetchHolders = (base: string, token: string, params: QueryParams = {}, signal?: AbortSignal) => request<IndexedHolder[]>(base, queryPath('/v1/launches/' + token + '/holders', { limit: 50, ...params }), signal);
export const fetchSearch = (base: string, q: string, signal?: AbortSignal) => request<IndexedLaunch[]>(base, queryPath('/v1/search', { q, limit: 20 }), signal);
export interface IndexedPair { quoteAsset: string; symbol: string; decimals: number; launchCount?: number }
export const fetchPairs = (base: string, signal?: AbortSignal) => request<IndexedPair[]>(base, '/v1/pairs', signal);
export const fetchWalletResource = <T>(base: string, wallet: string, resource: 'assets' | 'orders' | 'claims' | 'buybacks', params: QueryParams = {}, signal?: AbortSignal) => request<T[]>(base, queryPath('/v1/wallets/' + wallet + '/' + resource, { limit: 100, ...params }), signal);
