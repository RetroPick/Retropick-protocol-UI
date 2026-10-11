# 03 — Stage Report and Evidence Templates
Create a new file **only after work has started**, at `docs/metropolis/integration/stages/YYYYMMDD-<lane-name>.md`. This template is not itself evidence.

## Required Markdown fields
```markdown
# Stage: <Sponsor or Operator Lane> — YYYY-MM-DD
State: NOT_STARTED | SOURCE_VERIFIED | TESTED_LOCAL | SIMULATED |
       BROWSER_E2E_VERIFIED | RUNTIME_VERIFIED | TESTNET_TX_CONFIRMED |
       QUALIFIED_A_E | CONDITIONAL | BLOCKED_EXTERNAL | DEFERRED_AUTHORIZATION
Owner/agent:
Task ID:
Current local HEAD:
Remote main SHA:
Feature branch / PR:
Staging origin:
Target chain and network:
Operator approval ID/status: none | proposed | explicitly approved [exact action]
Role: source vs signer vs service vs operator

## CURRENT / TARGET / DELTA / MIGRATION
- CURRENT observable state with code locations:
- TARGET user value / bounty:
- DELTA exact changed files / APIs:
- MIGRATION and rollback:

## Source and vendor verification
- Repo file/function/ABI:
- Official provider docs (link and fetched date):
- Installed SDK / CLI:
- Chain selector/contract identity:
- Data/fee/recipient/agent signer authority:

## Secret handling
- Required env variable names ONLY:
- Credential readiness = absent / rotated / present-not-validated / AUTHORIZED / expired:
- Protected runtime target and least-privilege identity:
- Proof no secret entered Git/build/traces:

## IMPLEMENTATION
- Owned paths:
- Forbidden path audit apps/web:
- New feature and value:
- Fallback/error states:
- Data privacy/consent:

## TESTS and EVIDENCE
| Gate | Command / scenario | Expected | Observed | Artifact path / tx / block | Pass/Fail/Blocked |
| A official | | | | | |
| B local | | | | | |
| C security | | | | | |
| D real E2E | | | | | |
| E sponsor fit | | | | | |
- Browser desktop/mobile:
- API authenticated response:
- CRE SIMULATED vs LIVE DON:
- EVM tx receipt (only if actually authorized):
- Negative tests / incidents:
- Correct source SHA / deployed bytecode SHA (separate):

## REVIEW
- Security regressions:
- Auth/custody risk:
- Service/resource risk:
- Deployment and rollback:
- Yubie unaffected proof if relevant:
- Referral/legacy/PRISM isolation:

## FINAL VERDICT & NEXT
- Status:
- Qualified scope (precise):
- Unsupported/bypassed path:
- Sponsor requirements still missing:
- Action agent can take next without approval:
- Exact operator action (if any):
- PR + review/merge status:
- Handoff to next lane:
```

## Operational matrix row to update
`docs/metropolis/execution/INTEGRATION-STATUS.md` remains the living status dashboard. Append/update only the relevant sponsor row, preserving old evidenced baseline. Record version/revalidation date so future agents can tell historical from current.

## PR description checklist
- Scope/frozen code and `apps/web/**` zero-write proof.
- Source SHA, documented feature and security boundaries.
- CI or reproducible local test pass/fail; do not fabricate.
- Screenshot/trace/sponsor evidence location.
- Secret scan/no values.
- Rollback and operator gates.
- Qualified vs conditional verdict.

## Stop report
If no credential or no authorized testnet signer: continue alternate eligible work, but produce a concise stop notice `blocked_code`, exact permission/config absent, prior validation, no unsafe workaround, next owner action and safe remaining tasks. Never idle for a user response if independent work remains.
