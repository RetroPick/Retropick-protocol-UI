# Create-Launch Form → ABI Map (Phase 2 — FRONTEND_CONTRACT_MAPPING)

Maps every field/control of the create-launch wizard (`apps/retro-ui/src/features/launchpad/create-launch.tsx`, `TokenLaunchWizard`, crypto + stocks variants) onto the deployed `RetroPickLaunchFactoryV2` ABI.
ABI source of truth: `apps/abi/RetroPickLaunchFactoryV2.json` (frozen catalog, deployment `0xa7f18b9eceb0A9852b08408854A45D00fc682454` on chain 10143, commit `f0363249…`), cross-checked against pinned source `contracts/src/v2/RetroPickLaunchFactoryV2.sol`.

Categories: **EXACT_SOLIDITY_ARG** (form value becomes a tx arg) · **DERIVED_ARG** (value fetched/computed at runtime, not user-entered) · **OFFCHAIN_METADATA** (stored outside the tx) · **DISPLAY_ONLY** (UI chrome) · **UNSUPPORTED_LIVE** (no deployed capability; must not imply one).

---

## 1. Verified deployed entry points (from the ABI JSON)

`TokenParams` tuple (exact field order from ABI):

~~~text
struct TokenParams {
  string  name;
  string  symbol;
  string  logo;
  string  description;
  Socials socials;            // { twitter, telegram, discord, website, farcaster } (field names verified in ABI JSON)
  address creatorFeeRecipient;
  uint16  creatorTaxBps;
  bool    buybackEnabled;
  bytes32 expectedEconomics;
  bytes32 salt;
}
~~~

Overloads (all `payable`, all return `(address token, address curve)`):

| # | Signature (ABI types) | Meaning |
|---|---|---|
| F1 | `launchToken(tuple params, uint256 launchConfigId, address pairToken)` | direct launch, venue = `UNISWAP_V4` (source line 631→637: `_launchToken(…, GraduationVenue.UNISWAP_V4)`) |
| F2 | `launchToken(tuple params, uint256 launchConfigId, address pairToken, uint8 venue)` | venue-selectable. **4th-arg ABI type confirmed `uint8`**; `enum GraduationVenue { UNISWAP_V4 = 0, KURU = 1 }` (`contracts/src/v2/interfaces/IGraduationExecutorV2.sol:6-9`) |
| F3 | `launchToken(tuple params, uint256 launchConfigId, address pairToken, address[] snipeTaxExemptions)` | direct launch + snipe-tax exemption list (still `UNISWAP_V4`) |
| F4 | `launchTokenFor(tuple params, uint256 launchConfigId, address pairToken, address originalDeployer, address[] snipeTaxExemptions)` | **forwarder-only**: `if (msg.sender != launchForwarder) revert NotLaunchForwarder()` (`RetroPickLaunchFactoryV2.sol:672`). It is the trusted atomic launch-and-buy router's entry, out of normal user scope |

Selector warning for the SDK: F2 and F3 are both 4-arg overloads differing only in the last type (`uint8` vs `address[]`) — encode/decode by explicit signature, never by arg count.

## 2. Runtime values the form must FETCH instead of hardcoding

| Value | Read | Notes |
|---|---|---|
| Launch fee (msg.value) | `launchFee()` view uint256 | `_launchToken` requires `msg.value == launchFee` exactly (`sol:706`, `LaunchFeeNotPaid`); native MON wei, not ETH |
| Config list | `launchConfigCount()` + `getLaunchConfig(uint256)` → `{supply, curveFeeBps, phantomQuote, graduationThreshold, poolFee, tickSpacing, enabled}` | form needs an enabled-config picker (or auto-select single enabled); `InvalidLaunchConfigId`, `LaunchConfigDisabled` |
| Economics pin | `previewLaunchEconomics(uint256 id, address quote)` (UNISWAP_V4) / `previewVenueEconomics(uint256 id, address quote, uint8 venue)` → bytes32 | optional: `expectedEconomics = 0` skips; nonzero must match at execution or `LaunchEconomicsMismatch` (`sol:722-724`) |
| Max creator tax | `maxCreatorTaxBps()` view uint256 | `creatorTaxBps > maxCreatorTaxBps` reverts `CreatorTaxTooHigh` |
| Launch gate | `canLaunch(address launcher)` view bool + `launchEnabled()` | reverts `NotWhitelisted` / `LaunchDependenciesNotWired` |
| Admitted quote assets | `quoteRegistry()` → `RetroPickQuoteAssetRegistryV2.admitted(address, uint8 venue)` → `{enabled, decimals, venueMask, policyVersion, phantomQuote, graduationThreshold, graduationQuoteCeiling, assetId, policyHash}` | admission is **per venue** (`venueMask`); native MON = `address(0)`; helpers `isSupportedQuote(address)`, `validateQuote(address,uint8)` |

