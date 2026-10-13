import test from 'node:test';
import assert from 'node:assert/strict';
import { indexerOrigin } from '../src/lib/live/indexer-origin.ts';

test('same-origin indexer reads follow the actual frontend host', () => {
  for (const origin of ['https://retropick.xyz', 'https://retropick-metropolis-retro-ui-stagi.vercel.app'])
    assert.equal(indexerOrigin('same-origin', origin) + '/v1/launches', origin + '/v1/launches');
});
test('explicit local and external indexer configuration remains supported', () => {
  assert.equal(indexerOrigin('http://127.0.0.1:8787/', 'https://retropick.xyz'), 'http://127.0.0.1:8787');
});
