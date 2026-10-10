import { test, expect, expectClean, type Locator } from '../helpers/test';

// Live-mode media upload + dashboard render coverage for LAUNCHPAD-MEDIA-UPLOAD-001.
// The /api/media endpoints and the IPFS gateway are intercepted with deterministic stubs, so no
// real pinning or media service is needed here (apps/media-service has its own unit suite).
// The discovery test patches the real indexer feed (when reachable) so one launch carries an
// ipfs:// logo end-to-end through the view model into the rendered avatar.
const INDEXER = process.env.LIVE_INDEXER_URL ?? 'http://127.0.0.1:8787';
const CID = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const MEDIA_KEY = `${'a'.repeat(64)}.png`;

let feedReady = false; let reason = '';
test.beforeAll(async () => {
  try {
    const response = await fetch(`${INDEXER}/v1/launches?limit=1`, { signal: AbortSignal.timeout(5000) });
    feedReady = response.ok;
    if (!response.ok) reason = `indexer HTTP ${response.status}`;
  } catch (cause) { reason = `ENVIRONMENT: indexer unreachable at ${new URL(INDEXER).host} (${(cause as Error).message})`; }
});

/** The sticky mobile trade bar overlays the form footer on mobile widths; activate by keyboard there. */
async function activate(button: Locator): Promise<void> {
  if (test.info().project.name.startsWith('mobile')) { await button.focus(); await button.press('Enter'); }
  else await button.click();
}

test('@live create: local image upload stores a logo URI and previews it', async ({ page, observed, snap }) => {
  await page.route('**/api/media/upload', async (route) => {
    const body = route.request().postDataBuffer();
    expect(body?.length ?? 0, 'multipart upload body reaches the client').toBeGreaterThan(0);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ uri: `http://127.0.0.1:4318/api/media/${MEDIA_KEY}`, https: null, hash: 'a'.repeat(64), bytes: 4, mime: 'image/png', mode: 'local' }) });
  });
  await page.route(`**/api/media/${MEDIA_KEY}`, (route) => route.fulfill({ contentType: 'image/png', body: PNG }));
  await page.goto('/launchpad/create');
  await expect(page.locator('main')).toContainText('LIVE · 10143');
  await page.getByLabel('Choose token image').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByText('Stored at')).toBeVisible();
  await expect(page.locator('img.image-preview').first()).toBeVisible(); // The uploaded image previews before launch.
  await page.getByPlaceholder('Retro Coin', { exact: true }).fill('Media Check');
  await page.getByPlaceholder('RETRO', { exact: true }).fill('MEDA');
  await activate(page.getByRole('button', { name: 'Continue' }));
  await expect(page.getByRole('heading', { name: /2 · Market & economics/ })).toBeVisible(); // Uploaded URI passes metadata validation.
  await snap('live-create-media-upload');
  expectClean(observed);
});

test('@live create: manual URI field still accepts ipfs:// (advanced path)', async ({ page, observed }) => {
  // Stub the gateway: the real one rate-limits (429 text/plain), which Chromium's opaque-response
  // blocking logs as an app console error. The app's own failure path (glyph fallback) is fine.
  await page.route(`https://ipfs.io/ipfs/${CID}`, (route) => route.fulfill({ contentType: 'image/png', body: PNG }));
  await page.goto('/launchpad/create');
  await page.getByRole('button', { name: 'Paste a URI instead' }).click();
  await page.getByPlaceholder('https://… or ipfs://…').fill(`ipfs://${CID}`);
  await page.getByPlaceholder('Retro Coin', { exact: true }).fill('Manual Check');
  await page.getByPlaceholder('RETRO', { exact: true }).fill('MANU');
  await activate(page.getByRole('button', { name: 'Continue' }));
  await expect(page.getByRole('heading', { name: /2 · Market & economics/ })).toBeVisible();
  expectClean(observed);
});

test('@live discovery renders an ipfs:// logo through the public gateway', async ({ page, observed }) => {
  test.skip(!feedReady, reason);
  await page.route(`${INDEXER}/v1/launches*`, async (route) => {
    const response = await route.fetch().catch(() => null);
    if (!response) return route.abort();
    const body = await response.json();
    for (const launch of body?.data ?? []) launch.logo = `ipfs://${CID}`;
    await route.fulfill({ response, json: body });
  });
  await page.route(`https://ipfs.io/ipfs/${CID}`, (route) => route.fulfill({ contentType: 'image/png', body: PNG }));
  await page.goto('/launchpad');
  await expect(page.getByTestId('discovery')).toHaveAttribute('data-data-mode', 'live');
  await expect(page.getByTestId('launch-row').first().locator('img.rp-avatar')).toHaveAttribute('src', `https://ipfs.io/ipfs/${CID}`);
  expectClean(observed);
});
