# FIX — Reusable Add-to-Wallet (EIP-747) for RetroPick launch tokens

Branch `dev/continue-live-20261014` · 2026-10-15 · smallest justified change; no contract,
economics, or pipeline redesign; no new dependencies; legacy `apps/web` untouched.

## Files changed

| File | Change |
|---|---|
| `packages/launchpad-sdk/src/wallet.ts` | `buildWatchAssetPayload()` (exact EIP-747 shape; `image` only when `https://`) and `watchAsset()` (refuses to request unless the provider reports chain 10143; 4001/-32601 propagate typed) |
| `packages/launchpad-sdk/src/model.ts` | `loadIdentity()` now also reads on-chain `decimals()` (was absent) |
| `apps/retro-ui/src/features/launchpad/add-to-wallet.ts` | pure helpers: `httpsImageUrl`, `classifyWatchAssetError`, `watchAssetAction`, `addToWalletPayload` |
| `apps/retro-ui/src/features/launchpad/add-to-wallet-button.tsx` | the button: click-only prompt; disconnected → connect; wrong-chain → switch; decimals from identity read (fallback: direct contract read at click — never assumed); success toast never claims the icon changed and explains the re-import remedy; rejection / unsupported / copy-address fallback handling |
| `apps/retro-ui/src/features/launchpad/terminal/token-terminal.tsx` | optional `headActions` slot at the end of the `.rp-meta` header row (demo route passes nothing) |
| `apps/retro-ui/src/features/launchpad/token-detail.tsx` | live route composes `headActions=<AddToWalletButton …>` |
| `apps/retro-ui/src/features/portfolio/live-portfolio.tsx` | token positions now join the indexer launch logo and render `TokenImage` (glyph fallback kept) |
| `apps/retro-ui/e2e/helpers/mock-wallet.ts` | `wallet_watchAsset` support (`resolve`/`reject`/`unsupported`), params recorded per call, `walletMethodCalls()` helper |
| `apps/retro-ui/e2e/live/add-to-wallet.spec.ts` | new live suite (real RPC, mock wallet): payload correctness on the real CIS page, no auto-prompt, rejection, unsupported + copy fallback, wrong-chain recovery |
| `apps/retro-ui/tests/add-to-wallet.test.mjs` + `package.json` (`test:add-to-wallet`) | unit suite for the pure helpers |
| `packages/launchpad-sdk/test/wallet-watchasset.test.ts` | unit suite for the SDK helper |

## Test results (actual runs, 2026-10-15)

| Suite | Command | Result |
|---|---|---|
| SDK unit | `npm test` (launchpad-sdk) | **69 pass / 0 fail** (incl. 5 new watchAsset tests) |
| retro-ui new unit | `npm run test:add-to-wallet` | **4 pass / 0 fail** |
| retro-ui media unit | `npm run test:media` | 5 pass / 0 fail |
| retro-ui terminal unit | `npm run test:terminal` | 14 pass / 0 fail |
| retro-ui frontend unit runner | `npm test` | 17 pass / 0 fail |
| typecheck | `tsc --noEmit` (retro-ui + sdk) | clean |
| build | `vite build` (retro-ui) | success |
| fixture e2e regression (full) | `node e2e/run.mjs fixture` | **266 pass / 0 fail / 40 pre-existing skips** across all 6 projects (evidence: `evidence/platform/frontend/browser-validation/20261015T100752Z-fixture`, left untracked per the heavy-artifact policy) |
| live add-to-wallet e2e | targeted, desktop-1440 + mobile-390 | **8 pass / 0 fail** (`e2e/results.json`, screenshots `e2e/screenshots/*`) |

The live e2e asserts, against the real CIS page on Monad Testnet: no `wallet_watchAsset`
during page load or connect (prompt is click-only); on click the provider receives exactly
`{ type: 'ERC20', options: { address: 0xc399…e50f, symbol: 'CIS', decimals: 18,
image: 'https://gateway.pinata.cloud/ipfs/QmSHM…' } }`; rejection surfaces once without
retry; unsupported wallets get the copy-address fallback; a wallet dragged to another
chain is switched back before any registration.

## Safety properties verified

- No contract writes: the only wallet method requested is `wallet_watchAsset`; the e2e
  network guard records zero signing/broadcast attempts in every test.
- The EIP-6963-selected provider is targeted — never raw `window.ethereum` bypassing the
  user's explicit wallet choice.
- No prompt fires on page load; the artwork URL is filtered to `https://` so `ipfs://` or
  mixed-content `http://` can never reach the wallet request.

## Deployment status

Not deployed. Production (`retropick.xyz`) still runs the merged-main build; promoting
this branch follows the operator runbook
(`development/launchpad/devops/PRODUCTION_REFRESH_2026-10-14.md`) and is a maintainer action.
