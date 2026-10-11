# Staging Runbook

Updated 2026-10-12 (live-data recovery, `integration/stages/20261012-live-data-recovery.md`).
The backend now runs as **systemd --user units** (user lingering enabled) instead of
pidfile-managed processes, and the browser reads the indexer **same-origin**.

```text
browser ──► https://retropick-metropolis-retro-ui-stagi.vercel.app
              /v1/*, /health, /api/referrals/*, /api/media/*  (Vercel rewrites → current quick tunnel)
              everything else → SPA index.html
quick tunnel (retropick-tunnel) ──► gateway :8799 (allowlist) ──► indexer :8787 · referral :8788 · media :8790
```

## Status / daily checks

```bash
systemctl --user list-units 'retropick*' --all --no-pager
curl -s https://retropick-metropolis-retro-ui-stagi.vercel.app/health | grep -o '"lagBlocks":[0-9]*'   # < 64
curl -s -o /dev/null -w '%{http_code}\n' https://retropick-metropolis-retro-ui-stagi.vercel.app/api/referrals/health
curl -s -o /dev/null -w '%{http_code}\n' https://retropick-metropolis-retro-ui-stagi.vercel.app/api/media/health
grep tunnel-runner .staging/tunnel.log | tail -5     # rotation + auto-redeploy history
cat .staging/staging-deploy.json                    # current deployment, source SHA, tunnel
```

## Install / reinstall units (idempotent, no sudo)

```bash
node scripts/staging/install-user-units.mjs --dry-run    # print units
node scripts/staging/install-user-units.mjs              # write + enable (needs Linger=yes)
systemctl --user start retropick-staging.target
```

## Tunnel rotation (automatic)

`retropick-tunnel` runs `scripts/staging/tunnel-runner.mjs`: when cloudflared restarts and the
hostname rotates, it writes `.staging/tunnel-url`, waits for edge `/health`, and runs
`deploy-vercel.mjs` at the **same source SHA** as the last deploy (rewrites-only change; the
bundle is unchanged — it never embeds the tunnel hostname). Measured recovery after a
cloudflared kill: ~40 s. The quick tunnel itself remains non-durable (no uptime guarantee).

## Frontend release (code change)

```bash
git fetch origin
node scripts/staging/deploy-vercel.mjs --sha <reviewed-sha>   # clean /tmp worktree at that SHA
```

Never deploy the dirty dev checkout. Env (`VITE_DATA_MODE=live`,
`VITE_INDEXER_URL=<canonical origin>`, `VITE_MONAD_RPC_FALLBACK_URL`) is written only when the
value changes (`.staging/vercel-env.json`), via `vercel env add … --value … --force --non-interactive`.

## Restart / stop

```bash
systemctl --user restart retropick-indexer          # single service
systemctl --user stop retropick-staging.target      # everything (journals/media are preserved)
```

`start-backend.mjs` / `stop-backend.mjs` are the legacy non-durable path — do not run them
while units are active (port collisions).

## Rollback

- Frontend: `vercel promote <previous-deployment-url>` on the staging project only
  (pre-recovery deployment: `retropick-metropolis-retro-ui-staging-4c5oiug6a-…`).
- Backend: `systemctl --user stop retropick-staging.target && node scripts/staging/install-user-units.mjs --uninstall`,
  then the legacy `start-backend.mjs` path.
- Data: WAL-safe backups in `.data/backups/20261012/` (`SHA256SUMS`).

## Known operational facts

- Services survive the agent/terminal session (owned by `user@1000.service`, lingering).
  They do NOT survive the WSL VM stopping (`wsl --shutdown`, Windows sleep/reboot); on WSL boot
  the enabled target starts them again, the tunnel rotates and auto-redeploys.
- Public RPC occasionally rejects the heavy `getL2Book` browser call → designed unavailable state.
- The evidenced Kuru market's resting book may be empty — the UI shows "No resting orders".
- Durable upgrade path: named tunnel / Contabo isolated stack (`integration/stages/20261012-vps-durability.md`).
