# 2026-10-12 — Mera signer compatibility + Protected Earn / Creator Continuity

| Field | Value |
|---|---|
| Lane | L3 Mera (sponsor: "One Passkey, Many Keys") |
| Branch / PR | `feat/metropolis-mera-signer` |
| SDK | `@category-labs/mera` 0.2.0 (vault + signer), `viem` 2.57.4 |
| Status | **TESTED_LOCAL + signer SOURCE/UNIT verified** — real browser ceremony + any broadcast are operator-gated |

## Signer compatibility (proven, not assumed)

The installed SDK's actual exports (verified against `dist/*.d.ts`) differ from the handoff's
assumption — `toViemAccount` is **not** on the index export; it is the `@category-labs/mera/viem`
subpath. The real chain:

```
getPasskeyPrfOutput({ rpId, credential?, prfSalt })  → { credentialId, prfOutput: 32 bytes }
createSecp256k1SigningSession({ privateKey: prfOutput }) → session { publicKey(65b), signDigest, end() }
getEvmAddress(session.publicKey)                     → 0x… address
toViemAccount(session)  (from "@category-labs/mera/viem") → viem LocalAccount<"mera">
```

Adapter `apps/retro-ui/src/lib/mera-signer/signer.ts`:
- PRF output IS the secp256k1 scalar; held only to open the session, then `prfOutput.fill(0)`.
- Signer uses a **distinct 32-byte PRF salt** (`SHA-256('retropick/mera-evm-signer/v1')`) so the EVM
  key is independent of the strategy-vault encryption key on the same passkey. (WebAuthn PRF salts
  must be exactly 32 bytes — a plain label string is rejected `PRF salt must be 32 bytes`.)
- Every session ends in a `finally` (`withSigner`/`deriveSignerIdentity`/`withViemAccount`); the
  session never escapes scope.
- Returns only the address + credentialId — never key material.
- Signature shape is `{ compact: 64 bytes, recovery: 0|1 }` (not r/s/recoveryId).
- Stable RP ID = current host (same rule as the vault), so a vault passkey is reusable.

Unit tests `tests/mera-signer.test.mjs` (6/6, injected WebAuthn client for determinism):
derivation matches the raw SDK chain; same passkey → same address (lock/unlock stable); a local
ECDSA signature recovers to the derived address via viem `recoverAddress`; a viem account's
`signMessage` recovers to the same address; a different PRF → different address; a cancelled
ceremony throws (no silent empty signer).

## Protected Earn — truthful modes

`src/lib/mera-signer/protection.ts` + `src/features/earn/protected-earn.tsx` (new Earn "Protection"
tab, live mode only; demo shows a live-only note). Four honest modes:

| Mode | Bypassable | Honest label |
|---|---|---|
| NONE | yes | wallet signing only |
| APP_ONLY | **yes** | "Passkey confirmation in RetroPick only — NOT an onchain lock … bypassable by anyone holding your wallet key." Friction, not custody. |
| PASSKEY_SIGNER | no | the FeeEscrow beneficiary / signing identity IS an independent passkey-derived wallet; original balances stay separate |
| ONCHAIN_POLICY | — | **NOT DEPLOYED**; shown for honesty (only an audited onchain module makes a lock truly unbypassable) |

App-level confirmation (`ActionIntent` → `intentDigest`) binds chain / account / action / asset /
destination / amount / **calldata-shape hash** / nonce / expiry; single-use; expiry-checked. Unit
tests `tests/protection.test.mjs` (5/5): every field binds, replay rejected, wrong digest + expiry
rejected, mode labels honest, nonce random.

## Creator Continuity (no owner takeover)

- SDK `prepareTransferCreatorFeeRecipient(token, account, newRecipient)` (new) uses the REAL
  `factoryAbi.transferCreatorFeeRecipient(token,newRecipient)` and previews preconditions:
  caller == current `getLaunchedToken(token).creatorFeeRecipient`; redirects **future** fees only;
  immutable `deployer` attribution unchanged; escrowed credits stay with the original recipient.
- The panel PREPARES (never broadcasts) this handoff to the derived protected wallet and shows the
  prepared call + checks. Broadcasting is a separate, explicitly-authorised step.
- Owner-administered override (`setCreatorFeeRecipient` + `CREATOR_FEE_RECIPIENT_TIMELOCK` +
  `executeCreatorFeeRecipientChange`) is acknowledged in copy as a transparent security assumption;
  the agent never calls it.

## Factory creator-fee topology (confirmed in ABI)

`transferCreatorFeeRecipient(token,newRecipient)` (recipient, immediate) · `setCreatorFeeRecipient`
(owner, proposes) · `pendingCreatorFeeRecipient(token)→{newRecipient,effectiveAt,expiresAt}` ·
`executeCreatorFeeRecipientChange` / `cancelCreatorFeeRecipientChange` · constants
`CREATOR_FEE_RECIPIENT_TIMELOCK`, `CREATOR_FEE_RECIPIENT_EXECUTION_WINDOW` · events
`CreatorFeeRecipientChangeProposed/Cancelled/Updated` · `getLaunchedToken(token).{deployer,creatorFeeRecipient}`.

## Vault preservation

The strategy vault (`src/lib/vault/strategy-vault.ts`, storage key `retropick.strategy-vault.v1`)
is untouched. The signer uses a separate module and a distinct PRF salt — no shared storage keys,
no change to vault ciphertext/schema/RP ID. Vault unit tests still 7/7.

## Mera financial-authority table

| Capability | Status | Who signs | Notes |
|---|---|---|---|
| Passkey → EVM signer (reproducible address) | **verified (unit)** | passkey | real browser ceremony = operator evidence |
| Local message/digest signature | **verified (unit)** | passkey | recovers to derived address; no broadcast |
| Native/ERC-20 creator-fee claim | existing (unchanged) | connected EOA | not re-signed by passkey |
| transferCreatorFeeRecipient (future fees) | **prepared, not sent** | current recipient EOA | operator/tx-specific approval to broadcast |
| Owner timelock override | acknowledged only | Factory owner | agent never calls |
| Referral payouts | not deployed | — | attribution only |
| Bank/off-ramp | unavailable on testnet | — | — |

## Operator action — real passkey ceremony (evidence)

On the staging host `https://retropick-metropolis-retro-ui-stagi.vercel.app` → Earn → Protection:
1. "Derive protected wallet" → complete the passkey (PRF) ceremony → note the address.
2. Lock/reload, derive again → same address (screenshot the two).
3. (Optional) enter a launch token you own as current recipient → "Prepare handoff" → screenshot the
   prepared `transferCreatorFeeRecipient(…)` + checks (NOT broadcast).
No broadcast is performed without separate transaction authorisation.

## Next lane

MetaMask Agent plugin diagnostics + approval packet (`20261012-metamask-agent.md`).
