# FINAL ANSWERS TO KIRO'S THREE QUESTIONS — APPROVED FRONTEND EXECUTION ADDENDUM

This directive is the **user's final decision** for the current Kiro CLI V3 RetroPick frontend campaign. It complements, but does not summarize, replace, or reduce, the complete existing **38-section Professional Trading UI/UX Campaign**. The full, unabridged campaign appears after this addendum in the combined master file, and **every section remains binding**.

**Reply to the agent's three questions: `1=A, 2=B, 3=A with safety gates; automatically fall back to 3=B if its safety gates fail.`** No more scope questionnaire or re-planning loop. The agent must execute to the extent its actual shell/write/browser permissions allow.

## 1. Demo mode: choose A — one component system with deterministic fixtures

Approved: **feed deterministic demo fixtures into the same redesigned UI components that render actual live RetroPick markets**, rather than maintaining parallel demo-only implementations or spoofing network results as if they were live.

- Use an explicit typed source/availability boundary, e.g. `DemoMarketViewModel` and `LiveMarketViewModel` or a discriminated `dataMode` field. Unify the **presentational component tree**, not the truth/provenance of its data. The same token header, chart, metrics, trade ticket shell, tables, loading/error states, and navigation should work across both modes.
- Create a deterministic, versioned, testable fixture for **ACTIVE**, **GRADUATION_READY**, **GRADUATING**, and **GRADUATED**, including different availability conditions (disconnected wallet, slow RPC, stale indexer, no holders, no orders, Kuru margin shortfall). Cover these exact states in Playwright.
- Label **every demo fixture and demo financial figure clearly DEMO/SIMULATED**, including routes and trading panels; demo token URLs must never silently route to nonexistent live on-chain launches. Never blend fixture balances, liquidity, price history, or earnings into a live feed. Keep live endpoints fail-closed.
- Remove Bags-copied text, SOL denominators, fake referral payouts, invented creator-earning amounts, unsupported network/destination logos, synthetic real-market sparklines, and misleading deployed functionality. Display unsupported data as `—`, a truthful informational state, or a disabled capability with explanation.
- **Do not delete duplicate pages before parity is proven.** First map all existing behavior in `demo-token-detail.tsx`, the demo Earn page and live counterparts; migrate functionality into shared components; validate each lifecycle state; then remove obsolete branches/files only when tests prove complete coverage.
- The demo is for deterministic **presentation and interaction testing**, not for certifying live on-chain trading. Run a separate **read-only** testnet integration suite and report fixture and live results independently.

## 2. Baseline and dirty worktree: choose B — carry qualified changes forward safely

Approved: **do not require the user to commit first and do not start from clean HEAD while discarding the qualified uncommitted work**. The starting functional baseline is `BASE_HEAD_SHA + BASELINE_DIRTY_DELTA`, not an invented clean SHA.

Before touching source files:

1. Discover the real repo root, current branch/HEAD, staged and unstaged tracked changes, untracked paths, local governance, and other active agent work. Inspect exact ownership and whether any files are changing concurrently.
2. Capture immutable reference evidence: HEAD SHA, `git status --porcelain=v1 -uall`, tracked diff summaries, staged diff summaries, filenames, and a **secure local snapshot** of the actual baseline. If saving full patches, keep them local with restrictive permissions, exclude/redact credentials and `.env*`, and never publish them as browser artifacts.
3. Verify `apps/retro-ui` remains the canonical Vite frontend per current runtime evidence. **Never modify `apps/web`**; read it only where applicable governance permits.
4. If safe, create the requested `kimi/retro-ui-trading-product-redesign` branch **from the current HEAD while preserving the existing working tree changes**, after recording the baseline. `git switch -c` must not be used blindly; check for an existing branch, active worktree claims, unmerged entries, and concurrent writers first.
5. If branch creation would threaten others' work, do not force it. Use a non-destructive isolated strategy that explicitly carries over the *qualified* frontend delta, or continue only in an authorized safe scope and mark branch creation BLOCKED. Never reset, stash, clean, force-switch, or overwrite conflicting work. Do not automatically commit/push.
6. At the end, distinguish **pre-existing changes** from **changes actually made by this campaign** by comparing against the captured baseline. Report `BASE_HEAD_SHA`, `BASELINE_DIRTY_DELTA` identity, current HEAD, branch, and genuine modified paths. `FINAL_SHA` may equal `BASE_HEAD_SHA` if no commit was authorized; do not invent a new commit ID.

`HACKATHON_FREEZE` is non-negotiable. The qualified contracts, deployed addresses, SDK financial semantics, indexer financial definitions, Kuru precision math and security write allowlist are outside this frontend campaign.

## 3. Kuru margin UX: choose A *only if safe*; otherwise automatically use B

**Product goal:** a unified, trader-first ticket presenting `Market | Limit`, then `Buy | Sell`, for both curve-active and Kuru-graduated assets. For insufficient Kuru margin, the user-facing primary intent should be **“Deposit & place order”**, not a permanently exposed protocol-operations form.

**Execution safety gates for option A:**

