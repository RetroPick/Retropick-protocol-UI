# V2 liquidity campaign security review

Scope: SDK qualified reads, indexer/API projection, UI display, manual maker composition and toolkit wiring. No V2 Solidity file changed.

## Verdict

- Qualified liquidity reads: PASS for deterministic coverage; live identity/read evidence recorded separately.
- Historical vault indexing/API: PASS for replay/reorg/cursor/completeness tests; live full-history catch-up is not yet complete.
- Terminal/Liquidity/UI: PASS deterministic browser and accessibility scenarios; no new passive-LP action exists.
- Approved maker operations: PASS composition over existing preparers/pipeline; no new financial selector was added.
- Passive LP: BLOCKED. `KuruAMMVault.deposit`, `mint`, `withdraw`, and `permit` remain excluded by the signed write allowlist.
- Advanced maker primitives: BLOCKED. Flip, paired, batch provisioning/update/cancel, and fee collection remain excluded.

## Passive LP disposition

Read-only vault state and `previewWithdraw` can expose current position diagnostics. Direct public writes are not approved. A future approval must independently prove vault/market/lock identity, Router implementation state, receiver/owner policy, native exact-value and ERC20 allowance rules, quote-consumption slippage, preview race behavior, partial-fill reconciliation, share rounding/dilution, pause and implementation drift handling, and testnet round-trip receipts before any preparer or UI action is added.

## Advanced maker disposition

ABI presence is not application authority. Each advanced function requires a separate access/asset/atomicity/failure/event/economic review and allowlist amendment. The current manual workspace deliberately uses only existing `MarginAccount` deposit/withdraw/batch-withdraw, ordinary `addBuyOrder`/`addSellOrder`, market-order, and cancellation preparers.

## Differential findings and residual risk

No removed validation or new arbitrary write path was found. Sensitive failures are normalized to fixed codes. The reader anchors Coordinator/Router/vault/lock identity and one block hash; optional section failures remain unavailable. Indexer share history reconciles to live supply before publication. UI preserves a successful first maker receipt when the second leg fails and does not infer executable liquidity from a CLOB or best price alone.

Slither’s 174 frozen-contract findings are summarized in `slither-summary.md`; they do not clear existing production gates. Full testnet historical backfill, fresh authorized maker transaction smoke, production deployment, merge, and release approval remain open.
