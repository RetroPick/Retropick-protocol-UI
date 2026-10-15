# Real-MetaMask differential harness — how to reproduce

Scratch environment (documented; not part of the app): `/tmp/metamask-harness/`

1. `npm init -y && npm i @chainsafe/dappeteer@5.2.1 playwright && npx playwright install chromium`
2. Download the extension zip and extract to `ext-v12/`:
   `curl -sL -o mm-v12.zip https://github.com/MetaMask/metamask-extension/releases/download/v12.23.1/metamask-chrome-12.23.1.zip`
3. Patch `node_modules/@chainsafe/dappeteer/dist/setup/utils/patch/disableScuttleGlobalThis.js`
   with `harness/disableScuttleGlobalThis.patched.js` (handles: `scripts/runtime-lavamoat.js`
   path in v12+, minified `enabled:!0` form, and makes SCUTTLER a pass-through instead of
   removing Snow — removing it breaks boot).
4. `DISPLAY=:0 node harness.mjs <A|B|C|D|E>` (headed; WSLg or Xvfb).

What the harness does per run: launches a fresh persistent profile with the extension; completes
onboarding manually (terms modal requires scroll-to-bottom + checkbox; password; SRP skip;
metrics decline); adds Monad Testnet via `wallet_addEthereumChain`; runs the case's
`wallet_watchAsset` payload(s) from a local page; approves the notification popup; captures
screenshots; reloads the wallet home from persisted state; opens the token detail; records the
rendered `<img>` URLs + decoded `naturalWidth` (icon evidence = DOM decode, never the
`watchAsset` boolean). Output: `results/<MODE>/record.json` + PNGs.

Known limits:
- v11 is MV2 (dead on current Chromium); v13.x boots to an eternal spinner under CDP
  automation — matrix runs on v12.23.1, and v13 verification is the filed manual protocol.
- Wallet prompts open as separate notification popup windows — the harness scans pages for
  them rather than clicking in the home tab.
- Every run creates a brand-new in-extension wallet; no real user data is touched, no signing
  methods are exercised beyond watchAsset/addEthereumChain approvals.
