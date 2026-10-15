---
name: retropick-event-indexing
description: Change RetroPick event discovery, journal replay, projections, pagination or liquidity history without losing historical or reorg correctness.
---

Read AGENT_GUIDE.md, the indexer role and development/launchpad/testing/INDEXER.md. Keep the existing journal as evidence and chain as economic authority.

New dynamic emitters need a historical cursor; adding an address to an already-advanced scanner misses history. For graduated vaults include the graduation block because mint/deposit precedes completion in that transaction. Qualify emitters from Coordinator identity; normalize ABI argument-name differences explicitly.

Use canonical chain/blockHash/transactionHash/logIndex identity, deterministic ordering and transactional checkpoints. Replay LP Transfer for shares; deposit/withdraw events supply history, not a second share balance delta. Test existing-DB backfill, duplication, same-block discovery, rollback, schema migration, cursor expiry and incomplete history. Never return incomplete wallet history as a complete zero position.
