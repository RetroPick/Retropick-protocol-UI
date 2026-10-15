import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeAbiParameters, encodeEventTopics, type Address } from 'viem';
import type { IndexedLiquidityPool, IndexFreshness, IndexEnvelope, IndexedLPPosition } from '@retropick/launchpad-sdk/read-model';
import { release, type ChainClient } from '@retropick/launchpad-sdk/chain';
import { kuruVaultAbi } from '@retropick/launchpad-sdk/abis/kuruVaultAbi';
import { project } from '../src/project.ts';
import { Store } from '../src/store.ts';
import { Indexer, START_BLOCK } from '../src/sync.ts';
import { query } from '../src/query.ts';
import { createReadServer } from '../src/server.ts';
import { graduated, snapshot, event, TOKEN, MARKET, ALICE, BOB } from './fixtures.ts';
const VAULT = '0x7777777777777777777777777777777777777777';
const LOCK = '0x8888888888888888888888888888888888888888';
const ZERO = '0x0000000000000000000000000000000000000000';
const margin = release.kuruEnvironment.marginAccount.toLowerCase();
const hash = `0x${'a'.repeat(64)}` as const;
const pool = (complete = true): IndexedLiquidityPool => ({ token: TOKEN, market: MARKET, vault: VAULT, lpLock: LOCK, baseAsset: TOKEN, quoteAsset: ZERO, baseDecimals: 18, quoteDecimals: 18, baseSymbol: 'REAL', quoteSymbol: 'MON', baseAssetsRaw: '500', quoteAssetsRaw: '600', totalSharesRaw: '10995', protectedSharesRaw: null, infrastructureSharesRaw: null, graduationBlock: 10, historyIndexedBlock: complete ? 100 : 9, historyComplete: complete, status: 'READY' });
const transfer = (from: string, to: string, shares: bigint, n: number) => event('Transfer', { from, to, amount: shares }, { address: VAULT, logIndex: n, id: `lp:${n}` });
const lpEvents = [transfer(ZERO, margin, 1000n, 0), transfer(ZERO, LOCK, 10000n, 1), event('KuruVaultDeposit', { amount1: 500n, amount2: 600n, shares: 10000n, userAddress: LOCK }, { address: VAULT, logIndex: 2 }), transfer(LOCK, ALICE, 100n, 3), transfer(ALICE, BOB, 25n, 4), transfer(ALICE, ZERO, 5n, 5), event('KuruVaultWithdraw', { amount1: 2n, amount2: 3n, shares: 5n, userAddress: ALICE }, { address: VAULT, logIndex: 6 })];
const projected = (complete = true) => project([...lpEvents, lpEvents[0]], [graduated()], 1000, { liquidityPools: [pool(complete)] });
const fresh: IndexFreshness = { chainId: 10143, indexedBlock: 100, headBlock: 108, confirmations: 8, lagBlocks: 8, indexedAt: null, syncing: false, error: null, source: 'MONAD_EVENT_INDEXER' };
const snap = (complete = true) => ({ ...snapshot(), ...projected(complete) });
const run = (path: string, complete = true) => query(snap(complete), new URL(path, 'http://localhost'), fresh);

test('vault shares use transfers only, normalize amount, deduplicate, and separate bootstrap custody', () => {
  const p = projected();
  assert.equal(p.lpPositions.find(p => p.wallet === ALICE)?.sharesRaw, '70');
  assert.equal(p.lpPositions.find(p => p.wallet === BOB)?.sharesRaw, '25');
  assert.equal(p.lpPositions.find(p => p.wallet === margin)?.role, 'INFRASTRUCTURE');
  assert.equal(p.lpPositions.find(p => p.wallet === LOCK)?.role, 'PROTECTED');
  assert.equal(p.liquidityPools[0].protectedSharesRaw, '9900');
  assert.equal(p.liquidityPools[0].infrastructureSharesRaw, '1000');
  assert.equal(p.liquidityEvents.length, 7);
  assert.equal(p.launches[0].liquiditySource, 'KURU_VAULT');
  assert.equal(p.launches[0].liquidityRaw, null);
  assert.equal(p.launches[0].liquidity?.quoteAssetsRaw, '600');
});

