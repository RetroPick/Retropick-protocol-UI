import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { IndexEnvelope, IndexedLaunch, IndexedCandle, IndexFreshness, IndexedActivityPage } from '@retropick/launchpad-sdk/read-model';
import { query, QueryError } from '../src/query.ts';
import { createReadServer } from '../src/server.ts';
import { snapshot, seed, graduated, event, TOKEN, CURVE, MARKET, ALICE, BOB, USDC } from './fixtures.ts';
import { PROJECTION_VERSION } from '../src/project.ts';
const freshness: IndexFreshness = { chainId: 10143, indexedBlock: 100, indexedBlockHash: `0x${'a'.repeat(64)}`, headBlock: 108, confirmations: 8, lagBlocks: 8, indexedAt: '2026-10-10T00:00:00Z', syncing: false, error: null, source: 'MONAD_EVENT_INDEXER', reorgRevision: 0, projectionVersion: PROJECTION_VERSION };
const run = (s: ReturnType<typeof snapshot>, path: string) => query(s, new URL(path, 'http://localhost'), freshness);
const token = (n: number) => `0x${n.toString(16).padStart(40, '0')}`;

test('discovery applies exact bigint monetary order within explicit quote groups and stable pagination', () => {
  const s = snapshot([
    seed({ token: token(1), marketCapRaw: '900719925474099300000', createdBlock: 11 }),
    seed({ token: token(2), marketCapRaw: '900719925474099300001', createdBlock: 11 }),
    seed({ token: token(3), quoteAsset: USDC, quoteSymbol: 'USDC', quoteDecimals: 6, marketCapRaw: '999999999999999999999999999' }),
  ]);
  const first = run(s, '/v1/launches?sort=marketCap&limit=1') as IndexEnvelope<IndexedLaunch[]>;
  assert.equal(first.data[0].token, token(2)); assert.equal(first.sortGrouping, 'QUOTE_ASSET'); assert.ok(first.nextCursor);
  const second = run(s, `/v1/launches?sort=marketCap&limit=1&cursor=${first.nextCursor}`) as IndexEnvelope<IndexedLaunch[]>;
  assert.equal(second.data[0].token, token(1));
  const third = run(s, `/v1/launches?sort=marketCap&limit=1&cursor=${second.nextCursor}`) as IndexEnvelope<IndexedLaunch[]>;
  assert.equal(third.data[0].token, token(3)); assert.equal(third.nextCursor, null);
});

test('discovery phase threshold, symbol/address pairs and creator search use actual launches', () => {
  const s = snapshot([seed({ token: token(1), bondingProgressBps: 7999 }), seed({ token: token(2), bondingProgressBps: 8000 }), seed({ token: token(3), phase: 'GRADUATION_READY', bondingProgressBps: 10000 }), graduated(6)]);
  const near = run(s, '/v1/launches?phase=near-graduation') as IndexEnvelope<IndexedLaunch[]>;
  assert.deepEqual(new Set(near.data.map(l => l.token)), new Set([token(2), token(3)]));
  assert.equal((run(s, '/v1/launches?phase=graduated&quote=usdc') as IndexEnvelope<IndexedLaunch[]>).data.length, 1);
  assert.equal((run(s, `/v1/search?q=${ALICE}`) as IndexEnvelope<IndexedLaunch[]>).data.length, 4);
  assert.equal((run(s, '/v1/search?q=REAL') as IndexEnvelope<IndexedLaunch[]>).data.length, 4);
  assert.deepEqual((run(s, '/v1/search?q=') as IndexEnvelope<IndexedLaunch[]>).data, []);
  const pairs = run(s, '/v1/pairs') as IndexEnvelope<{ symbol: string; launchCount: number }[]>;
  assert.deepEqual(pairs.data.map(p => [p.symbol, p.launchCount]), [['MON', 3], ['USDC', 1]]);
});

test('cursors reject changed query, changed snapshot/reorg and malformed input explicitly', () => {
  const s = snapshot([seed({ token: token(1) }), seed({ token: token(2) })]);
  const first = run(s, '/v1/launches?limit=1');
  assert.throws(() => run(s, `/v1/launches?limit=1&phase=active&cursor=${first.nextCursor}`), (e: unknown) => e instanceof QueryError && e.code === 'CURSOR_QUERY_MISMATCH');
  assert.throws(() => run({ ...s, reorgRevision: 1 }, `/v1/launches?limit=1&cursor=${first.nextCursor}`), (e: unknown) => e instanceof QueryError && e.status === 409);
  assert.throws(() => run(s, '/v1/launches?cursor=bad'), (e: unknown) => e instanceof QueryError && e.code === 'INVALID_CURSOR');
  assert.throws(() => run(s, '/v1/launches?limit=101'), (e: unknown) => e instanceof QueryError && e.code === 'INVALID_LIMIT');
  assert.throws(() => run(s, '/v1/launches?phase=demo'), (e: unknown) => e instanceof QueryError && e.code === 'INVALID_PHASE');
});

