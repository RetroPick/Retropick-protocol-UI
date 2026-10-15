# Indexer differential review — liquidity V3

## Executive summary

Reviewed the uncommitted indexer/read-model changes against baseline `e1c578535e3451de5c1792cd0a2b48d922e787c8` on `codex/v2-production-liquidity`. Recommendation: **approve the reviewed read-only integration**, with the production qualification limits below. This is not deployment, financial-write or mainnet approval.

| Severity | Open | Resolved during review |
|---|---:|---:|
| Critical | 0 | 0 |
| High | 0 | 0 |
| Medium | 0 | 1 |
| Low | 0 | 0 |

One concrete snapshot-provenance issue was identified and fixed by the implementation owner. The reviewer did not edit implementation files. No additional introduced correctness/security defects were identified in the reviewed paths. Confidence is high for the bounded replay/accounting/API analysis; full production readiness remains unqualified.

## Changes and scope

Eight files were reviewed: `apps/indexer/src/{sync,project,query,server,store}.ts`, `apps/indexer/test/{liquidity,store}.test.ts`, and `packages/launchpad-sdk/src/read-model.ts`. The SDK reader was treated as a qualified external read interface; its independent review belongs to the integration owner.

The change adds projection version 3, qualified per-launch vault discovery, versioned per-vault backfill, transfer-derived LP ownership, structured reserves, pool/history/wallet APIs, and V2 base-route compatibility. No signer, financial-write endpoint or contract mutation was added. The existing SQLite journal remains the persistence layer.

## Finding IDX-DR-001 — financial reads could be relabelled with a later fork hash

**Severity:** Medium. **Status:** resolved during this review. **Exploitability:** hard; requires a chain reorg or inconsistent RPC fork observations at a specific snapshot boundary. No wallet permissions or financial-write authority are involved.

Before the fix, `Indexer.liquidity()` discarded `readKuruLiquidity().blockHash`. On restart, already-at-head stages could do no new scan work, leaving the indexer's header cache empty. Stage reconciliation used fresh reads without populating that cache. If the SDK completed financial reads at hash H1 and a reorg occurred before the outer final-header check, that check could fetch H2 twice and publish H1 reserve values labelled H2. This violated the snapshot's common block/hash invariant.

The owner fixed this in `apps/indexer/src/sync.ts:207` by anchoring the target header before discovery and financial reads, and in `sync.ts:170` / `sync.ts:178` by comparing each SDK result with the anchor. The final comparison at `sync.ts:218` now compares the current header with that previously captured hash.

Independent reproduction used an in-memory Store, existing root/dynamic/beneficiary/vault checkpoints at the target, an empty header cache, the actual SDK liquidity reader, qualified mocked contract responses, and 1,000 infrastructure plus 10,000 locked shares. Both SDK headers returned H1; the chain switched to H2 immediately after the SDK completed. The fixed implementation produced:

```json
{"error":"RPC_OR_CHAIN_SYNC_FAILED","headerReads":8,"snapshotPublished":false,"cachedAnchor":"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","chainAfterCompletedSDK":"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}
```

The owner also added the regression at `apps/indexer/test/liquidity.test.ts:118`. It can be reproduced with this command from `apps/indexer`:

```bash
node --experimental-strip-types --test --test-name-pattern='at-head reorg' test/liquidity.test.ts
```

This command is the checked-in regression entry point; the reviewer's independent execution was the actual-SDK in-memory scenario described above. No whole-suite rerun was performed by the reviewer.

## Replay and accounting analysis

- `sync.ts:166` gives each vault its own versioned stage. `sync.ts:184` / `sync.ts:185` start inclusively at graduation block and progress independently of the historical dynamic cursor. This captures deposit/share logs emitted before `GraduationCompleted` within the same transaction/block.
- `sync.ts:204` reconciles every persisted stage, including vault stages. `Store.rollback()` deletes orphan events/checkpoints across stages, clears published snapshots and increments the reorg revision. In-flight scans and final snapshot publication retain revision guards.
- `sync.ts:61` uses the vault ABI for vault stages; `sync.ts:75` rejects unexpected emitters. Transfer quantities are normalized from ABI `amount` or `value`, preserving exact integer serialization.
- `project.ts:147` restricts LP history to discovered vault emitters and the inclusive graduation boundary. Only Transfer changes ownership; deposit/withdraw events supply asset/history data. This avoids double-counting minted or burned shares.
- `project.ts:155` rejects negative balances and, when supply is available, requires the sum of replayed nonzero-address balances to equal the observed total supply. The 1,000 bootstrap shares belong to MarginAccount, and `project.ts:158` classifies them as infrastructure separately from immutable lock holdings and wallets.
- Incomplete histories produce no LP positions and carry explicit progress. Read failures retain null/UNAVAILABLE fields instead of zero assets. Pool reserve summaries remain separate base/quote atomic amounts; compatibility `liquidityRaw` remains null rather than inventing TVL.