test('unqualified emitters cannot alter LP ownership; incomplete history produces no positions', () => {
  const p = project([...lpEvents, event('Transfer', { from: ZERO, to: ALICE, value: 999n }, { address: BOB })], [graduated()], 1000, { liquidityPools: [pool()] });
  assert.equal(p.lpPositions.find(p => p.wallet === ALICE)?.sharesRaw, '70');
  assert.deepEqual(projected(false).lpPositions, []);
  assert.throws(() => project([transfer(ALICE, BOB, 10n, 0)], [graduated()], 1000, { liquidityPools: [pool()] }), /Incomplete vault share history/);
});

test('liquidity routes isolate wallets, paginate with snapshot cursors, and explicitly gate pending history', () => {
  const alice = run(`/v1/wallets/${ALICE}/lp-positions`) as IndexEnvelope<IndexedLPPosition[]>;
  assert.deepEqual(alice.data.map(p => p.wallet), [ALICE]);
  const first = run(`/v1/liquidity/pools/${TOKEN}/events?limit=1`); assert.ok(first.nextCursor);
  const url = new URL(`/v1/liquidity/pools/${TOKEN}/events?limit=1&cursor=${first.nextCursor}`, 'http://localhost');
  assert.equal((query(snap(), url, fresh).data as unknown[]).length, 1);
  assert.throws(() => query({ ...snap(), reorgRevision: 1 }, url, fresh), /CURSOR_EXPIRED/);
  assert.throws(() => run(`/v1/wallets/${BOB}/lp-positions?limit=1&cursor=${first.nextCursor}`), /CURSOR_QUERY_MISMATCH/);
  assert.throws(() => run(`/v1/liquidity/pools/${TOKEN}/events`, false), /LIQUIDITY_HISTORY_SYNCING/);
  assert.throws(() => run(`/v1/wallets/${ALICE}/lp-positions`, false), /LIQUIDITY_HISTORY_SYNCING/);
  assert.equal((run('/v1/liquidity/pools', false).data as unknown[]).length, 1);
});

test('versioned per-vault cursor replays inclusive graduation despite preexisting dynamic head; rollback clears new history', async () => {
  const store = new Store(':memory:'); const indexer = new Indexer(store, 'http://unused.invalid');
  const start = START_BLOCK + 10, stage = indexer.vaultStage(VAULT); const ranges: bigint[] = [];
  store.commit('dynamic', start + 200, hash, []);
  const topics = encodeEventTopics({ abi: kuruVaultAbi, eventName: 'Transfer', args: { from: ZERO, to: ALICE } });
  const data = encodeAbiParameters([{ type: 'uint256' }], [50n]);
  indexer.client = { getLogs: async ({ fromBlock }: { fromBlock: bigint }) => { ranges.push(fromBlock); return fromBlock === BigInt(start) ? [{ address: VAULT, blockNumber: BigInt(start), blockHash: hash, transactionHash: hash, transactionIndex: 0, logIndex: 0, removed: false, topics, data }] : []; }, getBlock: async () => ({ hash, timestamp: 1000n }) } as unknown as ChainClient;
  try {
    await indexer.scan(stage, start + 100, [VAULT as Address], start);
    assert.equal(ranges[0], BigInt(start)); assert.equal(store.events()[0].args.value, '50');
    await indexer.scan(stage, start + 100, [VAULT as Address], start); assert.equal(store.events().length, 1);
    assert.equal(store.cursor('dynamic', start), start + 200);
    store.rollback(start - 1); assert.equal(store.cursor(stage, start), start - 1); assert.equal(store.events().length, 0);
    await indexer.scan(stage, start, [VAULT as Address], start); assert.equal(store.events().length, 1);
  } finally { store.close(); }
});

