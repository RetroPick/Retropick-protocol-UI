/**
 * Onchain logo URIs -> URLs an <img> can load.
 *
 * The onchain `logo` string may be https://, http:// (local media-service fallback),
 * ipfs://<cid> or ar://<txid>. ipfs/ar URIs resolve through public gateways:
 * ipfs.io and dweb.link are the surviving IPFS Foundation gateways (verified
 * 2026-10-11; cloudflare-ipfs.com was discontinued in May 2024), arweave.net for Arweave.
 */

type ViteEnv = { env?: Record<string, string | undefined> };
const env = (import.meta as unknown as ViteEnv).env;

export const IPFS_GATEWAY = env?.VITE_IPFS_GATEWAY?.replace(/\/+$/, '') || 'https://ipfs.io';
export const IPFS_GATEWAY_FALLBACK = 'https://dweb.link';

const IPFS_PATTERN = /^ipfs:\/\/([^/?#]+)/;
const ARWEAVE_PATTERN = /^ar:\/\/([^/?#]+)/;

/** Maps a logo URI to a browser-loadable URL, or null so the UI falls back to the letter glyph. */
export function resolveMediaSrc(logo: string | null | undefined): string | null {
  const value = logo?.trim();
  if (!value) return null;
  const ipfs = value.match(IPFS_PATTERN);
  if (ipfs) return `${IPFS_GATEWAY}/ipfs/${ipfs[1]}`;
  const arweave = value.match(ARWEAVE_PATTERN);
  if (arweave) return `https://arweave.net/${arweave[1]}`;
  if (/^https?:\/\//.test(value)) return value;
  return null;
}

/** Primary candidate first, then one alternate public gateway for retry when the primary fails or rate-limits. */
export function ipfsGatewayCandidates(src: string): string[] {
  const at = src.indexOf('/ipfs/');
  if (at === -1) return [src];
  const fallback = `${IPFS_GATEWAY_FALLBACK}${src.slice(at)}`;
  return fallback === src ? [src] : [src, fallback];
}
