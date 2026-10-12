// parseMarketTokens must accept JSON AND the bare `0xm:0xt,…` form, because systemd
// EnvironmentFile (and shell `source`) strip the double-quotes from a JSON value.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMarketTokens } from '../src/server.ts';

const M = '0x1f5de72616a7fe645cf45ac66dfce8ac7452c57f';
const T = '0x43e7e9b1b7d9a143573307b13d14b51580c18f15';

test('parses proper JSON', () => {
  assert.deepEqual(parseMarketTokens(`{"${M}":"${T}"}`), { [M]: T });
});

test('parses the quote-stripped bare form (systemd EnvironmentFile)', () => {
  assert.deepEqual(parseMarketTokens(`{${M}:${T}}`), { [M]: T });
  assert.deepEqual(parseMarketTokens(`${M}:${T}`), { [M]: T });
});

test('lowercases and ignores malformed pairs; empty → {}', () => {
  assert.deepEqual(parseMarketTokens(`{${M.toUpperCase().replace('0X','0x')}:${T}}`), { [M]: T });
  assert.deepEqual(parseMarketTokens(`{${M}:0xnot,${M}:${T}}`), { [M]: T });
  assert.deepEqual(parseMarketTokens(''), {});
  assert.deepEqual(parseMarketTokens('{}'), {});
});
