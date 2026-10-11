# ZCODE GLM EXECUTION PROMPT — MERA PROTECTED EARN + CRE + CREATOR CONTINUITY
**Purpose**: Copy unchanged into ZCode GLM execute mode, together with docs/metropolis/14. Date 2026-10-11. Current repo https://github.com/RetroPick/retropick-protocol; judge staging https://retropick-metropolis-retro-ui-stagi.vercel.app ; hackathon Oct 14 10:59 WIB, recheck portal.

## Role & absolute guards
Act as principal Web3/security/fullstack/integration engineer. Implement the secure attainable MVP autonomously with evidence; do not merely write a plan. **Only frontend apps/retro-ui. NEVER write apps/web.** No changes to deployed Factory, FeeEscrow, Kuru, Solidity custody, treasury, owner/admin signatures, Yubie host, production release, or money without separate operator approval. Preserve unrelated dirty worktrees and existing vault ciphertext. Do not commit secrets. Use small scoped PRs.

## Required documentation
Read latest main and PRs. Read `docs/metropolis/{README.md,03-MERA-PRF-ALLINONE.md,07-CHAINLINK-CRE-ALLINONE.md,13-CREATOR-CONTINUITY-MERA-CRE.md,14-MERA-PROTECTED-EARN-WITHDRAWALS.md}`, `integrations/{mera-protected-earn,mera-creator-continuity,chainlink-cre}/README.md`, current `docs/metropolis/execution/INTEGRATION-STATUS.md`, `docs/product/REFERRAL_SYSTEM.md`, deployment manifest, source/tests. Use official Mera and CRE docs, exact installed versions and SDK types.

## PRE-FLIGHT technical inventory — DO NOT ASSUME
Read `RetroPickFeeEscrowV2.sol` FeeEscrow claim overloads and recipient/msg.sender binding; `BuybackVaultV2.release`; `FactoryV2.transferCreatorFeeRecipient,setCreatorFeeRecipient,pendingCreatorFeeRecipient`; Kuru MarginAccount withdraw; all `apps/retro-ui/src/features/earn/` claim, send, fund, portfolio & wallet functions; `apps/retro-ui/src/services/tx-pipeline.ts`; sdk `prepare.ts`/`transfer.ts`; existing Mera `strategy-vault.ts`. Verify PR #18 already merged if true, never base new docs on stale branch. Read and verify Mera `@category-labs/mera` currently 0.2.0 and current CRE SDK/tool versions. Record exact branch SHA and source paths. Existing CRE graduation safety is real typed workflow but simulation evidence needs validation. Report all 8 sponsor integration statuses from evidence only, do not re-implement other integrations.

## P0 security truth gate
A WebAuthn challenge in UI CANNOT prevent a stolen EOA from directly calling FeeEscrow/Kuru or transferring funds. A PRF vault grants NO spending control. A Mera-derived EOA has passkey-based single-signer ownership and is **not** additional independent MFA for pre-existing wallet. Off/on UI state cannot change ERC20 account validation. Classify capability as NONE / APP_ONLY / PASSKEY_SIGNER / ONCHAIN_POLICY, with text visible to users. Never claim bank withdrawal/referral claim available on Monad Testnet. Pending referral payouts not implemented. No automatic transfers of historical escrow credit to new beneficiary. Do not deploy an unaudited financial policy contract for showcase.

## P1 UI — Earn security, truthful
Under **Earn → Available to claim** and Earn settings, add a polished minimal protection panel / toggle. Preserve layout. Toggle defaults disabled on existing wallet; any enabled APP_ONLY mode explicitly reads `Passkey confirmation in RetroPick only; other wallet apps can bypass`. Display protected account and current injected wallet as separate addresses. Show coverage per user action: `creator fee native claim, ERC20 fee claim, claim all, buyback vest release, Kuru margin withdraw, direct MON/ERC20 Send`; show referrals `NOT_ENABLED`, fiat off-ramp `UNAVAILABLE_TESTNET`. Enable/disable confirmation with current chain, address, beneficiary consequences. Persist preference only as UI convenience, never as an onchain policy. Wallet switch/chain change resets transient authorization; no hidden auto-enabling; mobile/desktop Playwright.

## P2 Strong sponsor feature — Mera protected creator-fee signer
Use official SDK import patterns and viem account adapter **validated against installed 0.2.0**. Do not invent methods. Determine PRF-account creation and restore, enforce stable RP ID on judge domain, same derived EVM account on two supported devices, safe ephemeral signing session, gas handling, wrong device and no sync errors. Keep derived secret, signing key, PRF bytes out of storage/network/logs. Implement a small isolated wallet-account adapter rather than rewriting global EIP1193 provider. Record real approved 10143 minimal signed transaction and receipt. No auto-sign without user review/gesture.

