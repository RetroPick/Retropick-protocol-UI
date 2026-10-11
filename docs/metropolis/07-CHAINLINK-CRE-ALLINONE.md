# Chainlink CRE Workflow — AllInOne Agent Integration Specification
**RetroPick Metropolis 2026 | Draft plan 2026-10-11 | Deadline 2026-10-14 10:59 GMT+7**
**Eligibility:** All tracks. **Prize:** $3,000 single. **Status:** NOT IMPLEMENTED/NOT PROVEN unless evidence linked below. Read `00-MASTER-PLAN.md` and `09-AGENTS-HANDOFF.md` first.

## Product thesis
Orchestrate external evidence and Monad onchain graduation-risk monitoring; event resolution only if actual resolver exists. Do not add a sponsor logo without the sponsor's required working feature.

## Exact integration boundary
Inspect before editing: `contracts/src/v2/GraduationCoordinatorV2.sol`, `apps/indexer/src/project.ts`, `new integrations/cre/workflows/`.
Current V2 is live Monad Testnet 10143, Factory→Curve→Coordinator→Kuru; `deployments/monad-testnet/v2.json` is deployment registry. Do not use obsolete Base Sepolia Go/fe-v1 as patch targets. All contract names, methods and sponsor SDK method names MUST be reverified against installed versions; do not invent API signatures.

## Sponsor eligibility and proof gate
**Chainlink CRE Workflow** must deliver the actual integrated feature described below, not a mock. Track All tracks; prize $3,000 single. Read official bounty wording captured in user portal and recheck at submission. Demo must be on deployed Monad product, with sponsor-specific working evidence. This document is a development specification, not an eligibility certification.

## Architecture and implementation plan
Inspect official CRE CLI and Monad network support; workflow reads Monad coordinator graduation state and trusted external API/market-health data, validates timestamps and source signatures, computes structured risk status, writes to separately deployed bounded registry only if approved; successful CRE CLI simulation is sponsor-accepted, onchain write optional; if actual binary prediction resolver ships, prefer pinned immutable ResolutionSpec workflow. CRE is orchestration, not collateral accounting or truth authority.

### Agent execution checklist
1. Freeze baseline: `git rev-parse HEAD`, branch and working tree; inspect source and SDK docs; write version/chain compatibility matrix.
2. Build read-only adapter first with schema validation, typed errors, idempotency key, deadline and explicit supported-network checks.
3. Implement write flow only after simulation/quote checks and signer boundary review; record exact authorization and destination.
4. Integrate behind an independent feature flag and a truthful disabled state. No secret exposed through `NEXT_PUBLIC_*`.
5. Add telemetry for request ID, chain, block, tx hash, status, duration and sanitized failure category; redact sensitive data.
6. Add unit tests, failure/retry tests, real integration smoke and Playwright/browser or CLI E2E.
7. Record sponsor evidence under `evidence/hackathon/metropolis/sponsors/07-sponsor/`; write submission answer only after proof.
8. Disable flag or revert additive integration if test gates fail; never mutate existing V2 deployment or custody.

## State machine and security requirements
Proposed feature state: DISABLED → CHECKING → READY → ACTION_PENDING → CONFIRMED, with BLOCKED, FAILED, EXPIRED and RECOVERY_REQUIRED branches. For transaction-dependent features, distinguish submitted from confirmed and reconciled. Use onchain receipts and supported sponsor APIs as authoritative. BigInt atomic amounts, bounded allowances, chain and contract allowlists, replay/idempotency protection, retry backoff and no unbounded automated trades.

### Mandatory adversarial cases
Stale data; API outage; non-deterministic LLM; unsupported chain; unsafe oracle writes; duplicated trigger; CRE simulation vs production mismatch.

## Tests and acceptance
**Unit:** serialization, decimal/chain validation, stale data, state transition, wrong signature, timeout, replay, failure recovery.
**Integration:** sponsor endpoint/SDK using current pinned version, confirmed contract identity, network compatibility, provider outage.
**Onchain:** receipts and actual contract state changes where required; never represent simulated events as real transactions.
**E2E:** clean browser/profile, mobile when applicable, two-wallet flows when relevant, no inaccessible login.
**Definition of done:** CRE source/config, exact CLI simulate output, onchain+external input trace, bounded output and failure test. Attach exact URLs/receipts, commit SHA, SDK versions, commands and outputs; fail closed if unavailable.

