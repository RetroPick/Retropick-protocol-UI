// Golden regression + state-machine tests for the token terminal view-model layer.
// Run: node --test tests/terminal.test.mjs (Node >= 22.18 strips TypeScript types natively).
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatUnits } from 'viem';
import { orderSizeRaw, holderValueRaw, curveSpotX18, marketCapRaw, formatRaw, formatRawCompact, formatBps, formatPriceX18, aggregateCandles, intervalFor, RANGE_INTERVALS, buildDepthLadder } from '../src/lib/view-models/token-terminal.ts';
import { getDemoFixture, demoFixtureIds, DEMO_FIXTURE_VERSION } from '../src/lib/view-models/demo-terminal-fixtures.ts';
import { runDepositThenOrder, shortfall, flowMessage } from '../src/features/trading/deposit-order-machine.ts';

// ── Golden: moved bigint math must equal the former inline expressions byte-for-byte ──
const cases = [
  { sizeUnits: '123456789', baseDecimals: 18, sizePrecision: '1000' },
  { sizeUnits: '1', baseDecimals: 6, sizePrecision: '100' },
  { sizeUnits: '999999999999999999', baseDecimals: 18, sizePrecision: '10000000000' },
];
test('orderSizeRaw equals former kuru-ticket inline math', () => {
  for (const c of cases) {
    const former = formatUnits(BigInt(c.sizeUnits) * 10n ** BigInt(c.baseDecimals) / BigInt(c.sizePrecision), c.baseDecimals);
    assert.equal(formatUnits(orderSizeRaw(c.sizeUnits, c.baseDecimals, c.sizePrecision), c.baseDecimals), former);
  }
});
test('holderValueRaw equals former token-detail inline math', () => {
  for (const [bal, price, qd, bd] of [['1000000000000000000000', '2840000000000000', 18, 18], ['7', '1', 6, 18], ['123456789012345678901234', '99999999999999999999', 18, 6]]) {
    assert.equal(holderValueRaw(bal, price, qd, bd), BigInt(bal) * BigInt(price) * 10n ** BigInt(qd) / (10n ** BigInt(bd) * 10n ** 18n));
  }
});
test('curveSpotX18 and marketCapRaw equal former token-detail inline math', () => {
  for (const [q, t, d] of [[30_000n * 10n ** 18n, 600_000_000n * 10n ** 18n, 18], [123n, 7n, 6], [10n ** 30n, 3n * 10n ** 27n, 18]]) {
    assert.equal(curveSpotX18(q, t, d), q * 10n ** 18n * 10n ** 18n / (t * 10n ** BigInt(d)));
    const p = curveSpotX18(q, t, d), supply = 10n ** 27n;
    assert.equal(marketCapRaw(p, supply, d, 18), p * supply * 10n ** BigInt(d) / (10n ** 18n * 10n ** 18n));
  }
});

// ── Exact formatting ──
test('formatRaw truncates without float error', () => {
  assert.equal(formatRaw('123456789000000000000', 18, 4), '123.4567');
  assert.equal(formatRaw('1000000000000000000000000', 18, 2), '1,000,000');
  assert.equal(formatRaw('1', 18, 6), '0.000000000000000001');
  assert.equal(formatRaw(null, 18), '—');
  assert.equal(formatRawCompact('2500000000000000000000000', 18), '2.5M');
  assert.equal(formatBps('-420', true), '-4.2%');
  assert.equal(formatBps('1830', true), '+18.3%');
  assert.equal(formatPriceX18('2840000000000000'), '0.00284');
});

// ── Chart range/interval contract ──
test('range and interval are independent; only page-safe combinations are offered', () => {
  assert.deepEqual(RANGE_INTERVALS['6h'], ['1m', '5m', '15m']);
  assert.equal(intervalFor('7d', '1m'), '1h');
  assert.equal(intervalFor('6h', '15m'), '15m');
  const base = [{ timestamp: 60, open: '10', high: '12', low: '9', close: '11', quoteVolumeRaw: '5', tradeCount: 1 }, { timestamp: 240, open: '11', high: '15', low: '8', close: '14', quoteVolumeRaw: '7', tradeCount: 2 }];
  assert.deepEqual(aggregateCandles(base, '5m'), [{ timestamp: 0, open: '10', high: '15', low: '8', close: '14', quoteVolumeRaw: '12', tradeCount: 3 }]);
});

