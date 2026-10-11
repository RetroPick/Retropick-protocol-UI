# Sponsor Innovation Matrix — product-level winning strategies
**Goal:** compete on distinctive USER VALUE and reliable demonstrations, not number of SDK logos. All innovation concepts below are PROPOSED until independently deployed/tested.

## One coherent product story
"**RetroPick turns emerging financial claims and creator assets into functioning markets.** Users can bring capital from any supported chain, issue/redeem collateralized outcome positions (when independently qualified), graduate community assets into Kuru books, trade with transparent risk, keep private strategies in passkey-bound vaults and delegate *bounded* actions to an auditable Agent Wallet."

**Judge progression:** market lifecycle proof → safe funds/quote → executable Kuru depth → risk-aware trading → opt-in programmable asset class. Do not show mock PRISM prices as live.

| Bounty | High-signal innovation | 100-second proof / metric | Kill switch |
|---|---|---|---|
| **Kuru New Assets** | **Complete-set trading & settlement**: YES/NO ERC20 claims, full collateral and deterministic merge/redeem, quote on Kuru CLOB, optional exact-backed basket P0 | live split→list→trade→merge or resolve→redeem; tracked collateral/supply and Kuru book depth | no independent P0 solvency/compiled tests, no real Kuru fill |
| **Kuru Consumer** | **Bonding-to-Book continuity**: single launch detail follows assets from curve graduation to real depth, fees, spread, execution quality and permanent LP receipt; small-screen trading with clear guardrails | one mobile trader follows same asset curve→Kuru, sees exact tick/fee, places and cancels; measure quote-to-fill and error | mobile interactions fail / stale book |
| **Envio** | **Market Quality Observatory**: event-derived graduation delay, real post-graduation fills vs seeded depth, holder concentration and launch-to-book consistency; anchored to actual receipts | trade or graduation updates an Envio-derived statistic without refresh or fabricated volumes; trace GraphQL row to log | no live GraphQL consuming core UI |
| **Aurora** | **Intent-to-Execution receipt**: unified user-visible cross-chain progress and two explicit receipts (bridge settlement and Kuru trade), minimizing dropoff from funded wallet to first order | Base (or other proven source)→MON/actual Kuru quote→margin deposit→Kuru order; show min-out/refund | no real source→destination route / testnet unsupported |
| **Mera PRF** | **Private Trading Playbooks**: passkey encrypts market thesis, risk budget and creator draft; portable encrypted metadata without wallet signing; no central plaintext | save ciphertext; new synced-device passkey unlock, wrong device/secret fails; no backend plaintext | PRF unavailable or impossible RP-ID restore |
| **MetaMask Agent Wallet** | **Policy-bounded Order Pilot**: plugin builds exact tick-safe order, explains spread/slippage/cost, triggers wallet policy/MFA for signed action; cancels its own order | install plugin and watch quote→policy allow/deny→real Monad order→cancel | no actual install or wallet-signed order |
| **Chainlink CRE** | **Graduation Risk Circuit**: CRE reads onchain coordinator and independent offchain evidence, outputs reproducible graduated-market safety report; optional separate risk registry, NEVER edit V2 escrow | recorded CRE v1.30+ Monad Testnet simulation, stale-source refusal and verifiable evidence hash | no actual workflow/simulation |
| **Nansen** | **Risk Before Ape**: combine allowed Nansen token flow/intelligence with RetroPick onchain concentration and Kuru spread into actionable, explainable warnings; no raw Smart Money resale | real permitted Nansen response + grounded local calculation; show data freshness, attribution, missing coverage | Nansen endpoint lacks Monad testnet token coverage or licensed redistribution |

