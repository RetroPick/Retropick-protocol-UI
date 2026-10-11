# Creator Continuity: Mera × RetroPick Recovery × Chainlink CRE (2026-10-11)
**Status: VERIFIED SOURCE ANALYSIS + PROPOSED DESIGN. NOT IMPLEMENTED.** Read this BEFORE changing contract/CRE/Mera integration. Deadline Oct 14, 2026 10:59 WIB (recheck portal). Canonical frontend **apps/retro-ui ONLY**; **apps/web is read-only/untouchable**. Existing V2 deployment must NOT change.

## Critical findings: name the right rights
- `RetroPickLauncherTokenV2.sol`: fixed-supply ERC20; `deployer` immutable **attribution**, expressly **does not confer privileges**. A launched ERC20 has no transferable "token owner" function. Lost private key, token balance, and already credited escrow balances are not recovered.
- `RetroPickLaunchFactoryV2.sol` lines ~824-960: `transferCreatorFeeRecipient(token,newRecipient)` only current creator fee recipient, immediate; `setCreatorFeeRecipient(token,newRecipient)` protocol **onlyOwner** schedules 3-day timelock; `executeCreatorFeeRecipientChange(token)` permissionless within next 3-day execution window; `cancelCreatorFeeRecipientChange(token)` onlyOwner. Admin may redirect ANY launch; NOT restricted to proven loss, and current recipient cannot veto by transferring during the pending override. New proposals supersede prior ones and reset clock. Events: `CreatorFeeRecipientChangeProposed`, `CreatorFeeRecipientChangeCancelled`, `CreatorFeeRecipientUpdated`.
- `_setCreatorFeeRecipient` changes factory beneficiary, forwards to *pre-graduation curve* or *post-graduation Uniswap V4 hook*, and to `RetroPickBuybackVaultV2.updateCreatorRecipient` for **unreleased** vesting. **KURU SPECIAL WARNING:** post-graduation venue==KURU takes the `else` and forwards to **curve**, not Kuru market. Kuru has a different fee/execution topology; audit the real revenue stream before claiming migrated post-graduation Kuru creator fees. Do not assume Kuru orders pay RetroPick's V4 creator hook tax.
- `RetroPickFeeEscrowV2.sol`: `balanceOf[recipient]`, `balanceOfToken[recipient][asset]`, `claim()`, `claimToken()` all keyed to `msg.sender`. Already credited old-wallet liabilities are NOT reassigned by factory takeover. No `claimFor(oldWallet)` or ledger migration. Explicitly show any stranded balances.
- `RetroPickBuybackVaultV2.release` may only be triggered by current creator recipient or protocol beneficiary; unreleased vest beneficiary updates, released escrow credit does not.
- `apps/retro-ui/src/routes.tsx`: **/r/:code is a REFERRAL redirect**, never token ownership/recovery. User URL `/r/0x101212c52620ca00540ee04d1515e714e6368fcd` represents referral attribution. The same address is test actor B in `deployments/monad-testnet/v2.json`. Real token detail route is `/launchpad/token/:address`. Do not use /r for recovery. External live-page HTML was not validated through automated fetch.
- The Pons family CTO model is similar: official https://docs.ponsfamily.com/v2 and https://docs.ponsfamily.com/ describe voluntary fee handoff and administratively reviewed 3-day takeover; that docs also state token and locked liquidity unaffected. Similarity **does not establish a code fork or prove rights to historical claims**.

## Product recommendation — Creator Continuity, not fake self-service ownership restoration
Give launch creators durable control of **future creator-fee routing** and a transparent way to prove a pre-enrolled passkey, request an override if they lose their original wallet, and track the 3-day window. Passkey possession alone does not satisfy current factory authorization. CRE can independently produce read-only integrity reports and alerts; it cannot authorize the protocol-owner call.

### Two distinct recovery lanes
**Lane A: preventive, strongest UX for NEW launches (investigate separately, no automatic rollout).**
1. User enrolls a Mera passkey account or independent passkey-governed payout address **before** launch, using official Mera account APIs (Mera supports account derivation; existing RetroPick integration only uses secret vaults). Confirm package version, supported EVM signer adapter, stable RP ID, derivation/recovery reproducibility across devices, account gas, security and portability. No invented method signatures.
2. User explicitly chooses the **passkey-recoverable address as `creatorFeeRecipient`** at launch (wallet-deployer still sends launch transaction); verify launch wizard supports this exact nonzero field and factory launch record reflects it. Distinguish launch actor/deployer from fee beneficiary in Earn/Created.
3. If initiating launch EOA later disappears, the beneficiary account remains passkey-accessible *only if it was independently configured and recovered correctly*. It can claim fee escrow addressed to itself and self-transfer the fee recipient, subject to its actual EVM signing support, gas and deployed contract permissions.
4. Do NOT auto-export derived private keys or seed phrases; Mera account recovery security and synced authenticator limits are crucial. Explicit opt-in and risk disclosure; sponsor demo may remain a feature spike if package APIs not qualified.

