import { createChain, type ChainClient } from '@retropick/launchpad-sdk/chain';
import { DATA_MODE, RPC_FALLBACK_URL, RPC_URL } from './env';

let client: ChainClient | null = null;
const create = (): ChainClient => (client ??= createChain(RPC_FALLBACK_URL ? [RPC_URL, RPC_FALLBACK_URL] : RPC_URL, { timeoutMs: 8000, maxConcurrent: 4, requestsPerSecond: 10 }));

/**
 * Shared read-only Monad Testnet client (chain 10143, batched multicall, primary RPC with ordered failover).
 * createChain probes its endpoints eagerly, so in mock/demo mode the client is only created on first real use:
 * demo screens that merely import a module never contact Monad RPC.
 */
export const publicClient: ChainClient = DATA_MODE === 'live'
  ? create()
  : new Proxy({} as ChainClient, { get: (_target, key) => Reflect.get(create() as object, key) });
