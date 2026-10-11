# P0 Security Revalidation — 2026-10-11

Stage: Metropolis Stage 2 (qualification gate for Stage 7 — Kuru New Assets).
Branch: `feat/metropolis-p0-qualification` (docs-only relative to `main`).

## Source identity vs qualified SHA

Qualified reference: `4f3c70b965d1ee16e31425dc8e8624bb6a06860a`
(`research/reports/hackathon-p0-gates.yaml`, recorded 2026-09-29, branch
`codex/hackathon-p0-hardening`, Foundry 1.8.3).

| Path | Tree hash @ 4f3c70b | Tree hash @ HEAD (f643cb6) | Drift |
|------|---------------------|-----------------------------|-------|
| `research/contract-kernels/src/hackathon` | `aa37e2f9…` | `aa37e2f9…` | **NONE** |
| `research/contract-kernels/test/hackathon` | `8d5123b0…` | `8d5123b0…` | **NONE** |
| `research/contract-kernels/foundry.toml` | — | — | unchanged |

Zero commits touch the kernels since qualification; `git log 4f3c70b..HEAD -- research/contract-kernels`
is empty. The qualified source is byte-identical to what would deploy.

## Re-run results (Foundry 1.8.4, solc 0.8.26, evm cancun)

- Full suite: **210 passed / 0 failed / 1 skipped** (117 suites, 96.6 s).
- Hackathon gate suites (`test/hackathon/*`): **39 passed / 0 failed** (30.6 s) — unit,
  fuzz, differential (Python-oracle fixtures) and stateful invariants.
- Recorded gate status from `hackathon-p0-gates.yaml` stands: PRED-H1..H8 PASS,
  PRISM-H1..H9 PASS, cross-module PASS, KURU-H1 (docs/network) PASS MEASURED_TESTNET.
- Toolchain delta (1.8.3 → 1.8.4) did not alter any result.

## Bytecode sizes (runtime, bytes)

| Contract | Runtime | Note |
|----------|---------|------|
| PredictionMarketP0 | 11,171 | well under the 24,576-byte code limit |
| PredictionFactoryP0 | 12,742 | |
| PrismSeriesP0 | 11,304 | |
| PrismFactoryP0 | 13,346 | |
| OutcomeTokenP0 | 3,100 | per-outcome ERC-20 |

## Invariant recap (unchanged from qualification)

- Complete-set conservation: `split` requires exact-receipt collateral
  (balance-delta equality; fee-on-transfer rejected via `NonExactCollateralTransfer`),
  `collateralLocked == yesSupply == noSupply` increments; `merge` burns both sides and
  returns collateral with double-sided delta checks.
- Resolution: immutable resolver, one-time `resolve(YES_WIN|NO_WIN)`, `openRedemption`
  after; winner redemption burns 1:1 for collateral; `burnWorthless` for the loser side;
  `liability()` equals winning-side supply post-resolution.
- Reentrancy: `StateChangedDuringTransfer` guard on ERC-777-style hooks + `nonReentrant`
  everywhere; fuzzed in `PredictionP0Invariant.t.sol` (3 seeds × 256 runs × depth 100).
- PRISM: exact integer lots, physical backing `physicalBalance_i >= S * x_i`,
  nonnegative replication, canonical source registration, in-kind redemption;
  direct-constructor bypass counterexample CX-HACK-PRISM-DIRECT-DEPLOY-001 repaired at
  the qualified SHA with a permanent regression test.

## Excluded behavior (must NOT be reintroduced for the demo)

General state-liquidity clearing, arbitrary AND/OR payoffs, approximate backing, terminal
cash settlement, shared prefunding, unbounded claims. Production gates (incl. PRISM
`MATH-1 = FAIL`) remain unchanged — P0 is a hackathon-scoped profile only.

## Verdict

**P0 local security qualification CONFIRMED** — no source drift, all gates re-run green,
sizes within limits. Onchain deployment remains gated on operator authorization + funded
signer (see DEPLOYMENT_FEASIBILITY).
