# RetroPick × Chainlink CRE — Graduation Safety Workflow

Sponsor bounty: **Best Workflow with CRE**. Branch `feat/metropolis-chainlink-cre`.

The workflow independently verifies the RetroPick primary→secondary (curve → Kuru
orderbook) transition:

```
cron trigger
  → chain anchor (block header)
  → coordinator.ledger(token): phase === 2?
  → coordinator.receipt(token): market === expected Kuru market?
  → custody agreement: protected-LP amounts match between ledger and receipt, > 0
  → external input: Sourcify verification status of the launch factory (HTTP capability)
  → deterministic verdict: PASS | FAIL | INCOMPLETE_EXTERNAL + bounded JSON report
```

Read-only; no secrets; no onchain writes. Duplicate triggers are handled by idempotence:
the rules are deterministic over fresh chain state, so a repeated trigger at the same
state produces the same verdict, and every report carries its anchor block.

## Status (2026-10-11)

- CRE CLI v1.38.0 installed via the official script; Monad Testnet supported since
  v1.30.0 (chain selector `monad-testnet` = `2183018362218727504n`).
- Workflow implemented and **typechecks clean** against `@chainlink/cre-sdk` 1.23.0 —
  every capability call verified against the SDK's shipped type definitions.
- **Official simulation is BLOCKED_EXTERNAL**: `cre workflow simulate` (and even
  `cre init`) require an authenticated CRE account (`cre login` / `CRE_API_KEY`) —
  see `docs/metropolis/execution/EXTERNAL-BLOCKERS.md` BLOCKER-004.
- No onchain CRE execution is claimed.

## Run it (operator, after `cre login`)

```bash
cd integrations/chainlink-cre
cp .env.example .env          # RPC url (public Monad testnet works for reads)
cre workflow simulate graduation-safety --target monad-testnet-settings \
  --non-interactive --trigger-index 0
```

Success path expectation: verdict `PASS` (the evidenced launch graduated with matching
custody records; factory has Sourcify `perfect` match). Failure paths to demo:
point `expectedMarket` in `config.monad-testnet.json` at a wrong address → `FAIL`;
make the Sourcify URL unreachable → `INCOMPLETE_EXTERNAL`.

## Layout

- `project.yaml` — monad-testnet RPC (env-interpolated).
- `graduation-safety/main.ts` — the workflow (ABIs imported from the workspace SDK,
  single source of truth, relative path — this project is intentionally NOT a pnpm
  workspace member so its installs never touch `apps/web`).
- `graduation-safety/workflow.yaml`, `config.monad-testnet.json`, `package.json`,
  `tsconfig.json` per the documented TS project structure.
