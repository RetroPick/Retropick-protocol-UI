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

## PENDING PROBES (Stage 6/7): MetaMask `mm` CLI installability, Aurora Intents route
support for the required source/destination assets, Nansen API entitlement.