- Inspect and prove the existing, authorized SDK/wallet transaction APIs can perform **the same separate deposit and order writes** in the correct sequence, without inventing ABI calls, changing financial mathematics, bypassing the security allowlist, or modifying frozen contracts/SDK semantics. Validate preflight simulation and actual order/margin requirements from authoritative existing outputs, not approximate UI math.
- The CTA must clearly preview **two sequential transactions and two separate wallet signatures**. Show `Step 1/2: Deposit required margin` → wait for successful chain receipt and refreshed authoritative margin state → `Step 2/2: Place order` → await submission/confirmation/indexing. **A single CTA is not a single signature or atomic operation.** Users must be able to reject either wallet request.
- A deposit failure or wallet rejection must prevent order submission. If deposit succeeds and order fails/is rejected, show **“Margin deposited; order not placed”** with an accurate retry and an existing supported withdrawal/management path. Never silently auto-withdraw or automatically re-deposit when retrying.
- Prevent duplicate execution (disabled pending states, receipt correlation, no duplicate deposit/order on retry). Handle wrong chain, quote freshness/slippage, price changes, gas availability, precision/rounding, cancellation, slow RPC, and partial success. Do not show "Completed" until the actual ordered operations' authoritative confirmation conditions are met.
- Do not turn wallet signature requests into background actions. Use test mocks and pre-signature previews for Playwright; never sign or broadcast a live transaction in UI QA.

**Automatic fallback to option B:** If any option-A precondition is unverified, prohibited by governance, or requires new transaction orchestration beyond approved presentation work, implement **explicit inline two-step funding UI**: first `Deposit X MON to Kuru margin`, wait for confirmation, then `Place order`. Retain one visually consistent ticket shell and hide advanced margin plumbing behind contextual disclosure. Report the fallback, reason, and dependency; do not ask another question.

## 4. Correct the chart timeframe misconception

The indexer's supported **OHLCV aggregation resolutions** and the chart's **visible time ranges** are separate concepts. A missing native **6-hour candle resolution does not by itself prevent displaying a last-6-hours chart range**.

- Discover actual API capabilities for ranges and intervals. Where supported, expose user-meaningful **time ranges** (`1H`, `6H`, `1D`, `7D`, `All`) independently from **candle intervals** (`1m`, `5m`, `15m`, `1h`). Only offer combinations backed by real indexed observations and valid adapter behavior.
- A 6H range may be rendered using genuine 5m/15m/1h candles; it must **not** synthesize six-hour observations or invent missing trades. If the API truly cannot return the 6H range, disable it and document that **range** limitation, not a falsely stated lack of `6h` candle resolution.
- For both line and candles, use the same authoritative OHLCV input, real bucket closes and actual gaps. No sine-wave/illustrative sparklines inside live trading screens. Favor the installed `lightweight-charts` trading implementation; don't remove Recharts or add libraries without proving the separate existing usage and the net benefit.

## 5. Product direction from the supplied comparative research

**Pons is the reference for trading clarity and lifecycle discovery**: prominent token identity and price, chart-dominant two-column terminal, right-rail trade ticket, compact market stats, real trades/holders, lifecycle sorting, pair filter, and responsive controls. **Bags is the reference for earnings/portfolio information architecture and creator analytics**, not for RetroPick financial policy or fee rates. **RetroPick is the source of truth for product scope and trading semantics**: Prediction, Crypto, PRISM, Curve → Kuru, Monad, Launch Proof and protocol transparency.

Apply the research as design *guidance*, not as authority to change contracts or fabricate data:

- **Indexer-first read model with fresh-wallet/on-chain execution checks:** render real indexed token identity, historical candles, trades, holders and lifecycle without blocking the whole screen on RPC; isolate `Syncing on-chain state` within the ticket. Never allow a stale indexed projection to authorize a trade, display stale executable quotes as current, or assert settlement finality before confirmation.
- Preserve a single user-facing `TradeTicket` shell with different **existing** Curve and Kuru execution adapters. Avoid duplicating trading states in independent products.
- Discovery should support actual category navigation (Prediction, Crypto, PRISM as implemented) plus launch lifecycle filters (New, Active, Near graduation, Graduated), admitted quote-pair filtering from a real registry, real contract/name/symbol/creator search, list/grid, and clear DEMO indicators.
- Build a genuine dense trades and holders experience, attractive protocol verification, and a creator/portfolio hub tied to *actual* claimable contracts and funded rewards. Never copy Bags' SOL figures or fee percentages. Testnet fiat/on-ramp providers are currently unsupported according to the agent's inspection; do not present them as operational.
- Treat old **Base Sepolia V1 architecture** as historical background only. The current repository governance, deployed Monad Testnet V2 facts, and code take precedence. Likewise the proposed **PRISM State Liquidity Engine/Payoff AMM/Claim Transformer** is strategic R&D, **not** a deployed financial capability to invent in this frontend campaign. Preserve currently implemented PRISM screens and honestly mark unimplemented future states.
- Deliver all 38 original design sections, not only the token terminal. Organize work in tested implementation waves without reducing scope or silently dropping unfinished sections; explicitly report incomplete requirements as `BLOCKED` or `NOT IMPLEMENTED`.

## 6. Configure **Microsoft Playwright MCP** persistently — separate from Playwright Test

Previous Kiro sessions confirmed **direct `@playwright/test` + Chromium** worked, including rendered Pons screenshots. **They did not confirm that Playwright MCP is installed/connected**, and the most recent read-only discovery found no native `retropick-browser-audit` recipe. These are separate facts. Do not claim MCP works simply because Playwright Test works.

### Required MCP integration

