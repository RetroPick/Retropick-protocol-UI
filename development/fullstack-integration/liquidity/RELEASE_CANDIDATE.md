# V2 liquidity release candidate

Branch: `codex/v2-production-liquidity`  
PR: https://github.com/RetroPick/retropick-protocol/pull/38  
Baseline: `e1c578535e3451de5c1792cd0a2b48d922e787c8`  
Current continuation HEAD: see `git rev-parse HEAD`.

## Status ledger

```text
SDK_LIQUIDITY_READS: PASS
INDEXER_HISTORICAL_CATCHUP: PASS (representative offline database)
LP_SUPPLY_RECONCILIATION: PASS (3/3 vaults)
LIQUIDITY_API: PASS deterministic readiness/cache/cursor tests
LIQUIDITY_UI: PASS deterministic browser regression
MAKER_WORKSPACE: PASS deterministic UI; approved SDK preparers only
AUTHORIZED_MAKER_SMOKE: BLOCKED_AWAITING_FUNDED_SIGNER_AUTHORIZATION
FOUNDRY_REGRESSION: PASS local and remote CI
PLAYWRIGHT_REGRESSION: PASS local and remote CI
SECURITY_REVIEW: PASS for introduced read-only change; passive LP/pro-MM blocked
REMOTE_CI: PASS at b300ae99
VERCEL_PREVIEW: PASS at b300ae99
PRODUCTION_MIGRATION: BLOCKED_APPROVAL (runbook complete)
PASSIVE_LP_WRITES: BLOCKED_APPROVAL
ADVANCED_MM_WRITES: BLOCKED_APPROVAL
MERGE_APPROVAL: BLOCKED_APPROVAL
DEPLOY_APPROVAL: BLOCKED_APPROVAL
```

## Historical migration evidence

Source projection-2 database block `70,648,102` was copied by SQLite backup API and verified (`integrity_check: ok`). Offline grouped replay targeted block `69,723,600`, after all three source-database pools had graduated. Every vault cursor completed; every reconstructed nonzero-address LP balance sum exactly equaled on-chain `totalSupply`.

Each ledger contained the permanent lock balance plus exactly 1,000 MarginAccount infrastructure shares and no user-owned LP. Deposit/withdraw events did not double-count ownership. The original projection-2 snapshot remained intact, and no live database was modified.

## Approval requests

1. **Funded maker smoke**: candidate public signer `0xB505…913b`; recommend one minimal post-only sell, confirm indexer/UI, cancel, withdraw. Requires explicit signer/spend/cleanup authorization.
2. **Live indexer migration**: recommend execution only after staging rehearsal and operator review of the runbook. Requires deployment owner approval.
3. **PR merge**: recommend independent reviewer approval after reviewing `b300ae99`.
4. **Staging/production deploy**: separate release authority required.
5. **Passive LP writes**: not recommended until dedicated vault deposit/withdraw/permit security review and testnet round-trip.
6. **Advanced maker selectors**: not recommended until each primitive receives independent economic/security review.
7. **Founder/Circle/freeze gates**: unchanged and outside this campaign.

## Residual risks

Representative replay is not source-snapshot-to-head replay. Live migration still needs full catch-up and operational load/rate-limit testing. Slither's frozen-contract baseline remains 174 findings. No new financial selector, contract mutation, deployment, merge or mainnet action is authorized here.
