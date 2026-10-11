// Policy-core unit tests for the RetroMask Agent Wallet plugin (pure bigint logic).
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_POLICY, checkOrder, assessRisk, checkCancel, requireAgentAddress, type AgentPolicy, type OrderCheckInput } from '../src/policy.ts';

const E18 = 10n ** 18n;
const policy: AgentPolicy = { ...DEFAULT_POLICY };
// Clean default: price 0.004 MON (4e15 x18, tick-aligned), 10 tokens (10e18 raw)
// → notional 0.04 MON (4e16) — inside the 0.05 MON policy cap.
const base = (over: Partial<OrderCheckInput> = {}): OrderCheckInput => ({
  chainId: 10143, market: DEFAULT_POLICY.verifiedMarkets[0], side: 'buy',
  priceX18: 4n * E18 / 1000n, sizeBaseRaw: 10n * E18, marginAvailableRaw: 5n * E18 / 10n,
  tickSizeX18: 10n ** 13n, nowMs: 10_000, quoteAtMs: 9_000, bookBlock: 1000, headBlock: 1005,
  ...over,
});

test('a clean order passes every check', () => {
  const d = checkOrder(policy, base());
  assert.equal(d.ok, true);
  assert.deepEqual(d.reasons, []);
  assert.equal(d.notionalQuoteRaw, 4n * E18 / 100n);
});

test('notional cap, size cap and underprice each refuse with a reason', () => {
  assert.equal(checkOrder(policy, base({ sizeBaseRaw: 3_000_000n * E18 })).ok, false); // size cap
  const low = { ...policy, maxNotionalQuoteRaw: 10n ** 16n, maxOrderSizeBaseRaw: 10n ** 24n };
  assert.match(checkOrder(low, base()).reasons.join(';'), /notional exceeds/);
  assert.match(checkOrder(policy, base({ priceX18: 10n ** 12n, tickSizeX18: 0n })).reasons.join(';'), /below policy minimum/);
});

test('chain allowlist and verified-market registry refuse unknowns', () => {
  assert.match(checkOrder(policy, base({ chainId: 1 })).reasons.join(';'), /not the RetroPick deployment/);
  assert.match(checkOrder(policy, base({ market: '0x' + 'aa'.repeat(20) })).reasons.join(';'), /verified Kuru registry/);
});

test('stale quotes and lagging books refuse', () => {
  assert.match(checkOrder(policy, base({ nowMs: 100_000, quoteAtMs: 1_000 })).reasons.join(';'), /stale/);
  assert.match(checkOrder(policy, base({ bookBlock: 900 })).reasons.join(';'), /blocks behind/);
  assert.match(checkOrder(policy, base({ quoteAtMs: 12_000 })).reasons.join(';'), /stale/, 'future quote is also stale');
});

test('tick alignment and margin sufficiency refuse misaligned or unfunded orders', () => {
  assert.match(checkOrder(policy, base({ priceX18: 4n * E18 + 1n })).reasons.join(';'), /tick-aligned/);
  assert.match(checkOrder(policy, base({ marginAvailableRaw: 1n })).reasons.join(';'), /insufficient quote margin/);
  assert.match(checkOrder(policy, base({ side: 'sell', marginAvailableRaw: 1n })).reasons.join(';'), /insufficient base margin/);
});

test('zero and negative sizes refuse', () => {
  assert.match(checkOrder(policy, base({ sizeBaseRaw: 0n })).reasons.join(';'), /positive/);
});

test('risk assessment explains every factor and never invents a score', () => {
  const mid = 4n * E18;
  const wide = assessRisk(policy, { bestBidX18: mid - 10n ** 17n, bestAskX18: mid + 10n ** 17n, midX18: mid, lastTradeBlock: null, headBlock: 100 });
  assert.equal(wide.caution, true);
  assert.ok(wide.notes.some((n) => /spread/.test(n)));
  assert.ok(wide.notes.some((n) => /no observed trades/.test(n)));
  const tight = assessRisk(policy, { bestBidX18: mid - 10n ** 15n, bestAskX18: mid + 10n ** 15n, midX18: mid, lastTradeBlock: 99, headBlock: 100 });
  assert.equal(tight.caution, false);
  assert.equal(tight.spreadBps, 5n);
  const one = assessRisk(policy, { bestBidX18: 0n, bestAskX18: mid, midX18: mid, lastTradeBlock: 100, headBlock: 100 });
  assert.equal(one.oneSided, true);
});

test('cancellation requires signer ownership of the order', () => {
  const ok = checkCancel(policy, { chainId: 10143, market: policy.verifiedMarkets[0], orderOwner: '0x'+'a'.repeat(40), agentAddress: '0x'+'A'.repeat(40) });
  assert.equal(ok.ok, true);
  const foreign = checkCancel(policy, { chainId: 10143, market: policy.verifiedMarkets[0], orderOwner: '0x'+'d'.repeat(40), agentAddress: '0x'+'a'.repeat(40) });
  assert.equal(foreign.ok, false);
  assert.match(foreign.reasons.join(';'), /different wallet/);
});

test('cancellation fails closed when no authenticated agent address is present', () => {
  // The caller cannot assert ownership by supplying its own `owner` — an empty/invalid agent
  // address must refuse, closing the handoff-flagged owner-arg fallback.
  const noWallet = checkCancel(policy, { chainId: 10143, market: policy.verifiedMarkets[0], orderOwner: '0x'+'a'.repeat(40), agentAddress: '' });
  assert.equal(noWallet.ok, false);
  assert.match(noWallet.reasons.join(';'), /no authenticated agent wallet/);
});

test('requireAgentAddress returns null unless a real wallet address is present (no caller fallback)', () => {
  assert.equal(requireAgentAddress(undefined), null);
  assert.equal(requireAgentAddress(''), null);
  assert.equal(requireAgentAddress('not-an-address'), null);
  assert.equal(requireAgentAddress('0x'+'b'.repeat(40)), '0x'+'b'.repeat(40));
});
