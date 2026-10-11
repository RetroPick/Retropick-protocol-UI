# Stage: Staging Restoration — 2026-10-11
State: RUNTIME_VERIFIED (restoration of the previously qualified staging release)
Owner/agent: ZCode GLM (operator-unblock campaign)
Task ID: L0-staging-restore
Current local HEAD: 56226f5c790e9456f381d69484343726466e3b07 (== origin/main; all PRs #10–#19 merged)
Remote main SHA: 56226f5c…
Feature branch / PR: main (restoration of merged PR #17 runtime; deploy-script fix staged for the next scoped PR)
Staging origin: https://retropick-metropolis-retro-ui-stagi.vercel.app (canonical alias — unchanged)
Target chain and network: Monad Testnet 10143
Operator approval ID/status: restoration covered by the merged STAGING-RUNBOOK rotation
procedure (PR #17) + the operator's corrected-campaign approval §2/§10 ("safe local
backend restoration where authorized; configuration/rotation proof"). No production
domain, no legacy project touched.
Role: service operator (own processes only)

## CURRENT / TARGET / DELTA / MIGRATION
- CURRENT at start: ALL five staging processes dead (indexer/referral/media/gateway/
  tunnel pidfiles 47899/47970/48132/48108/48118 all dead; zero listeners on
  8787/8788/8790/8791/8799; no strays). Logs show a graceful SIGTERM wave at
  2026-10-11T09:11:51Z (16:11 local) — session teardown, not a crash. Indexer was fully
  synced when stopped (`Synced 70072313 / 70072313`). Public Vercel page still 200 but
  had NO backend (stale tunnel dead → live mode degraded).
- TARGET: same canonical staging URL serving the live product with working backends.
- DELTA: services restarted; new quick tunnel `neutral-watching-troubleshooting-generation.
  trycloudflare.com`; Vercel env rotated; redeployed from a CLEAN detached worktree at
  reviewed SHA 56226f5; `scripts/staging/deploy-vercel.mjs` env-upsert bug fixed
  (generic catch no longer misclassifies failures as "already set" — now rm→add→verify
  via `vercel env ls`, aborts on any failure).
- MIGRATION and rollback: rollback = previous deployment rollout (`vercel rollout undo`)
  + stop-backend.mjs; SQLite journals and media untouched (reused in place).

## Verification before restore (operator correction honored)
- pidfile/PID reconciliation: all 5 dead; `ss`: no listeners; `ps`: no strays → no newer
  healthy instance could be terminated by start-backend.mjs (its stop phase is a no-op
  against dead pidfiles).
- Preservation: `.data/monad-testnet.sqlite` (indexer) and media store reused — the
  indexer resumed from its journal (no re-index from genesis; caught up from block
  70072313).

## Source-SHA-pinned redeployment (dirty-tree protection)
- Clean detached worktree `/tmp/retro-staging-release` @ 56226f5 (reviewed main; zero
  dirty files) carried the deploy — the main working tree (917 untracked artifacts) was
  NOT the upload source.
- Project identity verified: `retropick-metropolis-retro-ui-staging` @ asyams-projects
  (prj_dKwt5xQUlhZg6shbOWyFvZbZXSIO). Legacy `retropick-metropolis` untouched.
- Env rotation verified per-variable via `vercel env ls` post-write (all six
  key×target pairs set + verified: VITE_DATA_MODE=live, VITE_INDEXER_URL=<tunnel>,
  VITE_MONAD_RPC_FALLBACK_URL=public RPC).
- REFERRAL_ORIGIN / MEDIA_ORIGIN pinned to the canonical alias
  `https://retropick-metropolis-retro-ui-stagi.vercel.app` (not an ephemeral hostname).

## TESTS and EVIDENCE
| Check | Expected | Observed | Pass/Fail |
|---|---|---|---|
| Public frontend | 200 | 200 | PASS |
| SPA deep link | 200 | 200 | PASS |
| /api/referrals/health via rewrite | 200 | 200 | PASS |
| /api/media/health via rewrite | 200 | 200 | PASS |
| Bundle carries current tunnel URL | 1 match | 1 match (`neutral-watching…`) | PASS |
| Referral challenge correct-origin | challenge issued | challengeId bc81454d… | PASS |
| Referral challenge wrong-origin | 403 | 403 INVALID_ORIGIN | PASS |
| Indexer freshness via tunnel | catching up | resumed 70072313 → syncing | PASS |
| Staging Playwright (desktop+mobile) | 12/12 | 11 passed + 1 flaky-pass (retry) | PASS |

- Deployment ID: `retropick-metropolis-retro-ui-staging-nw15oiy54-asyams-projects.vercel.app`
  (Ready, production, 15s build, 26s ago at check).
- Failure window: backends dead from 16:11 local until ~17:4x local restoration
  (~1.5 h degraded — public page 200 throughout, live-data degraded, no data loss).
- Rollback reference: previous production deployment list retained (`vercel ls --prod`);
  `vercel rollout undo` available.

## REVIEW
- Security regressions: none — strict-origin, cookies, and rewrite chain re-proven.
- apps/web: `git diff --name-only -- apps/web` empty throughout.
- Yubie/VPS: untouched (Lane 6 separately blocked at SSH auth).

## FINAL VERDICT & NEXT
- Status: RUNTIME_VERIFIED (restored); staging again judge-ready.
- Next: L1 CRE simulation (CLI logged in on this same host — verified separately).
- Handoff: CRE lane begins; deploy-script fix + this report ride the next scoped PR.
