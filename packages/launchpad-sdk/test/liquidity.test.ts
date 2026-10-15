import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zeroAddress, type Address, type Hex } from 'viem';
import { release, type ChainClient } from '../src/chain.ts';
import { readKuruLiquidity } from '../src/liquidity.ts';

const token = '0x1111111111111111111111111111111111111111' as Address;
const market = '0x2222222222222222222222222222222222222222' as Address;
const vault = '0x3333333333333333333333333333333333333333' as Address;
const lpLock = '0x4444444444444444444444444444444444444444' as Address;
const account = '0x5555555555555555555555555555555555555555' as Address;
const quote = '0x6666666666666666666666666666666666666666' as Address;
const hash = `0x${'a'.repeat(64)}` as Hex;
const block = 77n;
const words = (...values: bigint[]) => `0x${values.map(value => value.toString(16).padStart(64, '0')).join('')}` as Hex;
type Call = { address: Address; functionName: string; args?: readonly unknown[]; blockNumber?: bigint };

function fixture(options: { quoteDecimals?: number; blockNumber?: bigint; accountShares?: bigint; overrides?: Record<string, unknown> } = {}) {
  const blockNumber = options.blockNumber ?? block;
  const quoteDecimals = options.quoteDecimals ?? 18;
  const quoteAsset = quoteDecimals === 6 ? quote : zeroAddress;
  const params = [100_000_000, 100_000_000n, token, 18n, quoteAsset, BigInt(quoteDecimals), 1, 1_000_000n, 10n ** 16n, 30n, 0n];
  const protectedAmount = 10n ** 20n;
  const calls: Call[] = [];
  const codeReads: { address: Address; blockNumber: bigint }[] = [];
  const headerReads: bigint[] = [];
  const values: Record<string, unknown> = {
    packet: { token, quoteAsset, quoteDecimals, venue: 1, protectedLPReceiver: lpLock, protectedExcessReceiver: lpLock },
    ledger: { phase: 2, protectedLPReceiver: lpLock, protectedExcessReceiver: lpLock, protectedLPAmount: protectedAmount, protectedExcessAmount: 3n },
    receipt: { market, vault, lpAsset: vault, protectedLPReceiver: lpLock, protectedExcessReceiver: lpLock },
    getMarketParams: params, verifiedMarket: params,
    getVaultParams: [vault, 3960396039603960n, 2_000_000n, 4_000_000_000_000_000n, 5_000_000n, 10_000_000n, 20_000_000n, 100n],
    marginAccountAddress: release.kuruEnvironment.marginAccount,
    orderBookImplementation: release.kuruEnvironment.orderBookImplementation,
    kuruAmmVaultImplementation: release.kuruEnvironment.vaultImplementation,
    token1: token, token2: quoteAsset, market, marginAccount: release.kuruEnvironment.marginAccount,
    owner: release.kuruEnvironment.router, launchToken: token, quoteToken: quoteAsset, vault,
    totalAssets: [2n ** 200n, 123n * 10n ** BigInt(quoteDecimals)], totalSupply: protectedAmount + 1000n,
    decimals: 18, bestBidAsk: [3960396039603960n, 4_000_000_000_000_000n], marketState: 0,
    protectedBalances: [protectedAmount, 3n],
    balanceOf: (call: Call) => String(call.args?.[0]).toLowerCase() === release.kuruEnvironment.marginAccount.toLowerCase() ? 1000n : options.accountShares ?? 7n,
    previewWithdraw: [41n, 59n], getL2Book: words(blockNumber, 0n), validate: undefined,
    ...options.overrides,
  };
  const chain = {
    getChainId: async () => 10143,
    getBlockNumber: async () => blockNumber,
    getBlock: async ({ blockNumber: at }: { blockNumber: bigint }) => { headerReads.push(at); return { number: at, hash }; },
    getCode: async (call: { address: Address; blockNumber: bigint }) => { codeReads.push(call); return '0x6000'; },
    readContract: async (call: Call) => {
      calls.push(call);
      if (!(call.functionName in values)) throw Error(`Unexpected ${call.functionName}`);
      const value = values[call.functionName];
      return typeof value === 'function' ? value(call) : value;
    },
  } as unknown as ChainClient;
  return { chain, calls, values, codeReads, headerReads };
}

