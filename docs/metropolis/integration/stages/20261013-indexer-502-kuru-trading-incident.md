# Indexer 502 and Kuru trading recovery — 2026-10-13

Code release: `695ae7764f72cb0fb5cfee5af205fc2975bcd32f`. Branch: `codex/metropolis-p0-recovery`. Authorized public staging: https://retropick-metropolis-retro-ui-stagi.vercel.app.

## Incident and cause

The operator reported Kuru trading unavailable alongside repeated public `GET /v1/launches` 502s. Initial public `/health` and launch-list responses failed with `DNS_HOSTNAME_NOT_FOUND`; all local backend services were active and the loopback indexer retained a valid v2 projection. The immutable Vercel deployment still rewrote requests to an expired Cloudflare quick-tunnel hostname. The one-shot redeployer had stopped retrying after an authorization-looking CLI error. A separate UI problem amplified RPC traffic through frequent polling and per-block economic query keys; indexer failures had been conflated with direct economic read availability.

Vercel CLI authorization worked when the authorized team scope was supplied explicitly. This was not evidence of an expired credential. Deployment now verifies project `prj_dKwt5xQUlhZg6shbOWyFvZbZXSIO`, team `team_wDDjfSztM78LKthTsosnF3qw`, and project name `retropick-metropolis-retro-ui-staging`; it deploys a clean SHA-pinned worktree. A lock serializes deployments and is removed on failure. Success is recorded atomically only after the public alias serves the expected release SHA, valid projection and launch list, and Vercel reports the alias pointing to the same READY deployment ID.

## Repair and automatic recovery

`scripts/staging/tunnel-runner.mjs` continuously checks tunnel/public readiness, retries with bounded backoff, reports classified reconciliation state, and pins rotations to the last reviewed SHA. The first controlled rotation exposed transient local resolver `ENOTFOUND` despite correct Cloudflare/Google DNS answers; retries recovered when DNS propagated. A second rotation was fully automatic: tunnel announcement around 18:28:16 UTC, `redeploying` at 18:29:42, `ready` at 18:30:19. No manual deployment occurred during that second rotation. The runner retained the reviewed SHA.

Resulting deployment: `dpl_Bxs9HF1J5qtsETpEpttf177wkmzL`, https://retropick-metropolis-retro-ui-staging-7hn1bzqlg-asyams-projects.vercel.app, READY. Route target: `https://duration-install-platforms-internet.trycloudflare.com`. Runtime identity, sanitized public response headers/bodies, six active service states and reconciliation state are captured in `evidence/platform/frontend/p0-recovery-20261013/release-runtime.json`. This hostname is an observation, not durable infrastructure.

The deployed browser bundle continues to use the canonical staging origin; only the deployment rewrites carry a tunnel hostname. Normal background synchronization may leave `syncing:true` while a valid published projection remains available. Readiness now requires published/expected projection 2, ready status, source MONAD_EVENT_INDEXER, chain 10143, no freshness error, lag ≤64, and a usable launch-list envelope. The initial overly strict restoration monitor failed and is retained as diagnostic evidence, not a passing rehearsal.

## Verification

- Secret scan: Gitleaks default rules plus one reviewed exact public token-address allowlist; code and staged evidence scans pass (see evidence README).
- Staging readiness/proxy/reconciliation tests: 8 passed, including stale/wrong-chain/wrong-projection/non-list failures, bounded retry and deployment URL parsing.
- Public browser checks before automatic rotation: 14 passed, desktop 1440 and mobile 390; live indexed discovery, deep links, honest Kuru book, Earn Vault, referral/media routes, wallet-picker empty state, release/projection identity, no uncaught page errors and no horizontal overflow.
- Public checks after automatic rotation: 14 passed in `public-browser-post-rotation.log`.
- Sustained rehearsal: `release-monitor.ndjson` records a 20-minute read-only run every 30 seconds, pinned to the reviewed SHA. Final result: **PASS**, 41 samples over 1,215,975 ms (20 min 16 s), zero failed readiness checks, all source identities matched; lag 8–59 blocks. The list/health readiness checks therefore observed no 502/503/504 or other HTTP failure during these sampled probes. This is sampled availability, not a continuous uptime guarantee.
- Indexer creator filtering: 43 passing tests, including 0/1/27 launches, 25+2 pagination, address normalization/validation and expired snapshot cursor. Existing envelope/cursor semantics remain intact.
- Trading and Mera implementation, reproduction and scoped suite evidence: [trading recovery](20261012-trading-rpc-recovery.md), [Protected Earn recovery](20261012-mera-protected-earn-recovery.md), and `evidence/platform/frontend/p0-recovery-20261013/README.md`.

## Remaining acceptance and release recommendation

The repaired staging is suitable for read-only demonstration with the passing sustained rehearsal. Real PRF-capable authenticator recovery and exact operator-authorized financial receipts remain pending; fixtures do not establish those. No new sponsor A–E qualification follows from HTTP 200 or local tests. No user financial broadcast, contract/economic change, production/legacy deployment, DNS change, Contabo/Yubie change, plugin publish or portal submission occurred. Existing working edits, data, secrets and other worktrees were preserved. `apps/web` received no edits/build/install/staging.

Quick tunnels still have no uptime guarantee, and DNS plus deployment propagation can produce a temporary outage during rotation; this run took about two minutes to recover automatically. Continuous reconciliation is recovery, not durable hosting. Use the existing operator-gated named tunnel/Contabo proposal for durability. Freeze: October 14, 2026 02:59 WIB; submission 10:59 WIB subject to portal verification. Do not claim a protected financial demo without the required hardware/receipt evidence.

## Baseline and rollback

Read-only Vercel project inspection confirms the legacy `apps/web` project has no Git repository link (`link:null`), so publishing this branch does not ask it to build. Its older deployment remained unchanged. Sanitized proof: `legacy-project-readonly.json`.

Remote `main` verified at `67db9d557bb68efea2684713d9cd9975c0c615ed` before branch publication. Original failed deployment: `dpl_6Wmb9j1x6ZH7xocmRFDod6G9KfZt`, source `5d19b83386915a5cad033e4397816a8306aa9536`. Initial reviewed-source restoration: `dpl_6uhG4TaHMxRgn9xyRQDWToJ9HkVF`, source unchanged, with the then-current tunnel.

If this recovery must be rolled back, use the guarded staging deploy helper with `--sha 5d19b83386915a5cad033e4397816a8306aa9536`. It renders the current tunnel into a clean worktree, verifies the authorized staging identity and validates public readiness before recording success. Do not simply repoint the alias to the original expired-tunnel deployment. Retain current data/services and operator secrets. The older source also lacks these P0 and Protected Earn fixes, so record the regression and its acceptance impact.
