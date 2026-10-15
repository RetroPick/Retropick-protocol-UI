// Run only against an offline SQLite backup; this writes vault checkpoints to that copy.
import assert from 'node:assert/strict';
import { Store } from '../src/store.ts';
import { Indexer } from '../src/sync.ts';
import { release } from '@retropick/launchpad-sdk/chain';
const file = process.argv[2];
if (!file?.endsWith('liquidity-migration-smoke.sqlite')) throw Error('Pass the designated offline liquidity-migration-smoke.sqlite backup path.');
const store = new Store(file);
try {
  const snapshot = store.get('snapshot');
  assert.equal(snapshot?.projectionVersion, 2);
  const before = { root: store.cursor('root', 0), dynamic: store.cursor('dynamic', 0) };
  const indexer = new Indexer(store, 'https://testnet-rpc.monad.xyz', 8, 200);
  const pools = await indexer.liquidity(snapshot.launches.map(launch => ({ launch })), snapshot.indexedBlock);
  assert.ok(pools.length > 0);
  const results = pools.map(pool => {
    const stage = indexer.vaultStage(pool.vault);
    const events = store.events(stage);
    const bootstrap = events.find(e => e.name === 'Transfer' && e.args.from === '0x0000000000000000000000000000000000000000' && e.args.to.toLowerCase() === release.kuruEnvironment.marginAccount.toLowerCase());
    return { token: pool.token, vault: pool.vault, status: pool.status, target: snapshot.indexedBlock, historicalStart: pool.graduationBlock, historicalCursor: pool.historyIndexedBlock, historyComplete: pool.historyComplete, events: events.length, seedDepositFound: events.some(e => e.name === 'KuruVaultDeposit' && e.block === pool.graduationBlock), bootstrapShares: bootstrap?.args.value ?? null };
  });
  assert.deepEqual({ root: store.cursor('root', 0), dynamic: store.cursor('dynamic', 0) }, before);
  assert.equal(store.get('snapshot').projectionVersion, 2);
  console.log(JSON.stringify({ copiedDatabase: file, originalProjection: snapshot.projectionVersion, indexedBlock: snapshot.indexedBlock, preservedCursors: before, results }, null, 2));
  for (const result of results) {
    assert.equal(result.status, 'READY');
    assert.equal(result.historyComplete, false);
    assert.equal(result.seedDepositFound, true);
    assert.equal(result.bootstrapShares, '1000');
  }
} finally { store.close(); }
