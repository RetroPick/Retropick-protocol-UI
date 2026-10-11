# Staging Environment Matrix

Classification legend — Public: ships in the browser bundle by design. Secret: server/CLI
runtime only, never in `VITE_*`. Session: interactive auth, never scripted.
Rotation column = what to do when a value changes/leaks.

| Variable / value | Runtime | Consumer | Required | Classification | Source of truth | Configure in | Validation | Rotation |
|---|---|---|---|---|---|---|---|---|
| `VITE_DATA_MODE=live` | Browser build | retro-ui env.ts (fail-closed: throws without indexer URL) | Yes | Public | repo decision | `vercel env` (staging project) | live page renders, no DEMO badge | change → redeploy |
| `VITE_INDEXER_URL=<tunnel>` | Browser build | indexer-client (envelope: chainId 10143 + MONAD_EVENT_INDEXER) | Yes | Public | `.staging/tunnel-url` (rotates) | `vercel env` | `/v1/launches` returns indexed rows | tunnel restart → update env + re-render vercel.json + redeploy (runbook §rotate) |
| `VITE_MONAD_RPC_FALLBACK_URL=https://testnet-rpc.monad.xyz` | Browser build | publicClient failover | Yes (public RPC only — build guard rejects infura.io/credential URLs) | Public | Monad official endpoint | `vercel env` | `eth_blockNumber` from browser console | change → redeploy |
| `VITE_MONAD_RPC_URL` | Browser build | publicClient primary | Optional | Public (must be credential-free) | operator | `vercel env` | build guard enforces | change → redeploy |
| `VITE_IPFS_GATEWAY` | Browser build | media URI resolve | Optional (default ipfs.io) | Public | — | `vercel env` | logo renders | change → redeploy |
| Tunnel rewrites (api/referrals, api/media → tunnel) | Vercel edge | vercel.json rewrites | Yes | Public (tunnel URL) | rendered from template | root `vercel.json` (gitignored, rendered) | rewrite health endpoints return 200 | rotate with tunnel (runbook) |
| `MONAD_TESTNET_RPC_URLS=https://testnet-rpc.monad.xyz` | Indexer (host) | provider pool | Yes | Public | start-backend.mjs | process env | /health providers healthy | restart service |
| `REFERRAL_ORIGIN=https://<staging-url>` | Referral svc (host) | strict origin check + Secure cookie | Yes | Public value (exact match) | staging URL | process env (start-backend --origin) | challenge 200 w/ correct Origin; 403 wrong | change when staging URL changes |
| `MEDIA_ORIGIN=<staging-url>` | Media svc (host) | upload Origin allowlist | Yes | Public value | staging URL | process env | upload 403 without origin match | same |
| `MEDIA_PUBLIC_BASE=<tunnel>` | Media svc (host) | local-mode public image URIs | Yes (local mode) | Public (tunnel URL) | `.staging/tunnel-url` | process env | returned URI fetchable over HTTPS | rotate with tunnel |
| `PINATA_JWT` | Media svc (host) | IPFS pinning mode | Optional (local mode without) | **Secret — server only** | operator | media service env (never Vercel/VITE) | upload returns ipfs:// CID | rotate in Pinata dashboard |
| `ENVIO_API_TOKEN` | Radar svc (host) | HyperSync client | Envio only | **Secret — server only** | envio.dev (operator) | radar service env | real stream + /radar metrics | rotate at envio.dev |
| `CRE_API_KEY` / `cre login` | Agent host CLI | CRE simulate | CRE only | **Secret/session** | Chainlink account | CLI auth store | `cre workflow simulate` succeeds | `cre logout` + re-login |
| mm CLI auth + agent wallet | Agent host CLI | plugin order submission | MetaMask demo only | **Session (interactive)** | MetaMask | `mm login`/`init` | wallet-signed testnet order | `mm logout` |
| Root `.env.local` (foundry wallets, Infura keys) | Agent host | deploy/test scripts | gated lanes | **Secret** | operator file (600) | file only | n/a | operator procedure |

Invariants: no secret ever appears in `vercel env` for this project (audited: only 3
public VITE_* values set); the rendered root `vercel.json` and `.staging/` are gitignored
so no runtime URL or state enters git; `.env.example` files carry placeholders only.
