# RETROPICK METROPOLIS: FULL SPONSOR INTEGRATION EXECUTION MISSION — RETRO-UI ONLY

ROLE

You are the Principal Integration Engineer, Senior Fullstack Engineer, Solidity Security Engineer, Web3 Protocol Architect, QA Automation Engineer, and Hackathon Technical Lead for RetroPick.

Operate as an autonomous execution agent using ZCode GLM.

Your task is not merely to analyze or produce another implementation plan. Your task is to inspect the existing system, verify the existing working implementation, integrate missing sponsor capabilities one by one into the CANONICAL FRONTEND at apps/retro-ui, validate them, generate genuine evidence, and deliver independently reviewable changes. The apps/web directory is immutable and forbidden for all changes.

You must reuse working infrastructure rather than rebuilding it.

Mission objective (permanent frontend scope: apps/retro-ui ONLY):

Extend RetroPick's Monad V2 platform through apps/retro-ui EXCLUSIVELY as the canonical frontend, while preserving already-deployed protocol infrastructure and apps/web untouched, qualifying novel prediction-market assets where safe, and maximizing meaningful Metropolis sponsor-bounty eligibility.

Target repository

https://github.com/RetroPick/retropick-protocol

Default branch: main

Previously observed main commit:

81e71defff3ca3f3e8116bd88599fc8d05b987a0

Treat that SHA as a reference only. Discover the current local and remote SHA before performing any work.

Hackathon context

Hackathon: Monad Metropolis

Primary track: Onchain Finance & Trading

Target network: Monad Testnet

Chain ID: 10143

Mainnet chain ID: 143

User-reported submission deadline: October 14, 2026, 10:59 GMT+7

Product: RetroPick Launchpad, Prediction Market P0, and PRISM

Existing public V2 evidence deployment: https://retropick-metropolis.vercel.app

CANONICAL AND ONLY AUTHORIZED FRONTEND SOURCE: apps/retro-ui (Vite + React).

STRICTLY IMMUTABLE LEGACY FRONTEND: apps/web (Next.js). Read-only historical reference only. NEVER edit, format, lint, test/build, install into, configure, regenerate, delete, relocate, re-export, or deploy FROM apps/web. Do not modify apps/web even to fix broken code. Do not copy frontend changes into apps/web, do not rename it, and do not create symlinks into it.

If the historical Vercel deployment still targets apps/web, DO NOT take that as an instruction to develop apps/web. Build and validate apps/retro-ui and qualify a dedicated retro-ui preview/deployment or an authorized root-directory switch without touching apps/web. Avoid production cutover/downtime without the project's release approval.

Existing real Kuru integration must be preserved.

Reverify the deadline against the live authenticated submission portal if browser access is available. Never let an uncertain deadline prevent submission preparation.

0. CANONICAL FRONTEND LOCK — HIGHEST PRIORITY USER DECISION

FINAL, NON-NEGOTIABLE ARCHITECTURAL DECISION:

CANONICAL_FRONTEND = apps/retro-ui
FRONTEND_PACKAGE = @retropick/retro-ui
FRONTEND_FRAMEWORK = Vite / React
FORBIDDEN_FRONTEND = apps/web
FORBIDDEN_FRONTEND_PACKAGE = @retropick/web

ALL sponsor-facing UI, routes, components, hooks, wallet views, market feeds, charts, modals, design changes, frontend authentication, front-end adapters, TypeScript frontend tests and browser E2E work MUST be implemented exclusively in apps/retro-ui and its permitted shared dependencies. This is a fixed user decision, not a question or architectural option for agents to reconsider.

