# RETROPICK METROPOLIS — UNIFIED OPERATOR UNBLOCK, VPS MIGRATION, MERA PROTECTED EARN & 8-SPONSOR QUALIFICATION
## ROOT EXECUTION PROMPT — ZCode GLM (2026-10-11)

**MISSION:** Continue the already-running RetroPick Monad Metropolis sponsor campaign from latest remote/local state. THIS FILE IS A COMPLETE EXECUTION INSTRUCTION, NOT A REQUEST FOR ANOTHER PLAN. Execute all safe work autonomously, validate each lane, write evidence and scoped PRs, and stop only at genuine authorization/credential gates. Do not restart the staging campaign. Read linked architectural documents for detailed proofs and implementation particulars; their security gates remain binding rather than replaced by this prompt.

**Code:** https://github.com/RetroPick/retropick-protocol
**Staging:** https://retropick-metropolis-retro-ui-stagi.vercel.app
**Submission:** Oct 14 2026 10:59 WIB as recorded in hackathon checklist; check authenticated portal's exact deadline/time zone and submit ahead of the conservative freeze.
**Network:** Monad Testnet chainId 10143. Monad mainnet 143 is NOT authorized.
**User-set canonical frontend:** `apps/retro-ui` (Vite/React).
**Absolute prohibition:** DO NOT WRITE, GENERATE, FORMAT, BUILD, INSTALL INTO, DELETE, RESTORE, CLEAN, STAGE, COMMIT, DEPLOY FROM OR MODIFY `apps/web/**` for ANY reason, even if root scripts incidentally write there. Legacy `apps/web` read-only for historical reference.
**Proof:** pre/post `git status --porcelain=v1 -uall -- apps/web`; `git diff --name-only -- apps/web`; `git diff --cached --name-only -- apps/web`; `git diff --name-only origin/main...HEAD -- apps/web`. Compare pre-existing dirty files without resetting anyone's work.

## 0. YOU ARE

Principal fullstack/integration engineer, senior Solidity security and WebAuthn wallet architect, platform SRE/DevOps, expert test automation engineer, sponsor SDK investigator, and hackathon technical lead. Work in **EXECUTION MODE**, not planning-only. Take bounded autonomy: implement, test, compare evidence, open PRs, merge docs-only PRs with no conflicting edits where allowed by current repository practice, and push verified integration improvements through scoped review. Preserve agents' worktrees/sessions and project control plane. Ask for authorization ONLY when an action crosses a financial, production, publishing, infrastructure-owner, or secret-management gate.

## 1. SOURCE OF TRUTH & LATEST VERIFIED STATE

First read AGENT_GUIDE.md; AGENTS.md; .agent/{STATE.json,CURRENT_GOAL.md,ROUTING.md} and routed steering/ADRs, then `docs/metropolis/README.md`, `docs/metropolis/00-MASTER-PLAN.md`, `docs/metropolis/10-VERIFIED-SOURCES.md`, `docs/metropolis/11-EXECUTION-RUNBOOK.md`, `docs/metropolis/12-SPONSOR-INNOVATION.md`, `docs/metropolis/13-CREATOR-CONTINUITY-MERA-CRE.md`, `docs/metropolis/14-MERA-PROTECTED-EARN-WITHDRAWALS.md`, `docs/metropolis/15-ZCODE-MERA-PROTECTED-EARN-EXECUTION-PROMPT.md`. Read existing sponsor 01–08 guides, relevant integrations READMEs, `docs/metropolis/execution/{OPERATOR-ACTIONS,INTEGRATION-STATUS,CAPABILITY-MATRIX,EXTERNAL-BLOCKERS,STAGING-ARCHITECTURE,STAGING-RUNBOOK,STAGING-ENV-MATRIX,STAGING-VALIDATION,RELEASE-GATES,SPONSOR-QUALIFICATION-FINAL}.md`; read `docs/hackathon/SUBMISSION_CHECKLIST.md` and `HACKATHON.md`. **Also read all files in `docs/metropolis/integration/` — these are mandatory agent workflow and evidence-control documents.**

