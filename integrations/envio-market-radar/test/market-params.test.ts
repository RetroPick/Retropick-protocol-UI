import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMarketParams } from '../src/market-params.ts';

const TOKEN = '0x43e7e9b1b7d9a143573307b13d14b51580c18f15';
const PARAMS = [100_000_000n, 100_000_000n, TOKEN, 18n, '0x0000000000000000000000000000000000000000', 18n, 1n, 1_000_000n, 10_000_000_000_000_000n, 30n, 0n];

test('verified Router registration and mapped token qualify exact native-MON units', () => {
  assert.deepEqual(validateMarketParams(TOKEN, PARAMS, [...PARAMS]), { token: TOKEN, baseDecimals: 18, sizePrecision: 100_000_000n });
});

test('wrong token, unregistered/changed market, invalid precision/decimals and unsupported quote fail closed', () => {
  assert.equal(validateMarketParams('0xwrong', PARAMS, PARAMS), null);
  assert.equal(validateMarketParams(TOKEN, PARAMS, [...PARAMS.slice(0, 10), 1n]), null);
  for (const [index, value] of [[1, 0n], [3, 256n], [4, TOKEN], [5, 6n]] as const) {
    const changed = [...PARAMS]; changed[index] = value;
    assert.equal(validateMarketParams(TOKEN, changed, changed), null);
  }
});
