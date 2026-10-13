/**
 * Onchain logo URIs -> URLs an <img> can load.
 *
 * The onchain `logo` string may be https://, http:// (local media-service fallback),
 * ipfs://<cid> or ar://<txid>. ipfs/ar URIs resolve through public gateways:
 * Pinata serves the default IPFS gateway; ipfs.io and dweb.link are fallbacks.
 * arweave.net serves Arweave images.
 */

type ViteEnv = { env?: Record<string, string | undefined> };
const env = (import.meta as unknown as ViteEnv).env;

export const IPFS_GATEWAY = env?.VITE_IPFS_GATEWAY?.replace(/\/+$/, '') || 'https://gateway.pinata.cloud';
export const IPFS_GATEWAY_FALLBACK = 'https://dweb.link';

const IPFS_PATTERN = /^ipfs:\/\/(?:ipfs\/)?([^/?#]+.*)$/;
const ARWEAVE_PATTERN = /^ar:\/\/([^/?#]+.*)$/;
/**
 * Staging media-service URIs minted while the backend sat behind a rotating cloudflared
 * QUICK tunnel embed a now-dead hostname. Files are content-addressed (sha256), so the same
 * bytes are served same-origin through the staging rewrite `/api/media/*` → current tunnel.
 */
const QUICK_TUNNEL_MEDIA = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com(\/api\/media\/[0-9a-f]{64}\.(?:png|jpe?g|webp|gif))$/i;

/** Maps a logo URI to a browser-loadable URL, or null so the UI falls back to the letter glyph. */
export function resolveMediaSrc(logo: string | null | undefined): string | null {
  const value = logo?.trim();
  if (!value) return null;
  const ipfs = value.match(IPFS_PATTERN);
  if (ipfs) return `${IPFS_GATEWAY}/ipfs/${ipfs[1]}`;
  const arweave = value.match(ARWEAVE_PATTERN);
  if (arweave) return `https://arweave.net/${arweave[1]}`;
  const tunneled = value.match(QUICK_TUNNEL_MEDIA);
  if (tunneled) return tunneled[1];
  if (/^https?:\/\//.test(value)) return value;
  return null;
}

/** Preserve the full content path and try each gateway at most once. */
export function ipfsGatewayCandidates(src: string): string[] {
  let url: URL;
  try { url = new URL(src); } catch { return [src]; }
  if (!['http:', 'https:'].includes(url.protocol) || !url.pathname.startsWith('/ipfs/')) return [src];
  const path = `${url.pathname}${url.search}${url.hash}`;
  return [...new Set([src, `https://gateway.pinata.cloud${path}`, `https://ipfs.io${path}`, `${IPFS_GATEWAY_FALLBACK}${path}`])];
}
