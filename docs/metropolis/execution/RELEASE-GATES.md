# Release Gates

## Campaign-level gates (every PR)

1. `git diff --name-only origin/main...HEAD -- apps/web` is EMPTY (zero-write guard).
2. `pnpm --filter @retropick/retro-ui typecheck && build && test` green.
3. `e2e:fixture` green on touched frontend paths (smoke at minimum for docs-only PRs).
4. Affected package suites green (indexer / sdk / referral / media as touched).
5. Evidence files with honest labels under `evidence/hackathon/metropolis/sponsors/<sponsor>/`.
6. `INTEGRATION-STATUS.md` updated.
7. No secrets, no mainnet interactions, no custodial signing, no V2 contract changes.

## Sponsor gates A–E (per mission §18)

- **A Source verification**: official SDK/docs consulted (URLs recorded in stage report),
  exact package version pinned, supported network validated, addresses verified against
  `deployments/monad-testnet/v2.json` / sponsor docs, no invented methods.
- **B Local engineering**: typecheck/build/unit/static/schema + error handling.
- **C Security**: no exposed keys; no unauthorized signing; no custody regression; no
  unbounded approvals; bigint precision; correct contract identity; failure states tested.
- **D Integration E2E**: real provider response; real chain receipt where required; state
  reconciliation; browser + mobile validation; existing product still functions.
- **E Hackathon eligibility**: sponsor requirement matrix satisfied; core product value;
  demo/judge access plan; submission answers accurate.

A sponsor is `QUALIFIED` only when A–E all pass with evidence. Build passing alone never
implies qualification.

## Deadline gates

- Conservative content stop: 2026-10-13 23:59 ET. Final 8 h: submission fixes only.
- No new contract deployment inside the final buffer.

## Staging release record (2026-10-11)

- `apps/web` guard: empty across all phase-2 commits (rendered configs gitignored).
- Staging suite green (12/12 read-only, public URL, desktop + mobile).
- Framework/build/output verified on the deployment (Vite / pnpm filtered / dist).
- Live mode + envelope validation verified; no mock leakage; no secrets in bundle.
- Production cutover: NOT performed — approval checkpoint stands (OPERATOR-ACTIONS §2).
