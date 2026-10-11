# Applications

Agent-facing map of the `apps/` workspace. The pnpm workspace (root `pnpm-workspace.yaml`)
includes `apps/*` + `packages/*`; there is no task runner (no turbo), so run everything with
`pnpm --filter <package-name> <script>`. Node engines: `>=22.13` at the root, `>=24` for the
Node services (indexer / media-service / referral-service run TypeScript directly via
`node --experimental-strip-types` — no build step).

> **Read this first: which frontend is the product.**
> **`apps/retro-ui` is the CANONICAL product frontend.** `apps/web` is **NOT** the product —
> it is kept only as a read-only historical integration/testing example and is protected by a
> zero-write guard. The fixed decision is recorded in
> [`../docs/metropolis/execution/FRONTEND_SOURCE_OF_TRUTH.md`](../docs/metropolis/execution/FRONTEND_SOURCE_OF_TRUTH.md)
> (repeated in [`../docs/architecture/RETRO_UI_V2_INTEGRATION.md`](../docs/architecture/RETRO_UI_V2_INTEGRATION.md)).
> New product frontend work goes in `apps/retro-ui`, never in `apps/web`.
> Note: the root `package.json` scripts (`dev:web`, `build:web`, …) still target the legacy
> `@retropick/web` package — they are stale convenience aliases, not a product endorsement.

## At a glance

| App | Package | Role | Status | Port |
| --- | --- | --- | --- | --- |
| `abi/` | `@retropick/abi` | Canonical JSON ABI catalog for the deployed V2 launchpad (derived, never hand-edited) | Canonical shared boundary | — |
| `indexer/` | `@retropick/indexer` | GET-only event indexer: Monad events → SQLite journal → deterministic read API with freshness envelope | Canonical shared boundary | 8787 (loopback) |
| `media-service/` | `@retropick/media-service` | Token-logo upload (one image per launch; URI written onchain) — Pinata IPFS or local store | Canonical shared boundary | 8790 |
| `referral-service/` | `@retropick/referral-service` | Offchain referral ownership (signature challenge) + confirmed-event attribution | Canonical shared boundary | 8788 |
| `retro-ui/` | `@retropick/retro-ui` | **Main product frontend** (Vite + React 19 SPA) | **Canonical** | 3000 dev · 4317 e2e:fixture · 4318 e2e:live |
| `web/` | `@retropick/web` | Legacy Next.js prototype — integration/testing example only | Read-only historical (zero-write guard) | — |

## Chain & integrations

### Chain

- **Monad Testnet** — chain ID `10143`, native gas asset **MON**.
- Public RPC: `https://testnet-rpc.monad.xyz` (primary/failover configurable per app — see env below).
- RetroPick V2 deployed at block `69509526`, deployed source commit
  `f0363249f4b74e58dde37d1241742ca5a92bcfe3` (Sourcify `exact_match` verified; see
  [`abi/README.md`](abi/README.md) and `evidence/launchpad/v2-monad-testnet/source-verification-foundry.md`).
- Economic rule: **normal user writes go wallet → chain directly** (viem wallet clients / EIP-1193
  providers). No service holds keys, signs, or is an economic authority.

### On-chain contract integrations (from the [`abi/manifest.json`](abi/manifest.json) ownership labels)

- `RETROPICK_OWNED` — RetroPick V2 core, executors and deployment infrastructure
  (17 contracts: `RetroPickLaunchFactoryV2`, `GraduationCoordinatorV2`,
  `RetroPickBondingCurveV2`, `RetroPickQuoteAssetRegistryV2`, `RetroPickLauncherTokenV2`,
  `KuruLiquidityLockV2`, `KuruGraduationExecutorV2`, `UniswapV4GraduationExecutorV2`,
  `KuruEnvironmentV2`, `RetroPickBuybackVaultV2`, `RetroPickFeeEscrowV2`,
  `RetroPickGraduationGuardV2`, deployers/locker/hook/lock contracts — factory-created
  demo launch included).
- `UPSTREAM_KURU` — Kuru order book stack: `OrderBook`, `KuruAMMVault`, `MarginAccount`,
  `Router` (post-graduation secondary market). Compiled from pinned qualified Kuru source;
  deployed-bytecode identity is NOT established — runtime identity validation is required
  before use (see manifest `limitations`).
- `UPSTREAM_UNISWAP_V4_STACK` — deployment dependencies from Uniswap v4 periphery:
  `PoolManager`, `PositionManager`, `PositionDescriptor`, `WETH`, `Permit2`.