1. Verify you are in an execution-capable Kiro CLI V3 agent. Planning-only tool restrictions cannot be bypassed by prompt. If effective shell/write permissions exist, prove them with harmless commands before declaring the session blocked.
2. Inspect installed Kiro V3 version and exact agent/MCP config paths; inspect current user/workspace MCP configurations and tool inclusion rules without printing credentials.
3. Safely merge a `playwright` server entry into the existing MCP configuration without replacing any other server. Use the official Microsoft server through `npx`; initialize headless and isolated. A representative server entry is:

   ```json
   {
     "playwright": {
       "command": "npx",
       "args": ["-y", "@playwright/mcp@latest", "--headless", "--isolated"],
       "disabled": false
     }
   }
   ```

   Nest this **inside an existing `mcpServers` map**; never replace the whole JSON object blindly. Prefer a user-level config for persistent cross-session access if authorized; otherwise a trusted-workspace config. After proving the current version, pin the tested package version when practical for reproducibility.
4. If using a custom agent, confirm V3 `tools` includes **`@mcp`**, and `includeMcpJson: true` where server configs must be inherited; preserve existing tool categories, agents and rules. Tool **visibility** and tool **permission** are distinct. Respect workspace trust requirements and user security approvals.
5. Kiro may prohibit AI writes to protected `.kiro/settings/` or `~/.kiro/settings/` regardless of prompt. **Do not bypass the protection.** If permission is denied, output a minimal, non-destructive merge patch and precise one-time user action, while continuing with working direct Playwright Test. Never claim MCP was installed if the protected write was rejected.
6. Reload/restart the relevant agent configuration using documented Kiro commands when supported. Verify an actual MCP handshake and the tool inventory, then **invoke the MCP browser tools themselves** to navigate to `https://ponsfamily.com`, capture an accessibility/DOM snapshot, and produce a real screenshot. Explicitly record that the tool invocations were via Playwright MCP (not WebFetch or direct Playwright).
7. Keep direct `@playwright/test` as the deterministic regression/E2E runner. MCP is for the agent's interactive inspection and exploration; Playwright Test is for repeatable assertions, mobile runs and CI. A working direct runner is not evidence of MCP connectivity, and an MCP snapshot alone is not a regression test.
8. Validate the persistent integration from a subsequent/new agent session or equivalent clean reload, if the environment allows. Record config scopes, agent visibility, used MCP tool names, screenshot/DOM evidence paths, and a truthful `CONNECTED / BLOCKED / NOT CONFIGURED` result.

### Persistent audit recipe

If Kiro V3 Workflows are enabled and the installed runtime exposes workflow authoring/validation, create a reusable project recipe under `.kiro/workflows/`, validate it with the actual `validate_workflow` tool if present, and prove a real execution. If Workflows is disabled/unavailable or protected, **do not block frontend development**; create a safe project-local Playwright Test runner with documented commands and evidence conventions, and report the distinction accurately. Do not invent nonexistent `/workflow run` success.

### Browser and security gates

- Never invoke `scripts/e2e/live-buy*`, `live-create*`, `live-graduate*`, or `live-kuru*` as part of browser UI regression: prior inspection found those scripts can sign/broadcast wallet transactions. Inspect any alternative script before running it; safe read-only `product-navigation.mjs` may be reused after verification.
- Competitor browsing is **read-only, no funded wallet**, and stops before signing. RetroPick visual tests use disconnected/mocked wallet states. No live signatures, approvals, order submission, protocol writes, or fiat provider actions.
- Save separate, fresh screenshot/DOM/console/network evidence per wave and viewport at `evidence/platform/frontend/browser-validation/<timestamp>/`, with secrets redacted. Preserve earlier evidence untouched.
- Execute local deterministic fixtures and read-only Monad Testnet integration as different validation targets. A localhost live-mode instance is **not** automatically evidence of an independently deployed remote staging environment.

## 7. No additional questions; begin the bounded execution loop

The three design choices are approved. Do not ask the user again about demo mode, dirty baseline, margin UX, frontend selection, chart presets, or Playwright infrastructure. Reconfirm runtime facts via tools, follow project governance, then **implement actual `apps/retro-ui` code and execute browser validation**. Work in reasonable waves with a fresh browser quality gate at each wave; the wave plan must cover every one of the original 38 sections.

Do not modify contracts, deployed addresses, SDK settlement semantics, indexer financial definitions, security allowlists or Kuru math. Do not auto-commit, push, deploy, sign/broadcast transactions, or overwrite concurrent developer work. If any proposed UI convenience depends on a new write or unverified semantics, implement the safe explicit UI state and document the dependency rather than guessing.

**The immediate deliverables are (1) a safe preserved baseline, (2) a verified MCP-connection result or exact protected-config blocker, (3) a fresh Playwright browser smoke test, (4) actual first-wave frontend source changes with before/after browser evidence, and (5) continuation through the full unabridged 38-section campaign. START EXECUTION IN THE CAPABLE AGENT.**

---

# FULL ORIGINAL 38-SECTION CAMPAIGN (UNCHANGED BELOW)

# NEW KIRO V3 SESSION — FULL-SCOPE EXECUTION ADDENDUM
## ADDITIVE SESSION DIRECTIVES (DO NOT SHORTEN THE ORIGINAL CAMPAIGN)