test('HTTP preserves v2 base routes during upgrade and private caching for wallet LP positions', async () => {
  let s = snap(); const server = createReadServer({ snapshot: () => s, freshness: () => fresh });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  try {
    let response = await fetch(`http://127.0.0.1:${port}/v1/wallets/${ALICE}/lp-positions`);
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store'); assert.equal(response.headers.get('etag'), null);
    s = { ...s, projectionVersion: 2 };
    response = await fetch(`http://127.0.0.1:${port}/v1/launches`); assert.equal(response.status, 200);
    response = await fetch(`http://127.0.0.1:${port}/v1/liquidity/pools`); assert.equal(response.status, 503);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('share conservation rejects missed mint history even when no holder balance is negative', () => {
  assert.throws(() => project([transfer(ZERO, ALICE, 100n, 0)], [graduated()], 1000, { liquidityPools: [pool()] }), /Vault share supply mismatch/);
});

test('vault scan refuses substituted emitters without checkpoint advancement', async () => {
  const store = new Store(':memory:'); const indexer = new Indexer(store, 'http://unused.invalid');
  const topics = encodeEventTopics({ abi: kuruVaultAbi, eventName: 'Transfer', args: { from: ZERO, to: ALICE } });
  const data = encodeAbiParameters([{ type: 'uint256' }], [50n]);
  indexer.client = { getLogs: async () => [{ address: BOB, blockNumber: BigInt(START_BLOCK), blockHash: hash, transactionHash: hash, transactionIndex: 0, logIndex: 0, removed: false, topics, data }], getBlock: async () => ({ hash, timestamp: 1000n }) } as unknown as ChainClient;
  try { await assert.rejects(indexer.scan(indexer.vaultStage(VAULT), START_BLOCK, [VAULT as Address]), /Unexpected log emitter/); assert.equal(store.checkpoints(indexer.vaultStage(VAULT)).length, 0); }
  finally { store.close(); }
});

test('failed share reconciliation retains the prior published snapshot', async () => {
  const store = new Store(':memory:'); const indexer = new Indexer(store, 'http://unused.invalid');
  const previous = snap(); store.set('snapshot', previous);
  indexer.client = { getChainId: async () => 10143, getBlockNumber: async () => BigInt(START_BLOCK + 108), getBlock: async () => ({ hash, timestamp: 1000n }) } as unknown as ChainClient;
  indexer.scan = async () => {};
  indexer.discover = async () => [graduated()];
  indexer.liquidity = async () => [pool()];
  try {
    await indexer.sync();
    assert.equal(indexer.error, 'RPC_OR_CHAIN_SYNC_FAILED');
    assert.equal(indexer.progress.lastError, 'RPC_OTHER');
    assert.deepEqual(store.get('snapshot'), previous);
  } finally { store.close(); }
});

test('at-head reorg between financial reads and final header cannot relabel old reads with a new hash', async () => {
  const store = new Store(':memory:'); const indexer = new Indexer(store, 'http://unused.invalid');
  const previous = snap(); store.set('snapshot', previous);
  const target = START_BLOCK + 100; store.commit('root', target, hash, []); store.commit('dynamic', target, hash, []);
  let reorged = false;
  indexer.client = { getChainId: async () => 10143, getBlockNumber: async () => BigInt(target + 8), getBlock: async () => ({ hash: reorged ? `0x${'c'.repeat(64)}` : hash, timestamp: 1000n }) } as unknown as ChainClient;
  indexer.scan = async () => {};
  indexer.discover = async () => { reorged = true; return [graduated()]; };
  indexer.liquidity = async () => [];
  try {
    assert.equal(indexer.headers.size, 0);
    await indexer.sync();
    assert.equal(indexer.error, 'RPC_OR_CHAIN_SYNC_FAILED');
    assert.deepEqual(store.get('snapshot'), previous);
  } finally { store.close(); }
});
