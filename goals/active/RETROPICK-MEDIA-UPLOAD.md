# RETROPICK-MEDIA-UPLOAD — Local logo upload + token images on dashboards

**Status:** COMPLETE (2026-10-11) — code, tests, e2e, docs
**Owner lanes:** launchpad-frontend (`apps/retro-ui`) + backend service pattern (`apps/media-service`)
**Decision authority:** ADR-017 (ACCEPTED 2026-10-11)

## Goal

Live token launch lets users pick a local image file; it is stored durably (IPFS via Pinata; local content-addressed fallback when unconfigured) and the resulting URI is written into the onchain `logo` field. Discovery, token detail, command palette and the post-launch page render token images for `https://`, `http://`, `ipfs://`, `ar://` logos, with letter-glyph fallback when media is broken or unreachable.

## Scope guards (inherited + specific)

- No Solidity edits (HACKATHON_FREEZE); no indexer changes (GET-only by design).
- No new framework dependencies (media-service is `node:http`/`node:crypto` only; UI uses browser built-ins).
- Secrets only in gitignored env (`PINATA_JWT` server-side; nothing secret in `VITE_*`).
- No UI redesign: the live picker reuses the DEMO branch's `.image-picker` styles.

## Acceptance

1. Launcher (live): file → client downscale (≤1024px, ≤256 KiB WebP; GIF ≤512 KiB passthrough) → `POST /api/media/upload` → `form.logo = uri` (≤512 bytes) — plus an advanced "Paste a URI instead" manual path.
2. Dashboards render the image: `resolveMediaSrc` in `discovery.ts` + `token-detail.tsx` (state→indexed→seed precedence), one `dweb.link` retry in `TokenIdentity`, glyph fallback on failure.
3. Evidence under `evidence/launchpad/media-upload/` and `evidence/platform/frontend/browser-validation/*live-media*`.
