# Metropolis Master Plan — Sponsor Integration Campaign

Source mission: `RetroPick_Metropolis_ZCode_GLM_Full_Integration_Prompt_RETRO_UI_ONLY.md` (repo root).
This plan records the campaign as approved by the operator on 2026-10-11.

## Operator decisions (fixed)

1. In-flight completed work is landed on `main` first as the qualified base (done: commits
   `8384c4c`, `044ee09`, `c9d391c`, `7fd742b`).
2. Stage 7 (Kuru New Assets onchain deployment) executes **only after the P0 gate report is
   delivered and the operator explicitly authorizes** with a funded testnet wallet.
3. Deadline-prioritized stage order (below), not strict mission order.

## Stage order (deadline-prioritized)

| # | Stage | Sponsor/bounty | Branch |
|---|-------|----------------|--------|
| 1 | Kuru consumer validation + gaps | Kuru "Next Consumer Trading App" | `feat/metropolis-kuru-consumer` |
| 2 | P0 qualification gate | (internal gate for Stage 7) | `feat/metropolis-p0-qualification` |
| 3 | Private Strategy Vault | Mera "One Passkey, Many Keys" | `feat/metropolis-mera-prf` |
| 4 | Market Quality Radar | Envio "Best Use of Envio" | `feat/metropolis-envio` |
| 5 | Graduation Safety Workflow | Chainlink "Best Workflow with CRE" | `feat/metropolis-chainlink-cre` |
| 6 | Risk-controlled trading agent | MetaMask Agent Wallet | `feat/metropolis-metamask-agent` |
| 7 | Route + entitlement checks | Aurora Intents / Nansen | docs/evidence only |
| 8 | Outcome markets onchain | Kuru "Bring New Assets and Markets" | `feat/metropolis-kuru-outcome-p0` (**authorization-gated**) |
| 9 | Cross-sponsor coherence + closure | — | per-stage |

## Per-sponsor gates

A — Source verification (official SDK/docs, pinned version, supported network, verified
addresses, no invented methods).
B — Local engineering (typecheck, build, unit tests, schema validation, error handling).
C — Security (no exposed keys, no unauthorized signing, no custody regression, no unsafe
allowance, correct bigint precision, failure states tested).
D — Integration E2E (real provider response, real chain receipt where required, browser/mobile
validation, existing product still functions).
E — Hackathon eligibility (meets sponsor requirements, core product value, evidence, judge
access).

Evidence labels: `SOURCE_VERIFIED`, `LOCAL_TEST_VERIFIED`, `ONCHAIN_VERIFIED`,
`BROWSER_E2E_VERIFIED`, `SPONSOR_QUALIFIED`, `BLOCKED` / `NOT_RUN`.
Evidence root: `evidence/hackathon/metropolis/sponsors/<sponsor>/`.

## Deadline policy

- Hard deadline: 2026-10-14 10:59 GMT+7 (user-reported portal close).
- Conservative stop: 2026-10-13 23:59 ET (verified in `docs/hackathon/METROPOLIS_REQUIREMENTS.md`).
- Final 8 hours: submission fixes only; no new contract deployments.
- Internal freeze dates in `docs/prism/05-hackathon/RETROPICK_METROPOLIS_AGENT_DEVELOPMENT_WORKFLOW.md`
  (code freeze 2026-10-11 23:59 GMT+7) predate this campaign's operator mandate and are recorded
  as superseded by the operator-approved mission prompt for sponsor-scope work; the launchpad-core
  contract freeze itself remains respected (no V2 contract changes in this campaign).

## Standing rules

- `apps/web` zero-write guard enforced before every commit and PR.
- One sponsor per branch/PR; no auto-merge; no mainnet; no secrets committed.
- Fail closed: missing CLI/credential/network ⇒ `BLOCKED_EXTERNAL` in
  `execution/EXTERNAL-BLOCKERS.md`, continue with next stage.
- Live testnet signing only inside the separately authorized workflow (Stage 8 and any
  order re-validation), with funded test wallets and bounded amounts.
