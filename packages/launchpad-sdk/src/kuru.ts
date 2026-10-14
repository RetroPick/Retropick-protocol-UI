import { zeroAddress, type Address } from 'viem';
import { addresses, release, type ChainClient } from './chain.ts';
import { decodeBook } from './book.ts';
export { kuruAbi } from './abis/kuruAbi.ts';
export { marginAbi } from './abis/marginAbi.ts';
import { kuruAbi } from './abis/kuruAbi.ts';
import { marginAbi } from './abis/marginAbi.ts';
import { routerAbi } from './abis/routerAbi.ts';
import { kuruEnvironmentAbi } from './abis/kuruEnvironmentAbi.ts';
const identities = new WeakMap<ChainClient, Map<string, { at: number; value: ReturnType<typeof qualify> }>>();
async function qualify(chain: ChainClient, market: Address, token: Address, vault: Address, blockNumber: bigint, quoteAsset: Address) {
  const router = release.kuruEnvironment.router as Address;
  const [params, vaultParams, margin, orderImpl, vaultImpl, registered] = await Promise.all([
    chain.readContract({ address: market, abi: kuruAbi, functionName: 'getMarketParams', blockNumber }),
    chain.readContract({ address: market, abi: kuruAbi, functionName: 'getVaultParams', blockNumber }),
    chain.readContract({ address: router, abi: routerAbi, functionName: 'marginAccountAddress', blockNumber }),
    chain.readContract({ address: router, abi: routerAbi, functionName: 'orderBookImplementation', blockNumber }),
    chain.readContract({ address: router, abi: routerAbi, functionName: 'kuruAmmVaultImplementation', blockNumber }),
    chain.readContract({ address: router, abi: routerAbi, functionName: 'verifiedMarket', args: [market], blockNumber }),
    chain.readContract({ address: addresses.kuruEnvironment, abi: kuruEnvironmentAbi, functionName: 'validate', blockNumber }),
  ]);
  if (registered.some((v, i) => String(v).toLowerCase() !== String(params[i]).toLowerCase()) || params[2].toLowerCase() !== token.toLowerCase() || params[4].toLowerCase() !== quoteAsset.toLowerCase() || vaultParams[0].toLowerCase() !== vault.toLowerCase() || margin.toLowerCase() !== release.kuruEnvironment.marginAccount.toLowerCase() || orderImpl.toLowerCase() !== release.kuruEnvironment.orderBookImplementation.toLowerCase() || vaultImpl.toLowerCase() !== release.kuruEnvironment.vaultImplementation.toLowerCase()) throw Error('Kuru identity/environment mismatch; trading disabled.');
  return { params, margin };
}
/** Display enrichment only. Successful identity qualification is cached 30s; write prepares always revalidate fresh. */
export async function readKuru(chain: ChainClient, market: Address, token: Address, vault: Address, account?: Address, options: { includeBook?: boolean; includeBalances?: boolean; blockNumber?: bigint; freshIdentity?: boolean; quoteAsset?: Address } = {}) {
  const quoteAsset = options.quoteAsset ?? zeroAddress;
  const blockNumber = options.blockNumber ?? await chain.getBlockNumber({ cacheTime: 0 });
  let cache = identities.get(chain);
  if (!cache) { cache = new Map(); identities.set(chain, cache); }
  const key = `${market.toLowerCase()}:${token.toLowerCase()}:${vault.toLowerCase()}:${quoteAsset.toLowerCase()}`;
  let cached = options.freshIdentity ? undefined : cache.get(key);
  if (!cached || Date.now() - cached.at > 30_000) {
    cached = { at: Date.now(), value: qualify(chain, market, token, vault, blockNumber, quoteAsset) };
    if (!options.freshIdentity) { cache.set(key, cached); void cached.value.catch(() => cache!.delete(key)); }
  }
  const [identity, best, book] = await Promise.all([
    cached.value,
    chain.readContract({ address: market, abi: kuruAbi, functionName: 'bestBidAsk', blockNumber }),
    options.includeBook === false ? { block: blockNumber, bids: [], asks: [] } : readKuruBook(chain, market, blockNumber),
  ]);
  const [quoteBalance, baseBalance] = account && options.includeBalances !== false ? await Promise.all([
    chain.readContract({ address: identity.margin, abi: marginAbi, functionName: 'getBalance', args: [account, quoteAsset], blockNumber }),
    chain.readContract({ address: identity.margin, abi: marginAbi, functionName: 'getBalance', args: [account, token], blockNumber }),
  ]) : [0n, 0n];
  return { ...identity, best, book, quoteBalance, baseBalance, blockNumber, observedAt: Date.now() };
}
export type KuruState = Awaited<ReturnType<typeof readKuru>>;
export async function readKuruBook(chain: ChainClient, market: Address, blockNumber?: bigint) {
  return decodeBook(await chain.readContract({ address: market, abi: kuruAbi, functionName: 'getL2Book', args: [20, 20], blockNumber }));
}