## 3. Field-by-field map

### Step 0 — Identity

| Form control | Evidence | Category | Live mapping |
|---|---|---|---|
| Image picker (file → downscale ≤1024px/≤256 KiB WebP → `POST /api/media/upload` → URI; ≤5 MB raw PNG/JPEG/WebP/GIF) | `create-launch.tsx` live branch, `src/lib/media/upload.ts` | EXACT_SOLIDITY_ARG → `TokenParams.logo` (string) | **calldata hazard**: a base64 data URL (~MBs) in `logo` is onchain-bloat expensive; LIVE uploads offchain (`apps/media-service`, ADR-017) and passes the returned URI (`ipfs://<cid>` via Pinata, or the local content-addressed fallback URL) — always ≤512 bytes. An advanced "Paste a URI instead" toggle keeps the manual https/ipfs/ar path. Demo stores only a local preview |
| Name (≤32 chars, required) | `create-launch.tsx:40,61,95` | EXACT_SOLIDITY_ARG → `TokenParams.name` | contract only requires nonempty (`InvalidTokenParams`); keep client length cap |
| Ticker (regex `^[A-Z0-9]{2,10}$`) | `create-launch.tsx:40,61` | EXACT_SOLIDITY_ARG → `TokenParams.symbol` | same |
| Description (≤256) | `create-launch.tsx:40,62,95` | EXACT_SOLIDITY_ARG → `TokenParams.description` | string; storage cost consideration, not a protocol limit |
| X (handle or URL) | `create-launch.tsx:40,95` | EXACT_SOLIDITY_ARG → `TokenParams.socials.twitter` | free string |
| Telegram | `create-launch.tsx:40,95` | EXACT_SOLIDITY_ARG → `TokenParams.socials.telegram` | |
| Website | `create-launch.tsx:40,95` | EXACT_SOLIDITY_ARG → `TokenParams.socials.website` | |
| (no fields) | — | EXACT_SOLIDITY_ARG slots unused | `socials.discord`, `socials.farcaster` exist in the ABI but have no form controls — optional; add or leave empty strings |

### Step 1 — Economics

