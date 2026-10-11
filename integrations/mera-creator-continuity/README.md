# Mera Creator Continuity — INTEGRATION DESIGN (not implemented)
**Canonical frontend**: apps/retro-ui ONLY. **Contracts unchanged**. Source design: [../../docs/metropolis/13-CREATOR-CONTINUITY-MERA-CRE.md](../../docs/metropolis/13-CREATOR-CONTINUITY-MERA-CRE.md).

## Current primitive
Existing `apps/retro-ui/src/features/earn/strategy-vault.tsx` encrypts a local collection of strategies with Mera `@category-labs/mera` PRF and a browser-domain RP ID. This is a confidentiality vault, **not authenticated proof of prior wallet ownership**. Existing app `/r/:code` is referrals; token view is `/launchpad/token/:address`.

## MVP: wallet loss, creator fee rights continuity
1. While old/current recipient wallet is alive, **pre-enroll** by signing a domain+chain+factory+token+feeRecipient+credential public-key binding with the actual current authorized beneficiary. Server validates wallet signature and WebAuthn attestation/assertion; stores verified public enrollment + expiry and credential revocation policy. No wallet-signature proof means limited discretionary/admin review only.
2. Mera vault stores an encrypted creator recovery dossier (token, commitment, optional intended new fee wallet, supporting case metadata) without private keys.
3. New recipient wallet proves ownership via a fresh challenge. Enrolled passkey approves recovery request with verified WebAuthn signature/UV; secure backend checks nonce/replay/origin.
4. Admin makes an independent decision; current factory **onlyOwner** may propose a 3-day `setCreatorFeeRecipient`; anyone may execute the existing proposal only in subsequent 3-day window. Monitor cancel, replacement, expiry, and successful event. No trustless automatic recovery exists today.
5. Display stranded old FeeEscrow credits distinctly from migrated **future fees** and **unreleased buyback vest**. Kuru graduated fee semantics require independent inspection before promises.

## Advanced voluntary lane for new launch
Investigate official Mera passkey EVM account support, create a reproducible passkey-controlled payout wallet, have creator **explicitly select it** as factory `creatorFeeRecipient` before launch, and demonstrate same beneficiary account across synced devices. Do not change the ERC20 immutable deployer, default wallet, or claim that a passkey can restore a completely unrelated lost EOA. Needs signer, gas and browser compatibility qualification. Do not export raw signing keys.

## Agent test matrix
`existing live token with correct recipient`; initial wallet enrollment; nonce replay; forged credential; wrong RP ID/origin/UV; failed or unsynced PRF; different user's token; stale current recipient; changed wallet mid-flow; stolen signed challenge; wrong chain; overwritten admin proposal; timelock early/expired; attempted creator veto (not supported); zero address; historical escrow credits still old wallet; vest beneficiary changes; Kuru graduated route; Mera export/import; no plaintext to API/log; revocation; 3-day passage via `vm.warp` ONLY (not live).

## Stop list
- No backdoor admin signature, automatic CRE signing or DAO override.
- No user-controlled calls to `setCreatorFeeRecipient`; only real protocol owner may propose.
- No statement "recover ERC20 ownership", "recover lost wallet" or "recover prior escrow funds".
- No upgrade to existing deployed Factory/escrow and no modification to `apps/web`.
- No live transaction without explicit operator-supplied scope and authorization.

## Official docs
- https://github.com/category-labs/mera (preview SDK; supported derived accounts + secret vaults)
- https://github.com/category-labs/mera/tree/main/docs/src/content/docs/reference
- https://docs.ponsfamily.com/v2 (parallel Pons administrative community takeover; not proof of code lineage)


---
## Protected Earn linkage and important security caveat
See [Mera Protected Earn](../mera-protected-earn/README.md) and [full architecture](../../docs/metropolis/14-MERA-PROTECTED-EARN-WITHDRAWALS.md). Creator recovery is **fee recipient redirection**, NOT custody transfer of existing EOA funds or enforcement of Mera toggles on EOA. High-value preventive use case: validated separate Mera passkey-derived EVM fee recipient + opt-in on token creation/authorized self-transfer; FeeEscrow future `msg.sender` claims signed by that account. A fresh passkey WebAuthn proof can authenticate enrollment but cannot override Factory owner or recover an unlinked wallet. Old credits remain on old address. App-only confirmation must be labeled bypassable, future audited policy account not built. Future fiat off-ramp unsupported testnet.
