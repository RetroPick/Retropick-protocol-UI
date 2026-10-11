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
## BLOCKER-004 — Chainlink CRE account login (workflow simulation)

- Sponsor: Chainlink ("Best Workflow with CRE")
- Required service: CRE platform auth (`cre login` interactive flow or `CRE_API_KEY`)
- Credential/access: Chainlink CRE account — operator only
- Environment variable: `CRE_API_KEY` (none set in this environment)
- Current status: OPEN — verified: `cre workflow simulate` refuses to run unauthenticated
- What was tested: CLI v1.38.0 installed via the official install script; workflow project
  hand-built per documented structure and typechecks clean against @chainlink/cre-sdk
  1.23.0; simulate + init both demand authentication
- Blocking error category: credential/access
- Can local implementation continue: YES — done (workflow source complete, LOCAL_TEST_VERIFIED)
- Can real E2E continue: NO (simulation requires login)
- Next owner action: `cre login`, then `cd integrations/chainlink-cre && cre workflow
  simulate graduation-safety --target monad-testnet-settings --non-interactive --trigger-index 0`
>>>>>>> a1e2224 (feat(metropolis): chainlink CRE graduation safety workflow (simulation auth-gated))
## BLOCKER-005 — MetaMask Agent Wallet plugin install (npm-publish or CLI local-install bug)

- Sponsor: MetaMask Agent Wallet
- Required service: `mm plugins install <source>` with a verifiable source (npm) — local
  path/tarball installs hit a CLI 6.2.1 bug: the source is rewritten to
  `https://github.com//<abs-path>` and npm fails (verified with both directory and tgz)
- Credential/access: npm publish of @retropick/mm-plugin (operator decision) OR an
  upstream-fixed/newer CLI local-install path; wallet provisioning (`mm init`, auth) is
  additionally operator-interactive for any signing flow
- Current status: OPEN
- What was tested: mm CLI 6.2.1 installed (`mm doctor` ok, node 22.23 satisfies ≥22.18);
  plugin typechecks against @metamask/agent-wallet 6.2.1; bun-bundled dist +
  oclif.manifest.json generated; the CLI's own consent screen parsed the manifest and
  listed all 7 commands with their capabilities (wallet-submit flagged) — i.e. the plugin
  is structurally valid; install itself fails on the URL-mangling bug
- Blocking error category: external tooling bug + publish authorization
- Can local implementation continue: YES — done (policy core 8/8 unit tests)
- Can real E2E continue: NO (command execution needs successful install + init/auth)
- Next owner action: `npm publish` the plugin (or install from a git URL hosted on GitHub,
  which is a supported verifiable source), then `mm plugins install @retropick/mm-plugin
  --accept-permissions` and run the read-only commands
>>>>>>> 4d145f9 (feat(metropolis): metamask agent wallet plugin — risk-controlled trading agent)

## PENDING PROBES (Stage 6/7): MetaMask `mm` CLI installability, Aurora Intents route
support for the required source/destination assets, Nansen API entitlement.
