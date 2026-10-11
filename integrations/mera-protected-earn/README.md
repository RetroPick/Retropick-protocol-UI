# Mera × Protected Earn — source-grounded implementation README
**Status: DESIGN ONLY; NOT PROTECTED / NOT IMPLEMENTED.** Canonical UI `apps/retro-ui` ONLY, never `apps/web`.
Master architecture: [Protected Earn and Withdrawals](../../docs/metropolis/14-MERA-PROTECTED-EARN-WITHDRAWALS.md). Creator recovery: [Creator Continuity](../../docs/metropolis/13-CREATOR-CONTINUITY-MERA-CRE.md).

## Must not confuse
- A Mera secret vault (existing) encrypts strategy data only and offers no claim authorization.
- Passkey WebAuthn browser ceremony prior to EIP-1193 call is **APP_ONLY** and bypassable onchain by old EOA keyholder.
- A Mera-derived EOA fee recipient can sign and directly claim **its own** FeeEscrow credits. This is a dedicated signing account, not second factor for user's existing EOA.
- Audited smart-account enforcement is future-stage; no supported/verified Monad-10143 ERC-4337 module installation, paymaster, bundler or dual-auth policy currently proven by this repository.
- `claim`: escrow → account; `send`: account → recipient; `marginWithdraw`: Kuru margin → owning account; `release`: buyback vault → escrow; `offRamp`: separate provider flow, **disabled on testnet**.
- `referral`: currently only attributed events; no funded referral payouts, so no referral fee claim is actually protectable.
- An OFF/ON toggle MUST display its enforcement level rather than guarantee blanket security.

## Existing hooks
`apps/retro-ui/src/features/earn/{earn,claim-sheet,live-earn,use-claims,send-to-wallet}.tsx`,
`apps/retro-ui/src/features/portfolio/live-portfolio.tsx`,
`apps/retro-ui/src/wallet/provider.tsx`,
`apps/retro-ui/src/services/tx-pipeline.ts`,
`apps/retro-ui/src/lib/vault/strategy-vault.ts`, SDK `prepareFeeClaim`, `prepareFeeClaimToken`, `prepareBuybackRelease`, `prepareMarginWithdraw`, `prepareTransfer`.

## Implementation sequence
1. Read `14-MERA-PROTECTED-EARN-WITHDRAWALS.md`, confirm deployed manifest and Mera 0.2.0 official exported APIs. Audit signer interface and FeeEscrow `msg.sender`.
2. Add typed capability matrix `action × current wallet × custody path × protection tier`; presentation only and explicit non-custody warning.
3. Optional APP_ONLY opt-in fresh WebAuthn step-up limited to app-controlled actions; no security claims against compromised EOA, no unsafely persistent bypass. Scope wallet account, calldataHash, value, nonce, expiry and domain.
4. Isolated Mera-based passkey signer spike: create/recover same wallet address across supported devices, support actual EVM transaction via qualified SDK/viem signer adapter, demonstrate small authorized testnet transfer. Never store PRF/private key.
5. For protected creator fees, signed opt-in current fee recipient routes **future** fee rights to passkey EOA; requires real consent and receipt, not automatic. Read old historical escrow credits and explain they stay old account.
6. Only if real protected account is qualified: integrate per-source claims and send, then Kuru margin if account ownership matches. No "claim all" silent session reuse.
7. Later after hackathon: evaluate independently audited smart account with enforced dual auth, removal cooldown, guardians and verified Monad AA infrastructure.
8. Future mainnet bank off-ramp partner runtime capabilities only; no testnet bank withdrawal.
9. Run negative tests and strict mobile/browser Playwright; independent PR with zero apps/web diff.

## Sponsor demo acceptance
Real Mera PRF ceremony on stable RP ID; deterministically restored passkey account; one wallet-signed real Monad testnet low-value financial action **after** passkey, receipt and protected address; prove old EOA can bypass APP_ONLY to avoid false 2FA claims; no fabricated payout/referral/bank route. Strongest story: **creator fee wallet recoverable by passkey, opt-in, future fee rights preserved**.

## Sources
https://github.com/category-labs/mera ; https://docs.erc4337.io/core-standards/erc-4337 ;
https://github.com/RetroPick/retropick-protocol/tree/main/apps/retro-ui/src/features/earn
