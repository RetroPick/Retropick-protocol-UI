# Operator Actions — ordered queue (2026-10-11, post-staging)

Staging is LIVE and validated: https://retropick-metropolis-retro-ui-stagi.vercel.app
(evidence: `staging/deployment.json`, STAGING-VALIDATION.md). Items below are the ones
that genuinely need you — everything else is done or documented.

## 1. Durability upgrade for judges (recommended before demo recording)

Quick tunnel + WSL host is non-durable (URL rotates on restart; host sleep kills it).
Pick one:
- **Named tunnel (~10 min):** run `cloudflared tunnel login` once, then ask the agent to
  migrate start-backend.mjs to a named tunnel with a stable hostname — redeploy once,
  done. Best effort/reliability ratio.
- Or provide a small always-on host for the three services.

## 2. Production cutover decision (approval checkpoint)

Staging is qualified (12/12 read-only e2e green, honest market states verified). To make
`retropick-metropolis.vercel.app` (the URL already in README/HACKATHON.md) serve
retro-ui: approve the cutover — the agent will prepare the proposal per RELEASE-GATES
(SHA, config, env, rollback = `vercel rollout undo`) and execute on your go. Until then
judges should use the staging URL.

## 3. Credential unblocks (each = one sponsor bounty)

- **Envio:** create an API token at envio.dev → `ENVIO_API_TOKEN` for the radar service
  (then the agent finishes persistence hardening + the retro-ui radar panel).
- **Chainlink CRE:** run `cre login` on the host → the agent runs the documented
  `cre workflow simulate` (success + negative cases) and records sanitized traces.
- **MetaMask:** approve `npm publish` of `@retropick/mm-plugin` (or host it as a GitHub
  source), then `mm plugins install` + wallet provisioning for the real signed-order demo.
- **Media (optional):** provide `PINATA_JWT` (server-side only) to switch logo storage to
  IPFS mode (local mode works today through the tunnel).

## 4. Mera PRF manual evidence (~2 min, any PRF-capable browser)

Open the staging URL → Earn → Vault → create vault with a passkey → add a thesis → Lock
→ Unlock → confirm the entry returns → export JSON and confirm no plaintext inside.
Note: vaults are bound to the hostname (RP ID) — run this on the domain judges will see,
and record it (steps also in `sponsors/mera/README.md`).

## 5. Stage 7 / Kuru New Assets (unchanged gate)

P0 kernels remain locally qualified and deployment-ready; onchain deployment still needs
your explicit go + a funded testnet wallet (≤2 MON cap) before the Oct-13 content stop.
The evidenced market's book is currently empty — the same authorized flow would also
re-seed demonstrable liquidity.

## 6. Submission window

Demo videos (3-min technical, 2-min founder, sponsor clips), portal answers, founder
approval gates — checklist: `docs/hackathon/SUBMISSION_CHECKLIST.md`.
