# V2 liquidity execution contract

ID: RETROPICK-V2-FULLSTACK-INTEGRATION / LIQUIDITY-PRODUCTION-20261015

GOAL: Implement qualified Kuru liquidity reads, historical vault indexing, read-only LP positions and an approved manual maker workspace for Launchpad V2.

WHY: Ordinary CLOB depth excludes AMM liquidity; the previous terminal and indexed read model cannot describe graduated liquidity accurately.

PLATFORM/MODULE: Shared platform + Launchpad Core V2, Monad Testnet 10143.

OWNER: Root integration engineer; independent SDK, indexer and frontend lanes.

READ: AGENT_GUIDE.md, AGENTS.md, .agent routing/steering, canonical Launchpad/Kuru docs, accepted ADRs, security allowlists, frozen deployment and ABI manifests, complete deep-research-report.md. User confirmed section 6 of the original checkout's untracked RETROPICK_CODEX_MASTER_IMPLEMENTATION_PLAN.md as execution specification; the named TXT is absent.

OWN: SDK liquidity reader/tests; indexer/API/read-model types/tests; canonical retro-ui flows/tests; root developer commands/CI; project-local toolkit/skills; campaign evidence and handoffs.

READ-ONLY: contracts/src/**, deployment addresses and ABI catalogs, other worktrees, existing shared tool configurations, financial policy/ADRs and release gates.

DO NOT: Add financial selectors, enable public LP or advanced MM writes, alter frozen Solidity, deploy, merge main, force push, promote qualification gates, implement PRISM/Prediction, or access signing credentials for unapproved actions.

INPUTS: Baseline e1c578535e3451de5c1792cd0a2b48d922e787c8; deployed source f0363249f4b74e58dde37d1241742ca5a92bcfe3; Kuru source 2060bb2736080c175d80d568bfdb6226bb5abd04.

OUTPUTS: Reviewed bounded commits, source/capability matrix, toolkit provenance, qualified reads/API/UI, reproducible tests/evidence, LP/advanced-MM security dispositions and explicit remaining blockers.

ACCEPTANCE: Empty CLOB never implies absent AMM; data remains exact and source-qualified; historical vault replay is complete/reorg-safe; approved trading and maker lifecycle remains wallet -> chain; unavailable differs from zero; existing journeys pass regression.

VERIFY: SDK/indexer/UI typechecks and meaningful unit tests; ABI integrity; Foundry V2 unit/fuzz/invariant/fork checks; Slither; responsive/accessibility browser scenarios; pinned chain reads and simulations; approved testnet writes only with current signer authorization.

EVIDENCE: evidence/launchpad/liquidity-production-20261015/; exact commands, exit codes, commit refs, artifacts, raw chain values and coverage limits.

HANDOFF: SDK -> indexer/frontend; indexer -> frontend; frontend + independent security/QA -> root; root -> user for release approval.

BLOCKERS: Solidity HACKATHON_FREEZE, proposed production ADRs, Circle live funding and founder/release gates persist. New financial surfaces require separate human/security authorization. MCP discovery after installation needs a new client session.

## Current / target / delta / migration order

CURRENT: CLOB-only depth, partial Kuru read enrichment, SQLite event journal/projection v2, no vault scan/LP endpoints, no Liquidity navigation; margin/limit/post-only/cancel already prepared through the SDK.

TARGET: Independently qualified liquidity sections, structured two-asset reserves, complete vault history/positions, contextual pool diagnostics and manual approved maker workflows.

DELTA: Add read capabilities and UI/API projections, preserving financial policy and existing transaction preparation.

MIGRATION ORDER: Toolkit/authority -> SDK and indexer interfaces -> terminal correction -> historical backfill/API -> Liquidity/positions -> maker workspace -> regression/security/evidence. Base endpoints retain compatibility while new history is syncing. No production database or deployment is changed in this worktree.
