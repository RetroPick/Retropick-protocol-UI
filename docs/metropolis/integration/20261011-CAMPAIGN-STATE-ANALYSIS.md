# Campaign State Analysis — 2026-10-11 (stop-and-consolidate checkpoint)

Written at the operator's direction to stop the in-flight lane, analyze the goal and
every workstream's exact position, and consolidate all changes into reviewable/merged PRs.

## 1. The goal

Per `RETROPICK_METROPOLIS_OPERATOR_UNBLOCK_MASTER_PROMPT.md` + the binding workflow under
`docs/metropolis/integration/`:

- **Mission:** continue the Monad Metropolis sponsor campaign from latest main — one
  integration lane at a time through the mandatory state machine
  (DISCOVER → BASELINE → VERIFY → ARCHITECT → PLAN → IMPLEMENT → NEGATIVE TESTS →
  REAL VALIDATION → RECONCILE → EVIDENCE → PR → HANDOFF), stage reports under
  `docs/metropolis/integration/stages/`, living ledger
  `docs/metropolis/execution/INTEGRATION-STATUS.md`, honest statuses only.
- **Deadline:** Oct 14 2026 10:59 WIB (submission), with the final 8h reserved for
  submission fixes only.
- **Quality bar:** sponsor `QUALIFIED_A_E` requires gates A–E (official sources, local
  engineering, security, real integration, hackathon eligibility) — never claimed from
  source code or unit tests alone.
- **Fixed constraints:** canonical frontend `apps/retro-ui` only (`apps/web` zero-write
  guard); Monad Testnet 10143 only (mainnet forbidden); credentials only via protected
  runtime env (never committed, never in browser bundles); preserve the live staging
  deployment; zero Contabo/Yubie mutation without explicit approval; no production-domain
  cutover, P0 financial deployment, npm publish, wallet provisioning or portal submission
  without explicit fresh operator approval.

## 2. Exact current position (verified at this checkpoint)

