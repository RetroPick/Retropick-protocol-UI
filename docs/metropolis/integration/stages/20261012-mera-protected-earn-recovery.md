# Mera Protected Earn recovery — 2026-10-13

Reviewed code: `695ae7764f72cb0fb5cfee5af205fc2975bcd32f`. Status: **IMPLEMENTED / LOCAL FAILURE-STATE VERIFIED; REAL PRF HARDWARE AND FINANCIAL RECEIPTS PENDING**. Existing encrypted Strategy Vault semantics are preserved.

## Implemented behavior

`apps/retro-ui/src/lib/mera-signer/` and `features/earn/protected-earn.tsx` implement consented enrollment/recovery with a stable versioned derivation salt. Public credential ID, derived address, RP ID, chain 10143, versions and associated creator wallet are stored; PRF/private key material is transient. Credential identity and recovered address are explicitly checked. Mera 0.2 does not itself enforce equality between the supplied allowCredential ID and returned credential ID; the integration therefore checks it. Session cleanup runs on failure and success.

NONE remains the default. APP_ONLY requires a fresh passkey proof for each prepared Earn action, binding chain/account, ABI calldata hash, value, asset, destination, amount, nonce, expiry and RP. It is bypassable by direct EOA calls outside this app. ONCHAIN_POLICY is unavailable. Independent protected-wallet execution signs with the isolated passkey-derived account, which must own the relevant funds; it never changes the connected wallet's account. Fresh SDK reads revalidate credits/amounts before and after the ceremony, and the transaction pipeline rechecks account, chain, gas and context before signing.

Creator discovery uses paginated creator-filtered indexer rows plus verified manual token import. Current fee recipient is read from chain and remains distinct from immutable creator/deployer. Active pending-owner overrides block handoff. A wallet-signed reviewed handoff changes future fee rights only; historical escrow credits stay with the original recipient. Protected wallet gas, native/ERC-20 credits and Kuru margin are displayed separately from connected-wallet funds. Native/ERC-20 claims, send, buyback release and margin withdrawal require fresh proof and receipt-based completion. Claim-all cannot silently reuse proof and stops on failure or account change.

## Evidence and limitations

Negative unit tests cover wrong credential/address/RP, expiry/replay, calldata/value/amount substitution, NONE without PRF, session cleanup and changed credits. Six dedicated authorization tests pass, alongside the Mera/protection suites. Live-component fixtures cover real UI enrollment/reload/recovery, APP_ONLY selection, creator handoff review and insufficient protected-wallet gas on desktop/mobile. Screenshots and logs: [recovery evidence](../../../../evidence/platform/frontend/p0-recovery-20261013/). Fixture WebAuthn credentials and RPC are simulated; no test is evidence of actual hardware PRF support or a mined financial transaction.

Operator acceptance remains required on the stable HTTPS staging RP: create/recover with a PRF-capable authenticator, compare the address after reload, then separately authorize an exact low-value testnet handoff or protected-account action. Record chain, token, current recipient, protected address, destination, amount/value, gas funding, calldata and receipt. Confirm post-receipt beneficiary and historical-credit separation. A registered passkey without PRF support does not qualify recovery. Referral payout and bank off-ramp stay unavailable; no smart-account enforcement, mainnet or sponsor Gate E qualification is claimed.

## Capability matrix

| Capability | UI and execution wired | Local evidence | Real-chain / hardware acceptance |
|---|---|---|---|
| NONE | Default; no passkey step | Unit and fixture verified | Existing EOA financial pipeline; no new receipt in this recovery |
| APP_ONLY | Per-action fresh proof; bypassable outside app | Identity, binding, replay, expiry and failure cases verified | Actual PRF-compatible authenticator ceremony pending |
| PASSKEY_SIGNER enrollment/recovery | Versioned registration and recovered-address validation | Desktop/mobile reload/recovery fixtures and signer unit tests | Real secure-origin same-credential PRF continuity pending |
| Creator fee-recipient handoff | Paginated discovery, onchain authority checks, review and receipt/reread path | SDK authority/pending-owner tests and unsent UI review fixtures | No new handoff receipt or protected beneficiary rights asserted |
| Protected claim/send/release/margin withdrawal | Isolated Mera account; fresh preparation, simulation, gas and context guards | Local signing/binding and insufficient-gas failure evidence | Funded protected-account financial receipts pending |
| ONCHAIN_POLICY | Unavailable; cannot select | Disabled control verified | No smart-account deployment or enforcement |
| Strategy Vault | Existing encrypted-data path preserved | Existing vault regression suite | Does not grant spending authority |

PASSKEY_SIGNER is at local derivation/signing integration tier; live beneficiary control and claims remain unqualified. Public HTTPS RP ID: `retropick-metropolis-retro-ui-stagi.vercel.app`; Mera SDK: `@category-labs/mera@0.2.0`. Browser fixture RP differs (`127.0.0.1`) and is intentionally not claimed as production credential continuity.
