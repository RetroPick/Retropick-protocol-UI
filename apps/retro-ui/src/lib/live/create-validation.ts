import { formatUnits, isAddress, zeroAddress, type Address } from 'viem';
import { parseExact } from '@retropick/launchpad-sdk/math';
import type { LaunchSeed } from './queries';

/** RetroPickLaunchDeployerV2 enforces bytes, rather than JavaScript characters. */
export const LAUNCH_METADATA_LIMITS = { name: 64, ticker: 16, logo: 512, description: 2048, x: 256, telegram: 256, discord: 256, website: 256, farcaster: 256 } as const;
export type LaunchMetadata = { [K in keyof typeof LAUNCH_METADATA_LIMITS]: string };
const labels: Record<keyof LaunchMetadata, string> = { name: 'Name', ticker: 'Ticker', logo: 'Logo URI', description: 'Description', x: 'X', telegram: 'Telegram', discord: 'Discord', website: 'Website', farcaster: 'Farcaster' };
export const utf8Bytes = (value: string): number => new TextEncoder().encode(value).length;

export function isLogoUri(value: string): boolean {
  if (!value) return true;
  try {
    const uri = new URL(value);
    // http is admitted for local media-service fallback URIs; HTTPS pages will still glyph-fall back on mixed content.
    return ['https:', 'http:', 'ipfs:', 'ar:'].includes(uri.protocol) && !!uri.hostname && !uri.username && !uri.password;
  } catch { return false; }
}

export function validateLaunchMetadata(metadata: LaunchMetadata): string {
  if (!metadata.name.trim()) return 'Give your token a name.';
  if (!metadata.ticker.trim()) return 'Give your token a ticker.';
  for (const key of Object.keys(LAUNCH_METADATA_LIMITS) as (keyof LaunchMetadata)[]) {
    if (utf8Bytes(metadata[key]) > LAUNCH_METADATA_LIMITS[key]) return `${labels[key]} must fit within ${LAUNCH_METADATA_LIMITS[key]} UTF-8 bytes.`;
  }
  return isLogoUri(metadata.logo) ? '' : 'Use a public HTTPS, IPFS or Arweave logo URI, or upload an image.';
}

export function validateCreatorFee(input: string, maximumBps: bigint): string {
  try {
    const bps = parseExact(input || '0', 2);
    return bps > maximumBps ? `Creator fee must be at most ${formatUnits(maximumBps, 2)}% under the current factory and trade fee limits.` : '';
  } catch { return 'Enter a creator fee of zero or greater with at most two decimal places.'; }
}

export function validFeeRecipient(input: string): boolean {
  return !input || isAddress(input, { strict: true }) && input.toLowerCase() !== zeroAddress;
}

/** Only the expected factory's confirmed event may seed an immediate token route. */
export function confirmedLaunchSeed(
  event: { address: string; args: Record<string, unknown> } | undefined,
  expected: { factory: Address; creator: Address; quote: Address; configId: bigint },
  metadata: LaunchMetadata,
  quote: { symbol: string; decimals: number },
  receipt: { blockNumber: bigint; transactionHash: string },
): LaunchSeed {
  const token = event?.args.token;
  const curve = event?.args.curve;
  if (!event || event.address.toLowerCase() !== expected.factory.toLowerCase()
    || typeof token !== 'string' || !isAddress(token) || token.toLowerCase() === zeroAddress
    || typeof curve !== 'string' || !isAddress(curve) || curve.toLowerCase() === zeroAddress
    || String(event.args.deployer).toLowerCase() !== expected.creator.toLowerCase()
    || String(event.args.pairToken).toLowerCase() !== expected.quote.toLowerCase()
    || event.args.launchConfigId !== expected.configId) {
    throw Error('The confirmed receipt did not contain the expected factory launch. Check the transaction before retrying.');
  }
  return { token: token as Address, curve: curve as Address, name: metadata.name, symbol: metadata.ticker,
    description: metadata.description, logo: metadata.logo, quoteSymbol: quote.symbol, quoteDecimals: quote.decimals,
    creator: expected.creator, receiptBlock: receipt.blockNumber, transactionHash: receipt.transactionHash };
}
