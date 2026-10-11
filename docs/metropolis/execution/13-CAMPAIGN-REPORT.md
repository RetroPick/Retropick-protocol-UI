# Metropolis Sponsor Campaign — Final Report

Campaign window: 2026-10-11 (single execution day). Operator-approved mission:
`RetroPick_Metropolis_ZCode_GLM_Full_Integration_Prompt_RETRO_UI_ONLY.md`.
Canonical frontend: `apps/retro-ui` (fixed). `apps/web`: **zero campaign writes** —
`git diff --name-only origin/main...<branch> -- apps/web` is empty on all 7 PR branches.
(Note: the separate main-landing commit `63524ab`, authored outside this campaign by the
operator, added the long-pre-existing untracked `apps/web/package-lock.json`; it is not
part of any campaign PR and was not reverted, per the rule against touching apps/web.)

## A. Final architecture (actual, no speculation)

Product on main: retro-ui trading terminal (Kuru orderbook depth + post-only added on
PR #10), Earn hub incl. Mera passkey vault (PR #12), indexer + referral + media services,
V2 testnet contracts unchanged. New standalone integrations (no workspace membership, no
root installs): Envio radar service (PR #13), Chainlink CRE workflow (PR #14), MetaMask
agent plugin (PR #15). Planning docs 01–12 (from PRs #8/#9) coexist with these execution
records under `docs/metropolis/execution/`.

## B. Sponsor matrix

| # | Sponsor / bounty | Verdict | PR | Blocker |
|---|------------------|---------|-----|---------|
| 1 | Kuru — Next Consumer Trading App | **TESTED_E2E** (gaps closed: aggregated depth, post-only; onchain read-only revalidation PASS) | [#10](https://github.com/RetroPick/retropick-protocol/pull/10) | deployment cutover (B-001) |
| 2 | (internal) P0 gate | **P0_CONDITIONAL** — zero drift vs `4f3c70b`, 210/0/1 | [#11](https://github.com/RetroPick/retropick-protocol/pull/11) | — |
| 3 | Mera — One Passkey, Many Keys | **CONDITIONAL** — impl complete, failure-states E2E, encrypted-at-rest asserted | [#12](https://github.com/RetroPick/retropick-protocol/pull/12) | ~2-min operator manual PRF run |
| 4 | Envio — Best Use of Envio | **BLOCKED_EXTERNAL** (token-gated endpoint) + core TESTED_LOCAL (8/8) | [#13](https://github.com/RetroPick/retropick-protocol/pull/13) | ENVIO_API_TOKEN (B-003) |
| 5 | Chainlink — Best Workflow with CRE | **TESTED_LOCAL** (typechecked, SDK-verified API) | [#14](https://github.com/RetroPick/retropick-protocol/pull/14) | `cre login` (B-004) |
| 6 | MetaMask Agent Wallet | **TESTED_LOCAL** (typecheck + policy 8/8 + manifest validated by mm) | [#15](https://github.com/RetroPick/retropick-protocol/pull/15) | npm publish / CLI install bug (B-005) |
| 7 | Aurora — Any-Chain Liquidity | **BLOCKED_EXTERNAL, closed** (no testnet route; mainnet out of scope) | [#16](https://github.com/RetroPick/retropick-protocol/pull/16) | B-006 |
| 8 | Nansen — Best Use of Nansen | **BLOCKED_EXTERNAL, closed** (no key + no testnet coverage; local-signal risk factors ship instead) | [#16](https://github.com/RetroPick/retropick-protocol/pull/16) | B-007 |
| 9 | Kuru — New Assets (Stage 7) | **DEFERRED** — authorization-gated (asked twice, unanswered) | — | operator go + funded wallet (B-002) |

## C. Validation summary (real commands, real results — 2026-10-11)

- Landed main: retro-ui typecheck/build PASS; unit 17+11+4+6; referral 15; media 7; SDK
  43/0/2skip; indexer typecheck + 42; forge kernels 210/0/1. Full fixture e2e on main +
  per-branch runs recorded in `evidence/platform/frontend/browser-validation/`
  (234→244→250 pass progression; final-campaign run referenced in INTEGRATION-STATUS).
- Onchain: read-only market revalidation PASS at block 69927875 (identity, best bid/ask,
  historical order/fill/cancel records).
- `apps/web` zero-write guard: verified per commit and per PR (all empty).

## D. Operator decision queue (updated 2026-10-11 — PRs #10–#16 are ALL MERGED; queue refresh)

1. ~~Merge PR #10 and #12~~ **DONE** (all seven merged with operator authorization;
   post-merge main re-validated green: e2e 260/0, forge 210/0/1).
2. **retro-ui public staging deployment** — in progress on
   `feat/metropolis-retro-ui-staging` (Vercel staging project + quick-tunnel backends;
   see the STAGING-* docs once landed). Legacy `retropick-metropolis.vercel.app` still
   serves apps/web until an approved cutover.
3. **Mera manual run** (~2 min, PRF-capable browser): steps in
   `evidence/hackathon/metropolis/sponsors/mera/README.md` (best on the stable staging host).
4. **Stage 7 go/no-go** (Kuru New Assets onchain): if yes, provide a funded testnet wallet
   (≤2 MON cap) before the Oct-13 23:59 ET content stop.
5. Tokens/logins that unblock bounties: `ENVIO_API_TOKEN`, `cre login`, npm publish of
   `@retropick/mm-plugin`.
6. Submission answers + demo video per `docs/hackathon/SUBMISSION_CHECKLIST.md` (founder
   approval gates remain unchecked).

## E. Known limitations (honesty ledger)

No sponsor integration is claimed working where a blocker exists; no mock was passed off
as a real provider; no mainnet; no V2 contract changes; live signing never ran. Mera's
full PRF path, CRE simulation, Envio streaming, and mm plugin execution are each one
operator action away from genuine qualification evidence.

## F. Future roadmap (no production claims)

Qualified integrations extend toward Monad mainnet only after: retro-ui deployment
cutover + release qualification, V2 contract audits beyond hackathon scope, Aurora
mainnet route verification, Nansen entitlement + redistribution compliance, and the P0
legal-review plan executed.
