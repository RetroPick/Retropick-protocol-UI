// Unit tests for the pure radar aggregation (no HyperSync, no network).
import test from 'node:test';
import assert from 'node:assert/strict';
import { RadarAggregator, radarJson, marketStalenessS, bytes32ToAddress, eventId, type RadarEvent } from '../src/radar.ts';

const MARKET = '0x1f5de72616a7fe645cf45ac66dfce8ac7452c57f';
const TOKEN = '0x43e7e9b1b7d9a143573307b13d14b51580c18f15';
const PARAMS = { token: TOKEN, baseDecimals: 18, sizePrecision: 10n ** 18n };
const ev = (name: string, args: Record<string, unknown>, over: Partial<RadarEvent> = {}): RadarEvent => ({
  name, args, address: MARKET, blockNumber: 100, blockTimestamp: 1000, logIndex: 0, transactionHash: '0xt1', ...over,
});

test('lifecycle counts, active-on-curve, phase and graduation latency are exact', () => {
  const agg = new RadarAggregator({ [MARKET]: TOKEN });
  agg.ingest([
    ev('TokenLaunched', { token: '0xA' }, { blockNumber: 10, blockTimestamp: 100, logIndex: 1 }),
    ev('GraduationSecured', { token: '0xA' }, { blockNumber: 20, blockTimestamp: 250, logIndex: 1 }),
    ev('GraduationCompleted', { token: '0xA', destination: '0x' + '0'.repeat(24) + MARKET.slice(2) }, { blockNumber: 30, blockTimestamp: 400, logIndex: 1 }),
    ev('TokenLaunched', { token: '0xB' }, { blockNumber: 40, blockTimestamp: 500, logIndex: 1 }),
  ]);
  const s = agg.snapshot(41);
  assert.equal(s.counts.launched, 2);
  assert.equal(s.counts.secured, 1);
  assert.equal(s.counts.completed, 1);
  assert.equal(s.activeOnCurve, 1);
  const a = s.tokens.find((t) => t.token === '0xa')!;
  assert.equal(a.graduationLatencyS, 300);
  assert.equal(a.phase, 'GRADUATED');
  assert.equal(a.market, MARKET, 'market derived from GraduationCompleted.destination');
  assert.equal(s.tokens.find((t) => t.token === '0xb')!.phase, 'LAUNCHED');
});

test('GraduationCompleted maps the market so later trades in the same batch join the token', () => {
  const agg = new RadarAggregator();
  agg.ingest([
    ev('GraduationCompleted', { token: TOKEN, destination: '0x' + '0'.repeat(24) + MARKET.slice(2) }, { blockNumber: 30, logIndex: 0, blockTimestamp: 400 }),
    ev('Trade', { filledSize: 10n ** 18n, price: 4n * 10n ** 18n }, { blockNumber: 31, logIndex: 0, blockTimestamp: 460 }),
  ]);
  const s = agg.snapshot(32);
  assert.equal(s.markets[0].token, TOKEN);
  assert.equal(s.tokens[0].timeToFirstKuruTradeS, 60);
});

test('duplicate delivery (same block/logIndex/tx) is idempotent', () => {
  const agg = new RadarAggregator();
  const trade = ev('Trade', { filledSize: 5n, price: 2n * 10n ** 18n });
  assert.equal(agg.ingest([trade]).accepted, 1);
  const second = agg.ingest([{ ...trade }]);
  assert.equal(second.accepted, 0);
  assert.equal(second.duplicates, 1);
  assert.equal(agg.snapshot().markets[0].trades, 1);
});

test('kuru trade volume math is exact bigint (18-dec normalized)', () => {
  const agg = new RadarAggregator({ [MARKET]: TOKEN }, { [MARKET]: PARAMS });
  agg.ingest([
    ev('Trade', { filledSize: 10n ** 18n, price: 4n * 10n ** 18n }, { logIndex: 1 }),
    ev('Trade', { filledSize: 500_000_000_000_000_000n, price: 4n * 10n ** 18n }, { logIndex: 2 }),
    ev('OrderCreated', { orderId: 1 }, { logIndex: 3 }),
    ev('OrderCanceled', { orderId: 1 }, { logIndex: 4 }),
    ev('OrdersCanceled', { orderId: [2, 3, 4] }, { logIndex: 5 }),
  ]);
  const m = agg.snapshot().markets[0];
  assert.equal(m.trades, 2);
  assert.equal(m.filledBaseUnits, 15n * 10n ** 17n);
  assert.equal(m.quoteVolume18, 6n * 10n ** 18n);
  assert.equal(m.ordersCreated, 1);
  assert.equal(m.ordersCanceled, 4);
});

test('mapping conflict is counted, never silently merged', () => {
  const agg = new RadarAggregator({ [MARKET]: '0xdifferenttoken' });
  agg.ingest([ev('GraduationCompleted', { token: TOKEN, destination: '0x' + '0'.repeat(24) + MARKET.slice(2) }, { blockNumber: 30, logIndex: 0 })]);
  assert.equal(agg.snapshot().mappingConflicts, 1);
});

test('addresses are normalised to lowercase (config, args, log address)', () => {
  const agg = new RadarAggregator({ [MARKET.toUpperCase().replace('0X', '0x')]: TOKEN.toUpperCase().replace('0X', '0x') });
  agg.ingest([ev('Trade', { filledSize: 1n, price: 1n }, { address: MARKET.toUpperCase().replace('0X', '0x') })]);
  assert.equal(agg.snapshot().markets[0].token, TOKEN);
  assert.equal(bytes32ToAddress('0x' + '0'.repeat(24) + MARKET.slice(2)), MARKET);
  assert.equal(bytes32ToAddress('0xdeadbeef'), null);
  assert.equal(eventId({ blockNumber: 1, logIndex: 2, transactionHash: '0xABC' }), '1:2:0xabc');
});