| Form control | Evidence | Category | Live mapping |
|---|---|---|---|
| "Paired with" select — options `[ETH] + fixture pairs (mon/usdc/wbtc/nvdax/aaplx)` | `create-launch.tsx:40-43` | EXACT_SOLIDITY_ARG → `pairToken` (address) of F1/F2 | value today is a fixture symbol; LIVE: resolve symbol → admitted address from `quoteRegistry.admitted(quote, venue)`, native MON = `0x0000…0000`. The hardcoded `ETH` option is factually wrong for Monad (REMOVE-COPY, reverse-map I-19); `NVDAx/AAPLx/WBTC` must appear only if admitted |
| Creator fee wallet (optional 0x) | `create-launch.tsx:40,69,97` | EXACT_SOLIDITY_ARG → `TokenParams.creatorFeeRecipient` | empty input = DERIVED default to the connected wallet address (copy already says "Defaults to your wallet", `create-launch.tsx:97`) |
| Creator fee % (`0–10.0%` client bound) | `create-launch.tsx:40,68,97` | EXACT_SOLIDITY_ARG → `TokenParams.creatorTaxBps` (uint16) | DERIVED conversion % → bps (×100, exact integer math); bound must come from `maxCreatorTaxBps()` (reverse-map I-15) |
| Opening buy (amount ≥ 0, "Buys first, in the same transaction as the launch") | `create-launch.tsx:40,70,84,97` | **UNSUPPORTED_LIVE** | the direct user path (F1/F2/F3) has **no atomic opening buy**: `msg.value` must equal `launchFee` exactly, and `TokenParams` has no buy amount. Atomic launch-and-buy exists only behind `launchTokenFor`, callable solely by `launchForwarder` (F4, `NotLaunchForwarder`) — out of user scope. The current form's claim is false even as demo copy → remove the input or reword to "after launch, buy on the curve" (see §4) |
| Fee destination radio: `feeWallet` | `create-launch.tsx:19-23,38,97` | EXACT_SOLIDITY_ARG → `TokenParams.buybackEnabled = false` | creator fees accrue to `RetroPickFeeEscrowV2` for `creatorFeeRecipient`; claim via `FeeEscrow.claim()/claimToken` |
| Fee destination radio: `buybackVest` | `create-launch.tsx:19-23,97` | EXACT_SOLIDITY_ARG → `TokenParams.buybackEnabled = true` | routes buyback share through `RetroPickBuybackVaultV2` (`lock/release/releasable`); copy hardcodes "5 years" and "the protocol keeps part of every release" — LIVE must render `BuybackVault.VESTING_DURATION()` / `vestingTerms` values instead |
| Fee destination radio: `holders` | `create-launch.tsx:19-23` | **UNSUPPORTED_LIVE** | no deployed contract pays creator fees to token holders; REMOVE-COPY (reverse-map I-05) |
| "How buyback & vest works" detail notice | `create-launch.tsx:97` | DISPLAY_ONLY | copy must switch to vault-read values in LIVE |

### Submission & chrome

| Control | Evidence | Category | Live mapping |
|---|---|---|---|
| Launch button / "Sign in to launch" | `create-launch.tsx:97` | DISPLAY_ONLY today | becomes the wallet-sign submit for F1/F2: gates `canLaunch(account)`, `launchEnabled()`, sends exact `launchFee()` |
| Draft persistence `retropick-token-launch-draft` (localStorage) | `create-launch.tsx:79-87` | OFFCHAIN_METADATA | demo-only; LIVE keeps a pre-sign draft cache but the tx args are re-derived at submit |
| Success page ("No token… was created") | `create-launch.tsx:92` | DISPLAY_ONLY | mode-aware rewrite in LIVE (reverse-map I-20) |
| Stepper, preview rail (Supply / Graduates at / Creator fee / Launch fee), "NOT DEPLOYED" tag, boundary notice | `create-launch.tsx:25-28,94-97` | DISPLAY_ONLY | rail values become live reads (see §5) |
| `?type=` crypto/stocks dispatch | `create-launch.tsx:100-104` | OFFCHAIN_METADATA | stock-vs-crypto is a product classification; the contract sees only `pairToken` (a stock-quote pair is just another admitted quote asset) |

### Hidden tx args with no form field today

| Arg | Category | Live mapping |
|---|---|---|
| `launchConfigId` | DERIVED_ARG | `launchConfigCount()` + `getLaunchConfig(id).enabled`; no selector UI exists — either auto-pick the single enabled config or add a control |
| `venue` (F2) | DERIVED_ARG / future control | no venue selector in the form; F1 defaults to UNISWAP_V4. KURU (=1) requires F2 **and** a quote admitted for that venue (`venueMask`) |
| `expectedEconomics` | DERIVED_ARG | capture `previewLaunchEconomics(id, quote)` (or `previewVenueEconomics`) when the user reviews, submit it as the pin; `bytes32(0)` = unpinned |
| `salt` | DERIVED_ARG | fresh random `bytes32` per submission attempt (deterministic CREATE2 addresses; no user meaning) |
| `snipeTaxExemptions` (F3) | DERIVED_ARG (none today) | "organized teams" pathway (`sol:641-646`); not a retail form concern in this campaign |
| `msg.value` | DERIVED_ARG | `launchFee()` in MON wei, exact |