- `EXTERNAL_INTERFACE_ONLY` — `ERC20MetadataInterface`, the qualified interface for the
  external **Circle USDC proxy** (quote asset). Explicitly not a full implementation ABI.

### Offchain integrations

- **Indexer read API** — GET-only `/health`, `/v1/launches`, `/v1/launches/<token>/{trades|holders|candles|orders}`,
  `/v1/search`, `/v1/activity`, `/v1/pairs`, `/v1/wallets/<address>/{assets|orders|claims|buybacks}`
  with a freshness envelope (`chainId 10143`, `source MONAD_EVENT_INDEXER`, staleness threshold).
  Frontends treat it as the read model; it never signs.
- **Referral service** — consumes confirmed activity windows from the indexer's
  `/v1/activity` (15 s worker); retro-ui reaches it via the Vite dev proxy
  `/api/referrals → 127.0.0.1:8788`.
- **Media service** — logo upload; returns the URI that ends up in the onchain `logo` field
  (≤512 bytes, ADR-017). `PINATA_JWT` set → Pinata IPFS pinning; unset → local
  content-addressed store. retro-ui reaches it via `/api/media → 127.0.0.1:8790`.
- **Wallets** — EIP-6963 provider discovery in retro-ui (chain enforcement 10143);
  no wagmi.
- **Deployment** — Vercel. Known mismatch (recorded honestly in
  `FRONTEND_SOURCE_OF_TRUTH.md`): the public deployment
  `https://retropick-metropolis.vercel.app` currently serves the **legacy apps/web build**;
  retro-ui cutover is an operator-owned external blocker.

## How the apps connect

```
                    Monad Testnet (10143) — events + wallet→chain writes
                          ▲                     ▲                    ▲
                          │ viem reads          │ sync (viem)        │ viem reads
                          │                     │                    │
apps/abi (@retropick/abi) ◄── generated ── packages/launchpad-sdk ◄── apps/indexer ◄── apps/referral-service
   ▲ workspace:*                              ▲ workspace:*            │ GET /v1/*  :8787
   │                                          │                        │ /v1/activity
apps/retro-ui ────────────────────────────────┘                        ▼
   │  (main frontend; Vite dev proxies /api/referrals → 127.0.0.1:8788,  apps/referral-service
   │                     /api/media → 127.0.0.1:8790)                     (:8788)
   ├──► apps/indexer        (live reads: VITE_INDEXER_URL)
   ├──► apps/referral-service, apps/media-service   (proxied)
   └──► Monad RPC           (onchain reads + wallet writes)

apps/web: standalone — no workspace deps, no indexer, no @retropick/abi (inline ABIs + direct RPC).
apps/media-service: standalone — outbound HTTP to Pinata only when PINATA_JWT is set.
```

**Port map:** indexer `8787` (binds 127.0.0.1) · referral-service `8788` · media-service `8790`
· retro-ui dev `3000` · retro-ui e2e fixture `4317` / live `4318`.

`@retropick/abi` and `packages/launchpad-sdk` are both generated from the same frozen bundle
(`deployments/monad-testnet/abi/`), so the catalog, the SDK and the deployment bundle cannot
drift by construction.

---

## apps/abi — `@retropick/abi` (canonical ABI catalog)

Published JSON ABI catalog + generated TypeScript barrel (`abi.ts`) + `manifest.json`
(schema v2: roles, addresses, ownership, SHA-256 provenance, Sourcify status). No dependencies,
no build, no scripts — static files only.

- **Derived, never hand-edited.** Regenerate after a bundle refresh:
  `python3 scripts/launchpad/export_abi_catalog.py` (source: `deployments/monad-testnet/abi/`).
- Consumers import via the package exports: the `@retropick/abi/abi` TS barrel
  (generated, no `resolveJsonModule` needed) or `@retropick/abi/<Contract>.json`.
- See [`abi/README.md`](abi/README.md).

## apps/indexer — `@retropick/indexer` (read model)

Read-only, never-signing event indexer. Backfills Factory/Coordinator/launch events from
Monad Testnet into a SQLite journal (`.data/monad-testnet.sqlite`), builds deterministic
projections (launches, trades, holders, candles, quote volume) and serves the GET read API.
Node ≥24, TS via strip-types, `node:test`.

- Scripts: `start` (server), `sync` (backfill CLI), `test`, `typecheck`.
- Env: `MONAD_TESTNET_RPC_URLS` (comma list) **or** `MONAD_TESTNET_RPC_URL` +
  `MONAD_TESTNET_RPC_FALLBACK_URL` — **required, fails closed without them**;
  `INDEXER_DB`; `INDEXER_PORT` (default 8787, loopback); `INDEXER_MAX_BLOCKS_PER_PASS`.
