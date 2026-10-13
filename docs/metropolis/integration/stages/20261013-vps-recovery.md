# 2026-10-13 — repeated 502 root cause and permanent VPS recovery

Status: **PASS** — permanent route, public indexer and sustained monitoring verified.
Branch: `codex/metropolis-p0-recovery`; PR [31](https://github.com/RetroPick/retropick-protocol/pull/31).
Runtime source: `84e954bdcff5651a5f808882eff6226fd6419f6a`.

## Actual serving path

- Judges: https://retropick-metropolis-retro-ui-stagi.vercel.app/launchpad
- Vercel staging project: `retropick-metropolis-retro-ui-staging`,
  `prj_dKwt5xQUlhZg6shbOWyFvZbZXSIO`, team `team_wDDjfSztM78LKthTsosnF3qw`.
- Deployment: `dpl_AiKrQaCLwehGuXvB1xSS9FNT8DHq`, deployed 2026-10-13 09:36:41 UTC.
- Permanent API: https://api-staging.retropick.xyz → `84.247.158.36` (`vmi3646941`).
- Namecheap authoritative NS: `dns1.registrar-servers.com`, `dns2.registrar-servers.com`.
  Operator added A `api-staging` → `84.247.158.36`, TTL Automatic, and verified authoritative
  and public resolution. No nameserver migration or Cloudflare credential was needed.
- Caddy public 80/443 → existing allowlist gateway loopback 8799 → indexer/referral/media/radar.
  `/health`, `/v1/*`, `/api/referrals/*`, `/api/media/*` and `/api/radar/*` remain routed;
  unknown paths and disallowed methods remain denied.

## Why another retry or temporary redeploy could not solve it

At incident capture the backend was still hosted in WSL2 (`Ubuntu-VPS-Clone`), despite an
available Contabo proposal. WSL boot time was 2026-10-13 **09:01:02 UTC**. The indexer's PID-only
lock file had been created **08:55:52.651 UTC**, before boot, naming PID **560**. After reboot,
Linux reused 560 as a Node thread (`Tgid:541`, `Pid:560`). `process.kill(560,0)` succeeded even
though `ps -p 560` did not show an independent process. The lock code interpreted existence
as ownership and refused startup with `INDEXER_DB_LOCKED`. Systemd retried to its finite
start limit, then left the indexer failed permanently.

Two independently observed 502 layers explained the visible Launchpad error:

1. Loopback gateway: `STAGING_GATEWAY_UPSTREAM_UNAVAILABLE`, indexer `ECONNREFUSED`.
2. Public Vercel route: `DNS_HOSTNAME_NOT_FOUND`, because immutable deployment rewrites still
   referenced `duration-install-platforms-internet.trycloudflare.com`, an expired quick tunnel.

The new temporary tunnel could not be reconciled while the indexer remained unavailable.
Even correcting one layer would retain the WSL host and rotating-hostname dependencies.
The earlier 20-minute rehearsal proved only that window; it did not establish durable host
placement or reboot recovery. The UI correctly reported an outage, not an empty market list.

A separate readiness defect allowed a restored projection with `headBlock:0`, `lagBlocks:0`
and an old indexedAt to pass an overly weak check. Current staging readiness requires a known
head, exact head-minus-indexed lag ≤64, chain 10143, projection 2, null error and recent timestamps
in both health and launch-list responses. `health.ready` by itself means published schema only.

## Corrective changes

- Indexer and referral writer ownership now holds a SQLite `BEGIN EXCLUSIVE` transaction in
  a persistent `.writer-lock.sqlite` guard. Kernel locks disappear on process death or reboot.
  Guards are never unlinked during normal release, avoiding replacement-inode races.
- One-time PID-lock migration refuses a live same-boot owner and uncertain ownership, but
  reclaims a lock from before Linux boot despite PID reuse. Old PID-lock binaries must not run
  concurrently with upgraded writers against one database.
- Tests cover contention, idempotent release, legacy ownership, boot reuse and actual child
  SIGKILL recovery. Deployed indexer and referral were also killed intentionally and recovered
  automatically, each with `NRestarts=1`, without deleting guards or redeploying Vercel.
- `bootstrap-vps.py` installs dedicated system accounts, isolated root-owned release/runtime,
  protected environment files, persistent writable state and boot-enabled system units.
  `Restart=always`, 10-second backoff, no finite start limit prevents permanent start-limit failure.
- Dedicated Caddy serves automatic HTTPS with persisted certificates and admin disabled.
  Only its account receives bind-port capability; backend listeners remain loopback.
- The Vercel helper accepts/pins a stable backend origin and checks freshness before deploying.
  The reconciler respects stable mode. WSL services and quick-tunnel automation are disabled.
- Referral sync previously obtained a cursor without `toBlock`, then added `toBlock` on later
  pages. Indexer cursor query hashing rejected the changed parameters. Multi-page sync now
  starts again with a fixed upper bound and keeps the same query on every page; regression
  tests prove exact volume aggregation without partial replacement. Public syncError is null.

## Data and isolation evidence

SQLite copies used Python's SQLite backup API, rather than copying a live WAL database file.
Both integrity checks passed. The indexer backup retained **1,490 events**, **45,114 checkpoints**
and **528 meta rows**; referral backup retained its existing association and activity. SHA256
checksums matched on import. All **five media files** and **two radar state files** were preserved.
An existing image also matches byte-for-byte through the public Vercel media rewrite.
The indexer caught up from roughly 118,000 missing blocks; no cursor jump or fake freshness was used.

Actual persistent paths are `/var/lib/retropick-staging/{indexer,referral,media,radar,caddy}`.
Secret files under `/etc/retropick-staging` are root-owned mode 0600. They are loaded by systemd,
not written into source, evidence or frontend environment. Private Node **24.21.0** and Caddy
**2.11.7** archives were verified against official SHA256 values before installation.

Yubie's `staging-api-1` and `staging-postgres-1` remained healthy with their original container IDs
and Oct-9 start times. Their container-only ports do not collide with the RetroPick host listeners.
No Yubie env, database, volume, reverse proxy or service was modified. No firewall rule changed:
UFW was inactive and host 80/443 were free before installation. No contract/economic change,
financial transaction, frontend design change or legacy frontend deployment occurred.

## Verification results

- Local indexer: **45/45**, typecheck passed.
- Local referral: **17/17**, typecheck passed; staging helper: **9/9**.
- Public API: **14 direct/rewritten checks**, trusted TLS 1.3, preserved image checksum.
- Public Playwright after crash recovery: **14/14**, desktop 1440 and mobile 390, retries disabled.
  Discovery rows, graduated terminal/depth/orders, Mera vault mount, referral/media rewrites,
  wallet picker, overflow, console errors and exact public release SHA are verified.
- Initial browser pass: 13 passed and one passed on retry. Trace shows test-host
  `net::ERR_NETWORK_CHANGED` interrupting an asset import, not indexer failure. The subsequent
  complete campaign passes without retries; original trace is retained.
- Remote Node 24 backend suites: **92/92** passed (`vps-node24-tests.log`). The first broad
  glob also selected a frontend-importing referral test absent from the intentionally backend-only
  release. That test passes locally; the corrected remote scope keeps backend tests only.
- Radar's initial archive retained workspace-private file modes and could not read server.ts.
  Release read/traverse permissions were normalized, the bootstrap now does so explicitly,
  and radar recovered its preserved snapshot and reports live configured HyperSync data.
- Boot durability: `retropick-staging.target` enabled under `multi-user.target`, all six service
  dependencies present, persistent state/TLS paths verified, services survive closing SSH/root
  sessions. A **whole shared-VPS reboot was not performed** because it would interrupt Yubie;
  this report does not claim a witnessed power-cycle or guarantee future host uptime.
- Sustained monitoring: **41/41 passing samples**, **0 failures**, **20 minutes 14 seconds**,
  09:39:33–09:59:47 UTC, lag **8–58 blocks**. Public health/list readiness and exact frontend
  release SHA were checked every 30 seconds. See `monitor.jsonl`.
- Subsequent domain preparation is tracked separately in the custom-domain readiness report.
  Backend origin support was extended to both approved frontend origins without changing indexer
  code or moving a domain. The initial serving/frontend source above describes this monitor window.

## Remaining boundaries and operations

No DNS or staging environment action remains pending. Backend restarts and host reboots retain
this API hostname and require no Vercel rewrite change. Use [the runbook](../../execution/STAGING-RUNBOOK.md)
for scoped operations. Frontend rollback must rebuild an earlier reviewed SHA against the permanent
API; historical deployments reference dead quick tunnels and should not be promoted directly.

Actual PRF-capable hardware, separately authorized financial receipts and sponsor qualifications
remain separate from hosting recovery. No sponsor A–E gate was upgraded from these health checks.

Evidence: `evidence/platform/frontend/staging-vps-recovery-20261013/` (incident, DNS, deployment,
state backup, runtime audit, recovery, TLS/endpoints, tests, browser screenshots and monitor).
