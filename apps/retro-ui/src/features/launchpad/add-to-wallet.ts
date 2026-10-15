import type { Address } from 'viem';
import { buildWatchAssetPayload, type WatchAssetPayload } from '@retropick/launchpad-sdk/wallet';

/** Only wallet-fetchable images qualify: MetaMask downloads the URL from a plain web client. */
export function httpsImageUrl(src: string | null | undefined): string | null {
  const value = src?.trim();
  return value && value.startsWith('https://') ? value : null;
}

export type WatchAssetErrorKind = 'rejected' | 'unsupported' | 'wrong-chain' | 'failed';

/** Map a wallet_watchAsset failure to UI copy. 4001 (rejection) and -32601 (unsupported) are wallet-standard codes. */
export function classifyWatchAssetError(error: unknown): WatchAssetErrorKind {
  const code = (error as { code?: number | string } | null)?.code;
  if (code === 4001 || code === '4001') return 'rejected';
  if (code === -32601 || code === '-32601') return 'unsupported';
  if (code === 'WRONG_CHAIN') return 'wrong-chain';
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/user rejected|user denied/i.test(message)) return 'rejected';
  if (/not supported|unsupported|unrecognized|does not support/i.test(message)) return 'unsupported';
  return 'failed';
}

export type WalletUiStatus = 'disconnected' | 'connecting' | 'connected' | 'wrong-chain';

/** Which wallet interaction the next click must perform, before the watchAsset request itself. */
export function watchAssetAction(status: WalletUiStatus): 'connect' | 'switch-chain' | 'request' {
  return status === 'connected' ? 'request' : status === 'wrong-chain' ? 'switch-chain' : 'connect';
}

export type AddToWalletRequestInput = { address: Address; symbol: string; decimals: number; logo: string | null | undefined };

/** The exact EIP-747 payload this page will send: resolved https logo only, on-chain decimals required. */
export function addToWalletPayload(input: AddToWalletRequestInput): WatchAssetPayload {
  return buildWatchAssetPayload({ address: input.address, symbol: input.symbol, decimals: input.decimals, image: httpsImageUrl(input.logo) });
}
