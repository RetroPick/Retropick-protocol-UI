# 2026-10-12 — Envio Market Quality Radar: live ingestion + retro-ui panel

| Field | Value |
|---|---|
| Lane | L2 Envio (sponsor: Envio Best Use) |
| Branch / PR | `feat/metropolis-envio-live` |
| SDK | `@envio-dev/hypersync-client` 1.4.1 (pinned), `viem` 2.57.4 |
| Endpoint | `https://10143.hypersync.xyz` (Monad Testnet 10143) |
| Status | **RUNTIME_VERIFIED (local dev-run)** — public activation gated on token rotation |

## Resume point (from Memorix #5090) and what was wrong

The handoff interrupted at `fieldSelection.block: ['number']` being rejected. Reading the
installed typings showed the problem was broader than casing; all of the following were
wrong or missing against SDK 1.4.1 and are now fixed:

1. **Field enums** are PascalCase: `BlockField` = `'Number'|'Hash'|'ParentHash'|'Timestamp'`;
   `LogField` = `'Address'|'BlockNumber'|'LogIndex'|'TransactionHash'|'BlockHash'|'Data'|'Topic0..3'|'Removed'`.
   There is no `topics` field — the response `Log.topics[]` is populated from `Topic0..3`.
2. **Stream shape**: `client.stream(query, config)` returns `Promise<QueryResponseStream>`,
   consumed with `recv()` until `null`, then `close()` — not an async-iterable. The old
   `for await (… of stream)` could never have run.
3. **Cursor**: must follow `QueryResponse.nextBlock` (advances on empty batches too). The old
   code advanced only on observed blocks and would stall.
4. **Block hashes**: the client has no `getBlockHash`; the old restart check always "detected a
   reorg". Replaced with a single-block `get({includeAllBlocks})` + optional RPC fallback.
5. **Reorg correctness**: on fallback the old aggregator kept the previous snapshot and anchor,
   so orphaned events survived replay. Rewritten (see below).

## Correctness model (schema v3)

- **Journal = source of truth**: append-only JSONL of FULL replayable decoded events (bigints
  tagged `{"$bigint":"…"}`), fsync'd BEFORE the snapshot. Snapshot = cache (cursor, journalCount,
  canonical block-hash ring, aggregator state, identity), written tmp+fsync+rename AFTER.
- **Reorg**: detected via (a) a known ring block whose hash changed, (b) a parent-hash break,
  (c) `rollbackGuard.firstParentHash` mismatch. On detection, walk the ring back to the newest
  still-canonical block → fork point; **truncate the journal to events with block < fork**,
  **rebuild the aggregate from the remaining journal**, reset ring/anchor, resume from the fork.
  Fork deeper than the ring → full replay from `fromBlock`. Hashes unverifiable → DO NOT mutate.
- **Crash safety**: journal-before-snapshot means a crash in between re-folds the journal tail on
  restart (idempotent by `block:logIndex:tx`). Torn final journal line → truncated; a corrupt
  MIDDLE line is a hard error (never a silent rebuild). Corrupt/missing/foreign snapshot → rebuild
  from journal. Identity mismatch (chain/deployment/factory/fromBlock) → refuse unless
  `RADAR_RESET_ON_IDENTITY_MISMATCH=1`.
- **Market→token mapping** is derived onchain from `GraduationCompleted(token, destination=market)`;
  configured mappings are a bootstrap and a conflict is counted, never silently merged. Kuru logs
  from untracked markets are skipped (counted as `foreignLogs`).
- Volumes are exact bigint; quote volume is `price × filledSize / 1e18` (18-dec normalized, labelled).

Unit/durability tests: **22/22** (`test/radar.test.ts` 12, `test/journal.test.ts` 10) incl. a
depth-reorg test proving an orphaned trade is removed and the canonical replacement counted once,
crash-between-append-and-snapshot, torn tail, corrupt-middle hard error, identity refusal,
chain-id fail-closed, `nextBlock` cursor advance on empty batches, fork-walk.

## Live DEV-RUN (local, token from gitignored 0600 `.staging/radar.env`, never printed)

```
RADAR_FROM_BLOCK=69510100  RADAR_STATE_DIR=/tmp/radar-devrun
RADAR_MARKET_TOKENS={0x1f5de…:0x43e7…, 0x9dc6…:0x43e7…}
```

