// Read-only qualification for units used by historical Radar amounts. Public docs
// differ from the deployed Trade ABI: the shipped ABI and verified market win.
import { createPublicClient, http, zeroAddress, type Address } from 'viem';
import { kuruAbi } from '../../../packages/launchpad-sdk/src/abis/kuruAbi.ts';
import { routerAbi } from '../../../packages/launchpad-sdk/src/abis/routerAbi.ts';
import { kuruEnvironmentAbi } from '../../../packages/launchpad-sdk/src/abis/kuruEnvironmentAbi.ts';
import { release } from '../../../packages/launchpad-sdk/src/release.ts';
import type { VerifiedMarketParams } from './radar.ts';

export function validateMarketParams(token: string, market: readonly unknown[], registered: readonly unknown[]): VerifiedMarketParams | null {
  if (market.length !== 11 || registered.length !== 11 || market.some((v, i) => String(v).toLowerCase() !== String(registered[i]).toLowerCase())) return null;
  if (String(market[2]).toLowerCase() !== token.toLowerCase()) return null;
  try {
    const baseDecimals = Number(market[3]);
    const sizePrecision = BigInt(String(market[1]));
    if (!Number.isInteger(baseDecimals) || baseDecimals < 0 || baseDecimals > 255 || sizePrecision <= 0n) return null;
    if (BigInt(String(market[0])) <= 0n) return null;
    // The current RetroPick release has native MON quote; unsupported quote
    // semantics remain unavailable instead of inheriting MON's unit assumptions.
    if (String(market[4]).toLowerCase() !== zeroAddress || BigInt(String(market[5])) !== 18n) return null;
    return { token: token.toLowerCase(), baseDecimals, sizePrecision };
  } catch { return null; }
}

export function marketParamsReader(rpcUrl: string, chainId: number) {
  const client = createPublicClient({ transport: http(rpcUrl, { timeout: 8000, retryCount: 0 }) });
  return async (market: string, token: string): Promise<VerifiedMarketParams | null> => {
    try {
      if (await client.getChainId() !== chainId || chainId !== release.chainId) return null;
      const blockNumber = await client.getBlockNumber({ cacheTime: 0 });
      const [params, registered] = await Promise.all([
        client.readContract({ address: market as Address, abi: kuruAbi, functionName: 'getMarketParams', blockNumber }),
        client.readContract({ address: release.kuruEnvironment.router as Address, abi: routerAbi, functionName: 'verifiedMarket', args: [market as Address], blockNumber }),
        client.readContract({ address: release.addresses.kuruEnvironment as Address, abi: kuruEnvironmentAbi, functionName: 'validate', blockNumber }),
      ]);
      return validateMarketParams(token, params, registered);
    } catch { return null; }
  };
}
