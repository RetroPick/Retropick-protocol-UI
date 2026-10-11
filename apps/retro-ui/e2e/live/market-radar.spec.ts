import { test, expect } from '../helpers/test';

// Envio Market Quality Radar panel on the live token terminal. The radar response is a
// ROUTED FIXTURE (not live Envio) so these assertions are deterministic; the live dev-run
// evidence lives under evidence/hackathon/metropolis/sponsors/envio/.
const INDEXER = process.env.LIVE_INDEXER_URL ?? 'http://127.0.0.1:8787';
let token = '';
let reason = '';
test.beforeAll(async () => {
  try {
    const r = await fetch(`${INDEXER}/v1/launches?limit=20`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) { reason = `indexer HTTP ${r.status}`; return; }
    const feed = await r.json() as { data: Array<{ token: string; phase: string }> };
    token = feed.data.find((l) => l.phase === 'GRADUATED')?.token ?? feed.data[0]?.token ?? '';
    if (!token) reason = 'no indexed launch';
  } catch (e) { reason = `ENVIRONMENT: indexer unreachable (${(e as Error).message})`; }
});

const radarBody = (over: Record<string, unknown> = {}) => JSON.stringify({
  source: 'ENVIO_HYPERSYNC', chainId: 10143, counts: { launched: 9, committed: 9, secured: 3, completed: 3 }, activeOnCurve: 6,
  computedAt: Math.floor(Date.now() / 1000), freshness: { headHeight: 70200376, lastEventBlock: 69791475, cursorBlock: 70200369, lagBlocks: 7 },
  health: { ok: true, status: 'OK', anchorVerified: true },
  tokens: [{ token, phase: 'GRADUATED', launchedAt: 1000, completedAt: 1006, graduationLatencyS: 6, timeToFirstKuruTradeS: 180, market: '0x1f5de72616a7fe645cf45ac66dfce8ac7452c57f', graduationTx: '0x' + '1'.repeat(64) }],
  markets: [{ market: '0x1f5de72616a7fe645cf45ac66dfce8ac7452c57f', token, trades: 1, ordersCreated: 3, ordersCanceled: 4, filledBaseUnits: '10000000', quoteVolume18: '40000000', firstTradeAt: 1186, firstTradeTx: '0x' + '2'.repeat(64), lastTradeAt: 1186, lastTradeTx: '0x' + '2'.repeat(64), stalenessS: 500 }],
  ...over,
});

test('@live radar panel shows Envio-derived lifecycle metrics with tx proof', async ({ page }) => {
  test.skip(!token, reason);
  await page.route(/\/api\/radar\/radar/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: radarBody() }));
  await page.goto(`/launchpad/token/${token}`);
  const radar = page.getByTestId('market-radar');
  await expect(radar).toHaveAttribute('data-radar-state', 'ready');
  await expect(radar).toContainText('Market quality radar');
  await expect(radar).toContainText('Envio HyperSync');
  await expect(radar).toContainText('Graduation latency');
  await expect(radar).toContainText('Time to first Kuru trade');
  await expect(radar.getByText(/Historical insight from the Envio HyperSync stream/)).toBeVisible();
});

test('@live radar unavailable is honest and never blocks the terminal', async ({ page }) => {
  test.skip(!token, reason);
  await page.route(/\/api\/radar\/radar/, (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{"status":"STALE"}' }));
  await page.goto(`/launchpad/token/${token}`);
  await expect(page.getByTestId('market-radar')).toHaveAttribute('data-radar-state', 'unavailable');
  await expect(page.getByTestId('token-terminal')).toBeVisible();
  await expect(page.getByTestId('market-radar')).toContainText('Discovery and live orderbook depth are unaffected');
});

test('@live radar with no entry for this token shows an honest empty note', async ({ page }) => {
  test.skip(!token, reason);
  await page.route(/\/api\/radar\/radar/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: radarBody({ tokens: [], markets: [] }) }));
  await page.goto(`/launchpad/token/${token}`);
  await expect(page.getByTestId('market-radar')).toHaveAttribute('data-radar-state', 'empty');
});
