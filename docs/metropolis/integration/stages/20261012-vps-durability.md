# 2026-10-12 — Contabo VPS durability: access boundary + isolated migration proposal

| Field | Value |
|---|---|
| Lane | L6 VPS durability |
| Branch / PR | `feat/metropolis-vps-proposal` |
| Host | Contabo, ssh alias `vps-contabo-yubie-1` → `yubie-deploy@84.247.158.36:22` |
| Status | **BLOCKED at access (operator ssh-agent unlock)** — proposal + inspection checklist ready; ZERO host mutation |

## Access boundary (observed, not worked around)

```
SSH_AUTH_SOCK unset · ssh-add -l → "Could not open a connection to your authentication agent"
ssh -o BatchMode=yes vps-contabo-yubie-1 → yubie-deploy@84.247.158.36: Permission denied (publickey,password)
```

The encrypted key `~/.ssh/id_ed25519_yubie_contabo` exists (0600) but is not loaded into any agent.
Per the security gates I did NOT weaken host-key checking, enable password auth, or automate the
passphrase. Read-only inspection is blocked until the operator unlocks the agent interactively:

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519_yubie_contabo    # operator enters the passphrase
ssh vps-contabo-yubie-1
```

## Read-only inspection checklist (run ONLY after unlock; Yubie untouched)

```bash
hostname; uptime; free -h; df -h /; df -i /; nproc; cat /etc/os-release | head -2
ss -lntp                                   # port map — confirm 8787/8788/8790/8791/8799 free
systemctl --type=service --state=running --no-pager | head -40
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'   # expect staging-api-1, staging-postgres-1
docker network ls; docker volume ls
# DO NOT: inspect Yubie DB contents, read Yubie env/secrets, restart/modify any Yubie container.
```

Record results under `evidence/hackathon/metropolis/staging/vps-inventory-<ts>.txt` (no secrets).

## Isolated RetroPick stack proposal (NO host writes without a separate approval)

Fully isolated from the existing Yubie services — distinct user, systemd/compose namespace,
network, volumes, ports, config dir, logs:

```text
system user:   retropick-staging  (non-root, no docker-socket grant)
dirs:          /opt/retropick/staging (code) · /var/lib/retropick-staging (SQLite journals + media)
               /etc/retropick/staging (0700, 0600 env files) · /var/log/retropick-staging
services (loopback-bound, behind one ingress):
  retropick-indexer   127.0.0.1:8787    retropick-referral 127.0.0.1:8788
  retropick-media     127.0.0.1:8790    retropick-radar    127.0.0.1:8791 (flag-gated, token-rotated)
  retropick-gateway   127.0.0.1:8799    (the allowlist gateway already built)
ingress:       named Cloudflare tunnel (stable hostname) OR authorized HTTPS reverse proxy
               — requires DNS/Cloudflare account access = operator gate
restart:       systemd units Restart=always (mirror of the WSL --user units already written)
```

### Preserve Yubie (hard constraints)
- Never reuse Yubie's Docker Compose project / network / volume names.
- Never read or mutate `staging-api-1` / `staging-postgres-1` or their Postgres DB/credentials.
- Bind all RetroPick ports to loopback; expose only through the dedicated ingress.
- Separate backup schedule; never touch Yubie backups.

### Migration (staged, reversible — gated)
1. Install to the isolated paths in parallel; the WSL stack stays live and judge-serving.
2. WAL-safe SQLite copy (`sqlite3 .backup`) of indexer + referral DBs + tar of media from WSL;
   checksum manifest; verify schema + event cursors on the target before any cutover.
3. Private smoke on the target (loopback curl matrix + a read-only Playwright pass).
4. Point a named tunnel / proxy at the target; run the 12 staging read-only Playwright tests.
5. Only then update the public origin's rewrites. Rollback = revert rewrites to the WSL tunnel;
   both stacks share nothing, so rollback is clean.

### Resource preconditions (verify during inspection before proposing a go)
Free RAM ≥ ~1.5 GB headroom over Yubie, ≥ 5 GB disk, inodes available, no port collisions on
8787–8799, kernel/systemd healthy.

## HARD GATE

SSH access is permission to connect, not to deploy. No Contabo filesystem write, package install,
service creation, Docker/daemon change, DNS/Cloudflare change, or data copy off WSL happens without
an explicit operator-approved change scope. This document is preparation only.

## Operator action
See OPERATOR-ACTIONS.md item 3 (ssh-agent unlock) → then item for migration go/no-go after inventory.

## Next lane
Pinata deferral record + Aurora/Nansen closures (`20261012-closures.md`).
