# Token image disappears after deployment — investigation and fix

Date: 2026-10-13. Source baseline: `d7d244e38c4b23afa62c1774ae128c12e223aec1`
plus the focused uncommitted image fix. Module: Launchpad Core frontend/image delivery.
Owner: frontend. Status: code fixed and browser verified; public frontend deployment pending.
Unrelated pre-existing workspace changes were preserved.

## Root cause and trace

The public `https://retropick.xyz/launchpad` reproduced the report for RETRO,
`0xf8f17922599136b44e175eec9a43123c000f3366`.

| Boundary | Observation |
| --- | --- |
| Upload | `/api/media/health` reports Pinata mode. The client stores `uploadLogo(...).uri` as `form.logo`. |
| Creation | The form supplies that URI unchanged to `prepareLaunchToken`; the confirmed receipt seed retains it. |
| Chain | A direct `logo()` read at `https://testnet-rpc.monad.xyz` returned `ipfs://Qmc3ZojHMWXFkautyJvnud1YzDN3jNvPH7QWb39bYmy9aL`. |
| Indexer | Public `/v1/launches?limit=100` returned the identical logo URI for RETRO. |
| Browser | Resolver mapped the URI to ipfs.io; TokenIdentity retried only dweb.link. Both requests failed with `net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`, then the component rendered its letter glyph. |
| Image availability | `https://gateway.pinata.cloud/ipfs/<same CID>` returned a 52,540-byte WebP; Chromium decoded the real image at 1024×1024. |

The image reference was not lost by deployment or indexing. The confirmed defect
was the selected HTTP delivery route and insufficient gateway fallback coverage.
A successful creation preview does not prove remote delivery: uploads preview a
local blob URL. Nine other tokens in the observed feed have empty logos; this
fix cannot invent images for launches that never stored a URI.

Additional confirmed code defects: IPFS/Arweave resolution discarded directory
paths after the CID/transaction ID, and creation previews used inconsistent
fallback handling (one imperatively retried gateway, another never retried).

## Changes

- Resolver defaults to the observed working Pinata public gateway. An explicit
  `VITE_IPFS_GATEWAY` still takes precedence. Distinct fallbacks include Pinata,
  ipfs.io and dweb.link; full paths, queries and fragments survive retries.
- Shared `TokenImage` renders dashboard and terminal identities and creation
  previews. Each IPFS candidate has an 8-second bound; errors advance immediately;
  exhaustion renders the existing glyph. URI changes reset retries. Timers clean
  up on source changes/unmount, and competing timeout/error callbacks cannot skip
  two candidates. Avatars load eagerly so a timeout cannot run before lazy loading
  begins for an offscreen row.
- The upload's “view” link uses the same configured resolver as the dashboard.
- Unit/browser regression coverage and delivery notes in ADR-017 were updated.

Contracts, canonical URIs, indexer projection, pinning credentials, backend runtime,
DNS and economic transaction paths did not change. Storage architecture remains
ADR-017: canonical onchain URI, offchain media. Current provider documentation:
[Pinata gateway format](https://knowledge.pinata.cloud/en/articles/5666429-dedicated-gateways).

## Verification

Commands from repository root unless an app cwd is specified:

```bash
pnpm --filter @retropick/retro-ui test:media
pnpm --filter @retropick/retro-ui test:terminal
pnpm --filter @retropick/retro-ui typecheck
pnpm --filter @retropick/media-service test
git diff --check
```

Results: media 5/5, terminal 14/14, media service 7/7, TypeScript PASS,
whitespace PASS. Playwright's web-server setup built the production frontend.

From `apps/retro-ui`:

```bash
VITE_DATA_MODE=live VITE_INDEXER_URL=https://api-staging.retropick.xyz \
LIVE_INDEXER_URL=https://api-staging.retropick.xyz \
node e2e/run.mjs live token-image-fix -- media-upload.spec.ts \
--project=desktop-1440 --project=mobile-390 --workers=2 --retries=0

VITE_DATA_MODE=live VITE_INDEXER_URL=https://api-staging.retropick.xyz \
LIVE_INDEXER_URL=https://api-staging.retropick.xyz \
node e2e/run.mjs live token-image-real-final -- media-upload.spec.ts \
--grep 'existing RETRO' --project=desktop-1440 --project=mobile-390 \
--workers=1 --retries=0

node e2e/run.mjs fixture token-image-shared -- smoke.spec.ts create.spec.ts \
token-terminal.spec.ts --project=desktop-1440 --project=mobile-390 \
--workers=2 --retries=0
```

- Controlled media browser regression: **10/10 PASS**, no retries. Covers multipart
  upload/metadata validation, decoded previews, feed-to-avatar mapping, directory
  paths, source reset, gateway errors, timeout and exhaustion. Media/network
  responses for these regression scenarios are intercepted fixtures.
- Real existing-token browser validation: **2/2 PASS**, no retries. Actual public
  indexer/RPC/image responses, 1024×1024 decoded image, dashboard, hard reload and
  token detail on desktop 1440 and mobile 390. The frontend itself is the patched
  local production build; this is not a claim that the public site serves the fix.
  An unrelated radar request is forwarded to the real public service because
  Vite preview lacks the deployed same-origin rewrite; no fabricated radar data.
- Shared UI regression: **49 PASS / 5 pre-existing viewport-specific skips**,
  zero failures, retries disabled. No signing/broadcast occurred.

Evidence:

- [Contract/indexer/browser observations](identity.json)
- [Public frontend before fix](public-before.png)
- [Controlled media run](../browser-validation/20261013T121643Z-live-token-image-fix/results.json)
- [Final real-data run](../browser-validation/20261013T122304Z-live-token-image-real-final/results.json)
- [Real dashboard screenshot](../browser-validation/20261013T122304Z-live-token-image-real-final/screenshots/desktop-1440/real-retro-dashboard-image.png)
- [Real token screenshot](../browser-validation/20261013T122304Z-live-token-image-real-final/screenshots/desktop-1440/real-retro-token-image.png)
- [Shared UI run](../browser-validation/20261013T122041Z-fixture-token-image-shared/results.json)

Earlier attempts are preserved: one run selected no tests because a test edit
used the wrong working directory; another completed all image assertions but
failed the console gate on missing local radar routes; another encountered
`ERR_NETWORK_CHANGED` on Pinata and cross-origin radar configuration errors.
The final run corrects test routing and passes both viewports without retries.
These failures were not erased or silently reclassified.

## Handoff and limits

Deploy the focused frontend changes using the existing reviewed release workflow
and stable backend `https://api-staging.retropick.xyz`; preserve apex/staging aliases
and existing same-origin rewrites. If a deployed `VITE_IPFS_GATEWAY` explicitly
selects ipfs.io, update the public configuration to Pinata or an operator-provided
dedicated gateway for fastest delivery; the new fallback still includes Pinata.
Recheck RETRO's avatar and decoded dimensions on dashboard/reload/token detail
on the deployed origin. No token redeployment or metadata migration is required.

This session did not commit, merge or publish a frontend release, and did not
perform a new wallet-signed launch. Upload regression is intercepted; the real
media integration is proven using an already-deployed token. Public gateways
remain external dependencies that can fail or rate-limit; the glyph remains the
safe final fallback. A dedicated gateway can be supplied through the existing
public environment setting without changing canonical onchain metadata.
