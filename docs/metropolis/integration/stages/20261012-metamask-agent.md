# 2026-10-12 — MetaMask Agent Wallet plugin: diagnostics, signer-ownership fix, approval packet

| Field | Value |
|---|---|
| Lane | L5 MetaMask Agent Wallet |
| Branch / PR | `feat/metropolis-metamask-agent-diagnostics` |
| Plugin | `@retropick/mm-plugin` 0.1.0 (`integrations/metamask-agent-retropick`) |
| CLI | `@metamask/agent-wallet` 6.2.1 (7.1.0 available, not installed — global upgrade = operator) |
| Status | **TESTED_LOCAL** — install BLOCKED_EXTERNAL (CLI local-path bug); publish/provision = operator gate |

## CLI diagnostics (observed)

```
mm --version → @metamask/agent-wallet/6.2.1 wsl-x64 node-v22.23.2
mm doctor    → { ok:true, cli:"6.2.1", authenticated:false, initialized:false }  (needs `mm login`)
```

## Install status — BLOCKER-005 CONFIRMED STILL PRESENT on 6.2.1

`mm plugins install <local-path>` and `<local-tarball>` BOTH fail: the CLI rewrites the absolute
path to `https://github.com/<path>` → `npm error 404 … name can only contain URL-friendly characters`.

What DOES work on 6.2.1 (verified): the consent/permission screen renders correctly before the
failure — it parses the manifest, lists all 7 declared commands with their dataAccess, and flags the
`wallet-submit ⚠` capability. So the manifest/schema are valid; only the local-source resolver is broken.

```
Declared commands:
  retropick markets (none) · retropick market inspect (none) · retropick order quote (none)
  retropick order place (accounts) · retropick order cancel (accounts)
  retropick wallet exposure (accounts, balances) · retropick market risk (none)
Requested capabilities: wallet-submit ⚠
```

Working install sources on 6.2.1 are therefore: a **published npm package** or a **git URL** only.
CLI 7.1.0 may fix local paths — not verified (global upgrade withheld pending operator approval).

## Code fixes landed this lane (no live wallet required)

Two handoff-flagged correctness bugs fixed:

1. **Signer-ownership fallback (cancel.ts)** — previously
   `agentAddress = byokWallets[0]?.address ?? owner ?? ''`, i.e. it fell back to the CALLER-supplied
   `owner`, so `checkCancel` compared a value against itself and ownership always "passed". Now the
   authenticated address comes ONLY from wallet state via `requireAgentAddress(...)`; with no wallet
   it refuses (`no-agent-wallet`). New `checkCancel` guard rejects a missing/invalid agent address.
2. **Placeholder live risk inputs (place.ts)** — previously `checkOrder` ran with
   `marginAvailableRaw:0, tickSizeX18:0, bookBlock:0, headBlock:0` and a comment claiming they were
   "re-verified live below" (they were not). Now `place` performs REAL read-only verification before
   proposing: authenticated agent address from wallet state (fail closed), `getMarketParams` →
   tick, `getBlockNumber` → book freshness, and live `marginAccount.getBalance(agent, asset)` →
   margin. The emitted verdict reports the actual notional, live margin and tick.

Policy core unchanged and still correct (chain/market/notional/size/tick/freshness/margin/ownership,
exact bigints, fail-closed). Tests: **10/10** (`test/policy.test.ts`) incl. new fail-closed cancel and
`requireAgentAddress` cases. `tsc -p tsconfig.json --noEmit` clean. `npm run build` clean (7 commands).

## Execution still gated

`order place` / `order cancel` stop after the policy/verification stage with
`agent-wallet-not-provisioned` — no live submission is claimed. Real execution requires: `mm login`,
an operator-provisioned agent wallet, and the mm wallet-submit approval/MFA flow. No private-key
signing, no MFA bypass, no arbitrary contract calls from arguments.

## OPERATOR APPROVAL PACKET (publication + provisioning)

Requires explicit operator approval (HARD GATE — not performed autonomously):

- **Package**: `@retropick/mm-plugin@0.1.0` · license MIT · provenance `integrations/metamask-agent-retropick`
- **Build**: `npm run build` → `dist/` + `oclif.manifest.json` (reproducible; dist is gitignored)
- **Manifest**: `mm.schemaVersion 1`, `minCliVersion ^6.2.0`, 7 commands as listed; capability
  `wallet-submit` on place/cancel only; dataAccess accounts/balances as listed.
- **Publish** (operator): `npm publish --access public` (2FA on the npm account).
- **Install** (operator, after publish OR via git URL on 6.2.1; local path only once on a CLI that
  fixes BLOCKER-005): `mm plugins install @retropick/mm-plugin` → review the consent screen → accept.
- **Provision** (operator): `mm login`; provision/attach the agent wallet; fund Kuru margin on 10143.
- **Live demo** (operator, bounded): `mm retropick order quote …` (read-only) → `order place …`
  (≤ 0.05 MON notional cap) → approve via mm/MFA → receipt → `order cancel …`.
- **Caps**: chainId 10143 only; verified market allowlist; maxNotional 0.05 MON; maxOrderSize 2M base;
  quote expiry 30s; book lag ≤ 16; underprice floor.
- **Rollback**: `mm plugins uninstall @retropick/mm-plugin`; npm deprecate/unpublish the version.

No `npm publish`, no `mm wallet provision`, and no live order were run by the agent.

## Next lane

Kuru Consumer regression + CRE evidence review (`20261012-kuru-cre.md`).