- Key paths: `src/server.ts` (API + env), `src/query.ts` (endpoints), `src/cli.ts`,
  `src/project/` + `src/providers/` (projections, provider pool/failover), `test/`.
- No README — this section is the map.

## apps/media-service — `@retropick/media-service` (logo upload)

Token-logo upload over `node:http` (no framework). One image per launch; returns the URI to
write into the onchain `logo` field. Pinata IPFS in production mode; local content-addressed
fallback. No chain access, no custody.

- Scripts: `start`, `test`, `typecheck`.
- Env (`MEDIA_PORT` default 8790): `MEDIA_ORIGIN` (allowed origins), `MEDIA_DIR`,
  `MEDIA_PUBLIC_BASE`, `PINATA_JWT` (optional → IPFS mode).
- Key paths: `src/` (server, app, model, pinata, store), `test/media.test.ts`, `.env.example`.
- See [`media-service/README.md`](media-service/README.md).

## apps/referral-service — `@retropick/referral-service` (referral attribution)

Offchain referral ownership (challenge/signature verification via viem against Monad) +
confirmed-event attribution. A 15 s worker consumes confirmed windows from the indexer's
`/v1/activity` with atomic windows and reorg rollback. One-hour HttpOnly SameSite=Strict
session cookie. Holds no keys or funds.

- Scripts: `start`, `test`, `typecheck`.
- Env (`REFERRAL_PORT` default 8788): `REFERRAL_INDEXER_URL`
  (default `http://127.0.0.1:8787` — hard dependency on the indexer), `REFERRAL_RPC_URL`,
  `REFERRAL_DB`, `REFERRAL_ORIGIN`.
- Key paths: `src/` (server, app, auth, lock, store, sync), `test/`.
- Product/privacy contract: [`../docs/product/REFERRAL_SYSTEM.md`](../docs/product/REFERRAL_SYSTEM.md).

## apps/retro-ui — `@retropick/retro-ui` (MAIN frontend)

The product frontend. Vite 8 + React 19 + Tailwind v4 + radix-ui + @tanstack/react-query +
lightweight-charts + viem. Workspace deps: `@retropick/abi` + `@retropick/launchpad-sdk`.
Installed with bun (`bun.lock`) despite the pnpm workspace.

- Routes: `/launchpad` (discovery), `/launchpad/create`, `/launchpad/token/:id`,
  `/earn` (Claims/Portfolio/Created/Referrals/Funding), `/activity`, `/creator/:address`,
  `/prism*`, `/r/:code` referral capture.
- **Live integration pattern** (the current reference for indexer + ABI consumption):
  `VITE_DATA_MODE` fail-closed resolution (`src/lib/liquidity/registry.ts` → `src/lib/live/env.ts`);
  indexer HTTP client with envelope validation + staleness threshold
  (`src/lib/live/indexer-client.ts`); wallet→chain writes via `src/services/tx-pipeline.ts`
  (`executePreparedWrite`: approvals → simulate → sign → broadcast → receipt → decode) on top
  of launchpad-sdk `prepare*`; EIP-6963 wallet discovery (`src/wallet/provider.tsx`).
- Scripts: `dev` (port 3000), `build`, `preview`, `lint`/`typecheck` (tsc --noEmit),
  `test` + granular `test:product`/`test:terminal`/`test:indexed-record`/`test:media`,
  and e2e: `e2e:fixture` (offline mock, port 4317), `e2e:live` (read-only testnet + indexer,
  port 4318, signing bridge disabled), `e2e:smoke`, `e2e:research` (see
  [`retro-ui/e2e/README.md`](retro-ui/e2e/README.md), ports pinned in
  `retro-ui/playwright.config.ts`).
- Env (`retro-ui/.env.example`): `VITE_DATA_MODE` (`mock` default | `live`, requires
  `VITE_INDEXER_URL`), `VITE_INDEXER_URL` (default `http://127.0.0.1:8787`),
  `VITE_MONAD_RPC_URL` + `VITE_MONAD_RPC_FALLBACK_URL`, `VITE_IPFS_GATEWAY`.
  Dev proxies: `/api/referrals` → 127.0.0.1:8788, `/api/media` → 127.0.0.1:8790.
- Deeper docs: [`../docs/frontend/RETRO_UI_REVERSE_MAP.md`](../docs/frontend/RETRO_UI_REVERSE_MAP.md)
  (route/screen map with file-level evidence),
  [`../docs/architecture/RETRO_UI_V2_INTEGRATION.md`](../docs/architecture/RETRO_UI_V2_INTEGRATION.md),
  [`../docs/metropolis/execution/FRONTEND_SOURCE_OF_TRUTH.md`](../docs/metropolis/execution/FRONTEND_SOURCE_OF_TRUTH.md).
