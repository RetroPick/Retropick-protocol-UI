# Market quality and risk

Protected initial LP/excess custody is a narrow non-withdrawal property. It does not guarantee executable two-sided depth, returns, stable price, issuer honesty or immunity to external Kuru governance/failure. This is an unaudited Monad Testnet candidate.

| Risk | Why it matters | Evidence / user treatment |
|---|---|---|
| Thin/empty book | A venue can exist without counterparties; a limit order may never fill. | Show actual book, last update and empty state; no fake quotes or guaranteed depth. |
| Price impact / spread | Curve convexity, book depth and fees affect execution. | Quote exact units/fees, minimum/limit price and partial fills; never zero-slippage copy. |
| Concentrated holdings / manipulation | A few actors can dominate price or apparent activity. | Pilot holder/order/filled-trade review; distinguish independent participants and disclose team tests. No anti-manipulation guarantee. |
| Graduation failure | External work can fail after primary discovery completes. | One secured ledger and retryable atomic venue step; current-deployment equivalence checked by proof owner. |
| Kuru external change | Protected assets remain exposed to venue malfunction, upgrades or pauses. | Monitor external identity/market status; do not invent emergency withdrawal or silently change policy. |
| Stale RPC/indexer/Radar | Indexed metrics may lag or contain historical events. | Freshness/as-of and unavailable states; contract state remains economic authority. |
| Maker inventory/adverse selection | LP custody alone does not pay for profitable active quoting. | Prospective makers review inventory/order constraints; no agreements/rebates invented. |
| Asset/issuer misconduct | Token custody controls do not establish legal rights or legitimate project conduct. | Explicit token policy/risk; standard ERC20 scope; issuer-specific review before production expansion. |

## Pilot dashboard specification

All measures carry window, chain, source, as-of block/time and team-test exclusion. Unmeasured is reported unmeasured; missing/crossed/stale two-sided books have unavailable spread/mid metrics rather than an invented healthy price.

| KPI | Definition / denominator | Proposed testnet evaluation target |
|---|---|---|
| Launches/week | Valid pilot Factory launches / seven-day window; unique non-team creators separately. | Three of five recruited operators launch within 30 days. |
| Graduation | Completed / launched pilot markets, plus median and worst latency. | Two of three by 60 days; unresolved attempts stay in denominator. |
| First Kuru order/fill | Time from verified graduation receipt to first non-team order/fill. | At least two graduated markets obtain an independent fill; latency reported without a guaranteed bound. |
| Depth at 1%/2% | Sum executable MON quote value per side within stated distance of valid mid. | Establish baseline first; no fabricated current amount or monetary-depth guarantee. |
| Spread / survival | Relative best-ask-minus-best-bid over valid mid; two-sided availability over observed session seconds. | Two pilot markets have a two-sided book during at least 80% of one scheduled 60-minute session by 60 days; report failures. This is a hypothesis. |
| Organic activity | Deduplicated eligible non-team traders and executed fills; testnet is always disclosed. | Twenty invited testers; activation measured rather than claimed in advance. |
| D1/D7 retention | Returning / originally activated traders eligible for follow-up. | Measure baseline and seek at least five D7 returns among the first twenty activated traders by 90 days, only if twenty activate. |
| Maker repeat | Makers quoting in a second session / makers who began. | Two maker evaluators recruited; one returns for a second controlled session. |
| Custody | Exact initial LP shares/excess held at the bound lock versus graduation receipt amounts. | Reconcile every graduated pilot market; any discrepancy is a blocker. |

Founder owns pilot thresholds/reporting; maintainers own measurement integrity. Targets are proposed experiments. Security, issuer/legal and operational qualification gate all production expansion. No protocol economics are changed by this document.
