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


---
## Proposed new workflow: creator-continuity (NOT IMPLEMENTED)
Current graduation-safety workflow is read-only and should be qualified with cre workflow simulate FIRST. A follow-up Creator Continuity Watch may provide an independent onchain+external verification report for 3-day creator-fee-recipient overrides.

**Inputs:** RetroPickLaunchFactoryV2.getLaunchedToken(token), pendingCreatorFeeRecipient(token), CreatorFeeRecipientChangeProposed/Cancelled/Updated events; external reviewed pre-enrollment record containing creator wallet-signature proof plus WebAuthn credential proof metadata, recent case revision, expected recipient and expiry. Do not transmit Mera PRF material, unencrypted private case content or protocol-owner key.

**Output:** anchored deterministic statuses ALIGNED, UNVERIFIED, UNMATCHED, WAITING, EXECUTABLE, EXPIRED, REPLACED, CANCELLED, CONFIRMED, INCOMPLETE_EXTERNAL. No CRE-mediated admin call or fake authority. Actual creator-fee redirect requires protocol owner proposing onchain and anyone executing within 3-day post-delay window; no creator veto exists. Existing credit to old FeeEscrow beneficiary is not recoverable, and graduated Kuru revenue path is unqualified. Time travel via Foundry is not live completion.

**Implementation:** independent sibling folder integrations/chainlink-cre/creator-continuity with SDK types discovered from the installed version; no modifications to current graduation-safety until its own simulation qualified. Unit and negative cases required: wrong recipient; stale/compromised external case; missing enrollment; cross-chain mismatch; owner cancel; replaced proposal; expired window; replay and chain reorg. Link to [full architecture](../../docs/metropolis/13-CREATOR-CONTINUITY-MERA-CRE.md) and https://docs.chain.link/cre/overview . THIS IS A DESIGN, NOT DELIVERED EXECUTION.


---
## Enforceable custody correction for Mera Protected Earn
See [14](../../docs/metropolis/14-MERA-PROTECTED-EARN-WITHDRAWALS.md). CRE graduation and continuity workflows may publish independent checks on fee recipient/escrow/vest but **cannot** block legacy EOA direct FeeEscrow claim, Kuru withdraw, or MON transfer merely because RetroPick's UI "Require Passkey" flag is ON. Avoid claiming a CRE risk report is onchain authorization or new DApp vault. Show actual signer source and claim/account authority separately, label all CLI simulation distinct from live DON.