**Lane B: EXISTING tokens whose creator wallet is gone (fastest hackathon feature).**
1. Pre-loss enrollment: while original creator wallet still works, sign a challenge bound to `{chainId:10143,factory,token,originalCreatorFeeRecipient,credentialPublicKeyHash,nonce,expiresAt,purpose,appOrigin}`; verify EIP-191/EIP-712 against the **currently authorized fee recipient**, not immutable token.deployer. Independently register WebAuthn credential ID/public-key identity with full RP ID, origin, UV and challenge verification, nonces/revocation, account binding and collision prevention. Never use credential ID or client PRF value alone as authority. Store only necessary public metadata / commitment; preferably use a signed, tamper-evident enrollment record, not mutable localStorage alone.
2. Store creator's encrypted recovery bundle using **Mera secret vault** (`createSecretVaultWithNewPasskey`, `createSecretVaultWithExistingPasskey`, `parseSecretVault`, `decryptSecretVaultWithPasskey`); bundle includes token/factory, wallet proofs, intended recovery beneficiary, verification/revocation instructions, case references, optional backups. The crypto protects confidentiality; identity proof comes from authenticated WebAuthn assertions and existing wallet pre-enrollment.
3. If old wallet lost: user authenticates with enrolled passkey and authorizes a fresh **nonce-, domain-, chain-, factory-, token-, oldRecipient-, newRecipient- and expiry-bound** recovery request. Verify server-side WebAuthn signature, UV/origin/RP ID, enrollment and replay. Distinguish claim that user CONTROLS the enrolled credential from evidence of wallet linkage at registration; **no previously enrolled credential -> no cryptographic wallet-ownership proof**. New wallet proves possession separately by signing its own challenge. No raw PRF outputs, seed phrases, decrypted content or bearer token in public case record.
4. Admin independently reviews; malicious-compromise, sold launch, estate, community CTO and lost-key are **different policies** requiring distinct evidence and escalation. Evidence is not infallible; guardian custody, impersonation, compromised passkey and admin collusion remain risks. Existing factory owner has broad override authority; make risk visible to holders. Do not promise automatic or trustless recovery.
5. Owner explicitly signs `setCreatorFeeRecipient(token,newRecipient)`; project surface shows `PENDING` for 3 days with transparency, notifications and possible admin cancellation. Any actor can call `executeCreatorFeeRecipientChange` between effectiveAt and expiresAt only after new chain read. Admin may cancel, or proposal expires. Race: owner's pending override supersedes independent old-recipient transfer; make that clear, don't invent an onchain creator-veto.
6. On final receipt, re-read `getLaunchedToken`, pending change, curve/hook/vest records and escrow credits; record which **future streams** moved and which old-wallet escrow liabilities remain inaccessible. For a Kuru graduated token verify venue behavior separately, and do not claim recovered future Kuru fees without a tested income path.

### Threat model / explicit STOP conditions
- **Passkey != wallet private key:** PRF-derived encryption key is neither a wallet-recovery key for the old EOA nor a signer for the deployed Factory owner. Authentication capability from public-key WebAuthn signature requires actual enrollment and correct verifier. Current vault does not register such proof.
- Registration after original wallet is irrevocably lost cannot retrospectively prove ownership. Admin/manual social verification may be possible but is weaker and should be labeled discretionary.
- EIP-712 chain replay, copied enrollment between launches, wrong signer, phishing/squatting domain, changed RP ID, credential clone, unsynced passkey, nonce replay, stolen export, stale indexer, front-running, malicious protocol owner, wrong beneficiary, zero-address and accidental admin override.
- Timelock is real calendar time. Do not claim an Oct 11 request is onchain *executed* by Oct 14 unless chain timestamp actually passes + tx exists. Test via local Foundry `vm.warp`, clearly labeled simulated.
- No automatic factory admin sign/execute by CRE; CRE never receives Factory owner key. No change to V2 deployed contract or old FeeEscrow liabilities without separately authorized audited migration (outside hackathon scope).
- The simplest MVP is **non-custodial passkey-bound recovery eligibility + request case + read-only timelock tracker**, not unattended transfer or an assertion that creator wallet is restored.

