# Mera One Passkey Many Keys — AllInOne Agent Integration Specification
**RetroPick Metropolis 2026 | Draft plan 2026-10-11 | Deadline 2026-10-14 10:59 GMT+7**
**Eligibility:** All tracks. **Prize:** $2,500 single. **Status:** NOT IMPLEMENTED/NOT PROVEN unless evidence linked below. Read `00-MASTER-PLAN.md` and `09-AGENTS-HANDOFF.md` first.

## Product thesis
Private Strategy Vault for unpublished market research and agent risk policies. Do not add a sponsor logo without the sponsor's required working feature.

## Exact integration boundary
Inspect before editing: `apps/web/lib/live/wallet.tsx`, `apps/web/features/live/`, `new apps/web/lib/strategy-vault/ and apps/web/features/strategy-vault/`.
Current V2 is live Monad Testnet 10143, Factory→Curve→Coordinator→Kuru; `deployments/monad-testnet/v2.json` is deployment registry. Do not use obsolete Base Sepolia Go/fe-v1 as patch targets. All contract names, methods and sponsor SDK method names MUST be reverified against installed versions; do not invent API signatures.

## Sponsor eligibility and proof gate
**Mera One Passkey Many Keys** must deliver the actual integrated feature described below, not a mock. Track All tracks; prize $2,500 single. Read official bounty wording captured in user portal and recheck at submission. Demo must be on deployed Monad product, with sponsor-specific working evidence. This document is a development specification, not an eligibility certification.

## Architecture and implementation plan
Confirm actual Mera PRF API and supported synced passkeys; namespace salt by app+purpose+version (and user-bound stable identifier where appropriate); derive encryption key using documented KDF/HKDF, AES-GCM with random 96-bit nonce and AAD, store ciphertext+nonce+schema version only; encrypt private drafts and risk budgets; fresh profile/second device PRF derivation decrypts; no derived keys stored, never export wallet key; distinguish backup/sync and unsupported authenticators.

### Agent execution checklist
1. Freeze baseline: `git rev-parse HEAD`, branch and working tree; inspect source and SDK docs; write version/chain compatibility matrix.
2. Build read-only adapter first with schema validation, typed errors, idempotency key, deadline and explicit supported-network checks.
3. Implement write flow only after simulation/quote checks and signer boundary review; record exact authorization and destination.
4. Integrate behind an independent feature flag and a truthful disabled state. No secret exposed through `NEXT_PUBLIC_*`.
5. Add telemetry for request ID, chain, block, tx hash, status, duration and sanitized failure category; redact sensitive data.
6. Add unit tests, failure/retry tests, real integration smoke and Playwright/browser or CLI E2E.
7. Record sponsor evidence under `evidence/hackathon/metropolis/sponsors/03-sponsor/`; write submission answer only after proof.
8. Disable flag or revert additive integration if test gates fail; never mutate existing V2 deployment or custody.

## State machine and security requirements
Proposed feature state: DISABLED → CHECKING → READY → ACTION_PENDING → CONFIRMED, with BLOCKED, FAILED, EXPIRED and RECOVERY_REQUIRED branches. For transaction-dependent features, distinguish submitted from confirmed and reconciled. Use onchain receipts and supported sponsor APIs as authoritative. BigInt atomic amounts, bounded allowances, chain and contract allowlists, replay/idempotency protection, retry backoff and no unbounded automated trades.

### Mandatory adversarial cases
PRF unavailable; credential not synced; salt drift; AEAD auth failure; origin/RP mismatch; compromised device; ciphertext rollback/replay; no recovery on lost credential.

## Tests and acceptance
**Unit:** serialization, decimal/chain validation, stale data, state transition, wrong signature, timeout, replay, failure recovery.
**Integration:** sponsor endpoint/SDK using current pinned version, confirmed contract identity, network compatibility, provider outage.
**Onchain:** receipts and actual contract state changes where required; never represent simulated events as real transactions.
**E2E:** clean browser/profile, mobile when applicable, two-wallet flows when relevant, no inaccessible login.
**Definition of done:** Two-device same-passkey decrypt, cross-namespace isolation, wrong-key failure, zero plaintext/PRF in network/logs. Attach exact URLs/receipts, commit SHA, SDK versions, commands and outputs; fail closed if unavailable.

## Sponsor demo
Save encrypted trading thesis→new browser/device→same passkey→decrypt, 120 seconds. Sponsor-specific limit is normally <=2 minutes; MetaMask permits <=5 minutes. Do not claim a successful transaction without a receipt.

## Submission response template (fill after evidence)
"RetroPick integrates Mera One Passkey Many Keys to private strategy vault for unpublished market research and agent risk policies. The integration operates on Monad Testnet [chainId and verified contract address]. Our implementation uses [exact official SDK/API endpoint, pinned version] in [exact repo paths]. A user can [actual completed action], evidenced by [real tx hash / CLI simulation / GraphQL result]. Safety controls include [verified controls]. Current limitations: [actual limitations]."

