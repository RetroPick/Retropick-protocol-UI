# Metropolis Sponsor Integration — Execution Home

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