## Sponsor demo
Trigger→chain read+external evidence→CRE simulation→risk status/result, 120 seconds. Sponsor-specific limit is normally <=2 minutes; MetaMask permits <=5 minutes. Do not claim a successful transaction without a receipt.

## Submission response template (fill after evidence)
"RetroPick integrates Chainlink CRE Workflow to orchestrate external evidence and monad onchain graduation-risk monitoring; event resolution only if actual resolver exists. The integration operates on Monad Testnet [chainId and verified contract address]. Our implementation uses [exact official SDK/API endpoint, pinned version] in [exact repo paths]. A user can [actual completed action], evidenced by [real tx hash / CLI simulation / GraphQL result]. Safety controls include [verified controls]. Current limitations: [actual limitations]."

## 30/60/90-day expansion
**30 days:** harden integration, run supervised external tester sessions and fix reliability gaps.
**60 days:** security review, observability and user cohort/market-quality analytics; expand only verified supported networks.
**90 days:** gated mainnet-readiness decision, commercial pilots and measured retention; no production release without risk/legal/operational gates.

## Rollback
Disable only this sponsor's feature flag, revert its isolated UI/adapter PR, retain historical proof and deployed contracts; never rollback V2 custody by changing onchain owner or withdrawing locked liquidity.

## Official starting points
https://docs.chain.link/cre


---
## 2026-10-11 Chainlink CRE platform correction and runnable acceptance path
**SOURCE-VERIFIED** by first-party Chainlink changelog: https://docs.chain.link/changelog/cre-cli-v1-30-0--new-testnet-support-for-simulation-09dd0 states **CRE CLI v1.30.0** adds **Monad Testnet simulation** via `cre workflow simulate`. v1.29.0 previously added Monad **mainnet** simulation and live onchain writes. Treat **testnet simulation** and **production onchain write** as SEPARATE. Read https://docs.chain.link/cre and current generated CLI help. Do NOT promise that the CRE DON will automatically write on chain 10143 just because the simulator can run against it.

### Practical sponsor-satisfying workflow WITHOUT unsafe new outcome resolution
Name: `RetroPickGraduationSafetyWorkflow`.
- Trigger: operator-invoked HTTP or suitable supported scheduled/log trigger from documented CRE CLI.
- Onchain read: `GraduationCoordinatorV2.ledger(token)`, `receipt(token)`, underlying Kuru market identity and phase.
- Independent external HTTP input: supported public market metadata/risk evidence with timestamp; retain raw hash/reference and enforce request timeout. For initial MVP, a public verifiable data endpoint with stable schema is better than an LLM "decision".
- Compute: **Graduation Health Attestation** `{chainId,token,graduationPhase,market,blockNumber,externalEvidenceHash,checkedAt,result,version}` with deterministic rules (market exists and verified, custody receipt, stale sources fail closed).
- Output: structured workflow report captured in CRE simulation, optionally an authorized **separate** append-only risk attestation contract **only if** writing is actually supported/validated. Never send arbitrary oracle resolutions or modify existing V2 Factory/Coordinator/Locker.

### Agent commands and architecture
```bash
cre --version          # must support testnet simulation (v1.30+), inspect actual installed version
cre init               # follow official project scaffolding, choose supported TS/Go SDK
cre workflow simulate --help
# Fill exact workflow/environment config and run 'cre workflow simulate' with actual flags shown by help.
```
Proposed isolated module `integrations/cre/workflows/graduation-health/` contains immutable input schema, chain config 10143, source allowlists, timeout, encoder, tests and proof. Avoid inventing CRE SDK syntax in advance; agent should use CLI scaffold and examples for current version. `CRE_ETH_PRIVATE_KEY` or deployed gateway secrets must remain excluded from Git, logs and simulated summaries.

