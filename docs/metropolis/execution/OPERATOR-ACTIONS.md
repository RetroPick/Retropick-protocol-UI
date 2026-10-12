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

## 3. Contabo durable hosting — RetroPick-only deployment authorization (change scope)
Read-only inventory is COMPLETE (`evidence/hackathon/metropolis/staging/vps-inventory-20261012.txt`):
host healthy, 4 vCPU / 7.1 GiB free / 87 GB disk, all RetroPick ports free, Yubie not host-published
(no conflict), clean (no retropick user). To make staging durable (replace the WSL quick tunnel),
approve this bounded, RetroPick-only change scope on `vps-contabo-yubie-1` — Yubie untouched:
- create system user `retropick-staging` (non-root) + `loginctl enable-linger`;
- create `/opt/retropick/staging`, `/var/lib/retropick-staging`, `/etc/retropick/staging` (0700),
  `/var/log/retropick-staging`;
- install `cloudflared` (named tunnel) OR point an authorized reverse proxy at loopback 8799;
- copy the WAL-safe SQLite backups + media from WSL; run the isolated stack (ports 8787–8799 loopback);
- DNS/Cloudflare change for the stable hostname.
No Yubie container/DB/secret access, no shared network/volume names, no other host change. Rollback =
repoint to the WSL quick tunnel. Without this, staging keeps running on the auto-recovering WSL quick
tunnel (functional, non-durable).

## 4. Publish and qualify the MetaMask agent plugin
Approve `npm publish --access public` of `@retropick/mm-plugin@0.1.0` (2FA), then `mm login` +
provision/fund an agent wallet for the bounded live demo. CLI 6.2.1 local-path install is broken
(BLOCKER-005 confirmed); publish or git URL is required. Full packet in `20261012-metamask-agent.md`.

## 5. Any testnet financial transaction (per-tx approval)
Creator-fee handoff broadcast, Kuru orders, Kuru New Assets P0 deployment/liquidity. Each needs a
fresh, transaction-specific authorization with an exact summary. None performed autonomously.

## Deferred (not blocking submission)
- Pinata IPFS media: RESOLVED 2026-10-12 — activated on staging (operator-authorized dev JWT).
- Named Cloudflare tunnel / Contabo migration (durable ingress; quick tunnel auto-recovers meanwhile;
  see item 3 for the deployment change scope).
- Aurora / Nansen (no supported Monad Testnet capability — BLOCKED_EXTERNAL).


## 2026-10-13 Protected Earn acceptance queue

The P0 code now implements enrollment/recovery, APP_ONLY action proofs and isolated protected-wallet signing. Complete real PRF-capable hardware evidence on the canonical staging HTTPS RP; record credential recovery yielding the same address after reload. Mocks do not establish hardware support.

For each separately authorized testnet financial action, review chain 10143, invoking account, token/asset, current fee recipient, protected address, contract destination, amount/native value, calldata and gas funding. Use the UI review immediately before signing. Handoff requires the current authorized wallet and no active pending owner override; verify the receipt and reread beneficiary. Historical native/ERC-20 escrow credits stay with the original wallet. Protected-account claims/send/margin actions require that account's funds and gas, a new passkey ceremony and a verified receipt. No agent financial broadcast occurred in this recovery. APP_ONLY remains bypassable through another wallet/direct contract call.

Follow [the P0 incident report](../integration/stages/20261013-indexer-502-kuru-trading-incident.md) for reviewed source and live evidence. Keep sponsor A–E gates pending unless their original requirements are satisfied. Freeze starts October 14, 2026 at 02:59 WIB; verify submission portal time (currently 10:59 WIB). Durable ingress, plugin publication and submission remain separate operator actions.