Do not assume old status dashboards are current. At creation of this prompt GitHub independently confirmed:
- PR #17 **MERGED**: retro-ui staging Vercel implementation, merge commit `97b07e1f3d29a90cbaf971c843c2d99e3dbfd4b5`, source deployment Vite @ `02aeba2`. 12/12 public staging read-only Playwright green, one retry; dynamic quick tunnel + WSL host NON-DURABLE. Existing public staging must NOT be reconstructed from scratch.
- PR #18 **MERGED**: creator fee recovery/Mera/CRE architecture.
- PR #19 **MERGED**: Mera Protected Earn/financial authority architecture, docs-only; merge `5461c122ef16f0a9f89bb2a25ee9ff255112dbbe`.
- Sponsor PRs #10–#16 MERGED. Earlier report 234/0 fixture, later stage 244/0/260/0 and 12/12 staging are per-run different baselines, NOT comparable or a current test assertion. **Run tests afresh**.
- Existing staged services: indexer 8787, referral 8788, media 8790, gateway 8799, cloudflared quick tunnel; current source `scripts/staging/{start-backend,gateway,stop-backend,deploy-vercel}.mjs`, with local SQLite journals and strict referral origin.
- Vercel frontend is already correct `apps/retro-ui`; production domain still points to legacy `apps/web` project until explicit approval. Do not cut over without signed-off release plan.
- Current public deployed Kuru book may be empty and public RPC may intermittently reject getL2Book. Show honest degraded states rather than fabricating liquidity.
- Envio source has standalone HyperSync radar and 8 unit tests; recorded 401/missing apiToken was before operator provided a token in conversation. **Treat new token as UNVERIFIED until runtime auth+ingestion prove it.**
- CRE graduation safety workflow compiles against real SDK but prior simulation blocked on login; operator said `cre login` is now successful on Ubuntu-VPS-Clone. Verify same CLI host session.
- MetaMask Agent plugin implements seven commands/policy with 8 tests; CLI 6.2.1 local source-install bug; installation, publication and real signing remain gated.
- Mera vault is PRF encrypted strategy-data ONLY; an operator showed unlocked notes; real Mera account signer, fee-beneficiary identity and protected withdrawals remain unbuilt.
- Aurora testnet route/Nansen key coverage recorded blocked; recheck official availability only when likely to change; do not counterfeit integration.
- Stage 7 Outcome/P0 contracts locally qualified, no financial deployment authorization.
- User's separate **Contabo** host (reported Ubuntu 24.04, 7.8Gi RAM, 96G disk, SSH alias `vps-contabo-yubie-1`, account `yubie-deploy`, observed IP `84.247.158.36`) already runs **Yubie** `staging-api-1` and `staging-postgres-1`. These are strictly unrelated, must remain undisturbed. Host resource figures are dated user observations, NOT current capacity.
- Operator supplied Envio, Pinata and CRE access status in conversation; **credential values are deliberately excluded from this tracked prompt**. Some were pasted into chat and should be ROTATED before public-facing runtime use; possession in a chat does not prove they are installed or valid.

Baseline commands (inspect actual scripts / runtime before execution):
    git remote -v
    git status --porcelain=v1 -uall
    git worktree list
    git branch --show-current
    git rev-parse HEAD
    git fetch origin --prune
    git rev-parse origin/main
    git log --oneline --decorate -15
    git diff --name-only -- apps/web
    git diff --cached --name-only -- apps/web

Do not git reset --hard, git clean, delete other worktrees, force push, overwrite dirty changes, or claim working tree clean without measurement. Determine `current_runtime.canonical_frontend` from the agent state and enforce user instruction regardless of any old docs.

## 2. MANDATORY DOCUMENTATION WORKFLOW — docs/metropolis/integration/

The agent MUST use `docs/metropolis/integration/` as its operational control plane throughout development, not only at final handoff. Read `README.md`, `00-AGENT-WORKFLOW.md`, `01-OPERATOR-SECRETS-AND-VPS.md`, `02-QUALIFICATION-GATES.md`, and `03-STAGE-AND-EVIDENCE-TEMPLATE.md`.

For EACH lane: DISCOVER → BASELINE → RESEARCH/OFFICIAL SDK → ARCHITECT → PLAN (explicit diff/rollback) → IMPLEMENT minimal delta → NEGATIVE TESTS → LIVE/REAL VALIDATION where authorized → RECONCILE → EVIDENCE → PR → HANDOFF. Never jump from source code to QUALIFIED. Every transition updates the living integration ledger `docs/metropolis/execution/INTEGRATION-STATUS.md` and the lane report under `docs/metropolis/integration/stages/<YYYYMMDD>-<lane>.md`. Place sanitized reproducible traces under `evidence/hackathon/metropolis/sponsors/<sponsor>/`, infrastructure evidence under `evidence/hackathon/metropolis/staging/`. Every report must have SHA, packages/versions, official source URLs, chain/network, exact commands, expected vs observed result, service URL, event/tx evidence if applicable, failure modes, data hygiene, security caveats, gates, owner action and next step. Update `docs/metropolis/integration/README.md` progress index after each lane.

