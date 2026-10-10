# Universal Agent Handoffs

A handoff is an artifact contract.

## Required fields

```text
HANDOFF_ID
FROM
TO
PRODUCT
GOAL_ID
REQUIREMENTS
COMMIT/REF
INPUTS_CONSUMED
OUTPUTS_PRODUCED
INVARIANTS_NOT_CHANGED
VERIFICATION
EVIDENCE
OPEN_BLOCKERS
STATUS
```

## Launchpad canonical handoffs

Machine-readable definitions:
`development/launchpad/control/handoffs.yaml`.

Examples:
- contracts -> ABI/events/deployment manifest -> SDK/indexer;
- indexer -> entity/query/sync-health contract -> backend/frontend;
- backend -> OpenAPI/client/error/auth contract -> frontend;
- frontend -> build/routes/E2E selectors -> QA;
- DevOps -> environment/deployment/health manifest -> QA.

Do not hand off "done" without consumable artifacts.

---

## 2026-10-11 — Graduate-flow "RPC request rejected" fix

```text
HANDOFF_ID: HANDOFF-2026-10-11-GRADUATE-RPC-ERROR-FIDELITY
FROM: engineering agent (this session)
TO: next frontend/SDK engineer
PRODUCT: Launchpad Core v2 (apps/retro-ui trade ticket + packages/launchpad-sdk)
GOAL_ID: RETROPICK-V2-FULLSTACK-INTEGRATION
REQUIREMENTS: graduation click on a ready-but-ungraduated curve must not surface
  "An unknown RPC error occurred. Details: RPC request rejected."; reverts must
  decode; provider faults must fail over.
COMMIT/REF: uncommitted working tree on main (files: packages/launchpad-sdk/src/chain.ts,
  packages/launchpad-sdk/test/providers.test.ts, apps/retro-ui/src/features/launchpad/live-trading-ticket.tsx)
INPUTS_CONSUMED: user error report (reservedTokens() eth_call on curve
  0x33774d8A324364Ff947c98369897F2CD15De9139, viem@2.57.4); RetroPickBondingCurveV2.sol;
  viem buildRequest/getNodeError/getContractError internals; live RPC probes.
OUTPUTS_PRODUCED: rpcFailure() now classifies geth-style -32000 + unmapped codes as
  provider faults (failover + RPC_<CATEGORY>) and revert/range texts as APPLICATION;
  ApplicationRpcResponse (viem BaseError, code 3 + redacted hex payload) preserves
  ABI-decodable revert reasons; fail() ignores APPLICATION; UI maps RPC_<CAT>/no-provider
  to a retry message and shows shortMessage; 3 new provider tests.
INVARIANTS_NOT_CHANGED: revert/limit responses never disable a provider or trigger
  failover; gateway bodies/URLs stay redacted; 30s circuit cooldown; AUTH/WRONG_CHAIN
  permanent disable; HACKATHON_FREEZE contracts untouched.
VERIFICATION: launchpad-sdk 43/43 pass (2 network-skipped), tsc clean (sdk + retro-ui),
  retro-ui node tests pass (trade-ticket-inputs 2/2, domain 17/17, terminal 11/11);
  live probe through fixed createChain vs testnet-rpc.monad.xyz: reservedTokens()
  = 500e18, graduated=false, readyToGraduate=true, provider healthy after burst.
EVIDENCE: pre-fix render reproduced logically (safeRpcError flattening -> UnknownNodeError
  "An unknown RPC error occurred."); post-fix readContract renders
  "reverted with the following reason: NotReadyToGraduate" for a -32000 revert fixture.
OPEN_BLOCKERS: .env.local primary and fallback are the same URL (deduped to one
  provider) — no failover diversity until a second qualified public endpoint exists
  (Infura Monad add-on still 401). This launch sits in the designed
  ready-but-ungraduated window: the crossing buy's swallowed _tryAutoGraduate failed
  once; a permissionless factory.graduate(token) retry (UI button or keeper) settles it.
STATUS: COMPLETE (code + tests); deployment of UI unaffected (build passes).
```

## 2026-10-11 — Logo media upload + dashboard image rendering

```text
HANDOFF_ID: HANDOFF-2026-10-11-MEDIA-UPLOAD
FROM: engineering agent (this session)
TO: next frontend/backend engineer + ops
PRODUCT: Launchpad Core v2 (apps/retro-ui launcher + new apps/media-service)
GOAL_ID: RETROPICK-MEDIA-UPLOAD (goals/active/); ADR-017 ACCEPTED
REQUIREMENTS: users must be able to launch a token with a local image file; the
  image must persist and render on dashboards for everyone, launchpad-standard.
COMMIT/REF: uncommitted working tree on main (new: apps/media-service/**,
  apps/retro-ui/src/lib/media/{resolve,upload}.ts, apps/retro-ui/tests/media.test.mjs,
  apps/retro-ui/e2e/live/media-upload.spec.ts, evidence/launchpad/media-upload/**,
  goals/active/RETROPICK-MEDIA-UPLOAD.md; modified: create-launch.tsx,
  create-validation.ts, discovery.ts, token-detail.tsx, trading/primitives.tsx,
  vite.config.ts, .env.example x2, .gitignore, e2e/README.md, ADR-017 + decisions/README,
  CREATE_FORM_ABI_MAP.md, INTEGRATIONS.md, METADATA_AND_MEDIA.md).
INPUTS_CONSUMED: onchain TokenParams.logo 512-byte cap (RetroPickLaunchDeployerV2);
  CREATE_FORM_ABI_MAP.md prior "LIVE must upload offchain" decision; ADR-017 proposal;
  current-source verification of Pinata API/limits and public gateway status
  (ipfs.io/dweb.link alive, cloudflare-ipfs.com discontinued 2024-05).
OUTPUTS_PRODUCED: apps/media-service (POST /api/media/upload multipart, magic-byte
  sniff, origin allowlist, 12/min rate, Pinata pin -> ipfs://<cid>, sha256 local
  fallback; GET immutable media with nosniff + CSP sandbox; 7 unit tests); retro-ui
  client (downscale <=1024px/256KiB WebP, GIF <=512KiB passthrough, friendly error
  mapping), launcher upload UI with advanced manual-URI toggle, resolveMediaSrc
  rendering for https/http/ipfs/ar + one dweb.link retry + glyph fallback,
  token-detail now prefers onchain state.logo then indexed then seed; live e2e spec.
INVARIANTS_NOT_CHANGED: contracts untouched; indexer GET-only untouched; no new
  framework deps; secrets only in gitignored env; fail-closed data modes untouched;
  demo launcher unchanged; economic semantics unchanged.
VERIFICATION: media-service 7/7 + tsc clean; retro-ui tsc clean, vite build green,
  unit suites green (media 4/4, domain 17/17, terminal 11/11, indexed-record,
  product); fixture e2e 234 passed / 0 failed; live media spec 12 passed across
  viewports incl. mobile (indexer up) and 6 discovery renders (first run);
  real-service smoke transcript (upload round-trip, idempotency, 403/415 gates).
EVIDENCE: evidence/launchpad/media-upload/ (README, smoke-transcript.txt,
  sample-logo.png); browser-validation runs *-live-media{,2,-final} and *-fixture.
OPEN_BLOCKERS: production activation needs (1) PINATA_JWT on the worker host,
  (2) a Vercel rewrite for /api/media -> worker host, (3) MEDIA_ORIGIN set to the
  frontend origin. Until then prod uploads 403 (the manual URI path remains).
STATUS: COMPLETE (code + tests + e2e + docs); dev works out of the box in local mode.
```
