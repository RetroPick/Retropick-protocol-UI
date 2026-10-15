# ROOT-CAUSE MATRIX — CIS generic icon in MetaMask (Monad Testnet 10143)

2026-10-15 · Real-wallet differential testing on MetaMask **v12.23.1** (Chromium, WSLg headed,
fresh throwaway wallet per test, chain 10143 verified via `eth_chainId` → `0x279f`).

| # | Hypothesis | Verdict | Evidence | Confidence |
|---|---|---|---|---|
| H1 | `wallet_watchAsset` never stores the supplied image | **DISPROVEN** | TokensController.addToken stores `image` verbatim ([MetaMask/core source](https://github.com/MetaMask/core/tree/main/packages/assets-controllers): `newTokens[previousIndex] = newEntry` — image replaced in place) | High (source + Test C) |
| H2 | Re-watching an already-imported token cannot refresh its icon | **DISPROVEN on v12.23.1** | Test C: import-without-image → re-watch with PNG → prompt shown again → token-detail `<img>` = PNG URL, decoded `naturalWidth: 256`. (Earlier claim based on metamask-extension#7360 was wrong — that issue only requests a listing API; EIP-747 leaves duplicate behavior to wallets.) | High (empirical, this version) |
| H3 | The original GIF cannot render in MetaMask | **DISPROVEN for fresh imports on v12.23.1** | Test A: fresh import with GIF URL → token-detail `<img src=…QmSHM…>`, decoded `naturalWidth: 331`. GIF/331×359 is not inherently broken. | High (empirical, this version) |
| H4 | Manual import without an image leaves a dead icon URL | **CONFIRMED (mechanism)** | addToken stores `formatIconUrlWithProxy(chainId,address)` when image empty; MetaMask's icon service returns **404 for chain 10143** → generic letter. This was the USER'S initial state. | High |
| H5 | MetaMask's own metadata service has no chain-10143 coverage | **CONFIRMED** | `https://token.api.cx.metamask.io/tokens/10143` → `{"message":["Unsupported chain: 10143"]}` (400) while `/tokens/1` returns the full list. Price + history + wallet-side icons all uncovered. | High |
| H6 | The production Add to Wallet request never reached the selected provider | **DISPROVEN** | Production e2e asserted the exact payload on the real CIS page (PR #36 evidence); EIP-6963-selected provider is used. | High |
| H7 | User's wallet is current MetaMask v13.x, whose behavior differs from v12 | **UNRESOLVED / most likely residual cause** | v13.52 could not be automated here (UI stays on the loading spinner under CDP automation — LavaMoat/Snow handshake). The production release (GIF URL) was verified only against mocked wallets. If v13 changed duplicate handling or GIF fetching, the user-visible failure stands. | Medium |
| H8 | Wallet caches metadata and needs a restart to show updates | **WEAKENED** | Test A/C icon evidence was captured after a full page reload from persisted state; update visible without wallet restart. | Medium |

## Why the previous release (PR #36) failed real-user acceptance

1. The user's CIS entry was imported manually **before** any image existed → stored icon is the
   Codefi proxy URL that 404s on chain 10143 (H4).
2. The production flow supplied the **raw GIF gateway URL**. On v12 both GIF rendering and
   re-watch updates work (Tests A/C), so the likeliest failure axis is the user's actual wallet
   version (v13.x, H7) or the user not completing the approval. Neither was verified before
   claiming success — mocked-provider e2e cannot see either.
3. Secondary hardening gap (now fixed here): wallets are best served square static PNGs; the
   animated 331×359 GIF was a needless rendering risk even where it works.

## Fix shipped in this branch (`fix/wallet-image-derivative-20261015`)

- Content-addressed square-256 palette-PNG derivative pipeline
  (`apps/retro-ui/scripts/wallet-icons/`): original on-chain URI → 256×256 contain-fit PNG
  (PSNR 36.05 dB vs truecolor render; 36,222 B) → `public/wallet/<sha256>.png` +
  generated registry + public manifest. On-chain `logo()` unchanged; RetroPick UI keeps the GIF.
- `resolveWalletImage()`: registered sources → `https://retropick.xyz/wallet/<sha>.png`
  (self-domain, immutable, `image/png`); fallback = previous https-only rule.
- Derivative additionally pinned via the existing media service:
  `ipfs://QmQ3ZHQKVpFfZQ4voXyT1pt4Re3KjKL73D1cPugqYx6KGt`
  (byte-identical sha256 `416b0da3…`, `gateway.pinata.cloud` serves `image/png` 200) — used by
  the live matrix and recorded as an ops fallback.
- `Add to Wallet` now sends the derivative URL (no CIS-specific branch in the button; future
  launches register one sources.json entry).

## Differential matrix results (records + screenshots in `metamask-matrix/`)

| Test | Setup | Prompt | Promise | Icon after accept (detail page, persisted state) |
|---|---|---|---|---|
| A | fresh wallet, CIS + original GIF | shown, approved | `true` | **GIF rendered** (`nw: 331`) |
| B | fresh wallet, CIS + PNG derivative | shown, approved | `true` | import confirmed (detail-view capture flaked; same PNG proven in C) |
| C | CIS imported with NO image → re-watch with PNG | shown again, approved ×2 | `true`, `true` | **PNG rendered** (`nw: 256`) — image updated in place |
| D | remove + re-import | covered by C (update works without removal) | — | remove/re-import remains the documented remedy for other wallet versions |
| E | control: RETRO + native PNG | shown, approved | `true` | import confirmed |

**Acceptance status:** real-wallet icon rendering = **PROVEN on MetaMask v12.23.1** (fresh GIF,
re-watch PNG update). On the user's current stable (v13.x) = **PENDING MANUAL VERIFICATION**
(v13 not automatable in this environment; protocol below).

## Manual protocol for the user's wallet (v13.x)

1. `https://retropick.xyz/launchpad/token/0xc399c1a37d1d202d315f7f4c1a24e34c8e50e50f`
   (after this branch deploys) → **Add to Wallet** → approve the prompt.
2. If the icon stays generic: remove CIS in MetaMask (token list → CIS → remove — view-only,
   funds untouched) → Add to Wallet again → approve.
3. Record wallet version + screenshot. Fallback evidence URL if asked:
   `https://retropick.xyz/wallet/416b0da3cf5de37a329f941291a19230f6d7a45ee9572e858e6b7dc46d84f9fb.png`.
