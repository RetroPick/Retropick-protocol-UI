import test from 'node:test';
import assert from 'node:assert/strict';
import { ticketLaunch, ticketKuru } from '../../src/lib/live/trade-ticket-inputs.ts';

test('ticket boundary preserves large exact reserves and isolates SDK ABI tuples', () => {
  const reserve = 123456789012345678901234567890n;
  const source = { token:'token',symbol:'SYMBOL',ledger:{phase:0},packet:{quoteDecimals:18},receipt:{market:'market'},remaining:reserve,fee:100n,tax:20n,balance:reserve,quoteBalance:reserve,
    reserves:[reserve,reserve+1n],completion:[2n,3n],record:[4n,5n] };
  const projected = ticketLaunch(source);
  assert.equal(projected.reserveQuoteRaw,reserve);
  assert.equal(projected.reserveTokenRaw,reserve+1n);
  assert.equal(projected.balance,reserve);
  assert.equal(projected.fee,100n);
  assert.equal(projected.tax,20n);
  assert.equal(projected.ledger,source.ledger);
  assert.equal(Object.values(projected).some(Array.isArray),false);
  assert.deepEqual(source.reserves,[reserve,reserve+1n]);
  assert.equal('completion' in projected,false);
  assert.equal('record' in projected,false);
});
test('Kuru ticket gets exact balances and no profiler-unsafe market or best-price tuple', () => {
  const source={params:[1n,2n],best:[3n,4n],quoteBalance:900719925474099312345n,baseBalance:900719925474099312346n};
  assert.deepEqual(ticketKuru(source),{quoteBalance:source.quoteBalance,baseBalance:source.baseBalance});
  assert.deepEqual(source.params,[1n,2n]);
  assert.equal(ticketLaunch(null),null);
  assert.equal(ticketKuru(null),null);
});
