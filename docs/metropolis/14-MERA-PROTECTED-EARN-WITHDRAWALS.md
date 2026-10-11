# Mera Protected Earn & Creator Wallets — Financial-Authority Integration Architecture (2026-10-11)
**NEW SECURITY SPEC — NOT IMPLEMENTED.** For ZCode GLM agents, product, contracts, audit, CRE, and judging. **Canonical UI apps/retro-ui ONLY; NEVER modify apps/web.** Existing V2 deployed contracts remain unchanged. First read `13-CREATOR-CONTINUITY-MERA-CRE.md`.

## 0. Product thesis & impossible promises
User wants an opt-in **"Require Mera Passkey" ON/OFF toggle** under Earn → Available to claim that protects claimable fees, referral earnings (future), Kuru margin withdrawals, send-to-wallet transfers, and eventual fiat off-ramp. This is valuable **only if claims about actual enforcement are precise**.

**CRITICAL:** A client-side toggle or WebAuthn prompt cannot stop stolen EOA private keys from calling `RetroPickFeeEscrowV2.claim()/claimToken()`, Kuru Margin `withdraw`, or making native/ERC20 transfers directly from other apps. A WebAuthn PRF ciphertext vault is not a protocol authorization guard. **Never label a frontend-only check "withdrawals protected onchain".** A Mera PRF-derived EOA account DOES obtain its private signing key in application-controlled signing session; it is single-factor passkey-derived **signing authority**, not an independent second factor layered onto an already exposed EOA key. It cannot forbid the same valid key signing from another client, and cannot retroactively secure previously compromised EOA.

### Protection tiers to implement honestly
1. **Tier 0 DEFAULT:** Existing independent EIP-1193 wallet signing, unchanged; no promise of passkey protection.
2. **Tier 1 UI STEP-UP (optional UX only):** Passkey re-verification before RetroPick's claim, margin withdrawal, send, buyback release; user may bypass this UI. Label exactly `Passkey confirmation in RetroPick only — not an onchain lock`. Never falsely infer that a previously opened Mera vault grants authenticated transaction authority. If implemented, use verified WebAuthn challenge, not just calling decrypt; bind to actual `{chainId,from,action,to,asset,amount,calldataHash,nonce,expiresAt}`, strict origin, fresh UV. No auto-bypass by stale session. Still NOT onchain enforcement.
3. **Tier 2 Mera PASSKEY-CONTROLLED EOA (best hackathon feasibility if SDK validated):** Opt in to a separate dedicated fee recipient EOA derived from passkey. Factory `TokenParams.creatorFeeRecipient` set to that address at launch; existing creator beneficiary may use signed `transferCreatorFeeRecipient(token,newRecipient)`. Future FeeEscrow credits accrue under that actual signing address, and authorized withdrawals require that address to sign. For same-passkey/device restore, verify deterministic address with official Mera SDK on fresh browser and second device. This is account/key protection, NOT toggle enforcement on the user's separate EOA. Switching OFF means a deliberate, independently authorized beneficiary handoff, not disabling browser auth for existing wallet. The Mera signing session is ephemeral; review XSS, malicious extensions, leaked key material, passkey/RP ID drift. User must fund MON gas or sponsor with verified infrastructure. **Existing escrow credits assigned to old wallet DO NOT MOVE.**
4. **Tier 3 POLICY SMART ACCOUNT (future audited phase):** Deploy/validate an independently controlled smart account that enforces passkey validator and optional existing-wallet dual authorization, limits, destination allowlist, and recovery. Could use ERC-4337/1271 or a verified equivalent only if actual Monad support (EntryPoint/bundler/paymaster/module infrastructure) is independently demonstrated. Onchain policy ON/OFF changes themselves need stronger authorization, delays/cooldowns, security and audit. For already credited EOA funds, retroactive protection requires moving assets or economic beneficiary into smart account through an authorized transaction (FeeEscrow historical credits cannot be moved with existing API). DO NOT build new high-value custody/withdrawal Solidity just for a deadline demo without audit and operator approval.