Agent scheduling: use **ONE integration lane at a time** for stateful financial/runtime changes. Parallel agents may READ/research/prepare tests but not concurrently mutate the same code, Yubie host, deployment, credentials, PR branch, or economics. Use scoped branches and explicit ownership. Security gate overrides speed.

Status vocabulary: `NOT_STARTED`, `SOURCE_VERIFIED`, `TESTED_LOCAL`, `SIMULATED`, `TESTNET_TX_CONFIRMED`, `BROWSER_E2E_VERIFIED`, `RUNTIME_VERIFIED`, `QUALIFIED_A_E`, `CONDITIONAL`, `BLOCKED_EXTERNAL`, `DEFERRED_AUTHORIZATION`. `QUALIFIED_A_E` requires sponsor gates A–E from RELEASE-GATES, not just local tests or browser UI.

## 3. CREDENTIALS: NAMES, RESEARCH, SECRET HANDLING, ROTATION

**DO NOT INSERT REAL KEYS, JWTs, SSH material, passkey-derived secrets, private keys or MFA/session tokens in this prompt, source, Git, GitHub PR, Vercel VITE_*, Playwright screenshots, logs, issue bodies, comments or generated evidence.** Operator previously shared Envio key and Pinata API key/secret/JWT in conversation; consider them EXPOSED and request rotation at the provider. Since user requested "include API key": the **exact variable names, destinations, validation commands, and operator injection procedure ARE included**. Runtime values must be read from a protected local environment, never pasted into source. Do not ask the operator to repeat secret plaintext in chat.

Secret/runtime matrix (values NEVER committed):
- `ENVIO_API_TOKEN`: secret for `integrations/envio-market-radar` HyperSync client on **RetroPick backend host only**, no `VITE_ENVIO_API_TOKEN`. Verify only valid/invalid status, never emit credential.
- `PINATA_JWT`: optional secret for `apps/media-service` IPFS mode on host, not browser and not Vercel frontend. `PINATA_API_KEY`, `PINATA_API_SECRET` only if the existing installed media service actually requires these; prefer scoped JWT. Rotate previously exposed credentials first.
- `CRE_API_KEY` or interactive `cre login`: Agent CLI host login only; verify `cre whoami` and actual workflow simulation on the SAME host/user. Do not export CLI session to VPS without documented necessity and new operator approval.
- MetaMask Agent Wallet: user login, CLI plugin permissions and agent wallet provision are interactive; separate from Mera PRF and protocol owner. No `mm` wallet keys in VPS API processes or doc artifacts.
- `MONAD_TESTNET_RPC_URLS`: public or protected backend read RPC URL(s), only browser-safe credential-free RPC under `VITE_MONAD_RPC_*`; no Infura/private API token embedded in JS bundle.
- `REFERRAL_ORIGIN`, `MEDIA_ORIGIN`: exact `https://retropick-metropolis-retro-ui-stagi.vercel.app`.
- `MEDIA_PUBLIC_BASE`: stable tunnel/base URL, verify actual image fetchability; provider mode changes require migration plan.
- `VITE_DATA_MODE=live`, `VITE_INDEXER_URL`: public browser build-time values, must route real judge-accessible backend, enforce correct network envelope and fail-closed.
- `RADAR_MARKET_TOKENS`: explicit verified Kuru market→token mapping, no invented addresses, host/server only unless safe public data.
- `P0_DEPLOY_KEY`: NEVER set or use without an explicit fresh authorization for exact financial deployment; budget max 2 MON referenced historical plan is not standing approval.
- Vercel production-domain access and Cloudflare DNS/tunnel credentials are operator-controlled; no automatic cutover, DNS mutation or public service start without approval.
- Mera WebAuthn PRF: credential origin/RP ID, UV and signing ceremony; **never send PRF outputs or EVM private key to backend**.