For NEW launches: optionally let creator choose passkey-derived account as `TokenParams.creatorFeeRecipient` only if launch factory supports exact parameter and full signing tested. Original EOA remains immutable `deployer`. For EXISTING launches: show opt-in future-beneficiary transfer requiring **old current-beneficiary signature** and separate confirmation; verify onchain event/state. Historical FeeEscrow credits remain old-wallet. For lost EOA recovery do NOT imply vault/passkey alone proves original EOA ownership: follow pre-enrollment WebAuthn+wallet-signed claim/admin 3-day process from doc 13. An unauthenticated current user cannot trigger `setCreatorFeeRecipient`.

If actual PRF signer integration cannot qualify before deadline, ship separate honest APP_ONLY and existing vault features; label passkey fee wallet UNAVAILABLE and document blockers.

## P3 Policy semantics across real money paths
A protected fee-recipient wallet can call FeeEscrow only as its own `msg.sender`; Kuru Margin `withdraw` only for balances owned by same account, not existing injected user's margin. Buyback release and subsequent escrow claim are **two operations**; each requires proper signed authorization. `claim all` sequential per-token, require explicit user acknowledgment for all, no silently reusable passkey ceremony; if SDK offers a limited session, authenticate step purpose/action/digest and expiry, user-informed limited approvals. `send to wallet` use actual derived-account balance, checked recipient and amount, chain re-read, simulation and receipt. Native-wallet MON gas reserve; atomically executed sender address must match UI. Protect future mainnet fiat provider instructions separately; never enable on testnet or infer bank payout from crypto transfer.

## P4 Chainlink CRE
Run `cre whoami`, `cre --version`, inspect exact workflow help; simulate existing `integrations/chainlink-cre/graduation-safety` success and adversarial cases using official CLI first. Only then implement isolated read-only `creator-continuity` watcher if time: Factory event/active/pending beneficiary vs authenticated recovery case external API; statuses ALIGN/MISMATCH/PENDING/EXPIRED etc; snapshot block, replay & stale provider guards. A CRE alert never enforces EOA withdrawals or signs owner/admin transactions. No simulated report described as deployed DON. Avoid use of CRE for source of truth on signing authority. Use installed SDK real types.

## P5 Full sponsor conflict/validation pass
Check Kuru Consumer orderbook/claims/margin/agent order ownership unaffected by signer new mode; Envio radar state/token present/runtime qualified? CRE simulated? MetaMask wallet plugin installed and actual order? Aurora supported Monad testnet route? Nansen API and testnet coverage? Kuru New Assets P0 deployment authorization? Mera PRF signer actually signed? Pinata IPFS mode? Referral payouts? Record `CONFIRMED_RUNTIME|TESTED_LOCAL|CONDITIONAL|BLOCKED_EXTERNAL|NOT_IMPLEMENTED` based on evidence, not reports alone. Do not claim untested credentials valid or external sponsor working from source alone.

## P6 Test/security evidence
Typecheck, build, unit, current Forge & fixture E2E baseline, Playwright with real PRF capable browser. Test wrong RP ID, no synced passkey, signing rejection, wrong address, wrong chain, stolen EOA bypass of APP_ONLY (must be documented), wrong beneficiary, malicious recipient, expired challenge, disabled policy, restart reload, loss of vault recovery, disabled bank route, zero referral claims, Kuru wrong-owner withdrawal, claim all partial failure and outdated spend policy. E2E all responsive. Preserve `apps/web/**` file diff empty. Evidence under `docs/metropolis/execution/` and `evidence/hackathon/metropolis/sponsors/mera/`; redact secrets/keys. Do NOT invent live Monad transaction proof.

## Execution order
0. Verify latest main/PR and read docs.
1. Actual security/contract mapping, risk table, control model.
2. UI truthful Earn protection toggle with full transaction coverage.
3. Mera signing-account SDK compatibility, two-device restore and real minimal testnet tx under user-authorized budget.
4. Consent-bound future creator fee recipient protection + old/current credit distinctions.
5. Per-action signer support and CI/Playwright.
6. CRE existing simulation qualification; optional creator watcher.
7. Audit 8 integrations, update honest evidence/capabilities matrix and final docs.
8. PR and handoff; do not modify apps/web or deploy unapproved contracts.

**Finish only when all claimed protections have real proof or honest unsupported labels.**
