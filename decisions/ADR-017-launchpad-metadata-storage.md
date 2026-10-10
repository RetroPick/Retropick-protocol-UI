# ADR-017: Launchpad Metadata and Media Storage

**Status:** ACCEPTED (amended 2026-10-11; original proposal 2026-09-20)
**Date:** 2026-10-11
**Scope:** RetroPick Launchpad V2 (canonical frontend `apps/retro-ui`, media backend `apps/media-service`)

## Decision

Token/launch descriptive metadata stays canonical onchain exactly as deployed: `name`, `symbol`, `logo` (≤512-byte URI string enforced by `RetroPickLaunchDeployerV2`), `description` and socials on the token contract. Media (the logo image itself) is stored offchain:

1. **Primary — IPFS via Pinata.** A dedicated `apps/media-service` (Node 24, `node:http` only, loopback-bound like the other product services, port 8790) accepts the launcher browser's multipart upload (same-origin `/api/media/upload`, dev-proxied by Vite, Vercel rewrite in production), validates it (magic-byte sniffing for PNG/JPEG/GIF/WebP, 3 MiB cap, origin allowlist, 12 uploads/min per peer), and pins the bytes via `POST https://api.pinata.cloud/pinning/pinFileToIPFS` using a server-side `PINATA_JWT` (gitignored env only). It returns `ipfs://<cid>` (~53 bytes, comfortably inside the onchain 512-byte `logo` cap), which the launcher writes into the launch calldata unchanged. This is the pump.fun-style pattern; the URI is durable and host-independent.
2. **Fallback — local content-addressed store.** With no `PINATA_JWT` configured the same service stores files under `MEDIA_DIR` keyed by sha256 and serves them immutably at `MEDIA_PUBLIC_BASE/api/media/<hash>.<ext>`, returning that HTTP URI. Zero third-party accounts; adequate for development. HTTP URIs may be blocked as mixed content on HTTPS pages — the UI falls back to the letter glyph.

The client (retro-ui) downscales to ≤1024px and re-encodes ≤256 KiB WebP before upload (GIFs ≤512 KiB pass through to preserve animation), then renders any `https://`/`http://`/`ipfs://`/`ar://` logo through public gateways (`ipfs.io` default, one `dweb.link` retry) with a letter-glyph fallback so broken/slow media never blocks trading or detail pages.

The indexer is unchanged (GET-only; it already persists `logo` from the token's `getTokenInfo()` and serves it on `/v1/launches*`). Onchain economic state is never moved into metadata storage. Contracts are untouched.

## Why not the alternatives

- **Data-URI onchain** (Zora-coin style): the deployed `logo` cap is 512 bytes; an image does not fit, and contracts are frozen (hackathon freeze). Already ruled out in `docs/frontend/CREATE_FORM_ABI_MAP.md`.
- **Client-direct pinning**: every pinning provider requires an account credential; exposing it in `VITE_*` violates the secrets rule.
- **Self-host only**: images die with the host; not the launchpad standard.

## Verification appendix (current-source checks, 2026-10-11)

- Pinata: endpoint `https://api.pinata.cloud/pinning/pinFileToIPFS`, Bearer JWT auth; free tier 60 requests/min, no aggregate upload cap, per-file cap far above our 3 MiB (docs.pinata.cloud — "Pin File to IPFS", "Limits").
- Public gateways: `ipfs.io` and `dweb.link` (IPFS Foundation "Rainbow") alive and serving with `access-control-allow-origin: *`; both rate-limit (observed HTTP 429 with `text/plain` bodies, which Chromium's opaque-response blocking logs as `net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin` — handled by the img onError → glyph fallback and the one-gateway retry). `cloudflare-ipfs.com` was discontinued by Cloudflare in May 2024 and must not be used.
- Arweave render path: `ar://<txid>` → `https://arweave.net/<txid>` (public gateway).
- Industry pattern: pump.fun pins coin images + metadata JSON via Pinata; Flaunch exposes a base64 convenience endpoint backed by IPFS; Zora stores data-URIs onchain (not possible here — see above).

## Ops notes

- Production: run `apps/media-service` on the worker host beside the indexer behind HTTPS, add a Vercel rewrite for `/api/media`, set `MEDIA_ORIGIN` to the frontend origin, and set `PINATA_JWT` to activate IPFS mode.
- Serving untrusted media: responses carry `X-Content-Type-Options: nosniff` and `Content-Security-Policy: default-src 'none'; sandbox` with immutable caching; files are keyed by content hash (client filenames never used).