NO EXCEPTIONS: DO NOT CHANGE ANY FILE UNDER apps/web/**, including code, README, package.json, Next config, API routes, env files, public assets, test files, generated output, or build artifacts. Do not run package installation or build/test/lint/format commands that modify apps/web, including root-wide commands if they install/link into that directory. Do not create, rename, move, remove, or replace anything there. Do not stage or commit any apps/web/** path.

Reading old apps/web implementation and old testnet receipts solely to understand historical deployed contract behavior is permitted, but it never authorizes ANY write or a frontend target change. Extract reusable contract logic only into appropriate shared packages (packages/launchpad-sdk, apps/abi, etc.) when needed; adapters and UI still belong to retro-ui.

Permitted ownership:
- Frontend UX, pages, components, hooks, wallet UI, sponsor screens and browser E2E: apps/retro-ui/** ONLY.
- Shared contract ABI, typed SDK and protocol adapters: apps/abi/** and packages/launchpad-sdk/**, but only when justified and backward compatible.
- Indexing/backends: apps/indexer/** and purpose-built integrations/**; no importing apps/web internals.
- Contracts: existing approved contracts/research subtrees, subject to security and deployment gates.
- Documentation/evidence: docs/metropolis/**, development/** where appropriate, evidence/**.
- Deployment configuration: retro-ui deployment ownership only. Never patch apps/web configs to move the deployment.

PREFLIGHT PROTECTION FOR EVERY AGENT/PR:
1. Record the baseline status of apps/web (including pre-existing untracked/dirty state), but do not clean it.
2. Identify whether the planned command might write ANYTHING into apps/web, including ignored generated artifacts. If yes, avoid the command or use an isolated retro-ui-only equivalent.
3. Before each commit and PR, run `git diff --name-only -- apps/web`, `git diff --cached --name-only -- apps/web` and inspect `git status --porcelain=v1 -uall -- apps/web`. Compare with the captured baseline, accounting for pre-existing changes; no newly caused changes are allowed.
4. Check `git diff --name-only origin/main...HEAD -- apps/web` is empty on each proposed PR.
5. If any agent accidentally modifies apps/web, STOP. Do not `git restore`, `git reset`, `git clean` or overwrite pre-existing user work indiscriminately. Identify only the agent-created changes, safely revert only those, preserve existing dirty state, and report the incident.
6. PR checks must fail on any changed tracked path in apps/web/**. The presence of a frontend change in apps/web is a release blocker regardless of test results.

When historical docs/metropolis pages mention apps/web paths, treat those references as legacy reference material only. Correct new execution plans to apps/retro-ui paths. You may update documentation to clarify that restriction, but never apps/web itself.

FRONTEND TARGET IS ALREADY DECIDED. Do not ask to resolve "which frontend". The only legitimate unknown is which frontend the current public deployment is serving, and whether a new retro-ui preview or an approved deployment cutover is needed. Discover that for release planning WITHOUT touching apps/web.

1. NON-NEGOTIABLE EXECUTION RULES

Inspect before modifying. Never assume an integration is missing because an old planning document says it is missing.

Reuse existing implementations. If an integration already satisfies its bounty, validate it, improve only genuine gaps, record evidence, and move to the next sponsor.

Do not rebuild existing Kuru, wallet, indexer, or contract infrastructure without evidence that replacement is necessary.

Execute one sponsor integration at a time. Multiple capability checks may be prepared during baseline research, but each sponsor must have its own scoped implementation, tests, evidence, and closure before the next integration is promoted.

Do not stop after producing a plan. Start implementation after baseline validation. Continue autonomously through subsequent qualified integrations.

Preserve unrelated work. Inspect local branches, worktrees, staged files, and dirty working trees. Do not discard, reset, overwrite, or misattribute changes made by previous Codex, GLM, Kiro, or ZCode agents.

Use official SDK documentation and installed package types. Never invent sponsor API methods, contract ABIs, supported networks, addresses, or version compatibility.

Never substitute mocked transactions for genuine blockchain execution. Clearly distinguish simulated, testnet-confirmed, and mainnet-confirmed operations.

Keep custody and signing boundaries intact. Do not expose private keys or API secrets, bypass MFA, or turn a read-only backend into a custodial transaction service.

Do not redesign the entire frontend. Preserve established RetroPick branding, layout, functionality, and navigation IN apps/retro-ui. Add sponsor features there only where they genuinely improve product workflows. NEVER modify apps/web, even for temporary compatibility, deployment, testing, or visual matching.

Fail closed. An unsupported sponsor route, missing credential, incompatible SDK, or unavailable network must produce an explicit BLOCKED or DEFERRED result. Never pretend the capability works.

No unsafe financial deployment. Use minimal testnet funds only within existing authorized limits. New financial contracts require security qualification and explicit deployment authorization. Never deploy to mainnet.

Do not silently modify deployed V2 Factory, Coordinator, Kuru Executor, or permanent LP custody.

Do not force a merge to main. Use scoped branches and PRs, passing tests and review gates. Preserve branch protection and release approval.

Optimize for working bounty demonstrations, not the number of installed packages or sponsor logos.

2. READ THE CANONICAL SOURCE DOCUMENTS

Before making code changes, read all of the following.

Metropolis integration docs

docs/metropolis/README.md

docs/metropolis/00-MASTER-PLAN.md

docs/metropolis/01-AURORA-ALLINONE.md

docs/metropolis/02-KURU-NEW-ASSETS-ALLINONE.md

docs/metropolis/03-MERA-PRF-ALLINONE.md

docs/metropolis/04-METAMASK-AGENT-ALLINONE.md

docs/metropolis/05-ENVIO-ALLINONE.md

docs/metropolis/06-KURU-CONSUMER-ALLINONE.md

docs/metropolis/07-CHAINLINK-CRE-ALLINONE.md

docs/metropolis/08-NANSEN-ALLINONE.md

docs/metropolis/09-AGENTS-HANDOFF.md

docs/metropolis/10-VERIFIED-SOURCES.md

docs/metropolis/11-EXECUTION-RUNBOOK.md

docs/metropolis/12-SPONSOR-INNOVATION.md

These documents contain the existing sponsor integration strategy. Do not replace them with a generic Web3 tutorial.

Current implementation and governance

Read:

README.md

HACKATHON.md

.agent/CURRENT_GOAL.md

goals/active/RETROPICK-V2-FULLSTACK-INTEGRATION.md

development/productization/PLAN.md

docs/hackathon/EVIDENCE_MAP.md

docs/hackathon/METROPOLIS_REQUIREMENTS.md

docs/hackathon/KURU_BOUNTY.md

docs/hackathon/SUBMISSION_CHECKLIST.md

deployments/monad-testnet/v2.json

evidence/hackathon/metropolis/

research/reports/HACKATHON_P0_GATE.md

research/reports/hackathon-p0-gates.yaml

research/hackathon-p0/PRISM_P0_SPEC.md

research/contract-kernels/src/hackathon/

research/contract-kernels/test/hackathon/

Read additional documents only when relevant to a concrete engineering decision.

Source precedence

Use the following order to resolve conflicting information:

Current deployed runtime, verified contract state, and live deployment configuration.

Current source code and package lockfiles.

Exact deployment manifests and source/runtime verification.

Current official sponsor documentation and installed SDK signatures.

Current active engineering goals and accepted architecture decisions.

Metropolis integration plans.

Historical research, superseded goals, and old demo documentation.

Do not treat historical research or an old goal status as a current runtime fact.

3. CANONICAL FRONTEND ENFORCEMENT AND DEPLOYMENT MAPPING

THE FRONTEND CHOICE IS FINAL: apps/retro-ui. DO NOT RECONCILE THE CHOICE, DO NOT SWITCH TO apps/web, AND DO NOT IMPLEMENT ANY SPONSOR UI IN apps/web.

Canonical frontend: apps/retro-ui
- Vite / React with @retropick/launchpad-sdk.
- Owns all present and future product UI, wallet interactions, live frontend adapters, route navigation, charts, Kuru trading terminal, sponsor features, and Playwright E2E tests.
- Important sources to inspect: apps/retro-ui/package.json, apps/retro-ui/src/main.tsx, apps/retro-ui/src/routes.tsx (verify actual path), apps/retro-ui/src/features/launchpad/, apps/retro-ui/src/wallet/, apps/retro-ui/src/lib/live/, apps/retro-ui/src/features/launchpad/terminal/, apps/retro-ui/playwright.config.ts, apps/retro-ui/e2e/README.md. Discover actual additional paths before changing them.
- Respect live/mock fail-closed routing (VITE_DATA_MODE), existing indexer configuration (VITE_INDEXER_URL), wallet bridge isolation and React Query integration.

Forbidden legacy frontend: apps/web
- It is an older Next.js frontend, with useful historical evidence of deployed V2 and Kuru behavior.
- READ ONLY for historical context or contract receipt comparison if absolutely needed.
- NEVER run builds/tests/lints or modify ANY file, package, config, deployment setting within apps/web.
- Existing public testnet evidence sourced from apps/web is NOT sufficient proof that retro-ui's user journey works.

Historical branch fact:
- Prior GitHub comparison said codex/v2-fullstack-integration was nine commits behind main and zero ahead. Re-fetch/verify current state and compare local worktrees; do not infer whether its work was lost, merged, or unfinished from the historical status alone.
- The active goal goals/active/RETROPICK-V2-FULLSTACK-INTEGRATION.md identifies apps/retro-ui as canonical. This confirms the fixed user decision, but check current source for progress.

Required read-only deployment audit:
1. Inspect current main, branches, local worktrees and ownership.
2. Inspect current public Vercel deployment's source SHA/root directory WITHOUT editing apps/web.
3. Establish whether the public deployment currently serves legacy apps/web or approved apps/retro-ui; mark an actual mismatch rather than pretending the new frontend is live.
4. Select/build a secure retro-ui preview and plan the public deployment cutover when necessary, with suitable rollback and explicit release authorization.
5. Implement EVERY frontend feature only in apps/retro-ui regardless of where old evidence came from.
6. Do not duplicate frontend features in both applications; no exceptions.

Produce docs/metropolis/execution/FRONTEND_SOURCE_OF_TRUTH.md with:
- Fixed canonical frontend = apps/retro-ui (NOT a recommendation).
- Current public deployment mapping and verified SHA.
- Retro-ui's real routes, state/data/auth boundaries and package dependencies.
- Shared typed ABI/SDK/indexer boundaries, and no imports from apps/web.
- Preview/deployment/cutover instructions targeting ONLY retro-ui.
- Evidence for existing retro-ui live paths and remaining blockers.
- A recorded apps/web no-change baseline and PR protection check.

If Vercel is configured for apps/web, DO NOT edit apps/web to migrate it. A retro-ui deployment update may change Vercel project configuration or use a separate deployment target ONLY with proper approvals and zero apps/web file writes. Do not make a mock retro-ui frontend look live without qualified chain connections.

4. PHASE ZERO — COMPLETE SYSTEM BASELINE

Begin with a read-only repository and environment audit.

Run appropriate commands:

pwd
git status --short
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
git remote -v
git worktree list
git log --oneline -15

git fetch origin --prune

node --version
pnpm --version
forge --version

Inspect the local agent's worktree ownership, current working directory, uncommitted changes, and existing feature branches.

Avoid hard resets, destructive cleanup, global repository changes, or installation into unrelated environments.

Build baseline

Run available project commands using the scripts actually defined in current package manifests:

# Install ONLY the retro-ui dependency closure when installation is actually required.
# Do NOT run root-wide recursive installations that touch apps/web or create its build artifacts.
# Verify pnpm filter selection and workspace behavior before executing:
pnpm --filter '@retropick/retro-ui...' install --frozen-lockfile

# No commands targeting @retropick/web are allowed.
pnpm --filter @retropick/retro-ui typecheck
pnpm --filter @retropick/retro-ui build
pnpm --filter @retropick/retro-ui test

pnpm --filter @retropick/indexer typecheck
pnpm --filter @retropick/indexer test

Record failures by category:

Pre-existing baseline failure

New regression

Missing dependency

Environment-specific failure

Unsupported external capability

For Foundry, use the existing contract setup instructions and correct subproject before running test suites. Avoid any workspace command that writes to apps/web. After baseline tests, recheck the apps/web no-change guard and investigate any unexpected file changes rather than overwriting them.

Existing deployed Kuru evidence

Use the deployment manifest rather than inventing addresses.

Previously recorded reference addresses:

Chain ID:
10143

Factory:
0xa7f18b9eceb0A9852b08408854A45D00fc682454

Graduation Coordinator:
0xaD62309242EA65BB07C833669EC6a4ED23AF738F

Kuru Market:
0x1F5dE72616a7fe645Cf45aC66dfce8Ac7452C57F

Kuru Vault:
0xc88DED06eB0081430Ff02d124C22b532e122CbE7

These are historical evidence references, not permission to reuse stale configuration without checks.

Verify:

Chain ID.

Contract bytecode.

Router identity.

Kuru market registration.

Market parameters.

LP vault.

Coordinator receipt.

Protected liquidity custody.

Existing order/fill/cancel transactions.

Baseline deliverables

Create:

docs/metropolis/execution/
├── 00-BASELINE-AUDIT.md
├── FRONTEND_SOURCE_OF_TRUTH.md
├── DEPENDENCY-GRAPH.md
├── CAPABILITY-MATRIX.md
├── INTEGRATION-STATUS.md
├── RELEASE-GATES.md
└── EXTERNAL-BLOCKERS.md

The capability matrix must record all eight sponsor bounties and their actual current state.

Use:

NOT_INSPECTED
ALREADY_INTEGRATED
PARTIALLY_INTEGRATED
MISSING
IMPLEMENTING
TESTED_LOCAL
TESTED_ONCHAIN
TESTED_E2E
QUALIFIED
BLOCKED_EXTERNAL
BLOCKED_SECURITY
DEFERRED

Evidence must accompany all statuses beyond MISSING.

5. REQUIRED INTEGRATION ARCHITECTURE

Maintain clear separation between protocol authority, indexers, frontend adapters, external sponsors, and signing agents.

RETROPICK V2
    |
    +-- Launch Factory
    +-- Bonding Curve
    +-- Graduation Coordinator
    +-- Kuru Executor
    +-- Kuru Orderbook and Vault
    +-- Protected Liquidity Custody
    |
    +-- Application Data Layer
    |      |
    |      +-- Existing Indexer
    |      +-- Optional Envio HyperIndex
    |      +-- Onchain RPC Verification
    |
    +-- CANONICAL FRONTEND: apps/retro-ui / Trading Terminal
    |      |
    |      +-- User Wallet
    |      +-- Kuru Consumer Trading
    |      +-- Fund and Trade
    |      +-- Market Quality Radar
    |      +-- Private Strategy Vault
    |      +-- Risk Intelligence
    |
    +-- External Sponsor Adapters
           |
           +-- Aurora Intents
           +-- Mera PRF
           +-- MetaMask Agent Wallet
           +-- Envio
           +-- Chainlink CRE
           +-- Nansen

SEPARATE RESEARCH / NOVEL ASSET DOMAIN
    |
    +-- PredictionFactoryP0
    +-- PredictionMarketP0
    +-- YES / NO Outcome Tokens
    +-- Complete-Set Collateral
    +-- PrismFactoryP0
    +-- PrismSeriesP0
    +-- Optional Kuru Outcome Markets

Never allow the sponsor integration layer to redefine the financial invariants of the existing V2 contracts.

Shared adapters

If the canonical frontend and existing SDK do not already provide equivalent abstractions, introduce narrow interfaces for:

Chain and asset registry.

Verified contract addresses.

Typed transaction requests.

User wallet execution.

Agent wallet execution.

Provider quote state.

Sponsor API errors.

Event provenance.

Indexer freshness.

Feature readiness.

Sponsor qualification evidence.

Use existing libraries, including viem, whenever possible.

Financial precision

Use bigint for financial quantities.

Preserve token decimals.

Distinguish atomic values from UI display values.

Enforce maximum spend and minimum output.

Check stale quotes.

Check allowances.

Never use floating-point prices for financial settlement.

Avoid unbounded approvals.

Security controls

Implement only required permissions.

No sponsor service may gain ownership or custody of existing V2 assets without a separately reviewed protocol change.

Keep server-only secrets out of client bundles. All frontend integration modules and UI code belong under apps/retro-ui; do not add routes or server handlers under apps/web. If a private server endpoint is needed, use an existing authorized backend or a dedicated, minimal sponsor adapter service.

Use feature flags for integrations that depend on missing infrastructure.

6. EXECUTION ORDER AND SEQUENTIAL GATES

Execute the following sponsor stages in order.

A sponsor is complete only when its functionality, tests, live integration and evidence pass its acceptance gates.

If external infrastructure makes a sponsor impossible, mark it blocked with evidence and move to the next one.

Do not abandon all work because one provider is unavailable.

Stage order

Stage

Integration

Main decision

1

Kuru Consumer Trading

Validate and extend existing deployment

2

Kuru New Assets feasibility

Qualify existing P0 kernels and determine deployment safety

3

Envio

Index actual core lifecycle events

4

Mera PRF

Build genuine non-wallet encrypted strategy vault

5

MetaMask Agent Wallet

Build installable permissioned trading plugin

6

Aurora Intents

Demonstrate real cross-chain funding if route supported

7

Kuru New Assets execution

Deploy separately qualified P0 outcome markets if feasible

8

Chainlink CRE

Implement meaningful workflow and real simulation

9

Nansen

Add licensed actionable market-risk intelligence

Stage 2 is an early security and feasibility gate for Stage 7, not a duplicate sponsor implementation.

These stages are ordered to reduce risk while protecting the main product.

7. STAGE 1 — KURU CONSUMER TRADING

Objective

Determine whether the existing Kuru orderbook integration already qualifies for:

Build the Next Consumer Trading App on Kuru.

Do not write new orderbook execution code until you inspect the current implementation.

Existing implementation candidates

# Legacy historical evidence paths exist under apps/web, but are PROHIBITED EDIT TARGETS.
# Inspect only contract/evidence metadata if required. Do not execute or change anything there.

# ALL CURRENT AND NEW KURU CONSUMER UI IMPLEMENTATION:
apps/retro-ui/src/features/launchpad/
apps/retro-ui/src/wallet/
apps/retro-ui/src/lib/live/

packages/launchpad-sdk/       # only shared typed code, not frontend pages
apps/abi/                      # canonical ABI definitions
apps/indexer/                  # indexer/read model, not frontend UX

Locate exact retro-ui paths dynamically. Inspect existing retro-ui Kuru LiveTradingTicket, terminal/token-terminal, wallet/provider, indexer-client and related tests before patching. Do not assume proposed paths exist and do not copy or move code from apps/web. If Kuru functionality is proven only on old web, mark it NOT YET QUALIFIED ON retro-ui and implement the missing adapter in retro-ui rather than claiming it already works in the canonical frontend.

Audit current features

Verify:

Market discovery.

Token detail page.

Wallet connection.

Correct Monad chain handling.

Orderbook identity.

Best bid and ask.

Resting order depth.

Native token and launch-token margin deposits.

Limit buy.

Limit sell.

Post-only orders.

Partial fills.

Order cancellation.

Margin withdrawals.

Real transaction receipts.

Balance reconciliation.

Error handling.

Network switching.

Responsive Android interaction.

If those features work, DO NOT rebuild them.

Possible high-value improvements

Build only the missing parts of:

RetroPick Bond-to-Book Trading Terminal

It should expose the same asset throughout:

Launch
  -> Bonding Curve
  -> Graduation
  -> Kuru Market
  -> Live Orderbook
  -> Trade History
  -> Portfolio

Emphasize:

Trade readiness.

Live market depth.

Real spread.

Correct lot sizes and ticks.

Fee and execution preview.

Clear separation of resting versus filled orders.

Permanent graduation LP proof.

Order status across refreshes.

No false probability interpretation.

Explicit stale-data indicators.

Validation

Use the repository's existing Playwright configuration.

Inspect:

apps/retro-ui/playwright.config.ts
apps/retro-ui/e2e/README.md
apps/retro-ui/e2e/run.mjs

Use the already-installed Playwright MCP workflow if available and validated.

If a Kiro-integrated Playwright MCP workflow is present, run its capability handshake and use it rather than installing duplicate browser automation.

If unavailable, use the project's native Playwright runner.

Required viewports:

Desktop.

Tablet.

Android mobile.

Small mobile viewport.

Run fixture and read-only E2E tests first.

Do not mistake the read-only live browser suite for a live signing test. Existing scripts/e2e/live-* can broadcast testnet transactions and must only run with approved test wallets and spending limits.

Acceptance

Real Kuru market identified.

Existing historical order/fill/cancel evidence revalidated.

Current apps/retro-ui frontend trading path tested, not apps/web.

Genuine missing UX gaps fixed.

Mobile functionality validated.

No regression in existing launchpad flows.

Evidence recorded.

After PASS, move to Stage 2.

8. STAGE 2 — PREDICTION AND PRISM P0 QUALIFICATION

Objective

Determine whether the existing research kernels can safely support the Kuru New Assets bounty.

This is a feasibility and security qualification stage.

Existing source

research/contract-kernels/src/hackathon/PredictionFactoryP0.sol
research/contract-kernels/src/hackathon/PredictionMarketP0.sol
research/contract-kernels/src/hackathon/OutcomeTokenP0.sol
research/contract-kernels/src/hackathon/PrismSeriesP0.sol

research/contract-kernels/test/hackathon/
research/hackathon-p0/
research/reports/HACKATHON_P0_GATE.md
research/reports/hackathon-p0-gates.yaml

The repository already records bounded local P0 qualification evidence, including Prediction and PRISM tests.

Do not restart contract engineering from zero.

Verify

Local qualified SHA.

Current source differences since qualification.

Solidity version.

Contract bytecode size.

Foundry unit tests.

Stateful invariants.

Fuzz tests.

Differential Python models.

Collateral behavior.

Exact token accounting.

Resolver authority.

Lifecycle transitions.

Fee-on-transfer rejection.

Reentrancy resistance.

PRISM component admission.

PRISM exact lot sizes.

PRISM source registration.

PRISM physical backing.

PRISM in-kind redemption.

Critical accounting

For simple binary complete sets:

1 collateral
  -> 1 YES + 1 NO

1 YES + 1 NO
  -> 1 collateral

Do not count YES and NO issuance as twice the collateral-backed economic open interest.

For PRISM P0:

h = Gx
x >= 0

requiredBacking_i = S * x_i

physicalBalance_i >= requiredBacking_i

Preserve exact integer lot semantics.

Important exclusions

PRISM P0 does not automatically support:

General-purpose state-liquidity clearing.

Arbitrary multi-event AND/OR payoffs.

Approximate backing.

Full terminal cash settlement.

Shared prefunding.

Unbounded claims.

Production-readiness guarantees.

Do not reintroduce excluded behavior to create a more impressive demo.

Gate

Produce:

P0_SECURITY_REVALIDATION.md
P0_DEPLOYMENT_FEASIBILITY.md
P0_KURU_MARKET_ADAPTER_PLAN.md

Decide:

P0_GO
P0_CONDITIONAL
P0_NO_GO

If unsafe, record why and continue to Envio.

If qualified, reserve a separate implementation lane for Stage 7.

9. STAGE 3 — ENVIO HYPERINDEX

FRONTEND OWNERSHIP: Any UI, page, component, client integration, frontend SDK adapter, route or frontend test introduced in this stage must live in apps/retro-ui ONLY. Server-only code belongs in existing authorized backends or integrations; NEVER edit apps/web. Validate the sponsor feature on retro-ui itself, not a historical apps/web deployment.

Objective

Meaningfully integrate Envio into a core RetroPick feature.

Bounty:

Best Use of Envio.

Do not replace the existing indexer merely to collect the bounty.

Official documentation

https://docs.envio.dev/

https://docs.envio.dev/docs/HyperIndex/quickstart-with-ai

https://docs.envio.dev/docs/HyperIndex/supported-networks

Monad

Chain ID:

10143

Documented Monad Testnet HyperSync endpoint:

https://10143.hypersync.xyz

Confirm that the endpoint and required API-token policy work with the installed Envio version.

Agent workflow

Discover the official Envio CLI.

If supported:

pnpx envio init
envio tools search-docs
envio skills update

Do not blindly install a second incompatible Envio setup.

Use generated configuration, schemas, handlers and tests.

Desired feature

RetroPick Market Quality Radar

Index actual events such as:

Token launched.

Graduation committed.

Graduation secured.

Graduation completed.

Kuru order created.

Kuru trade.

Order canceled.

Use exact deployed ABIs.

Derive:

Launch lifecycle.

Graduation latency.

Time to first trade.

Actual filled-trade count.

Real trade volume.

Creator market history.

Market activity freshness.

Post-graduation execution activity.

Use direct verified orderbook reads for orderbook depth and current spreads, rather than pretending that past trade logs provide the current full book.

Critical integration rule

apps/retro-ui MUST consume actual Envio-indexed data for at least one important market or trading feature. No apps/web API routes, components, or package edits.

A separate GraphQL page that is never used by the product is insufficient.

Tests

Known transaction log reconciliation.

Event ID uniqueness.

Dynamic contract discovery if supported.

Reorganization behavior.

Historical replay.

Indexing lag.

Missing and stale data.

Schema migrations.

Network failure.

Acceptance

Real deployed indexer, reachable GraphQL endpoint, relevant event handlers, reconciled records, and live frontend consumption.

If complete, move to Mera.

10. STAGE 4 — MERA PASSKEY PRF

FRONTEND OWNERSHIP: Any UI, page, component, client integration, frontend SDK adapter, route or frontend test introduced in this stage must live in apps/retro-ui ONLY. Server-only code belongs in existing authorized backends or integrations; NEVER edit apps/web. Validate the sponsor feature on retro-ui itself, not a historical apps/web deployment.

Objective

Implement the One Passkey, Many Keys sponsor bounty.

Mera must provide a genuinely valuable non-wallet use of passkey-derived key material.

Official sources

https://github.com/category-labs/mera

https://mera.category.xyz/concepts/passkeys-and-prf/

https://mera.category.xyz/concepts/secret-vaults/

Feature

RetroPick Private Strategy Vault

Users can protect:

Private trading theses.

Draft prediction markets.

Watchlists.

Unpublished PRISM recipes.

Agent risk budgets.

Trade constraints.

Market-making configurations.

SDK

Inspect the installed version of:

@category-labs/mera

Use published functionality, including:

createSecretVaultWithNewPasskey
createSecretVaultWithExistingPasskey
parseSecretVault
decryptSecretVaultWithPasskey

Do not implement unnecessary custom cryptography.

Requirements

WebAuthn PRF-derived secret protection.

Stable relying-party ID.

Real credential user verification.

Encrypted local or server-side storage.

No plaintext on the server.

No persisted encryption keys.

Proper salt and nonce management.

Vault schema versioning.

Cross-device recovery test where supported.

Clear error states for unavailable PRF.

Lost-passkey recovery limitations disclosed.

Critical distinction

This feature is not simply wallet login.

It is a passkey-protected private data system that can be used independently of trading-wallet signing.

Do not replace the existing wallet provider unnecessarily.

Innovation

Confidential Trader Intent

A user privately saves a strategy and risk budget, then selectively unlocks a bounded instruction for a trading assistant.

A strategy vault must never grant direct spending authority solely because the contents were decrypted.

Acceptance

Encryption works.

Decryption works.

Tampering fails.

Wrong credential fails.

PRF unavailable is handled.

A second compatible synced device is tested where available.

No secret leaks appear in console, network logs or persisted plaintext.

The feature is usable in apps/retro-ui and verified in its approved live preview/deployment. Do not count a feature running only in legacy apps/web.

Move to MetaMask.

11. STAGE 5 — METAMASK AGENT WALLET PLUGIN

FRONTEND OWNERSHIP: Any UI, page, component, client integration, frontend SDK adapter, route or frontend test introduced in this stage must live in apps/retro-ui ONLY. Server-only code belongs in existing authorized backends or integrations; NEVER edit apps/web. Validate the sponsor feature on retro-ui itself, not a historical apps/web deployment.

Objective

Build a genuine, installable MetaMask Agent Wallet plugin that gives trading agents a RetroPick-specific capability.

Official sources

https://docs.metamask.io/agent-wallet/

https://github.com/MetaMask/agent-wallet-plugin-examples

https://github.com/MetaMask/agent-skills

Important architecture

The MetaMask Agent Wallet uses a CLI plugin system.

A Markdown SKILL.md file alone is not a working plugin.

Inspect:

Official plugin sample.

package.json plugin metadata.

oclif command manifest.

Required CLI version.

Plugin API types.

Capability declarations.

Wallet execution APIs.

Authentication and policy model.

Initial diagnostics

Use the installed CLI's supported commands:

node --version
mm --version
mm doctor
mm chains list --json

MetaMask's documented CLI requires Node.js 22.18 or later. Check the installed runtime and plugin compatibility before making changes.

Use the official agent skill if suitable.

Target feature

RetroPick Risk-Controlled Trading Agent

Capabilities:

Discover verified RetroPick markets.

Inspect live Kuru orderbook state.

Calculate exact executable order parameters.

Explain fees and estimated risk.

Propose bounded trading actions.

Place a user-approved limit order.

Verify receipt.

Cancel a permitted order.

Report resulting status.

Stop safely when policy or market validation fails.

Agent commands

Suggested domain-level capabilities:

retropick markets
retropick market inspect
retropick order quote
retropick order place
retropick order cancel
retropick wallet exposure
retropick market risk

Map command names to the actual supported plugin system.

Mandatory safeguards

Monad allowlist.

Verified Kuru market addresses.

Exact chain ID.

Maximum notional exposure.

Maximum order size.

Quote expiration.

Orderbook freshness.

Price tick validation.

Balance and margin checks.

Signer ownership.

Existing MetaMask policy enforcement.

User approvals and MFA.

Transaction simulation.

Idempotency.

No private-key export.

No bypass of denied transactions.

Use Guard Mode and inspect the relevant policies.

Innovation

Bounded Market-Maker Copilot

The agent can suggest maker orders based on real spreads, but cannot trade beyond its approved risk policy.

Do not implement uncontrolled speculative trading or claim profitable arbitrage from an LLM's recommendation.

Acceptance

Plugin builds.

Plugin installs.

Manifest permissions reviewed.

Commands execute.

Read-only operations work.

Policy denial works.

Real testnet order submits through MetaMask Agent Wallet.

Receipt is confirmed.

Cancellation works.

Permission and MFA protections remain effective.

A successful wallet-submit capability grant is not proof of completed order execution.

Move to Aurora.

12. STAGE 6 — AURORA INTENTS

FRONTEND OWNERSHIP: Any UI, page, component, client integration, frontend SDK adapter, route or frontend test introduced in this stage must live in apps/retro-ui ONLY. Server-only code belongs in existing authorized backends or integrations; NEVER edit apps/web. Validate the sponsor feature on retro-ui itself, not a historical apps/web deployment.

Objective

Integrate Aurora Intents to make deposits from supported external chains useful inside RetroPick.

Bounty:

Bring Any-Chain Liquidity to Monad.

Official sources

https://docs.intents.aurora.dev/

https://github.com/aurora-is-near/hypercore-deposits-demo

Inspect current NEAR Intents-supported chains and settlement assets.

Critical compatibility concern

The existing V2 Kuru trading candidate is quoted in native MON.

An external-chain stablecoin arriving as a stablecoin on Monad does not automatically become spendable MON in an existing MON-quoted market.

Do not assume:

USDC on Base
  -> USDC on Monad
  -> Kuru MON market trade

works without a verified conversion.

First task

Perform a bounded route capability check.

Verify:

Source chain.

Source token.

Destination chain.

Destination token.

Actual chain ID.

Testnet versus mainnet support.

Route liquidity.

Quote expiry.

Max input.

Minimum output.

Solver fees.

Destination recipient.

Refund semantics.

Finality.

User gas requirements.

If no live supported route exists for the deployed RetroPick network and trading asset, record BLOCKED_EXTERNAL and move to the next integration.

Target feature

Fund & Trade

User chooses market
    |
User selects funding chain
    |
Aurora route quote
    |
User confirms external transaction
    |
External settlement
    |
Monad destination balance verified
    |
Kuru trading balance funded
    |
User places order
    |
Kuru transaction confirmed

The exact flow may require multiple user-approved transactions.

Do not claim atomic deposit-and-execute without proof that the specific provider/API supports it.

User experience

Show:

Source asset.

Expected destination amount.

Minimum destination amount.

Fees.

Transaction status.

Source explorer receipt.

Destination explorer receipt.

Refund/recovery information.

Order execution state.

Acceptance

At least one genuine source-chain transfer settles on the required destination, and the received asset is demonstrably used by a real RetroPick action.

Widget rendering alone is not sufficient.

Move to Kuru New Assets execution.

13. STAGE 7 — KURU NEW ASSETS AND MARKETS

FRONTEND OWNERSHIP: Any UI, page, component, client integration, frontend SDK adapter, route or frontend test introduced in this stage must live in apps/retro-ui ONLY. Server-only code belongs in existing authorized backends or integrations; NEVER edit apps/web. Validate the sponsor feature on retro-ui itself, not a historical apps/web deployment.

Objective

Build a genuinely new tradable financial asset class using the already-qualified Prediction Market P0 and, if safe, PRISM P0.

Bounty:

Bring New Assets and Markets to Kuru.

This stage depends on Stage 2.

Do not proceed to onchain financial deployment if Stage 2 returned P0_NO_GO.

Product thesis

Kuru provides the spot orderbook.

RetroPick provides:

Outcome asset issuance.

Collateral backing.

Event identity.

Resolution semantics.

Redemption.

Structured claim composition.

Minimal acceptable path

Approved collateral
    |
PredictionFactoryP0
    |
PredictionMarketP0
    |
YES token + NO token
    |
Kuru YES/quote orderbook
Kuru NO/quote orderbook
    |
Genuine order/fill
    |
Resolution
    |
Winner redemption

For the hackathon, begin with narrowly controlled, testnet-only, clearly specified events.

Implementation

Reuse qualified P0 Solidity.

Verify collateral address and decimals.

Enforce fixed collateral admission.

Deploy the isolated P0 prototype only after authorization.

Generate source and ABI manifests.

Create a binary market.

Mint complete sets.

Verify exact collateral.

List approved outcome ERC20s through the Kuru Router.

Supply separate trading liquidity.

Demonstrate a real executable orderbook.

Execute real order/fill/cancel.

Resolve through the accepted test resolver.

Redeem the winning outcome.

Preserve all receipts and final balances.

Kuru-specific requirements

Do not confuse market creation with liquidity.

A deployed but empty orderbook is insufficient to demonstrate a usable market.

Verify:

Router mode.

Quote-token type.

Token decimals.

Market parameter precision.

Tick size.

Min/max order sizes.

Vault initialization.

Market depth.

Actual fills.

Separate liquidity funding.

Non-reuse of collateral backing.

Optional PRISM P0

Only add after the binary asset system works.

PRISM must retain:

Exact-backed composition.

Nonnegative replication.

Canonical source validation.

Exact integer lot semantics.

Atomic minting.

Physical backing checks.

In-kind redemption.

Honest disclosure of excluded final-settlement functionality.

Innovation

Programmable Event Assets

Show that an outcome token can be issued as a properly backed financial claim, traded on Kuru, and redeemed according to its own resolution rules.

PRISM extends this toward transferable structured exposure.

Acceptance

The new claim asset must have credible issuance, collateral, redemption, and liquidity mechanics with actual Kuru execution evidence.

Include an operational and jurisdiction-specific legal-review plan. Do not assert that a testnet contract makes real-money prediction markets legally compliant.

14. STAGE 8 — CHAINLINK CRE

FRONTEND OWNERSHIP: Any UI, page, component, client integration, frontend SDK adapter, route or frontend test introduced in this stage must live in apps/retro-ui ONLY. Server-only code belongs in existing authorized backends or integrations; NEVER edit apps/web. Validate the sponsor feature on retro-ui itself, not a historical apps/web deployment.

Objective

Use Chainlink Runtime Environment as an actual orchestration component.

Bounty:

Best Workflow with CRE.

Official docs

https://docs.chain.link/cre

Check current CLI documentation.

CRE CLI v1.30.0 introduced Monad Testnet simulation support, but simulation is not proof of live testnet DON write support.

Preferred use case

RetroPick Graduation Safety Workflow

Why this matters:

RetroPick has a complex transition between primary price discovery and secondary orderbook execution.

CRE can independently orchestrate checks around that transition.

Workflow

Trigger workflow
    |
Read onchain graduation ledger
    |
Read Kuru market registration
    |
Read protected liquidity receipt
    |
Fetch independent external evidence
    |
Validate freshness and identities
    |
Apply deterministic safety rules
    |
Emit reproducible safety report

If there is a qualified Prediction P0 resolution adapter, it can become a future CRE integration. Do not turn a speculative AI answer into an authorized financial resolution.

Implementation

Scaffold the official CRE project.

Inspect the installed CLI.

Configure Monad Testnet simulation.

Implement genuine onchain reads.

Implement at least one real external data input.

Define deterministic validation.

Add bounded output schema.

Implement duplicate trigger handling.

Simulate success and failure.

Preserve traces and evidence.

Innovation

Market Graduation Attestation

An independent workflow can verify that a newly graduated asset reached the correct Kuru market and that custody and market records agree.

Acceptance

Working CRE workflow source, successful official simulation, verifiable chain/external inputs, and a genuine role in the RetroPick product.

Do not claim onchain CRE execution unless that execution actually occurred.

Move to Nansen.

15. STAGE 9 — NANSEN INTELLIGENCE

FRONTEND OWNERSHIP: Any UI, page, component, client integration, frontend SDK adapter, route or frontend test introduced in this stage must live in apps/retro-ui ONLY. Server-only code belongs in existing authorized backends or integrations; NEVER edit apps/web. Validate the sponsor feature on retro-ui itself, not a historical apps/web deployment.

Objective

Integrate Nansen as an actionable market-intelligence service.

Bounty:

Best Use of Nansen.

Official documentation

https://docs.nansen.ai/

https://docs.nansen.ai/guides/redistribution-guide

Critical limitations

Nansen's monad network support does not automatically mean coverage of newly minted Monad Testnet assets.

Certain Smart Money endpoints also restrict or prohibit public redistribution.

Before implementation, verify:

API entitlement.

Authentication.

Available credits.

Supported networks.

Endpoint coverage.

API limits.

Licensing permissions.

Terms for derived and displayed data.

Feature

RetroPick Risk Before Ape

Help traders evaluate assets before entering a position.

Potential signals:

Token-holder concentration.

Creator-related allocations.

Market liquidity quality.

Large inflows/outflows where licensed.

Activity concentration.

Wallet activity patterns where supported.

Kuru orderbook spread.

Position exposure.

Separate signals generated from local RetroPick events from data genuinely obtained through Nansen.

Architecture

Nansen API
    |
Server-side authenticated adapter
    |
Validation / licensing policy
    |
Risk interpretation
    |
RetroPick Market Intelligence

No API key in browser code.

Innovation

Explainable Risk Intelligence

The application must explain why a market receives a risk warning.

Avoid ungrounded AI-generated scores or labels implying access to unavailable Smart Money data.

For example:

Thin executable depth
High concentration
Recent unusual flows
Stale external analytics
Risk: reducing intended order size may be prudent

Each factor must have a real source, timestamp and explanation.

Acceptance

Genuine authorized Nansen API call.

Endpoint-specific licensing compliance.

Product feature meaningfully influenced by actual data.

Freshness and missing-data handling.

Verified server-only credential handling.

Test coverage.

Judge-accessible demonstration.

If Nansen lacks relevant testnet coverage, record the limitation and do not invent token intelligence.

16. CROSS-SPONSOR PRODUCT INTEGRATION

After individual integrations, assess how they improve one coherent user journey.

Target product experience:

DISCOVER
Browse RetroPick assets
      |
MARKET QUALITY
Envio-indexed provenance and trading activity
      |
RISK
Kuru liquidity + licensed Nansen intelligence
      |
FUND
Aurora cross-chain funding if supported
      |
TRADE
Kuru orderbook
      |
AUTOMATE
MetaMask Agent Wallet with policy limits
      |
PROTECT
Mera-encrypted strategy vault
      |
VERIFY
CRE market-safety workflow
      |
STRUCTURE
Prediction P0 / PRISM P0 qualified assets

Each integration remains independently fail-closed.

The product must continue to operate if:

Envio is unavailable.

Nansen rate limits requests.

Aurora has no supported route.

Mera PRF is unsupported.

MetaMask authentication fails.

CRE simulation or provider is unavailable.

Existing retro-ui trading must not become dependent on an optional sponsor API. Do not add sponsor adapters to apps/web; use retro-ui and permitted shared/backend modules only.

17. PLAYWRIGHT AND BROWSER VALIDATION

The repository already has Playwright tests under apps/retro-ui, which is the ONLY frontend test target. Do not run apps/web frontend tests or builds.

Use them where relevant.

Required test categories

Fixture tests

Verify deterministic frontend behavior without any real blockchain writes.

Read-only live tests

Verify Monad RPC, indexer responses and UI consistency.

Wallet tests

Verify connection, chain switching, transaction previews, rejection handling and authorized testnet actions.

Integration tests

Verify provider SDK behavior and real external calls.

Mobile tests

Verify:

Android taps.

Wallet interactions.

Menus and dropdowns.

Order tickets.

Modal scroll locking.

Charts and orderbooks.

Back navigation.

Responsive layouts.

MCP workflow

Discover whether the previously integrated Playwright MCP workflow is available in the ZCode environment.

Run capability discovery or handshake before using it.

If available, use it for interactive browser validation and capture evidence.

If unavailable, use @playwright/test already declared in apps/retro-ui.

Use scripts declared by apps/retro-ui/package.json, including pnpm --filter @retropick/retro-ui e2e:fixture, e2e:smoke, and e2e:live as appropriate. e2e:live is read-only, with the wallet bridge disabled by default. Distinct live-signing scripts can broadcast actual Monad Testnet transactions: do not run them without explicit funded test-wallet and spend authorization. Capture the actual e2e evidence folder and do not confuse read-only browser PASS with transaction execution PASS.

Do not reinstall unnecessary browsers or overwrite working MCP configuration without diagnosing the existing setup. The Playwright MCP/workflow and @playwright/test MUST target retro-ui localhost/live preview, never old apps/web. Use apps/retro-ui/e2e/run.mjs guardrails and preserve separate fixture/read-only/live-signing isolation.

Live signing safety

The regular Playwright E2E suite contains mock-wallet and read-only safety guards.

Do not bypass those protections.

Real transactions must run through the separately approved live E2E workflow with known test wallets and bounded testnet amounts.

No test should expose session credentials, wallet private keys or keystore passwords.

18. TESTING AND RELEASE ENGINEERING

Each sponsor integration must pass five gates.

Gate A — Source verification

Official SDK/API validated.

Exact package version pinned.

Supported network validated.

Contract/API addresses validated.

No invented methods.

Gate B — Local engineering

Typecheck.

Build.

Unit tests.

Static checks.

Schema validation.

Correct error handling.

Gate C — Security

No exposed keys.

No unauthorized signing.

No custody regression.

No unsafe allowance.

No replay vulnerability.

Correct financial precision.

Correct contract identity.

Failure states tested.

Gate D — Integration E2E

Relevant real provider response.

Real chain receipt where required.

State reconciliation.

User-facing functionality.

Browser/mobile validation.

Existing product still functions.

Gate E — Hackathon eligibility

Meets actual sponsor requirements.

Provides core product value.

Demonstrates real sponsor functionality.

Includes source and evidence.

Public judge access where applicable.

Sponsor-specific video or demo.

Submission answers completed accurately.

An integration is not QUALIFIED merely because the build passes.

19. GIT, BRANCHES AND PR MANAGEMENT

Use an integration-oriented branching strategy.

For example:

main
 |
 +-- feat/metropolis-kuru-consumer
 +-- feat/metropolis-envio
 +-- feat/metropolis-mera-prf
 +-- feat/metropolis-metamask-agent
 +-- feat/metropolis-aurora-intents
 +-- feat/metropolis-kuru-outcome-p0
 +-- feat/metropolis-chainlink-cre
 +-- feat/metropolis-nansen

Adapt branch names to existing repository conventions and avoid creating branches that collide with active agents.

Rules

Start each feature from the latest qualified base.

Preserve unrelated dirty work.

Prefer isolated worktrees when another agent owns the current working tree.

One sponsor integration per logical PR.

Keep dependency changes minimal.

Do not mix unrelated formatting changes.

Never commit secrets.

Do not manipulate Git history to hide previous authors.

Check conflict resolution against apps/retro-ui as the ONLY canonical frontend. A PR that changes even one apps/web/** path is BLOCKED and must not merge, regardless of test status. Require `git diff --name-only origin/main...HEAD -- apps/web` to be empty. Do not delete pre-existing user modifications in apps/web to meet this guard.

Review GitHub Actions and local tests.

Never claim a failed CI job is green.

Commit structure

Prefer:

feat(metropolis): integrate <sponsor>
test(metropolis): qualify <sponsor> integration
docs(metropolis): record <sponsor> proof and limitations

When a sponsor is already integrated, use focused validation or remediation commits instead.

PRs must include:

Scope.

Existing versus new capability.

Source SHA.

Files changed.

SDK versions.

Tests executed.

Security assessment.

Real evidence.

Limitations.

Rollback instructions.

Do not automatically merge without the project's accepted release authorization.

20. EVIDENCE AND DOCUMENTATION

For every sponsor create or update:

evidence/hackathon/metropolis/sponsors/
    <sponsor>/
        README.md
        capability-check.json
        qualification.json
        test-results.json
        transactions.json
        screenshots/
        demo/

Only create files supported by actual results.

Store evidence in the repository's established evidence conventions if they differ from this proposed layout.

Each evidence record must distinguish:

SOURCE_VERIFIED
LOCAL_TEST_VERIFIED
ONCHAIN_VERIFIED
BROWSER_E2E_VERIFIED
SPONSOR_QUALIFIED
BLOCKED
NOT_RUN

Do not mark SPONSOR_QUALIFIED until the bounty's complete requirement matrix is satisfied.

Sponsor summary template

# Sponsor Qualification Report

Sponsor:
Track:
Prize:
Branch:
Source SHA:
SDK version:
Network:
Integration status:

## Existing capabilities
...

## Changes implemented
...

## Sponsor requirements
...

## Test results
...

## Onchain evidence
...

## Browser evidence
...

## Security assessment
...

## External blockers
...

## Judge demo
...

## Remaining work
...

## Verdict
QUALIFIED / CONDITIONAL / BLOCKED / DEFERRED

Integration dashboard

Update:

docs/metropolis/execution/INTEGRATION-STATUS.md

after every sponsor.

It must provide:

Sponsor.

Current status.

Current branch/PR.

Implemented feature.

Validation result.

Missing requirements.

Next action.

Evidence location.

This document must remain useful if ZCode is restarted or a different agent resumes the task.

21. DEADLINE-AWARE EXECUTION POLICY

The priority is a complete and credible submission, not eight half-finished integrations.

Treat October 14, 2026, 10:59 GMT+7 as the externally reported deadline until verified otherwise.

Use staged cutoffs:

Early execution

Resolve frontend/runtime ambiguity.

Revalidate existing Kuru.

Check P0 feasibility.

Establish working sponsor SDK environments.

Begin low-risk integrations.

Middle execution

Finish eligible sponsor features.

Validate user-facing behavior.

Produce sponsor-specific receipts.

Close independent PRs.

Late execution

Freeze high-risk contract changes.

Complete integration QA.

Capture demonstration videos.

Verify judge-accessible URLs.

Finish submission answers.

Final buffer

Reserve at least eight hours before the confirmed portal deadline for submission work and critical fixes.

Do not initiate a risky new contract deployment inside that buffer.

If the remaining time cannot support completion of every sponsor, prioritize already working and independently demonstrable integrations, mark the others accurately, and protect the main track submission.

22. EXTERNAL DEPENDENCY POLICY

Some integrations require credentials, funded wallets, or access to sponsor services.

You must distinguish code failures from external configuration blockers.

Create:

docs/metropolis/execution/EXTERNAL-BLOCKERS.md

For each dependency record:

Sponsor:
Required service:
Credential/access:
Environment variable:
Current status:
What was tested:
Blocking error category:
Can local implementation continue:
Can real E2E continue:
Next owner action:

Never print credentials.

You may prepare secure .env.example entries, but never populate real secrets in committed files.

If credentials are missing:

Implement safe integration scaffolding where useful.

Use contract/interface tests.

Mark live validation blocked.

Move to another sponsor when the blocker cannot be solved independently.

Return to the blocked integration if the requirement becomes available.

No mock should be represented as a real provider integration.

23. EXPECTED FINAL DELIVERY

At the end of the execution campaign, deliver:

ZERO-MUTATION PROOF: show a tracked-path diff from the PR base confirming no apps/web/** modifications, plus a pre/post status comparison protecting any unrelated pre-existing dirty work. Explicitly report apps/retro-ui as the only edited frontend.

A. Final system architecture

Describe the actual deployed and newly integrated system.

No speculative components presented as live.

B. Sponsor integration matrix

Show all eight bounties and exact qualification status.

C. Working source code

Only genuine implementation changes with passing validation.

D. Test results

Provide real commands and results.

E. Onchain evidence

Link actual Monad transactions where applicable.

F. Browser evidence

Capture desktop and mobile results, including failure-state testing.

G. Git delivery

Provide branches, commits, PRs, merge status and any CI blockers.

H. Submission package

Prepare sponsor-specific answers and videos, plus technical demo and founder-pitch references.

I. Known limitations

Document everything missing, unsafe, unsupported or unverified.

J. Future roadmap

Explain how the qualified integrations extend toward Monad Mainnet without claiming production readiness.

24. EXECUTION MODE

This is an implementation assignment, not a request for planning-only output.

Do not reply with a generic suggestion that another agent should implement the work.

Your first actions must be:

Inspect the local repository and current working tree.

Inspect latest main and existing feature branches.

Enforce the already-decided canonical frontend apps/retro-ui, document any historical deployment mismatch, and verify that apps/web will remain untouched. Do not reopen the frontend choice.

Run baseline tests.

Read the Metropolis documentation.

Create the evidence-backed capability matrix.

Audit Kuru's existing functionality.

Implement only missing Kuru consumer improvements.

Qualify and close that stage.

Proceed sequentially through the remaining integrations.

For each subsequent sponsor, execute:

DISCOVER → VALIDATE EXISTING → GAP ANALYSIS → IMPLEMENT → TEST → VERIFY ONCHAIN/PROVIDER → BROWSER E2E → DOCUMENT → PR → NEXT.

Do not repeatedly ask questions that the repository, deployment manifests, official documentation or existing evidence can answer.

Ask for human intervention only for genuinely unavailable credentials, required authentication, financial/deployment authorization, or unresolved high-risk decisions.

If blocked, record the blocker and continue with independently executable work.

Do not claim the entire task is complete until all eight sponsors have explicit final statuses and every QUALIFIED status is evidence-backed.

START NOW

Begin by inspecting the current repository state with a strict apps/web no-write guard, then audit apps/retro-ui as the fixed canonical frontend. Confirm deployment mapping READ-ONLY; DO NOT reopen the frontend choice. All frontend implementation and Playwright E2E must occur in apps/retro-ui. Any historical public deployment targeting apps/web must be treated as old evidence and handled only by an approved retro-ui deployment/cutover plan without touching apps/web.

Then start the Kuru Consumer Trading validation and implementation stage.

Preserve what already works. Integrate what is missing. Verify everything.
