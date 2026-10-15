import { WALLET_ICON_DERIVATIVES } from './wallet-icons.generated.ts';

/**
 * Wallet-facing image URL for an on-chain logo URI (EIP-747 `image`).
 *
 * Wallet icon clients are plain <img> fetchers: they handle static square PNGs most
 * reliably, while creator uploads may be animated, non-square GIFs. Registered sources
 * resolve to committed content-addressed derivatives (`/wallet/<sha256>.png`, generated
 * by scripts/wallet-icons) served from the public origin. Unregistered sources fall back
 * to the previous rule: any https URL passes, everything else is dropped (never send a
 * wallet a URI it cannot fetch).
 */
const PUBLIC_ORIGIN = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_PUBLIC_ORIGIN?.replace(/\/+$/, '') || 'https://retropick.xyz';

export function resolveWalletImage(logo: string | null | undefined): string | null {
  const value = logo?.trim();
  if (!value) return null;
  const derivative = WALLET_ICON_DERIVATIVES[value];
  if (derivative) return `${PUBLIC_ORIGIN}${derivative}`;
  return value.startsWith('https://') ? value : null;
}
