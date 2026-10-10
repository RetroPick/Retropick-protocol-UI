# retro-ui browser validation (Playwright Test)

Direct `@playwright/test` runner — **not** a Kiro workflow recipe. Each run writes a fresh, never-overwritten folder:
`evidence/platform/frontend/browser-validation/<UTC ts>-<target>[-label]/` (screenshots, observed console/network, results.json, html-report).

| Command (from `apps/retro-ui`) | Target | Server |
|---|---|---|
| `pnpm e2e [label]` / `pnpm e2e:fixture` | deterministic DEMO fixtures, mock wallet, offline network guard | `vite build` → `/tmp/retro-ui-e2e-fixture-dist`, `vite preview` strict port 4317 |
| `pnpm e2e:smoke` | `@smoke` subset of fixture | same |
| `pnpm e2e:live` | read-only Monad Testnet + indexer from `.env.local` (skips as ENVIRONMENT if the indexer is unreachable) | `vite build` → `/tmp/retro-ui-e2e-live-dist`, production preview strict port 4318, wallet bridge disabled |
| `pnpm e2e:research` | Pons / Bags read-only capture, excluded from default runs | none |

Extra Playwright args go after `--`, e.g. `pnpm e2e wave -- --project=mobile-390 e2e/fixture/token-terminal.spec.ts`.
Projects: desktop-1440, desktop-1280, tablet-834, tablet-768, mobile-390, mobile-375 (touch). Specs parameterise dark/light.

Safety: `helpers/mock-wallet.ts` rejects every signing request (4001) and records calls; `helpers/network-guard.ts` aborts any
`eth_sendTransaction` / `eth_sendRawTransaction` / `eth_sign*` request and (fixture) every non-local request.
Never run `scripts/e2e/live-*` from here — they sign and broadcast.

Demo scenarios: `/launchpad/token/<demo-active|demo-graduation-ready|demo-graduating|demo-graduated>?scenario=<slow-rpc|stale-indexer|no-holders|no-orders|margin-shortfall>&simulate=<reject-deposit|reject-order|fail-order>`.

Other tools: `node e2e/tools/mcp-handshake.mjs <dir>` (Playwright MCP Gate A), `e2e/tools/guard-forbidden-paths.mjs`, `e2e/tools/attribute-changes.mjs` (need `CAMPAIGN_BASELINE_DIR`).
Unit/golden: `pnpm test`, `pnpm test:product`, `pnpm test:terminal`, `pnpm test:media` (logo URI resolution + upload error mapping), `pnpm test:indexed-record`.

Media upload: `e2e/live/media-upload.spec.ts` covers the live launcher's local-image upload (with `/api/media` stubbed at the route level, so no service is needed), the advanced paste-a-URI path for `ipfs://`, and discovery rendering of an `ipfs://` logo through the public gateway (indexer feed patched in flight; skips as ENVIRONMENT when the indexer is down). The real service lives in `apps/media-service` (`pnpm --filter @retropick/media-service start`, port 8790, dev-proxied at `/api/media`).
