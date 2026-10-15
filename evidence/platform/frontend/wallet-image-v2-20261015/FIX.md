# FIX V2 — wallet-image derivative pipeline (branch fix/wallet-image-derivative-20261015)

Continuation of PR #36 after real-user acceptance failure. Supersedes the raw-GIF image URL.

## Root cause of the acceptance failure (see ROOT_CAUSE_MATRIX.md)

The user's CIS entry was imported before any image existed (dead Codefi proxy icon on an
unsupported chain), and the production flow supplied the raw animated GIF gateway URL. Real-
wallet differential testing (this branch) proves MetaMask v12.23.1 renders that GIF on fresh
import AND updates the stored image on re-watch — so the failure axis is the user's wallet
version (v13.x, not automatable here) or an incomplete approval, and the GIF was an unnecessary
rendering risk regardless. MetaMask's own chain-10143 metadata coverage is explicitly absent
(`"Unsupported chain: 10143"`), so wallet-side icons/prices/history can never come from there.

## Changes

| File | Change |
|---|---|
| `apps/retro-ui/scripts/wallet-icons/build.mjs` + `sources.json` | maintenance-time pipeline: on-chain logo URI → first-frame 256×256 contain-fit palette PNG (ffmpeg; white pad, no crop) → `public/wallet/<sha256>.png` + generated TS registry + public manifest |
| `apps/retro-ui/public/wallet/416b0da3….png` + `wallet-icons.manifest.json` | CIS derivative: 256×256, 36,222 B, PSNR 36.05 dB vs truecolor render |
| `apps/retro-ui/src/lib/media/wallet-icons.generated.ts` | generated registry `ipfs://QmSHM… → /wallet/<sha>.png` |
| `apps/retro-ui/src/lib/media/wallet-image.ts` | `resolveWalletImage()`: registry → `https://retropick.xyz/wallet/<sha>.png` (env-overridable origin); fallback: https-only passthrough |
| `apps/retro-ui/src/features/launchpad/add-to-wallet{.ts,-button.tsx}` | payload + button use `resolveWalletImage`; button receives the RAW on-chain logo URI from token-detail (single-resolver architecture) |
| `apps/retro-ui/src/features/launchpad/token-detail.tsx` | passes `rawLogo` (on-chain → indexer → seed) instead of the resolved display URL |
| `apps/retro-ui/tests/wallet-icons.test.mjs` (+ script) | manifest integrity (file exists, PNG magic, square 256, sha256-name match, size cap), resolver mapping, payload carries derivative |
| `apps/retro-ui/tests/add-to-wallet.test.mjs` | updated for the resolver split |
| `apps/retro-ui/e2e/live/add-to-wallet.spec.ts` | payload assertion = derivative URL |
| `evidence/platform/frontend/wallet-image-v2-20261015/` | this report set + real-MetaMask matrix harness, records, screenshots |

On-chain `logo()` unchanged; RetroPick's UI still renders the original GIF; no contract,
economics, indexer, or media-service changes; no new dependencies (ffmpeg is a documented
maintenance-time tool; artifacts are committed).

## Derivative distribution

- Primary (post-deploy): `https://retropick.xyz/wallet/416b0da3cf5de37a329f941291a19230f6d7a45ee9572e858e6b7dc46d84f9fb.png`
- IPFS (pinned via existing media service, byte-identical): `ipfs://QmQ3ZHQKVpFfZQ4voXyT1pt4Re3KjKL73D1cPugqYx6KGt`
  → `https://gateway.pinata.cloud/ipfs/QmQ3ZHQKVpFfZQ4voXyT1pt4Re3KjKL73D1cPugqYx6KGt` (200, `image/png`, 36,222 B, sha256-verified)

## Gates (2026-10-15)

| Gate | Result |
|---|---|
| Launchpad SDK suite | 69 tests / 0 fail |
| retro-ui unit suites (media 5, add-to-wallet 3, wallet-icons 5, terminal 14, runner 17) | all pass |
| typecheck / production build | clean / success |
| Fixture token-terminal e2e (desktop+mobile) | 31 pass / 0 fail |
| Live add-to-wallet e2e (real CIS page, desktop+mobile) | 7 pass + 1 flaky-pass (known RPC/gateway latency); payload asserts the derivative URL |
| Real MetaMask v12.23.1 matrix A–E | see ROOT_CAUSE_MATRIX.md — GIF renders fresh; re-watch updates existing icon (PNG, nw 256) |

## Deployment status

**Not deployed.** Per release rules, promotion requires observed success on the user's current
wallet (manual protocol filed) or an explicitly accepted fallback release.