test('empty CLOB coexists with exact funded vault, combined prices and protected/infrastructure shares', async () => {
  const f = fixture();
  const state = await readKuruLiquidity(f.chain, token, { account });
  assert.equal(state.blockNumber, block); assert.equal(state.blockHash, hash);
  assert.equal(state.clob.status, 'available'); assert.deepEqual(state.clob.data, { block, bids: [], asks: [] });
  assert.equal(state.vault.status, 'available');
  if (state.vault.status !== 'available') throw Error('Expected vault state');
  assert.equal(state.vault.data.baseAssetsRaw, 2n ** 200n);
  assert.equal(state.vault.data.bidAvailableBaseRaw, 80_000_000_000_000_000n);
  assert.equal(state.vault.data.askAvailableBaseRaw, 150_000_000_000_000_000n);
  assert.equal(state.bestExecutable.data?.askX18, 4_000_000_000_000_000n);
  assert.deepEqual(state.custody.data, { lockedSharesRaw: 10n ** 20n, excessBaseRaw: 3n, infrastructureSharesRaw: 1000n });
  assert.deepEqual(state.position.data, { account, sharesRaw: 7n, previewBaseRaw: 41n, previewQuoteRaw: 59n, kind: 'wallet' });
  assert.ok(f.calls.every(call => call.blockNumber === block));
  assert.ok(f.codeReads.every(call => call.blockNumber === block)); assert.deepEqual(f.headerReads, [block, block]);
  assert.equal(f.calls.filter(call => call.functionName === 'getVaultParams').length, 1);
  assert.equal(f.calls.find(call => call.functionName === 'previewWithdraw')?.args?.[0], 7n);
});

test('6-decimal quotes retain human X18 prices while reserve amounts retain quote atomic units', async () => {
  const state = await readKuruLiquidity(fixture({ quoteDecimals: 6 }).chain, token);
  assert.equal(state.identity.quoteAsset, quote); assert.equal(state.identity.quoteDecimals, 6);
  assert.equal(state.vault.data?.quoteAssetsRaw, 123_000_000n);
  assert.equal(state.vault.data?.askX18, 4_000_000_000_000_000n);
  assert.equal(state.bestExecutable.data?.bidX18, 3960396039603960n);
});

test('optional read failures preserve other observations and redact provider-controlled errors', async () => {
  const secretFailure = () => { throw Error('https://rpc.example/private-key?secret=token'); };
  const state = await readKuruLiquidity(fixture({ overrides: { totalAssets: secretFailure } }).chain, token, { account });
  assert.equal(state.vault.status, 'unavailable');
  assert.equal(state.vault.status === 'unavailable' && state.vault.error, 'LIQUIDITY_READ_UNAVAILABLE');
  assert.equal(state.clob.status, 'available'); assert.equal(state.bestExecutable.status, 'available');
  assert.equal(state.custody.status, 'available'); assert.equal(state.position.status, 'available');
});

test('omitted reads are distinct from failures and never issue book/account reads', async () => {
  const f = fixture(); const state = await readKuruLiquidity(f.chain, token, { includeBook: false });
  assert.equal(state.clob.status, 'not-requested'); assert.equal(state.position.status, 'not-requested');
  assert.equal(f.calls.some(call => call.functionName === 'getL2Book' || call.functionName === 'previewWithdraw'), false);
  assert.equal(f.calls.filter(call => call.functionName === 'balanceOf').length, 1);
});

test('unavailable book and account previews never become zero balances', async () => {
  const f = fixture({ overrides: { getL2Book: () => { throw Error('offline'); }, previewWithdraw: () => { throw Error('revert'); } } });
  const state = await readKuruLiquidity(f.chain, token, { account });
  assert.equal(state.clob.status, 'unavailable'); assert.equal(state.clob.data, null);
  assert.equal(state.position.status, 'unavailable'); assert.equal(state.position.data, null);
  assert.equal(state.vault.status, 'available');
});

