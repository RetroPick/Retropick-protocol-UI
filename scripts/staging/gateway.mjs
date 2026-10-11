// Staging gateway: one loopback entry point fronting the three RetroPick services so a
// single cloudflared quick tunnel can carry all of them.
//   /api/referrals/* → referral-service (127.0.0.1:8788)
//   /api/media/*     → media-service    (127.0.0.1:8790)
//   everything else  → indexer          (127.0.0.1:8787)  [/v1/*, /health]
// Dependency-free (node:http). Read/write passthrough; no CORS mutation — the indexer
// already sends `Access-Control-Allow-Origin: *`, and referral/media are consumed
// same-origin through the Vercel rewrite chain (this gateway is that chain's upstream).
import { createServer, request as httpRequest } from 'node:http';

const PORT = Number(process.env.STAGING_GATEWAY_PORT ?? 8799);
const ROUTES = [
  { prefix: '/api/referrals/', target: { host: '127.0.0.1', port: 8788 } },
  { prefix: '/api/media/', target: { host: '127.0.0.1', port: 8790 } },
];
const DEFAULT_TARGET = { host: '127.0.0.1', port: 8787 };

const server = createServer((req, res) => {
  const target = ROUTES.find((r) => req.url?.startsWith(r.prefix))?.target ?? DEFAULT_TARGET;
  const upstream = httpRequest(
    { host: target.host, port: target.port, method: req.method, path: req.url, headers: req.headers },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );
  upstream.on('error', (error) => {
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'STAGING_GATEWAY_UPSTREAM_UNAVAILABLE', target: `${target.host}:${target.port}`, reason: error.code ?? error.message }));
  });
  req.pipe(upstream);
});

server.listen(PORT, '127.0.0.1', () => console.log(`staging-gateway on 127.0.0.1:${PORT} → referrals:8788 media:8790 default-indexer:8787`));
const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
