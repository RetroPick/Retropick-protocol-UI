# RetroPick — verified mechanism for demo authors

This analysis separates the deployed Monad Testnet candidate, historical transaction evidence, current public interface, and unpromoted checkout changes. It supports the editable scripts; it does not authorize a new transaction or financial deployment.

## What the product does

RetroPick originates community-token markets. Primary trading occurs on a deterministic bonding curve; eligible launches transition to a verified Kuru secondary market. A single interface presents discovery, launch review, curve quotes, graduation proof and Kuru trading controls. The demo's strongest supported claim is a native-MON lifecycle with historical two-actor order/fill/cancel evidence on Monad Testnet. It does not prove current liquidity, organic demand, all quote-asset support, mainnet readiness or security audit completion.

The architecture has separate authorities: the wallet signs normal user economic writes, RetroPick contracts own primary economics and graduation accounting, Kuru owns secondary execution, and indexers reconstruct reads. A backend or Radar result cannot authorize spending or redefine reserves.

## Source and release boundaries

| Layer | Evidence basis | Consequence for narration |
| --- | --- | --- |
| Deployed financial contracts | deployments/monad-testnet/v2.json, source SHA f0363249f4b74e58dde37d1241742ca5a92bcfe3, chain 10143 | Historical candidate evidence; frozen contracts remain unchanged. |
| Current apex captures | Fresh https://retropick.xyz only; observed frontend release SHA 54a003dff49033b82ab1fa4cd0d0e13ade8409c0 | Show captured functionality, not assumed checkout behavior. |
| Checkout | Branch codex/metropolis-p0-recovery; base HEAD 8f5f022fb53e763a3ebb2b9c54abfb1cccf00d61 plus existing dirty changes | Reading source does not prove public deployment. |
| Canonical frontend | apps/retro-ui | apps/web is legacy and was not modified or used for demo footage. |
| Radar corrections | Aggregation-version-4 backend and promoted frontend3728ce5 with final public verification | Qualified historical quantities now verified; preserve current-depth distinction. |

Two stale source references are explicitly reconciled: docs/launchpad/GRADUATION.md still calls Kuru a target, whereas newer docs/launchpad/KURU.md records implemented testnet graduation and trading. docs/launchpad/SYSTEM_ARCHITECTURE.md names apps/web in its diagram, whereas the active frontend instruction and captured release use apps/retro-ui. These are documentation freshness conflicts, not permission to modify protocol semantics. Deployment evidence and the newer qualified lane establish the narrow testnet delivery claim.

## Primary trading

The normative curve specifies token reserve, real quote reserve and phantom quote reserve, integer rounding, fees, min-out and deterministic threshold. Buy adds quote after explicit fee allocation, computes token output and enforces min-out. Sell receives tokens, computes quote output, applies fees and checks real-quote solvency. Virtual reserves influence price; they are not real collateral. Fee balances and graduation reserves are separate economic categories.

Source: docs/launchpad/BONDING_CURVE.md, FEES_AND_ECONOMICS.md, INVARIANTS.md; contracts/src/v2/RetroPickBondingCurveV2.sol buy(), sell(), graduate(). The actual frontend uses exact parsing, SDK buyQuote/sellQuote and prepareCurveBuy/prepareCurveSell, then executePreparedWrite. An unsigned displayed quote is not an executed trade or a guarantee of execution. No new trade was signed for the recordings.

## Graduation and retry boundary

The Coordinator is the sole graduation ledger. It commits a packet containing token/curve/quote identity, quote-policy version/hash, executor identity and code hash, venue-policy hash, fee snapshot and predicted protected receiver. Launch validation checks that packet against the curve and executor policy.

Securing graduation assets commits separately from atomic venue completion. The Coordinator checks readyToGraduate(), reserves and phase before securing assets. Completion delegates to the committed executor, verifies the receipt and updates the ledger. The external venue step cannot silently change the primary curve arithmetic; failed completion must not be presented as GRADUATED.

Source: contracts/src/v2/GraduationCoordinatorV2.sol, interfaces/IGraduationExecutorV2.sol, KuruGraduationExecutorV2.sol; normative docs/launchpad/GRADUATION.md and KURU.md. The demo shows an already graduated launch. It never implies a fresh graduation occurred during filming.

## Kuru destination and custody

The executor validates environment/policy, derives the token seed, creates the Kuru market and vault, deploys a per-launch KuruLiquidityLockV2, verifies destination binding, deposits initial assets and sends excess launch tokens to the protected receiver. It requires no residual balances or unsafe allowances before returning its receipt. Receipt verification binds token, quote, market, vault and protected amounts to the same lock.

KuruLiquidityLockV2 contains immutable token/quote/market/vault bindings and a protectedBalances() read. It has no owner, approval, withdrawal or arbitrary-call entrypoint. This supports the narrow claim of permanent custody for that launch's initial LP shares and excess launch tokens. It does not make every user balance permanently locked, guarantee market depth, or prove all possible economic attacks have been audited.

The actual Kuru ticket prepares orders/deposits/withdrawals from verified market parameters. Limit orders expose good till cancelled and post-only behavior; margin trading funds are distinct from the protected initial-asset receiver. An empty live book is shown as empty. Historical execution does not establish current actionable liquidity.

## Consistent campaign identity

