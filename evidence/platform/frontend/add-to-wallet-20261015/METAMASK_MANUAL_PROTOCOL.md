# Real-MetaMask verification protocol (human-approved prompts)

Automation proves the request payload; only a real wallet proves rendering. MetaMask
prompts must be approved by a human, so this last step is a controlled manual pass.

## Setup (once)

1. Use a dedicated test profile/wallet on Monad Testnet (chain 10143). Do not use a
   hold-bearing account.
2. Open the token page for CIS:
   - production once deployed: `https://retropick.xyz/launchpad/token/0xc399c1a37d1d202d315f7f4c1a24e34c8e50e50f`
   - or a local build: `npm run dev` in `apps/retro-ui`, then
     `http://localhost:3000/launchpad/token/0xc399c1a37d1d202d315f7f4c1a24e34c8e50e50f`
3. Connect MetaMask via the sidebar/header wallet button; confirm the wallet is on
   Monad Testnet (10143).

## Case A — token NOT yet imported (new import path)

1. Remove CIS from MetaMask if present (token list → CIS → remove). Balances are
   read-only views; removing a token view never moves funds.
2. On the token page press **Add to Wallet**.
3. Expected: MetaMask shows an "Add token" prompt with **CIS**, address
   `0xc399c1a37d1d202d315f7f4c1a24e34c8e50e50f`, 18 decimals, and the **CIS monkey
   artwork preview** (served from `https://gateway.pinata.cloud/ipfs/QmSHMEd2FMpQfEzuzMt3arZCStvrY9g4QjU6pJsZNLkKND`).
4. Approve. Expected: CIS listed with its artwork, balance 330.43… CIS.
5. Record: screenshot of the prompt + of the wallet asset row. PASS = artwork visible.

## Case B — token already imported without artwork (the reported state)

1. Keep the existing CIS entry (generic "C" icon).
2. Press **Add to Wallet** again.
3. Expected per upstream behavior (metamask-extension#7360): the wallet accepts the
   request but **keeps the generic icon** — this is a MetaMask-controlled limitation,
   not a RetroPick failure. The RetroPick toast says the token was submitted and
   already explains the re-import remedy.
4. Remedy that actually re-reads the image: remove CIS in MetaMask, then redo Case A.
5. Record: screenshot after the re-request (icon unchanged) + after remove/re-import
   (artwork visible).

## Negative checks (optional but recommended)

- Wrong network: switch MetaMask to another chain, press Add to Wallet → the app asks
  to switch back to Monad Testnet; no watchAsset prompt appears on the wrong chain.
- Rejection: press Add to Wallet and reject the MetaMask prompt → inline "Request
  rejected in wallet." message; no retry loop.
- Unsupported wallet: a wallet without EIP-747 → "This wallet cannot register tokens."
  with a Copy token address fallback. No unsolicited transactions or signatures are ever
  requested (the request is `wallet_watchAsset` only).

## Result ledger

| Case | Observed result | Verdict |
|---|---|---|
| A: new import shows artwork | pending human run | CONDITIONAL |
| B: already-imported keeps generic icon | pending human run | expected per #7360 |
| Negative checks | covered by mock-wallet e2e (desktop+mobile) | automated PASS |