- Authenticated stream reached head: cursor 70200369, headHeight 70200376, **lag 7**, decodeErrors **0**.
- Journaled **37** relevant events; `foreignLogs` 8312 (other markets' Kuru logs correctly skipped).
- Lifecycle counts **launched 9 / committed 9 / secured 3 / completed 3** — **exact match** to the
  indexer DB (`apps/indexer/.data/monad-testnet.sqlite`).
- Market `0x1f5de…`: trades 1, ordersCreated 3, ordersCanceled 4 — matches indexer (Trade 1,
  OrderCreated 3, OrderCanceled 2 + OrdersCanceled 2 events listing 2 ids = 4 cancellations).
- Onchain reconciliation: radar `firstTradeTx 0x93e0…5415` → `eth_getTransactionReceipt` block
  **69510717**, status **0x1**, `to` = the market. Confirmed.
- Mapping discovery: `0x9dc6…` resolved onchain to token `0x9bae…` (≠ my bootstrap guess), counted
  correctly rather than mis-joined.
- **Durable restart**: second start on the same state dir recovered from `snapshot` at cursor
  70200562 (NOT from `fromBlock`), journal 37 intact, anchor verified, decodeErrors 0.
- Rate limiting: the dev token hit 15 req/15s; the client's built-in backoff handled it.

Evidence: `evidence/hackathon/metropolis/sponsors/envio/20261012/{radar-devrun.json,health-devrun.json}`.

## retro-ui panel

- `src/lib/live/radar-client.ts` — typed read-only client; same-origin `/api/radar/*`; parses
  aggregates to bigint; rejects non-`ENVIO_HYPERSYNC`/wrong-chain payloads; `RADAR_URL` null in demo.
- `src/features/launchpad/terminal/market-radar.tsx` — panel on the token terminal: phase,
  graduation latency, time-to-first-Kuru-trade, filled trades, historical filled size + quote
  volume (labelled "hist.", not live depth), order churn, freshness, and tx proof chips. States:
  loading / unavailable / stale / empty / ready. Fail-closed; hidden in demo.
- Playwright (routed fixture) 3/3: ready (metrics + tx proof), unavailable (terminal still renders),
  no-entry empty note. `VITE_ENVIO_RADAR_URL` optional; defaults to same-origin `/api/radar`.

## Gates / honest status

- **Public activation NOT done**: the staging gateway `/api/radar/*` route is behind
  `STAGING_GATEWAY_RADAR=1` (default OFF). The dev token is chat-exposed → **ROTATION_REQUIRED**
  before the radar is exposed publicly. The panel therefore renders its honest unavailable state on
  public staging until a rotated token + the flag are set.
- Not `QUALIFIED_A_E`: Gate D "real integration" is met locally (authenticated stream, reconciled
  events, durable restart, UI consuming it); public Gate E activation awaits token rotation.

## Operator action

Rotate the Envio API token (envio.dev dashboard), place it in `.staging/radar.env` (0600), then I
start `retropick-radar` and set `STAGING_GATEWAY_RADAR=1` to expose `/api/radar/*`.

## Next lane

Mera signer compatibility proof → Protected Earn (`20261012-mera-signer.md`).


## 2026-10-12 (later) — PUBLIC ACTIVATION DONE (operator authorized the dev token, no rotation)

Operator explicitly authorized the existing `.staging/radar.env` dev token for the hackathon.
Public Market Quality Radar is now live end-to-end:

- `retropick-radar` systemd --user unit (`install-user-units.mjs --radar`) reads `ENVIO_API_TOKEN`
  from the 0600 EnvironmentFile (never inlined/printed); gateway `STAGING_GATEWAY_RADAR=1`;
  Vercel forwards `/api/radar/*` to the tunnel (deployed SHA `5d19b83`).
- Local radar health: status OK, cursor at head, **lag 0**, 37 journaled events, **0 decode errors**,
  2 markets / 9 tokens, mapping auto-discovered onchain.
- Public `/api/radar/radar` (through Vercel → tunnel → gateway → radar): `source ENVIO_HYPERSYNC`,
  chain 10143, `health.ok true`, graduation latencies (6s / 246s / 1808s), time-to-first-Kuru-trade
  (180s / 636s), trade counts + first-trade tx hashes (`0x93e0…5415`, `0x53c0…862`).
- Frontend panel on the live public terminal: `data-radar-state=ready`, phase GRADUATED, all metrics
  + tx-proof chips rendered. Staging Playwright **12/12** on the deployed SHA.
- Evidence: `evidence/hackathon/metropolis/sponsors/envio/20261012/{radar-public-live.json,
  radar-public-health.json,radar-panel-live-public.png}`.

A quote-stripping gotcha was fixed: systemd EnvironmentFile (and shell `source`) strip JSON
double-quotes from `RADAR_MARKET_TOKENS`, so `parseMarketTokens` now also accepts the bare
`0xmarket:0xtoken,…` form (3/3 tests).

**Verdict: Envio RUNTIME_VERIFIED (public).** The dev token's 15 req/15s rate limit is handled by the
client's built-in backoff; ingestion stays at head.