## 1. Source-grounded repository rights, action mapping
Repository `main` at research time:
- `contracts/src/v2/RetroPickFeeEscrowV2.sol`: native `balanceOf[msg.sender]`, ERC20 `balanceOfToken[msg.sender][token]`, `claim()`, `claim(uint256)`, `claimToken(token)`, `claimToken(token,uint256)`. **Zero passkey enforcement** and no delegated beneficiary claim; claims go to `msg.sender`, not arbitrary bank/new wallet. ERC20 transfer after claim is a separate transaction.
- `contracts/src/v2/RetroPickBuybackVaultV2.sol`: `release(token)` by creator beneficiary or protocol recipient; release credits the escrow, not wallet. Separate wallet-signed claim later.
- `contracts/src/v2/RetroPickLaunchFactoryV2.sol`: creator fee recipient can self-transfer; factory owner can override with 3-day timelock + 3-day execute window; valid wallet owner approval remains independent of Mera PRF. Unreleased buyback vest beneficiary updates, historical escrow already credited to old address DOES NOT.
- `apps/retro-ui/src/features/earn/use-claims.ts`: `prepareFeeClaim`, `prepareFeeClaimToken`, `prepareBuybackRelease`, `claimAll` sequential per-asset wallet-signed transactions; `runRow` executes `executePreparedWrite`.
- `apps/retro-ui/src/features/earn/claim-sheet.tsx`, `live-earn.tsx`, `earn.tsx`: claim views, dashboard, Earn hero, vault tab.
- `apps/retro-ui/src/features/portfolio/live-portfolio.tsx`: Kuru margin withdrawal uses `prepareMarginWithdraw` (signed with margin owner's wallet) and open order cancellation.
- `apps/retro-ui/src/features/earn/send-to-wallet.tsx`: `prepareTransfer` + pre-sign review and `executePreparedWrite`, transferring native/erc20 from current connected wallet only.
- `apps/retro-ui/src/services/tx-pipeline.ts`: EIP-1193 `wallet.sendTransaction` and contract approval writes. Transaction flow does not consume Mera credentials.
- `apps/retro-ui/src/wallet/provider.tsx`: current connected injected EIP-1193 wallet. Account and network changes invalidate previous authorization; do not impersonate provider or silently replace global wallet.
- `apps/retro-ui/src/lib/vault/strategy-vault.ts`: local encrypted notes, `@category-labs/mera` 0.2.0, `rpFromLocation` binds current hostname; no wallet/transaction authorization.
- `docs/product/REFERRAL_SYSTEM.md`: referral **attribution only**, no funded onchain payout mechanism: `REFERRAL_PAYOUT_REQUIRES_PROTOCOL_CHANGE = TRUE`. Never claim referral credits are available to protect/withdraw before implemented.
- `apps/retro-ui/src/features/earn/fund-wallet.tsx` and `apps/retro-ui/src/lib/live/fiat-provider.ts`: testnet faucet + MoonPay/Transak/Ramp/Coinbase **UNAVAILABLE** for Monad Testnet. Funds cannot be cashed out to bank from this deployment. No onchain withdrawal can directly send MON to fiat bank account.

## 2. Product UX: one control plane, explicit scope
Suggested UI Earn → Claims near `Available to claim` and Earn → Security:
```
Withdrawal security
[ OFF / ON ] Require Mera Passkey for RetroPick actions
Current mode: App confirmation only  |  Protected payout wallet (if qualified)
Applies to: Claim creator fees / Release vested buyback / Withdraw Kuru margin / Send to wallet
Referrals: Not funded or claimable on testnet
Bank withdrawal: Unavailable on testnet
Protect new creator fees: [Create a passkey-controlled fee wallet]  [Verify recovery]
Connected wallet: 0x...  Protected fee wallet: 0x... (different addresses)
Existing escrow under current wallet: x MON; will NOT transfer on beneficiary change
[View protections, limits and bypass risks]
```
Do **not** show one ON indicator implying coverage of every asset and account. Create per-action/per-account matrix listing protection `NONE | APP_ONLY | PASSKEY_SIGNER | ONCHAIN_POLICY`, protected address, source, supported actions, wallet connection and verification time. Have a confirmation modal before enable/disable with clear asset custody implications. Default OFF for existing accounts; never enable passkey path invisibly or override current signer. When no PRF-capable synced authenticator, fail closed for protected-wallet actions, leave existing ordinary EOA flows unchanged.

User intent separation: `claim` moves funds **escrow→wallet**; `send` moves **wallet→other wallet**; `margin withdraw` moves **Kuru margin→wallet**; `off-ramp` involves **separate provider/KYC/provider acceptance/bank rails**, not a single contract method. A combined `Claim → Send` flow requires TWO different correctly signed actions with separate status/receipts unless a verified smart-account atomic operation exists.

## 3. Real Mera EVM signer spike (strongest direct sponsor evidence)
Official repo https://github.com/category-labs/mera confirms passkey PRF accounts/signing sessions, library preview. Validate exact installed 0.2.0 exports and `@category-labs/mera/viem` interop against source/examples; SDK API examples must compile, no invented imports:
- deterministic account from existing passkey on separate browser device (verify same address, recovery, secure context and stable RP ID).
- signing session uses in-memory key material; no PRF/key logged or stored, no auto-sign after unlock, fresh explicit gesture/confirmation, minimal lifecycle. Never present signing account as cryptographically independent MFA layer.
- send a **zero-value or minimal explicitly approved** Monad Testnet EOA transaction via actual wallet interface; read chain/receipt; optionally claim FeeEscrow from that same passkey-derived address **only when a real refundable credit exists** (do not fabricate); verify `getChainId`, account and simulation. Test reject, corrupted passkey, nonce, unsynced credential, host mismatch, wrong account and interrupted signing.
- For existing launch token, the **current beneficiary** must sign to redirect FUTURE fees; no fee migration; show before/after claim balances from chain.
- Investigate typed adapter architecture (e.g. `PasskeySigningAccount` used only inside Earn protected-wallet actions, NOT global injection), support native send, ERC20 sends, FeeEscrow claim and protected-account margin only if Kuru contract identity and account/caller semantics proven.

## 4. Future ONCHAIN enforcement design review (not to deploy without approval)
Evaluate audited smart-account SDK/entrypoint support on Monad, whether `msg.sender` seen by escrow/margin is smart-account address, fee beneficiary opt-in feasibility, ERC-1271 + ERC-4337 paymaster routes, WebAuthn/P256 verification cost, transaction nonce/replay, module install/remove, trusted recovery guardians, counterfactual address and ERC-6492 if used. A passkey plus existing wallet can enforce genuine dual approval ONLY IF account/guard validates both onchain. Alternative: security policy account holding future funds; never mislead about inability to protect old EOA directly.
- Policy tampering via session keys, approval scope, smart-account upgrades and bootstrap owner must be explicitly threat-modeled.
- ON/OFF toggle cannot be disabled by attacker controlling legacy EOA alone; define 2-factor removal, cooldown/timelock and emergency recovery with independent guardian review. Otherwise policy is theater.
- Do not ship new audited-required custody/settlement contracts in hackathon speedrun; write future proposal with fee/attack surface benchmark.

## 5. Future mainnet off-ramp
Staging chain=10143: **disabled**. No bank or fiat cash-out button that can process real withdrawals. For future Monad mainnet chain=143, verify provider capabilities **at runtime** per region, asset, destination and signed quote, then enable only when official docs/agreements support actual operation. Official Ramp asset list (2026) advertises Monad mainnet MON and USDC buy/sell in some regions: https://support.rampnetwork.com/en/articles/432-what-cryptoassets-does-ramp-network-support ; https://rampnetwork.com/blog/monad-live-on-ramp-network . This does not qualify Monad TESTNET nor guarantee any specific bank account/country. MoonPay/Transak/Coinbase require independent latest verification. Model states `UNSUPPORTED_NETWORK / REGION_UNAVAILABLE / QUOTE_READY / PROVIDER_KYC / WALLET_TRANSFER_PENDING / PROVIDER_PROCESSING / PAID_OUT / FAILED`. Off-ramp transaction approvals cannot be "withdraw to bank" unless partner actually settles. Referrals require a separate funded onchain payouts primitive.

## 6. Architecture/compatibility requirements
- Preserve current v1 local strategy vault encrypted entries; do not reset RP ID or silently migrate a credential used on the judge hostname. Test stable domain/multiple domain behaviors.
- Add `apps/retro-ui/src/features/earn/withdrawal-security.tsx` and typed `apps/retro-ui/src/lib/withdrawal-security/` models behind opt-in flag. All hooks wired to real wallet source, stale chain state and current action. Do not leave protected setting in localStorage as enforcement evidence.
- Distinguish Mera passkey secret-vault decrypt from Mera passkey account signature. Backend signs nothing. No private PRF material or wallet keys transmitted.
- Never modify apps/web or deployed Factory/Kuru/FeeEscrow, never expose new endpoint that signs/sends on behalf of users.
- Every feature must use chain ID 10143 and canonical deployment manifest; reject wrong chain, wrong address and unsupported smart account in signer adapter.
- Source-driven action list before coding, do NOT refactor generic transaction pipeline blindly. Ensure claim-all per-item user authorization and gas accounting; no stale blanket authorization.
- Critical UX: show protected beneficiary and unprotected existing escrow separately; disallow claiming claims for a different `msg.sender`; never imply old EOA funds protected because future recipient is passkey-controlled.

## 7. Tests / evidence gates
**Unit:** protection-tier labels, disabled paths, account switching, wrong chain, action digest/simulation, bad passkey, cancelled step-up, replay, expired policy, no referral payouts, off-ramp testnet disabled, zero address, frozen/stale quote, errors.
**E2E:** fresh profile, two devices where real auth available, click toggle + clear disclosure, app-only bypass explained, protected beneficiary creation, standalone passkey signing in real PRF browser, claim-sheet native/ERC20, claim-all sequential, release buyback, margin withdrawal, send transfer, wallet reject and mobile. Unprotected EOA direct call test MUST succeed despite UI toggle (demonstrates honesty). Only a deployed verified policy account may be marked onchain-enforced.
**Onchain:** contract `msg.sender` beneficiary, exact claim credits, receipts, Kuru margin identity, no moved historical FeeEscrow credit on beneficiary change.
**Provider:** no fiat on testnet; mainnet provider capability evidence not confused with live integration.
**Hackathon demo:** 2 min: creator links passkey, create/derive dedicated fee account, protect FUTURE creator-fee recipient, sign a real small testnet transfer or eligible claim with Mera after unlock, show transaction receipt and explicit security labels. If signer not qualified, demonstrate safe `APP_ONLY` mode honestly and keep protected-wallet unavailable.

## 8. Sponsor/other-integration collision audit
- Kuru Consumer: existing orderbook depth + post-only and wallet-margins are independent; changing connected wallet/global EIP1193 could break orders/cancel/margin ownership. Isolate protected signer; verify account identity for all Kuru paths.
- Kuru New Assets P0: no speculative new deployment for passkey; separate authorized gate.
- Envio: radar HyperSync token-gated; no credential in VITE_*. Indexer may enrich claims history but NOT authorize withdrawals.
- CRE: simulated graduation health and proposed owner-overrides watcher can ALERT about recipient changes and blocked-like claims, **never authorize any user's claim, override signing, or gate an existing EOA's transfer**.
- MetaMask Agent: policy-limited trading plugin with wallet MFA separate from Mera; never represent MetaMask approval or agent policy as Mera onchain guard.
- Aurora: testnet bridge unsupported as documented; bank cashout is NOT Aurora bridging.
- Nansen: risk feeds/licensing/testnet blocker independent; never expose sensitive wallet linkage/enrollment to third-party analytics.
- Pinata: token logos/media storage has zero authority over financial custody.
- Referrals: attribution tracking, payout unavailable; private credential/public wallet metadata isolation.

## 9. Status / operator
**DOC-ONLY PROPOSAL; NO RUN-TIME PROTECTION ENABLED.** Must verify latest merged campaign, CRE session, Envio token rotation/qualification, passkey device and host, finance signers. Mera 0.2.0 preview. To implement real new protected recipient requires a consenting current-fee-beneficiary signature and gas; any protocol owner transaction requires separate approval. New finance contracts, service purchases, publishing plugins, or production cutover require independent operator go/no-go.

## Sources (official)
- https://github.com/category-labs/mera
- https://mera.category.xyz/concepts/passkeys-and-prf/
- https://mera.category.xyz/concepts/secret-vaults/
- https://docs.erc4337.io/core-standards/erc-4337
- https://docs.chain.link/cre/overview
- https://support.rampnetwork.com/en/articles/432-what-cryptoassets-does-ramp-network-support
- https://github.com/RetroPick/retropick-protocol/blob/main/contracts/src/v2/RetroPickFeeEscrowV2.sol
- https://github.com/RetroPick/retropick-protocol/blob/main/contracts/src/v2/RetroPickLaunchFactoryV2.sol
