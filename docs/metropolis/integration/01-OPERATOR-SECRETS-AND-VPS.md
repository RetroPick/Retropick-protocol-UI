# 01 — Operator Credentials, Staging Host Protection & VPS Migration
**This file contains variable names and procedures ONLY. No real tokens, API secrets, Pinata JWT or wallet keys are allowed in source control.** Rotate provider credentials previously pasted into chat before enabling permanent public services. Refer to original operator account/provider dashboards for rotation.

## Auth and credential classification
| Variable / access | Only authorized holder | Required for | Evidence without secret | Gate |
|---|---|---|---|---|
| `ENVIO_API_TOKEN` | RetroPick radar host service user | `@envio-dev/hypersync-client` authenticated Monad 10143 stream | real stream block/event IDs and no 401 | rotation + protected injection |
| `PINATA_JWT` | RetroPick media host service user | optional IPFS uploads | new CID, image fetch and size constraints | rotation + optional rollout |
| `PINATA_API_KEY`, `PINATA_API_SECRET` | host service IF SDK actually needs | avoid if scoped JWT suffices | method+status only | never print |
| `cre login` / `CRE_API_KEY` | authenticated CLI user on agent host | CRE graduation safety simulation | whoami + CLI PASS/FAIL traces | operator already logged in (verify on same host) |
| `mm` session/agent wallet | operator-approved CLI user | MetaMask plugin and live orders | signed order receipt only after approval | installation/publish & wallet authorization |
| `P0_DEPLOY_KEY` | explicit funded testnet deploy session | Kuru new-assets P0 | tx receipts and budget | financial go + cap |
| `MONAD_TESTNET_RPC_URLS` | backend service | safe indexer reads | chain id 10143, lag | public URL or protected secret endpoint |
| `VITE_MONAD_RPC_URL`, `VITE_INDEXER_URL` | browser public build | browser RPC/indexer | clean bundle + correct source | credentials forbidden |
| `REFERRAL_ORIGIN`, `MEDIA_ORIGIN` | host service | strict same-origin and cookies | correct origin success, wrong 403 | exact staging hostname |
| Cloudflare tunnel & DNS | operator account | stable judge hostname | named tunnel and HTTPS status | DNS host approval |
| Vercel scope | operator account | preview/release | project configuration + rollback ID | production cutover approval |

**The exact Envio token and Pinata key/secret/JWT the operator previously posted are deliberately NOT in this document.** GitHub is public, and putting them in tracked text would expose them. Agents must not copy plaintext from a chat into their repo or logs.

### Rotation + injection
1. Owner revokes/rotates old Envio token in envio.dev and Pinata scoped keys/JWT in pinata.cloud; generate least-scope replacements.
2. Operator installs values on authorized RetroPick runtime through approved secrets manager, systemd credentials, or root-owned `/etc/retropick/staging/*.env` (directory 0700, files 0600; dedicated least-privilege user). Never use inline tokens in shell commands, process args, CI logs, `VITE_*`, `curl -v`, GitHub Actions artifact or browser.
3. Agent checks presence boolean and real provider status only. Never print env values, `env | grep`, file contents or full process command lines with secrets.
4. If access denied, verify expiry/scope/network and ask operator for remediation; don't retry guessed secrets or turn off origin checks.

## Existing topology to preserve
- Frontend: Vercel staging Vite `apps/retro-ui`, working public origin as above.
- Backend NOW: WSL2 host, indexer loopback 8787 (SQLite), referrals 8788, media 8790, path gateway 8799, quick cloudflared tunnel (rotating URL, host sleep failure).
- Vercel strict-origin rewrites /api/referrals and /api/media, indexer `/v1` live. Current testing evidence in `docs/metropolis/execution/STAGING-VALIDATION.md`, source in `scripts/staging/*`.
- Proposed VPS: Contabo host accessed as `yubie-deploy` via SSH alias `vps-contabo-yubie-1`; earlier user reported host vmi3646941 at 84.247.158.36, ~7.8Gi RAM and ~87G free disk, **Yubie** Docker containers `staging-api-1` and `staging-postgres-1` healthy. Recheck all measurements fresh. Host is shared, NOT a blank RetroPick server. Do not mutate until approved.

