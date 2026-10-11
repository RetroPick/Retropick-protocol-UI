# 2026-10-12 — Live data recovery (staging incident)

| Field | Value |
|---|---|
| Lane | L0 staging / P0 |
| Branch / PR | `feat/metropolis-live-data-recovery` |
| Source SHA deployed | `98608fa41de8b69e887da03dc204d60967309a93` |
| Base | `origin/main` @ `49825ff` |
| Network | Monad Testnet 10143 |
| Vercel project | `retropick-metropolis-retro-ui-staging` only (legacy `retropick-metropolis` untouched) |
| Host | WSL2 `Ubuntu-VPS-Clone`, user `ubuntu`, systemd 255 PID1, `Linger=yes` |
| Status | **RUNTIME_VERIFIED** (staging) |

## Symptom

Public `/launchpad`: "No launches match these filters · Failed to fetch · Indexer history
unavailable · 0 launches on this page".

## Root cause (observed, not inferred)

Class **TUNNEL_UNREACHABLE**, plus a frontend presentation bug.

1. `.staging/tunnel.log`: quick tunnel registered 2026-10-11T12:44:04Z, then
   `12:54:01Z INF Initiating graceful shutdown due to signal terminated` → `no more connections active and exiting`.
2. All five `.staging/*.pid` processes were dead; no listener on 8787/8788/8790/8799.
3. The hostname baked into the bundle (`concerning-billing-unnecessary-poultry.trycloudflare.com`)
   answered `getaddrinfo ENOTFOUND`; the browser surfaced it as `TypeError: Failed to fetch`.
4. The agent shell runs in cgroup `0::/non-systemd`; the previous pidfile processes were children
   of agent sessions, so ending a session SIGTERMed the stack (third such wave).
5. Monad RPC was healthy throughout: `eth_chainId=0x279f`, `eth_blockNumber=0x42ee83c`,
   `eth_getCode(Factory 0xa7f1…2454)` non-empty, `eth_call owner()` → `0xb505…913b`.
6. `discovery.tsx` passed the fetch error string into the empty-state's `text`, so an outage
   rendered as "No launches match these filters".

## Fix

| Area | Change |
|---|---|
| Durability | `scripts/staging/install-user-units.mjs` → `retropick-{indexer,referral,media,gateway,tunnel}.service` + `retropick-staging.target` under `systemd --user` (Restart=always, logs → `.staging/*.log`). Units live in `user@1000.service/app.slice`, not the agent session. |
| Same-origin | `VITE_INDEXER_URL` = canonical staging origin; Vercel rewrites `/v1/*`, `/health`, `/api/referrals/*`, `/api/media/*` → current tunnel, SPA catch-all last. The bundle contains no tunnel hostname. |
| Rotation | `scripts/staging/tunnel-runner.mjs` captures the rotated URL, waits for edge `/health`, redeploys rewrites at the same source SHA. |
| Gateway | Explicit allowlist (indexer GET/HEAD/OPTIONS only), 404 for all else, 405 wrong method, 400 traversal, 413 body cap (non-media 64 KiB), hop-by-hop strip, upstream timeout 504/502. |
| Deploy | Clean detached worktree at an explicit SHA; env written only on value change via `vercel env add --value --force --non-interactive` (the rm→stdin-add path silently dropped `VITE_DATA_MODE` on CLI 62.1 — caught by verification and fixed). |
| UI | Indexer failures are classified (`unreachable/timeout/http/not-found/invalid-response/wrong-chain`) and rendered as an alert with Retry (`data-testid=indexer-unavailable`); a successful zero-row response keeps the genuine empty state; failed refresh with cached data shows a stale note. |
| Media | `MEDIA_PUBLIC_BASE` = canonical origin (new URIs survive rotation). Old content-addressed `https://*.trycloudflare.com/api/media/<sha256>.<ext>` URIs resolve same-origin in the UI. |

## Preservation (before any change)