## 30/60/90-day expansion
**30 days:** harden integration, run supervised external tester sessions and fix reliability gaps.
**60 days:** security review, observability and user cohort/market-quality analytics; expand only verified supported networks.
**90 days:** gated mainnet-readiness decision, commercial pilots and measured retention; no production release without risk/legal/operational gates.

## Rollback
Disable only this sponsor's feature flag, revert its isolated UI/adapter PR, retain historical proof and deployed contracts; never rollback V2 custody by changing onchain owner or withdrawing locked liquidity.

## Official starting points
https://mera.category.xyz/concepts/passkeys-and-prf/ and https://mera.category.xyz/concepts/secret-vaults/


---
## 2026-10-11 verified Mera SDK recipe — avoid writing custom cryptography
**FIRST-PARTY exact APIs**: https://github.com/category-labs/mera/tree/main/docs/src/content/docs/reference
`createSecretVaultWithNewPasskey`, `createSecretVaultWithExistingPasskey`, `parseSecretVault`, `decryptSecretVaultWithPasskey` from `@category-labs/mera`. Mera vaults already use AES-256-GCM, fresh random **32-byte PRF salt**, and JSON-safe `{version,credential,prfSalt,nonce,ciphertext}`. Do **not** duplicate KDF/AES implementation or re-use account seed/private key. First-party docs explicitly say vault storage, sync and recovery are application responsibilities. Library is preview; pin exact package version.

### Confirmed SDK usage (illustrative app variable values; compile against installed version)
```ts
import {
  createSecretVaultWithNewPasskey, createSecretVaultWithExistingPasskey,
  decryptSecretVaultWithPasskey, parseSecretVault,
} from "@category-labs/mera";

// On stable HTTPS app origin with a matching rpId; never use a changing Vercel preview
const rpId = "YOUR_STABLE_RP_ID";
const secret = new TextEncoder().encode(JSON.stringify({version:1,purpose:"retropick.private-strategy",riskBudget:"..."}));
try {
  const vault = await createSecretVaultWithNewPasskey({
    rp:{id:rpId,name:"RetroPick Strategy Vault"},
    user:{name:"your-user-id",displayName:"RetroPick user"},
    secret,
  });
  // store vault JSON only in per-user ciphertext storage; never store secret
  const storedJson = JSON.stringify(vault);
  const parsed = parseSecretVault(storedJson);
  const plain = await decryptSecretVaultWithPasskey({rpId,vault:parsed});
  try { /* parse and use strategy briefly in memory, not logs */ }
  finally {plain.fill(0)}
} finally {secret.fill(0)}
```
For additional secret under SAME passkey, use `createSecretVaultWithExistingPasskey({rpId,credential:existing.credential,secret})`. Each call has a fresh random salt, so distinct vaults remain independently encrypted. Treat purpose/version inside encrypted structured payload as authenticated data, and/or derive separate stable namespaces only through a reviewed Mera-approved API.

### Implementation
```
apps/web/lib/integrations/mera/secret-vault.ts
apps/web/features/private-strategy/vault-panel.tsx
apps/web/features/private-strategy/strategy-schema.ts
(optional) apps/web/app/api/private-vault/route.ts  # ciphertext only; auth+access control required
```
A **non-wallet** benefit is essential: encrypted draft market thesis, private watchlists, agent execution limits, backtest recipe. User controls which data is revealed for an agent action; no automatic sharing of plaintext across network.

### Runtime blockers, recovery, security
- WebAuthn RP ID binds a passkey to a domain. Localhost, `retropick-metropolis.vercel.app`, another production domain, and random preview domains are not automatically interchangeable. Record canonical RP ID BEFORE creating passkeys.
- PRF requires authenticators with PRF support; synced credential and PRF portability must be proven on two real devices/fresh profile, not assumed from docs. Handle `PRF_UNAVAILABLE`, `PASSKEY_OPERATION_FAILED`, `CRYPTO_UNAVAILABLE`, `VAULT_FORMAT_INVALID`, `DECRYPT_FAILED` with explicit recovery guidance.
- Passkey lost + ciphertext only = potential permanent vault loss. Offer user export of ciphertext and separate optional recovery strategy; do not promise access after losing all passkeys.
- Device compromise, XSS, malicious extensions, rollback to old ciphertext, untrusted JSON and lost-key risks remain. Enforce CSP, size limits, request nonce/revision, browser secure context and user re-verification. Avoid `localStorage` plaintext; encrypted localStorage is acceptable for a small demo but is **not multi-device sync**.
- Separate from `apps/web/lib/live/wallet.tsx`: user wallet remains existing EIP-1193 flow. Avoid changing global auth to satisfy this non-wallet bounty.

### Sponsor-winning innovation — **Confidential Trader Intent**
Show a creator write a trading thesis with a private budget, save only ciphertext, reopen via passkey on another compatible synced device, then selectively reveal one bounded risk rule to a trading assistant. Demonstrate wrong-device refusal, vault tamper rejection, no key storage and reproducible recovery. This proves *many keys* beyond wallet login, and makes a real privacy feature useful for market makers.