## CRE for a launchpad — ranked options
| Rank | Feature | Actual current primitive | Innovation / sponsor proof | Deployment limits |
|---|---|---|---|---|
| P0 | **Creator Continuity Watch** | `pendingCreatorFeeRecipient`, change events, `getLaunchedToken`, external verified enrollment case status | CRE checks chain proposal vs recorded authorized request and publishes `ALIGNED / MISMATCH / PENDING / EXPIRED / INCOMPLETE`, source block, replay-resistant report | Read-only; offchain case record is NOT oracle truth of ownership; alerts do not block admin tx |
| P0 | **Graduation Health** (EXISTS) | `integrations/chainlink-cre/graduation-safety/main.ts` Cron → chain ledger & receipt, Sourcify HTTP, deterministic report | Qualify existing real official simulation first. Extend report/UI only if it adds useful insight | Not yet onchain CRE write; simulated only until deploy authorization |
| P1 | **Creator Revenue Continuity Auditor** | Factory beneficiary, pre-grad curve, buyback vault, fee escrow | Tracks claimable under old/new wallet, unreleased vest vs already-escrowed amounts, flags stranded assets; meaningful Earn/Created UX | Kuru-specific fee topology not established; no automatic sweeping/claims |
| P1 | **Graduation-to-first-execution safety** | coordinator receipt, Kuru orderbook market activity, Envio / external authenticated metrics | Detects deployed market but zero executable liquidity or delayed first trade; maker-ready status | Need actual Kuru data provenance + freshness, no fictional spreads |
| P2 | **P0 outcome resolution evidence** | prediction market research kernels and approved resolution spec | multi-source deterministic evidence & conflict report | No production oracle write; no unsanctioned resolution/settlement |
| P2 | **Creator/fee anomaly attestation** | fee policy snapshot, chain curve/hook, escrow, external source | highlights unexpected fee recipient, fee movements, configuration mismatch | No ability to veto or quarantine existing factory owner behavior |

CRE official sources: https://docs.chain.link/cre/overview (triggers: Cron, HTTP, EVM log; chain reads, HTTP, BFT consensus); https://docs.chain.link/cre/getting-started/overview ; https://docs.chain.link/cre/guides/operations/deploying-workflows (deployment approval needed, simulations available to logged-in users). Prior chain-10143 simulation support: https://docs.chain.link/changelog/cre-cli-v1-30-0--new-testnet-support-for-simulation-09dd0 . Version must be verified against installed `cre --version` and `@chainlink/cre-sdk` types. Actual code currently uses `CronCapability`, `EVMClient`, `HTTPClient`, `consensusIdenticalAggregation` and read-only return report; **no log-trigger or HTTP-handler implemented yet**.

## Delivery architecture (proposed, not present)
```
apps/retro-ui/src/features/earn/strategy-vault.tsx   [extend safely, preserve v1 encrypted entries]
apps/retro-ui/src/features/earn/creator-continuity.tsx [new; recoverable-rights explanation]
apps/retro-ui/src/lib/creator-continuity/{schema,read-model,enrollment,request}.ts [new]
apps/retro-ui/src/lib/vault/strategy-vault.ts       [current Mera vault; no EOA secret export]
apps/referral-service/                             [DO NOT hijack auth; separate backend or isolated namespaced route]
integrations/mera-creator-continuity/README.md     [non-implemented integration spec]
integrations/chainlink-cre/graduation-safety/       [EXISTING, run simulation first]
integrations/chainlink-cre/creator-continuity/     [NEW proposed independent CRE workflow]
docs/metropolis/03-MERA-PRF-ALLINONE.md
docs/metropolis/07-CHAINLINK-CRE-ALLINONE.md
```
Service endpoints require authenticated API, replay-resistant WebAuthn challenges and authorization, encrypted storage only if sync selected. Avoid placing recovery claims or credential IDs in public backend logs. Never require privileged admin endpoint for ordinary users.

