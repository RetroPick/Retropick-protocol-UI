import { BaseError, ContractFunctionRevertedError, zeroAddress, type Address } from 'viem';
import { addresses, release, type ChainClient } from './chain.ts';
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

/** Static candidate quote assets; admission is verified live per venue. */
async function quoteCandidates(chain: ChainClient, blockNumber: bigint): Promise<{ address: Address; symbol: string; decimals: number }[]> {
  const wrapped = release.addresses.wrappedNative as Address;
  const circleUsdc = (await chain.readContract({
    address: addresses.quoteRegistry,
    abi: registryAbi,
    functionName: 'CIRCLE_TEST_USDC', blockNumber,
  })) as Address;
  const [wrappedDecimals, usdcDecimals] = await Promise.all([
    chain.readContract({ address: wrapped, abi: tokenAbi, functionName: 'decimals', blockNumber }),
    chain.readContract({ address: circleUsdc, abi: tokenAbi, functionName: 'decimals', blockNumber }),
  ]);
  return [
    { address: zeroAddress, symbol: 'MON', decimals: 18 }, // native quote sentinel
    { address: wrapped, symbol: 'WMON', decimals: Number(wrappedDecimals) },
    { address: circleUsdc, symbol: 'USDC', decimals: Number(usdcDecimals) },
  ];
}

/** Everything the create form and launch validation need, read atomically enough for review. */
export async function readLaunchPreconditions(chain: ChainClient, account?: Address, targetBlock?: bigint): Promise<LaunchPreconditions> {
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
    quoteCandidates(chain, blockNumber),
    chain.readContract({address:addresses.hook,abi:memeHookAbi,functionName:'currentFeePolicy',blockNumber}),
  ]);
  const ids = Array.from({ length: Number(configCount) }, (_, index) => BigInt(index));
  const configs = await Promise.all(ids.map((id) =>
    chain.readContract({ address: factory, abi: factoryAbi, functionName: 'getLaunchConfig', args: [id], blockNumber })
  ));
  const attempts = await Promise.all(([VENUE.UNISWAP_V4, VENUE.KURU] as VenueId[]).flatMap(venue => candidates.map(async candidate => {
    try {
      const config = await chain.readContract({ address: addresses.quoteRegistry, abi: registryAbi, functionName: 'admitted', args: [candidate.address, venue], blockNumber });
      return config?.enabled ? { venue, ...candidate, phantomQuote: config.phantomQuote, graduationThreshold: config.graduationThreshold } : undefined;
    } catch (error) {
      // Candidate assets are not necessarily admitted. The deployed registry
      // signals disabled assets/venues with this exact custom error, rather
      // than returning enabled:false. Other reverts and RPC failures must
      // still fail the snapshot; never present unavailable reads as admission.
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
