# P0 recovery evidence — 2026-10-13

Code release: `695ae7764f72cb0fb5cfee5af205fc2975bcd32f`. Public staging: https://retropick-metropolis-retro-ui-stagi.vercel.app.

## Passing verification

- `sdk-tests.log`, `sdk-types.log`: 46 pass / 2 intentional external-network skips, typecheck.
- `indexer-tests.log`, `indexer-types.log`: 43 pass, typecheck.
- `ui-domain-tests.log`, `ui-targeted-tests.log`, `ui-types.log`, `ui-build.log`: scoped tests, typecheck and build.
- `mera-authorization-tests.log`: six action-binding/identity/revalidation tests.
- `recovery-browser-final.log`: 20 desktop/mobile live-component fixtures; `recovery-transaction-recheck.log` and `recovery-final-context.log` verify subsequent transaction rechecks.
- `full-fixture.log`, `full-fixture-results/`: 266 pass / 40 intentional viewport skips, with result metadata and exit code. Full local screenshot evidence: `../browser-validation/20261012T180325Z-fixture/`.
- `staging-tests.log`: eight readiness/reconciliation/deployment/proxy tests.
- `media-service-tests.log`, `referral-tests.log`, `radar-tests.log`: 7, 15 and 11 passing service tests.
- `public-rpc.ndjson`, `public-rpc-cors.json`: read-only official/Ankr chain and Kuru book qualification, plus browser CORS/chain-ID checks from the public staging origin.
- `public-browser.log`, `public-browser-post-rotation.log`: 14 passing public read-only desktop/mobile checks before and after automatic rotation.
- `public-browser-observations.json` and `public-*.png`: public screenshots and endpoint observations; no financial writes.
- `retro-p0-protection-recovery-*.png`: local fixture enrollment/recovery and unsent handoff reviews. Simulated PRF credentials do not qualify real authenticator hardware.

## Diagnostic history

`recovery-browser.log` and `recovery-browser-next.log` preserve initial fixture failures; the final log is authoritative. `staging-restoration.log`, `recovery-deployment.log`, `final-deployment.log`, `rotation-deployment.log` record successive bounded staging deployments. `restoration-monitor.ndjson` used an overly strict readiness check which rejected normal background syncing despite a published valid projection; it failed and is not acceptance evidence. `health-sync-observations.json` explains the correction. `pre-automatic-rotation-monitor.ndjson` was intentionally interrupted to test a fully automatic rotation and is not sustained acceptance evidence.

Final automatic rotation identity and sustained rehearsal are recorded separately in `release-runtime.json`, `release-monitor.ndjson` and the incident report. No real PRF hardware ceremony, creator-fee migration, funded protected action or financial receipt is asserted by these fixtures.

## Secret scan

Gitleaks 8.30.1 scanned code history and staged documentation/evidence. Initial findings were exclusively the public launch contract `0x30ccb65006665022dfc97bb5c1985610503fd1cf` in token-named fields: two code references and three public RPC/indexer response references. Each source was inspected. `gitleaks-review.toml` extends default rules and allows only that exact public address; reviewed code and staged scans pass. The initial warning logs are retained. The fingerprint list records the initial code findings; the exact-address config also works when evidence receives a new commit hash. No credential values were captured or allowlisted.

Log content is retained with trailing terminal whitespace trimmed for repository diff checks. Original fixture exit code and result JSON are included.

Final sustained rehearsal: PASS, 41 samples / 20 min 16 s, zero failed readiness checks, all source SHA identities matched; lag 8–59 blocks. See `release-monitor-summary.json`.