## State machine (do not collapse)
```
NOT_ENROLLED -> ENROLLING_WALLET -> ENROLLING_PASSKEY -> ACTIVE
ACTIVE -> REQUESTED -> WEB_AUTHN_VERIFIED -> ADMIN_REVIEW -> REJECTED | PROPOSED_ONCHAIN
PROPOSED_ONCHAIN -> WAITING_3_DAYS -> EXECUTABLE_3_DAY_WINDOW -> CONFIRMED
                 \-> OWNER_CANCELLED | EXPIRED | REPLACED_BY_NEW_PROPOSAL
CONFIRMED -> RECONCILING_FUTURE_STREAMS -> PARTIAL_RECOVERY | VERIFIED_REDIRECT
```
Distinguish `WALLET_RECOVERED` **(NOT SUPPORTED)** from `FUTURE_CREATOR_FEE_RECIPIENT_REDIRECTED`.

## Required demo and proof
1. Current recognized creator signs binding, passkey enrolled, encrypted export created; record EIP-191/EIP-712 typed challenge and server-verified WebAuthn result without disclosing secret. For test wallets only.
2. User loses access to simulated old wallet, uses synced passkey and new wallet to submit a recoverable case.
3. CRE existing graduation workflow succeeds on **actual official simulator** (separate proven branch), then CRE recovery watcher compares *real onchain pending view* and a verified external case, showing **PENDING/ALIGNED** or explicit no-pending result; negative wrong-recipient and stale-case fail. Can use local fork time travel for 3-day expiry; label fork simulation. **Never broadcast an owner override without explicit user approval.**
4. Visual proof: earn/created token view shows who receives FUTURE fees, owner proposal timelock, unreleased vest and inaccessible old escrow claims. Browser Playwright mobile, security, recovery, stale data and RP ID tests.
5. Upstream SDK installed versions, real source URLs, commit, receipts, sanitized CRE simulation trace, screenshots and honest `QUALIFIED / CONDITIONAL / BLOCKED` verdict.

## Recommended 72h-relative priority
P0 immediately: qualify CRE current simulation (user already completed `cre login`), investigate Kuru recipient semantics & enrollment design, implement truthful read-only creator recovery preview. P1: new Mera passkey enrollment and request evidence, positive + negative credential ceremonies. P2 only if time: CRE second watcher simulation and full frontend case flow. No 3-day live execution before hackathon implied.

## Operator decisions
Choose stable HTTPS RP ID; agree recovery admin evidence standards/appeal policy; confirm signer admin **only for testnet owner write** after independent review; never give owner key to agent/CRE. Choose whether new launches may opt into Mera-controlled fee wallets (requires full signer + recovery testing). No mainnet or unaudited contract modifications.

## Verified / source links
- https://github.com/RetroPick/retropick-protocol/blob/main/contracts/src/v2/RetroPickLaunchFactoryV2.sol
- https://github.com/RetroPick/retropick-protocol/blob/main/contracts/src/v2/RetroPickLauncherTokenV2.sol
- https://github.com/RetroPick/retropick-protocol/blob/main/contracts/src/v2/RetroPickFeeEscrowV2.sol
- https://github.com/RetroPick/retropick-protocol/blob/main/contracts/src/v2/RetroPickBuybackVaultV2.sol
- https://github.com/RetroPick/retropick-protocol/blob/main/apps/retro-ui/src/routes.tsx
- https://github.com/category-labs/mera
- https://github.com/category-labs/mera/tree/main/docs/src/content/docs/reference
- https://docs.ponsfamily.com/v2
- https://docs.chain.link/cre/overview
- https://docs.chain.link/cre/guides/operations/deploying-workflows


---
## 2026-10-11 Extension: Creator continuity is strongest when paired with passkey-controlled fee EOA
NEW companion [14 Protected Earn](14-MERA-PROTECTED-EARN-WITHDRAWALS.md) and [integration README](../../integrations/mera-protected-earn/README.md). The first recovery spec protects **rights to future creator fees**; the second protects the actual **signing account used to claim those fees**. A passkey vault is not a withdrawal authorization verifier. Existing EOA cannot be locked by a browser toggle. Correct combined lifecycle: create/restorable Mera EVM signer → explicitly opt into beneficiary at launch or self-transfer with old beneficiary signature → accrue future FeeEscrow credits under that signer → passkey-authenticated signing session signs onchain `claim` for its own address → user optionally sends funds elsewhere in second signed operation. Historic credits remain under original wallet, as do its private EOA holdings and margin. Protocol owner timelock is separate recovery mechanism; no override by passkey. Future bank off-ramp only if provider/mainnet qualified, unavailable testnet. Proof source: exact Mera SDK signer 0.2.0 API, EVM tx receipt, same derived address on second supported device, no secret leakage. Never claim independent 2FA or smart-account enforced ON/OFF unless actual verified validation contract exists. Canonical UI apps/retro-ui; never apps/web.