test('candle range and resolution are independent, pages are latest-first then ascending within page', () => {
  const s = snapshot(); s.indexedTimestamp = 3000;
  s.launches[0].candles = Array.from({ length: 40 }, (_, i) => ({ timestamp: i * 60, open: String(i + 1), high: String(i + 3), low: String(i), close: String(i + 2), quoteVolumeRaw: '1000000', tradeCount: 1 }));
  const first = run(s, `/v1/launches/${TOKEN}/candles?resolution=5m&range=all&limit=2`) as IndexEnvelope<IndexedCandle[]>;
  assert.deepEqual(first.data.map(c => c.timestamp), [1800, 2100]); assert.equal(first.data[0].tradeCount, 5); assert.equal(first.resolution, '5m');
  const next = run(s, `/v1/launches/${TOKEN}/candles?resolution=5m&range=all&limit=2&cursor=${first.nextCursor}`) as IndexEnvelope<IndexedCandle[]>;
  assert.deepEqual(next.data.map(c => c.timestamp), [1200, 1500]);
  assert.equal((run(s, `/v1/launches/${TOKEN}/candles?resolution=1m&range=1h`) as IndexEnvelope<IndexedCandle[]>).data.length, 40);
  assert.throws(() => run(s, `/v1/launches/${TOKEN}/candles?resolution=24h`), (e: unknown) => e instanceof QueryError && e.code === 'INVALID_RESOLUTION');
  const summary = run(s, '/v1/launches') as IndexEnvelope<IndexedLaunch[]>; assert.equal(summary.data[0].candles.length, 32);
});

test('referral stream is canonical paginated launch/taker execution only, and handles not-yet-confirmed associations', () => {
  const launch = event('TokenLaunched', { token: TOKEN, deployer: ALICE }, { id: 'launch', address: CURVE, block: 10 });
  const buy = event('CurveBuy', { buyer: BOB, quoteIn: '1000000000000000000', tokensOut: '1000000000000000000', fee: '0', tax: '0' }, { id: 'buy', block: 11 });
  const deposit = event('Deposit', { owner: ALICE, token: TOKEN, amount: '1000000000000000000' }, { id: 'deposit', block: 12 });
  const s = snapshot([seed()], [launch, buy, deposit]);
  const first = run(s, '/v1/activity?fromBlock=10&toBlock=100&limit=1') as IndexEnvelope<IndexedActivityPage>;
  assert.equal(first.data.events[0].eventName, 'TokenLaunched'); assert.equal(first.data.canonicalFromBlock, 10); assert.equal(first.data.canonicalToBlock, 100);
  const second = run(s, `/v1/activity?fromBlock=10&toBlock=100&limit=1&cursor=${first.nextCursor}`) as IndexEnvelope<IndexedActivityPage>;
  assert.equal(second.data.events[0].actor, BOB); assert.equal(second.nextCursor, null);
  const pending = run(s, '/v1/activity?fromBlock=109') as IndexEnvelope<IndexedActivityPage>; assert.deepEqual(pending.data.events, []); assert.equal(pending.data.canonicalToBlock, 100);
});

test('HTTP read-only API retains freshness, supports ETag, and excludes wallet-specific caching', async t => {
  const s = snapshot(); const server = createReadServer({ snapshot: () => s, freshness: () => freshness });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const addr = server.address(); assert.ok(addr && typeof addr !== 'string'); const base = `http://127.0.0.1:${addr.port}`;
  const first = await fetch(`${base}/v1/launches`); assert.equal(first.status, 200); assert.match(first.headers.get('cache-control')!, /max-age=1/);
  assert.equal((await first.json()).freshness.indexedBlockHash, freshness.indexedBlockHash);
  const etag = first.headers.get('etag'); assert.ok(etag); const cached = await fetch(`${base}/v1/launches`, { headers: { 'if-none-match': etag } }); assert.equal(cached.status, 304);
  const wallet = await fetch(`${base}/v1/wallets/${ALICE}/assets`); assert.equal(wallet.headers.get('cache-control'), 'no-store'); assert.equal(wallet.headers.get('etag'), null);
  const denied = await fetch(`${base}/v1/launches`, { method: 'POST' }); assert.equal(denied.status, 405);
  const bad = await fetch(`${base}/v1/launches?sort=fiction`); assert.equal(bad.status, 400); assert.equal(bad.headers.get('cache-control'), 'no-store');
});

test('HTTP refuses legacy projection instead of serving incorrect price units', async t => {
  const s = { ...snapshot(), projectionVersion: 1 }; const server = createReadServer({ snapshot: () => s, freshness: () => freshness });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const addr = server.address(); assert.ok(addr && typeof addr !== 'string'); const response = await fetch(`http://127.0.0.1:${addr.port}/v1/launches`); assert.equal(response.status, 503); assert.equal((await response.json()).error, 'INDEX_SCHEMA_UPGRADING');
});

test('receipt transaction filter finds exact trades/orders before bounded pagination', () => {
  const s = snapshot();
  const target = `0x${'e'.repeat(64)}`;
  s.trades = Array.from({ length: 150 }, (_, i) => ({ id: String(i), token: TOKEN, venue: 'CURVE', side: 'buy', actor: ALICE, quoteRaw: '1', tokensRaw: '1', priceRaw: '1', feeRaw: '0', block: i, timestamp: i, transactionHash: i === 0 ? target : `0x${'f'.repeat(64)}`, logIndex: 0 }));
  const result = run(s, `/v1/launches/${TOKEN}/trades?transactionHash=${target}`) as IndexEnvelope<{ id: string }[]>;
  assert.deepEqual(result.data.map(t => t.id), ['0']);
  const rows = run(s, `/v1/launches/${TOKEN}/orders?status=all&transactionHash=${target}`) as IndexEnvelope<unknown[]>; assert.deepEqual(rows.data, []);
  assert.throws(() => run(s, `/v1/launches/${TOKEN}/trades?transactionHash=bad`), (e: unknown) => e instanceof QueryError && e.code === 'INVALID_TRANSACTION_HASH');
});