**This file contains the COMPLETE, UNABRIDGED, ORIGINAL 38-SECTION RetroPick UI/UX Campaign.**
The original campaign is reproduced verbatim between the clearly marked begin/end delimiters below, including its exact formatting, functional requirements, examples, acceptance gates, and final report checklist. Nothing in Sections 1–38 has been deleted, summarized, merged, or replaced.

### Mission and priority

You are operating inside a **new Kiro CLI V3 Default/execution-capable agent session** in `https://github.com/RetroPick/retropick-protocol`. Your mission is to **implement the entire original professional trading UI/UX campaign**, not to rewrite its specification. Treat all 38 sections below as binding functional and visual scope. Implement the full campaign in coherent, tested implementation waves; do not silently drop less convenient sections such as Holders, Orders, Earn, Referral, Fund/Send, creation, accessibility, themes, responsive behavior, or full QA. If something is unsupported by protocol/backend, preserve its accurately disabled/absent state and document the missing dependency rather than fabricating it.

The second, equally important requirement is to **use and institutionalize the real-browser Playwright pathway previously proven by Kiro**. Browser testing is an always-on development quality gate, not a one-time audit or a substitute for coding. Reuse existing Kiro native workflow(s) if genuinely present; otherwise build a safe repeatable Playwright Test workflow using tools already installed. Do not ask the user to run `/mcp`, don't demand MCP installation when the direct Playwright runtime works, and don't claim a native workflow exists without finding and executing it.

### Historical evidence from the previous Kiro execution session (VERIFY AGAIN)

- Canonical frontend recorded in `.agent/STATE.json`: `apps/retro-ui` (React/Vite). The original campaign explicitly prohibits working in `apps/web`; **do not edit `apps/web`**. Read it only when repository rules allow comparison of legacy/shared interfaces.
- Earlier execution verified Node.js 22.23.2, pnpm 11.25.0, `@playwright/test@1.62.1` resolvable from `apps/retro-ui`, and headless Chromium. Standalone `playwright` was absent. This is prior-session evidence, not a guarantee about the current session. Inspect actual versions rather than hardcoding them.
- `apps/retro-ui` Vite previously ran on port 3000; a second instance automatically selected 3001. Discover current running processes/ports; don't assume either instance remains available.
- Historical browser evidence was written to `evidence/platform/frontend/browser-validation/<timestamp>/`, including Pons and RetroPick desktop/mobile screenshots, DOM/console/network evidence, and an on-chain token-detail capture.
- Previous local probe reported **15 PASS / 3 WARN / 0 FAIL**. Its warnings included live-mode local indexer availability and Monad RPC provider failures; a staging-like live-mode instance was tested locally, but an independent remote staging deployment was not conclusively proven.
- The prior audit reported a possible duplicate React `createRoot()` warning, demo fixtures linking to absent on-chain launches, Monad RPC fallback/rate limiting, and opportunity for improved chart/loading-state UX. Reproduce and classify before fixing; avoid introducing financial-semantic changes.
- Approx. **36 pre-existing dirty files** across frontend/indexer/SDK were reported. This is a protection constraint, not authorization to reset or overwrite anything. Work from the current valid functional state, isolate changes safely, and record before/after diffs. No blind branch switch, stash, reset, or `git clean`.
- `HACKATHON_FREEZE` applies to protocol/deployed contracts. The frontend redesign must preserve the qualified wallet→chain Monad Testnet and Curve→Kuru functional rules.

### Mandatory workflow bootstrap — perform via actual tools

1. Confirm the active agent has genuine shell/write execution permissions. If restricted to Plan Mode, do not pretend that an unavailable `switch_to_execution` tool exists; report the precise blocker and how to use the Default execution agent. Never fabricate command outputs.
2. Execute non-destructive repository discovery: `pwd`, `git status --short`, current branch, HEAD, repository guidance/ADRs, frontend scripts/dependencies, existing Playwright suites and `.kiro/workflows/` configuration. Do not print values from `.env*` files; inspect safe variable names only where necessary.
3. Find any Kiro native `retropick-browser-audit` workflow or equivalent. Verify its real structure, installed-version compatibility, and successful invocation **before** claiming it is integrated. If none exists, use the proven direct `@playwright/test` runtime from `apps/retro-ui` and create/validate a reproducible project-local runner or native recipe if actually supported. Preserve all existing Kiro agents, MCP servers, and configuration files.
4. Run a fresh browser smoke test: launch Chromium, navigate, inspect rendered DOM, capture a new screenshot, console messages, and network failures. Record the exact command and artifact path. Historical screenshots cannot satisfy this gate.
5. Establish a safe functional baseline and isolated work area. The original's `kimi/retro-ui-trading-product-redesign` branch name remains the requested target, but do not force branch creation if doing so risks overwriting current dirty work. Fill `<FUNCTIONAL_BASE_SHA>` from the verified repository, not a guess. If an existing branch has divergent content, preserve it and document the safe branch/worktree strategy.
6. Capture current UI screenshots and interaction baselines at all relevant viewports. Reuse prior Pons evidence as reference; browse Pons and Bags live when accessible to update observations. Never execute transactions or connect a funded wallet to competitor sites.
7. Implement the **original 38 sections in full**, organized by dependencies: design-system primitives; token header/chart/trade ticket; lifecycle/market interactions; discovery/search/grid; metrics/About/trades/holders/protocol/orders; Earn/Portfolio/Referral/Fund/Send/Create; progressive loading/error/resilience; themes/responsiveness/accessibility/performance/microinteractions. This wave ordering is **not permission to skip any section**.
8. Every wave follows a real loop: snapshot baseline → change permitted frontend code → lint/typecheck/unit tests → Playwright click/keyboard/mobile interaction tests → new before/after screenshots → console/network inspection → fix regressions. Test locally with deterministic fixtures and separately on live/testnet read-only data when accessible. Mock-mode success must not be claimed as live trading success.
9. For trading, test only safe no-signature/no-broadcast paths, including disconnected wallet, quote preview, and disabled states. Preserve financial truth, address sources, Kuru semantics, support restrictions, and existing contract interactions. Never replace real data with fabricated market metrics.
10. Implement the final report format **exactly as specified in Section 38**, covering every original acceptance row, along with SHA/branch/diffs, tests executed, screenshot paths, root causes and unaddressed dependency blockers. Report `PASS`, `FAIL`, `BLOCKED`, or `NOT IMPLEMENTED` truthfully. Preserve the original zero-console-errors quality target by distinguishing **new app exceptions** from pre-existing third-party telemetry/RPC messages instead of silently deleting them.

