// Provider-neutral RPC pool for the read-only indexer.
// - Each endpoint is classified per failure: AUTH (401/403, "no access to this network") and WRONG_CHAIN are
//   PERMANENT for the process lifetime and are never retried; RATE_LIMIT / HTTP 5xx / TIMEOUT / NETWORK open a
//   short circuit and are retried later. A healthy provider is always tried before an unhealthy one.
// - Health is exposed (host only, credentials redacted) so /health shows which endpoint actually serves traffic.
import { custom, http, type Transport } from 'viem';

export type FailureClass = 'AUTH' | 'WRONG_CHAIN' | 'RATE_LIMIT' | 'HTTP_5XX' | 'TIMEOUT' | 'NETWORK' | 'RANGE' | 'OTHER';
export type ProviderState = 'unprobed' | 'healthy' | 'circuit-open' | 'disabled';
export interface ProviderHealth {
  endpoint: string; state: ProviderState; chainId: number | null; requests: number; failures: number;
  lastFailure: FailureClass | null; lastFailureMessage: string | null; retryAt: number | null; latencyMs: number | null;
}

/** Endpoint paths/query/userinfo may contain credentials of any length or alphabet. */
export const redactEndpoint = (url: string): string => {
  try { return new URL(url).host; } catch { return '<invalid url>'; }
};
/** Public diagnostics never retain provider-controlled text, including nested errors and request bodies. */
export const safeErrorMessage = (error: unknown): string => `RPC_${classifyFailure(error)}`;

export function classifyFailure(error: unknown): FailureClass {
  // viem nests transport errors (UnknownRpcError → HttpRequestError → fetch error); inspect the whole cause chain.
  let status: number | undefined; let text = '';
  for (let e = error as { status?: number; name?: string; message?: string; details?: string; code?: number; cause?: unknown } | undefined, depth = 0; e && depth < 6; e = e.cause as typeof e, depth++) {
    status ??= typeof e.status === 'number' ? e.status : undefined;
    text += ` ${e.name ?? ''} ${e.message ?? ''} ${e.details ?? ''} ${e.code ?? ''}`;
  }
  if (/RPC_AUTH/.test(text) || status === 401 || status === 403 || /\b(401|403)\b|unauthori[sz]ed|forbidden|does not have access to this network|invalid project id/i.test(text)) return 'AUTH';
  if (/wrong chain/i.test(text)) return 'WRONG_CHAIN';
  if (status === 429 || /\b429\b|rate.?limit|too many requests|-32005/i.test(text)) return 'RATE_LIMIT';
  if (/-32603|internal error/i.test(text)) return 'HTTP_5XX';
  if ((status && status >= 500) || /\b50[234]\b/.test(text)) return 'HTTP_5XX';
  if (/timeout|timed out|TimeoutError/i.test(text)) return 'TIMEOUT';
  if (/RPC_RANGE|block range|range.*(too large|exceed)|limit exceeded|-32602|-32614/i.test(text)) return 'RANGE';
  if (/fetch failed|failed to fetch|network|ECONN|ENOTFOUND|EAI_AGAIN|HttpRequestError/i.test(text)) return 'NETWORK';
  return 'OTHER';
}

const PERMANENT: FailureClass[] = ['AUTH', 'WRONG_CHAIN'];
/** Failures that indicate an unhealthy provider (vs. a valid JSON-RPC error such as a contract revert). */
const PROVIDER_FAULT: FailureClass[] = ['AUTH', 'WRONG_CHAIN', 'RATE_LIMIT', 'HTTP_5XX', 'TIMEOUT', 'NETWORK'];

export interface ProviderPool { transport: Transport; health(): ProviderHealth[]; probe(): Promise<ProviderHealth[]> }

