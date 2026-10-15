import test from 'node:test';import assert from 'node:assert/strict';
import { httpsImageUrl, classifyWatchAssetError, watchAssetAction, addToWalletPayload } from '../src/features/launchpad/add-to-wallet.ts';

const TOKEN='0xc399c1a37d1d202d315f7f4c1a24e34c8e50e50f';
const CID='QmSHMEd2FMpQfEzuzMt3arZCStvrY9g4QjU6pJsZNLkKND';
const GATEWAY=`https://gateway.pinata.cloud/ipfs/${CID}`;

test('httpsImageUrl keeps only wallet-fetchable https sources',()=>{
  assert.equal(httpsImageUrl(GATEWAY),GATEWAY);
  assert.equal(httpsImageUrl(`  ${GATEWAY}  `),GATEWAY); // Trimmed.
  assert.equal(httpsImageUrl(`ipfs://${CID}`),null); // Wallets cannot fetch ipfs://.
  assert.equal(httpsImageUrl('http://127.0.0.1:8790/api/media/ab.gif'),null); // Mixed-content http never reaches the wallet.
  assert.equal(httpsImageUrl('data:image/gif;base64,R0lGOD'),null);
  assert.equal(httpsImageUrl(''),null);
  assert.equal(httpsImageUrl(null),null);
  assert.equal(httpsImageUrl(undefined),null);
});

test('watchAsset failures map to precise UI copy triggers',()=>{
  assert.equal(classifyWatchAssetError(Object.assign(new Error('x'),{code:4001})),'rejected');
  assert.equal(classifyWatchAssetError(Object.assign(new Error('x'),{code:'4001'})),'rejected');
  assert.equal(classifyWatchAssetError(Object.assign(new Error('x'),{code:-32601})),'unsupported');
  assert.equal(classifyWatchAssetError(Object.assign(new Error('x'),{code:'WRONG_CHAIN'})),'wrong-chain');
  assert.equal(classifyWatchAssetError(new Error('MetaMask: user rejected the request')),'rejected');
  assert.equal(classifyWatchAssetError(new Error('wallet_watchAsset is not supported here')),'unsupported');
  assert.equal(classifyWatchAssetError(new Error('RPC timeout')),'failed');
  assert.equal(classifyWatchAssetError(undefined),'failed');
});

test('the button routes each wallet state to its preceding wallet interaction',()=>{
  assert.equal(watchAssetAction('disconnected'),'connect');
  assert.equal(watchAssetAction('connecting'),'connect');
  assert.equal(watchAssetAction('wrong-chain'),'switch-chain');
  assert.equal(watchAssetAction('connected'),'request');
});

test('addToWalletPayload carries the on-chain decimals and filters the logo through the https rule',()=>{
  assert.deepEqual(addToWalletPayload({address:TOKEN,symbol:'CIS',decimals:18,logo:GATEWAY}),
    {type:'ERC20',options:{address:TOKEN,symbol:'CIS',decimals:18,image:GATEWAY}});
  assert.deepEqual(addToWalletPayload({address:TOKEN,symbol:'CIS',decimals:18,logo:`ipfs://${CID}`}),
    {type:'ERC20',options:{address:TOKEN,symbol:'CIS',decimals:18}}); // ipfs:// logo → no image field, registration still valid.
});