### Autonomous-development rules

- Start coding after the required preservation and browser smoke gates. Do not stop at a plan, another questionnaire, a runbook, or research-only output.
- The original 38-section campaign has priority for product scope, financial truth, visual targets, component targets, QA targets, and final deliverables. This addendum only tells Kiro how to execute that campaign reliably and safely in a new session.
- If an attached screenshot or original functionality is missing, inspect available repo references and document the constraint, but implement everything else feasible rather than replacing unknown details with imagined facts.
- Never auto-commit, push, deploy, modify deployed contracts/SDK financial semantics, handle funded wallets, or sign/broadcast transactions without separate authorization.
- Keep the user informed with concrete executed evidence and blockers. Do not request preferences already answered in the campaign.
- Success means actual frontend modifications, comprehensive implementation across the entire original campaign, repeatable Playwright browser verification, and unchanged financial semantics.

**BEGIN EXECUTION: Audit current repository safety and the installed Playwright workflow, run a fresh browser smoke test, then implement the entire campaign below.**

---

# BEGIN ORIGINAL CAMPAIGN — VERBATIM AND UNABRIDGED

# RETROPICK LAUNCHPAD — PROFESSIONAL TRADING UI/UX CAMPAIGN
# KIMI K3: SENIOR CRYPTO PRODUCT DESIGNER + FRONTEND ENGINEER

Repository:
https://github.com/RetroPick/retropick-protocol

Functional baseline:
<FUNCTIONAL_BASE_SHA>

Canonical frontend:
apps/retro-ui

DO NOT WORK IN:
apps/web

Create branch:

kimi/retro-ui-trading-product-redesign


==================================================
ROLE
==================================================

Act as:

- senior crypto trading product designer;
- senior launchpad UI/UX designer;
- senior React/Vite frontend engineer;
- design-system engineer;
- responsive/mobile specialist;
- accessibility engineer.

The backend, SDK, ABI, indexer, wallet and trading semantics have
already been qualified by the functional engineering campaign.

YOUR PRIMARY RULE:

REDESIGN THE PRESENTATION AND INTERACTION QUALITY.

DO NOT REINTERPRET FINANCIAL SEMANTICS.


==================================================
1. REFERENCE RESEARCH
==================================================

Use gstack browser deeply.

Research current:

https://ponsfamily.com
https://bags.fm

and attached user screenshots.

Also study high-quality crypto trading interfaces where useful.

Do NOT copy source code, proprietary assets or branding.

Extract interaction patterns:

hierarchy
density
trade-ticket organization
chart sizing
token identity
status presentation
metrics
holders
trades
search
filters
earnings
mobile behavior
loading behavior.

Create:

docs/design/COMPETITIVE_UI_RESEARCH.md


==================================================
2. RETROPICK MUST REMAIN RETROPICK
==================================================

The target is NOT:

"a clone of Pons"

or:

"a clone of Bags."

Use the best interaction patterns, but preserve RetroPick:

brand
colors
typography direction
market-creation narrative
Monad identity
Curve → Kuru lifecycle
Launch Proof/protocol transparency.

The user should recognize the product as RetroPick immediately.


==================================================
3. USE THE ATTACHED SCREENSHOTS AS VISUAL TARGETS
==================================================

The attached references establish desired information density.

Important target characteristics:

- token identity strong at top;
- huge readable price;
- 24h movement next to price;
- market cap visible but secondary;
- chart gets majority of workspace;
- trade ticket fixed/sticky to right on desktop;
- Market / Limit first;
- Buy / Sell second;
- compact segmented controls;
- clean metric strip;
- detailed Trades/Holders underneath;
- no giant empty panels;
- real loading skeletons;
- responsive mobile trading.


==================================================
4. DESIGN SYSTEM FIRST
==================================================

Audit existing:

colors
spacing
radius
font sizes
shadows
borders
breakpoints
button states
inputs
tabs
segmented controls
tables
cards.

Reuse installed component primitives.

Evaluate:

Radix UI
existing project components
Sonner
Lucide

before adding new packages.

Do not turn the project into a dependency dump.

Create or normalize reusable:

