# Integration Status — living dashboard

Updated after every stage. Verdicts: `QUALIFIED / CONDITIONAL / BLOCKED / DEFERRED`.

| Sponsor | Status | Branch/PR | Implemented feature | Validation | Missing | Next action | Evidence |
|---------|--------|-----------|---------------------|------------|---------|-------------|----------|
| (baseline) | COMPLETE | main (rebased: `0454932`..`6ed65bf`, landed via `63524ab`) | land in-flight work | all suites green (see 00-BASELINE-AUDIT.md); final-campaign revalidation 234/0/38 green (`20261011T045252Z-fixture-final-campaign`) | — | — | `evidence/platform/frontend/browser-validation/` |
| Kuru consumer | TESTED_E2E (QUALIFIED pending deployment access) | PR #10 (`feat/metropolis-kuru-consumer`) | aggregated depth panel + post-only orders (gaps closed; core pre-existing) | typecheck/build PASS, terminal 14/0, fixture e2e 244/0, onchain read-only revalidation PASS @ block 69927875 | judge-accessible deployment (BLOCKER-001); optional live re-sign (BLOCKER-002) | merged with operator authorization | `evidence/hackathon/metropolis/sponsors/kuru/` |
| P0 gate | P0_CONDITIONAL (local requalification PASS) | PR #11 (`feat/metropolis-p0-qualification`) | stage gate docs (security revalidation, deploy feasibility, kuru adapter plan) | zero source drift vs 4f3c70b (tree hashes identical); gate suites 39/0; full 210/0/1 on forge 1.8.4 | operator authorization + funded signer (BLOCKER-002) | merged with operator authorization | `docs/metropolis/execution/stages/P0_*.md` |
| Mera PRF vault | CONDITIONAL (impl complete, failure-states E2E-verified) | PR #12 (`feat/metropolis-mera-prf`) | Private Strategy Vault (Earn→Vault tab): passkey-PRF-encrypted theses/drafts/watchlists/risk budgets; save re-encrypts per ceremony | unit 7/0; fixture e2e incl. 3 new @vault specs; encrypted-at-rest asserted | manual PRF happy-path evidence (operator, ~2 min); deployment (BLOCKER-001) | merged with operator authorization | `sponsors/mera/` |
| Envio | NOT_STARTED | — | — | — | — | Stage 4 | — |
| Chainlink CRE | NOT_STARTED | — | — | — | — | Stage 5 | — |
| MetaMask agent | NOT_STARTED | — | — | — | — | Stage 6 | — |
| Aurora | NOT_STARTED | — | — | — | — | Stage 7 | — |
| Nansen | NOT_STARTED | — | — | — | — | Stage 7 | — |
| Kuru new assets (Stage 7) | DEFERRED — authorization-gated | — | kernels P0_CONDITIONAL, deployment plan + adapter plan issued; authorization requested twice (2026-10-11), no operator answer | local qualification stands (forge 210/0/1) | operator go + funded wallet would reopen this lane before the Oct-13 content stop | await operator | `execution/stages/P0_*.md` |
