# Staging Architecture — retro-ui public release

Deployed 2026-10-11. Status: **LIVE** (validated — see STAGING-VALIDATION.md).

```
https://retropick-metropolis-retro-ui-stagi.vercel.app   ← judges start here
        │  Vercel project: retropick-metropolis-retro-ui-staging (personal scope)
        │  Vite build of apps/retro-ui @ commit 02aeba2 · VITE_DATA_MODE=live
        │
        ├─ rewrites /api/referrals/* ──┐
        ├─ rewrites /api/media/*    ──┤   (ordered before the SPA catch-all)
        ├─ SPA fallback → /index.html (deep links: /launchpad/token/0x…, /r/:code, /earn)
        │
        ▼  single cloudflared QUICK TUNNEL (non-durable; URL rotates on restart)
https://<tunnel>.trycloudflare.com
        │
        ▼  staging-gateway 127.0.0.1:8799 (path router, scripts/staging/gateway.mjs)
        ├─ /api/referrals/* → referral-service 127.0.0.1:8788 (strict same-origin, HttpOnly SameSite=Strict Secure cookie — same-origin rewrites make this work)
        ├─ /api/media/*     → media-service    127.0.0.1:8790 (local mode; MEDIA_PUBLIC_BASE=tunnel)
        └─ everything else  → indexer          127.0.0.1:8787 (SQLite journal resumed; CORS *; GET-only)
                                     │
                                     ▼  Monad Testnet 10143 (public RPC read-only)

Browser RPC:      https://testnet-rpc.monad.xyz (public, browser-safe; build guard rejects credential-bearing URLs)
Mera PRF vault:   browser-native WebAuthn on the staging domain (RP ID = hostname — vaults are domain-bound)
Wallet:           EIP-6963 picker, chain 10143 enforced; no wallet bridge in staging
```

## Placement rationale (per operator decision 2026-10-11)

- Vercel hosts the static SPA only; zero server-side secrets in the frontend project.
- The legacy `retropick-metropolis` project (apps/web) is untouched — different project,
  different domain; production cutover remains a separate approval.
- Backends run on the operator's WSL2 host behind one quick tunnel: zero new
  infrastructure, zero paid services. **Non-durable by design** (tunnel URL rotates on
  restart; host sleep kills it). The runbook's redeploy flow restores it in ~3 minutes.
- Envio radar is NOT part of staging (token-gated, BLOCKER-003); CRE CLI, mm CLI and
  Foundry remain on the agent host as isolated execution systems.

## Files that own this architecture

- `scripts/staging/gateway.mjs` · `start-backend.mjs` · `stop-backend.mjs` ·
  `deploy-vercel.mjs` · `vercel.template.json` (all committed)
- Rendered runtime state (never committed): root `vercel.json` (carries the rotating
  tunnel URL), `.staging/` (pids, logs, tunnel-url, staging-url)
- `.vercelignore` (committed, deny-list, anchored) — CLI-upload slimming only; cannot
  affect the git-connected legacy project