test('out-of-order events across blocks are tolerated; lastBlock is the max', () => {
  const agg = new RadarAggregator();
  agg.ingest([ev('Trade', { filledSize: 1n, price: 10n ** 18n }, { blockNumber: 300, logIndex: 0 })]);
  agg.ingest([ev('Trade', { filledSize: 2n, price: 10n ** 18n }, { blockNumber: 200, logIndex: 1, transactionHash: '0xt2' })]);
  const s = agg.snapshot();
  assert.equal(s.lastBlock, 300);
  assert.equal(s.markets[0].trades, 2);
});

test('persist → restore roundtrip preserves exact bigints, mapping and counters', () => {
  const agg = new RadarAggregator({ [MARKET]: TOKEN }, { [MARKET]: PARAMS });
  agg.ingest([ev('TokenLaunched', { token: '0xA' }, { blockNumber: 10, blockTimestamp: 100, logIndex: 1 }), ev('Trade', { filledSize: 3n, price: 2n ** 70n }, { blockNumber: 11 })]);
  agg.recordDecodeError(2);
  const wire = JSON.parse(JSON.stringify(agg.persist(), (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
  const restored = RadarAggregator.restore(wire, { [MARKET]: TOKEN }, { [MARKET]: PARAMS });
  const s = restored.snapshot();
  assert.equal(s.markets[0].quoteVolume18, (2n ** 70n * 3n) / 10n ** 18n);
  assert.equal(s.counts.launched, 1);
  assert.equal(s.decodeErrors, 2);
  assert.equal(restored.has('11:0:0xt1'), true, 'seen set restored for idempotence');
});

test('staleness is null before the first trade and monotonic after', () => {
  const agg = new RadarAggregator();
  agg.ingest([ev('Trade', { filledSize: 1n, price: 1n }, { blockTimestamp: 900 })]);
  const m = agg.snapshot().markets[0];
  assert.equal(marketStalenessS(m, 1000), 100);
  assert.equal(marketStalenessS(m, 800), 0);
  assert.equal(marketStalenessS({ ...m, lastTradeAt: null }, 1000), null);
});

test('wire format renders bigints as strings', () => {
  const agg = new RadarAggregator({ [MARKET]: TOKEN }, { [MARKET]: PARAMS });
  agg.ingest([ev('Trade', { filledSize: 3n, price: 2n ** 70n })]);
  const parsed = JSON.parse(radarJson(agg.snapshot()));
  assert.equal(typeof parsed.markets[0].quoteVolume18, 'string');
  assert.equal(parsed.markets[0].filledBaseUnits, '3');
});

test('unknown events are ignored without failing', () => {
  const agg = new RadarAggregator();
  agg.ingest([ev('SomethingNew', {}, { logIndex: 9 })]);
  assert.equal(agg.snapshot().counts.launched, 0);
});

test('real RPV2M and RPE2E Trade values normalize grid size rather than token decimals', () => {
  for (const [filledSize, price, base, quote] of [
    [10_000_000n, 3_980_190_000_000_000n, 100_000_000_000_000_000n, 398_019_000_000_000n],
    [100_000_000n, 3_990_000_000_000_000n, 1_000_000_000_000_000_000n, 3_990_000_000_000_000n],
  ]) {
    const agg = new RadarAggregator({ [MARKET]: TOKEN }, { [MARKET]: { ...PARAMS, sizePrecision: 100_000_000n } });
    agg.ingest([ev('Trade', { filledSize, price })]);
    const s = agg.snapshot();
    assert.equal(s.aggregationVersion, 4);
    assert.equal(s.markets[0].baseDecimals, 18);
    assert.equal(s.markets[0].filledBaseUnits, base);
    assert.equal(s.markets[0].quoteVolume18, quote);
  }
});

test('unknown parameters yield null amounts; later verification recovers all prior trades', () => {
  const agg = new RadarAggregator({ [MARKET]: TOKEN });
  agg.ingest([ev('Trade', { filledSize: 125n, price: 2n * 10n ** 18n })]);
  assert.equal(agg.snapshot().markets[0].filledBaseUnits, null);
  assert.equal(agg.snapshot().markets[0].quoteVolume18, null);
  agg.setMarketParams(MARKET, { token: TOKEN, baseDecimals: 6, sizePrecision: 100n });
  assert.equal(agg.snapshot().markets[0].filledBaseUnits, 1_250_000n);
  assert.equal(agg.snapshot().markets[0].quoteVolume18, 2_500_000_000_000_000_000n);
  agg.setMarketParams(MARKET, { token: '0xwrong', baseDecimals: 6, sizePrecision: 100n });
  assert.equal(agg.snapshot().markets[0].quoteVolume18, null);
});

test('semantic cancellation dedup spans individual/batch logs, delivery batches and restart', () => {
  const agg = new RadarAggregator({ [MARKET]: TOKEN });
  agg.ingest([ev('OrderCanceled', { orderId: 2n }, { logIndex: 1 })]);
  const restored = RadarAggregator.restore(agg.persist(), { [MARKET]: TOKEN });
  restored.ingest([ev('OrdersCanceled', { orderId: [2n, 2n, 0n, 3n] }, { logIndex: 2 })]);
  assert.equal(restored.snapshot().markets[0].ordersCanceled, 2);
  restored.ingest([ev('OrderCanceled', { orderId: 3n }, { logIndex: 3 })]);
  assert.equal(restored.snapshot().markets[0].ordersCanceled, 2);
});