SegmentedControl
TradingInput
Metric
MetricStrip
DataTable
TokenIdentity
PairBadge
LifecycleBadge
AddressChip
ChartToolbar
TradeTicket
OrderRow
HolderRow
Skeleton
EmptyState
ErrorState
FreshnessIndicator.


==================================================
5. TOKEN PAGE — DESKTOP TARGET
==================================================

Rebuild visual hierarchy while preserving functional handlers.

Target:

┌───────────────────────────────────────────────────────────────┐
│ ← Launches                                                   │
│                                                               │
│ [logo] Token Name SYMBOL ⭐                                  │
│        by creator · age · MON pair · address                 │
│                                                               │
│ PRICE                                   MARKET CAP             │
│ 24H CHANGE                                                     │
│                                                               │
│ ┌────────────────────────────┐  ┌───────────────────────────┐ │
│ │ chart toolbar              │  │ Market | Limit            │ │
│ │ Line | Candles             │  │ Buy | Sell                │ │
│ │ 1m 5m 1h 6h All           │  │                           │ │
│ │                            │  │ trading controls          │ │
│ │        CHART               │  │                           │ │
│ │                            │  │ CTA                       │ │
│ └────────────────────────────┘  └───────────────────────────┘ │
│                                                               │
│ Market cap | Holders | Trades | Supply | Creator earned       │
│                                                               │
│ Token | Curve | Launched | Graduated                          │
│                                                               │
│ About                                                         │
│                                                               │
│ Trades | Holders | Protocol | Orders                          │
└───────────────────────────────────────────────────────────────┘


==================================================
6. CHART
==================================================

Codex functional branch should already supply proper chart data and
chart adapter.

Style it to the target screenshots.

Toolbar:

Indicators
Line
Candles

1m
5m
1h
6h
All

LINE:

smooth clean line
subtle gradient area
latest-price marker
horizontal current-price guide
crosshair
tooltip.

CANDLES:

proper green/red candles
volume bars
current-price guide
crosshair.

Responsive.

No stretched SVG.

No jagged fake sparkline.

Do not interpolate fake trading events.


==================================================
7. TRADING PANEL
==================================================

This is currently the weakest major UI.

Rebuild it.

First segment:

Market | Limit

Second:

Buy | Sell


MARKET BUY:

Pay
[ amount              MON ]

25%  50%  75%  Max

You receive
<token amount>

Slippage
1.0% Adjust

[ Buy TOKEN ]


MARKET SELL:

Sell
[ token amount      TOKEN ]

25%  50%  75%  Max

You receive
MON

Slippage

[ Sell TOKEN ]


LIMIT BUY/SELL:

Pay / Sell

Limit price

Amount / receive

Order total

Order policy.

IMPORTANT:

Do NOT visually claim "Expires in 30 days" merely because the Pons
reference does.

Render whatever the functional layer says:

Good till cancelled

or actual expiry if implemented.

The UI follows Kuru semantics.


==================================================
8. ACTIVE VS GRADUATED TRADING
==================================================

Do not make token trading look like two unrelated products.

ACTIVE:

same trade-ticket shell
Market enabled
Limit disabled if unsupported.

Tooltip:

"Limit orders unlock when this market graduates to Kuru."


GRADUATED:

same shell

Market enabled
Limit enabled
Orders available.

Do not replace the panel with the current visually unrelated
"Kuru technical form."


==================================================
9. HIDE PROTOCOL COMPLEXITY FROM NORMAL TRADERS
==================================================

The current graduated ticket prominently exposes:

Margin · MON
Margin · TOKEN
Deposit
Withdraw

This is technically correct but terrible mainstream UX.

Do NOT remove the real requirement.

Instead design a trading-first workflow.

If the order requires Kuru margin:

show the necessary funding step contextually.

Example:

User enters order
→ UI detects insufficient margin
→ CTA says:
"Deposit & place order"

or provides a clear one-time deposit step.

Advanced margin management can live in:

Advanced
Portfolio
Orders.

The ordinary trade ticket should feel like trading, not operating
protocol plumbing.


==================================================
10. TRANSACTION STATE UX
==================================================

Design clear states:

Review
Approval required
Confirm in wallet
Submitted
Confirming
Indexed
Completed
Failed.

Do not blank the trade ticket.

Do not replace the entire page with loading.


==================================================
11. DISCOVERY / LAUNCH TABLE
==================================================

Follow the Pons information architecture but with RetroPick data.

Top lifecycle navigation:

Market cap
New
Active
Near graduation
Graduated

Right:

Any Pair ▼
list / grid toggle.


List/table columns:

Token
Pair
Graph
Price
Market cap
Liquidity
Volume 24h
Lifetime volume
Trades 24h.

On narrower desktop:
collapse lower-priority metrics intelligently.

On mobile:
cards.


==================================================
12. GRID VIEW
==================================================

Use the strongest parts of the user-provided card-grid screenshot.

Each token card:

token icon
symbol
name
market cap / primary metric
pair
pair category if real
volume
24h move
sparkline.

Do not add giant decorative pair logos that obscure real information.

Keep it dense and tradable.


==================================================
13. SEARCH
==================================================

Make sidebar search feel intentional.

On click / keyboard shortcut:

open command palette.

Search real:

name
symbol
contract
creator.

Results show:

icon
token
symbol
pair
lifecycle.

Arrow-key accessible.

Enter opens token.

No demo markets.


==================================================
14. METRIC STRIP
==================================================

Token detail should prominently expose:

