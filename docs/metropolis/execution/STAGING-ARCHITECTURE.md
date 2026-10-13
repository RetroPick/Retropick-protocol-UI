# Staging architecture — permanent Contabo backend

Updated 2026-10-13. Frontend source: `caf23208f6831b424b1cc51c0785ecf6bdeae264`.

```text
Judges / browser
  https://retropick-metropolis-retro-ui-stagi.vercel.app
  Vercel: retropick-metropolis-retro-ui-staging, apps/retro-ui, live data
    /health, /v1/*, /api/referrals/*, /api/media/*, /api/radar/*
      → https://api-staging.retropick.xyz
          Namecheap A record → 84.247.158.36 (Contabo)
          dedicated Caddy HTTPS :443 (HTTP :80 redirects / ACME)
            → allowlist gateway 127.0.0.1:8799
                indexer :8787 · referral :8788 · media :8790 · radar :8791
                  Monad Testnet 10143, read-only RPC / Envio HyperSync
    remaining paths → static SPA fallback
```

The frontend public URL and Mera relying-party domain remain unchanged. Browser data uses
same-origin Vercel rewrites; strict referral cookies continue using the frontend origin.
Media mode is Pinata; local media fallback paths also use the canonical frontend origin.
No contract deployment or economic write occurred during migration.

## Isolation and persistence

- Backend user: `retropick-staging`; ingress user: `retropick-staging-caddy`.
- Private, checksum-verified Node 24.21.0 and Caddy 2.11.7 under `/opt/retropick-staging/runtime`.
- Root-owned backend release: `/opt/retropick-staging/release`; `SOURCE_SHA` records its source.
- Persistent SQLite, media, radar and certificate state: `/var/lib/retropick-staging`.
- Config: `/etc/retropick-staging`; secret environment files are root-owned, mode 0600,
  read by systemd rather than exposed in unit files or the frontend.
- `retropick-staging.target` is enabled under `multi-user.target`, with six system services.
  Services restart after 10 seconds; no finite start limit leaves them permanently failed.
  System services run independently of SSH sessions and user lingering.
- All five backend ports bind loopback. Caddy exposes HTTPS with automatic certificate renewal;
  its administrative listener is disabled. No Docker socket access is granted to RetroPick.
- Existing Yubie `staging-api-1` and `staging-postgres-1` containers were inspected only for
  names, health and ports. Their services, volumes, credentials and configuration were untouched.
- WSL backend units and quick tunnel are stopped and disabled. Stable backend mode prevents a
  future workstation tunnel rotation from replacing the permanent Vercel route.

## Why the earlier staging repeatedly failed

The earlier backend ran inside WSL2, not Contabo. WSL reboot killed the backend and rotated
its quick-tunnel hostname; the deployed Vercel rewrites still named an expired tunnel.
A pre-reboot PID lock named 560, reused after boot as a Node thread, prevented the indexer
from restarting. Systemd eventually exhausted its restart budget. The local gateway returned
ECONNREFUSED and the public Vercel path returned DNS_HOSTNAME_NOT_FOUND, both as HTTP 502.

Indexer and referral writer exclusion now uses a held SQLite EXCLUSIVE transaction in a
persistent guard inode. The kernel releases it on process death or reboot. Legacy live locks
fail closed; legacy locks predating the Linux boot are recoverable despite PID reuse.
Deployment readiness also rejects an unknown chain head, inconsistent lag or stale snapshot.
A referral multi-page cursor query mismatch discovered during migration was repaired.

## Verification boundary

See `integration/stages/20261013-vps-recovery.md` and
`evidence/platform/frontend/staging-vps-recovery-20261013/` for actual results.
A whole shared-VPS reboot was not performed because it would interrupt Yubie. Boot durability
is established by enabled system-target dependencies, persistent paths and isolated service
restart/crash recovery checks; this does not claim a witnessed host reboot.

## Prepared primary origin

The promoted staging release now resolves `VITE_INDEXER_URL=same-origin` at runtime. Referral
and media allow both the existing staging origin and `https://retropick.xyz`. The apex remains
the waitlist pending explicit approval; no domain or DNS mutation occurred. Existing WebAuthn
credentials and cookies stay bound to their original host. See
[CUSTOM-DOMAIN-CUTOVER-READINESS.md](CUSTOM-DOMAIN-CUTOVER-READINESS.md) for tests and cutover steps.
