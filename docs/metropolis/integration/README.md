# Metropolis Integration Agent Workflow — START HERE
**Mandatory live control plane for ZCode GLM and integration workers.** This is NOT a parallel product architecture; accepted ADRs, `.agent` rules and financial contract authority outrank it.

## Entry
1. Root [RETROPICK_METROPOLIS_OPERATOR_UNBLOCK_MASTER_PROMPT.md](../../../RETROPICK_METROPOLIS_OPERATOR_UNBLOCK_MASTER_PROMPT.md) — full mission, gates, order.
2. [00-AGENT-WORKFLOW.md](00-AGENT-WORKFLOW.md) — repeatable discover→qualify→handoff cycle.
3. [01-OPERATOR-SECRETS-AND-VPS.md](01-OPERATOR-SECRETS-AND-VPS.md) — protected credentials, Contabo isolation/backup/rollback and operator gate.
4. [02-QUALIFICATION-GATES.md](02-QUALIFICATION-GATES.md) — sponsor matrix, tests/receipts and judge-proof criteria.
5. [03-STAGE-AND-EVIDENCE-TEMPLATE.md](03-STAGE-AND-EVIDENCE-TEMPLATE.md) — exact report schema/template.
6. `stages/` — agents create timestamped current reports **when actual execution occurs**, not advance-filled green reports.

## Permanent decisions
- **CANONICAL FRONTEND `apps/retro-ui` ONLY; NEVER MODIFY OR BUILD `apps/web/**`.**
- Already-live public staging `https://retropick-metropolis-retro-ui-stagi.vercel.app`; PR #17 merged (do not redeploy original from scratch).
- Old docs often show *historical* status. Read current code/runtime before declaring anything.
- Root prompt and docs 13/14/15 remain fully binding on Mera signer/CRE authority; do not substitute a UI toggle for actual onchain security.
- No API/JWT/key values in tracked docs or PRs. Variables and secure injection procedures are in the root prompt. Operator-pasted secrets may need rotation.
- No write/installation/process restart on the mixed-use Contabo/Yubie VPS without operator change approval.
- No production-domain cutover, P0 deploy, wallet provisioning, npm publish, real financial tx or portal submit without respective explicit approvals.
- Every qualifying PR must update `docs/metropolis/execution/INTEGRATION-STATUS.md` + stage record; historical reports stay immutable and must not be rewritten as current.
- Evidence provenance: source implementation, unit test, simulated/fork, authenticated provider, real testnet tx, read-only public browser, live DON/mainnet are DIFFERENT levels.

## Integrations to track
| Lane | Existing baseline | Immediate action |
|---|---|---|
| Infrastructure + Staging | Vercel retro-ui live, WSL quick tunnel | VPS read-only inventory; backup/rollback proposal; operator host gate |
| Envio | Typed HyperSync radar with 8 unit tests; token-gated at earlier check | secure host token → live 10143 stream + durable resume + retro-ui real panel |
| CRE | Typed graduation safety workflow, earlier login block | cre whoami then official positive & negative simulator; creator watch after |
| Mera | PRF-encrypted vault; strategy-notes only | manual PRF evidence, honest Earn protection UX, actual passkey-derived signer |
| MetaMask Agent | CLI plugin + policy unit tests | investigate source install; publish/wallet provision approval required |
| Kuru Consumer | Existing real orderbook, margin and depth | freshness/live product & signer regression, no fake book |
| Kuru New Assets | Research P0 qualified locally | unchanged financial deployment gate |
| Aurora / Nansen | previously documented external blockers | no fake network/API; update only after real coverage |
| Media / Pinata | local logo upload works | rotated JWT for safe optional IPFS, no historical URI break |

## Current record and handoff
Working current status: [execution/INTEGRATION-STATUS.md](../execution/INTEGRATION-STATUS.md).
Original release contract: [execution/RELEASE-GATES.md](../execution/RELEASE-GATES.md).
Operator queue: [execution/OPERATOR-ACTIONS.md](../execution/OPERATOR-ACTIONS.md).
VPS baseline: [execution/STAGING-ARCHITECTURE.md](../execution/STAGING-ARCHITECTURE.md).
Submission: [docs/hackathon/SUBMISSION_CHECKLIST.md](../../hackathon/SUBMISSION_CHECKLIST.md).

Never mark a report complete without test/receipt/evidence. This README intentionally has no fabricated stage reports.