## 4. Explicit flag: no atomic opening buy in the deployed user path

- F1/F2/F3 enforce `msg.value == launchFee` (`RetroPickLaunchFactoryV2.sol:706`) — surplus value cannot fund a first buy.
- `TokenParams` carries no buy amount; the only launch-adjacent list is `snipeTaxExemptions` (price-window exemptions, not a purchase).
- The atomic launch-and-buy flow lives behind the `launchForwarder` router via `launchTokenFor` (F4) and is **out of normal user scope** for this campaign.
- Therefore the current "Opening buy… Buys first, in the same transaction as the launch" control (`create-launch.tsx:97`) is UNSUPPORTED_LIVE and its copy is false. Disposition: remove the input in LIVE mode (or relabel to a post-launch curve-buy step two). The demo draft field itself is harmless but must not survive into the tx builder.

## 5. Current hardcoded constants → LIVE replacements

| Constant (evidence) | Demo value | LIVE replacement |
|---|---|---|
| `LAUNCH_FEE` (`create-launch.tsx:14`, shown :97 + rail) | `'0.0005 ETH'` | `factory.launchFee()` (MON wei) formatted with quote decimals |
| `GRADUATES_AT` (`create-launch.tsx:15`, shown :97 + rail) | `'4.20 ETH'` | per-quote `admitted(quote, venue).graduationThreshold` (+ `graduationQuoteCeiling` context); the token-detail screen's `compact(43_000)` target (`token-detail.tsx:33`) is the same class of hardcode |
| `CURVE_FEE` (`create-launch.tsx:16`) | `'1.0%'` | `getLaunchConfig(id).curveFeeBps` (bps → %) |
| `SUPPLY` (`create-launch.tsx:17`, also `1_000_000_000` literal in draft :85) | `'1,000,000,000'` | `getLaunchConfig(id).supply` (bigint) |
| Creator-fee cap "10.0%" (`create-launch.tsx:68,97`) | 10% | `maxCreatorTaxBps()` |
| Pair list (`create-launch.tsx:41-42` ← `launchpad-fixtures.ts:12-18`) | ETH/MON/USDC/WBTC/NVDAx/AAPLx fixtures | `quoteRegistry.admitted(quote, venue)` enumeration (enabled ∧ venue-masked), native MON = address(0) |
| Buyback vest "5 years" copy (`create-launch.tsx:21,97`) | 5 years | `BuybackVault.VESTING_DURATION()` / `vestingTerms` reads |
| Launch gate (`create-launch.tsx:97` "Sign in to launch" → demo wallet) | `demo.connected` | `canLaunch(account)` + `launchEnabled()` + real wallet session |
| Economics trust | static copy | `previewLaunchEconomics`/`previewVenueEconomics` bytes32 pin passed as `expectedEconomics` |

Relevant revert reasons the LIVE form should decode and surface: `NotWhitelisted`, `LaunchFeeNotPaid`, `InvalidLaunchConfigId`, `LaunchConfigDisabled`, `CreatorTaxTooHigh`, `InvalidTokenParams`, `CurveNotQuotable`, `PairTokenNotApproved`, `InvalidPhantomQuote`, `LaunchEconomicsMismatch`, `GraduationExecutorNotSet`, `LaunchDependenciesNotWired` (all present in the ABI error list).

## 6. Validation deltas (client vs contract)

| Client rule (evidence) | Contract rule | Delta |
|---|---|---|
| ticker `^[A-Z0-9]{2,10}$` | nonempty string only | client stricter — keep as UX guard |
| name nonempty ≤32 | nonempty | client stricter — fine |
| description ≤256 | none | UX/storage guard |
| creatorFee 0–10% | `≤ maxCreatorTaxBps()` | client bound must be read at runtime (I-15) |
| feeWallet `/^0x[a-fA-F0-9]{4,40}$/` | must be a valid address | client regex is loose; LIVE must checksum-validate a full 20-byte address |
| pair from fixture list | quote must be admitted **for the chosen venue** | full replacement (I-03) |
| openingBuy ≥ 0 | no such arg | remove (§4) |
