# Liquidity projection-3 migration runbook

Status: executable plan; live cutover is `BLOCKED_APPROVAL`.

## Preconditions

1. Confirm the indexer owner, deployment environment and maintenance window.
2. Record disk free space and require at least three times the database size.
3. Stop indexer writes gracefully with `SIGTERM`; verify no process holds the DB or writer lock.
4. Record `PRAGMA integrity_check`, `journal_mode`, projection version, indexed block/hash and every checkpoint stage.
5. Create a SQLite-backup-API copy outside the data directory, then SHA-256 and verify the copy.

## Offline qualification

Run `apps/indexer/scripts/liquidity-full-catchup.mjs` against the backup with an explicit target and bounded pass size. Require:

- every discovered vault cursor reaches target;
- no negative reconstructed balance;
- reconstructed nonzero-address balance sum equals each vault's observed `totalSupply`;
- projection-2 snapshot remains preserved;
- no HTTP service was started by the operator.

Representative database qualification completed all three source pools at block `69,723,600` with exact supply reconciliation.

## Cutover sequence

1. Stop public traffic to the indexer and preserve the projection-2 service/database snapshot.
2. Restore or attach the qualified offline copy per the deployment owner's chosen rollback topology.
3. Run one normal indexer sync. It reconciles every persisted vault stage, scans missing root/dynamic/beneficiary/vault ranges, and publishes projection 3 only after the common target header and share reconciliation checks pass.
4. Observe `/health` until `projection.published === 3`, `ready === true`, and freshness lag returns to normal.
5. Verify V2 base routes and new liquidity routes. History/wallet LP routes must remain `503` until their stage cursors are complete.
6. Restore traffic.

## Failure and rollback

- RPC/range failure: no partial checkpoint advances. Retry the same operator target.
- Reorg: stage reconciliation rolls back orphaned checkpoints/events and increments the revision; rerun from durable cursors.
- Supply mismatch: publication fails and prior snapshot remains. Preserve the database and report the exact vault/event boundary.
- Post-cutover failure: stop traffic, detach projection 3, and restore the verified projection-2 backup/service snapshot. Immutable contract state is unaffected.

## Monitoring and alerts

Alert on projection version, stale indexed block/lag, any per-vault cursor whose progress stalls for two consecutive passes, supply reconciliation failure, provider circuit-open rate, HTTP 5xx/503 rate, disk use, DB lock errors and snapshot reorg revisions. Log provider host/classification only; never log credentials or raw gateway bodies.

## Explicit non-authorization

This runbook does not authorize live migration, deployment, main merge, mainnet action, passive-LP writes or advanced maker selectors.
