# Operator Action Queue — RetroPick Metropolis

Value-ordered. Items are gated: the agent prepared everything; these need a human.

## 1. Rotate the Envio API token (unblocks public Market Radar)
RESOLVED 2026-10-12: operator authorized the existing dev token (no rotation). Public radar is LIVE
end-to-end (`/api/radar/*`). No action needed. (Lane: `20261012-envio-live.md`.)

## 2. Real Mera passkey ceremony evidence (Gate E)
On `https://retropick-metropolis-retro-ui-stagi.vercel.app` → Earn → Protection: derive the protected
wallet, lock/reload, derive again (same address), screenshot both; optionally "Prepare handoff" for a
token you own and screenshot the prepared (unsent) `transferCreatorFeeRecipient`. No broadcast.
(Lane: `20261012-mera-signer.md`.)

## 3. Contabo durable hosting — resolved 2026-10-13

Operator authorized isolated deployment, unlocked SSH/sudo and added the Namecheap A record
`api-staging` → `84.247.158.36`. The backend now runs under `retropick-staging.target` with
persistent state and dedicated Caddy HTTPS at `https://api-staging.retropick.xyz`. Vercel retains
its existing public URL and rewrites to this permanent hostname. Quick-tunnel units are stopped
and disabled; backend restart no longer requires a Vercel release. Yubie remains unchanged.

See `STAGING-ARCHITECTURE.md`, `STAGING-RUNBOOK.md` and
`integration/stages/20261013-vps-recovery.md` for evidence and limitations. No additional DNS or
staging environment setting is pending. Whole-host reboot is not part of the verification:
it would interrupt Yubie. Boot target enablement and isolated process recovery are verified.

## 4. Publish and qualify the MetaMask agent plugin
Approve `npm publish --access public` of `@retropick/mm-plugin@0.1.0` (2FA), then `mm login` +
provision/fund an agent wallet for the bounded live demo. CLI 6.2.1 local-path install is broken
(BLOCKER-005 confirmed); publish or git URL is required. Full packet in `20261012-metamask-agent.md`.

## 5. Any testnet financial transaction (per-tx approval)
Creator-fee handoff broadcast, Kuru orders, Kuru New Assets P0 deployment/liquidity. Each needs a
fresh, transaction-specific authorization with an exact summary. None performed autonomously.

## Deferred (not blocking submission)
- Pinata IPFS media: RESOLVED 2026-10-12 — activated on staging (operator-authorized dev JWT).
- Permanent Contabo ingress: resolved; Namecheap DNS + dedicated Caddy HTTPS (item 3).
- Aurora / Nansen (no supported Monad Testnet capability — BLOCKED_EXTERNAL).


## 2026-10-13 Protected Earn acceptance queue

The P0 code now implements enrollment/recovery, APP_ONLY action proofs and isolated protected-wallet signing. Complete real PRF-capable hardware evidence on the canonical staging HTTPS RP; record credential recovery yielding the same address after reload. Mocks do not establish hardware support.

For each separately authorized testnet financial action, review chain 10143, invoking account, token/asset, current fee recipient, protected address, contract destination, amount/native value, calldata and gas funding. Use the UI review immediately before signing. Handoff requires the current authorized wallet and no active pending owner override; verify the receipt and reread beneficiary. Historical native/ERC-20 escrow credits stay with the original wallet. Protected-account claims/send/margin actions require that account's funds and gas, a new passkey ceremony and a verified receipt. No agent financial broadcast occurred in this recovery. APP_ONLY remains bypassable through another wallet/direct contract call.

Follow [the P0 incident report](../integration/stages/20261013-indexer-502-kuru-trading-incident.md) for reviewed source and live evidence. Keep sponsor A–E gates pending unless their original requirements are satisfied. Freeze starts October 14, 2026 at 02:59 WIB; verify submission portal time (currently 10:59 WIB). Durable ingress, plugin publication and submission remain separate operator actions.

## Custom domain cutover — prepared, awaiting explicit approval

Staging SHA `caf23208f6831b424b1cc51c0785ecf6bdeae264` passed live desktop/mobile checks.
The apex still belongs to `retropickmarket-1279s-projects` / `retropick-landing`; keep that project
and its data. After approval, the operator moves the domain to `asyams-projects` and attaches it
to `retropick-metropolis-retro-ui-staging`. Do not alter Namecheap or the permanent API.
See [the readiness report](CUSTOM-DOMAIN-CUTOVER-READINESS.md) for exact actions and rollback.