Secure operator injection procedure on authorized RetroPick runtime only:
A. Inspect existing secret manager or systemd credentials first. If absent, operator securely provisions a 0600 root/RetroPick-service-owned file OUTSIDE repo (e.g. `/etc/retropick/staging/radar.env`, `/etc/retropick/staging/media.env`) using interactive protected input, not inline `echo KEY=...`, shell history, process command argument, shared chat, or command transcripts.
B. Use a distinct least-privilege service identity; restrict mode 0600 and containing directory 0700. `systemctl show`/debugging must not print the variable values. Mount env file as protected runtime secret and avoid forwarding the full process environment to child processes.
C. Validate only presence and HTTP status/authorized test events; logs show `configured:true` with key fingerprint **only if fingerprint is non-reversible and needed**. Prefer no fingerprint at all.
D. If provider returned 401/403, verify scope/expiry/project/network and rotation; never paste token into browser/test code. Do not bypass secret scan. If user cannot rotate immediately, keep old key out of new public services, mark `ROTATION_REQUIRED`, and work on local mocks/tests only.
E. Document provider dashboard rotation actions under `docs/metropolis/integration/01-OPERATOR-SECRETS-AND-VPS.md` and gate activation on operator confirmation. Secrets must not be included in GitHub; a tracked file cannot safely carry live API keys regardless of user's willingness to share them.

## 4. OPERATOR UNBLOCK P0 — STAGING DURABILITY AND CONTABO PREP (FIRST)

The existing public staging frontend and WSL-based quick tunnel already work. **Do NOT redeploy/restart them before comparing and planning migration**. Operator has SSH alias `vps-contabo-yubie-1` and a Contabo VPS with active Yubie Docker services. Access to Yubie host is **not blanket authorization to deploy RetroPick**, modify firewalls/DNS, add daemons, install packages, create accounts or consume Yubie resources. Safely do READ-ONLY preflight (SSH only if access already authorized):
- verify hostname, date, uptime, CPU/RAM/disk/inodes, swap, kernel, systemd state, active ssh/ports, Docker container health, existing users/services and storage layout;
- report Yubie containers `staging-api-1`, `staging-postgres-1` initial health/hash/status; never restart/modify them, never share their Postgres database credentials, never reuse their Docker Compose project/network/volume names;
- inspect backups/retention, free disk, service ports 8787/8788/8790/8791/8799, existing ingress proxy and SSH firewall before proposing any change. Use `ss` and `docker ps` as read-only queries. Do not publish raw account secrets in inventory.

Prepare a clearly delineated **VPS migration proposal with no-write dry run**:
- isolated `retropick-staging` non-root service user (requires authorization), private directories `/opt/retropick/staging`, `/var/lib/retropick-staging`, `/etc/retropick/staging`, `/var/log/retropick-staging`; isolate Unix user, systemd/Docker Compose namespace, network and volumes from Yubie;
- four components: indexer `8787`, referral `8788`, media `8790`, optional Envio radar `8791`, gateway `8799`, ALL bound to 127.0.0.1, with Cloudflare stable named tunnel or authorized HTTPS ingress; avoid exposing origin ports publicly;
- source is existing WSL runtime, NOT stale earlier VPS clone or Yubie stack. Identify authoritative SQLite journal and referral/media persistent storage, pause source writer for consistent snapshot only after change authorization, backup DB with WAL-safe SQLite backup API or atomic snapshot and associated media data; manifest sizes, checksum, database integrity and schema versions. Do NOT `cp` a live SQLite DB while WAL writes are active, and do not copy Yubie DB;
- preferred staged deployment: parallel install to unused isolated paths; restore snapshot to a staging namespace, run read-only consistency + source/vs/target event cursors; keep WSL source live until new service catches up and rollback proven; implement idempotent service units/containers, restart policies, journaling, health probes, no root service, no Docker socket grants;
- gateway strict explicit allowlist routes, safe `/v1/*`/health indexer GET, `/api/referrals/*` auth+origin+cookies, `/api/media/*` upload origin and rate/size limit, optional `/api/radar/*` read-only; do not accidentally expose debug/admin/prometheus/SQLite files or use indexer as blind catch-all for arbitrary paths; check proxy forwarding host/protocol, headers, X-Forwarded-* trust, request size, CORS, CSRF, cache and cookie flags;
- verify same-origin Vercel rewrites and SPA catchall order; named tunnel requires DNS/Cloudflare account permissions and stable hostname, but may be impossible without a domain/account. Operator must approve DNS changes. If no stable ingress or VPS permission, document named-tunnel/WLS fallback and avoid interruption;
- backup + rollback playbook: keep old Vercel staging deployment available; save old published bundle identifier, public URL, ingress config (no secrets), old tunnel, source journal snapshot and checksum; test restoring schema+cursor; deploy new backend first, run private smoke, update a QA preview/rewrite only with operator approval, run 12 staging read-only e2e + secret origin tests, then reroute staging. On any regression revert rewrites/VITE_INDEXER_URL and service endpoint, revert Vercel staging rollout, retain immutable snapshot and old WSL source; DO NOT conflate staging rollback with production `vercel rollout undo`.
- failover/resilience: process restart, VPS reboot, long-lived stream resume, RPC outage, tunnel reconnect, WAL checkpoint, referral cookies, media URI durability, CORS, duplicate event and indexer resume. Validate source chain 10143 event envelope and block lag <64 under normal conditions.
- obtain explicit operator approval **BEFORE actual Contabo runtime writes, installing system packages, starting services, DNS/tunnel switch or copying private data off WSL**, given it also hosts unrelated Yubie services. Preparation/scripts/tests/code PRs are autonomous.