export function createProviderPool(urls: string[], options: { chainId: number; circuitMs?: number; fetchFn?: typeof fetch; timeoutMs?: number } ): ProviderPool {
  const circuitMs = options.circuitMs ?? 30_000;
  const baseFetch = options.fetchFn ?? fetch;
  /** Surfaces the real HTTP status before viem parses the body: batched JSON-RPC drops it when an
   * auth gateway answers a non-JSON body (e.g. Infura 401 "project ID does not have access to this network"). */
  const statusFetch: typeof fetch = async (input, init) => {
    const response = await baseFetch(input, init);
    if (response.status === 401 || response.status === 403 || response.status === 429 || response.status >= 500) {
      throw Object.assign(Error(`HTTP ${response.status}`), { status: response.status, name: 'ProviderHttpError' });
    }
    // Some gateways answer a batched request with HTTP 200 and a plain-text auth error instead of JSON-RPC
    // (observed: Infura "[project ID does not have access to this network…]"). Classify it before viem's JSON parse.
    const text = await response.clone().text().catch(() => '');
    if (!/^\s*[[{]\s*["{\]]/.test(text) || /^\s*\[\s*project id/i.test(text)) {
      if (/does not have access|unauthori[sz]ed|invalid project|forbidden/i.test(text)) throw Object.assign(Error('HTTP 401 auth body'), { status: 401, name: 'ProviderHttpError' });
    }
    // A gateway may reject an entire JSON-RPC batch with an uncorrelated error object.
    // viem otherwise treats this as an undefined result, hiding the actual failure classification.
    let value: unknown;
    try { value = JSON.parse(text); } catch { throw Error('network malformed JSON-RPC response'); }
    const rows = Array.isArray(value) ? value : [value];
    for (const row of rows) {
      if (row && typeof row === 'object' && 'error' in row && row.id == null) throw Error(safeErrorMessage(row.error));
      if (!row || typeof row !== 'object' || row.jsonrpc !== '2.0' || row.id == null || (!Object.hasOwn(row, 'result') && !row.error)) {
        // Some HTTP200 batch gateway failures are arrays of strings, with no result/error/id.
        const cls = typeof row === 'string' ? classifyFailure(Error(row)) : 'NETWORK';
        throw Error(`RPC_${PROVIDER_FAULT.includes(cls) ? cls : 'NETWORK'}`);
      }
    }
    if (!rows.length) throw Error('network empty JSON-RPC response');
    return response;
  };
  const entries = [...new Set(urls)].map((url) => ({
    // retryCount 0: retries are owned by the pool so an AUTH failure is never re-sent to the same endpoint.
    transport: http(url, { fetchFn: statusFetch, retryCount: 0, timeout: options.timeoutMs ?? 8000, batch: { batchSize: 16, wait: 10 } })({ chain: undefined, retryCount: 0 }),
    health: { endpoint: redactEndpoint(url), state: 'unprobed', chainId: null, requests: 0, failures: 0, lastFailure: null, lastFailureMessage: null, retryAt: null, latencyMs: null } as ProviderHealth,
  }));
  const mark = (entry: typeof entries[number], error: unknown, cls = classifyFailure(error)) => {
    entry.health.failures++; entry.health.lastFailure = cls;
    entry.health.lastFailureMessage = `RPC_${cls}`;
    if (PERMANENT.includes(cls)) { entry.health.state = 'disabled'; entry.health.retryAt = null; }
    else { entry.health.state = 'circuit-open'; entry.health.retryAt = Date.now() + circuitMs; }
  };
  const probing = new Map<typeof entries[number], Promise<void>>();
  const probeUncached = async (entry: typeof entries[number]) => {
    if (entry.health.state === 'disabled') return;
    const t0 = performance.now();
    try {
      const raw = await entry.transport.request({ method: 'eth_chainId' });
      const id = Number(raw);
      if (typeof raw !== 'string' || !/^0x[0-9a-f]+$/i.test(raw) || !Number.isSafeInteger(id)) throw Error('network invalid chain response');
      entry.health.chainId = id;
      if (id !== options.chainId) { mark(entry, Error(`Wrong chain RPC provider (chain ${id})`), 'WRONG_CHAIN'); return; }
      entry.health.latencyMs = Math.round(performance.now() - t0); entry.health.state = 'healthy'; entry.health.retryAt = null;
    } catch (error) { mark(entry, error); }
  };
  const probeOne = (entry: typeof entries[number]) => {
    const pending = probing.get(entry); if (pending) return pending;
    const next = probeUncached(entry).finally(() => probing.delete(entry)); probing.set(entry, next); return next;
  };
  const probe = async () => { await Promise.all(entries.map(probeOne)); return entries.map((e) => ({ ...e.health })); };
  // Configured priority is preserved: a recovered primary (circuit window elapsed + successful probe) takes traffic
  // back from the fallback. Disabled providers and still-open circuits are skipped.
  const usable = () => {
    const now = Date.now();
    return entries.filter((e) => e.health.state === 'healthy' || e.health.state === 'unprobed' || (e.health.state === 'circuit-open' && (e.health.retryAt ?? 0) <= now));
  };
  const transport = custom({
    async request({ method, params }) {
      let last: unknown = Error(`No usable Monad RPC provider (${entries.map((e) => `${e.health.endpoint}:${e.health.state}/${e.health.lastFailure ?? '-'}`).join(', ')})`);
      // Compare observed heads before choosing historical reads; a lagging endpoint must not hide freshness.
      if (method === 'eth_blockNumber') {
        const heads = await Promise.all(usable().map(async entry => {
          if (entry.health.state !== 'healthy') await probeOne(entry);
          if (entry.health.state !== 'healthy') return null;
          entry.health.requests++;
          try { const value = await entry.transport.request({ method, params } as never); return { entry, value, block: BigInt(value as string) }; }
          catch (error) { mark(entry, error); return null; }
        }));
        const available = heads.filter((h): h is NonNullable<typeof h> => h !== null);
        if (available.length) {
          const best = available.reduce((a, b) => b.block > a.block ? b : a);
          for (const h of available) if (best.block - h.block > 16n) mark(h.entry, Error('network stale head'), 'NETWORK');
          return best.value;
        }
        throw Error(`No usable Monad RPC provider (${entries.map(e => `${e.health.endpoint}:${e.health.state}/${e.health.lastFailure ?? '-'}`).join(', ')})`);
      }
      for (const entry of usable()) {
        if (entry.health.state === 'unprobed' || entry.health.state === 'circuit-open') { await probeOne(entry); if ((entry.health as ProviderHealth).state !== 'healthy') continue; }
        entry.health.requests++;
        try {
          const value = await entry.transport.request({ method, params } as never);
          if ((method === 'eth_getBlockByNumber' || method === 'eth_getBlockByHash') && value === null) throw Error('network missing block');
          return value;
        }
        catch (error) {
          const cls = classifyFailure(error);
          if (!PROVIDER_FAULT.includes(cls)) throw Error(cls === 'OTHER' ? 'RPC_OTHER (execution reverted or invalid request)' : `RPC_${cls}`); // valid JSON-RPC error (revert, bad range): do not fail over
          mark(entry, error, cls); last = Error(`RPC_${cls}`);
        }
      }
      throw last;
    },
  }, { retryCount: 2, retryDelay: 400 });
  return { transport, health: () => entries.map((e) => ({ ...e.health })), probe };
}
