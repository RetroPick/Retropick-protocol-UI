import { type Address, zeroAddress, isAddress } from 'viem';
import { addresses, type ChainClient } from './chain.ts';
import { coordinatorAbi } from './abis/coordinatorAbi.ts';
import { curveAbi } from './abis/curveAbi.ts';
import { tokenAbi } from './abis/tokenAbi.ts';
import { factoryAbi } from './abis/factoryAbi.ts';

export type ReadOptions = { blockNumber?: bigint; freshIdentity?: boolean };
const identities = new WeakMap<ChainClient, Map<string, ReturnType<typeof loadIdentity>>>();
async function loadIdentity(chain: ChainClient, token: Address, blockNumber: bigint) {
  const [packet, name, symbol, description, logo, creator, decimals] = await Promise.all([
    chain.readContract({ address: addresses.coordinator, abi: coordinatorAbi, functionName: 'packet', args: [token], blockNumber }),
    chain.readContract({ address: token, abi: tokenAbi, functionName: 'name', blockNumber }),
    chain.readContract({ address: token, abi: tokenAbi, functionName: 'symbol', blockNumber }),
    chain.readContract({ address: token, abi: tokenAbi, functionName: 'description', blockNumber }),
    chain.readContract({ address: token, abi: tokenAbi, functionName: 'logo', blockNumber }),
    chain.readContract({ address: token, abi: tokenAbi, functionName: 'deployer', blockNumber }),
    chain.readContract({ address: token, abi: tokenAbi, functionName: 'decimals', blockNumber }),
  ]);
  if (packet.token.toLowerCase() !== token.toLowerCase() || packet.curve === zeroAddress) throw Error('Not a RetroPick V2 launch');
  return { packet, name, symbol, description, logo, creator, decimals };
}
/** Tier A: identity and current economic phase. No wallet, proof or venue-history reads. */
export async function readLaunchEssential(chain: ChainClient, token: Address, options: ReadOptions = {}) {
  if (!isAddress(token)) throw Error('Invalid launch token address');
  const blockNumber = options.blockNumber ?? await chain.getBlockNumber({ cacheTime: 0 });
  let cache = identities.get(chain);
  if (!cache) { cache = new Map(); identities.set(chain, cache); }
  const key = token.toLowerCase();
  let identity = options.freshIdentity ? undefined : cache.get(key);
  if (!identity) {
    identity = loadIdentity(chain, token, blockNumber);
    if (!options.freshIdentity) { cache.set(key, identity); void identity.catch(() => cache!.delete(key)); }
  }
  const [base, ledger, receipt, supply] = await Promise.all([
    identity,
    chain.readContract({ address: addresses.coordinator, abi: coordinatorAbi, functionName: 'ledger', args: [token], blockNumber }),
    chain.readContract({ address: addresses.coordinator, abi: coordinatorAbi, functionName: 'receipt', args: [token], blockNumber }),
    chain.readContract({ address: token, abi: tokenAbi, functionName: 'totalSupply', blockNumber }),
  ]);
  const [reserves, remaining, realQuote] = await Promise.all([
    chain.readContract({ address: base.packet.curve, abi: curveAbi, functionName: 'getReserves', blockNumber }),
    chain.readContract({ address: base.packet.curve, abi: curveAbi, functionName: 'sellableTokens', blockNumber }),
    chain.readContract({ address: base.packet.curve, abi: curveAbi, functionName: 'realQuoteReserve', blockNumber }),
  ]);
  return { token, ...base, supply, ledger, receipt, reserves, remaining, realQuote, blockNumber, observedAt: Date.now() };
}
export type EssentialLaunch = Awaited<ReturnType<typeof readLaunchEssential>>;
/** Tier B: independently hydrated wallet balance and quote inputs, anchored to Tier A's block. */
export async function readLaunchEconomic(chain: ChainClient, essential: EssentialLaunch, account?: Address) {
  const { token, packet, ledger, blockNumber } = essential;
  const [balance, reserved, fee, tax, completion, record, quoteBalance] = await Promise.all([
    account ? chain.readContract({ address: token, abi: tokenAbi, functionName: 'balanceOf', args: [account], blockNumber }) : 0n,
    chain.readContract({ address: packet.curve, abi: curveAbi, functionName: 'reservedTokens', blockNumber }),
    chain.readContract({ address: packet.curve, abi: curveAbi, functionName: 'feeBps', blockNumber }),
    chain.readContract({ address: packet.curve, abi: curveAbi, functionName: 'creatorTaxBps', blockNumber }),
    ledger.phase === 0 ? chain.readContract({ address: packet.curve, abi: curveAbi, functionName: 'completionQuote', blockNumber }) : [0n, 0n] as const,
    chain.readContract({ address: addresses.factory, abi: factoryAbi, functionName: 'getLaunchedToken', args: [token], blockNumber }),
    account ? packet.quoteAsset === zeroAddress ? chain.getBalance({address:account,blockNumber}) : chain.readContract({address:packet.quoteAsset,abi:tokenAbi,functionName:'balanceOf',args:[account],blockNumber}) : 0n,
  ]);
  return { ...essential, balance, quoteBalance, reserved, fee: BigInt(fee), tax: BigInt(tax), completion, record, custody: undefined as { lp: bigint; excess: bigint } | undefined };
}
/** Tier C: protocol custody proof, requested only when its section is visible. */
export async function readLaunchProof(chain: ChainClient, launch: EssentialLaunch) {
  if (launch.ledger.phase !== 2) return undefined;
  const { token, ledger, receipt, blockNumber } = launch;
  const [lp, excess] = await Promise.all([
    chain.readContract({ address: receipt.lpAsset, abi: tokenAbi, functionName: 'balanceOf', args: [ledger.protectedLPReceiver], blockNumber }),
    chain.readContract({ address: token, abi: tokenAbi, functionName: 'balanceOf', args: [ledger.protectedExcessReceiver], blockNumber }),
  ]);
  return { lp, excess };
}
/** Compatibility full read. Writes explicitly request fresh identity and exclude Tier C. */
export async function readLaunch(chain: ChainClient, token: Address, account?: Address) {
  const essential = await readLaunchEssential(chain, token, { freshIdentity: true });
  const [economic, custody] = await Promise.all([readLaunchEconomic(chain, essential, account), readLaunchProof(chain, essential)]);
  return { ...economic, custody };
}
export type LiveLaunch = Awaited<ReturnType<typeof readLaunch>>;
export async function readTradeLaunch(chain: ChainClient, token: Address, account?: Address) {
  return readLaunchEconomic(chain, await readLaunchEssential(chain, token, { freshIdentity: true }), account);
}
