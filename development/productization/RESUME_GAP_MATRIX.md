# Productization resume reconciliation

Baseline: `f643cb62c7713c561cd4a95a9ffbabad5e620eb9` on local `main`; origin matches. Earlier `c41d35d` evidence is historical only. This covers original section numbers 0–45 (46 rows including specialist setup), without reapplying integrated code. Statuses distinguish tested mechanisms from live transaction gates; current test evidence is linked in the resume reports.

No signed testnet transaction is authorized by this resumed directive; controlled actor execution is **BLOCKED FOR AUTHORIZATION**. Automatic fixtures/read-only tests are authorized. No contracts, addresses, ABI truth, deployment or visual redesign changes.

| § | Objective | Status | Current evidence | Next gate |
|---|---|---|---|---|
| 0 | Specialists | VERIFIED DONE | Installed React/investigate/Playwright skills; three independent scoped agents | Current task tool evidence |
| 1 | Baseline and git | VERIFIED DONE | main/origin f643cb62; held Codex branch remains c41d35d, no unique commits | Git state captured; all untracked artifacts preserved |
| 2 | Latency instrumentation | PRESENT BUT UNQUALIFIED | lib/live/performance.ts; scripts/performance/browser.mjs | Matched integrated-main production samples before/after |
| 3 | Progressive detail | PRESENT BUT UNQUALIFIED | hooks/use-launch-detail.ts | Real-indexer shell vs delayed RPC; cancellation |
| 4 | Read tiers | PRESENT BUT UNQUALIFIED | SDK model.ts/kuru.ts | Pinned-block reads/static-cache/dynamic refresh audit |
| 5 | Kuru history separation | PRESENT BUT UNQUALIFIED | SDK kuru.ts; indexer/project.ts | No page startup getLogs; runtime request trace |
| 6 | Frontend transport | BLOCKED | Credential-bearing VITE env replaced; public-rpc-env guard2PASS; SDK circuit/redaction tests | Private browser Infura needs qualified production read-only gateway; Infura malformed batches remain unqualified |
| 7 | Batch/multicall | VERIFIED DONE | New pinned-block paced fair benchmark; historical failed comparison preserved | Partial provider modes explicitly excluded; no default/winner claim |
| 8 | Query cache | PRESENT BUT UNQUALIFIED | lib/live/queries.ts | Dedup/abort/retention/account invalidation tests |
| 9 | SPA wallet continuity | PRESENT BUT UNQUALIFIED | safe-link.tsx/next-compat.tsx/main.tsx | Connected/wrong-chain/back-forward browser tests |
| 10 | Receipt launch fast path | PRESENT BUT UNQUALIFIED | confirmed launch seed/create wizard | Fixture receipt validation; signed live proof BLOCKED FOR AUTHORIZATION |
| 11 | Indexer read API | VERIFIED DONE | 42 indexer tests/typecheck; real endpoints200; invalid pagination400 | Signed convergence separately blocked |
| 12 | Query caching | VERIFIED DONE | ETag304 deterministic; actualchanging snapshot appropriately200 | No wallet authoritative cache |
| 13 | Canonical candles | VERIFIED DONE | Canonical OHLCV/6-18 decimals/extremeinteger regressions; real candles endpoint | No fabricated points |
| 14 | Lightweight charts v5 | PRESENT BUT UNQUALIFIED | trading-chart.tsx/chart-data.ts | Real Line/Candles/volume/resize/attribution dev-prod |
| 15 | Price authority | PRESENT BUT UNQUALIFIED | token-terminal view-model; indexer/project.ts | Pinned Curve spot/Kuru execution price equivalence |
| 16 | Discovery columns | PRESENT BUT UNQUALIFIED | launch-table.tsx/view-models/discovery.ts | Live table values, units, absent liquidity |
| 17 | Discovery filters | PRESENT BUT UNQUALIFIED | discovery.tsx/indexer/query.ts | Actual pairs and near-graduation 8000 BPS |
| 18 | Live search | PRESENT BUT UNQUALIFIED | shell/live-search.tsx | Abort/debounce/live-only results |
| 19 | Live/demo isolation | PRESENT BUT UNQUALIFIED | TokenTerminal/DATA_MODE routes | Live read-only and fixture guard regression |
| 20 | Unified trading chassis | PRESENT BUT UNQUALIFIED | unified ticket/deposit-order-machine.ts | Lifecycle branch tests; signed operations blocked |
| 21 | GTC and order IDs | PRESENT BUT UNQUALIFIED | Kuru ticket/SDK decode.ts | ABI/source match, receipt-only IDs |
| 22 | Open order projection | PRESENT BUT UNQUALIFIED | indexer/project.ts; wallet-state.ts | Fills/cancels/onchain stale order state/pagination |
| 23 | Trades table | PRESENT BUT UNQUALIFIED | TokenTerminal and trade adapters | Live execution units/actor/explorer |
| 24 | Holders | PRESENT BUT UNQUALIFIED | indexer/project.ts; terminal holders | Zero/custody role/share/pagination |
| 25 | Protocol proof | PRESENT BUT UNQUALIFIED | terminal protocol; SDK readLaunchProof | Deployment identity/quote policy proof |
| 26 | Create ABI form | PRESENT BUT UNQUALIFIED | create-launch.tsx/create validation | Field classification and ABI tests |
| 27 | Earn/Portfolio hub | PRESENT BUT UNQUALIFIED | earn.tsx/live-portfolio.tsx/use-claims.ts | Wallet candidate APIs/current direct state; no fixtures |
| 28 | Honest earnings | PRESENT BUT UNQUALIFIED | wallet-state.ts/live-earn.tsx | Recipient/token mapping and per-asset claim accounting |
| 29 | Referral attribution | PRESENT BUT UNQUALIFIED | Activity page limit100; head-drop reorg fix;15 service tests;11 actual ownership/session gates | Real confirmed qualifying actor events require separately authorized transaction |
| 30 | Referral payout decision | VERIFIED DONE | API runtime earningsEnabled=false; protocol change required documented | No payout contract or fake revenue |
| 31 | Fiat capability gate | PRESENT BUT UNQUALIFIED | fiat-provider.ts/fund-wallet.tsx | Exact10143 all disabled; no SDK invocation |
| 32 | MoonPay flow | PRESENT BUT UNQUALIFIED | fund-wallet.tsx/fiat-provider.ts | Disabled testnet and claim-vs-sell copy |
| 33 | Same-chain sends | PRESENT BUT UNQUALIFIED | Fresh native/ERC20 send identity/balance/gas/false-return tests in SDK | Real sends BLOCKED FOR AUTHORIZATION |
| 34 | Bundle performance | PRESENT BUT UNQUALIFIED | route lazyimports/percontract ABIs | Same-mode baseline/after chunk audit |
| 35 | Prefetch | PRESENT BUT UNQUALIFIED | queries.ts/discovery row handlers | Hover/focus bounded indexed/essential only |
| 36 | Background refresh | PRESENT BUT UNQUALIFIED | Query defaults/polling hooks | Page visibility and stale-execution guards |
| 37 | Optional streaming | VERIFIED DONE | Polling retained; streaming optional | No streaming prerequisite or invented implementation |
| 38 | Progressive UX | PRESENT BUT UNQUALIFIED | TokenTerminal independent sections | No blank loader with indexed snapshot |
| 39 | Competitor reference | VERIFIED DONE | Prior archived research/screenshots preserved | No new competitive research/redesign per current directive |
| 40 | Test matrix | PRESENT BUT UNQUALIFIED | Playwright fixture/live-readonly and package tests | Fresh exact commands/counts/skips; writes separately blocked |
| 41 | Performance targets | PRESENT BUT UNQUALIFIED | Historical RPC artifact only | New f643cb62 baseline successful samples and misses |
| 42 | Security | PRESENT BUT UNQUALIFIED | Public env guard; RPC redaction/schema; signature/session privacy; contractdiff empty | External production assets/hosting parity unverified |
| 43 | Ownership/design | VERIFIED DONE | Integrated Kiro main preserved | Functional scoped patches only; no CSS redesign |
| 44 | Commit order | VERIFIED DONE | Historical work integrated in f643cb62 | No reapply/merge/branch/push; current main-only |
| 45 | Release success | BLOCKED | No contracts changed; runtime recovered; automatic qualification in progress | GLM frontend ownership release; unqualified Infura; production gateway; authorized signed lifecycle gates |

