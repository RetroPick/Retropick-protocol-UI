# Launch-token economics: admission discovery failure

Corrected frontend source: `346366c093010b0b3eda26fc53f866980bcf9e15`.
Deployment: `dpl_7cgLo46getyErTy7hLAD2ZX2H8F8`, promoted to the existing project.
Apex and existing staging alias both return this exact public release SHA.

2026-10-13. Root cause confirmed against the actual `https://retropick.xyz` browser and both
Monad Testnet RPC providers. This issue is independent of the repaired indexer/HTTPS deployment.

## Why economics never appeared

`TokenLaunchWizard` calls `readLaunchPreconditions` for factory fees, enabled launch configurations,
current hook policy and per-venue quote admission. The SDK probes native MON, wrapped MON and
Circle test USDC for both Uniswap V4 and Kuru. Its original discovery used `Promise.all` and
expected an unsupported candidate to return `enabled:false`.

The deployed `RetroPickQuoteAssetRegistryV2.admitted` instead reverts with `UnsupportedQuote()`
for a disabled or unadmitted asset/venue. WMON (`0xff437B117Ec17a79a3b24Da4B5047dca4da9D0a2`)
is not admitted on either venue in the inspected state. MON and USDC are admitted, and every
required factory/config/hook read succeeds. A single WMON rejection discarded all successful
terms, so the form received no quote options or economics. Retry repeats the same deterministic
revert. RPC fallback cannot make an unadmitted asset admitted; this is a discovery-semantic bug,
not a missing staging setting, CORS issue, indexer outage or broken HTTPS rewrite.

The same SDK function is used by `prepareLaunchToken`, so fixing only the visible error or
substituting cached/default economics would also leave real launch preparation broken.

## Fix and safety boundary

`packages/launchpad-sdk/src/registry.ts` catches only a decoded viem `ContractFunctionRevertedError`
named `UnsupportedQuote` from the particular admission probe. That candidate/venue is excluded;
all accepted candidates retain their exact live terms and snapshot block. Other custom errors,
unrecognized errors, HTTP/RPC timeouts and outages still fail the whole read. Nothing is caught
by broad message matching. No asset is force-admitted and no economic constant is fabricated.

Factory, registry and contracts are unchanged. No launch or financial transaction is submitted.
The existing query/refetch lifecycle and form state are retained; Retry/Back within a mounted
wizard preserve the draft. Live drafts are currently React state, so a full page reload is not
a persisted-draft recovery mechanism. Users loading the corrected release in an already-open
old page should retain their entered fields before refreshing it.

## Verification

- Before: actual public desktop/mobile browsers both reproduce the unavailable terms after
  entering a local draft; Retry retains the fields but cannot resolve the contract rejection.
- Before: both official and Ankr SDK probes show valid factory/config/hook reads and the exact
  WMON `UnsupportedQuote` revert.
- After: both real RPC providers return launchEnabled true, launchFee 0, maxCreatorTaxBps 1000,
  currentHookFeeBps 100, configuration 0 with 1000 tokens at 18 decimals, and MON/USDC admitted on both
  venues. Graduation thresholds are 1 MON / 1 test USDC in the inspected state; no USD implication.
- SDK suites: **50 passed, 2 intentional network-replay skips**, zero failures. Four added cases
  cover unadmitted WMON, venue-specific admission, no admitted quotes and fail-closed unknown/
  other-contract/provider failures. These unit tests are distinct from the two live SDK probes.
- SDK and frontend typechecks pass. Public release identity matches on both aliases. The actual apex suite passes **16/16**,
  retries disabled, including economics-to-Review on desktop/mobile. Separate real browser
  reproductions pass **2/2** after correction and retain the draft when navigating Back.
- The initial post-fix run passed the prior 14 checks and failed two new test locators because
  the label includes its help text. Retained screenshots show successfully loaded live terms.
  The locator was corrected to the actual combobox name; the complete rerun passes all 16.
  No application change or redeployment was needed for that test correction.

The earlier 14-test public cutover suite did not exercise create economics. Its real read/hosting
results stand within that scope; they did not establish successful token creation. The public
suite now includes economics→Review and draft preservation on both viewports, without signing.

Evidence: `evidence/platform/frontend/launch-terms-recovery-20261013/`.

## Operations and rollback

No staging, DNS, backend or contract change is required. Frontend-only promotion retained both
domain assignments and the permanent API. Backend was not redeployed (last verified source CAF); frontend source is the
346366c release above. The previous CAF deployment can be promoted back to this same project
if necessary, but it restores this creation bug. Do not move domains, roll back databases or
redeploy contracts to address SDK quote discovery.

- Post-promotion public monitoring: **11/11** samples, **0 failures**,
  **304.4 seconds**, lag **8–58 blocks**.
