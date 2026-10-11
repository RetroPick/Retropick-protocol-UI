# 02 — Eight-Sponsor Qualification Gates and Judge Benchmark
Use the canonical `docs/metropolis/execution/RELEASE-GATES.md` A–E. This file operationalizes it; it never lowers a financial gate.

## Gate definitions (A–E; all must pass before QUALIFIED_A_E)
- **A OFFICIAL SOURCES:** current provider documentation, actual SDK types/versions, contract ABI/release SHA, verified target network/route, licensing and quotas. Include official URLs with date.
- **B LOCAL ENGINEERING:** typecheck, compile, unit, precision, rejected malformed input, failure handling, effective feature not stub/mock.
- **C SECURITY:** authorization and signer bounds, origin/RP, no secret disclosure, withdrawal/account ownership, exact amounts, negative tests including stale/replay, no silently unlimited approvals, old EOA bypass accurately disclosed.
- **D REAL INTEGRATION:** actual authenticated provider response or official CRE simulation as appropriate, onchain receipt when a claim of chain mutation is made, real staging frontend and browser E2E where relevant, data freshness and reconciliation. Distinguish LIVE DON from CRE SIMULATOR.
- **E HACKATHON ELIGIBILITY/PRODUCT:** sponsor-specific criteria satisfied, measurable launchpad-native utility, current technical demo, legal/licensing compliance, judge URL, truthful public claims and submission answers.

## Sponsor gates
| Sponsor | Baseline source | Proof to unlock runtime and E |
|---|---|---|
| Kuru Consumer | V2 bonding→graduation→Kuru, depth/post-only features and tests | current live market identity, orderbook integrity/available depth, genuine user-authorized order/fill/cancel where available, mobile product, no Kuru regression after Mera signer |
| Kuru New Assets | Research P0 qualified locally | explicit funding+deployment go, actual complete-set backed asset, distinct liquidity source, verified YES/NO Kuru listings, genuine order/settlement/claim/redeem evidence |
| Mera | strategy vault PRF encrypted | real device PRF, authentic Mera signer restored on another supported device, signed 10143 receipt, opt-in future creator-fee beneficiary and own `msg.sender` claim where credit exists, true protection labels |
| Envio | HyperSync typed radar core 8/8 tests | rotated token scoped server side, authenticated 10143 stream with real events, checkpoint restart/reorg, reconciled market/token aggregations, live retro-ui radar |
| Chainlink CRE | typed read-only graduation safety | official `cre workflow simulate` PASS + wrong market + external failure and replay traces, provenance; second creator watch independent and not an EOA withdrawal gate |
| MetaMask Agent Wallet | seven-command oclif plugin + policy 8/8 | supported plugin installation with operator publish approval, exact capabilities, wallet agent permission/MFA, bounded real testnet order only after explicit financial approval |
| Aurora Intents | previous no Monad TESTNET route | official end-to-end supported target route + actual testnet liquidity/trade; if none, remain BLOCKED_EXTERNAL |
| Nansen | prior API/licensing/testnet blocker | licensed key, supported chain/data, redistribution rules honored, genuine decision-support UI; don't mislabel local risk signals Nansen |
Other: Pinata is optional operational media storage; referral payout nonexistent; bank cashout not available on Monad Testnet, unrelated to Aurora bridges.

## Cross-lane security
Claims are `FeeEscrow msg.sender → claim owning address`. Kuru margin belongs to actual margin owner. Token `deployer` is immutable attribution; Factory fee recipient changes only future routing; 3-day owner override and post-delay window. Mera client-side `APP_ONLY` cannot prevent external EOA calls. CRE monitoring cannot enforce wallet withdrawal policy. MetaMask wallet policy ≠ Mera onchain dual auth. P0 contracts/research not production PRISM assets. No contract deployment without authorization.

## Validation labels
`SOURCE_VERIFIED`: upstream docs + code read.
`TESTED_LOCAL`: unit/types/fork, no real provider.
`SIMULATED`: CRE CLI or mocked/fork state, label type.
`BROWSER_E2E_VERIFIED`: actual public staging routes; no wallet signing implied.
`RUNTIME_VERIFIED`: real service/provider successfully running and reconciled.
`TESTNET_TX_CONFIRMED`: real authorized tx hash + receipt and state.
`QUALIFIED_A_E`: all A–E for particular sponsor.
`CONDITIONAL`, `BLOCKED_EXTERNAL`, `DEFERRED_AUTHORIZATION` always list specific gap. Never use "COMPLETE" without explicit proof class.

## Judge benchmark
User-supplied score weights: 20% technical execution, 20% craft/design, 15% originality, 25% founder/market readiness, 20% traction/path; must verify official current portal. Best value is visible cohesive journey with onchain receipt, functional Kuru orderbook, Mera protected fee account, Envio quantified graduation/market health, CRE security watch, MetaMask bounded agent flow. Avoid speculative P0 deployment or provider link if actual network unsupported.
Production screenshots, testnet explorer evidence, sponsor requirement checkboxes, security limitations and honest blockers required.

## Release regression
Use current package scripts (never root-wide install if it writes to apps/web). Retro-ui typecheck/build/test; relevant sdk/indexer/referral/media/integration tests; Forge qualified kernels; full fixture e2e; Playwright desktop/mobile real staging; official CRE simulation; real Mera manual passkey where browser automation cannot. Mandatory before each PR: `git diff --name-only origin/main...HEAD -- apps/web` EMPTY, secret scan, exact source SHA, zero unrelated worktree changes, backout. Production cutover/P0 finance/host service write gated separately.
