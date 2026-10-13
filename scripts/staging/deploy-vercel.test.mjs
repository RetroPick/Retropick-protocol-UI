// node --test scripts/staging/deploy-vercel.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderVercelJson, publicEnv } from './deploy-vercel.mjs';

const template = readFileSync(new URL('./vercel.template.json', import.meta.url), 'utf8');

test('rewrites: same-origin API routes precede the SPA catch-all', () => {
  const out = JSON.parse(renderVercelJson(template, 'https://abc-def.trycloudflare.com'));
  const src = out.rewrites.map((r) => r.source);
  assert.deepEqual(src, ['/v1/:path*', '/health', '/api/referrals/:path*', '/api/media/:path*', '/api/radar/:path*', '/(.*)']);
  assert.equal(out.rewrites[0].destination, 'https://abc-def.trycloudflare.com/v1/:path*');
  assert.equal(out.outputDirectory, 'apps/retro-ui/dist');
});

test('bundle indexer base resolves on its own browser origin after domain cutover', () => {
  const env = Object.fromEntries(publicEnv('https://retropick-metropolis-retro-ui-stagi.vercel.app'));
  assert.equal(env.VITE_INDEXER_URL, 'same-origin');
  assert.doesNotMatch(env.VITE_INDEXER_URL, /trycloudflare/);
  assert.throws(() => publicEnv('https://x.vercel.app/'), /without path/);
  assert.throws(() => publicEnv('//x.vercel.app'));
  assert.throws(() => renderVercelJson(template, 'http://insecure.example'));
});
