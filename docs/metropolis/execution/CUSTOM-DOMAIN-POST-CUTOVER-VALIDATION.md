# CUSTOM DOMAIN POST-CUTOVER VALIDATION

Historical read-only cutover validation for CAF. The subsequent economics defect and corrected
frontend release `346366c093010b0b3eda26fc53f866980bcf9e15` are documented in
[the launch-terms recovery report](../integration/stages/20261013-launch-terms-recovery.md).

2026-10-13. **PASS — the public Launchpad website and live read services are serving at
https://retropick.xyz.** No hosting or read-path blocker was found. This is read-only website
validation, not approval of financial flows, hardware passkey qualification or mainnet deployment.

The operator attached and verified the domain, then authorized post-cutover read-only tests.
This run changed no DNS, Vercel configuration, backend service, contract or previous landing
project. Application requests were reads; RPC POST requests used only `eth_chainId` and
`eth_blockNumber`. No referral challenge/session issuance, upload, wallet signature, WebAuthn
enrollment or financial transaction was performed.

## Verified deployment

- Browser origin: **https://retropick.xyz**. Root loads Launchpad; no waitlist or hostname rehearsal.
- Full public source SHA: **`caf23208f6831b424b1cc51c0785ecf6bdeae264`**.
- Deployment: `dpl_9p4uikyzetTp3APK9mu9CY6WP7iR`, READY, production artifact.
- Canonical project: `retropick-metropolis-retro-ui-staging`, `apps/retro-ui`, team `asyams-projects`,
  project ID `prj_dKwt5xQUlhZg6shbOWyFvZbZXSIO`.
- Vercel domain API: `verified: true`, exact canonical project ID, `redirect: null`.
- Backend remains **https://api-staging.retropick.xyz**, isolated Contabo services.
- Existing staging alias remains available and serves the same release and live data:
  https://retropick-metropolis-retro-ui-stagi.vercel.app.

## PASS / FAIL

| Check | Result | Actual evidence |
| --- | --- | --- |
| Real apex deployment / release / domain verification | PASS | Public release matches full SHA; Vercel GET confirms verified project assignment |
| HTTPS and redirects | PASS | Trusted TLS 1.3 for apex and API; matching certificate SANs; both HTTP paths redirect 308 to their own HTTPS hostname |
| Desktop/mobile public Playwright | PASS | **14/14**, zero retries, 1440×900 desktop and Pixel 7 at 390×844 |
| Root URL and referrals panel | PASS | **2/2** additional viewport checks; root renders live listings, Referrals shows correct connect-wallet state |
| API rewrites and direct backend | PASS | **21/21** GET endpoint checks across apex, permanent backend and retained staging alias |
| Actual Monad launch data | PASS | Nine real launches on all three origins; pairs/activity usable, graduated terminal and Orders tab render |
| Indexer freshness | PASS | Chain 10143, known head, projection 2, recent indexedAt, null error, lag ≤64 |
| Referrals | PASS | Live health syncError null; unauthenticated summary correctly 401 AUTHENTICATION_REQUIRED; actual UI mounts |
| Media | PASS | Live Pinata mode healthy; existing 207,624-byte WebP has identical SHA256 through apex |
| Browser RPC | PASS | Both official and Ankr providers return 10143 and positive live block numbers from both viewports |
| Same-origin API requests | PASS | Recorded browser `/v1/*` calls all target `https://retropick.xyz` |
| Wallet entry and trading interface | PASS | Wallet picker opens; clean browser honestly reports no installed wallet. Graduated depth/Orders UI renders |
| Mera browser-origin compatibility | PASS | Real apex secure context, WebAuthn API available, Vault mounted; reviewed runtime RP functions derive `retropick.xyz` from browser hostname |
| Security headers | PASS | Live CSP/frame-ancestors none, frame DENY, nosniff, self WebAuthn permissions; no console/page errors in supplemental flows |
| Unexpected HTTP 502 | PASS | None observed in endpoint, browser or monitor checks |
| Five-minute apex monitoring | PASS | **11/11** samples, zero failures, 304.6s; lag8–8blocks |
| Real installed-wallet session / signatures | NOT RUN | Clean browser picker test; authenticated wallet/signature flows require separate scope |
| Hardware PRF ceremony / protected-account recovery | NOT RUN | No enrollment or authenticator operation under read-only authorization |
| Media upload / signed referral association | NOT RUN | Would write data; retained content and read/auth boundaries checked |
| Financial actions / transactions | NOT RUN | Explicitly prohibited; no orders, claims, sends or contract deployment |

No fixtures, hostname interception or synthetic API responses were used in this post-cutover run.
The earlier controlled apex rehearsal and fixture suites are separate supporting evidence and
are not included in the live 14/14 result. A depth-panel pass permits honest empty or RPC-unavailable
book states; it does not guarantee a constantly two-sided Kuru market.

Monitoring ran from 2026-10-13T10:42:49.462Z to 2026-10-13T10:47:52.973Z, checking the exact CAF release, actual
public health/list readiness and current-chain projection.

## Remaining limitations and blockers

**No DNS, certificate, rewrite, indexer or live-market hosting blocker remains.** The optional
Vercel DNS recommendation was left untouched; the existing route passes actual public validation.

Existing passkeys and origin-local protected-wallet state remain bound to the old staging host.
New enrollment is required at `retropick.xyz`; it must not be presented as automatic recovery of
an old protected address. Keep the old staging alias accessible. Actual PRF-capable hardware
recovery, authenticated-wallet operations and separately authorized financial receipts remain
qualification work. They were not proven by mounting the UI or by previous injected/unit tests.

The previous landing project was not changed or deleted by this agent. The apex now intentionally
serves Launchpad; preservation of that project's datastore remains distinct from public routing.
No project administration or datastore write occurred in this validation.

## Rollback

The preserved landing project can regain the apex assignment through Vercel if the operator
chooses rollback; restore its recorded production deployment and original team association if
required. Do not delete either project or modify Namecheap as part of this routing rollback.
See [the preparation report](CUSTOM-DOMAIN-CUTOVER-READINESS.md) for exact project/team steps.
The old permanent-backend staging deployment is available as a staging-only fallback; it predates
runtime same-origin support and must not be substituted as an apex release. Keep the stable API
and persistent VPS data. No rollback was needed or performed during these checks.

## Evidence and reproduction

Directory: `evidence/platform/frontend/domain-cutover-live-20261013/`.

- `domain.json`, `deployment.json`: read-only Vercel assignment / artifact / rewrite configuration.
- `https.json`: trusted certificates and redirects.
- `playwright.log`, `playwright-results.json`: real public 14-test campaign; config's project names
  retain "staging" but its actual baseURL is `https://retropick.xyz`.
- `live-validation.mjs`, JSON/log: 21 endpoint reads, public release,401 auth boundary, existing media,
  browser RPC/security/same-origin requests, wallet/Vault screenshots, no app mutations.
- `root-referrals.mjs`, JSON/log: actual apex root and Referrals panel on both viewports.
- `monitor.jsonl`: five-minute actual public monitoring; reviewed secret scan logs.

Reproduce the 14-test campaign from repository root:

```sh
STAGING_URL=https://retropick.xyz \
STAGING_SOURCE_SHA=caf23208f6831b424b1cc51c0785ecf6bdeae264 \
pnpm --filter @retropick/retro-ui exec playwright test \
  --config e2e/staging.config.ts --retries=0
```

The supplemental scripts are GET-only against application services; do not replace them with
the preparation script, which includes controlled routing and temporary referral challenges.
