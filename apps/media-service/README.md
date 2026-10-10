# @retropick/media-service

Token logo upload service for the RetroPick launchpad. Stores one image per launch and returns the URI the launcher writes into the onchain `logo` field (a ≤512-byte string enforced by `RetroPickLaunchDeployerV2` — see ADR-017).

Node 24, `node:http` + `node:crypto` only. No framework dependencies, no custody, no signing keys, no chain access.

## Routes

| Route | Method | Notes |
|---|---|---|
| `/api/media/health` | GET | `{ chainId, mediaOnly, mode }` — open, no Origin needed |
| `/api/media/upload` | POST | multipart `file` field. Origin must be in `MEDIA_ORIGIN`. 12 uploads/min per peer, ≤3 MiB body. Content typed by magic bytes (PNG/JPEG/GIF/WebP only). |
| `/api/media/<sha256>.<ext>` | GET | Immutable content-addressed file. `Cache-Control: immutable`, `X-Content-Type-Options: nosniff`, `CSP: default-src 'none'; sandbox`. |

Upload response: `{ uri, https, hash, bytes, mime, mode }`.

## Modes

- **pinata** (`PINATA_JWT` set): bytes are pinned via `POST https://api.pinata.cloud/pinning/pinFileToIPFS` (Bearer JWT, server-side only) and the service returns `uri: "ipfs://<cid>"` plus an `https://ipfs.io/ipfs/<cid>` gateway copy. This is the production mode — the URI is durable and host-independent (the pump.fun-style pattern).
- **local** (fallback, zero accounts): bytes are stored under `MEDIA_DIR` keyed by sha256 and the URI points at `MEDIA_PUBLIC_BASE/api/media/<hash>.<ext>`. Fine for development; images live and die with this host, and `http://` URIs will not render on HTTPS pages (mixed content) — the UI falls back to the letter glyph.

## Environment

See `.env.example`. Real env files are gitignored; never commit a `PINATA_JWT`.

## Production wiring

1. Run this service on the worker host next to the indexer (loopback bind + an HTTPS transport in front, same as the other services).
2. Point a Vercel rewrite for `/api/media` at it (wherever the `/api/referrals` rewrite lives), and set `MEDIA_ORIGIN` to the frontend origin.
3. Set `PINATA_JWT` (Pinata free tier: 60 req/min, no aggregate upload cap — verified 2026-10-11) to activate IPFS mode.

## Develop

```
pnpm --filter @retropick/media-service test
pnpm --filter @retropick/media-service typecheck
pnpm --filter @retropick/media-service start
```

The retro-ui dev server proxies `/api/media` to `http://127.0.0.1:8790` (8789 is taken by the optional wallet bridge).
