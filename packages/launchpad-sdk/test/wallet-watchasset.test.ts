import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWatchAssetPayload, watchAsset } from '../src/wallet.ts';

const TOKEN = '0xc399c1a37d1d202d315f7f4c1a24e34c8e50e50f' as const;
const IMAGE = 'https://gateway.pinata.cloud/ipfs/QmSHMEd2FMpQfEzuzMt3arZCStvrY9g4QjU6pJsZNLkKND';

type Recorded = { method: string; params?: unknown };

function fakeProvider(options: { chainId?: string; result?: unknown; error?: unknown } = {}) {
 const requests: Recorded[] = [];
 const provider = {
    async request(args: { method: string; params?: unknown }) {
      requests.push(args.params === undefined ? { method: args.method } : { method: args.method, params: args.params });
   if (args.method === 'eth_chainId') return options.chainId ?? '0x279f';
   if (args.method === 'wallet_watchAsset') {
    if (options.error) throw options.error;
    return options.result ?? true;
   }
   throw Object.assign(new Error(`unexpected ${args.method}`), { code: -32601 });
  },
 };
 return { requests, provider };
}

test('payload keeps the exact EIP-747 shape and includes only fetchable https images', () => {
 assert.deepEqual(buildWatchAssetPayload({ address: TOKEN, symbol: 'CIS', decimals: 18, image: IMAGE }), {
  type: 'ERC20',
  options: { address: TOKEN, symbol: 'CIS', decimals: 18, image: IMAGE },
 });
});

test('payload omits the image field entirely when it is null, ipfs:// or http://', () => {
 const expected = { type: 'ERC20', options: { address: TOKEN, symbol: 'CIS', decimals: 18 } };
 for (const image of [null, undefined, '', 'ipfs://QmSHMEd2FMpQfEzuzMt3arZCStvrY9g4QjU6pJsZNLkKND', 'http://127.0.0.1:8790/api/media/x.gif', 'data:image/gif;base64,R0lGOD']) {
  assert.deepEqual(buildWatchAssetPayload({ address: TOKEN, symbol: 'CIS', decimals: 18, image }), expected, `image=${String(image)}`);
 }
});

test('watchAsset sends the single-object params and maps the wallet result to a boolean', async () => {
 for (const result of [true, false]) {
  const { requests, provider } = fakeProvider({ result });
  assert.equal(await watchAsset(provider, { address: TOKEN, symbol: 'CIS', decimals: 18, image: IMAGE }), result);
  assert.deepEqual(requests, [{ method: 'eth_chainId' }, { method: 'wallet_watchAsset', params: buildWatchAssetPayload({ address: TOKEN, symbol: 'CIS', decimals: 18, image: IMAGE }) }]);
 }
});

test('watchAsset refuses to ask a wallet on another chain and issues zero watchAsset requests', async () => {
 const { requests, provider } = fakeProvider({ chainId: '0x1' });
 await assert.rejects(() => watchAsset(provider, { address: TOKEN, symbol: 'CIS', decimals: 18, image: IMAGE }), (error: unknown) => {
  assert.equal((error as { code?: string }).code, 'WRONG_CHAIN');
  assert.ok(String((error as Error).message).includes('10143'));
  return true;
 });
 assert.deepEqual(requests.map((r) => r.method), ['eth_chainId']);
});

test('user rejection (4001) and unsupported method (-32601) propagate typed, never swallowed', async () => {
 const rejected = fakeProvider({ error: Object.assign(new Error('user rejected'), { code: 4001 }) });
 await assert.rejects(() => watchAsset(rejected.provider, { address: TOKEN, symbol: 'CIS', decimals: 18 }), (error: unknown) => (error as { code?: number }).code === 4001);
 const unsupported = fakeProvider({ error: Object.assign(new Error('not supported'), { code: -32601 }) });
 await assert.rejects(() => watchAsset(unsupported.provider, { address: TOKEN, symbol: 'CIS', decimals: 18 }), (error: unknown) => (error as { code?: number }).code === -32601);
});
