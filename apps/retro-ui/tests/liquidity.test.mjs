import test from 'node:test';
import assert from 'node:assert/strict';
import { liquidityView, demoLiquidityView, uniqueCapitalAssets } from '../src/lib/view-models/liquidity.ts';
import { validateMakerDrafts, confirmMakerLeg } from '../src/features/liquidity/maker-drafts.ts';

const available = data => ({ status: 'available', source: 'TEST', data });
const unavailable = { status: 'unavailable', source: 'TEST', data: null, error: 'LIQUIDITY_READ_UNAVAILABLE' };
function snapshot() {
  return { chainId: 10143, blockNumber: 123n, blockHash: '0x01', observedAt: 1000, identity: { token: '0x01', market: '0x02', vault: '0x03', lpLock: '0x04', baseDecimals: 18, quoteDecimals: 6 },
    clob: available({ block: 123n, bids: [], asks: [] }), vault: available({ baseAssetsRaw: 900719925474099300000000000000000000n, quoteAssetsRaw: 1234567n, totalSharesRaw: 100n, shareDecimals: 18, bidX18: 10n, askX18: 12n }),
    bestExecutable: available({ bidX18: 10n, askX18: 12n, marketState: 0 }), custody: available({ lockedSharesRaw: 100n, excessBaseRaw: 0n }), position: available({ account: '0x05', sharesRaw: 0n, previewBaseRaw: 0n, previewQuoteRaw: 0n, kind: 'wallet' }) };
}

test('empty CLOB does not erase AMM assets or become an execution guarantee', () => {
  const view = liquidityView('token', snapshot());
  assert.deepEqual(view.clob, { status: 'ready', bids: 0, asks: 0 });
  assert.equal(view.vaultState.baseRaw, '900719925474099300000000000000000000');
  assert.equal(view.vaultState.quoteRaw, '1234567');
  assert.equal(view.best.paused, false);
  assert.equal('buyExecutable' in view.best, false);
  assert.equal('tvl' in view, false);
});

test('section failure remains unavailable while independent data stays usable', () => {
  const state = snapshot(); state.vault = unavailable;
  const view = liquidityView('token', state);
  assert.equal(view.vaultState.status, 'unavailable');
  assert.equal(view.vaultState.baseRaw, null);
  assert.equal(view.clob.status, 'ready');
  assert.equal(view.best.bidX18, '10');
  assert.equal(view.shareDecimals, null);
});

test('missing and stale snapshots are different from confirmed zero positions', () => {
  const absent = liquidityView('token', undefined, { error: 'RPC unavailable' });
  assert.equal(absent.status, 'unavailable'); assert.equal(absent.position.sharesRaw, null);
  const state = snapshot(); state.vault = unavailable;
  const stale = liquidityView('token', state, { stale: true });
  assert.equal(stale.clob.status, 'stale'); assert.equal(stale.vaultState.status, 'unavailable');
  assert.equal(stale.position.sharesRaw, '0');
  assert.equal(stale.block, '123');
});

test('paused markets retain prices with an explicit restriction', () => {
  const state = snapshot(); state.bestExecutable.data.marketState = 2;
  const view = liquidityView('token', state);
  assert.equal(view.best.paused, true); assert.equal(view.best.askX18, '12');
});

test('demo liquidity states stay explicitly synthetic and independent', () => {
  const empty = demoLiquidityView('demo-graduated', 'no-book');
  assert.equal(empty.demo, true); assert.equal(empty.clob.bids, 0); assert.equal(empty.vaultState.status, 'ready');
  assert.doesNotMatch(empty.market, /^0x/);
  assert.equal(demoLiquidityView('demo-graduated', 'rpc-error').vaultState.baseRaw, null);
  assert.equal(demoLiquidityView('demo-graduated', 'both-empty').best.askX18, null);
});

test('capital deduplicates the same shared asset across markets without summing it', () => {
  const rows = uniqueCapitalAssets([{ token: '0xABC', raw: 3n }, { token: '0xabc', raw: 3n }, { token: '0xdef', raw: 7n }]);
  assert.equal(rows.length, 2); assert.deepEqual(rows.map(r => r.raw), [3n, 7n]);
});

const params = { pricePrecision: 1000n, sizePrecision: 100n, baseAsset: '0x01', baseDecimals: 18n, quoteAsset: '0x02', quoteDecimals: 6n, tickSize: 5n, minSize: 10n, maxSize: 100000n, makerFeeBps: 0n, takerFeeBps: 30n };
test('two-sided drafts use SDK directional tick normalization and exact size units', () => {
  const draft = validateMakerDrafts(params, { bidPrice: '0.697123', bidSize: '1.23', askPrice: '0.704123', askSize: '2.34' });
  assert.deepEqual(draft, { bid: { side: 'Buy', price: '0.695', size: '1.23' }, ask: { side: 'Sell', price: '0.705', size: '2.34' } });
});

test('invalid maker amounts, crossed quotes, and out-of-range prices are rejected', () => {
  const good = { bidPrice: '0.695', bidSize: '1', askPrice: '0.705', askSize: '1' };
  for (const changed of [{ bidSize: '0.001' }, { bidSize: '0.01' }, { bidSize: '1001' }, { bidPrice: '0.705', askPrice: '0.705' }, { bidPrice: '0' }, { askPrice: '5000000' }, { askSize: '-1' }]) {
    assert.throws(() => validateMakerDrafts(params, { ...good, ...changed }));
  }
});

test('second-leg recovery preserves first receipt and rejects out-of-order or duplicate confirmations', () => {
  const legs = validateMakerDrafts(params, { bidPrice: '0.695', bidSize: '1', askPrice: '0.705', askSize: '1' });
  const initial = { id: 'attempt1', ...legs, bidHash: null, askHash: null };
  assert.equal(confirmMakerLeg(initial, 'attempt1:ask', 'ask-hash'), initial);
  const bid = confirmMakerLeg(initial, 'attempt1:bid', 'bid-hash');
  assert.equal(bid.bidHash, 'bid-hash'); assert.equal(bid.askHash, null);
  assert.equal(confirmMakerLeg(bid, 'attempt1:bid', 'duplicate-bid'), bid);
  assert.equal(confirmMakerLeg(bid, 'old-wallet:ask', 'wrong-context'), bid);
  const done = confirmMakerLeg(bid, 'attempt1:ask', 'ask-hash');
  assert.equal(done.bidHash, 'bid-hash'); assert.equal(done.askHash, 'ask-hash');
});
