# P0 Deployment Feasibility — 2026-10-11

Stage: Metropolis Stage 2. Question: can the qualified P0 kernels be deployed to Monad
Testnet and exercised on Kuru safely, within the hackathon window?

## What exists

- Qualified, drift-free kernels (see P0_SECURITY_REVALIDATION.md).
- `research/hackathon-p0/KURU_P0_PARAMETER_PACKET.md` — PREPARED_NOT_DEPLOYED deployment
  inputs (no transaction ever sent, no signer ever authorized).
- Live, verified Kuru environment on chain 10143 (router `0x7EFbE105…`, margin account,
  orderbook/vault implementations; verified-market registration path exercised by the V2
  graduation). Read-only verification KURU-H1 PASS.

## Deployment plan (testnet-only, authorization-gated)

1. **Authorization** (operator): explicit go + funded testnet wallet provided via
   session-scoped env (`P0_DEPLOY_KEY`), never committed. Budget cap: gas + ≤ 2 MON
   collateral for one demonstration market (complete sets + Kuru liquidity seed).
2. **Deploy** `PredictionFactoryP0` + one `PredictionMarketP0` with an admitted standard
   ERC-20 collateral. Record addresses, txs, bytecode hashes; verify sources on Sourcify
   (exact-match recipe documented in repo memory).
3. **Complete sets**: `split(N)` — verify `collateralLocked == N == yesSupply == noSupply`
   exactly (no double counting of open interest).
4. **Kuru markets**: list YES and NO outcome tokens through the verified Router (quote =
   admitted asset), tick/min-size from `readMarketParams`, initialize vault liquidity.
5. **Liquidity**: seed separate trading liquidity (do NOT reuse collateral backing).
6. **Exercise**: real limit order (incl. post-only), fill, cancel; capture receipts.
7. **Resolve + redeem**: resolver resolves; winner redeems 1:1; loser side
   `burnWorthless`; verify final balances conserve.
8. **Evidence**: every receipt + final state dump under
   `evidence/hackathon/metropolis/sponsors/kuru-new-assets/`.

## Risks / controls

| Risk | Control |
|------|---------|
| Signer misuse | session-scoped key, hardcoded cap, read-only re-verification between steps, no broadcast in any test |
| Kuru market misconfiguration | reuse `assertKuruMarketIdentity` qualification before any order |
| Collateral admission drift | fixed collateral allowlist in the deploy script; decimals asserted |
| Demo-scope creep | excluded behaviors listed in SECURITY_REVALIDATION are enforced by the kernels themselves; no wrapper may weaken them |
| Reorg | indexer confirmation workflow (`useIndexedRecord` semantics) for UI; receipts re-read before evidence |
| Time | deployment + exercise ≈ 1 focused session; freeze inside the final 8 h buffer |

## Feasibility verdict

**FEASIBLE — P0_CONDITIONAL**. All preconditions are met except two operator items:
explicit deployment authorization and a funded testnet signer (EXTERNAL-BLOCKERS
BLOCKER-002). No technical blocker found: toolchain, verified router path, qualified
sources and parameter packet are ready.