WAL-safe `sqlite3 .backup` + tarballs in `.data/backups/20261012/` (gitignored, dir 0700),
`integrity_check=ok` for both DBs:

| File | sha256 |
|---|---|
| indexer-monad-testnet.sqlite | `990ae811f70866f2e70a4c44c4fb070923d61611a762995289fcfba2a5c7b99a` |
| referral-attribution.sqlite | `ff2a452180d112a89296c7e0eecc8e06e38a99c60a5d840b1fd5947f080de508` |
| media.tgz (4 files) | `342b8a41ca4ff6758dd6e6cb9761329fdda2a1c005db21fd7ee1a3ca9a90989c` |
| radar-state.tgz | `1207cb75b3418c1950b3b8c94b74bde93109ebdd90497fceea016d5ed0264c03` |
| staging-config.tgz (radar.env excluded) | `a12ad551993a76710577639d40072596aa903b9ba4e2d86b0580dec95976d6ea` |

Rollback reference: previous production deployment of the staging project `4c5oiug6a`.

## Validation (observed)

| Check | Result |
|---|---|
| `/`, `/launchpad`, `/earn`, `/launchpad/create` | 200 |
| `/v1/launches?limit=50` via staging origin | 200, 9 launches, chainId 10143, source `MONAD_EVENT_INDEXER`, lag 8 (after 66 421-block catch-up) |
| `/api/referrals/health`, `/api/media/health` | 200 / 200 |
| Referral challenge correct origin / wrong origin | 200 / 403 |
| Existing media file via same origin | 200 `image/webp` |
| Gateway `/admin` direct | 404 `STAGING_GATEWAY_ROUTE_NOT_ALLOWED` |
| Bundle scan | 0 `*.trycloudflare.com` hostnames, 0 `//v1` |
| Browser network (Playwright MCP) | `GET <origin>/v1/launches` 200, `GET <origin>/v1/pairs` 200, `POST testnet-rpc.monad.xyz` 200 |
| Staging Playwright (`e2e/staging.config.ts`) | **12/12 passed** (desktop 1440 + mobile 390) |
| Routed-failure Playwright (`e2e/live/discovery-failure.spec.ts`) | 8/8 passed (unreachable, HTTP 502, wrong-chain, genuine empty × 2 viewports) — ROUTED FIXTURE |
| Unit | gateway 3/3, deploy render 2/2, retro-ui media 4/4, frontend 17/17, typecheck OK |

Screenshots: `evidence/hackathon/metropolis/staging/20261012-live-recovery/launchpad-{desktop,mobile-390}.png`.

## Durability matrix

| Scenario | Observed |
|---|---|
| Agent terminal exit | Services owned by `user@1000.service` (cgroup `…/app.slice/retropick-*.service`), not the agent's `/non-systemd` tree; still running in subsequent fresh agent shells |
| Service crash (`kill -9` indexer) | systemd restarted it in ≤6 s (`NRestarts=1`), `/health` 200 |
| Tunnel disconnect (`kill -9` cloudflared) | 18:42:36Z kill → 18:42:52Z new URL `thumb-visitor-alias-walks…` → 18:42:56Z edge OK → 18:43:16Z redeploy `19tu0sna9` done; site + rewrites 200, bundle unchanged (`index-DAG_0gX6.js`, no tunnel host) |
| Application redeploy | Two redeploys; indexer DB/cursors untouched, lag stays ≤ 64 |
| WSL VM stop | **Not tested** (forbidden). Expected: services stop; the enabled target restarts them at WSL boot, the tunnel rotates and auto-redeploys |

## Limits / honest caveats

- The quick tunnel has no uptime guarantee and rotates; recovery is automatic (~40 s), not zero-downtime.
- The host is a WSL VM on the operator's Windows machine; durable ingress = named tunnel or the Contabo proposal.
- Indexer lag is close to the 64-block stale threshold during heavy blocks (observed 8–58).

## Next lane

Envio live ingestion (P0) — `20261012-envio-live.md`.
