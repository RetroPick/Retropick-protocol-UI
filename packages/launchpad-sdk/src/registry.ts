import { BaseError, ContractFunctionRevertedError, zeroAddress, type Address } from 'viem';
import { addresses, type ChainClient } from './chain.ts';
import { quoteAssets } from './quote-assets.ts';
import { factoryAbi } from './abis/factoryAbi.ts';
import { registryAbi } from './abis/registryAbi.ts';
import { tokenAbi } from './abis/tokenAbi.ts';
import { memeHookAbi } from './abis/memeHookAbi.ts';
import { retroPickFeeEscrowV2Abi } from './abis/retroPickFeeEscrowV2Abi.ts';
import { retroPickBuybackVaultV2Abi } from './abis/retroPickBuybackVaultV2Abi.ts';

/** GraduationVenue enum on the deployed factory: 0 = Uniswap V4, 1 = Kuru. */
export const VENUE = { UNISWAP_V4: 0, KURU: 1 } as const;
export type VenueId = (typeof VENUE)[keyof typeof VENUE];

export type LaunchConfigView = {
  id: bigint;
  supply: bigint;
  curveFeeBps: bigint;
  phantomQuote: bigint;
  graduationThreshold: bigint;
  poolFee: number;
  tickSpacing: number;
  enabled: boolean;
};

export type AdmittedQuote = {
  venue: VenueId;
  address: Address;
  symbol: string;
  decimals: number;
  phantomQuote: bigint;
  graduationThreshold: bigint;
  graduationQuoteCeiling: bigint;
  policyVersion: number;
  policyHash: `0x${string}`;
  assetId: `0x${string}`;
};

export type LaunchPreconditions = {
  blockNumber: bigint;
  launchEnabled: boolean;
  canLaunch: boolean | null;
  launchFee: bigint;
  maxCreatorTaxBps: bigint;
  currentHookFeeBps: bigint;
  snipeTaxSeconds: bigint;
  snipeTaxStartBps: bigint;
  configs: LaunchConfigView[];
  quotes: AdmittedQuote[];
};

/** Versioned candidates and indexed/custom hints are discovery inputs, never permissions. */
export type QuoteDiscoveryOptions = { candidateAddresses?: readonly Address[] };
async function quoteCandidates(chain: ChainClient, blockNumber: bigint, options: QuoteDiscoveryOptions): Promise<Address[]> {
  const circleUsdc = await chain.readContract({ address: addresses.quoteRegistry, abi: registryAbi, functionName: 'CIRCLE_TEST_USDC', blockNumber });
  return [...new Map([...quoteAssets.flatMap(asset => asset.monadTestnetAddress ? [asset.monadTestnetAddress as Address] : []), circleUsdc, ...(options.candidateAddresses ?? [])].map(address => [address.toLowerCase(), address])).values()];
}

