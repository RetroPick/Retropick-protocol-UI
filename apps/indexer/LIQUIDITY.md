# Liquidity read model (projection 3)

This indexer is an event-derived display service, never economic authority. All routes are GET-only. Financial amounts use exact atomic-unit decimal strings. Pool reserves remain separate base and quote values; they are neither USD TVL nor an execution guarantee.

## API

All endpoints return the existing `IndexEnvelope` with chain/block/hash/freshness metadata. Existing `limit` and snapshot-bound `cursor` rules apply to collection routes.

- `/v1/liquidity/pools`: qualified graduated Kuru pool discovery; optional `q` search.
- `/v1/liquidity/pools/:token`: pool assets, share supply, custody, and historical completeness.
- `/v1/liquidity/pools/:token/events`: deposits, withdrawals, and share transfers; optional exact `transactionHash` filter.
- `/v1/wallets/:wallet/lp-positions`: positive event-derived LP share balances, with wallet/protected/infrastructure roles. Wallet responses remain `Cache-Control: no-store` without ETags.

A pool with `status: UNAVAILABLE` has unavailable asset reads, not zero reserves. Custody values remain null until known. Events and wallet positions return `503 LIQUIDITY_HISTORY_SYNCING` until their required historical scans have reached the snapshot block. Pending pools remain discoverable. A wallet response requires all discovered pools to be complete, preventing silently omitted positions.

## Upgrade and reconstruction

No destructive SQL migration is required. The journal is preserved. Each vault has an independent checkpoint stage `vault:3:<lowercase-address>` beginning inclusively at its graduation block. Existing `dynamic` checkpoints cannot skip past the seed deposit or mint. Each pass scans at most the configured `INDEXER_MAX_BLOCKS_PER_PASS` blocks per vault; later passes continue from durable checkpoints.

Projection-2 base routes continue serving their published snapshot while projection 3 builds; new liquidity routes return `503 INDEX_SCHEMA_UPGRADING` until the new snapshot is published. Projection-1 snapshots remain rejected because their price units are incompatible. `/health` is ready only for the current projection version.

Discovery uses SDK Coordinator/receipt/ledger/market/vault/lock/environment qualification at the exact snapshot block. A qualification failure leaves the pool unavailable and its history incomplete. Vault ABI decoding is emitter-specific and normalizes `Transfer.amount` into `value`. Only share transfers alter LP balances: deposit/withdraw events supply history metadata, avoiding double accounting. The pinned Kuru bootstrap shares belong to MarginAccount and are classified separately from the protocol LP lock.

Completed share histories must have no negative balances and must reconcile to live share supply when that supply is available. A mismatch blocks snapshot publication. All vault checkpoints participate in normal chain reconciliation; rollback deletes orphaned logs and snapshots, and a revision guard prevents publication across an in-flight reorg.

## Verification

`npm --prefix apps/indexer run typecheck`

`npm --prefix apps/indexer test`

The liquidity regression suite covers mint/transfer/burn reconstruction, infrastructure custody, duplicates, supply conservation, substituted emitters, existing-cursor backfill, rollback/replay, API completeness gates, wallet isolation, cursor expiry, and schema compatibility. Live RPC qualification is a separate environment-dependent check and is not implied by unit test results.
