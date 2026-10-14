import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

// Run the actual frontend parser/formatter with only its browser environment mocked.
// No source/build files are generated and no Vite/window initialization is needed.
const source = readFileSync(new URL('../../../apps/retro-ui/src/lib/live/radar-client.ts', import.meta.url), 'utf8')
  .replace("import { RADAR_URL, CHAIN_ID } from './env';", 'const RADAR_URL = null; const CHAIN_ID = 10143;');
const { parseRadarSnapshot, formatRadarAmount } = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source, { mode: 'transform' })).toString('base64'));
const raw = (version: number | null = 4) => ({ source: 'ENVIO_HYPERSYNC', chainId: 10143, aggregationVersion: version,
  markets: [{ market: '0xmarket', token: '0xtoken', baseDecimals: 18, trades: 1, ordersCreated: 2, ordersCanceled: 1, filledBaseUnits: '1000000000000000000', quoteVolume18: '3990000000000000' }], tokens: [] });

test('frontend formats the real RPE2E normalized amounts in their declared units', () => {
  const m = parseRadarSnapshot(raw()).markets[0];
  assert.equal(formatRadarAmount(m.filledBaseUnits, m.baseDecimals), '1');
  assert.equal(formatRadarAmount(m.quoteVolume18, 18), '0.0039');
  assert.equal(formatRadarAmount(1_250_000n, 6), '1.25');
  assert.equal(formatRadarAmount(1n, 18), '<0.0001');
  assert.equal(formatRadarAmount(0n, 18), '0');
});

test('legacy aggregation and unknown/malformed amounts never become a fabricated zero', () => {
  for (const version of [null, 3, 5]) {
    const m = parseRadarSnapshot(raw(version)).markets[0];
    assert.equal(m.filledBaseUnits, null); assert.equal(m.quoteVolume18, null); assert.equal(m.ordersCanceled, null);
  }
  const r = raw(); r.markets[0].filledBaseUnits = 'invalid';
  const m = parseRadarSnapshot(r).markets[0];
  assert.equal(formatRadarAmount(m.filledBaseUnits, m.baseDecimals), 'Unavailable');
  assert.equal(formatRadarAmount(null, 18), 'Unavailable');
  assert.throws(() => parseRadarSnapshot({ ...raw(), chainId: 1 }), /provenance\/chain/);
});