## Important strategic distinctions
- **Kuru:** it is a spot matching/market-making venue, NOT an event resolution authority. Existing V2 token launch already has market origination; "new asset class" demands new enforceable payoff/rights, not token branding.
- **PRISM P0:** `research/hackathon-p0/PRISM_P0_SPEC.md` permits exact-lot in-kind redemption; production terminal cash settlement is explicitly excluded. Do NOT promise a fully settled PRISM product in 72h based on research tests.
- **Mera and MetaMask are deliberately separate:** Mera vault stores non-wallet strategy notes; MetaMask is the agent signer under policies; never import/export derived wallet private keys to bridge their roles.
- **Aurora and Nansen must be cross-network honest:** Monad mainnet availability ≠ Monad testnet route/coverage. A blocked testnet dependency means **defer bounty**, not fake demonstration.
- **CRE:** testnet simulation (v1.30.0+) is independently supported, but don't claim production writes until deployed on supported registry.
- **Revenue moat:** issuer tooling + transparent lifecycle + active Kuru execution + risk-aware analytics can grow future user retention; don't claim existing revenue or liquidity.
- **Traction:** provide founder-reported numbers separately from externally verifiable opt-in waitlist, funnel, real usage and community cohorts; test wallets are test transactions, not users.

## Judging evidence storyline
1. 0:00–0:15 market pain: token issuance without mature execution; specialized claims without composable liquidity.
2. 0:15–0:40 current V2 onchain issuance and eventual Kuru graduation with block proofs.
3. 0:40–1:10 actual orderbook trade and inspectable settlement receipt.
4. 1:10–1:35 highest-value NEW sponsor feature that actually works (Envio, Mera, Aurora or agent).
5. 1:35–1:50 one adversarial/guardrail moment (e.g., stale quote, blocked policy or vault tampering).
6. 1:50–2:00 why Monad and Kuru, real adoption plan, explicit testnet limitation.
Tailor each sponsor video independently; do not overload one take with eight integrations.

## Future-proof roadmap
0–30 days: stabilize mobile Kuru trading, real indexer/telemetry, early-user research, bounded funding.
30–60: P0 safety review + Kuru novel-asset pilot on qualified collateral; operational/trading safeguards and market maker outreach.
60–90: PRISM exact-backed product admission, measured live usage and approved risk/compliance steps.
Longer-term: state-liquidity clearing engine, claim transformation, agent-assisted market making. **These are research milestones, NOT current deliverables.**

## Submission drafting rule
For every sponsor explicitly answer: (a) why this integration is core; (b) how it is built (exact source paths/version); (c) where is the proof (link and block/trace); (d) what is genuinely innovative; (e) what users want and what data proves that; (f) what remains unbuilt. No fake probability, depth, volume, approval or live asset coverage.


---
## New Mera × CRE sponsor story: Creator Continuity (proposed, not shipped)
Instead of encrypted notes only, pre-enroll a creator's fee-wallet identity against a passkey before account loss; Mera vault securely stores the recovery dossier and a verified passkey can later authenticate a request for independent admin approval. Existing Factory owner timelock is 3 days, followed by a 3-day execution window; future creator fee routing and unreleased buyback beneficiary may change, but wallet authority, immutable ERC20 deployer and already credited escrow funds cannot. Alternatively new launches can opt into a passkey-derived fee wallet after SDK signer and cross-device qualification. CRE independently audits mismatches between authentic pre-enrollment, owner pending changes, and beneficiary/escrow/vest state. See [13 Creator Continuity](13-CREATOR-CONTINUITY-MERA-CRE.md). No wallet restoration or CRE-onchain write is claimed.


---
## Updated innovation benchmark: creator custody + Protected Earn
Mera is now **Protected Creator Earnings** rather than only a private-notes vault: optional **separate passkey-derived EOA** for future creator fee entitlement, self-service wallet-proven migration, recoverable signing and real fee claim/send where actual onchain credits exist. Exact mechanism in [14](14-MERA-PROTECTED-EARN-WITHDRAWALS.md). High originality and real user utility depends on real SDK signer/receipt, not a UI switch. Long-term tier is an audited smart-account spending policy with distinct onchain second factor and cooldown. Bounties remain separate: CRE observes suspicious administrative changes but has **no signing authority**; Kuru margin is protected only when its actual owner is the passkey signer; MetaMask Agent approvals are another wallet policy, not Mera. On testnet referral payout and bank off-ramp are unavailable. Any claim of secured withdrawals for a standard injected wallet due solely to frontend WebAuthn is incorrect.
