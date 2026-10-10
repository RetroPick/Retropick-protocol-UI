# Sponsor Qualification Report — Kuru (Consumer Trading)

Sponsor: Kuru
Track: Onchain Finance & Trading (primary)
Prize: Build the Next Consumer Trading App on Kuru ($5,000)
Branch: `feat/metropolis-kuru-consumer` (base `f643cb6`)
Source SHA: branch HEAD (see git log; base recorded in capability-check.json)
SDK version: bespoke viem wrappers in `@retropick/launchpad-sdk` (viem 2.57.4; Kuru has no official npm SDK — ABIs pinned from deployed bytecode, verified against `deployments/monad-testnet/v2.json`)
Network: Monad Testnet, chain 10143

## Integration status

`ALREADY_INTEGRATED` (core, pre-campaign) → gaps closed this stage → `TESTED_E2E` on the
canonical frontend `apps/retro-ui`.

## Existing capabilities

Full consumer trading surface already shipped before this campaign: discovery, token
terminal, EIP-6963 wallet with chain enforcement, fail-closed orderbook identity
qualification, best bid/ask, margin deposits/withdrawals (both assets), tick-normalized
limit orders, fill-or-kill market orders with simulation preview, partial-fill-aware
orders tab with on-chain re-validation, batch cancellation, receipt decode + indexer
confirmation, typed RPC-failover error states, mobile bottom-sheet ticket. Real two-actor
testnet evidence exists: `evidence/hackathon/metropolis/frontend-e2e-trading.json`
(`ORDER_FILL_CANCEL_PASS`, 14 CONFIRMED txs).

## Changes implemented this stage

1. **Aggregated orderbook depth panel** — SDK `readKuruBook` (L2 book) was unused by the
   UI. Added `buildDepthLadder` exact-bigint view model (dedupe/merge/sort/cumulative,
   crossed-input-safe), `useKuruBook` live hook (1.5 s poll, same publicClient failover),
   `MarketDepth` panel in the shared terminal (rail + mobile above the trade bar) with
   cumulative depth bars, spread/mid, block provenance, empty/error/loading states, and a
   deterministic fixture book + `no-book` scenario for demo/e2e.
2. **Post-only orders** — `prepareKuruLimitOrder` supported `postOnly` but the ticket
   hard-coded `false`. Added the maker-only toggle (live + demo tickets) wired through to
   the orderbook's `addBuyOrder/addSellOrder(_postOnly)`; policy line and footer explain
   the reject-if-crossing semantics (`PostOnlyError` surfaces typed).

## Sponsor requirements mapping

See `capability-check.json` — all 18 checklist items PRESENT (2 added this stage).

## Test results

See `test-results.json`. Typecheck/build PASS; `test:terminal` 14/0; fixture e2e 244/0/38
(6 viewports, new depth + post-only specs); read-only on-chain revalidation PASS at block
69927875.

## Onchain evidence

- Historical: `frontend-e2e-trading.json` (order `0xabd4…15b7`, fill `0x93e0…5415`,
  cancel `0x471f…c920`), mapped in `docs/hackathon/KURU_BOUNTY.md`.
- This stage: `revalidation-read-only.json` — identity PASS; live best bid
  0.003960396 / ask 0.004000000 (x18), consistent with the evidenced fill at 0.00399 MON;
  order 1 (filled) zero-size, owner = actor A; order 2 (cancelled) zeroed; counter = 3.

## Browser evidence

`evidence/platform/frontend/browser-validation/20261010T210352Z-fixture-kuru-consumer-stage1/`
(244 pass; screenshots incl. `depth-graduated`).

## Security assessment

Reads only through the fail-closed identity-qualified client; writes unchanged
(approve → simulate → sign pipeline, wallet-side). No new approvals, no custody changes,
no float math (exact bigint ladder). Post-only is a maker-protection flag, not a new
authority.

## External blockers

Public deployment still serves legacy apps/web (BLOCKER-001) — judge-facing demo of the
new depth panel requires the retro-ui Vercel cutover. Live re-signing not run
(BLOCKER-002, authorization-gated).

## Judge demo

Local: `pnpm --filter @retropick/retro-ui dev` → `/launchpad/token/demo-graduated` (depth
panel + post-only in demo) or live token detail for the graduated market. Video script
pending final campaign closure.

## Remaining work

Optional: depth panel on discovery cards; fee preview already covered by simulation.

## Verdict

`TESTED_E2E` — QUALIFIED pending judge-accessible deployment (BLOCKER-001) and submission
answers. Honest scope note: the two gaps the mission called out are closed; no rebuild of
working infrastructure occurred.
