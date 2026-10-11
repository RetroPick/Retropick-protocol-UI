// Read-only HTTP surface for the Envio market radar.
// GET /health — token configured + last processed block
// GET /radar — latest metrics snapshot (bigint-safe JSON)
import { createServer } from 'node:http';
import { RadarAggregator, radarJson, marketStalenessS, type RadarMetrics } from './radar.ts';

const PORT = Number(process.env.RADAR_PORT ?? 8791);
const API_TOKEN = process.env.ENVIO_API_TOKEN ?? '';
const FACTORY = process.env.RADAR_FACTORY ?? '0xa7f18b9eceb0A9852b08408854A45D00fc682454';
const MARKET_TOKENS: Record<string, string> = JSON.parse(process.env.RADAR_MARKET_TOKENS ?? '{}');

async function main() {
  // Fails closed: without a token the HyperSync stream cannot start (verified 2026-10-11).
  if (!API_TOKEN) {
    console.error('ENVIO_API_TOKEN is required — Envio HyperSync endpoints are token-gated. See docs/metropolis/execution/EXTERNAL-BLOCKERS.md (BLOCKER-003).');
    process.exit(2);
  }
  const { createRadarStream } = await import('./stream.ts');
  const stream = await createRadarStream({
    apiToken: API_TOKEN,
    factory: FACTORY,
    marketTokens: MARKET_TOKENS,
    fromBlock: Number(process.env.RADAR_FROM_BLOCK ?? 69_509_526),
  });
  const server = createServer((req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    if (req.method !== 'GET') { res.statusCode = 405; return res.end(); }
    if (req.url === '/health') {
      const snapshot = stream.aggregator.snapshot();
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({ ok: true, source: 'ENVIO_HYPERSYNC', chainId: 10143, lastBlock: snapshot.lastBlock, markets: snapshot.markets.length }));
    }
    if (req.url === '/radar') {
      const snapshot: RadarMetrics = stream.aggregator.snapshot();
      const now = snapshot.computedAt;
      res.setHeader('content-type', 'application/json');
      return res.end(radarJson({ ...snapshot, markets: snapshot.markets.map((m) => ({ ...m, stalenessS: marketStalenessS(m, now) })) }));
    }
    res.statusCode = 404;
    return res.end();
  });
  server.listen(PORT, '127.0.0.1', () => console.log(`envio-market-radar on 127.0.0.1:${PORT} (fails closed; token configured)`));
  const shutdown = () => { stream.stop(); server.close(() => process.exit(0)); };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
  await stream.run().catch((error) => { console.error('radar stream failed:', error instanceof Error ? error.message : error); shutdown(); });
}

void main();
