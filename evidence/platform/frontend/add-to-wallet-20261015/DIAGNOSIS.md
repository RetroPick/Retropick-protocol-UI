# DIAGNOSIS — CIS token logo missing in MetaMask (Monad Testnet 10143)

Date: 2026-10-15 · Branch: `dev/continue-live-20261014` · Mode: LIVE (no contract changes)

## 1. Token identification (live evidence, not reconstructed)

CIS "College is Scam" was located through the live RetroPick indexer projection
(`TokenLaunched` event → `getTokenInfo` read-back):

| Field | Value |
|---|---|
| Token | `0xc399c1a37d1d202d315f7f4c1a24e34c8e50e50f` |
| Curve | `0x99ff20c2ccd007a0068b4642143520f855549986` |
| Creator | `0x101212C52620ca00540ee04D1515E714e6368Fcd` |
| Launch tx | `0xfb83da8b1c5d6a1be0237050e18225f6a6126ee87ad270e7064168e687902966` |
| Created | block 71121365 (2026-10-15T01:28:23Z) |

## 2. Direct on-chain reads (Monad RPC `https://testnet-rpc.monad.xyz`)

Selectors computed locally with `cast sig` (keccak256): `logo()` = `0xfb7f21eb`,
`getTokenInfo()` = `0xabb1dc44`. Raw payloads in `cis-rpc-evidence.txt`.

- `eth_chainId` → `0x279f` = **10143** ✓
- `name()` → **"College is Scam"**
- `symbol()` → **"CIS"**
- `decimals()` → **18**
- `balanceOf(0x1012…8fcd)` → `0x11e9a9d45fcebf5e30` = **330.431871442919317040 CIS** (matches the reported ~330.432)
- `logo()` → **`ipfs://QmSHMEd2FMpQfEzuzMt3arZCStvrY9g4QjU6pJsZNLkKND`**
- `getTokenInfo()` → `(0x1012…8fcd, same ipfs:// logo, "A Rapture = Trauma =  current Society  why not Love = Devine\n", ("as"×5))` — metadata intact

## 3. Image validation

`https://gateway.pinata.cloud/ipfs/QmSHMEd2FMpQfEzuzMt3arZCStvrY9g4QjU6pJsZNLkKND`

- HTTP **200**, `content-type: image/gif`, `content-length: 69117`, `cf-cache-status: HIT`
- First bytes `47 49 46 38 39 61` = **GIF89a**, 331×359 px (within MetaMask's ≤512×512 guidance)
- `https://ipfs.io/ipfs/<cid>` and `https://dweb.link/ipfs/<cid>` → **HTTP 429** (rate-limited; these are retro-ui's *rendering* fallbacks, not the wallet path)

The asset exists, is public, and is a valid image. The upload pipeline worked.

## 4. Pipeline trace (why the wallet never sees it)

media-service (Pinata mode, `apps/media-service/src/app.ts:74-76`) pins the file and
returns `uri: ipfs://<cid>` → written verbatim into `RetroPickLauncherTokenV2.logo`
(`contracts/src/v2/RetroPickLauncherTokenV2.sol:36,66`; only length ≤512 is validated,
`RetroPickLaunchDeployerV2.sol:56`) → indexer captures it (`apps/indexer/src/sync.ts:108-119`)
→ retro-ui renders it through the Pinata gateway. **The chain ends there.** MetaMask has no
ingestion channel for any of it:

1. **No `wallet_watchAsset` (EIP-747) call existed anywhere in the repo** (grep-verified across
   `apps/retro-ui/src`, `packages/`, 2026-10-15). The balance displays because the token was
   manually imported; no image was ever supplied to the wallet.
2. Even a well-intentioned request would have carried the on-chain `ipfs://` string, which
   wallet clients cannot fetch — EIP-747 `image` requires a publicly fetchable HTTPS URL.
3. The portfolio explorer rendered letter glyphs because indexer wallet-asset rows
   (`/v1/wallets/<addr>/assets`) carry no logo.

## 5. Verdict split

**RetroPick defects (fixed in this branch):**
- no Add-to-Wallet integration at all → new EIP-747 flow (see `FIX.md` / commit);
- `ipfs://` never translated for the wallet → resolver reused, only `https://` URLs passed;
- portfolio logos missing → indexer logo join added.

**MetaMask/explorer-controlled limitations (documented, not fixable by RetroPick):**
- token autodetection does not run on test networks; `wallet_watchAsset` is the only channel;
- re-requesting `watchAsset` on an **already-imported** token does not update its icon
  (metamask-extension#7360) — remedy for the reporter: remove the token in MetaMask, then use
  Add to Wallet to re-import with artwork;
- known mobile bug when dapp network ≠ wallet network (metamask-mobile#36534) — RetroPick
  validates chain 10143 before requesting, which is the available mitigation;
- wallet-wide icon coverage for arbitrary testnet tokens (token lists /
  @metamask/contract-metadata submissions) is not available for Monad testnet launches.

## 6. Post-change re-verification (2026-10-15T10:05Z)

All on-chain reads repeated after the code changes: identical results, zero state change
(symbol CIS, decimals 18, balance 330.431871442919317040, same ipfs:// logo, gateway 200).
No contract was deployed, modified, or transacted with.
