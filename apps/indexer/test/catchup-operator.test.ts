import { test } from 'node:test';
import assert from 'node:assert/strict';

test('catch-up operator documentation and safety guards remain explicit', async () => {
  const source = await import('node:fs').then(fs => fs.promises.readFile(new URL('../scripts/liquidity-full-catchup.mjs', import.meta.url), 'utf8'));
  assert.match(source, /Never resets checkpoints/);
  assert.match(source, /address:addresses/);
  assert.match(source, /Unexpected grouped vault emitter/);
  assert.match(source, /Log block mismatch/);
  assert.match(source, /supplyReconciliation/);
  assert.match(source, /projection2SnapshotPreserved/);
});
