# Metropolis Sponsor Integration — Execution Home

> **2026-10-11 CURRENT AGENT ENTRY:** [Root unified ZCode GLM operator-unblock mission](../../RETROPICK_METROPOLIS_OPERATOR_UNBLOCK_MASTER_PROMPT.md) and [mandatory integration-agent workflow](integration/README.md). This supersedes the *execution order* in earlier time-stamped campaign prompts, but does not relax the original security requirements. PR #17 (staging), #18 (Creator Continuity), and #19 (Mera Protected Earn docs) are MERGED; do not restart staging. Backend/VPS, Envio, CRE, MetaMask, Mera and optional Pinata must be proved in real runtime separately. `apps/retro-ui` ONLY; never modify `apps/web/**`. Credentials are managed at protected host runtime rather than stored in GitHub. Every lane must create a stage record in `docs/metropolis/integration/stages/` and update the living status dashboard.


Monad Metropolis hackathon campaign for RetroPick. Primary track: **Onchain Finance & Trading**
(network: Monad Testnet, chain 10143). Deadline: **2026-10-14 10:59 GMT+7** (user-reported;
verified requirements doc records 2026-10-13 23:59 ET — treat that as the conservative stop).

## Canonical frontend lock (fixed user decision)

- `CANONICAL_FRONTEND = apps/retro-ui` (Vite + React, `@retropick/retro-ui`)
- `FORBIDDEN_FRONTEND = apps/web` (Next.js, read-only historical reference; zero writes)
- All sponsor UI, routes, hooks, adapters, frontend tests and browser E2E live in `apps/retro-ui`
  and permitted shared packages (`apps/abi`, `packages/launchpad-sdk`, purpose-built backends).

## Layout

- `00-MASTER-PLAN.md` — stage ordering, gates, deadline policy.
- `execution/` — living campaign records (baseline audit, capability matrix, integration status,
  external blockers, release gates, frontend source of truth).
- `execution/stages/` — per-sponsor stage reports produced as each stage executes.

## Status

See `execution/INTEGRATION-STATUS.md` (updated after every stage). Historical per-sponsor
ALLINONE planning documents (01–08) referenced by the mission prompt never existed in this
repository; their content is superseded by the stage reports under `execution/stages/`.


---
### 2026-10-11 Creator Continuity / Mera / CRE architecture update
**Start here for recovery:** [13 — Creator Continuity](13-CREATOR-CONTINUITY-MERA-CRE.md) and [Mera integration plan](../../integrations/mera-creator-continuity/README.md). A launched token has immutable deployer attribution; Factory V2 redirects **future creator fees** using owner-controlled 3-day override, not lost wallet, old escrow balances or ERC20 token ownership. apps/retro-ui is ONLY canonical frontend; older apps/web references in early sponsor guides are stale. /r/:code is referrals; token detail /launchpad/token/:address. CRE recovery watcher is PROPOSED, not implemented, and cannot approve/execute owner changes.


---
### Protected Earn — mandatory financial-security classification (2026-10-11)
**Start here**: [14 — Mera Protected Earn/Withdrawals](14-MERA-PROTECTED-EARN-WITHDRAWALS.md) and [15 — copyable ZCode execution prompt](15-ZCODE-MERA-PROTECTED-EARN-EXECUTION-PROMPT.md), with [integrations/mera-protected-earn](../../integrations/mera-protected-earn/README.md). The desired Earn "Require Mera Passkey" ON/OFF is **only app-level** for an existing EOA; real enforcement requires a passkey-controlled signing wallet or verified smart-account validator. Mera strategy vault != wallet authorization. App-only check is bypassable from another wallet. Claims, margin withdrawals, direct wallet transfer and off-ramp are DISTINCT actions. Referral payout & testnet bank cashout are not implemented. Absolutely never modify apps/web; only apps/retro-ui.
