// Read-only HTTP surface for the Envio market radar.
// GET /health — token configured + processing cursor + freshness metrics
// GET /radar  — latest metrics snapshot (bigint-safe JSON)
// FAILS CLOSED without ENVIO_API_TOKEN (exit 2). The chat-exposed token may only be
// used for LOCAL DEV-RUN VALIDATION — not activated in any public-facing service
// until the operator confirms rotation (operator correction, 2026-10-11).
import { createServer } from 'node:http';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marketStalenessS } from './radar.ts';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.RADAR_PORT ?? 8791);
const API_TOKEN = process.env.ENVIO_API_TOKEN ?? '';
const FACTORY = process.env.RADAR_FACTORY ?? '0xa7f18b9eceb0A9852b08408854A45D00fc682454';
const MARKET_TOKENS: Record<string, string> = JSON.parse(process.env.RADAR_MARKET_TOKENS ?? '{}');
const FROM_BLOCK = Number(process.env.RADAR_FROM_BLOCK ?? 69_509_526);
const CHAIN_ID = Number(process.env.RADAR_CHAIN_ID ?? 10_143);
const DEPLOYMENT = process.env.RADAR_DEPLOYMENT ?? 'retropick-monad-testnet-v2';
const STATE_DIR = process.env.RADAR_STATE_DIR ?? resolve(here, '../../.data/radar');

async function main() {
  if (!API_TOKEN) {
    console.error('ENVIO_API_TOKEN is required — Envio HyperSync endpoints are token-gated. See docs/metropolis/execution/EXTERNAL-BLOCKERS.md (BLOCKER-003).');
    process.exit(2);
  }
  const { createRadarStream } = await import('./stream.ts');
  const stream = await createRadarStream({
    apiToken: API_TOKEN,
    factory: FACTORY,
    marketTokens: MARKET_TOKENS,
    fromBlock: FROM_BLOCK,
    chainId: CHAIN_ID,
    deployment: DEPLOYMENT,
    stateDir: STATE_DIR,
  });
  const server = createServer((req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    if (req.method !== 'GET') { res.statusCode = 405; return res.end(); }
    if (req.url === '/health') {
      const snapshot = stream.aggregator.snapshot();
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({
        ok: true, source: 'ENVIO_HYPERSYNC', chainId: CHAIN_ID,
        cursorBlock: stream.cursor(),
        freshness: snapshot.freshness, decodeErrors: snapshot.decodeErrors,
        markets: snapshot.markets.length,
      }));
    }
    if (req.url === '/radar') {
      const snapshot = stream.aggregator.snapshot();
      const now = snapshot.computedAt;
      const payload = {
        ...snapshot,
        markets: snapshot.markets.map((m) => ({ ...m, stalenessS: marketStalenessS(m, now) })),
      };
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify(payload, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
    }
    res.statusCode = 404;
    return res.end();
  });
  server.listen(PORT, '127.0.0.1', () => console.log(`envio-market-radar on 127.0.0.1:${PORT} (fails closed; token configured; state ${STATE_DIR})`));
  const shutdown = () => { stream.stop(); server.close(() => process.exit(0)); };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
  await stream.run().catch((error) => { console.error('radar stream failed:', error instanceof Error ? error.message : error); shutdown(); });
}

void main();