## Change ownership / conflicts

| Area | Integrated ownership | Resume owner / treatment |
|---|---|---|
| Kiro visual terminal, CSS, primitives | Preserved f643cb62 | Read-only design; minimal functional patches only |
| Historical Codex feature branch | merge-base c41d35d; branch has no commits unique to main | No merge/cherry-pick/reapply |
| SDK | Integrated financial changes | resume_sdk: current-source audit/focused fixes/tests |
| Indexer/provider pool | Integrated runtime/projections | resume_runtime: singlewriter/reorg/provider/API qualification |
| Frontend/browser | Integrated terminal/Playwright | resume_browser: crash isolation and fixture/live-readonly QA |
| Referrals/indexed-record/config/performance | Integrated source | root integrator: exact lookup, secret-safe configuration, service integration |
| 4462 untracked prior artifacts/files at intake | Existing user/agent work | Preserve all; no clean/stash/reset/staging bulk |
| Other worktrees (merge84861f5, Metropolis8a5fc1f, V2E2Ea8a81f5) | Separate historical lanes | No changes or switches |

The user identifies GLM as the active Earn/Portfolio writer. Process labels do not establish ownership. GLM retains exclusive ownership of earn.tsx, earn-hub.css, live-earn.tsx, live-portfolio.tsx, use-claims.ts and its Earn fixture edits until completion is confirmed. Those files were not overwritten/staged/committed. Initial tracked diff was empty; subsequent edits include protected GLM work and scoped Codex work. No commit/push/deploy was performed.
