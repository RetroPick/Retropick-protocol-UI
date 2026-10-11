# Integration Status — living dashboard

Updated after every stage. Verdicts: `QUALIFIED / CONDITIONAL / BLOCKED / DEFERRED`.

| Sponsor | Status | Branch/PR | Implemented feature | Validation | Missing | Next action | Evidence |
|---------|--------|-----------|---------------------|------------|---------|-------------|----------|
| (baseline) | COMPLETE | main (rebased: `0454932`..`6ed65bf`, landed via `63524ab`) | land in-flight work | all suites green (see 00-BASELINE-AUDIT.md); final-campaign revalidation 234/0/38 green (`20261011T045252Z-fixture-final-campaign`) | — | — | `evidence/platform/frontend/browser-validation/` |
| Kuru consumer | PENDING | — | — | — | depth panel, post-only, evidence refresh | start Stage 1 | — |
| P0 gate | PENDING | — | — | forge 210/0/1 green @ baseline | drift check + docs | Stage 2 | — |
| Mera | NOT_STARTED | — | — | — | — | Stage 3 | — |
| Envio | NOT_STARTED | — | — | — | — | Stage 4 | — |
| Chainlink CRE | NOT_STARTED | — | — | — | — | Stage 5 | — |
| MetaMask agent | NOT_STARTED | — | — | — | — | Stage 6 | — |
| Aurora | NOT_STARTED | — | — | — | — | Stage 7 | — |
| Nansen | NOT_STARTED | — | — | — | — | Stage 7 | — |
| Kuru new assets (Stage 7) | DEFERRED — authorization-gated | — | kernels P0_CONDITIONAL, deployment plan + adapter plan issued; authorization requested twice (2026-10-11), no operator answer | local qualification stands (forge 210/0/1) | operator go + funded wallet would reopen this lane before the Oct-13 content stop | await operator | `execution/stages/P0_*.md` |
