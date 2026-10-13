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
  await expect(page.locator('img.image-preview').first()).toBeVisible();
  await expect.poll(() => page.locator('img.image-preview').first().evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0); // The uploaded image previews before launch.
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
  await page.route(`https://gateway.pinata.cloud/ipfs/${CID}`, (route) => route.fulfill({ contentType: 'image/png', body: PNG }));
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
  await page.route(/\/v1\/launches(?:\?|$)/, async (route) => {
    const response = await route.fetch().catch(() => null);
    if (!response) return route.abort();
    const body = await response.json();
    for (const launch of body?.data ?? []) launch.logo = `ipfs://${CID}`;
    await route.fulfill({ response, json: body });
  });
  await page.route(`https://gateway.pinata.cloud/ipfs/${CID}`, (route) => route.fulfill({ contentType: 'image/png', body: PNG }));
  await page.goto('/launchpad');
  await expect(page.getByTestId('discovery')).toHaveAttribute('data-data-mode', 'live');
  const avatar = page.getByTestId('launch-row').first().locator('img.rp-avatar');
  await expect(avatar).toHaveAttribute('src', `https://gateway.pinata.cloud/ipfs/${CID}`);
  await expect.poll(() => avatar.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  expectClean(observed);
});


test('@live manual logo preview retries failed gateways in both previews', async ({ page }) => {
  const requested: string[] = [];
  await page.route(`**/ipfs/${CID}`, async route => {
    requested.push(new URL(route.request().url()).hostname);
    if (route.request().url().startsWith('https://dweb.link/')) return route.fulfill({ contentType: 'image/png', body: PNG });
    return route.abort('failed');
  });
  await page.goto('/launchpad/create');
  await page.getByRole('button', { name: 'Paste a URI instead' }).click();
  await page.getByPlaceholder('https://… or ipfs://…').fill(`ipfs://${CID}`);
  const previews = page.locator('img.image-preview');
  await expect(previews).toHaveCount(2);
  for (const img of await previews.all()) {
    await expect(img).toHaveAttribute('src', `https://dweb.link/ipfs/${CID}`);
    await expect.poll(() => img.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  }
  expect([...new Set(requested)]).toEqual(['gateway.pinata.cloud', 'ipfs.io', 'dweb.link']);
  // A new URI resets the exhausted retries, rather than retaining the previous attempt.
  await page.route(`https://gateway.pinata.cloud/ipfs/${CID}/new.png`, route => route.fulfill({ contentType: 'image/png', body: PNG }));
  await page.getByPlaceholder('https://… or ipfs://…').fill(`ipfs://${CID}/new.png`);
  await expect(previews.first()).toHaveAttribute('src', `https://gateway.pinata.cloud/ipfs/${CID}/new.png`);
});

test('@live unresponsive logo gateway times out and all failed gateways fall back', async ({ page }) => {
  await page.clock.install();
  await page.route(`https://gateway.pinata.cloud/ipfs/${CID}`, async route => {
    await new Promise(resolve => setTimeout(resolve, 20000));
    await route.abort().catch(() => {});
  });
  await page.route(`https://ipfs.io/ipfs/${CID}`, route => route.abort('failed'));
  await page.route(`https://dweb.link/ipfs/${CID}`, route => route.abort('failed'));
  await page.goto('/launchpad/create');
  await page.getByRole('button', { name: 'Paste a URI instead' }).click();
  await page.getByPlaceholder('https://… or ipfs://…').fill(`ipfs://${CID}`);
  await expect(page.locator('img.image-preview')).toHaveCount(2);
  await page.clock.fastForward(8500);
  await expect(page.locator('img.image-preview')).toHaveCount(0);
  await expect(page.locator('.image-empty').first()).toBeVisible();
  await expect(page.locator('.token-preview .token-icon')).toBeVisible();
});

test('@live existing RETRO logo decodes on dashboard and token page without media stubs', async ({ page, observed, snap }) => {
  test.skip(!feedReady, reason);
  // Vite preview does not provide the deployed same-origin radar rewrite. Forward that
  // unrelated read to the actual public service; all feed, RPC and image responses stay real.
  await page.route('**/api/radar/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const response = await route.fetch({ url: `${INDEXER}${path}`, headers: { origin: 'https://retropick.xyz' } });
    await route.fulfill({ response });
  });
  const token = '0xf8f17922599136b44e175eec9a43123c000f3366';
  const cid = 'Qmc3ZojHMWXFkautyJvnud1YzDN3jNvPH7QWb39bYmy9aL';
  await page.goto('/launchpad');
  const row = page.getByTestId('launch-row').filter({ has: page.locator(`a[href="/launchpad/token/${token}"]`) });
  const avatar = row.locator('img.rp-avatar');
  await expect(avatar).toHaveAttribute('src', `https://gateway.pinata.cloud/ipfs/${cid}`);
  await expect.poll(() => avatar.evaluate((image: HTMLImageElement) => ({ width: image.naturalWidth, height: image.naturalHeight }))).toEqual({ width: 1024, height: 1024 });
  await snap('real-retro-dashboard-image');
  await page.reload();
  await expect.poll(() => avatar.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1024);
  await page.goto(`/launchpad/token/${token}`);
  const terminal = page.getByTestId('token-terminal');
  const detailImage = terminal.locator('img.rp-avatar').first();
  await expect(detailImage).toHaveAttribute('src', `https://gateway.pinata.cloud/ipfs/${cid}`);
  await expect.poll(() => detailImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1024);
  await snap('real-retro-token-image');
  expectClean(observed);
});
