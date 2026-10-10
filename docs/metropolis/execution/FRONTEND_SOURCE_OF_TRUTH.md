# Frontend Source of Truth

## Fixed decision (not a recommendation)

`CANONICAL_FRONTEND = apps/retro-ui` (Vite + React, package `@retropick/retro-ui`).
`FORBIDDEN_FRONTEND = apps/web` (Next.js) — read-only historical reference; zero writes of
any kind (code, config, deps, builds, artifacts). Enforced per commit/PR via the
`apps/web` zero-write guard.

## Current public deployment mapping (audited 2026-10-11, read-only)

- Public URL: `https://retropick-metropolis.vercel.app` — deployment `dpl_FaVJ7e5y2PPVior8GvCcGormVo65`,
  source SHA `6629acc7…`, status `READY_PUBLIC_READS_PASS` (per
  `evidence/hackathon/metropolis/frontend-release.json`).
- **Mismatch, recorded honestly**: that evidence file's `currentUI` field says
  *"Original apps/web Launchpad feed, wizard, terminal and product shell"*. The public
  Vercel deployment is therefore serving the **legacy apps/web frontend**, not retro-ui.
- Vercel dashboard access is not available to this agent. The retro-ui preview/cutover is
  recorded as an external blocker (see `EXTERNAL-BLOCKERS.md`): a retro-ui deployment
  target (new Vercel project rooted at `apps/retro-ui`, or an approved root-directory
  switch) must be configured by the operator. **No apps/web file may be touched to
  migrate it.** Until cutover, retro-ui evidence comes from local `e2e:fixture`,
  `e2e:live` (read-only) and local preview URLs.

## retro-ui reality (audited)

- Router: `src/routes.tsx` (custom `RouteSwitch` over a next-compat shim; lazy routes).
- Live routes: `/launchpad` (discovery), `/launchpad/create`, `/launchpad/token/:id`,
  `/earn` (hub: Claims / Portfolio / Created / Referrals / Funding), `/activity` /
  `/creator/:address` / `/prism*` (research panels, no live financial data in live mode),
  `/r/:code` referral capture. Demo/market fixtures under mock mode.
- State/data boundaries: `VITE_DATA_MODE` (`mock` default | `live` requires
  `VITE_INDEXER_URL`) resolved fail-closed in `src/lib/liquidity/registry.ts` →
  `lib/live/env.ts`. Live reads = indexer HTTP (envelope-validated, 8 s timeout, staleness
  threshold 64 blocks) + onchain `publicClient` (ordered RPC failover). React Query with
  `launchKeys` hierarchy.
- Write boundary: all user economic writes go wallet → chain via
  `services/tx-pipeline.ts` (`executePreparedWrite`: missing approvals → simulate → sign →
  broadcast → receipt → decode) on top of `@retropick/launchpad-sdk` `prepare*`. No
  custodial backend signing.
- Wallet: EIP-6963 discovery + picker (`src/wallet/provider.tsx`, `wallet-picker.tsx`),
  chain enforcement 10143, `createEvmWallet` only on Monad; e2e-only
  `session-bridge.ts` backed by an out-of-page signing service.
- Dependencies: `@retropick/abi`, `@retropick/launchpad-sdk`, viem, @tanstack/react-query,
  lightweight-charts, radix-ui, motion, tailwind v4. **No imports from apps/web.**
- Shared boundaries: `apps/abi` (frozen deployed ABIs + manifest),
  `packages/launchpad-sdk` (chain/read/prepare/wallet), `apps/indexer` (event journal →
  read model, GET-only), `apps/referral-service`, `apps/media-service` (logo upload).
- E2E: `playwright.config.ts` + `e2e/run.mjs`; `e2e:fixture` (offline, port 4317),
  `e2e:live` (read-only, bridge force-disabled, port 4318), `e2e:research`; six viewport
  projects; evidence under `evidence/platform/frontend/browser-validation/<ts>-<target>/`.
  Live-signing campaigns run only via separately approved scripts with funded wallets.

## Preview / deployment / cutover instructions (retro-ui only)

1. Local preview: `pnpm --filter @retropick/retro-ui build && pnpm --filter @retropick/retro-ui preview`.
2. For a public retro-ui preview, create a Vercel project with root directory
   `apps/retro-ui` (build `pnpm build`, output `dist`) — operator action, zero apps/web
   writes. Required env: `VITE_DATA_MODE=live`, `VITE_INDEXER_URL=<indexer origin>`,
   optional `VITE_MONAD_RPC_URL`/`VITE_MONAD_RPC_FALLBACK_URL`, `VITE_IPFS_GATEWAY`.
   Vercel rewrites needed for `/api/referrals` → referral-service and `/api/media` →
   media-service once those are hosted.
3. Production cutover from the apps/web deployment is a release-approval action: point the
   public domain at the retro-ui project with rollback to the previous deployment.
   No mock retro-ui may be presented as live without qualified chain connections.

## Blockers

- Vercel project configuration access (operator) — until resolved, public deployment
  continues to serve legacy apps/web; all retro-ui qualification evidence is local +
  read-only live (see `EXTERNAL-BLOCKERS.md`).
