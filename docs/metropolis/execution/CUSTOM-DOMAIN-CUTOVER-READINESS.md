# CUSTOM DOMAIN CUTOVER READINESS REPORT

2026-10-13 — **READY FOR RETROPICK.XYZ CUTOVER** (preparation checkpoint only).
The staging promotion is complete. The apex domain remains the existing waitlist; domain
movement/attachment requires the user's explicit approval and operator action.

## Exact tested release

| Item | Verified value |
| --- | --- |
| Frontend and backend runtime source SHA | `caf23208f6831b424b1cc51c0785ecf6bdeae264` |
| Vercel deployment | `dpl_9p4uikyzetTp3APK9mu9CY6WP7iR`, READY, production artifact |
| Unique deployment | https://retropick-metropolis-retro-ui-staging-1sxm7pzpb-asyams-projects.vercel.app |
| Tested public staging alias | https://retropick-metropolis-retro-ui-stagi.vercel.app |
| Canonical frontend | `apps/retro-ui`, project `retropick-metropolis-retro-ui-staging` |
| Target team / project ID | `asyams-projects` / `prj_dKwt5xQUlhZg6shbOWyFvZbZXSIO` |
| Proposed primary browser origin | `https://retropick.xyz` — NOT attached or moved |
| Permanent backend | `https://api-staging.retropick.xyz`, Contabo `84.247.158.36` |
| Chain | Monad Testnet, 10143 |
| Current domain owner | Operator-confirmed `retropickmarket-1279s-projects`, `retropick-landing` |
| DNS | Namecheap; existing records and nameservers unchanged during this preparation |

`/release.json` on the public staging alias matches the full SHA above. Backend `SOURCE_SHA`
also matches. Later deployment-tool/evidence commits do not change these runtime artifacts.
The protected candidate was verified using authenticated `vercel curl`, then promoted with
explicit staging authorization. The public alias is accessible without authentication.

## PASS / FAIL results

| Check | Result | Evidence / scope |
| --- | --- | --- |
| Existing public staging promotion and exact release SHA | PASS | `deployment.json`, `deployment-inspect.json`, public `/release.json` |
| Live desktop + mobile Playwright | PASS | **14/14**, zero retries; desktop 1440×900, mobile 390×844 |
| Live Monad listings and market detail | PASS | Nine real indexed launches, pair/activity API, graduated token terminal, live provenance |
| Indexer freshness and published projection | PASS | Chain 10143, projection 2, known head, lag ≤64, recent timestamps, null error |
| Permanent HTTPS API + same-origin rewrites | PASS | **14/14** supplemental live endpoint checks, trusted TLS; `/health`, `/v1/*`, referrals/media/radar |
| Browser RPC | PASS | Desktop/mobile actual public RPC `eth_chainId` =10143 and positive `eth_blockNumber` |
| Referral service and dual-origin challenge binding | PASS | Null live syncError; both origins accepted and encoded in messages; wrong allowed-origin replay rejected 403 |
| Media service and preservation | PASS | Pinata mode healthy; existing WebP bytes match SHA256 through backend and staging; both origins accepted, third-party origin denied |
| Read-only trading interface and wallet connection | PASS | Graduated Orders tab, depth panel and wallet picker; clean browser correctly reports no installed wallet |
| Mera origin compatibility preparation | PASS | Runtime RP uses browser hostname, enrollment validates RP; Vault mounts on both origins; 14 unit/injected tests include origin resolution and signer/authorization checks |
| CSP and security headers | PASS | Live nosniff, frame DENY, frame-ancestors none, self WebAuthn permissions, strict-origin referrer policy; no page errors in checked flows |
| Controlled error recovery | PASS | Injected browser-only 502 is shown as unavailable; Retry returns real live rows on both viewports |
| Controlled primary-origin rehearsal | PASS | Actual CAF assets and live API responses routed inside browser at `https://retropick.xyz`; `/v1/*` requests use that browser origin; desktop/mobile Vault mounts |
| Unexpected 502 during live checks | PASS | None observed; controlled injected faults are explicitly excluded |
| Sustained monitoring | PASS | Initial VPS release: **41/41** samples, 20m14s, zero failures. Promoted CAF: **11/11** samples, 5m04s, zero failures |
| Backend process restart recovery | PASS | Actual isolated indexer/referral SIGKILL recovery, no guard deletion or Vercel redeployment |
| Boot configuration and persistent state | PASS | Enabled system target, six active services, persistent database/media/radar/TLS paths |
| Preserve waitlist / Yubie / contracts | PASS | Apex HTML hash identical before/after; no DNS/domain mutation; original Yubie IDs healthy; no contract redeployment or financial broadcast |
| Actual apex Launchpad deployment and public post-cutover browser tests | PENDING | Intentionally gated by domain approval; apex currently remains waitlist |
| Whole shared-VPS reboot | NOT RUN | Would interrupt Yubie; process recovery and boot dependencies verified, no witnessed reboot claim |
| Real hardware PRF WebAuthn ceremony / financial receipts | NOT RUN | Separate operator qualification; unit/injected tests do not establish this |

