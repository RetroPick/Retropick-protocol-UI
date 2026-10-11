# External Blockers

Format per mission §22. Never print credentials.

## BLOCKER-001 — Vercel deployment access (retro-ui cutover)

- Sponsor: cross-cutting (public judge access for all browser-evidenced features)
- Required service: Vercel project configuration for `retropick-metropolis` (or a new project)
- Credential/access: Vercel dashboard/token — operator only
- Environment variable: n/a
- Current status: OPEN
- What was tested: read-only audit of `evidence/hackathon/metropolis/frontend-release.json`
  showing public deployment `dpl_FaVJ7e5y…` serves legacy apps/web (`currentUI` field)
- Blocking error category: credential/access
- Can local implementation continue: YES (retro-ui local preview + e2e)
- Can real E2E continue: YES (read-only live e2e against Monad RPC/indexer)
- Next owner action: create/point a Vercel project rooted at `apps/retro-ui` (live env vars
  per FRONTEND_SOURCE_OF_TRUTH.md) or approve the domain cutover

## BLOCKER-002 — Funded testnet signer (Stage 7 + live order re-validation)

- Sponsor: Kuru (new assets), optional Kuru consumer re-validation
- Required service: Monad Testnet wallet with MON for gas + market collateral/liquidity
- Credential/access: explicitly authorized funded test wallet (env-provided private key,
  session-scoped, never committed)
- Current status: OPEN — operator chose "authorize after P0 gate report"
- What was tested: none yet (authorization-gated)
- Blocking error category: financial authorization
- Can local implementation continue: YES (adapter code, docs, fork tests)
- Can real E2E continue: NO for signing campaigns (read-only live e2e unaffected)
- Next owner action: await P0 gate report, then authorize + provide funded wallet

## PROBE-001 — Envio HyperSync endpoint auth

- `GET https://10143.hypersync.xyz` → HTTP 401 (2026-10-11). Suspect API-token policy on
  the public endpoint. To be re-verified with the actual HyperSync client protocol in
  Stage 4; if a token is required and unavailable → BLOCKED_EXTERNAL for Envio.

## BLOCKER-003 — Envio HyperSync API token

- Sponsor: Envio ("Best Use of Envio")
- Required service: HyperSync data access at https://10143.hypersync.xyz (chain 10143)
- Credential/access: Envio API token (envio.dev dashboard) — operator action
- Environment variable: `ENVIO_API_TOKEN`
- Current status: OPEN — verified hard blocker
- What was tested: bare GET → HTTP 401; `@envio-dev/hypersync-client` 1.4.1 client
  construction → `Missing field apiToken` (mandatory field); envio CLI 3.14.0 and docker
  29.8.2 both work, so only the token is missing
- Blocking error category: credential/access
- Can local implementation continue: YES — done: aggregation core implemented + 8/8
  unit tests (`integrations/envio-market-radar`)
- Can real E2E continue: NO (needs the token)
- Next owner action: create the Envio token, set ENVIO_API_TOKEN, `npm install && npm start`
  in integrations/envio-market-radar, then wire the retro-ui consumption panel

## PENDING PROBES (Stage 6/7): MetaMask `mm` CLI installability, Aurora Intents route
support for the required source/destination assets, Nansen API entitlement.
