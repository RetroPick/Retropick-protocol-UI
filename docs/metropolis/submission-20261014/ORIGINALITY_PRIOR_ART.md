# Originality and primary-source prior art

Research accessed 2026-10-13 UTC through Agent Reach Exa/Jina and direct web reads. Facts below are source-derived; the distinct value of RetroPick is an inference to validate. No exclusive/global-first claim is justified.

| Primary source | Established behavior | What RetroPick may truthfully distinguish |
|---|---|---|
| [Pump bonding curve](https://pump.fun/docs/bonding-curve) | Deterministic primary curve; atomic graduation into PumpSwap. | Current destination is Kuru orderbook execution and specific controlled lifecycle mechanics. Curve/graduation alone is prior art. |
| [Raydium LaunchLab overview](https://docs.raydium.io/user-flows/launchlab-overview) | Creator/trader/platform launch infrastructure, curve trading, CPMM graduation and configured LP treatment. | Demonstrated Kuru lifecycle and its secured custody/policy behavior. Locking or reusable launch infrastructure alone is prior art. |
| [Nad official integration guide](https://nad.fun/skill.md) | Monad launchpad, curve trading and graduation to Uniswap V3 DEX. | Kuru trading destination plus precise policy/ledger/custody/retry claims. Monad launchpad alone is prior art. |
| [Nad user guide](https://nad-fun.gitbook.io/nad.fun) | Dated May 21, 2026; serves creators/communities and describes curve→DEX lifecycle. | Customer overlap is material; willingness to switch is unverified. |
| [Kuru deploy-market SDK](https://docs.kuru.io/sdk/deploy-market) | Token + market + seeded MON liquidity can be created in one transaction; parameter guidance already exists. | Bonding-based discovery preceding the book, committed policy, one secured ledger, retryable atomic graduation and protected initial LP/excess custody. Direct market creation is not new. |
| [Kuru maker guide](https://docs.kuru.io/sdk/py-sdk-market-making) | Inventory-aware quotes, atomic cancel/place, order/fill monitoring and tick/size rules. | Prospective maker usefulness must be measured; access to a CLOB does not produce makers automatically. |

GTE comparison lead: Exa returned [official launchpad](https://docs.gte.xyz/home/overview/launchpad) and [AMM](https://docs.gte.xyz/home/overview/amm) documentation describing bonding→AMM bootstrap and wider AMM/CLOB architecture. Direct reads returned 502. Do not assert identical deployed direct curve→CLOB behavior or claim RetroPick is first based on an incomplete search.

## Concrete claim boundary

Inspected source: contracts/src/v2/GraduationCoordinatorV2.sol owns secured balances; KuruGraduationExecutorV2.sol binds policy identity, creates/verifies destination and LP/excess custody atomically; KuruLiquidityLockV2.sol has no owner/withdrawal/approval/arbitrary-call entrypoint. Historical deployment/source proof is in deployments/monad-testnet/v2.json and evidence/hackathon/metropolis/SOURCE_VERIFICATION.md. Current-source equivalence and receipts belong to the proof owner.

Say: **RetroPick implements a controlled lifecycle from bonding discovery into Kuru secondary trading.** Do not say: first bond-to-book launchpad; invented graduation; new asset class; guaranteed liquidity; zero slippage; audited; official Kuru/Monad partner.

The hypothesis of differentiation is greater lifecycle reliability and a coherent creator/trader experience. No primary source or documented interview proves exclusive novelty or user willingness to switch. Standard launch tokens remain standard launch tokens even when a new market is created for them.

## Authority drift

The older GRADUATION canonical doc still says Kuru TARGET/V4 current; ADR-021 and ADR-022 retain PROPOSED status and old blockers despite newer runtime records. KURU_BOUNTY retains old priority and an apps/web reference. This package does not accept proposed economics or modify financial authority. Root/proof owners must reconcile newer accepted authority and dated evidence separately.