## READ-ONLY preflight (permission to inspect ≠ permission to install)
Start with SSH host/user, hostname, uptime, `free -h`, `df -h`, `df -i`, `ss -lntp`, `sudo docker ps --format ...` (if sudo authorized), process group/service inventory, port collision and open ports, Yubie container hashes+health, current firewall/ingress. Do not print existing service env vars, SSH keys, credentials or other tenants' logs. Note potential workload memory/disk impact before proposal.

## Proposed isolated RetroPick topology (NOT APPROVED TO DEPLOY)
Create under operator-approved change window:
- distinct UID `retropick-staging`, application tree `/opt/retropick/staging`, state `/var/lib/retropick-staging`, private env `/etc/retropick/staging`, logs `/var/log/retropick-staging`;
- systemd units/isolated containers for indexer/referral/media/optional radar/gateway; bind all to `127.0.0.1`; use distinct Docker Compose project, network and volumes if containerized; no Yubie DB, filesystem, Docker Compose, TLS cert, login or env reuse;
- durable ingress: operator-authorized Cloudflare named tunnel with stable DNS, or approved reverse proxy with TLS; never publish 8787/8788/8790/8791/8799 on public interfaces;
- strict gateway method/path allowlist: indexer read-only `/v1/*`, health; referrals origin+cookie+CSRF; media origin+auth+size/rate limits; Envio radar GET only. Prevent arbitrary upstream SSRF/administrative endpoints.

## Data migration and backup/restore acceptance
1. Identify WSL indexer SQLite journal, referral db and media local image store via SOURCE inspection, list schema names, absolute paths, sizes, event cursors. Back up **only RetroPick** data and configs; never touch Yubie DB.
2. Test WSL SQLite online backup API or stop/writer-coordinated consistent snapshot; account for WAL/shm, verify `PRAGMA integrity_check`, checksum, schema and earliest/latest event/block.
3. Copy encrypted/checksummed snapshot to dedicated target using authorized secure channel, protected file permissions, no remote logs with private data. Deploy from pinned Git SHA; use Node versions matching engines.
4. Restore to isolated dirs and run migration dry-run; compare blocks, event counts, referral records (privacy-aware) and media URI reachability. Keep WSL services running to judges until authorized cutover; prevent duplicate indexed event side effects.
5. Test service restart/resume, RPC timeouts, partial replay, wrong-origin 403, secure cookies, CORS, two-minute health, lost tunnel and source rollback. If checks fail: retain old staging rewrites, restart old WSL with known configs, revert preview/staging rollout, DO NOT touch Yubie.
6. Prepare change request with SHA, paths, backup manifest/hash, exact new services, projected RAM/disk/port impact, ingress hostname, user access, window, health commands, rollback command, source safety checks.
7. **STOP for explicit operator approval BEFORE sudo installs, creating users, writing to Contabo, starting a daemon, restarting existing service, migrating private data or changing DNS/Vercel public routing.** Never auto-provision even if SSH works.

## Separate production and money gates
- Production `retropick-metropolis.vercel.app` remains legacy apps/web; root-directory/domain cutover requires proposal and operator "go". No apps/web source edit.
- Testnet Outcome/P0 deployment requires explicit signed-off cap and funded wallet; no bare account login implies approval.
- MetaMask npm publication or agent wallet creation requires explicit approval. Founder must approve portal submission.
- Manual PRF vault demonstration on judge domain can be performed by operator, but agent cannot extract credential or bypass it.

Document actual host inspection and approved migration stage at `docs/metropolis/integration/stages/<date>-vps-durability.md`.