- E2E evidence lands in `evidence/platform/frontend/browser-validation/<timestamp>-<target>/`
  (heavy artifacts are gitignored).

## apps/web — `@retropick/web` (integration/testing EXAMPLE only — not the product)

**Not the product frontend.** Superseded by `apps/retro-ui`; read-only historical reference
protected by the retro-ui campaign's zero-write guard
(`retro-ui/e2e/tools/guard-forbidden-paths.mjs`, `FORBIDDEN_PREFIXES`:
`apps/web/`, `contracts/`, `packages/launchpad-sdk/`, `apps/indexer/`, `apps/abi/`,
`deployments/`). Do not write to it, do not rebuild it, do not migrate it.

What this example still teaches (frontend ↔ contract integration & testing, pre-SDK era):
Next.js 16 + React 19 + viem only, no wagmi, no workspace packages.

- **ABI-driven reads**: inline ABI copies (`lib/live/abi.ts`, provenance-pinned to the deployed
  source commit) consumed with **block-pinned `readContract` batches** — `readLaunch()`
  (`lib/live/model.ts`) fetches one block number then reads coordinator + token + curve state
  at that same block, with fail-closed on-chain identity checks ("Not a RetroPick V2 launch").
- **Verify before you write**: Kuru environment/market identity validation
  (`lib/live/kuru.ts` `readKuru()` — codehash/margin/impl comparison against
  `lib/live/release.json`) before any order is placed.
- **simulate-before-sign wallet flow** (`lib/live/wallet.tsx`): `simulateContract` refreshed
  immediately before every signature, then EIP-1193 `writeContract` + receipt revert check.
- **Fail-closed mode gating**: `liveMode()` (`lib/live/client.ts`) — anything other than
  `mock`/`live` in `NEXT_PUBLIC_DATA_MODE` fails closed.
- **Read-only RPC discipline**: all reads through the app's own allowlisted proxy
  (`app/api/chain/route.ts` — method allowlist, per-call pacing, result cache,
  `eth_getLogs` restricted to one address / ≤2000-block range), with 5 s UI polling and a
  15 s staleness cutoff — deliberately documented as *"the UI must not silently poll RPC in
  place of an indexer"* (`apps/web/docs/frontend/architecture.md`), which is exactly the gap
  the indexer + retro-ui later closed.
- **Testing**: pure-function unit suites via `node --test`
  (`scripts/test-frontend.mjs` compiles a whitelist and runs `tests/live-math.test.mjs` —
  curve integer math, slippage guards, order-book word decoding — plus domain and taxonomy
  suites). The full lifecycle (launch → curve buy/sell → graduate → secure → Kuru orders →
  complete) was qualified against real Monad Testnet, recorded in
  `evidence/hackathon/metropolis/frontend-release.json`
  (`MON_CREATE_BUY_SELL_SECURE_KURU_COMPLETE_ORDER_FILL_CANCEL_PASS`) and the two
  `frontend-e2e-*.json` files.

**Correction for agents:** apps/web never consumed `apps/indexer` or `@retropick/abi` — it
predates both. The current integration example for indexer + shared-ABI-package consumption
is `apps/retro-ui` (`src/lib/live/indexer-client.ts`, `src/services/tx-pipeline.ts`), which
is why the chain of custody runs: apps/web (direct-RPC qualification) → apps/retro-ui
(indexer + catalog integration).

## Agent cautions

- **retro-ui is the only place for new product frontend work.** apps/web is example-only and
  zero-write (guard prefixes above). No module inherits another module's production status.
- **Never hand-edit `apps/abi`** — regenerate it (`python3 scripts/launchpad/export_abi_catalog.py`).
- **The indexer fails closed without `MONAD_TESTNET_RPC_URLS` / `MONAD_TESTNET_RPC_URL`** —
  set them before `pnpm --filter @retropick/indexer start`.
- Nested directories `apps/indexer/apps/indexer/.data/` and
  `apps/referral-service/apps/referral-service/.data/` are **runtime data** (SQLite journals),
  not vendored apps.
- Heavy Playwright/browser evidence under `evidence/platform/frontend/browser-validation/` is
  gitignored by design.
- `retro-ui` e2e suites are the qualification surface: `e2e:fixture` for CI/offline,
  `e2e:live` for read-only chain checks; live-signing campaigns only via separately approved
  scripts with funded testnet wallets.