Market cap
Holders
Trades
Supply
Creator earned

where real.

Secondary analytics:

Liquidity
Volume 24h
Lifetime volume
Trades 24h.

Do not show metrics without a real source.

Use tooltip definitions for ambiguous metrics.


==================================================
15. ABOUT + CONTRACT INFORMATION
==================================================

Below metrics show compact:

Token
Curve
Launched
Graduated

with:

copy
MonadVision/explorer link.

About:
real description.

Social icons:
only when URL exists.


==================================================
16. TRADES TABLE
==================================================

Build a polished dense table.

Columns:

Side
Trader
Quote
Token
Price
Venue
Age.

Color semantics:

Buy
green

Sell
red/orange.

Address:

short address
copy
explorer.

Hover row.

Pagination/infinite load.

Responsive mobile row version.


==================================================
17. HOLDERS TABLE
==================================================

This must be a real list, not just:

"Holders: 27."

Show:

rank
wallet
balance
% supply
classification.

Label:

Creator
Curve
Liquidity Lock
Protocol

where functional data supplies classification.

Normal wallet:
short address.

Copy/explorer controls.

Do not invent wallet nicknames.


==================================================
18. PROTOCOL TAB
==================================================

Make protocol transparency attractive.

Group:

Launch

Token
Curve
Factory
Coordinator

Economics

Quote
Curve fee
Creator fee
Policy

Graduation

Venue
Phase
Kuru market
Vault
Liquidity lock

Verification

network
source
explorer.

Use address chips, status icons and tooltips.

This is a differentiator, not an ugly debugging panel.


==================================================
19. ORDERS TAB
==================================================

For Kuru graduated tokens add:

Open
Filled
Cancelled

if the functional layer supplies them.

Rows:

side
limit price
size
filled
status
created
order ID
Cancel.

Do not show fake history.


==================================================
20. EARN + PORTFOLIO
==================================================

Combine into one polished finance hub.

Visual structure inspired by the user's Bags screenshot, but use
RetroPick semantics.

Hero:

Available to claim
<real amount>

[ Claim all ]


Breakdown cards:

Creator fees
Referral earnings
Buyback / vested earnings
Other REAL protocol earnings.


If referral payouts are not funded:

show analytics separately, NOT:

"$0 claimable"

as if a claim contract exists.


Below:

Wallet assets

Kuru margin

Created launches

Open orders

Claim history.


==================================================
21. REFERRAL UX
==================================================

If the functional branch has referral attribution:

Referral section:

Your referral link

[ retropick.../r/ABC123 ] [Copy]

Referred wallets

Referral trading volume

Referral earnings:
ONLY if real.

Explain simply.

Do not expose implementation complexity.


==================================================
22. FUND / CASH OUT
==================================================

Render provider-driven capabilities only.

Possible actions:

Fund wallet

Send

Cash out.


If MoonPay/provider is qualified:

open the provider widget.

If unsupported:

do not show a misleading active CTA.

Use capability flags supplied by functional layer.


==================================================
23. SEND
==================================================

Design:

Send

Asset
Network: Monad
Recipient
Amount

Review

Network warning.

Do not use logos of:

Coinbase
Binance
Solana
Robinhood

to imply those are native destinations unless functionality actually
supports that network/account type.


==================================================
24. CREATE-LAUNCH WIZARD
==================================================

Polish the real create flow.

Do not add fake fields.

Suggested sections:

Token

name
symbol
image
description
socials

Market

quote asset
graduation venue
launch profile/config

Economics

creator fee
fee recipient
buyback

Review

supply
curve
graduation threshold
launch fee
creator economics
venue.

Right-side live preview may remain.

Make unsupported option states visually clear.


==================================================
25. LOADING UX
==================================================

DELETE the current experience of an entire blank page with:

Loading launch...
Reading the RetroPick V2 contracts on Monad Testnet.

Use progressive rendering.

If indexed shell exists:

render immediately.

Skeleton only:

fields not yet hydrated.

Show tiny status if necessary:

Syncing onchain state…

Do not block the whole interface.


==================================================
26. ERROR UX
==================================================

Errors need location and action.

Examples:

Indexer delayed
→ small freshness warning

RPC revalidation failed
→ visible data stays, Retry

Wrong network
→ Switch to Monad

Insufficient margin
→ Deposit

Slippage
→ Refresh quote

Wallet rejected
→ neutral state, no scary red screen.


==================================================
27. RESPONSIVE DESIGN
==================================================

Desktop:

chart + sticky ticket.

Tablet:

chart then ticket or narrower split.

Mobile:

token identity
price
chart
metrics
tabs

Trading via:

sticky bottom Trade button
→ bottom sheet

or compact inline panel if testing proves better.

Do not squeeze the desktop trade ticket into 320px and call it mobile.


==================================================
28. ACCESSIBILITY
==================================================

Keyboard navigation.

Visible focus.

ARIA for segmented controls.

Do not communicate Buy/Sell only with color.

Tables usable with screen readers.

Touch targets >= sensible mobile size.

Respect reduced-motion.


==================================================
29. DARK/LIGHT
==================================================

The reference uses strong dark trading UI.

RetroPick already supports theme.

Both themes must work.

Do not make dark mode a simple inversion.

Charts:

theme-aware grid
axis
tooltip
crosshair
volume colors.


==================================================
30. MICRO-INTERACTIONS
==================================================

