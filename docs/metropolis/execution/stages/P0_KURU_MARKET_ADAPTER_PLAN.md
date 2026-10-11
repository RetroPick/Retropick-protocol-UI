# P0 → Kuru Market Adapter Plan — 2026-10-11

Stage: Metropolis Stage 2 output; implementation lane for Stage 7. Frontend ownership:
`apps/retro-ui` only.

## Asset thesis

Kuru provides the spot orderbook; RetroPick P0 provides issuance, collateral backing,
event identity, resolution semantics, redemption. The new asset class = **fully-backed
binary outcome tokens (YES/NO) traded on verified Kuru markets**, optionally composed via
PRISM P0 after the binary path is proven.

## Adapter surface (all thin, no new financial semantics)

### 1. SDK (`packages/launchpad-sdk`, additive module `prediction.ts`)

- `readPredictionMarket(chain, market)`: collateral/decimals/resolution state/supplies/
  `collateralLocked` (one multicall, envelope-typed like `readKuru`).
- `prepareSplit` / `prepareMerge` / `prepareRedeem` / `prepareBurnWorthless`: wrap the
  qualified kernels via `executePreparedWrite` (approve → simulate → sign), exact bigint
  amounts only, no re-implemented accounting.
- Market creation through the existing Kuru verified Router path (same
  `assertKuruMarketIdentity` qualification used by the launchpad flow).

### 2. Indexer (`apps/indexer`, additive events)

- Index `CompleteSetSplit`/`CompleteSetMerged`/`Resolved`/`Redeemed` (+ PRISM mint/redeem
  if reached) with the same journal/reorg/freshness machinery; wallet-scoped queries for
  outcome positions. No change to existing projections.

### 3. Frontend (`apps/retro-ui`)

- The existing `/launchpad/prediction/:id` research route gains a live adapter only after
  onchain markets exist; until then it stays explicitly non-financial (fail-closed, same
  rule as prism/creator lanes).
- Terminal composition reuses the shared ticket/tabs; outcome markets display collateral
  backing + redemption state; **no probability framing** (price ≠ probability by design).
- Orders/depth/cancel UI is the same Kuru surface qualified in Stage 1.

## Accounting guards carried into the adapter

- 1 collateral ⇄ 1 YES + 1 NO complete set, exact integer amounts, both directions.
- YES+NO outstanding never counted as 2× economic open interest.
- PRISM (only after binary works): `requiredBacking_i = S * x_i` with
  `physicalBalance_i ≥ requiredBacking_i`, exact integer lots, atomic mint, in-kind
  redemption; excluded behaviors stay excluded and are disclosed in-product.

## Legal-review plan (required disclosure, not legal advice)

Testnet demonstration only; no real-money prediction markets are operated. Before any
mainnet consideration: jurisdiction analysis for event-market issuance (likely
US-regulated activity), resolver legal identity/SLA, terms prohibiting restricted
persons, and counsel sign-off. Recorded in the submission's limitations section.

## Sequencing (Stage 7, authorization-gated)

Deploy → split → list YES/NO on Kuru → seed separate liquidity → order/fill/cancel →
resolve → redeem → evidence. PRISM optional second milestone. See
P0_DEPLOYMENT_FEASIBILITY.md for controls and budget.
