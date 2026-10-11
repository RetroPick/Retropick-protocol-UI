# Post-Merge Baseline — 2026-10-11 (Phase 2 kickoff)

## Repository

- Branch base: `main` @ `a58f772ace2c6b8e4ada0c9806e009c4e7bfea9a` (== origin/main; all
  campaign PRs #10–#16 merged, verified present: strategy-vault, use-kuru-book, radar,
  CRE workflow, mm policy core, 7 sponsor evidence dirs).
- Working tree: untracked evidence + mission docs only; zero tracked drift.
- No CI workflows exist in the repo (no `.github/`), so no CI state to reconcile.
- Open PRs: none.

## Documentation integrity repairs (this branch)

- `EXTERNAL-BLOCKERS.md`: removed 3 orphan `>>>>>>> <sha>` lines (debris from the
  #14/#15/#16 merge resolutions, lines 70/92/124) and repaired the collided
  `## PENDING PROBES` / `## BLOCKER-006` headings (probes were already completed and
  recorded as blockers 005–007).
- `INTEGRATION-STATUS.md`: removed stray trailing `RNAL)` (truncated table-cell debris).
- `13-CAMPAIGN-REPORT.md` §D: queue refreshed — merges done, staging is next.

## Baseline validation (run 2026-10-11, node 22.23.2 / pnpm 11.25.0)

| Suite | Command | Result |
|-------|---------|--------|
| retro-ui typecheck | `pnpm --filter @retropick/retro-ui typecheck` | PASS |
| retro-ui build | `pnpm --filter @retropick/retro-ui build` | PASS (1.85 s) |
| retro-ui unit | `pnpm --filter @retropick/retro-ui test` | 17 pass / 0 fail |
| indexer typecheck | `pnpm --filter @retropick/indexer typecheck` | PASS (engines ≥24 vs node 22 = warning only) |
| indexer unit | `pnpm --filter @retropick/indexer test` | 42 pass / 0 fail |

Reference (post-merge full validation, 2026-10-11 earlier): fixture e2e 260/0/38,
forge kernels 210/0/1, referral 15, media 7, SDK 43, vault 7, terminal 14 — recorded in
`13-CAMPAIGN-REPORT.md` §C and `evidence/platform/frontend/browser-validation/`.

## Deployment-readiness facts (verified this session)

- Vercel CLI 62.1.0 installed and authenticated (`jayanegaraasyam-9288`); no project
  link yet; no `vercel.json` anywhere; legacy project `retropick-metropolis` serves
  apps/web and must remain untouched.
- cloudflared 2026.8.3 available; WSL2 NAT (no inbound) → quick tunnel for staging.
- No RetroPick services running; SQLite journals persist (indexer 2.9 MB @ Oct 11 06:47,
  referral DB present with stale `.lock` reclaimed by the code).
- Build guard: `vite build` requires no env vars; rejects credential-bearing RPC URLs
  (any infura.io host) → public `https://testnet-rpc.monad.xyz` only.
- Runtime landmine: `VITE_DATA_MODE=live` without `VITE_INDEXER_URL` throws at page load
  (fail-closed, no mock fallback).
- SPA uses history-API routing → server fallback rewrite required for deep links;
  `/api/referrals` + `/api/media` are same-origin relative with strict-origin +
  `SameSite=Strict` cookie semantics → same-origin Vercel rewrites are mandatory.
