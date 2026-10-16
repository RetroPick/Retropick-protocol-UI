# Replay and reorg evidence

The 55-test indexer qualification includes the historical replay failure modes:

- journal replay idempotency and exact BigInt preservation;
- duplicate event suppression;
- persisted-cursor resume after interruption;
- failed range without checkpoint advance;
- inclusive graduation-block replay despite an already advanced dynamic cursor;
- unexpected emitter rejection without checkpoint advance;
- rollback clearing orphaned vault events/checkpoints and permitting replacement;
- failed supply reconciliation preserving the prior published snapshot;
- at-head reorg between financial reads and final header preserving the old snapshot;
- snapshot-bound cursor expiry across reorg revision.

The live offline replay additionally exercised public-RPC retry/resume behavior across interruptions and completed all three representative vaults. Echidna/Manticore and production gateway fault injection are not part of this evidence.