**Repository:** local == `origin/main` @ `08fc373` (PR #21 merge). PRs #10–#19 and #21
all MERGED; no open PRs. `apps/web` guard: **0 changed paths** throughout.

**Staging:** public URL `https://retropick-metropolis-retro-ui-stagi.vercel.app` serves
200 (Vercel side, deployment `nw15oiy54` from SHA-pinned clean worktree @ 56226f5). The
WSL backend stack (indexer/referral/media/gateway/tunnel) is **down again** at this
checkpoint (second SIGTERM wave; pids dead, no listeners) — restoration is a single
documented command (`node scripts/staging/start-backend.mjs --origin <canonical-url>`
+ tunnel-rotation redeploy, STAGING-RUNBOOK). SQLite journals and media preserved
throughout; no data loss in either shutdown.

**Credentials:** Envio token present ONLY as a gitignored 0600 runtime file
(`.staging/radar.env`) for DEV-RUN validation; `ROTATION_REQUIRED` before any
public-facing activation (chat-exposed). CRE CLI authenticated on this exact host/user
(`cre whoami` verified). Pinata JWT provided but Pinata lane deferred behind sponsor
lanes (shadow-path only, after rotation). No secret ever entered git, logs, or bundles.

## 3. Lane-by-lane progress

| Lane | Status | Evidence | Exact position |
|------|--------|----------|----------------|
| **L0 Staging restore** | **RUNTIME_VERIFIED — merged** (delivered through PR #21's branch lineage; commit `2e8b2b5` fix(staging): verified env rotation + restoration record) | `stages/20261011-staging-restore.md` | Full pid/port reconciliation of the 16:11 SIGTERM; clean-worktree SHA-pinned redeploy; env-upsert bug fixed (rm→add→verify); proof matrix green (200s, 403 wrong-origin, 12/12 Playwright); second shutdown wave documented above |
| **L1 CRE simulation** | **SIMULATED — official simulator PASS** (PR #21 merged) | `sponsors/chainlink-cre/simulation-results.json` + 4 sanitized logs; `stages/20261011-cre-simulation.md` | Positive PASS @ block 70100439 (graduated/marketIdentity/custodyAgreement true; Sourcify v2 `exact_match`); negatives wrong-market FAIL, not-graduated FAIL, sourcify-down INCOMPLETE_EXTERNAL (transport-crash bug found & fixed); determinism proven. Five execution-discovered fixes landed (config nesting, entrypoint shape, Sourcify v1→v2, proto-bigint, transport hardening). BLOCKER-004 → RESOLVED |
| **L2 Envio durability** | **IN_PROGRESS / INTERRUPTED** (committed honestly on `feat/metropolis-envio-durability` → PR) | 15/15 unit tests green; fail-closed server verified | DONE+TESTED: journal.ts (append-only fsync'd journal, atomic snapshot, torn-tail skip, reorg-aware resume), aggregator restore/persist + decode-error counter + separated freshness metrics, stream wiring, server envs/health. LIVE partial: operator token **authenticates** against 10143.hypersync.xyz (first authenticated reach). **Interrupted at:** stream query rejects `fieldSelection.block: ['number']` — client `BlockField` enum uses different member names (typings at `index.d.ts:195`, union starts `'Number'`); fix names → finish dev-run ingestion → reconcile vs indexer → build retro-ui panel |
| **L3 Mera** | NOT_STARTED (prep done) | signer spike design ready | SDK 0.2.0 verified to export the full passkey→EVM signer chain (`getPasskeyPrfOutput → createSecp256k1SigningSession → toViemAccount`); binding docs 13/14/15 analyzed; implementation plan set (signer proof FIRST, then honest APP_ONLY UI, `prepareTransferCreatorFeeRecipient` from existing factory ABI) |
| **L4 Pinata** | DEFERRED (per operator correction) | — | Shadow-path validation only, after JWT rotation |
| **L5 MetaMask** | NOT_STARTED this session | prior: policy 8/8, manifest validated | Diagnostics + publish/provision approval packet pending |
| **L6 VPS durability** | BLOCKED at preflight | SSH probe report | `yubie-deploy@84.247.158.36` rejects publickey under BatchMode (key file exists; no ssh-agent) — needs operator interactive agent unlock; read-only inspection only after; full migration proposal per doc 01 ready to write |
| **L7 Ledger/submission** | ONGOING | INTEGRATION-STATUS rows + BLOCKER updates | CRE + staging rows updated; sponsor A–E final pass pending remaining lanes |

## 4. Sponsor matrix snapshot (A–E honest)

| Sponsor | Verdict now | Missing for QUALIFIED_A_E |
|---|---|---|
| Kuru Consumer | TESTED_E2E (staging) | judge demo with live book state (book honestly empty; depth states verified) |
| Kuru New Assets | DEFERRED_AUTHORIZATION | operator go + funded wallet (P0 gate) |
| Mera | CONDITIONAL | operator manual PRF run; real signed tx (authorization) |
| Envio | TESTED_LOCAL (durability) + auth-reached | finish dev-run, reconciliation, panel, public activation only post-rotation |
| Chainlink CRE | **SIMULATED (official)** | optional DON deployment / creator watcher |
| MetaMask Agent | TESTED_LOCAL | supported install path + publish approval + wallet provision |
| Aurora | BLOCKED_EXTERNAL (closed) | none — no testnet route exists |
| Nansen | BLOCKED_EXTERNAL (closed) | none — no key/coverage |

## 5. Resume instructions (next session, in order)

1. **Envio:** read `BlockField` union from installed client typings (`index.d.ts:195`) →
   fix `fieldSelection.block` member names in `stream.ts` → rerun the dev-run (token in
   `.staging/radar.env`, `RADAR_STATE_DIR=.data/radar`, market-token map for the
   evidenced market) → verify real TokenLaunched/Trade events + journal/snapshot files →
   reconcile counts against `apps/indexer` → build the retro-ui radar panel (fail-closed)
   → gateway `/api/radar/*` allowlist route (prepared, NOT publicly activated until
   rotation confirmed).
2. **Mera:** signer spike → APP_ONLY UI → SDK prepare fn (per corrected plan §L3).
3. **Staging:** restore the backend stack again if down (`STAGING-RUNBOOK` cold start)
   before any judge-facing demo.
4. **Then:** MetaMask diagnostics/packet, Pinata shadow (post-rotation), VPS after agent
   unlock, final regression + A–E ledger + submission package.

## 5b. Leave-behind correction (post-merge, same day)

- Staging stack restored a SECOND time after another SIGTERM wave; tunnel rotated to
  `concerning-billing-unnecessary-poultry.trycloudflare.com`.
- The deploy script's verified env rotation then caught a REAL propagation race
  (rm→add→immediate-ls misses the new key) and aborted honestly — exactly the failure
  mode the operator correction predicted. Patched with bounded retry/backoff; direct
  pipe-form adds verified working; full proof matrix re-run green on the final state:
  frontend 200, referral health 200 + challenge 200 + wrong-origin 403, media health
  200, bundle carries the current tunnel, indexer lag 8 blocks.

## 6. Consolidation performed at this checkpoint

- L0 restoration + fix: already on main via PR #21 lineage (documented above).
- L2 Envio WIP: committed on `feat/metropolis-envio-durability` with explicit
  IN_PROGRESS status and exact resume point (PR consolidating it merged).
- This analysis document + INTEGRATION-STATUS row appended.
- Staging state at handoff: **FULLY UP** — Vercel 200 serving live mode, backends healthy through the current tunnel (indexer lag 8), proof matrix green.
- Zero `apps/web` paths changed across every commit (guard verified per commit).
