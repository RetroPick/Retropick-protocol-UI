// Read-only HTTP surface for the Envio market radar (loopback only).
//   GET /health | /api/radar/health — provider/cursor/lag/anchor status (never the token)
//   GET /radar  | /api/radar/radar  — latest metrics snapshot (bigint-safe JSON)
// The /api/radar/* aliases are what the staging gateway forwards when STAGING_GATEWAY_RADAR=1.
// FAILS CLOSED without ENVIO_API_TOKEN (exit 2). The chat-exposed development token may only be
// used for LOCAL DEV-RUN validation; public activation requires a rotated token (operator gate).
import { createServer } from 'node:http';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marketStalenessS } from './radar.ts';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.RADAR_PORT ?? 8791);
const API_TOKEN = process.env.ENVIO_API_TOKEN ?? '';
const FACTORY = process.env.RADAR_FACTORY ?? '0xa7f18b9eceb0A9852b08408854A45D00fc682454';
const COORDINATOR = process.env.RADAR_COORDINATOR ?? '0xaD62309242EA65BB07C833669EC6a4ED23AF738F';
const MARKET_TOKENS: Record<string, string> = JSON.parse(process.env.RADAR_MARKET_TOKENS ?? '{}');
const FROM_BLOCK = Number(process.env.RADAR_FROM_BLOCK ?? 69_509_526);
const CHAIN_ID = Number(process.env.RADAR_CHAIN_ID ?? 10_143);
const DEPLOYMENT = process.env.RADAR_DEPLOYMENT ?? 'retropick-monad-testnet-v2';
const STATE_DIR = process.env.RADAR_STATE_DIR ?? resolve(here, '../../../.data/radar');
const RPC_URL = process.env.RADAR_RPC_URL ?? 'https://testnet-rpc.monad.xyz';
const STALE_LAG_BLOCKS = Number(process.env.RADAR_STALE_LAG_BLOCKS ?? 120);
const ERROR_GRACE_MS = 60_000;

const json = (v: unknown) => JSON.stringify(v, (_, x) => (typeof x === 'bigint' ? x.toString() : x));

async function main() {
  if (!API_TOKEN) {
    console.error('ENVIO_API_TOKEN is required — Envio HyperSync endpoints are token-gated.');
    process.exit(2);
  }
  const { createRadarStream } = await import('./stream.ts');
  const stream = await createRadarStream({
    apiToken: API_TOKEN, factory: FACTORY, coordinator: COORDINATOR, marketTokens: MARKET_TOKENS,
    fromBlock: FROM_BLOCK, chainId: CHAIN_ID, deployment: DEPLOYMENT, stateDir: STATE_DIR, rpcUrl: RPC_URL,
    resetOnIdentityMismatch: process.env.RADAR_RESET_ON_IDENTITY_MISMATCH === '1',
  });
  const health = () => {
    const m = stream.metrics();
    const s = stream.status();
    const erroring = s.lastErrorAt !== null && s.lastError !== null && Date.now() - s.lastErrorAt < ERROR_GRACE_MS;
    const stale = m.freshness.headHeight === 0 || m.freshness.lagBlocks > STALE_LAG_BLOCKS;
    return {
      ok: !erroring && !stale, source: 'ENVIO_HYPERSYNC', provider: '10143.hypersync.xyz', configured: true, chainId: CHAIN_ID, deployment: DEPLOYMENT,
      status: erroring ? 'PROVIDER_ERROR' : stale ? 'STALE' : 'OK',
      cursorBlock: s.cursorBlock, freshness: m.freshness, anchorVerified: s.anchorVerified, recovery: s.recovery,
      journalCount: s.journalCount, counters: s.counters, lastError: s.lastError, lastBatchAt: s.lastBatchAt, markets: m.markets.length, tokens: m.tokens.length,
    };
  };
  const server = createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'no-store');
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; return res.end('{"error":"METHOD_NOT_ALLOWED"}'); }
    const path = (req.url ?? '/').split('?')[0];
    if (path === '/health' || path === '/api/radar/health') { const h = health(); res.statusCode = h.ok ? 200 : 503; return res.end(json(h)); }
    if (path === '/radar' || path === '/api/radar/radar') {
      const h = health();
      const snapshot = stream.metrics();
      const now = snapshot.computedAt;
      return res.end(json({ ...snapshot, health: { ok: h.ok, status: h.status, anchorVerified: h.anchorVerified }, source: 'ENVIO_HYPERSYNC', chainId: CHAIN_ID, markets: snapshot.markets.map((m) => ({ ...m, stalenessS: marketStalenessS(m, now) })) }));
    }
    res.statusCode = 404;
    return res.end('{"error":"NOT_FOUND"}');
  });
  server.listen(PORT, '127.0.0.1', () => console.log(`envio-market-radar on 127.0.0.1:${PORT} (token configured; state ${STATE_DIR})`));
  const shutdown = () => { stream.stop(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
  await stream.run();
}

main().catch((error) => { console.error('radar failed to start:', error instanceof Error ? error.message : error); process.exit(1); });
