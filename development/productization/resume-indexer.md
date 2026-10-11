# Resumed indexer qualification

Baseline: integrated main `f643cb62`. Scope: `apps/indexer/**`; no contracts, broadcasts, Git state changes or unrelated processes changed. Runtime: Monad Testnet 10143 read-only HTTP service at `127.0.0.1:8787`, PID 176876, database `apps/indexer/.data/monad-testnet.sqlite`. Existing owner PID 106536 was verified against its database lock before replacement. All replacements preserved the database; private SQLite backups are recorded in evidence. Current lock owner is verified and `PRAGMA integrity_check` passes. All 512 original journal identities remain; current journal has 523 events at capture (before final envelope recovery).

## Changes and why

Provider URLs expose only host/port. Paths, query strings, basic authentication and fragments never enter diagnostics. Provider-controlled gateway bodies, nested error text and request payloads are replaced by fixed failure classes in pool health, thrown pool failures and sync progress. Single-endpoint and CLI sync now use the same pool; CLI acquires the same exclusive database lock as the HTTP service. A second writer, including one in the same process, is rejected.

AUTH 401/403 and a valid response for a different chain are permanent failures. Rate limits, server/internal errors, network faults and timeouts open a recoverable circuit. Malformed or null chain responses are transient; they cannot permanently declare the configured Infura endpoint to be on a wrong chain. Explicit startup probes and concurrent requests share an in-flight probe. An uncorrelated JSON-RPC batch error is classified before viem can turn it into an undefined result. Every response row must also have JSON-RPC2.0, an ID, and either result or error. A copied-database reproduction proved occasional Infura HTTP200 arrays with no ID/result/error; envelope validation makes these transient NETWORK failures before discovery reads can consume undefined values.

Head reads compare usable providers and report the largest observed head. A provider more than 16 blocks behind that head opens a network circuit. This bounds hidden stale-head behavior for this testnet candidate; it is not a production finality policy. A null historical block fails over to another provider while retaining the journal. This resolved the observed missing-checkpoint stall without database reset or speculative rollback. Genuine reorg rollback/replay remains checkpoint-hash based.

Log RANGE failures recursively split the requested block interval until accepted or a single-block failure is reached. A failed range or in-flight reorg cannot partially publish a concurrent batch. Successful ranges remain contiguous and ordered. Token trades/orders accept optional `transactionHash=0x<64 hex>` before pagination; invalid hashes return 400, and cursor identity includes the filter.

## Verification

- `pnpm --filter @retropick/indexer test`: 42 passed, zero failures.
- `pnpm --filter @retropick/indexer typecheck`: passed.
- Existing regression coverage: exact integers, idempotent journal replay, rollback/replacement, in-flight reorg, failed parallel range atomicity, progressive catch-up, query cursor expiry and schema upgrade refusal.
- Added focused coverage: arbitrary credential alphabets/userinfo/path/query/fragment and nested errors; permanent401/403/wrong-chain; concurrent probe deduplication; transient429/5xx/timeout recovery; actual aborted slow primary with healthy fallback; stale head selection; null historical-block failover; malformed chain response; uncorrelated batch rate errors; recursive log splitting; transaction-hash filtering beyond the first100 records; same-process second-writer refusal.
- Live `/health`, discovery, next cursor page, detail, pairs, search, referral activity, trades, holders, candles, orders and all wallet assets/orders/claims/buybacks endpoints returned200. Invalid limit/cursor returned400. Live conditional ETag returned304. Wallet responses carry `no-store` and no ETag. ETags include freshness and correctly return200 when head/sync/snapshot changed.
- Final health capture: v2 schema ready, indexed69897512, observed head69897520, beneficiary69897512, sync idle, error null, four successful passes. Lag8 equals the configured confirmation depth. Public Monad fallback was healthy with zero failures; Infura was correctly circuit-open NETWORK after malformed envelopes, with verified10143 identity. Freshness is exposed, so lag is not presented as an empty or current wallet.

## Financial projection conclusions for Goal45 sections11–13 and22–25

Prices and executed volumes use fee-excluded execution quote amounts with exact integers and explicit6/18-decimal normalization. Curve settlement and execution remain separate. Candles use UTC buckets and preserve real gaps; missing execution history remains unavailable. A graduated Kuru launch uses its last actual execution for price, never seeded reserves as a mature market price. No USD valuation is inferred for test MON. Monetary discovery rankings group by quote asset.

GTC order projections distinguish resting order creation, partial fills, full fills, skipped IDs and cancellation without double debit. Holders derive from transfers, exclude zero balances and label protocol custody. Wallet asset rows are discovery candidates, not balance authority. Claim history records historical completed claims; current escrow/vault releasable balances and order status must be checked against chain before economic writes. Buyback recipient discovery does not authorize release or invent releasable amounts. Referral activity includes launch/Curve execution/Kuru taker execution; deposits, resting orders and maker fills do not independently qualify.

## Evidence and handoff

Artifacts: `evidence/launchpad/productization/resume/indexer/` contains test/typecheck output, runtime restart records, DB preservation/integrity, health, endpoint and ETag smoke. Root owns current-source Infura promotion eligibility and frontend browser qualification; successful runtime recovery is not a claim that rate-limit/provider-production qualification is complete. Live reorg fault injection, a fresh full historical rebuild, and production gate promotion were not performed in this task. No mainnet authorization is implied.

## Operational provider demotion

Root approved demotion after the official Infura path failed strict SDK batch/multicall qualification despite successful individual probes. Server-private root `.env.local` now selects the qualified public Monad endpoint for both `MONAD_TESTNET_RPC_URL` and `MONAD_TESTNET_RPC_URLS`; Infura is preserved only in `MONAD_TESTNET_INFURA_PROBE_URL` for explicit qualification probes. The file remains mode0600, and its original contents were backed up privately. Verified owner153232 was replaced by176876 on8787 with the same preserved SQLite DB. `public-only-runtime.json` and `health-public-only.json` record this later state; earlier health captures describe intermediate qualification, not the final operational pool. No unqualified Infura path is promoted by default runtime reads.
