# @retropick/envio-market-radar

Envio HyperSync-powered Market Quality Radar for RetroPick (Monad Testnet, chain 10143).
Streams launch-lifecycle events (TokenLaunched / LaunchCommitted / GraduationSecured /
GraduationCompleted) and Kuru orderbook events (OrderCreated / OrderCanceled /
OrdersCanceled / Trade) from Envio's HyperSync endpoint and serves exact-integer
aggregates: lifecycle counts, active-on-curve, per-token graduation latency, per-market
trade counts / filled volume / order churn / staleness.

Standalone package (NOT a pnpm workspace member, by design): installing it never
triggers a root-wide workspace install, so nothing can write into `apps/web`.

## Status: BLOCKED_EXTERNAL for live data (verified 2026-10-11)

- `envio` CLI 3.14.0 works via npx; Docker 29.8.2 available.
- `@envio-dev/hypersync-client` 1.4.1 installs, but **constructing the client requires
  `apiToken`** (`Missing field apiToken`) and `https://10143.hypersync.xyz` answers
  HTTP 401 to anonymous requests — Envio's endpoint policy is token-gated.
- No `ENVIO_API_TOKEN` exists in this environment. Live streaming + the retro-ui
  consumption panel are therefore **not claimed as working**.

## What IS done and verified

- Pure aggregation core (`src/radar.ts`): 8/8 unit tests — lifecycle latency math,
  duplicate-delivery idempotence, exact-bigint Kuru volume (18-dec normalized), out-of-order
  tolerance, market→token mapping, staleness semantics, bigint-safe wire format.
- Stream + server wired to the real client API (token-gated, fail-closed exit code 2
  with a pointer to EXTERNAL-BLOCKERS when the token is absent).

## To go live (operator, ~15 min once a token exists)

1. Create an Envio API token (envio.dev dashboard).
2. `cd integrations/envio-market-radar && npm install`
3. `ENVIO_API_TOKEN=… npm start` (port 8791; `RADAR_MARKET_TOKENS='{"0x1f5de…":"0x43e7…"}'`
   to join markets to tokens).
4. retro-ui consumption panel behind `VITE_ENVIO_RADAR_URL` (next action — small fetch
   adapter + Earn/Launchpad panel; fail-closed to the existing indexer).

## Anti-goals honored

Does not replace the existing indexer; orderbook depth/spread for trading decisions
still comes from direct verified on-chain reads (Stage 1 depth panel), never from past
trade logs.