### Adversarial tests
Coordinator reports secured but market is not deployed → FAIL; Kuru router mismatch → FAIL; stale or conflicting API data → BLOCKED; repeated trigger → same idempotent attestation; chain 143 vs 10143 mismatch → abort; external API 500 → degraded no attestation; simulator passes but live write unsupported → label **SIMULATED**, not delivered. Onchain read and external API must BOTH contribute meaningfully to workflow output.

### Winning innovation — **Independent Market Safety Oracle**
Most hackathon oracle uses are price feeds. Here CRE automates the **operational trust boundary** between issuance and mature execution: were funds actually graduated, did the CLOB appear, and is the protected liquidity receipt consistent? This augments the existing V2 launchpad and creates value for market makers. Future legitimate prediction resolution can reuse the orchestration pattern only after `ResolutionSpec`, approved adapters and separate P0 contract gates are qualified.

### Acceptance and evidence
Committed workflow source+config, reproducible `cre workflow simulate` console output, testnet onchain read trace, external source evidence, negative failure result, <=2-minute video. Live-chain state mutation is optional ONLY if official sponsor allows simulation; do not claim it was achieved without a deployed receipt.


---
## 2026-10-11 CRE expansion — creator recovery and launchpad integrity
Read [13 Creator Continuity](13-CREATOR-CONTINUITY-MERA-CRE.md) and the updated [Chainlink integration README](../../integrations/chainlink-cre/README.md). apps/retro-ui ONLY; never modify apps/web.

**First gate:** Existing integrations/chainlink-cre/graduation-safety/main.ts is a real typed CRE Cron+EVM+HTTP Sourcify read-only workflow. User reported cre login successful, but recorded positive/negative official simulator output is still required. Run cre whoami, inspect help and simulate existing workflow before developing a second. Current SDK and CLI versions must be checked.

**High-value P1 proposal: CRE Creator Continuity Watch.** Read FactoryV2 getLaunchedToken and pendingCreatorFeeRecipient, change proposal/cancel/updated events; compare to timestamped authentic external wallet/passkey enrollment case metadata and beneficiary proof. Deterministically report ALIGNED, WRONG_RECIPIENT, NO_VERIFIED_CASE, WAITING, EXECUTABLE, EXPIRED, CANCELLED, REPLACED, CONFIRMED, or INCOMPLETE_EXTERNAL. Anchor block/time, bound URL and chain, use replay-safe case IDs, fail closed on stale HTTP. Public UI surfaces change timeline, with explicit admin decision and 3-day timelock. CRE does not sign on behalf of factory owner, cannot veto arbitrary owner override, and cannot itself restore old EOA or old FeeEscrow credits. Existing factory forwarding is V4-versus-curve and does NOT demonstrate post-graduation Kuru creator revenue migration.

**Further P1:** Creator Revenue Continuity Auditor compares future fee recipient, vest beneficiary and historical old-wallet escrow credits. **P2:** post-graduation live Kuru depth/first-trade safety; P0 prediction resolution only after trusted resolution spec/deployment. Never claim DON execution for local simulation. Official docs: https://docs.chain.link/cre/overview ; https://docs.chain.link/cre/guides/operations/deploying-workflows . Challenge wrong-recipient, stale offchain case, cross-launch replay, owner cancellation, superseded proposal, 3-day window via fork simulation and historical escrow assets not movable.


---
## Mera Protected Earn and Chainlink CRE — separation of powers
NEW companion: [14-MERA-PROTECTED-EARN-WITHDRAWALS.md](14-MERA-PROTECTED-EARN-WITHDRAWALS.md). CRE graduation-safety and potential creator continuity watcher are **monitoring/attestation**, not transaction authorization. CRE cannot prevent the stolen original EOA from calling FeeEscrow claim or Kuru withdraw. CRE cannot enforce the frontend toggle. Never claim that Chainlink DON guards user funds unless a verified, separately authorized onchain account validator exists. Strong convergence: a read-only Creator Revenue Continuity report shows original vs protected fee-recipient address, FeeEscrow old credits (unchanged), vested beneficiary, proposed admin override, and current Kuru venue. CRE reports mismatches/risks; wallet/passkey signer handles actual transfer. Complete existing CRE graduation simulation before the new workflow. Do not share Mera PRF, private case evidence, or user auth credentials with public CRE workflow.