No preparation check failed. Two live suites cover actual public services. Controlled origin
routing and error injection are explicitly simulations, not proof of a completed public-domain
cutover. Fixture/unit tests are supporting evidence only. The depth test accepts truthful empty
or RPC-unavailable book states; it does not prove a continuously two-sided Kuru book. No wallet
was signed into, no new permanent referral association was created, no new media was uploaded,
and no financial transaction was broadcast. Successful signed referral session issuance/cookie
behavior is covered by service tests and source review, rather than a new live-user login.

## Origin, authentication and configuration audit

- `VITE_DATA_MODE=live`; `VITE_INDEXER_URL=same-origin` is built into the tested release and
  persisted in the staging project's Production and Preview settings. `VITE_MONAD_RPC_FALLBACK_URL`
  is the public Ankr Monad Testnet endpoint. No wallet bridge is configured.
- The SDK resolves its API base from `window.location.origin`. Browser requests use relative
  `/v1/*` and `/api/*` routes. Vercel rewrites pin `https://api-staging.retropick.xyz`, ahead of
  the SPA fallback. No quick-tunnel URL remains in the tested deployment configuration.
- Referral `REFERRAL_ORIGINS` and media `MEDIA_ORIGIN` contain **both** exact origins:
  `https://retropick-metropolis-retro-ui-stagi.vercel.app,https://retropick.xyz`.
  They reject other origins. Referral challenges bind the requesting origin's host and URI;
  even another approved origin cannot replay them.
- Referral session cookies are host-only (no Domain), HttpOnly, Secure, SameSite=Strict,
  Path=/api/referrals. Existing staging sessions and the referral database remain intact.
  A new apex session requires authentication on that origin; cookies are not copied across hosts.
  Browser use stays same-origin, so permissive credentialed cross-origin CORS is unnecessary.
- Mera RP ID is `window.location.hostname`, rather than a fixed staging hostname. **WebAuthn
  credentials bound to the staging hostname cannot be used for `retropick.xyz`; new enrollment
  is required there.** Origin-local protected-wallet storage also does not migrate automatically.
  Keep the staging alias accessible for existing credentials/wallet state; do not redirect it
  to apex or promise that new enrollment recovers the old protected address. Users should retain
  access to the old origin before funding or changing creator-fee authority.
- Existing Pinata `ipfs://` assets and local fallback media remain preserved. Local fallback
  public URLs still reference the retained staging origin; no historical URL rewrite is required.
- No forced staging-to-apex redirect exists. The prepared application works at both hosts.
  Global headers allow WebAuthn on self and public RPC connections without broadening frames.
  Vercel/Caddy HTTPS and redirect behavior are verified in hosting evidence.