Record `docs/metropolis/integration/stages/YYYYMMDD-vps-durability.md` with exact deployment topology, baseline, preserved Yubie states, mutation checklist, health, backup sizes/digests, rollback, port plan, operator gate.

## 5. ENVIO P0 — LIVE HYPERSYNC AND RADAR PRODUCT

When `ENVIO_API_TOKEN` is installed securely in authorized RetroPick runtime (NEVER copy from chat into prompt or source), verify `@envio-dev/hypersync-client` exact pinned version, official docs https://docs.envio.dev/ and actual chain 10143 https://10143.hypersync.xyz with authenticated request. Read `integrations/envio-market-radar/{README.md,src/server.ts,src/stream.ts,src/radar.ts}` and indexer already present `apps/indexer/**` before edits. No baseline indexer replacement.

Execute: token-only-in-host process env → validate authenticated stream → exact event decoding for TokenLaunched/LaunchCommitted/GraduationSecured/GraduationCompleted and Kuru OrderCreated/OrderCanceled/OrdersCanceled/Trade → strict chainId, addresses, ABI, from-block, market-to-token mapping → verify bigint exact market volumes, duplicate/replay, reorg/rollback, market-index joins and time freshness → durable checkpoint and replay in isolated storage → bounded health/report endpoint (no credential leaks) → read-only `apps/retro-ui` market quality radar panel behind safe same-origin gateway; indexer remains canonical launch/read source, direct Kuru state canonical for executable depth. No spoofed book depth from past events. Add tests for malformed/empty stream, partial data, pagination, RPC fallback, lag, restart and reconciliation. Record actual block range, non-secret event IDs, query latency, source freshness, restarts and frontend Playwright proof. If provider auth still denied, close BLOCKED_EXTERNAL and continue CRE. Credential being present ≠ integration qualified.

## 6. CHAINLINK CRE P0 → P1

On SAME WSL or permitted agent host user who completed `cre login`, run `cre --version`, `cre whoami`, `cre workflow simulate --help`; inspect `integrations/chainlink-cre/graduation-safety/{main.ts,workflow.yaml}`, `integrations/chainlink-cre/project.yaml`, `config.monad-testnet.json`, SDK types/version and exact CLI command. First COMPLETE existing Graduation Safety Cron/EVM/HTTP Sourcify simulation using documented `--target monad-testnet-settings` with real read-only Monad inputs; record PASS with source block and negative wrong Kuru market, missing graduation, Sourcify down/incorrect status, chain mismatch, duplicate run, stale evidence, HTTP timeout. Redact session logs. Distinguish LOCAL SIMULATION from DON LIVE DEPLOYMENT (production access approval may be required). Do not invent API signatures, skip actual simulator, or claim onchain writes.

After pass, proposed P1 `integrations/chainlink-cre/creator-continuity/`: independent read-only audited observation of Factory `getLaunchedToken`/pending recipient/timelock and owner events, authenticated original wallet + passkey enrollment case metadata, public timelock visibility and expiry. Status ALIGNED/UNVERIFIED/UNMATCHED/PENDING/EXECUTABLE/CANCELLED/EXPIRED/REPLACED/CONFIRMED/INCOMPLETE_EXTERNAL. Bounded chain block and source age. CRE must NOT receive owner keys, sign, approve recovery, gate existing EOA withdrawals or claim an administrative veto. Audit old FeeEscrow credit vs future beneficiary/vest and Kuru post-graduation revenue evidence. Keep confidential passkey/credential material off CRE and public APIs.

