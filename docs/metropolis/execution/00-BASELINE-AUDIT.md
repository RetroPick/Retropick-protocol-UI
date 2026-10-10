# Baseline Audit — 2026-10-11

## Repository

- Branch `main` @ `f643cb6` (in sync with `origin/main`), then baseline commits
  `8384c4c` (media service + create-launch upload), `044ee09` (earn hub radix tabs +
  referral QR + indexed-record), `c9d391c` (SDK RPC failover + indexer hardening +
  ticket error fidelity), `7fd742b` (resume e2e tooling + handoff record).
- In-flight work was landed before any sponsor work (operator decision #1). Generated
  evidence artifacts (~8.4k files under `evidence/platform`, `evidence/launchpad`), agent
  tool-state dirs (`.agents`, `.cursor`, `.v2c`, `.video_agent`, `.zcode`), the mission
  markdown files and root screenshots remain untracked and untouched.
- Worktrees: `retropick-protocol-main-merge` (`codex/merge-v2-to-main` @ 84861f5),
  `retropick-protocol-metropolis` (`codex/metropolis-market-creation` @ 8a5fc1f),
  `retropick-protocol-v2-monad-testnet-e2e` (`codex/v2-monad-testnet-e2e` @ a8a81f5).
- No `feat/metropolis-*` branches existed before this campaign.

## apps/web guard (zero-write)

- Tracked modifications: **none** (verified `git diff --name-only -- apps/web` empty,
  staged empty).
- Pre-existing untracked: `apps/web/package-lock.json` only. Recorded as baseline;
  never touched, never staged.

## Toolchain / environment

| Tool | Version | Note |
|------|---------|------|
| node | v22.23.2 | satisfies MetaMask agent CLI ≥22.18; below indexer's `>=24` engines field (warning only — suite passes) |
| pnpm | 11.25.0 | |
| forge | 1.8.4 | kernels qualified on 1.8.3; re-run green on 1.8.4 |
| docker | 29.8.2 | available for Envio codegen |
| envio CLI | not installed | probe via `pnpx envio` in Stage 4 |
| mm CLI | not installed | Stage 6 probe |
| Monad RPC `https://testnet-rpc.monad.xyz` | HTTP 200 (0.5 s) | reachable |
| HyperSync `https://10143.hypersync.xyz` | HTTP 401 on bare GET | likely API-token policy; verify with real client in Stage 4 |

## Baseline validation results (2026-10-11, post-baseline-commits)

| Suite | Result |
|-------|--------|
| retro-ui `typecheck` | PASS |
| retro-ui `build` | PASS (1.73 s) |
| retro-ui `test` | 17 pass / 0 fail |
| retro-ui `test:media` | 4 pass / 0 fail |
| retro-ui `test:indexed-record` | 6 pass / 0 fail |
| retro-ui `test:terminal` | 11 pass / 0 fail |
| retro-ui `e2e:fixture` | 234 pass / 0 fail / 36 skipped (matrix skips), evidence `evidence/platform/frontend/browser-validation/20261010T204631Z-fixture` |
| launchpad-sdk `test` | 43 pass / 0 fail / 2 skipped |
| indexer `typecheck` + `test` | PASS; 42 pass / 0 fail |
| referral-service `test` | 15 pass / 0 fail |
| media-service `test` | 7 pass / 0 fail |
| contract-kernels `forge test` | 210 pass / 0 fail / 1 skip (96.6 s) |

Failure categories: none. No pre-existing baseline failures, no regressions, no missing
dependencies at baseline.

## Deployed V2 reference (from `deployments/monad-testnet/v2.json`, chain 10143)

Factory `0xa7f18b9eceb0A9852b08408854A45D00fc682454`; Graduation Coordinator
`0xaD62309242EA65BB07C833669EC6a4ED23AF738F`; Kuru Executor `0xa2590ab2bB30BE1e514F4a390A87E9B2A2c71983`;
Kuru market (evidence) `0x1F5dE72616a7fe645Cf45aC66dfce8Ac7452C57F`; Kuru vault
`0xc88DED06eB0081430Ff02d124C22b532e122CbE7`. Deployment gitSHA `f0363249`, 32 deployment
transactions, 145/0/0 test campaign at fork 69507986.

## Historical Kuru evidence (revalidation targets for Stage 1)

`evidence/hackathon/metropolis/frontend-e2e-trading.json` — `ORDER_FILL_CANCEL_PASS`,
14 CONFIRMED testnet transactions, two-actor campaign (taker + maker), selectors for
limit order `0x40e79b1b`, market/fill `0xa09e9040`, cancel `0x23afbff3`; source events
match; post-trade order sizes zero. `KURU_BOUNTY.md` maps each requirement to tx links.
