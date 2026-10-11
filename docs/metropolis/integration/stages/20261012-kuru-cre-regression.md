# 2026-10-12 — Kuru Consumer regression + CRE evidence review + staging durability fix

| Field | Value |
|---|---|
| Lanes | Kuru Consumer (regression), Chainlink CRE (evidence review), staging (durability bugfix) |
| Branch / PR | `feat/metropolis-staging-worktree-fix` |
| Status | Kuru **TESTED_E2E (live, honest empty book)** · CRE **SIMULATED (unchanged)** · staging durability **fixed** |

## Kuru Consumer regression (live staging, real Monad data)

Kuru Consumer is the retro-ui trading terminal (not a separate package). Regression suites:
- SDK **43/43**, indexer **42/42**, terminal **14/14**, staging Playwright **12/12** (desktop + mobile).
- Live graduated token `0x43e7…18f15` (RPV2M) on the public staging URL:
  - phase **Graduated · Kuru**; venue Kuru.
  - Orderbook depth shows the honest degraded state — *"Live orderbook depth is unavailable. Trading
    reads current on-chain state when you place an order."* — **no fabricated resting liquidity**.
  - Market analytics liquidity *"Kuru book depth is not aggregated"* (not invented).
  - Trades tab shows a **real** Kuru trade (0.0003 @ 0.1, tx `0x93e0…5415`) linking to Monad Explorer.
  - Launch + graduation tx chips resolve to real explorer transactions.
- Indexer feed: 9 launches, 3 graduated, lag 8. Evidence:
  `evidence/hackathon/metropolis/sponsors/kuru/20261012/graduated-terminal-live.png`.

A deployed Kuru market with an empty resting book is shown honestly; executable depth comes from live
on-chain reads at order time, never from historical event counts.

## CRE evidence review (no rebuild, per mandate)

PR #21's official-simulator qualification is intact and unchanged:
- `evidence/hackathon/metropolis/sponsors/chainlink-cre/simulation-results.json` — official
  `cre workflow simulate` PASS, CLI v1.38.0 authenticated (`org_UnKUJyHDVyfgVrlO`), target
  monad-testnet, Sourcify v2 `exact_match`.
- `simulation/{positive,negative-wrong-market,negative-not-graduated,negative-sourcify-down}.log` present.
- `cre` CLI still installed. Status remains **SIMULATED** (no DON deployment claimed). Not rerun —
  no SDK/runtime change required regression.

## Staging durability bug found + fixed (surfaced by this regression)

While checking staging, the public origin returned `DNS_HOSTNAME_NOT_FOUND`: the quick tunnel had
rotated to `evening-mozilla-…` but the auto-redeploy of the Vercel rewrites had **crashed**:

```
git worktree add --detach /tmp/retro-staging-release-98608fa41de8 <sha>
fatal: '/tmp/retro-staging-release-98608fa41de8' is a missing but already registered worktree
```

Root cause: `/tmp` was cleared between runs while git still had the worktree registered, so
`deploy-vercel.mjs` crashed instead of recovering. Fix: `git worktree prune` + force re-add (and a
`checkout --detach` reuse when the dir still exists), so tunnel-rotation redeploys are idempotent
across a cleared `/tmp`. Manually redeployed; origin healthy again (`/launchpad`, `/v1/launches`,
`/health` all 200, lag 8). deploy render tests 2/2.

This is the one gap in the otherwise-automatic tunnel recovery from `20261012-live-data-recovery.md`;
it is now closed.

## Next lane

VPS read-only inspection + migration proposal (`20261012-vps-durability.md`).
