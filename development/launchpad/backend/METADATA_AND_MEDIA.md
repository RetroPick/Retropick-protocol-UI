---
id: LP-BE-META
type: normative_implementation
status: ready
owner: launchpad-backend
product: launchpad
version: v2
---

# Metadata and Media

Own token/launch descriptive metadata and media upload/rendering only where not canonical onchain.

Validate file type/size, sanitize untrusted text/URLs, content-address/hash where useful, and ensure broken media cannot block trading/detail pages.

Implementation binding (2026-10-11, ADR-017 ACCEPTED): `apps/media-service` — `POST /api/media/upload` (multipart, magic-byte sniffed PNG/JPEG/GIF/WebP, 3 MiB cap, origin allowlist, 12 uploads/min per peer) → Pinata IPFS pin (`ipfs://<cid>`) with `MEDIA_DIR` sha256-keyed local fallback; `GET /api/media/<hash>.<ext>` serves immutable content (`nosniff`, `CSP: default-src 'none'; sandbox`). The launcher (`apps/retro-ui`) downscales before upload and renders logos for https/http/ipfs/ar URIs via public gateways with letter-glyph fallback. The indexer stays GET-only and untouched.