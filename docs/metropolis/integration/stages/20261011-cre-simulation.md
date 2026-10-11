# Stage: Chainlink CRE — Official Graduation-Safety Simulation — 2026-10-11
State: SIMULATED (official `cre workflow simulate`; real read-only Monad Testnet reads +
real Sourcify v2 HTTP input; NO DON deployment claimed)
Owner/agent: ZCode GLM (operator-unblock campaign, lane L1)
Task ID: L1-cre-simulation
Current local HEAD: 56226f5 + lane branches (staging-restore committed; this lane on `feat/metropolis-cre-simulation`)
Remote main SHA: 56226f5c…
Staging origin: https://retropick-metropolis-retro-ui-stagi.vercel.app (restored, healthy)
Target chain and network: Monad Testnet 10143 (chain selector 2183018362218727504)
Operator approval ID/status: none required — read-only simulation on authenticated CLI
session; operator had completed `cre login` and directed simulation (master prompt §6).
Role: service (workflow) — no signing, no writes.

## CURRENT / TARGET / DELTA / MIGRATION
- CURRENT: workflow existed (PR #14) but had never simulated — blocked on login (B-004).
- TARGET: official simulator PASS + negative-case evidence for the Graduation Safety bounty.
- DELTA (all in `integrations/chainlink-cre/`):
  - `project.yaml`: rpcs moved UNDER the target key (cre v1.38 requirement — the previous
    global `rpcs:` block yields "no RPC URLs found"; verified against a `cre init`
    generated reference project).
  - `graduation-safety/main.ts`: canonical entrypoint (`export async function main()`,
    no parameters — javy rejects exported functions with parameters; no top-level await);
    Sourcify v1→v2 migration (v1 retired 2026-07; v2 `?fields=runtimeMatch` — `fields=all`
    returns 1.7 MB bytecode over the 250 KB production-mirror simulation limit);
    anchor `blockNumber` decoded via SDK `protoBigIntToBigint` (proto object, not bigint);
    TRANSPORT-FAILURE HARDENING (found by negative test): HTTP errors now produce the
    designed `INCOMPLETE_EXTERNAL` verdict instead of crashing the workflow.
  - `graduation-safety/config.monad-testnet.json`: v2 Sourcify URL.
  - Negative-case workflow copies `cre-neg-wrongmarket/`, `cre-neg-sourcify/`,
    `cre-neg-notgraduated/` (canonical config untouched, per operator correction).
- MIGRATION/rollback: revert the commit; simulation is read-only, nothing to roll back.

## Source and vendor verification
- CLI: `CRE CLI v1.38.0`, authenticated on THIS host/user (`Ubuntu-VPS-Clone`/`ubuntu`,
  org org_UnKUJyHDVyfgVrlO — `cre whoami` verified before running; matches the operator's
  reported login host).
- Simulator constraints honored: 250 KB HTTP response cap mirrors production (we reduced
  the Sourcify response via `fields=runtimeMatch` rather than raising limits).
- Workflow: typechecks clean (`bun run typecheck`) against @chainlink/cre-sdk 1.23.0.

## Secret handling
- No secrets required (read-only workflow). The simulator's default-key notice is a
  simulation artifact only; no `CRE_ETH_PRIVATE_KEY` set; logs sanitized of key notices.

## TESTS and EVIDENCE
| Gate | Command / scenario | Expected | Observed | Pass/Fail |
|---|---|---|---|---|
| D real | positive: canonical config | PASS | **PASS** — anchorBlock 70100439; graduated/marketIdentity/custodyAgreement=true; Sourcify `exact_match` → externalFactoryVerified=verified | PASS |
| C security | negative: wrong expectedMarket (0x…dEaD) | FAIL | **FAIL** — marketIdentity=false | PASS |
| C security | negative: Sourcify unreachable (DNS) | INCOMPLETE_EXTERNAL, no crash | **INCOMPLETE_EXTERNAL** (after hardening; previously crashed — bug found & fixed) | PASS |
| C security | negative: non-graduated token (0x8c2d…, phase 0) | FAIL | **FAIL** — ledgerPhase=0, graduated=false, custodyAgreement=false | PASS |
| C security | duplicate-run determinism | same verdict | consecutive runs both PASS; anchorBlock advances with head (by design) | PASS |
| B local | `bun run typecheck` | clean | clean | PASS |

Evidence (sanitized logs): `evidence/hackathon/metropolis/sponsors/chainlink-cre/simulation/{positive,negative-wrong-market,negative-sourcify-down,negative-not-graduated}.log`
+ `simulation-results.json` (incl. the five fixes required to make the official simulator run).

## REVIEW
- No protocol-owner keys; CRE never gates withdrawals; read-only workflow unchanged in
  intent — only correctness fixes (config structure, entrypoint shape, v2 API, bigint
  decode, transport-failure handling).
- apps/web: zero-write (guard verified at commit).
- SIMULATED ≠ LIVE DON: no deployment requested (`cre account access` prompt declined).

## FINAL VERDICT & NEXT
- Status: **SIMULATED** — sponsor "Best Workflow with CRE" acceptance path (official
  simulation OR live deployment) now satisfied on the simulation branch of that
  requirement; Gates A/B/C/D-sim pass; Gate E (product demo) uses these traces.
- Next (agent): creator-continuity watcher evaluation as a SEPARATE read-only workflow
  (post-review), per doc 13.
- Operator action: none for simulation; DON deployment would need `cre account access`
  (not requested).
- Handoff: L2 Envio lane begins.
