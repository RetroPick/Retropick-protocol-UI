import { BaseError, createPublicClient, defineChain, http, custom, type Address } from 'viem';
import { release } from './release.ts';
export { release };
export const monad = defineChain({ id: 10143, name: 'Monad Testnet', nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 }, rpcUrls: { default: { http: ['https://testnet-rpc.monad.xyz'] } }, contracts: { multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11', blockCreated: 251449 } }, blockExplorers: { default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' } }, testnet: true });
export const addresses = Object.fromEntries(Object.entries(release.addresses).filter(([, v]) => typeof v === 'string' && v.startsWith('0x'))) as Record<string, Address>;
export type RpcHealth = { provider: number; origin: string; chainId: number | null; latencyMs: number | null; health: 'probing' | 'healthy' | 'circuit-open' | 'disabled'; failures: number; retryAfter: number };
export type ChainOptions = { timeoutMs?: number; httpBatch?: boolean; /** Enable only after independently qualifying this chain's Multicall3 runtime. */ multicall?: boolean };
type RpcFailure = 'AUTH' | 'WRONG_CHAIN' | 'RATE_LIMIT' | 'TIMEOUT' | 'HTTP_5XX' | 'NETWORK' | 'RPC_INTERNAL';
/** Revert phrasing geth-family nodes use, across several JSON-RPC codes. */
const REVERT_TEXT = /execution reverted|VM execution error/i;
const RANGE_TEXT = /block range|too many results|query returned more|response size exceeded|range too large/i;
/** The geth revert code; every other unclassified error is a provider fault. */
const REVERT_CODE = 3;
function rpcFailure(error: unknown): RpcFailure | 'APPLICATION' {
  const seen = new Set<unknown>();
  for (let current = error; current && typeof current === 'object' && !seen.has(current); current = (current as { cause?: unknown }).cause) {
    seen.add(current);
    const e = current as { name?: string; message?: string; shortMessage?: string; status?: number; code?: number };
    const text = `${e.message ?? ''} ${e.shortMessage ?? ''}`;
    if (e.status === 401 || e.status === 403) return 'AUTH';
    // Range/response limits and contract reverts are valid application
    // responses: re-throw them typed without disabling the provider or
    // repeating the request against every fallback. Geth reports reverts
    // under several codes (-32000 included), so the phrasing decides, not
    // the code.
    if (!e.status && (RANGE_TEXT.test(text) || e.code === REVERT_CODE || REVERT_TEXT.test(text))) return 'APPLICATION';
    if (e.status === 429 || e.code === -32005) return 'RATE_LIMIT';
    if (e.status && e.status >= 500) return 'HTTP_5XX';
    if (e.name === 'TimeoutError') return 'TIMEOUT';
    if (e.code === -32603) return 'RPC_INTERNAL';
    if (/wrong.chain/i.test(text)) return 'WRONG_CHAIN';
    if (/HttpRequestError|WebSocketRequestError/.test(e.name ?? '') || /fetch failed|failed to fetch|network error/i.test(text)) return 'NETWORK';
  }
  // Everything unrecognized (the geth -32000 family without a revert phrase,
  // unmapped gateway codes) is a provider fault: open the circuit and hand
  // the request to the next provider instead of surfacing an opaque error.
  return 'RPC_INTERNAL';
}
function safeRpcError(failure: RpcFailure): Error {
  const safe = Error(`RPC_${failure}`);
  safe.name = 'RpcError';
  return safe;
}
/**
 * Reverts and response-size limits must reach the ABI decoders intact, so they
 * are re-thrown typed rather than flattened: only the redacted hex revert
 * payload and a numeric code survive — never a gateway body, URL or request
 * metadata. `code: 3` lets viem decode the revert reason from the payload.
 */