## Exact manual Vercel actions — only after approval

1. Before moving anything, record the existing apex assignment in `retropickmarket-1279s-projects`
   → `retropick-landing` → Settings → Domains, its current production deployment and default
   Vercel URL. Preserve this project, its environment, waitlist datastore and deployments.
2. In the domain-owning team, open **Settings → Domains → retropick.xyz → Move Domain**.
   Choose **asyams-projects**. This is the operator's cross-team ownership action.
3. In **asyams-projects → retropick-metropolis-retro-ui-staging → Settings → Domains**, add/assign
   the transferred **retropick.xyz** to the project's Production environment. Confirm the current
   production artifact is **dpl_9p4uikyzetTp3APK9mu9CY6WP7iR / CAF SHA above**. Use the tested
   deployment; do not rebuild or select the waitlist/legacy frontend project.
4. Leave the existing staging alias, permanent API hostname, `retropick-landing` project and
   Namecheap DNS untouched. Only the requested apex is in scope; do not move/add `www` or impose
   a new redirect policy without a separate decision. If Vercel unexpectedly requests a DNS
   change or rejects ownership, stop and report its exact instruction before altering DNS.
5. Reply with explicit approval and confirmation that the move/attachment is complete. Then
   validate real `https://retropick.xyz` HTTPS, source SHA, rewrites, live indexer, referrals/media,
   RPC, wallet picker and Mera RP on desktop/mobile. The browser rehearsal above does not replace
   these post-cutover tests. Record real hardware enrollment separately if performed.

No rebuild is required for the browser-origin change. Backend restarts or VPS reboots retain
the API hostname and need no Vercel rewrite/redeployment. Service recovery does not guarantee
external provider/host uptime; use the runbook if freshness fails.

## Rollback

- **Apex rollback:** in Vercel, restore the apex assignment to the preserved `retropick-landing`
  project and its recorded production deployment. If cross-team ownership prevents assignment,
  use Move Domain back to `retropickmarket-1279s-projects`, then reassign it there. Keep Namecheap
  records and both projects/datastores intact. Recheck the original waitlist title/behavior.
- **Staging rollback:** promote the prior permanent-backend deployment
  `https://retropick-metropolis-retro-ui-staging-hbtfsxl1a-asyams-projects.vercel.app`
  (`dpl_AiKrQaCLwehGuXvB1xSS9FNT8DHq`, source `84e954bdcff5651a5f808882eff6226fd6419f6a`)
  to the same staging project using `vercel promote <URL> --scope asyams-projects --yes`, then
  verify release/health and live tests. This older frontend is a staging fallback, **not** an
  apex candidate: it predates runtime same-origin support. Never promote historical quick-tunnel
  releases. Rebuild against the permanent backend if another source is required.
- **Backend rollback:** follow `STAGING-RUNBOOK.md`; snapshot SQLite with its backup API before
  changing code, retain `/var/lib/retropick-staging`, and avoid running old PID-only lock writers
  concurrently with upgraded writers. Never roll back Yubie or redeploy contracts for this issue.

## Evidence

- `evidence/platform/frontend/domain-cutover-preparation-20261013/`: promoted deployment, 14-test
  Playwright log/JSON, 10 supplemental checks/JSON/screenshots, five-minute monitor, VPS source and
  active services, waitlist before/after hashes, local type/unit logs.
- `evidence/platform/frontend/staging-vps-recovery-20261013/`: incident proof, preserved backup,
  HTTPS endpoints/certificate, isolated SIGKILL recovery, 92 remote backend tests, 20-minute monitor.
- [Detailed hosting/root-cause report](../integration/stages/20261013-vps-recovery.md) and
  [scoped operations runbook](STAGING-RUNBOOK.md).

**Checkpoint: READY FOR RETROPICK.XYZ CUTOVER. Await explicit approval; do not move or attach
retropick.xyz autonomously.**