// ── Fixtures: deterministic, versioned, never chain-addressed ──
test('demo fixtures cover the four lifecycle states deterministically', () => {
  const states = new Set(demoFixtureIds.map((id) => getDemoFixture(id).vm.lifecycle));
  for (const s of ['ACTIVE', 'GRADUATION_READY', 'GRADUATING', 'GRADUATED']) assert.ok(states.has(s), s);
  const a = getDemoFixture('demo-graduated'), b = getDemoFixture('nvidia-cult');
  assert.equal(a.vm.fixtureVersion, DEMO_FIXTURE_VERSION);
  assert.equal(JSON.stringify(a.data.candles.rows.slice(-5)), JSON.stringify(b.data.candles.rows.slice(-5)));
  for (const id of demoFixtureIds) {
    const f = getDemoFixture(id);
    assert.equal(f.vm.dataMode, 'demo');
    assert.doesNotMatch(f.vm.id, /^0x/);
    for (const v of Object.values(f.vm.addresses)) if (v) assert.doesNotMatch(v, /^0x[0-9a-f]{40}$/i, `${id} demo address must not look like a chain address`);
    for (const t of f.data.trades.rows.slice(0, 20)) { assert.doesNotMatch(t.transactionHash, /^0x/); assert.doesNotMatch(t.actor, /^0x/); }
  }
  assert.equal(getDemoFixture('demo-active', 'margin-shortfall').wallet.quoteMargin < getDemoFixture('demo-active').wallet.quoteMargin, true);
  assert.equal(getDemoFixture('demo-graduated', 'no-orders').data.orders.rows.length, 0);
  assert.equal(getDemoFixture('demo-active', 'no-holders').data.holders.rows.length, 0);
  assert.equal(getDemoFixture('0x0000000000000000000000000000000000000001'), null);
});

// ── Deposit & place order state machine ──
function harness({ margin, depositResult = 'ok', orderResults = ['ok'] }) {
  let m = margin; const calls = []; const states = []; let orders = [...orderResults];
  return {
    calls, states,
    deps: (required) => ({
      required,
      readMargin: async () => { calls.push('read'); return m; },
      deposit: async (amount) => { calls.push(`deposit:${amount}`); if (depositResult === 'reject') return { kind: 'failed', reason: 'rejected', failure: 'rejected' }; m += amount; return { kind: 'success', hash: '0xdep' }; },
      placeOrder: async () => { calls.push('order'); const r = orders.shift() ?? 'ok'; return r === 'ok' ? { kind: 'success', hash: '0xord' } : { kind: 'failed', reason: 'reverted', failure: r === 'reject' ? 'rejected' : 'revert' }; },
      onState: (s) => states.push(s.step),
    }),
  };
}
test('sufficient margin: no deposit, single order', async () => {
  const h = harness({ margin: 10n });
  const final = await runDepositThenOrder(h.deps(5n));
  assert.equal(final.step, 'done'); assert.deepEqual(h.calls, ['read', 'read', 'order']);
});
test('shortfall: deposits exactly the gap, waits, re-reads margin, then a separate order', async () => {
  const h = harness({ margin: 3n });
  const final = await runDepositThenOrder(h.deps(10n));
  assert.equal(final.step, 'done'); assert.deepEqual(h.calls, ['read', 'deposit:7', 'read', 'order']);
  assert.equal(shortfall(10n, 3n), 7n);
});
test('rejecting the deposit prevents the order', async () => {
  const h = harness({ margin: 0n, depositResult: 'reject' });
  const final = await runDepositThenOrder(h.deps(10n));
  assert.equal(final.step, 'deposit-failed'); assert.ok(!h.calls.includes('order'));
  assert.match(flowMessage(final, '10 MON'), /rejected/);
});
test('order failure after deposit: "Margin deposited; order not placed", retry never re-deposits', async () => {
  const h = harness({ margin: 0n, orderResults: ['reject', 'ok'] });
  const failed = await runDepositThenOrder(h.deps(10n));
  assert.equal(failed.step, 'order-failed'); assert.match(flowMessage(failed, '10 MON'), /^Margin deposited; order not placed/);
  const retried = await runDepositThenOrder(h.deps(10n), failed);
  assert.equal(retried.step, 'done');
  assert.equal(h.calls.filter((c) => c.startsWith('deposit')).length, 1, 'exactly one deposit');
});
test('retry refuses to place the order if deposited margin is no longer sufficient', async () => {
  const h = harness({ margin: 0n, orderResults: ['revert'] });
  const failed = await runDepositThenOrder(h.deps(10n));
  const d = h.deps(50n); // requirement grew (e.g. price changed)
  const retried = await runDepositThenOrder(d, failed);
  assert.equal(retried.step, 'order-failed'); assert.equal(h.calls.filter((c) => c === 'order').length, 1);
});