test('actual zero shares are available without invoking a possibly reverting zero-share preview', async () => {
  const f = fixture({ accountShares: 0n }); const state = await readKuruLiquidity(f.chain, token, { account });
  assert.equal(state.position.status, 'available'); assert.equal(state.position.data?.sharesRaw, 0n);
  assert.equal(state.position.data?.previewBaseRaw, 0n); assert.equal(f.calls.some(call => call.functionName === 'previewWithdraw'), false);
});

test('missing-price sentinels normalize to null and paused state is retained independently of inventory', async () => {
  const f = fixture({ overrides: { bestBidAsk: [2n ** 256n - 1n, 0n], marketState: 2,
    getVaultParams: [vault, 0n, 0n, 2n ** 256n - 1n, 0n, 0n, 0n, 100n] } });
  const state = await readKuruLiquidity(f.chain, token);
  assert.deepEqual(state.bestExecutable.data, { bidX18: null, askX18: null, marketState: 2 });
  assert.equal(state.vault.data?.bidX18, null); assert.equal(state.vault.data?.askX18, null);
  assert.equal(state.vault.data?.baseAssetsRaw, 2n ** 200n);
});

test('invalid partial-filled sizes mark vault unknown instead of clamping into zero depth', async () => {
  const f = fixture({ overrides: { getVaultParams: [vault, 1n, 11n, 2n, 0n, 10n, 10n, 100n] } });
  const state = await readKuruLiquidity(f.chain, token);
  assert.equal(state.vault.status, 'unavailable'); assert.equal(state.bestExecutable.status, 'available');
});

test('wallet position explicitly distinguishes protected protocol and infrastructure custody', async () => {
  assert.equal((await readKuruLiquidity(fixture().chain, token, { account: lpLock })).position.data?.kind, 'protocol-lock');
  assert.equal((await readKuruLiquidity(fixture().chain, token, { account: release.kuruEnvironment.marginAccount as Address })).position.data?.kind, 'infrastructure');
});

test('Coordinator, vault, lock, Router and environment substitutions fail closed', async () => {
  for (const override of [
    { packet: { ...fixture().values.packet as object, token: account } },
    { ledger: { ...fixture().values.ledger as object, phase: 1 } },
    { receipt: { ...fixture().values.receipt as object, lpAsset: account } },
    { token2: account }, { marginAccount: account }, { launchToken: account }, { quoteToken: account },
    { vault: account }, { owner: account }, { orderBookImplementation: account },
    { validate: () => { throw Error('environment drift'); } },
  ]) await assert.rejects(() => readKuruLiquidity(fixture({ overrides: override }).chain, token));
  const f = fixture(); f.chain.getCode = async () => '0x'; await assert.rejects(() => readKuruLiquidity(f.chain, token), /code/);
});

test('wrong-chain clients reject before reading untrusted launch contracts', async () => {
  const f = fixture(); f.chain.getChainId = async () => 1;
  await assert.rejects(() => readKuruLiquidity(f.chain, token), /Monad Testnet/); assert.equal(f.calls.length, 0);
});

test('historical reads stay anchored and reject reorgs or a book from another block', async () => {
  const f = fixture({ blockNumber: 42n });
  f.chain.getBlockNumber = async () => { throw Error('Must use explicit block'); };
  const state = await readKuruLiquidity(f.chain, token, { blockNumber: 42n }); assert.equal(state.blockNumber, 42n);
  assert.ok(f.calls.every(call => call.blockNumber === 42n));
  const changed = fixture(); let headers = 0;
  changed.chain.getBlock = async () => ({ number: block, hash: ++headers === 1 ? hash : `0x${'b'.repeat(64)}` }) as never;
  await assert.rejects(() => readKuruLiquidity(changed.chain, token), /changed during reads/);
  assert.equal((await readKuruLiquidity(fixture({ overrides: { getL2Book: words(block - 1n, 0n) } }).chain, token)).clob.status, 'unavailable');
});

test('protected custody shortages are unavailable rather than shown as healthy custody', async () => {
  const state = await readKuruLiquidity(fixture({ overrides: { protectedBalances: [0n, 0n] } }).chain, token);
  assert.equal(state.custody.status, 'unavailable'); assert.equal(state.vault.status, 'available');
});