The active curve in scene 3 is **0xd7b2ce2ebbf672255d339006f046c4ef7025d609**. It is a separate lifecycle illustration.

The graduated RPV2M evidence campaign uses:

- Token: 0x43e7e9b1b7d9a143573307b13d14b51580c18f15.
- Kuru market: 0x1F5dE72616a7fe645Cf45aC66dfce8Ac7452C57F.
- Kuru vault: 0xc88DED06eB0081430Ff02d124C22b532e122CbE7.
- Factory: 0xa7f18b9eceb0A9852b08408854A45D00fc682454.
- Coordinator: 0xaD62309242EA65BB07C833669EC6a4ED23AF738F.

The RPE2E campaign is different and must not be mixed into RPV2M hashes/addresses. Keep historical team-test labels on receipts; do not count those tests as traction.

| RPV2M action | Supporting historical explorer receipt |
| --- | --- |
| Launch | https://testnet.monadexplorer.com/tx/0x5cc1d0469ee7b811139055a81f2ba85a49a3de5b8ea54e158426693a556271f3 |
| Curve buy | https://testnet.monadexplorer.com/tx/0x41627a9090bd0fbdac03126457de8b3bc60a29486c70efffd18f71997596a926 |
| Graduation | https://testnet.monadexplorer.com/tx/0x70d0cb480e7824ca9af62eaa5cb8d246a352efc6f2ba3585119c8bc64fa63fde |
| Order | https://testnet.monadexplorer.com/tx/0xabd44f6922c652f0043658bf86f7d72e5cc550d4755a001cfd8d1c519ae515b7 |
| Fill | https://testnet.monadexplorer.com/tx/0x93e056ca41c8f55022c2030f4ecaade5775187fc443e8b98f7ddac7a65855415 |
| Cancellation | https://testnet.monadexplorer.com/tx/0x471faeb38c8598fc7207cb97c18a550db989e6d43bf0ce23b3539ea7920ac920 |

Fresh read-only receipt checks are recorded by the technical-demo proof lane. Explorer links and current contract reads must still be rechecked if the release or evidence campaign changes.

## Envio boundary

The public /api/radar/health response identifies HyperSync source and cursor freshness. Earlier quantitative Radar had scaling/deduplication issues. The deployed version-four fix verifies market base decimals and size precision, preserves raw journal totals, derives exact amounts, deduplicates cancellation events and marks unavailable metadata quantities as unavailable. Current public footage avoids known incorrect numerical Radar values. Contabo backend final validation and promoted frontend3728ce5 apex desktop/mobile/API verification now pass. The completed115-second public Envio film shows corrected historical dataflow.

Event history is not executable depth. Even a healthy source with a fresh cursor cannot by itself prove correctly scaled economic amounts, current liquidity or solvency.

## CRE: genuine simulation, bounded guarantee

The graduation-safety main.ts uses CRE cron, EVM and HTTP capabilities. It checks graduated ledger phase, expected receipt market, positive matching recorded LP amounts, matching recorded excess amounts and external Sourcify runtime match. It emits PASS, FAIL or INCOMPLETE_EXTERNAL. It is read-only and not an onchain authorization mechanism.

Current source uses LATEST_BLOCK_NUMBER for contract reads while separately recording a header anchor. Therefore describe an anchored report using fresh reads; do not claim all calls are atomically pinned to one block. The workflow checks record agreement, not an independent exhaustive custody-balance/security audit.

Actual official simulations supersede the older README's BLOCKED_EXTERNAL status:

| Run | Logged verdict | Anchor block |
| --- | --- | --- |
| graduation-safety | PASS | 70765920 |
| Wrong expected market | FAIL | 70765972 |
| Ungraduated token | FAIL | 70766027 |
| External Sourcify unavailable | INCOMPLETE_EXTERNAL | 70766077 |

Logs: /home/ubuntu/retropick-media/metropolis-20261014/proof/*simulation.log. The 90-second CRE footage shows three cases: positive PASS, wrong-market FAIL, and external-unavailable INCOMPLETE_EXTERNAL. Ungraduated FAIL is separately logged evidence and is not in that video. These are official CLI simulations, not a live DON deployment. In particular, the external-unavailable negative is INCOMPLETE_EXTERNAL, not FAIL.

## Mera: private data is separate from spending

apps/retro-ui/src/lib/vault/strategy-vault.ts imports @category-labs/mera, uses current hostname as relying-party ID, validates a versioned schema and persists encrypted vault JSON. It bounds title/body/entry counts and maps PRF/decrypt/format errors. The source comment attributes WebAuthn PRF, HKDF and AES-256-GCM to Mera. The localStorage key is a storage key, not evidence of an application PRF namespace.

Source existence does not establish successful genuine passkey enrollment or cross-device recovery. A qualified recording must show the same genuine credential decrypting the same ciphertext on a second device or fresh profile. A reload is insufficient. Mera remains selected but technically unqualified pending that genuine evidence. The vault protects private research data, not economic spending authority.

## Why the edit follows this order

Discovery establishes the product; creation establishes committed terms; an active curve explains primary price discovery; a distinct graduated campaign establishes destination proof; current Kuru controls establish the real UX; receipts establish historical execution; custody establishes a bounded protection claim; source-health footage establishes the read-model boundary. This order gives judges a causal product narrative while avoiding a fabricated continuous journey or misleading liquidity claim.