// ── Depth ladder: aggregation, ordering, dedupe, spread ──
const D = 10n ** 18n;
test('buildDepthLadder sorts, dedupes and accumulates exact bigints', () => {
  const ladder = buildDepthLadder({
    bids: [{ price: 99n * D, size: 10n * D }, { price: 101n * D, size: 5n * D }, { price: 99n * D, size: 3n * D }, { price: 0n, size: 1n * D }],
    asks: [{ price: 103n * D, size: 7n * D }, { price: 102n * D, size: 4n * D }, { price: 102n * D, size: 6n * D }, { price: 104n * D, size: 0n }],
  });
  assert.deepEqual(ladder.bids.map((l) => l.priceX18), [101n * D, 99n * D], 'bids descending, best first');
  assert.equal(ladder.bids[1].sizeRaw, 13n * D, 'same-price bid levels merge');
  assert.equal(ladder.bids[1].cumulativeRaw, 18n * D);
  assert.deepEqual(ladder.asks.map((l) => l.priceX18), [102n * D, 103n * D], 'asks ascending, best first');
  assert.equal(ladder.asks[0].sizeRaw, 10n * D, 'same-price ask levels merge');
  assert.equal(ladder.asks[1].cumulativeRaw, 17n * D);
  assert.equal(ladder.spreadX18, 102n * D - 101n * D);
  assert.equal(ladder.midX18, (102n * D + 101n * D) / 2n);
});
test('buildDepthLadder handles empty, one-sided and malformed books fail-closed', () => {
  assert.deepEqual(buildDepthLadder({ bids: [], asks: [] }), { asks: [], bids: [], spreadX18: null, midX18: null });
  const one = buildDepthLadder({ bids: [{ price: 5n * D, size: 1n * D }], asks: [] });
  assert.equal(one.spreadX18, null); assert.equal(one.midX18, null);
  const crossed = buildDepthLadder({ bids: [{ price: 105n * D, size: 1n * D }], asks: [{ price: 103n * D, size: 1n * D }] });
  assert.equal(crossed.spreadX18, null, 'crossed input never displays a negative spread');
});
test('demo fixture exposes a deterministic two-sided graduated book', () => {
  const f1 = getDemoFixture('nvidia-cult'), f2 = getDemoFixture('nvidia-cult');
  assert.ok(f1 && f1.book && f1.book.bids.length === 7 && f1.book.asks.length === 7);
  assert.deepEqual(f1.book, f2 && f2.book, 'deterministic across calls');
  const ladder = buildDepthLadder(f1.book);
  assert.ok(ladder.spreadX18 !== null && ladder.spreadX18 > 0n);
  assert.ok(ladder.asks[0].priceX18 > ladder.bids[0].priceX18, 'never crossed');
  assert.equal(getDemoFixture('monad-dog')?.book ?? null, null, 'no book before graduation');
  const noBook = getDemoFixture('nvidia-cult', 'no-book')?.book;
assert.deepEqual(noBook, { bids: [], asks: [] }, 'no-book scenario keeps an empty ladder for the empty state');
});
