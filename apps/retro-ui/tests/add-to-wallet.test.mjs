import test from 'node:test';import assert from 'node:assert/strict';
import { classifyWatchAssetError, watchAssetAction, addToWalletPayload } from '../src/features/launchpad/add-to-wallet.ts';

// Wallet-image resolution (registry derivatives, manifest integrity) has its own suite:
// tests/wallet-icons.test.mjs. This file keeps the pure interaction-state coverage.

const TOKEN='0xc399c1a37d1d202d315f7f4c1a24e34c8e50e50f';
const CID='QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
const GATEWAY=`https://gateway.pinata.cloud/ipfs/${CID}`;

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

test('addToWalletPayload carries the on-chain decimals and resolves logos through the wallet resolver',()=>{
  assert.deepEqual(addToWalletPayload({address:TOKEN,symbol:'CIS',decimals:18,logo:GATEWAY}),
    {type:'ERC20',options:{address:TOKEN,symbol:'CIS',decimals:18,image:GATEWAY}}); // Plain https passes through.
  assert.deepEqual(addToWalletPayload({address:TOKEN,symbol:'CIS',decimals:6,logo:`ipfs://${CID}`}),
    {type:'ERC20',options:{address:TOKEN,symbol:'CIS',decimals:6,image:GATEWAY}}); // Unregistered ipfs:// keeps metadata via the gateway.
  assert.deepEqual(addToWalletPayload({address:TOKEN,symbol:'CIS',decimals:18,logo:'http://insecure/x.gif'}),
    {type:'ERC20',options:{address:TOKEN,symbol:'CIS',decimals:18}}); // Unfetchable → no image field, registration still valid.
});
