# 00 — Mandatory Agent Workflow for Each Sponsor, Infrastructure Lane, and PR
**Objective**: Get from uncertain repo state to observable, safe, reviewable behavior without destroying others' work or rewriting earlier evidence.

## Session bootstrap (required each new ZCode/GLM session)
1. Read `AGENT_GUIDE.md`, `AGENTS.md`, `.agent/STATE.json`, `.agent/CURRENT_GOAL.md`, `.agent/ROUTING.md`, local nearest AGENTS.md and relevant accepted ADRs.
2. Read repo-root `RETROPICK_METROPOLIS_OPERATOR_UNBLOCK_MASTER_PROMPT.md` COMPLETE, and this directory README+workflow+secrets+gates.
3. Fetch remote refs, inspect current main and PRs #17–#19, worktrees, dirty changes. Stop if source SHA moved unexpectedly. NEVER reset shared work.
4. Record apps/web original dirty paths, ensure all future operations do NOT touch it, including workspace install/build, side-effecting formatting. Use scoped commands.
5. Read current sponsor status from `docs/metropolis/execution/INTEGRATION-STATUS.md`, blocker ledger and existing evidence before proposing changes. Source vs runtime vs last report matters.
6. Choose SINGLE highest-value unblocked lane. Autonomous read-only evidence-gathering on independent lanes is okay; NEVER simultaneous mutations to Contabo, deployment or shared financial code.

## Sponsor stage state machine
```
DISCOVER current code and historical decisions
    ↓
BASELINE current SHA, test commands, source+runtime capability
    ↓
VERIFY official upstream SDK/docs, versions, network and quota
    ↓
THREAT MODEL: assets, signers, authority, credentials, failure modes
    ↓
PLAN narrow code diff + API + tests + rollback + approval gates
    ↓
IMPLEMENT in scoped owned paths and branch
    ↓
UNIT / STATIC / CONTRACT NEGATIVE TESTS
    ↓
REAL PROVIDER / SIMULATION / TESTNET E2E only where appropriate
    ↓
RECONCILE chain/provider results against app and historical baseline
    ↓
GATE A–E and produce verifiable public/sanitized evidence
    ↓
UPDATE docs/metropolis/integration/stages/<date>-<lane>.md
    ↓
UPDATE docs/metropolis/execution/INTEGRATION-STATUS.md
    ↓
OPEN PR, review zero apps/web, handoff, next lane
```
Never claim "EXECUTED" at "RESEARCH" or "SIMULATED" at "LIVE DON". A soft-blocked sponsor can still have valid local implementation tests; record both separately.

## Risk/authorization decision hierarchy
- Safe by default: repo reads, existing private local mocks, unit/fork tests with simulated chain only, official docs, non-secret health checks, design proposals, integration docs.
- Requires operator explicit permission: write to Contabo host that has Yubie, DNS/named tunnel changes, redeploy/switch public staging backend routing, production domain cutover, changing current fee recipients, testnet financial transfers/new deployments/funded liquidity, publishing packages, provisioning agent wallets, paid subscriptions, submission.
- If unsure about side effects, plan dry-run and ask. Existing CLI login is NOT permission to sign or publish.
- Never bypass a vendor permission/MFA prompt. A lost-key passkey cannot authorize legacy EOA financial state by itself.

## Worktree and code ownership
Use `git worktree list`; branch from currently fetched main or designated worktree; avoid writing to concurrent specialist branches or rebasing someone else's dirty tree. Diff should stay within `apps/retro-ui`, the relevant `integrations/<sponsor>`, limited SDK/ABI, test/evidence/documentation; no `apps/web`, no Yubie repo. Read-only reference to `apps/web` does not grant build permission. If a command could regenerate files in `apps/web`, use a filtered safer script or an isolated separate checkout excluding legacy outputs. Preserve any preexisting bad `apps/web/package-lock.json` commit; user forbids changes rather than asking to tidy it.

## Minimum report after each stage
- ID / objective / branch & SHA / operator permission scope.
- CURRENT vs TARGET vs DELTA vs MIGRATION.
- Artifact changes by owned path.
- Official provider URLs/SDK/versions/network exact.
- Threat model, origin/RP, signing and custody.
- Tests: command, environment, pass/fail, run ID and timestamps, expected vs observed.
- Live evidence: block/tx/CID/provider response if real; never fabricate.
- Negative tests/failure-injection.
- Status `NOT_STARTED|SOURCE_VERIFIED|TESTED_LOCAL|SIMULATED|TESTNET_TX_CONFIRMED|BROWSER_E2E_VERIFIED|RUNTIME_VERIFIED|QUALIFIED_A_E|CONDITIONAL|BLOCKED_EXTERNAL|DEFERRED_AUTHORIZATION`.
- All residual known blockers, responsible operator, approved next action.
- Release rollback plan; staging/main SHA.
- A–E matrix and judge user story.
Stage template: [03-STAGE-AND-EVIDENCE-TEMPLATE.md](03-STAGE-AND-EVIDENCE-TEMPLATE.md).

## Priority lane selection
First verify existing staging state and PR #17; next VPS dry-run safely; then authenticated Envio and CRE; Mera Protected Earn (real signer rather than toggle-only); MetaMask blocked install; optional Pinata; Kuru consumer/P0 and Aurora/Nansen; submission. Execute whichever is technically and legally unblocked; keep evidence current; do not wait idle.

## Full verification
Use actual scripts from repo package.json; do not assume the previously-reported 234/244/260 test totals still apply. Typecheck/build, targeted units, SDK, contracts, staging desktop/mobile, staging read-only routes, stale-provider cases; diff audit for apps/web. Use real browser passkey ceremony if provider extension unsupported in Playwright fake mode; mark manual evidence. In final handoff link PRs, documents, current deployment, next operator decisions, with no secret values.
