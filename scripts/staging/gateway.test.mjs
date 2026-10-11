// node --test scripts/staging/gateway.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { buildRoutes, resolveRoute, createGateway } from './gateway.mjs';

test('allowlist: indexer read routes, referral, media; radar only behind flag', () => {
  const r = buildRoutes({});
  assert.equal(resolveRoute(r, 'GET', '/v1/launches?limit=5').route.name, 'indexer');
  assert.equal(resolveRoute(r, 'HEAD', '/health').route.name, 'indexer');
  assert.equal(resolveRoute(r, 'POST', '/api/referrals/challenge').route.name, 'referral');
  assert.equal(resolveRoute(r, 'POST', '/api/media/upload').route.name, 'media');
  assert.equal(resolveRoute(r, 'GET', '/api/radar/radar').deny, 404);
  assert.equal(resolveRoute(buildRoutes({ STAGING_GATEWAY_RADAR: '1' }), 'GET', '/api/radar/radar').route.name, 'radar');
});

test('deny: unknown paths, writes to indexer, traversal', () => {
  const r = buildRoutes({});
  for (const p of ['/', '/admin', '/metrics', '/v1x', '/.data/monad-testnet.sqlite', '/healthz']) assert.equal(resolveRoute(r, 'GET', p).deny, 404, p);
  assert.equal(resolveRoute(r, 'POST', '/v1/launches').deny, 405);
  assert.equal(resolveRoute(r, 'DELETE', '/health').deny, 405);
  assert.equal(resolveRoute(r, 'GET', '/v1/../admin').deny, 400);
  assert.equal(resolveRoute(r, 'GET', '/api/media/%2e%2e/x').deny, 400);
  assert.ok(resolveRoute(r, 'GET', '/v1/search?q=a..b').route, 'dots in query are fine');
});

function listen(server) { return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server.address().port))); }

test('proxies allowed route, 404s denied route, 502s dead upstream', async () => {
  const upstream = createServer((req, res) => { res.writeHead(200, { 'content-type': 'application/json', connection: 'close' }); res.end(JSON.stringify({ path: req.url, fwd: req.headers['x-forwarded-proto'] })); });
  const upPort = await listen(upstream);
  const gw = createGateway({ STAGING_INDEXER_PORT: String(upPort), STAGING_REFERRAL_PORT: '1' });
  const port = await listen(gw);
  try {
    const ok = await fetch(`http://127.0.0.1:${port}/v1/launches?limit=1`);
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { path: '/v1/launches?limit=1', fwd: 'https' });
    const denied = await fetch(`http://127.0.0.1:${port}/admin`);
    assert.equal(denied.status, 404);
    assert.equal((await denied.json()).error, 'STAGING_GATEWAY_ROUTE_NOT_ALLOWED');
    const dead = await fetch(`http://127.0.0.1:${port}/api/referrals/health`);
    assert.equal(dead.status, 502);
    assert.equal((await dead.json()).upstream, 'referral');
    const big = await fetch(`http://127.0.0.1:${port}/api/referrals/x`, { method: 'POST', body: 'x'.repeat(70 * 1024) });
    assert.equal(big.status, 413);
  } finally { gw.close(); upstream.close(); }
});