Use motion sparingly.

Useful:

tab transitions
hover states
order success
copied-address feedback
chart mode transition
new trade highlight
graduation transition.

Avoid:

continuous floating blobs
large parallax
slow page entrances
AI-template animation clutter.


==================================================
31. PERFORMANCE GUARD
==================================================

Design must NOT undo Codex performance work.

No:

giant animation libraries
multiple chart libraries
unnecessary image requests
layout shift
blocking fonts
N+1 API calls from components.

Frontend components consume already-prepared view models.

Never call contracts directly from decorative UI components.


==================================================
32. FUNCTIONAL BOUNDARY — NON-NEGOTIABLE
==================================================

Kimi MUST NOT modify:

contracts/src/v2 economics

deployed addresses

ABI truth

SDK transaction semantics

security write allowlist

indexer financial definitions

referral accounting policy

Kuru precision math.

If the UI needs different data:

document required field/interface.

Do not invent it locally.


==================================================
33. DO NOT COPY COMPETITOR BUGS
==================================================

Pons/Bags are references, not requirements.

For example:

Pons may show:
ETH

RetroPick must show:
MON or actual quote.

Pons may have:
30-day limit expiration.

RetroPick must show:
actual Kuru order semantics.

Bags may have:
1% creator royalties.

RetroPick must show:
actual RetroPick creator fee.

Competitor visuals NEVER override protocol truth.


==================================================
34. VISUAL QA
==================================================

Use gstack / Playwright.

Capture:

desktop 1440
desktop 1280
tablet
mobile 390.

Routes:

launchpad discovery
create
ACTIVE token
GRADUATION_READY
GRADUATING
GRADUATED Kuru token
Earn/Portfolio
search
wallet states.

Compare screenshots manually/visually.

Check:

overflow
clipping
sticky behavior
charts
tables
wallet modal
trade panel
light/dark.


==================================================
35. INTERACTION QA
==================================================

Test real interactions without changing contract semantics:

search
filters
pair dropdown
table/grid
open token
chart Line
chart Candles
timeframes
Market/Limit
Buy/Sell
percentage buttons
slippage
connect
network switch
order preview
holders
trades
protocol
orders
referral copy
claim surfaces.


==================================================
36. ZERO AI-SLOP GATE
==================================================

Reject:

generic gradient hero cards
oversized headings everywhere
random glassmorphism
excessive pill components
gratuitous emojis
meaningless illustrations
fake metrics
empty whitespace
dashboard-within-dashboard nesting.

The product should look like a serious crypto-native launch/trading
terminal with personality.


==================================================
37. FINAL ACCEPTANCE
==================================================

A new user should understand within 5 seconds:

what token this is
what it trades against
current price
market state
where to buy/sell
whether it has graduated.

A trader should be able to:

open token
read chart
switch Line/Candles
choose Market/Limit
choose Buy/Sell
enter amount
understand result
trade.

A researcher should be able to:

inspect trades
holders
protocol
contracts
graduation state.

A creator should be able to:

launch
see fees
see earnings
claim real earnings
share referral link if available.

Mobile must feel native rather than compressed desktop.


==================================================
38. FINAL REPORT
==================================================

Report:

BASE SHA
FINAL SHA

ROUTES REDESIGNED

COMPONENTS CREATED

COMPONENTS REMOVED

NEW DEPENDENCIES
+ justification

LINE CHART:
PASS / FAIL

CANDLES:
PASS / FAIL

MARKET UX:
PASS / FAIL

LIMIT UX:
PASS / FAIL

DISCOVERY:
PASS / FAIL

SEARCH:
PASS / FAIL

HOLDERS:
PASS / FAIL

TRADES:
PASS / FAIL

PROTOCOL:
PASS / FAIL

ORDERS:
PASS / FAIL

EARN/PORTFOLIO:
PASS / FAIL

CREATE:
PASS / FAIL

DESKTOP:
PASS / FAIL

MOBILE:
PASS / FAIL

LIGHT:
PASS / FAIL

DARK:
PASS / FAIL

ACCESSIBILITY:
PASS / FAIL

CONSOLE ERRORS:
0 REQUIRED

FINANCIAL LOGIC MODIFIED:
NO REQUIRED

SOLIDITY MODIFIED:
NO REQUIRED.

# END ORIGINAL CAMPAIGN — VERBATIM AND UNABRIDGED

---

# POST-CAMPAIGN EXECUTION CHECKLIST (ADDITIVE)

Once the full 38-section implementation has been completed as far as authorized and technically supported, verify that the final response includes, for **each of the original 38 numbered sections**, an explicit implementation/test status with the actual file(s), route(s), and browser evidence where applicable. Do not use a single "all completed" assertion.

For every section with unavailable backend capabilities, show the exact missing data or API dependency, its frontend treatment (disabled/omitted/labelled), and the Playwright test confirming the UI does not mislead users.

Maintain a stable repeatable Playwright entry point in the repo, documented for future Kiro sessions. Show the exact invocation successfully executed. If this is a direct Playwright Test workflow rather than a Kiro-native recipe, name it accurately and do not claim `/workflow run ...` was validated.

The final report must identify the cleanly attributable edits made during this session, avoid conflating earlier dirty changes with your own, and never claim remote staging testing unless a remote deployment was actually opened.

**Execute; do not shorten the original campaign; do not invent evidence.**
