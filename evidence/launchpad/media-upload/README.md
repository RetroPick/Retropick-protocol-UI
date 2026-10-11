# Media upload evidence (LAUNCHPAD-MEDIA-UPLOAD-001 / RETROPICK-MEDIA-UPLOAD)

Collected 2026-10-11. All artifacts in this directory.

- `smoke-transcript.txt` — real `apps/media-service` (local mode, port 8790) round-trip: multipart upload → sha256-keyed URI → GET with immutable/`nosniff`/CSP-sandbox headers and byte-identical content; idempotent re-upload; wrong/missing Origin → 403; content-typed-as-png text → `UNSUPPORTED_MEDIA_TYPE`. `sample-logo.png` is the exact bytes uploaded.
- Unit suites: `apps/media-service` `test/media.test.ts` (7 tests incl. Pinata-mode stubbed pin: endpoint/auth/body/cid validation, failure mapping) and `apps/retro-ui` `tests/media.test.mjs` (URI resolution, gateway fallback, `isLogoUri` scheme set, `uploadLogo` error mapping).
- Browser validation: `evidence/platform/frontend/browser-validation/` — runs `*-live-media`, `*-live-media2`, `*-live-media-final` cover `e2e/live/media-upload.spec.ts` (upload flow with stubbed `/api/media` + real build, manual `ipfs://` URI path, discovery rendering of an `ipfs://` logo through the public gateway with the indexer feed patched in flight); `*-fixture` runs (234 passed) prove no regression in mock mode.
- Notable finding recorded during validation: public IPFS gateways rate-limit (HTTP 429 `text/plain`); Chromium opaque-response blocking then logs `net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`. Successful responses carry `access-control-allow-origin: *` and embed fine. The UI already treats failed image loads as glyph fallback plus one alternate-gateway retry — no page is blocked by broken media (per METADATA_AND_MEDIA.md).

Production IPFS mode (Pinata) is exercised by the stubbed unit suite; activating it live only requires `PINATA_JWT` in the service env (see ADR-017 ops notes).
