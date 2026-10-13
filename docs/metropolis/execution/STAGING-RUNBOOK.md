# Staging runbook — Contabo + stable HTTPS

Updated 2026-10-13. Judge URL:
https://retropick-metropolis-retro-ui-stagi.vercel.app

Permanent API: https://api-staging.retropick.xyz
Namecheap A `api-staging` → `84.247.158.36`; no AAAA/CNAME required.
Keep this DNS record and the frontend origin stable. Backend restarts do not require a
Vercel deployment. Do not restore the workstation quick-tunnel units.

## Read-only checks

```bash
curl -fsS https://api-staging.retropick.xyz/health
curl -fsS 'https://api-staging.retropick.xyz/v1/launches?limit=1'
curl -fsS https://retropick-metropolis-retro-ui-stagi.vercel.app/health
curl -fsS https://retropick-metropolis-retro-ui-stagi.vercel.app/api/referrals/health
curl -fsS https://retropick-metropolis-retro-ui-stagi.vercel.app/api/media/health
curl -fsS https://retropick-metropolis-retro-ui-stagi.vercel.app/api/radar/health
SSH_AUTH_SOCK=/home/ubuntu/.ssh/retropick-agent.sock ssh vps-contabo-yubie-1
# On Contabo:
systemctl is-enabled retropick-staging.target
systemctl list-units 'retropick-staging*' --all --no-pager
sudo journalctl -u retropick-staging-indexer --since '10 minutes ago' --no-pager
```

Healthy indexer: chain 10143, projection 2, known chain head, error null, lag ≤64 and
indexedAt within 120 seconds. `ready:true` alone only proves a published projection.
Referral health should have syncError null. An empty real order book or heavy browser
RPC rejection remains an honest state; do not fabricate liquidity or prices.

## Restart only RetroPick

```bash
sudo systemctl restart retropick-staging-indexer.service
# All RetroPick services, preserving state:
sudo systemctl restart retropick-staging.target
```

SQLite writer guard files must never be manually unlinked while a writer is active.
The kernel releases ownership automatically on crash; deleting an active guard can allow
multiple writers. Keep the persistent guard inode. Legacy PID locks are migrated once.

## Frontend release

```bash
node scripts/staging/deploy-vercel.mjs \
  --backend-origin https://api-staging.retropick.xyz --sha <reviewed-source-sha>
```

The helper checks backend freshness before deployment, uses a clean SHA-pinned worktree,
restricts writes to the canonical staging project, verifies its public alias and release SHA,
then pins stable backend mode in `.staging/backend-origin` and `.staging/staging-deploy.json`.
No UI redesign or frontend-domain change is needed to operate the permanent backend.

## Backend release / rollback

Backend code, private runtime and state are separate. Stop only `retropick-staging.target`,
make WAL-safe SQLite backups, install the reviewed backend release and keep existing persistent
state and protected environment files. Record SOURCE_SHA, normalize release read/traverse
permissions for service users, then start the target and verify fresh public endpoints.
`scripts/staging/bootstrap-vps.py` installs a fresh isolated host; it refuses an existing
installation rather than overwriting live units without review.

Frontend rollback means rebuild a reviewed earlier SHA with the **current permanent API**.
Do not promote historical deployments whose rewrites reference expired quick tunnels.
Backend rollback must retain the kernel-backed lock fix and compatible projection schema;
never run old PID-lock and new kernel-lock writers concurrently against one database.
Local WSL state remains a preserved pre-cutover backup, not an automatic serving fallback.
Do not restart, reconfigure or reboot Yubie services as part of a RetroPick rollback.

## Evidence

Root cause, state checksums, tests, TLS/public endpoints, recovery and monitoring:
`evidence/platform/frontend/staging-vps-recovery-20261013/`.
