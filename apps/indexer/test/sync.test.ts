import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChainClient } from '@retropick/launchpad-sdk/chain';
import { Indexer, START_BLOCK } from '../src/sync.ts';
import { Store } from '../src/store.ts';
import { seed, event, TOKEN, CURVE, ALICE, USDC } from './fixtures.ts';
import { ZERO } from '../src/project.ts';
const hash = `0x${'a'.repeat(64)}`;

test('historical beneficiary ranges batch at most eight, stay within provider100block limit, and commit contiguously', async () => {
  const store = new Store(':memory:'); const indexer = new Indexer(store, 'http://unused.invalid');
  let active = 0, peak = 0; const ranges: { from: bigint; to: bigint }[] = [];
  indexer.client = { getLogs: async ({ fromBlock, toBlock }: { fromBlock: bigint; toBlock: bigint }) => {
    ranges.push({ from: fromBlock, to: toBlock }); active++; peak = Math.max(peak, active); await new Promise(r => setTimeout(r, 2)); active--; return [];
  }, getBlock: async () => ({ hash, timestamp: 1000n }) } as unknown as ChainClient;
  try {
    await indexer.scan('beneficiary', START_BLOCK + 1699, [TOKEN]);
    assert.equal(peak, 8); assert.equal(ranges.length, 17); assert.equal(store.cursor('beneficiary', START_BLOCK), START_BLOCK + 1699);
    for (let i = 0; i < ranges.length; i++) { assert.equal(ranges[i].from, BigInt(START_BLOCK + i * 100)); assert.equal(ranges[i].to - ranges[i].from, 99n); }
  } finally { store.close(); }
});

test('one failed parallel range cannot advance any checkpoint in that batch', async () => {
  const store = new Store(':memory:'); const indexer = new Indexer(store, 'http://unused.invalid');
  indexer.client = { getLogs: async ({ fromBlock }: { fromBlock: bigint }) => { if (fromBlock === BigInt(START_BLOCK + 100)) throw Error('provider failed'); return []; }, getBlock: async () => ({ hash, timestamp: 1000n }) } as unknown as ChainClient;
  try { await assert.rejects(indexer.scan('beneficiary', START_BLOCK + 799, [TOKEN]), /provider failed/); assert.equal(store.cursor('beneficiary', START_BLOCK), START_BLOCK - 1); }
  finally { store.close(); }
});

test('reorg during an in-flight batch prevents orphaned checkpoint publication', async () => {
  const store = new Store(':memory:'); const indexer = new Indexer(store, 'http://unused.invalid'); let rolled = false;
  indexer.client = { getLogs: async () => { if (!rolled) { rolled = true; store.rollback(START_BLOCK - 1); } return []; }, getBlock: async () => ({ hash, timestamp: 1000n }) } as unknown as ChainClient;
  try { await assert.rejects(indexer.scan('beneficiary', START_BLOCK + 799, [TOKEN]), /REORG_DURING_SCAN/); assert.equal(store.cursor('beneficiary', START_BLOCK), START_BLOCK - 1); assert.equal(store.get<number>('reorgRevision'), 1); }
  finally { store.close(); }
});

test('discovery caches immutable social/quote identity, retains dynamic burned supply and original progress allocation', async () => {
  const store = new Store(':memory:'); const indexer = new Indexer(store, 'http://unused.invalid');
  const launched = event('TokenLaunched', { token: TOKEN, curve: CURVE, deployer: ALICE }, { block: START_BLOCK }); store.commit('root', START_BLOCK, hash, [launched]);
  const calls: string[] = [];
  indexer.client = { readContract: async (request: { address: string; functionName: string; blockNumber: bigint }) => {
    const { address, functionName: fn, blockNumber } = request; calls.push(`${address}:${fn}:${blockNumber}`);
    if (fn === 'packet') return { token: TOKEN, curve: CURVE, quoteAsset: USDC, venue: 1, quotePolicyVersion: 1 };
    if (fn === 'ledger') return { phase: 0, protectedLPReceiver: ZERO };
    if (fn === 'receipt') return { market: ZERO, vault: ZERO, seededQuote: 0n };
    if (fn === 'name') return address === TOKEN ? 'Real metadata' : 'USD Coin';
    if (fn === 'symbol') return address === TOKEN ? 'REAL' : 'USDC';
    if (fn === 'decimals') return 6;
    if (fn === 'getTokenInfo') return [ALICE, 'https://example.com/real.png', 'Stored onchain', { twitter: 'https://x.com/real', telegram: '', discord: '', website: '', farcaster: '' }];
    if (fn === 'totalSupply') return blockNumber === BigInt(START_BLOCK) ? 1000n * 10n ** 18n : 900n * 10n ** 18n;
    if (fn === 'sellableTokens') return 400n * 10n ** 18n;
    if (fn === 'reservedTokens') return 200n * 10n ** 18n;
    if (fn === 'realQuoteReserve') return 100_000_000n;
    if (fn === 'getReserves') return [100_000_000n, 600n * 10n ** 18n];
    if (fn === 'getConfig') return { decimals: 6, enabled: false };
    throw Error(`unexpected ${fn}`);
  } } as unknown as ChainClient;
  try {
    const first = await indexer.discover(START_BLOCK + 100); const second = await indexer.discover(START_BLOCK + 101);
    assert.equal(first[0].launch.socials?.twitter, 'https://x.com/real'); assert.equal(first[0].launch.quoteSymbol, 'USDC'); assert.equal(first[0].launch.bondingProgressBps, 5000);
    assert.equal(first[0].launch.supplyRaw, (900n * 10n ** 18n).toString()); assert.equal(first[0].launch.launchSupplyRaw, (1000n * 10n ** 18n).toString());
    assert.equal(calls.filter(c => c.includes(':getTokenInfo:')).length, 1); assert.equal(calls.filter(c => c.startsWith(USDC) && c.includes(':symbol:')).length, 1);
    assert.equal(second[0].launch.priceX18, '166666666666666666');
  } finally { store.close(); }
});

test('range errors bisect until accepted and single-block failure leaves batch uncommitted', async () => {
  const store = new Store(':memory:'); const indexer = new Indexer(store, 'http://unused.invalid');
  let failed = false; let calls = 0;
  indexer.client = { getLogs: async ({ fromBlock, toBlock }: { fromBlock: bigint; toBlock: bigint }) => {
    calls++; if (toBlock - fromBlock > 24n || failed) throw Error('block range too large'); return [];
  }, getBlock: async () => ({ hash, timestamp: 1000n }) } as unknown as ChainClient;
  try {
    await indexer.scan('beneficiary', START_BLOCK + 99, [TOKEN]); assert.equal(calls, 7); assert.equal(store.cursor('beneficiary', START_BLOCK), START_BLOCK + 99);
    failed = true; await assert.rejects(indexer.scan('beneficiary', START_BLOCK + 199, [TOKEN]), /range/);
    assert.equal(store.cursor('beneficiary', START_BLOCK), START_BLOCK + 99);
  } finally { store.close(); }
});
