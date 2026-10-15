---
name: retropick-liquidity-accounting
description: Implement or review RetroPick Kuru reserves, prices, LP shares, protected liquidity and maker capital accounting.
---

Read docs/launchpad/KURU.md, deployed ABI/manifest and the pinned Kuru source. Keep CLOB, AMM vault, size-dependent simulation, user margin, protected LP and wallet LP separate.

getL2Book is ordinary CLOB depth. best/vault quotes are human quote/base times 1e18; absent best bid can be uint256.max and absent ask zero. Current vault-step size is order size minus partially filled size, not total depth. Validate impossible tuples instead of clamping them to zero.

Vault totalAssets represents its MarginAccount credits. Use actual previewWithdraw for partial-fill-aware underlying previews. Treat bootstrap infrastructure shares separately from external holders. Keep asset units/decimals and bigint exactness; no combined TVL without an approved valuation source.

Margin free balances are shared across markets: count once per chain/account/asset. Show order commitments and incomplete histories separately. Execution-price volume with unknown fees is insufficient evidence for PnL or fee income.