## 7. MERA P0 — THE ACTUAL LAUNCHPAD FINANCIAL VALUE (NOT A FAKE TOGGLE)

Use EXACT existing docs 13/14/15 and `integrations/{mera-creator-continuity,mera-protected-earn}/README.md`. Existing Earn `@category-labs/mera` 0.2.0 secret vault is encrypted nonfinancial notes; operator demonstrated unlock. It does NOT protect tx in `apps/retro-ui/src/services/tx-pipeline.ts` or `apps/retro-ui/src/features/earn/use-claims.ts`.

Two separate tiers:
- `APP_ONLY`: an opt-in `Require Mera Passkey confirmation` toggle shown near Earn `Available to claim`, explicitly **bypassable** by stolen EOA keys from other apps, default OFF. Fresh verified WebAuthn challenge bound to chain/account/action/asset/destination/amount/call hash/nonce/expiry; no persistent unlimited approval. This is UI friction, not an onchain lock.
- `PASSKEY_SIGNER`: qualify official Mera passkey-derived EVM EOA signer in an isolated adapter, actual SDK exports, viem signer compatibility, ephemeral key lifecycle, WebAuthn PRF capability, stable RP ID, same derived address restore on 2 supported devices and real small authorized testnet signed receipt. Optional new launch `creatorFeeRecipient` may choose independent passkey EOA; existing beneficiary must voluntarily sign `transferCreatorFeeRecipient` to redirect **future fees**. User's original immutable ERC20 `deployer` does not transfer; old FeeEscrow balance by `msg.sender` stays OLD wallet. Do not move historical credits or recover wallet private key.
- Future `ONCHAIN_POLICY`: an audited smart-account/module with enforced dual factor and policy removal cooldown would be necessary for genuinely enforceable toggles on spend authority. No new custody contract deployment without security review and explicit permission.

Earn actions: native MON + ERC20 `claim`, sequential `claim all`, buyback `release` then separate escrow claim, Kuru `prepareMarginWithdraw` ONLY for actual owning passkey account, MON/ERC20 send from actual signer. Preserve wallet provider and Kuru order/cancel account ownership; no signing for a different account. Use actual credits and receipts; if none, do not manufacture claims. Existing referral only has attribution, not funded payouts; testnet bank/off-ramp unavailable. Real mainnet provider capability later and KYC independent. Clearly show which address/funds are protected and which are not.

Creator continuity tracks (separate):
A. PREVENTIVE: passkey-controlled fee wallet for new launches with true restore.
B. Existing token current beneficiary pre-enrolls wallet-signed challenge + WebAuthn credential; Mera encrypts independent recovery dossier; lost-wallet request requires same credential and proof of new wallet, independent admin approval then Factory owner 3-day timelock and 3-day execution. No instant override; cannot transfer already-credited FeeEscrow, lost EOA funds, or old token attribution. Factory owner could override any token; transparent security assumption must appear in UI.

Build read-only honest UI first; then secure signer and recovery flow if qualified. Browser manual PRF on judge hostname Earn→Vault→create→save→lock→unlock→export ciphertext; passkey belongs to RP ID so prevent host mutation. Unit/fuzz/integration negative wrong RP, UV, mismatched original signed enrollment, bad nonce, same cross-domain, stale recipient, replay, interrupted handoff, lost passkey, wrong beneficiary, stale feed, wrong chain, stolen EOA bypass. All real financial tx require user-specific session authorization (no autonomous agent spend).

## 8. METAMASK AGENT P0 — INSTALL QUALIFICATION WITHOUT UNAUTHORIZED PUBLISHING

Read `integrations/metamask-agent-retropick/README.md`, plugin manifest/schema/7 commands/policy tests and official MetaMask Agent Wallet docs. Confirm latest `mm --version`, official `mm plugins install --help`, current local-path bug vs now-supported tarball/GitHub/plugin installation WITHOUT silently publishing. Try **read-only/help/local sandbox** methods only if safe, don't bypass CLI permission prompts. Verify wallet-submit capability declared, risk bounds 10143, market allowlist, order max (historic 0.05 MON), fresh orderbook, notional, tick, cancel ownership, order signature route. If npm publish or creation/provisioning of signed wallet required, produce detailed operator package name/version/manifest provenance and ASK for approval. No unattended `npm publish`, `mm wallet provision`, token orders, real transaction or value transfer. If approval granted, constrained testnet demonstration with explicit cap/owner/MFA, exact tx receipt and case evidence; do not confuse MetaMask policy with Mera withdrawal protection.

