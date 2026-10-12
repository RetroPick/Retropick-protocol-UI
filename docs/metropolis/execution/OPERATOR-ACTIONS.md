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

## 4. Real Mera passkey ceremony evidence (Gate E)
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