/** Everything the create form and launch validation need, read atomically enough for review. */
export async function readLaunchPreconditions(chain: ChainClient, account?: Address, targetBlock?: bigint, options: QuoteDiscoveryOptions = {}): Promise<LaunchPreconditions> {
  if (await chain.getChainId() !== 10143) throw new Error('Quote discovery requires Monad Testnet (10143).');
  const blockNumber = targetBlock ?? await chain.getBlockNumber({ cacheTime: 0 });
  const factory = addresses.factory;
  const [launchEnabled, launchFee, maxCreatorTaxBps, snipeTaxSeconds, snipeTaxStartBps, configCount, canLaunch, candidates, hookPolicy] = await Promise.all([
    chain.readContract({ address: factory, abi: factoryAbi, functionName: 'launchEnabled', blockNumber }),
    chain.readContract({ address: factory, abi: factoryAbi, functionName: 'launchFee', blockNumber }),
    chain.readContract({ address: factory, abi: factoryAbi, functionName: 'maxCreatorTaxBps', blockNumber }),
    chain.readContract({ address: factory, abi: factoryAbi, functionName: 'snipeTaxSeconds', blockNumber }),
    chain.readContract({ address: factory, abi: factoryAbi, functionName: 'snipeTaxStartBps', blockNumber }),
    chain.readContract({ address: factory, abi: factoryAbi, functionName: 'launchConfigCount', blockNumber }),
    account
      ? (chain.readContract({ address: factory, abi: factoryAbi, functionName: 'canLaunch', args: [account], blockNumber }) as Promise<boolean>)
      : Promise.resolve(null),
    quoteCandidates(chain, blockNumber, options),
    chain.readContract({address:addresses.hook,abi:memeHookAbi,functionName:'currentFeePolicy',blockNumber}),
  ]);
  const ids = Array.from({ length: Number(configCount) }, (_, index) => BigInt(index));
  const configs = await Promise.all(ids.map((id) =>
    chain.readContract({ address: factory, abi: factoryAbi, functionName: 'getLaunchConfig', args: [id], blockNumber })
  ));
  // Inspect admission before touching arbitrary token contracts. Disabled candidates
  // cannot turn a valid snapshot into a decimals RPC failure.
  const identities = await Promise.all(candidates.map(async address => {
    const config = await chain.readContract({ address: addresses.quoteRegistry, abi: registryAbi, functionName: 'getConfig', args: [address], blockNumber });
    if (!config.enabled) return null;
    if (!config.policyVersion || config.phantomQuote <= 0n || config.graduationThreshold <= 0n || config.graduationThreshold > config.graduationQuoteCeiling) throw new Error(`Invalid quote policy: ${address}`);
    let symbol = 'MON';
    let decimals = 18;
    if (address !== zeroAddress) {
      const code = await chain.getCode({ address, blockNumber });
      if (!code || code === '0x') throw new Error(`Quote has no contract code: ${address}`);
      const metadata = await Promise.all([
        chain.readContract({ address, abi: tokenAbi, functionName: 'decimals', blockNumber }),
        chain.readContract({ address, abi: tokenAbi, functionName: 'symbol', blockNumber }),
      ]);
      decimals = Number(metadata[0]); symbol = metadata[1];
    }
    if (decimals !== Number(config.decimals)) throw new Error(`Quote decimals mismatch: ${address}`);
    return { address, symbol, decimals, config };
  }));
  const attempts = await Promise.all(([VENUE.UNISWAP_V4, VENUE.KURU] as VenueId[]).flatMap(venue => identities.map(async candidate => {
    if (!candidate || !(candidate.config.venueMask & (1 << venue))) return undefined;
    try {
      const config = await chain.readContract({ address: addresses.quoteRegistry, abi: registryAbi, functionName: 'admitted', args: [candidate.address, venue], blockNumber });
      if (!config.enabled) return undefined;
      if (config.policyHash !== candidate.config.policyHash || config.policyVersion !== candidate.config.policyVersion) throw new Error('Inconsistent quote policy snapshot.');
      return { venue, address: candidate.address, symbol: candidate.symbol, decimals: candidate.decimals, phantomQuote: config.phantomQuote, graduationThreshold: config.graduationThreshold, graduationQuoteCeiling: config.graduationQuoteCeiling, policyVersion: Number(config.policyVersion), policyHash: config.policyHash, assetId: config.assetId };
    } catch (error) {
      const revert = error instanceof BaseError ? error.walk(cause => cause instanceof ContractFunctionRevertedError) : undefined;
      if (revert instanceof ContractFunctionRevertedError && revert.data?.errorName === 'UnsupportedQuote') return undefined;
      throw error;
    }
  })));
  const quotes = attempts.filter((q): q is AdmittedQuote => q !== undefined);
  return {
    blockNumber,
    launchEnabled: Boolean(launchEnabled),
    canLaunch: canLaunch === null ? null : Boolean(canLaunch),
    launchFee,
    maxCreatorTaxBps,
    currentHookFeeBps: BigInt(hookPolicy.hookFeeBps),
    snipeTaxSeconds,
    snipeTaxStartBps,
    configs: configs.map((config, index) => ({
      id: ids[index],
      supply: config.supply,
      curveFeeBps: config.curveFeeBps,
      phantomQuote: config.phantomQuote,
      graduationThreshold: config.graduationThreshold,
      poolFee: Number(config.poolFee),
      tickSpacing: Number(config.tickSpacing),
      enabled: Boolean(config.enabled),
    })),
    quotes,
  };
}

/** Creator fee credit held by the escrow for `account` (native MON). */
export async function readFeeEscrowCredit(chain: ChainClient, account: Address, blockNumber?: bigint): Promise<bigint> {
  return chain.readContract({
    address: addresses.feeEscrow,
    abi: retroPickFeeEscrowV2Abi as never,
    functionName: 'balanceOf',
    args: [account], blockNumber,
  });
}

/** Vested, currently releasable buyback amount for a launched token. */
export async function readBuybackReleasable(chain: ChainClient, token: Address, blockNumber?: bigint): Promise<bigint> {
  return chain.readContract({
    address: addresses.buybackVault,
    abi: retroPickBuybackVaultV2Abi as never,
    functionName: 'releasable',
    args: [token], blockNumber,
  });
}
