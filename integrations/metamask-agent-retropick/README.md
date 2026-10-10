# RetroPick × MetaMask Agent Wallet — Risk-Controlled Trading Agent Plugin

Bounty: MetaMask Agent Wallet. Branch `feat/metropolis-metamask-agent`.

A genuine oclif CLI plugin (`mm` CLI, manifest schemaVersion 1, peer
`@metamask/agent-wallet ^6.2.0`) giving a trading agent RetroPick-specific,
policy-bounded capabilities:

```
mm retropick markets                     # verified launches + lifecycle (read-only)
mm retropick market inspect <token>      # ledger phase + Kuru best bid/ask
mm retropick order quote <m> <side> <price> <size>   # exact params + full policy verdict
mm retropick order place  …              # policy-gated proposal; FAILS CLOSED without a
                                         # provisioned agent wallet (never claims submission)
mm retropick order cancel <m> <id> <owner>           # signer-ownership gated; fails closed
mm retropick wallet exposure <market>    # margin balances (read-only)
mm retropick market risk <market>        # explainable factors, never a naked score
```

## Policy core (the security boundary, pure + unit-tested)

Chain allowlist (10143 exactly) · verified Kuru market registry · per-order notional cap
(0.05 MON default) and size cap · quote expiry (30 s) · orderbook freshness (≤16 blocks) ·
tick alignment · underprice guard · margin sufficiency per side · cancel signer-ownership.
Every refusal surfaces its reasons; nothing is silently ignored. The host's MFA/policy
enforcement is never bypassed; `place`/`cancel` explicitly fail closed until an
operator-provisioned agent wallet exists.

## Status (2026-10-11)

- Typechecks against `@metamask/agent-wallet` 6.2.1; policy core 8/8 unit tests
  (`npm run test:policy`).
- Bundled `dist/` per command (bun; host packages kept external) + `oclif.manifest.json`.
- `mm` CLI 6.2.1 installed; `mm doctor` OK (node 22.23.2).
- **Install BLOCKED (BLOCKER-005)**: the CLI's consent screen fully parsed our manifest
  (all 7 commands + the `wallet-submit` capability flagged) but local directory/tarball
  installs hit a 6.2.1 bug (`https://github.com//<abs-path>` rewrite → npm exit 1,
  verified twice). The supported verifiable source is npm publish — an operator decision.
- Live order execution: NOT claimed and NOT run.

## Go live (operator)

1. `npm publish` this package (or host it as a GitHub repo source).
2. `mm plugins install @retropick/mm-plugin --accept-permissions`
   (review the declared capabilities: `wallet-submit` for place/cancel only).
3. `mm retropick markets` / `… market risk …` (read-only) — then policy-bounded
   place/cancel with the provisioned wallet, which still routes through MetaMask
   MFA/policy approvals.

## Layout

`src/policy.ts` (pure core) · `src/context.ts` (deployed addresses + exact ABI subsets
copied from the canonical workspace ABIs, inlined so the plugin builds standalone) ·
`src/commands/retropick/**` · `test/policy.test.ts`.