class ApplicationRpcResponse extends BaseError {
  constructor(error: unknown) {
    const seen = new Set<unknown>();
    let data: string | undefined;
    let code: number | undefined;
    let reverted = false;
    for (let current = error; current && typeof current === 'object' && !seen.has(current); current = (current as { cause?: unknown }).cause) {
      seen.add(current);
      const e = current as { code?: number; data?: unknown; message?: string; shortMessage?: string };
      if (data === undefined && typeof e.data === 'string' && /^0x[0-9a-fA-F]*$/.test(e.data)) data = e.data;
      if (code === undefined && typeof e.code === 'number') code = e.code;
      if (e.code === REVERT_CODE || REVERT_TEXT.test(`${e.message ?? ''} ${e.shortMessage ?? ''}`)) reverted = true;
    }
    super(reverted ? 'Execution reverted.' : 'RPC response limit reached.', { name: 'RpcError' });
    if (reverted) (this as { code?: number }).code = REVERT_CODE;
    else if (code !== undefined) (this as { code?: number }).code = code;
    if (data !== undefined) (this as { data?: string }).data = data;
  }
}
const validatedFetch: typeof fetch = async (input, init) => {
  const response = await globalThis.fetch(input, init);
  if (!response.ok) return response;
  try {
    const request = JSON.parse(String(init?.body));
    const result = await response.clone().json();
    const requests = Array.isArray(request) ? request : [request];
    const results = Array.isArray(result) ? result : [result];
    if (Array.isArray(request) !== Array.isArray(result) || requests.length !== results.length) throw Error();
    const ids = new Set<unknown>();
    for (const row of results) {
      if (!row || row.jsonrpc !== '2.0' || ids.has(row.id) || !requests.some(item => item.id === row.id)) throw Error();
      ids.add(row.id);
      const hasResult = Object.hasOwn(row, 'result');
      const hasError = Object.hasOwn(row, 'error');
      if (hasResult === hasError || hasError && (!row.error || !Number.isInteger(row.error.code) || typeof row.error.message !== 'string')) throw Error();
      const method = requests.find(item => item.id === row.id)?.method;
      if (hasResult && (method === 'eth_chainId' || method === 'eth_blockNumber') && (typeof row.result !== 'string' || !/^0x[0-9a-fA-F]+$/.test(row.result))) throw Error();
    }
    return response;
  } catch { throw Error('Network error: invalid JSON-RPC response envelope.'); }
};
/** Public endpoints only. Unauthorized/wrong-chain providers never remain in the failover path. */
export const createChain = (input: string | string[], options: ChainOptions = {}) => {
  const urls = [...new Set(Array.isArray(input) ? input : [input])];
  if (!urls.length) throw Error('A public Monad RPC endpoint is required.');
  const providers = urls.map((url, provider) => {
    const rpc = createPublicClient({ transport: http(url, { fetchFn: validatedFetch, timeout: options.timeoutMs ?? 3000, retryCount: 0, batch: options.httpBatch === false ? false : { batchSize: 30, wait: 5 } }) });
    const health: RpcHealth = { provider, origin: new URL(url).host, chainId: null, latencyMs: null, health: 'probing', failures: 0, retryAfter: 0 };
    return { rpc, health, probe: null as Promise<void> | null };
  });
  const fail = (entry: typeof providers[number], error: unknown) => {
    const category = rpcFailure(error);
    // A valid application response says nothing about provider health.
    if (category === 'APPLICATION') return;
    const permanent = category === 'AUTH' || category === 'WRONG_CHAIN';
    entry.health.failures++;
    entry.health.health = permanent ? 'disabled' : 'circuit-open';
    entry.health.retryAfter = permanent ? Infinity : Date.now() + 30_000;
  };
  const probe = (entry: typeof providers[number]) => {
    if (entry.probe) return entry.probe;
    entry.health.health = 'probing';
    const start = performance.now();
    entry.probe = (async () => {
      try {
        const [id, head] = await Promise.all([entry.rpc.getChainId(), entry.rpc.getBlockNumber({ cacheTime: 0 })]);
        if (!Number.isSafeInteger(id) || id <= 0 || typeof head !== 'bigint' || head < 0n) throw Error('Network error: invalid RPC probe result.');
        entry.health.chainId = id;
        if (id !== monad.id) throw Error('Wrong chain RPC provider');
        entry.health.latencyMs = Math.round(performance.now() - start);
        entry.health.health = 'healthy'; entry.health.failures = 0; entry.health.retryAfter = 0;
      } catch (error) { fail(entry, error); }
    })().finally(() => { entry.probe = null; });
    return entry.probe;
  };
  // Probe independently: a bad fallback does not delay requests to the healthy primary.
  for (const entry of providers) void probe(entry);
  const transport = custom({ request: async ({ method, params }) => {
    let last: unknown = Error('No healthy Monad RPC provider.');
    for (const entry of providers) {
      if (entry.health.health === 'probing') await entry.probe;
      if (entry.health.health === 'disabled') continue;
      if (entry.health.health === 'circuit-open') {
        if (entry.health.retryAfter > Date.now()) continue;
        await probe(entry);
        if ((entry.health as RpcHealth).health !== 'healthy') continue;
      }
      try { return await entry.rpc.request({ method, params } as never); }
      catch (error) {
        // A contract revert is valid RPC output, not an unhealthy provider:
        // it is re-thrown typed for the ABI decoder instead of failing over.
        const outcome = rpcFailure(error);
        if (outcome === 'APPLICATION') throw new ApplicationRpcResponse(error);
        last = safeRpcError(outcome); fail(entry, error);
      }
    }
    throw last;
  } }, { retryCount: 0 });
  return createPublicClient({ chain: monad, batch: options.multicall ? { multicall: { batchSize: 4096, wait: 10 } } : undefined, transport }).extend(() => ({
    rpcHealth: () => providers.map(({ health }) => ({ ...health })),
    probeProviders: async () => { await Promise.all(providers.filter(p => p.health.health !== 'disabled').map(probe)); return providers.map(p => ({ ...p.health })); },
  }));
};
export type ChainClient = ReturnType<typeof createChain>;
export const explorer = (value: string, kind = 'address') => `${monad.blockExplorers.default.url}/${kind}/${value}`;
export const short = (value: string) => `${value.slice(0, 6)}…${value.slice(-4)}`;
export function errorText(error: unknown) { if (error && typeof error === 'object' && 'shortMessage' in error) return String(error.shortMessage); return error instanceof Error ? error.message : 'Network unavailable. Please retry.'; }
