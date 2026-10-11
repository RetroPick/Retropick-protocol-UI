// Staging gateway: one loopback entry point fronting the RetroPick services so a single
// cloudflared quick tunnel can carry all of them. EXPLICIT ALLOWLIST — no catch-all:
//   GET|HEAD|OPTIONS /v1/* and /health → indexer        (127.0.0.1:8787)  read-only
//   *                /api/referrals/*   → referral-service (127.0.0.1:8788)
//   *                /api/media/*       → media-service    (127.0.0.1:8790)
//   GET|HEAD|OPTIONS /api/radar/*       → envio radar      (127.0.0.1:8791)  ONLY if STAGING_GATEWAY_RADAR=1
//   anything else                       → 404 STAGING_GATEWAY_ROUTE_NOT_ALLOWED
// Dependency-free (node:http). No CORS mutation — referral/media are consumed same-origin
// through the Vercel rewrite chain; the indexer sends its own read-only CORS headers.
import { createServer, request as httpRequest } from 'node:http';
import { pathToFileURL } from 'node:url';

const READ = new Set(['GET', 'HEAD', 'OPTIONS']);
const ANY = null;
// Hop-by-hop headers must not be forwarded (RFC 9110 §7.6.1).
const HOP = ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade'];
const NON_MEDIA_BODY_LIMIT = 64 * 1024;

export function buildRoutes(env = process.env) {
  const routes = [
    { match: (p) => p === '/health' || p === '/v1' || p.startsWith('/v1/'), methods: READ, target: { host: '127.0.0.1', port: Number(env.STAGING_INDEXER_PORT ?? 8787) }, name: 'indexer' },
    { match: (p) => p.startsWith('/api/referrals/'), methods: ANY, target: { host: '127.0.0.1', port: Number(env.STAGING_REFERRAL_PORT ?? 8788) }, name: 'referral' },
    { match: (p) => p.startsWith('/api/media/'), methods: ANY, target: { host: '127.0.0.1', port: Number(env.STAGING_MEDIA_PORT ?? 8790) }, name: 'media', bodyLimit: Infinity },
  ];
  if (env.STAGING_GATEWAY_RADAR === '1') routes.push({ match: (p) => p.startsWith('/api/radar/'), methods: READ, target: { host: '127.0.0.1', port: Number(env.STAGING_RADAR_PORT ?? 8791) }, name: 'radar' });
  return routes;
}

/** Resolve a request to a route, or a denial reason. Path normalisation rejects traversal/encoded tricks. */
export function resolveRoute(routes, method, rawUrl) {
  let pathname;
  try { pathname = new URL(rawUrl ?? '/', 'http://gateway.local').pathname; } catch { return { deny: 400, error: 'STAGING_GATEWAY_BAD_URL' }; }
  const rawPath = (rawUrl ?? '/').split('?')[0];
  if (/\.\.|%2e|%2f|%5c|\\/i.test(rawPath)) return { deny: 400, error: 'STAGING_GATEWAY_BAD_URL' };
  const route = routes.find((r) => r.match(pathname));
  if (!route) return { deny: 404, error: 'STAGING_GATEWAY_ROUTE_NOT_ALLOWED' };
  if (route.methods && !route.methods.has(method)) return { deny: 405, error: 'STAGING_GATEWAY_METHOD_NOT_ALLOWED' };
  return { route };
}

function json(res, status, body) {
  if (res.headersSent) return res.end();
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

export function createGateway(env = process.env) {
  const routes = buildRoutes(env);
  const timeoutMs = Number(env.STAGING_GATEWAY_UPSTREAM_TIMEOUT_MS ?? 15_000);
  return createServer((req, res) => {
    const resolved = resolveRoute(routes, req.method, req.url);
    if (!resolved.route) { req.resume(); return json(res, resolved.deny, { error: resolved.error }); }
    const { route } = resolved;
    const limit = route.bodyLimit ?? NON_MEDIA_BODY_LIMIT;
    const declared = Number(req.headers['content-length'] ?? 0);
    if (declared > limit) { req.resume(); return json(res, 413, { error: 'STAGING_GATEWAY_BODY_TOO_LARGE' }); }
    const headers = { ...req.headers };
    for (const h of HOP) delete headers[h];
    headers['x-forwarded-host'] = req.headers['x-forwarded-host'] ?? req.headers.host ?? '';
    headers['x-forwarded-proto'] = req.headers['x-forwarded-proto'] ?? 'https';
    const upstream = httpRequest({ host: route.target.host, port: route.target.port, method: req.method, path: req.url, headers, timeout: timeoutMs }, (up) => {
      const out = { ...up.headers };
      for (const h of HOP) delete out[h];
      res.writeHead(up.statusCode ?? 502, out);
      up.pipe(res);
    });
    upstream.on('timeout', () => upstream.destroy(Object.assign(new Error('upstream timeout'), { code: 'ETIMEDOUT' })));
    upstream.on('error', (error) => json(res, error.code === 'ETIMEDOUT' ? 504 : 502, { error: 'STAGING_GATEWAY_UPSTREAM_UNAVAILABLE', upstream: route.name, reason: error.code ?? 'error' }));
    let seen = 0;
    req.on('data', (chunk) => { seen += chunk.length; if (seen > limit) { upstream.destroy(); json(res, 413, { error: 'STAGING_GATEWAY_BODY_TOO_LARGE' }); req.destroy(); } });
    req.pipe(upstream);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const PORT = Number(process.env.STAGING_GATEWAY_PORT ?? 8799);
  const server = createGateway();
  server.listen(PORT, '127.0.0.1', () => console.log(`staging-gateway on 127.0.0.1:${PORT} allowlist: /v1/* /health → :8787 · /api/referrals/* → :8788 · /api/media/* → :8790${process.env.STAGING_GATEWAY_RADAR === '1' ? ' · /api/radar/* → :8791' : ''} · else 404`));
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