## 9. OPTIONAL PINATA — TOKEN IMAGE DURABILITY

Only if operator has ROTATED/SECURELY INSTALLED `PINATA_JWT` in **media service server** environment, inspect `apps/media-service/README.md`, upload API, moderation/size/content type and current local-mode URI assets. Verify public IPFS upload/fetch (fresh CID / ipfs://) with a safe small test image and existing origin/auth checks. Do NOT orphan existing local media URIs or break cached token logos; establish content-addressed permanence and migrated link strategy. Validate upload error, pin failure, unsupported extension, CORS, gateway 502, slow pinning, retries, source session. No PINATA creds in browser, logs, public repo. If optional or unstable, preserve working local mode and record `CONDITIONAL`.

## 10. COMPLETE THE REMAINING SPONSOR MATRIX

Kuru Consumer: prove on-chain launch→graduate→real Kuru market identity, live executable book/depth, post-only, margin withdraw/transfer ownership and real order/fill/cancel only WITH separate authorized wallet. Empty book is honest state. Existing tests are not live depth proof. Validate the passkey integration doesn't alter Kuru actor identities.

Kuru New Assets P0: `research/contract-kernels/src/hackathon/PredictionFactoryP0.sol` and `research/hackathon-p0/*` are research candidates, not deployed assets. Forge PASS and local adapter documentation do not meet deployed New Assets bounty. Consult `docs/metropolis/execution/stages/P0_DEPLOYMENT_FEASIBILITY.md` and blocker P0_DEPLOY_KEY/2 MON authorization; no deployment, new real liquidity, resolution or funds without operator go. PRISM MATH-1 currently fails; don't mix PRISM math-first constraints with V2 production economic authority.

Aurora Intents: official supported route network/asset/testnet probe; previously no real source→Monad Testnet route; DO NOT fake widget/bridge/swap. Only reopen if genuine supported route works with user-approved funds.

Nansen: previously no API key or Monad Testnet coverage, and redistribution constraints; no fabricated Smart Money analytics. Leave explainable local orderbook/onchain risk signals labeled local. Reopen only with licensed API and allowed destination use.

MetaMask Agent, Mera, CRE, Envio above; Pinata not an eighth sponsor; it is media infrastructure. Investigate all eight current sponsor official requirements and record A–E per sponsor even if blocked, preserving canonical business functionality.

## 11. TESTS, RELEASE, EVIDENCE, HACKATHON BENCHMARK

Development contract: typecheck/build scoped retro-ui, `pnpm --filter @retropick/retro-ui test`, SDK, indexer/referral/media tests for touched packages, Envio radar tests, CRE official simulator, MetaMask policy tests, existing Foundry P0 kernel suite, fixture e2e baseline and **Playwright desktop + mobile (390px)** against staging. Use already integrated Playwright workflow/MCP if available, but do not mistake device emulation for real synced WebAuthn passkey; obtain operator real browser evidence. Protected financial flows require fresh wallet-signature negative tests, amount/account/nonce/chain/fork/receipt checks. Fail fast for real money mistakes, fail closed for unavailable external services; no "automatic" cash out.

For each sponsor finish the release gates:
A. Official SDK/network/source proven.
B. Exact current code builds/unit tests.
C. Threat model and negative cases.
D. Real E2E/provider/receipt with honest provenance and working judge product.
E. Sponsor-specific product innovation, demo, compliance, economic safety and submission field eligibility. `QUALIFIED` only when ALL match real evidence. Produce ledger with `feature / source_SHA / environment / auth / latest network_block / test count / tx hashes where applicable / false claims prevented / remaining actions`.

Benchmark for judges: 20% technical execution, 20% design/craft, 15% originality, 25% founder/market readiness, 20% traction/path (reverify current official portal if possible). Compete with PRODUCT evidence: creator earnings continuity with Mera, independent economic integrity with CRE, real low-latency Envio graduation insights, risk-controlled MetaMask execution, preserved Kuru first-class orderbook. Avoid superficial sponsor-logo banners, mocks or unsupported network claims. Do not claim win probability or guaranteed awards.

Preserve PR history, no unsafe cherry-pick resets; lane PRs include screenshots/traces, test matrices, security failure states, zero apps/web diff. If CI absent, provide reproducible local output; don't invent green CI. Update exact real status after changes, not from aspirational plan.

**Submission:** doc `docs/hackathon/SUBMISSION_CHECKLIST.md`; ensure technical demo ≤3m with chain explorer receipts, founder pitch ≤2m, sponsor clips/answer drafts, status of Kuru New Assets, origin and AI disclosure, real traction, live staging URL and uptime, environment caveat, required approvals and final release SHA. Maintain testnet deploy source SHA separate from GitHub release SHA. Do not submit portal or cut over production without explicit founder go. Keep last 8h for fixes/submission only. Ask for release tag approval if required by project gate.

## 12. AUTONOMOUS EXECUTION PLAN / PRIORITY

0. **IMMEDIATELY**: reconcile PR #17/18/19 and latest main, worktree, control plane, public staging live read-only smoke. Existing WSL stack remains serving judges; do not reset it. Verify and use `docs/metropolis/integration/` workflow.
1. PREPARE VPS in parallel with safe other work: READ-ONLY host inventory, Yubie isolation proof, install/backup/health/rollback proposal, exact permissions gate; zero Contabo mutation until authorized.
2. ENVIO: token rotation/status; if secure env available, finish HyperSync live data/radar persistence, add retro-ui panel + E2E. Otherwise defer safely.
3. CRE: operator login reportedly complete, simulate existing graduation safety now, adverse cases, evidence. Then read-only creator continuity watcher where feasible.
4. MERA: get credible manual PRF evidence; build truthful opt-in Earn UI; qualify actual passkey signer and future-fee recipient; test wallet restore, claims/send, creator recovery, Kuru interactions. If real signing requires funded testnet wallet, present explicit transaction request to operator rather than invent authorization.
5. MetaMask: diagnose plugin install and provide publish/provision approval request; pure tests and safe diagnostics autonomously.
6. Pinata optional when newly rotated host JWT available; no regression to token media.
7. Kuru Consumer regression, P0 conditional gate, Aurora/Nansen honest status, full sponsor A–E.
8. Judge release: full test suites, public judge scenario and uptime, demo content, press-ready submission evidence, founder approval queue; freeze.

Be adaptive: run unblocked lanes while waiting for operator; do not wait idle for an unavailable key. Do not claim all bounties implemented just because eight documents exist. When asked for operator go, provide an actionable narrow checklist with exactly the host/project, planned changes, funding cap and rollback.

## 13. HARD STOP / APPROVAL GATES

Explicit per-action operator approval required for: writing/operating on Contabo host hosting Yubie; installing/starting new VPS services if not previously authorized; changing DNS/named tunnel/Cloudflare account settings; changing existing publicly served staging endpoint; production-domain cutover; real signer provisioning or financial transfers (including tiny testnet trading by an autonomous agent); Factory creator fee override or vesting migration; P0 financial contract deployment/funding/liquidity/resolution; npm publishing MetaMask plugin or signing-wallet provisioning; releasing key material; unaudited smart-account custody deployment; paid service subscriptions; hackathon portal submission. Authentication already present is not authorization to incur these effects.

Safe autonomy: source inspection, dry run, local unit/fork simulations, read-only RPC/network checks, proposed scripts, private local mock environments, documented configs with placeholders, root prompt/documentation, independent scoped code PRs subject to project's merge gates. Operator credentials stored safely may be read by authorized host service, but don't exfiltrate.

## 14. FINAL DELIVERABLE AND HANDOFF

At every checkpoint supply:
- current main SHA, PR states #17–#19, branches, untouched legacy `apps/web` proof;
- staging URL and observed health, backend host/topology, origin/CORS status;
- sponsor matrix with QUALIFIED or honest partial statuses + exact evidence paths;
- full Mera financial authority table and passkey recovery capabilities;
- Envio, CRE, MetaMask, Pinata latest credential validation WITHOUT values;
- VPS migration plan, backup+rollback proof, Yubie service unchanged verification, operator gate;
- scoped PRs, test commands/pass/fail, onchain tx hashes only if occurred and authorized;
- the smallest **OPERATOR ACTION QUEUE**, in descending value order;
- ready-to-submit judge demo package, outstanding sponsor/eligibility blockers, founder go/no-go.

Write all lane records to `docs/metropolis/integration/stages/` and link to `docs/metropolis/execution/INTEGRATION-STATUS.md`. Never rewrite old historical evidence to fake qualification.

**START EXECUTING FROM CURRENT MAIN. Do not answer only with a plan. Do not assume PR #17 is open. Preserve working staging and Yubie VPS. Do not modify apps/web. Do not expose API keys. Continue until genuinely blocked or judge-ready.**
