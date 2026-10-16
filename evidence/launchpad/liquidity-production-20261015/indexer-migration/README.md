# Indexer liquidity migration evidence — 2026-10-15

Working branch: `codex/v2-production-liquidity`, baseline `e1c578535e3451de5c1792cd0a2b48d922e787c8`.

Commands executed from the isolated worktree:

```sh
npm --prefix apps/indexer run typecheck
npm --prefix apps/indexer test
node --experimental-strip-types apps/indexer/scripts/liquidity-migration-smoke.mjs apps/indexer/.data/liquidity-migration-smoke.sqlite
```

Typecheck exited 0. Full unit suite exited 0: **54 tests passed, 0 failed, 0 skipped**, including 9 new liquidity regressions. See `unit-tests.log`.

Migration smoke exited 0 against an **offline SQLite copy** made by the root agent using SQLite backup, retaining projection 2 at block **70648102**, root cursor **70648150**, and dynamic cursor **70648102**. The smoke preserved those cursors and the published snapshot. It made only public Monad Testnet reads through the existing throttled provider pool; no transaction was broadcast and no source database or live service was modified.

All three graduated pools passed the qualified SDK identity/environment reads at the copied snapshot block. Independent `vault:3:<address>` cursors each scanned exactly the first **200 historical blocks**, including the graduation block. Each recovered **5 vault events**, the seed deposit, and an initial **1000-share mint to the pinned MarginAccount** despite the old dynamic cursor having passed those blocks. See `migration-smoke.log` for token/vault/block identities.

This proves incremental migration starts from the correct historical boundary. **Full historical catch-up remains pending**: all three pools intentionally report `historyComplete: false`, and history/LP API routes must remain gated until catch-up completes. No production readiness or release gate is promoted by this evidence. Reproduce against a newly created offline backup; later runs on the same smoke copy continue from its advanced vault cursors.

Independent review identified a target-header provenance gap on at-head passes with empty caches and no new logs. The implementation now anchors the target header before financial reads and verifies SDK block hashes against that anchor. A regression simulating H1 reads followed by an H2 reorg confirms the previous snapshot is retained. The final 54-test run includes this correction.
