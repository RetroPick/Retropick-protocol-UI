import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertPublicRpcEnv } from '../scripts/public-rpc-env.ts';
test('public-safe RPC and same-origin gateway config pass', () => {
  assertPublicRpcEnv({VITE_MONAD_RPC_URL:'https://testnet-rpc.monad.xyz',VITE_MONAD_RPC_FALLBACK_URL:'/api/rpc'});
});
test('private browser credentials fail without exposing values', () => {
  for (const url of ['https://monad-testnet.infura.io/v3/private-project', 'https://username:password@rpc.example', 'https://rpc.example?api_key=secret', `https://rpc.example/${'a'.repeat(32)}`,'file:///etc/passwd']) {
    assert.throws(() => assertPublicRpcEnv({VITE_MONAD_RPC_URL:url}), error => error.message.includes('cannot embed') && !error.message.includes(url) && !error.message.includes('private-project') && !error.message.includes('password'));
  }
});
