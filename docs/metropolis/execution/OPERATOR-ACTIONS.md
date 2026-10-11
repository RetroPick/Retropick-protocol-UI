# Operator Action Queue — RetroPick Metropolis

Value-ordered. Items are gated: the agent prepared everything; these need a human.

## 1. Rotate the Envio API token (unblocks public Market Radar)
The development token was shared in chat (exposed). Rotate it at envio.dev → place the new value in
the gitignored 0600 file `.staging/radar.env` (`ENVIO_API_TOKEN=…`). Then the agent starts
`retropick-radar` and sets `STAGING_GATEWAY_RADAR=1` to expose same-origin `/api/radar/*`. Until then
the retro-ui radar panel renders its honest unavailable state. (Lane: `20261012-envio-live.md`.)

## 2. Real Mera passkey ceremony evidence (Gate E)
On `https://retropick-metropolis-retro-ui-stagi.vercel.app` → Earn → Protection: derive the protected
wallet, lock/reload, derive again (same address), screenshot both; optionally "Prepare handoff" for a
token you own and screenshot the prepared (unsent) `transferCreatorFeeRecipient`. No broadcast.
(Lane: `20261012-mera-signer.md`.)

## 3. SSH-agent unlock for Contabo read-only inspection
In a local terminal: `eval "$(ssh-agent -s)"; ssh-add ~/.ssh/id_ed25519_yubie_contabo`. Then the agent
runs the READ-ONLY VPS inventory (Yubie untouched). No host writes without a separate approval.
(Lane: VPS durability.)

## 4. MetaMask Agent plugin — publish + provision (HARD GATE)
Approve `npm publish --access public` of `@retropick/mm-plugin@0.1.0` (2FA), then `mm login` +
provision/fund an agent wallet for the bounded live demo. CLI 6.2.1 local-path install is broken
(BLOCKER-005 confirmed); publish or git URL is required. Full packet in `20261012-metamask-agent.md`.

## 5. Any testnet financial transaction (per-tx approval)
Creator-fee handoff broadcast, Kuru orders, Kuru New Assets P0 deployment/liquidity. Each needs a
fresh, transaction-specific authorization with an exact summary. None performed autonomously.

## Deferred (not blocking submission)
- Pinata IPFS media (token rotation required; local media works).
- Named Cloudflare tunnel / Contabo migration (durable ingress; quick tunnel auto-recovers meanwhile).
- Aurora / Nansen (no supported Monad Testnet capability — BLOCKED_EXTERNAL).
