// Unit tests for the pure radar aggregation (no HyperSync, no network).
import test from 'node:test';
import assert from 'node:assert/strict';
import { RadarAggregator, radarJson, marketStalenessS, type RadarEvent } from '../src/radar.ts';

const MARKET = '0x1f5de72616a7fe645cf45ac66dfce8ac7452c57f';
const ev = (name: string, args: Record<string, unknown>, over: Partial<RadarEvent> = {}): RadarEvent => ({
  name, args, address: MARKET, blockNumber: 100, blockTimestamp: 1000, logIndex: 0, transactionHash: '0xt1', ...over,
});

test('lifecycle counts, active-on-curve and graduation latency are exact', () => {
  const agg = new RadarAggregator({ [MARKET]: '0xtoken' });
  agg.ingest([
    ev('TokenLaunched', { token: '0xa' }, { blockNumber: 10, blockTimestamp: 100, logIndex: 1 }),
    ev('GraduationSecured', { token: '0xa', quote: 1n, launchTokens: 1n }, { blockNumber: 20, blockTimestamp: 250, logIndex: 1 }),
    ev('GraduationCompleted', { token: '0xa', destination: '0x00', receiptHash: '0x00' }, { blockNumber: 30, blockTimestamp: 400, logIndex: 1 }),
    ev('TokenLaunched', { token: '0xb' }, { blockNumber: 40, blockTimestamp: 500, logIndex: 1 }),
  ]);
  const s = agg.snapshot();
  assert.equal(s.counts.launched, 2);
  assert.equal(s.counts.secured, 1);
  assert.equal(s.counts.completed, 1);
  assert.equal(s.activeOnCurve, 1, '0xb still on curve');
  const a = s.tokens.find((t) => t.token === '0xa');
  assert.equal(a.graduationLatencyS, 300);
  assert.equal(a.completedAt, 400);
});

test('duplicate delivery (same block/logIndex/tx) is idempotent', () => {
  const agg = new RadarAggregator();
  const trade = ev('Trade', { filledSize: 5n, price: 2n * 10n ** 18n });
  const first = agg.ingest([trade]);
  const second = agg.ingest([{ ...trade }]); // replayed message
  assert.equal(first.accepted, 1);
  assert.equal(second.accepted, 0);
  assert.equal(second.duplicates, 1);
  const s = agg.snapshot();
  assert.equal(s.markets[0].trades, 1);
});

test('kuru trade volume math is exact bigint (18-dec normalized)', () => {
  const agg = new RadarAggregator();
  agg.ingest([
    ev('Trade', { filledSize: 10n ** 18n, price: 4n * 10n ** 18n }, { logIndex: 1 }),
    ev('Trade', { filledSize: 500_000_000_000_000_000n, price: 4n * 10n ** 18n }, { logIndex: 2 }),
    ev('OrderCreated', { orderId: 1, size: 1n, price: 100, isBuy: true }, { logIndex: 3 }),
    ev('OrderCanceled', { orderId: 1, size: 1n, price: 100, isBuy: true }, { logIndex: 4 }),
    ev('OrdersCanceled', { orderId: [2, 3, 4] }, { logIndex: 5 }),
  ]);
  const m = agg.snapshot().markets[0];
  assert.equal(m.trades, 2);
  assert.equal(m.filledBaseUnits, 15n * 10n ** 17n);
  assert.equal(m.quoteVolume18, 6n * 10n ** 18n); // (1.5 base) × (4 quote/base)
  assert.equal(m.ordersCreated, 1);
  assert.equal(m.ordersCanceled, 4);
});

test('out-of-order events across blocks are tolerated; lastBlock is the max', () => {
  const agg = new RadarAggregator();
  agg.ingest([ev('Trade', { filledSize: 1n, price: 10n ** 18n }, { blockNumber: 300, logIndex: 0 })]);
  agg.ingest([ev('Trade', { filledSize: 2n, price: 10n ** 18n }, { blockNumber: 200, logIndex: 0 })]);
  const s = agg.snapshot();
  assert.equal(s.lastBlock, 300);
  assert.equal(s.markets[0].trades, 2);
});

test('market → token mapping is surfaced for lifecycle joins', () => {
  const agg = new RadarAggregator({ [MARKET]: '0x43e7' });
  agg.ingest([ev('Trade', { filledSize: 1n, price: 1n })]);
  assert.equal(agg.snapshot().markets[0].token, '0x43e7');
});

test('staleness is null before the first trade and monotonic after', () => {
  const agg = new RadarAggregator();
  const s = agg.snapshot();
  const fresh = { ...s.markets[0] ?? { market: MARKET, token: null, trades: 0, ordersCreated: 0, ordersCanceled: 0, filledBaseUnits: 0n, quoteVolume18: 0n, lastTradeBlock: null, lastTradeAt: null } };
  assert.equal(marketStalenessS(fresh, 1000), null);
  agg.ingest([ev('Trade', { filledSize: 1n, price: 1n }, { blockTimestamp: 900 })]);
  const m = agg.snapshot().markets[0];
  assert.equal(marketStalenessS(m, 1000), 100);
  assert.equal(marketStalenessS(m, 800), 0, 'never negative');
});

test('wire format renders bigints as strings and is stable', () => {
  const agg = new RadarAggregator();
  agg.ingest([ev('Trade', { filledSize: 3n, price: 2n ** 70n })]);
  const parsed = JSON.parse(radarJson(agg.snapshot()));
  assert.equal(typeof parsed.markets[0].quoteVolume18, 'string');
  assert.equal(parsed.markets[0].filledBaseUnits, '3');
});

test('unknown events are ignored without failing the stream', () => {
  const agg = new RadarAggregator();
  agg.ingest([ev('SomethingNew', {}, { logIndex: 9 })]);
  assert.equal(agg.snapshot().counts.launched, 0);
});