## API, compatibility and privacy analysis

`query.ts:71`–`query.ts:86` adds pool list/detail/history and wallet LP positions using the existing envelope and pagination machinery. List/detail can expose pending history honestly; history and wallet positions return `503 LIQUIDITY_HISTORY_SYNCING` until their required history is complete.

Existing limit/address/transaction-hash checks remain in place. Cursors bind the query path/parameters to projection version, reorg revision, indexed block and block hash; changing wallet/query or replay revision rejects reuse. Stable ordering and unique event/vault keys support pagination. Wallet routes retain `Cache-Control: no-store` and no ETag (`server.ts:27`); public pool routes use existing public-cache policy. These are public on-chain wallet records, not authenticated private account data.

`server.ts:23` allows V2 base responses during V3 migration while refusing new liquidity routes until V3 publication. V1/incompatible projections remain rejected. Wallet LP readiness is independent of unrelated beneficiary backfill (`server.ts:24`), while existing wallet resources preserve their beneficiary gate.

## Test coverage and blast radius

The nine new liquidity cases cover ownership normalization/deduplication, infrastructure classification, incomplete history, unexpected emitters, inclusive historical cursor migration, rollback/replay, supply reconciliation, snapshot preservation, cursor/wallet isolation, HTTP cache/upgrade behavior and the resolved reorg boundary.

Direct production call sites found by `rg`:

| Changed behavior | Direct call sites | Consequence |
|---|---:|---|
| `project()` | 1 | All indexed launch/trade/wallet/liquidity snapshots |
| `query()` | 1 | All read API responses |
| `scan()` | 5 | Root, dynamic, beneficiary and vault journal progress |
| `liquidity()` | 1 | Qualified pool hydration and historical scans |
| `Store.stages()` | 1 | Reorg reconciliation includes every persisted stage |

The implementation owner reported the suite/typecheck results separately. This review inspected those tests and ran focused independent fault injection; it does not claim an independently repeated full suite or a statement/branch coverage percentage.

## Historical context

Git blame confirms the journal/checkpoint primitives originated in `c23ed7159`; replay rollback, current snapshot boundaries and HTTP cache/wallet gates were present in `f643cb62c`. Provider-error sanitization was hardened in `4650e131a`. No existing read-only HTTP restriction, wallet privacy gate, journal atomicity or exact-integer serialization was removed. The revised V2 compatibility gate is deliberate and covered by the new HTTP migration test.

## Qualification limits and recommendations

- Complete the copied-database historical backfill, then compare rebuilt LP balances/supply and deterministic replay at one pinned block before claiming migration qualification. The owner's bounded first-200-block migration evidence is not a full history catch-up.
- Preserve explicit pending states and wallet 503 behavior throughout the rollout. A permanently unavailable pool deliberately prevents a complete cross-pool wallet-position claim.
- Qualify production gateway rate limits, load behavior, backup/restore and release monitoring separately. These were not demonstrated by this source review and are not newly claimed capabilities.
- Preserve the permanent lock and current write allowlist. Passive LP writes and advanced maker primitives remain outside this read-only change.

## Methodology and limitations

Applied the installed Trail of Bits differential-review skill with its methodology, adversarial and reporting guidance. The strategy was a deep review of this small changed subsystem: baseline comparison, targeted Git blame, one-hop callers, event/accounting invariants, attacker/RPC/reorg scenarios, test inspection and focused in-memory reproduction. No checkout mutation, live database mutation, signing, broadcasting, deployment or implementation edit was performed by the reviewer. The only reviewer-authored file is this report.