---
## 2026-10-11 CORRECTION: Creator Continuity supersedes note-only Mera feature priority
Canonical frontend is **apps/retro-ui**, NEVER apps/web. The earlier examples pointing to apps/web are historical and not actionable. Existing deployed Mera vault is implemented in apps/retro-ui/src/features/earn/strategy-vault.tsx and src/lib/vault/strategy-vault.ts; user demonstrated passkey unlock but not wallet recovery, public credential enrollment or cross-device restore. Read [Creator Continuity](13-CREATOR-CONTINUITY-MERA-CRE.md) and [integration guide](../../integrations/mera-creator-continuity/README.md) for the full architecture, exact contract rights, cases, tests and agent work plan.

**Why this is stronger:** Existing Factory V2 transfers only creator-fee-recipient rights. Existing recipient may directly hand off; factory owner may propose override after 3-day delay and anyone may execute during next 3 days. This does not restore EOA signing authority, ERC20 token admin rights, immutable deployer reference, or already-credited FeeEscrow liabilities. Pons docs describe a similar administrative CTO rather than token ownership.

**Two paths:** (A) NEW launch: independently investigate official Mera passkey-derived EVM account recovery and let creators explicitly set a proven restorable fee wallet as TokenParams.creatorFeeRecipient. Needs signing+gas+two-device evidence and no private-key leakage; current vault alone does not support this. (B) EXISTING launch: pre-enroll while current authorized beneficiary wallet is available, using current-wallet signed, domain+chain+factory+token+credential-key-bound nonce and authenticated WebAuthn credential; Mera protects confidential case bundle. Later same passkey + new wallet can request review, but only independent owner can initiate the timelocked contract override. A PRF secret or vault unlock alone is never historical EOA ownership proof. No pre-enrollment means only discretionary weaker admin/social verification.

**User experience:** Earn > Created > Creator Continuity shows original deployer vs current fee beneficiary, recovered future flows vs stranded historical escrow and unreleased vest, stable RP ID, pending timelock, admin change warnings. Test wrong original account, wrong RP/UV, nonce replay, address change, forged case, expired/cancelled/replaced proposal, Kuru graduated venue fee path, and cryptographic salt separation. /r/:code is referrals, NOT recovery. Testnet owner writes require explicit authorization; Foundry time warp is simulated. No changes to deployed V2.


---
## 2026-10-11 NEW requirement: Protected Earn is now the priority alongside Creator Continuity
Read [14-MERA-PROTECTED-EARN-WITHDRAWALS.md](14-MERA-PROTECTED-EARN-WITHDRAWALS.md), [the Mera Protected Earn integration](../../integrations/mera-protected-earn/README.md), and [ZCode execution prompt](15-ZCODE-MERA-PROTECTED-EARN-EXECUTION-PROMPT.md).

**Purpose:** Operator requests opt-in "Require Mera Passkey" under **Earn → Available to claim** covering creator-fee claims (native MON and ERC20), sequential claim all, buyback release, Kuru margin withdrawals, send MON/ERC20 and eventually compliant fiat cashout. **Critical clarification:** existing `@category-labs/mera` 0.2.0 **strategy vault encrypts non-financial data, not authorizes tx**; existing FeeEscrow `claim()` and `claimToken()` are permissionless to the authenticated `msg.sender` account holder. A frontend toggle can be bypassed by any holder of the existing EOA private key using other apps. It is NOT an onchain security layer. `APP_ONLY` option must be labeled as such, default off, with explicit risk disclosure.

**Real Mera winning feature:** Validate official Mera passkey-derived EVM account/signing session against exact installed SDK version and stable RP ID; **use separate passkey-account as an opt-in creator-fee recipient for FUTURE fees**, or current recipient voluntarily signs factory fee-recipient transfer. The passkey-derived EOA signs as `msg.sender` to claim its own fees; no arbitrary loss/reassignment of old escrow credits, no magical 2FA on an old EOA. For enforced ON/OFF dual authorization on existing EOA, future independently reviewed smart account/policy validator and custody migration required; no unapproved financial contract in hackathon scope. A passkey EOA has single signing authority derived from credential, not a second independent factor. No autoplay financial signing after vault decrypt.

**Coverage:** FeeEscrow native/ERC20 claim, buyback release followed by separate claim, Kuru margin withdrawal only for margin account actual owner, direct Send transfer from actual signing address. Referral **payout unavailable** (`REFERRAL_PAYOUT_REQUIRES_PROTOCOL_CHANGE=TRUE`), though attribution works; Monad Testnet 10143 **all fiat off-ramps disabled**, so do not imply possible cashout. Future Monad mainnet Ramp MON/USDC availability is conditional per region/provider and is not an integrated cashout in this build.

**Verification:** Fresh device/synced passkey deterministic account; PRF and EVM signer no secret persistence; explicit signed minimal testnet tx receipt; correct fee beneficiary onchain; 2-device recovery; claim only credited `msg.sender`; no EOA bypass claim. Preserve current encrypted vault and RP ID, all existing claims, and **never modify apps/web**.
