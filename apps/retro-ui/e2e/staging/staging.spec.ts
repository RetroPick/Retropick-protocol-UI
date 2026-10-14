import { test, expect } from '@playwright/test';

// Read-only checks against the PUBLIC staging deployment. Live mode only: no wallet,
// no signing, no /api writes. Asserts real data (not fixtures), SPA deep links, the
// referral/media rewrite path, and honest degradation states.

const GRADUATED_TOKEN = '0x30ccb65006665022dfc97bb5c1985610503fd1cf'; // evidenced launch

test('staging serves the live retro-ui build (no DEMO/mock leakage on discovery)', async ({ page }) => {
  await page.goto('/launchpad');
  const terminal = page.locator('[data-testid="discovery"], main').first();
  await expect(terminal).toBeVisible();
  // Live mode must never show the DEMO provenance badge or fixture version.
  await expect(page.locator('[data-provenance="demo"]')).toHaveCount(0);
  await expect(page.getByText('LIVE', { exact: true })).toBeVisible();
  // Real indexed rows eventually render (indexer is live through the tunnel).
  await expect(page.locator('a[href^="/launchpad/token/0x"]').first()).toBeVisible({ timeout: 30_000 });
});

test('SPA deep link renders the graduated token terminal with Kuru depth + orders tab', async ({ page }) => {
  await page.goto(`/launchpad/token/${GRADUATED_TOKEN}`);
  const term = page.getByTestId('token-terminal');
  await expect(term).toBeVisible({ timeout: 30_000 });
  await expect(term).toHaveAttribute('data-lifecycle', 'GRADUATED');
  // Live provenance — never demo.
  await expect(term).toHaveAttribute('data-data-mode', 'live');
  await expect(page.locator('[data-provenance="demo"]')).toHaveCount(0);
  // Stage-1 depth panel is present for the graduated market (reads the on-chain book).
  // The live book is honest about its state: a two-sided ladder shows the spread row;
  // an empty book (resting orders consumed) shows the designed empty state. Both are
  // correct — what must NEVER happen is fabricated depth.
  await expect(page.getByTestId('depth-panel')).toBeVisible({ timeout: 30_000 });
  // Three honest terminal states, all truthful: a two-sided ladder (Spread), an empty
  // book (No resting orders / No two-sided book), or the unavailable state when the
  // public RPC rejects the heavy L2 read. Fabricated depth must never appear.
  await expect(page.getByTestId('depth-panel')).toContainText(/Spread|No two-sided book|No resting orders|depth is unavailable/, { timeout: 30_000 });
  // Orders tab is enabled after graduation.
  await expect(page.getByRole('tab', { name: 'Orders' })).toBeEnabled();
});

test('Earn hub renders with the Mera Vault tab mounted', async ({ page }) => {
  await page.goto('/earn');
  const hub = page.getByTestId('earn-hub');
  await expect(hub).toBeVisible({ timeout: 30_000 });
  await expect(hub).toHaveAttribute('data-data-mode', 'live');
  await page.locator('.rp-hub-tab', { hasText: 'Vault' }).click();
  const vault = page.getByTestId('strategy-vault');
  await expect(vault).toBeVisible();
  await expect(vault).toHaveAttribute('data-state', 'none');
  await expect(page.getByTestId('vault-create')).toBeVisible();
  await expect(page.getByTestId('vault-disclosure')).toContainText(/never grants spending authority/i);
});

test('referral rewrite path serves the backend through the same origin', async ({ page, request }) => {
  const health = await request.get('/api/referrals/health');
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ chainId: 10143 });
  const media = await request.get('/api/media/health');
  expect(media.status()).toBe(200);
  // The UI panel itself mounts without console errors on this page.
  const errors: string[] = [];
  const page2 = await page.context().newPage();
  page2.on('pageerror', (e) => errors.push(String(e)));
  await page2.goto('/earn#referrals');
  await expect(page2.getByTestId('earn-hub')).toBeVisible({ timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('staging has no uncaught console errors and no horizontal overflow (both viewports)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/launchpad');
  await expect(page.locator('a[href^="/launchpad/token/0x"]').first()).toBeVisible({ timeout: 30_000 });
  await page.goto(`/launchpad/token/${GRADUATED_TOKEN}`);
  await expect(page.getByTestId('token-terminal')).toBeVisible({ timeout: 30_000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow, 'no horizontal overflow').toBe(false);
  expect(errors).toEqual([]);
});

test('wallet connect prompts the EIP-6963 picker (no implicit connect), read-only', async ({ page }) => {
  await page.goto(`/launchpad/token/${GRADUATED_TOKEN}`);
  await expect(page.getByTestId('token-terminal')).toBeVisible({ timeout: 30_000 });
  // In a clean browser with no injected wallets the ticket shows the connect CTA;
  // clicking opens the picker (or its empty state) — never signs anything.
  const connect = page.getByRole('button', { name: 'Connect wallet', exact: true }).first();
  await connect.click();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Connect a wallet' })).toBeVisible();
  await expect(page.getByText(/No wallet found/)).toBeVisible();
});

test('public release and indexer projection match the reviewed source', async ({ request }) => {
  const release = await request.get('/release.json'); expect(release.status()).toBe(200);
  const record = await release.json(); expect(record.chainId).toBe(10143);
  if (process.env.STAGING_SOURCE_SHA) expect(record.sourceSha).toBe(process.env.STAGING_SOURCE_SHA);
  const health = await request.get('/health'); expect(health.status()).toBe(200);
  const value = await health.json(); expect(value.ready).toBe(true);
  expect(value.projection).toEqual({expected:2,published:2});
  expect(value.freshness.chainId).toBe(10143); expect(value.freshness.source).toBe('MONAD_EVENT_INDEXER');
  expect(value.freshness.lagBlocks).toBeLessThanOrEqual(64);
});

test('live create economics loads admitted quotes and reaches Review without signing', async ({page}) => {
  await page.goto('/launchpad/create');
  await page.getByPlaceholder('Retro Coin', {exact:true}).fill('Read Only Draft');
  await page.getByPlaceholder('RETRO', {exact:true}).fill('READ');
  await page.getByRole('button', {name:'Continue',exact:true}).click();
  await expect(page.getByRole('heading', {name:/2 · Market & economics/})).toBeVisible();
  const pair=page.getByRole('radio', {name:/^MON quote logo MON Monad Live testnet/});
  await expect(pair).toBeVisible({timeout:30000});
  await expect(pair).toBeChecked();
  await expect(page.getByText('Currently admitted for this venue on Monad Testnet.', {exact:true})).toBeVisible();
  await expect(page.getByText('Launch terms unavailable.', {exact:false})).toHaveCount(0);
  await expect(page.getByText(/Launch fee .* MON\. Graduates at/)).toBeVisible();
  // Admission and pinned-block economics reads resolve independently.
  await expect(async () => {
    const review = page.getByRole('button', {name:'Review',exact:true});
    if (await review.isVisible()) await review.click();
    await expect(page.getByTestId('launch-review')).toBeVisible({timeout:1000});
  }).toPass({timeout:30000, intervals:[1000,2000,3000]});
  await expect(page.getByTestId('launch-review')).toContainText('Read Only Draft · READ');
  await expect(page.getByTestId('launch-review')).not.toContainText('DEMO');
  await expect(page.getByRole('button', {name:'Connect wallet to launch',exact:true})).toBeVisible();
  await page.getByRole('button', {name:'Back',exact:true}).click();
  await page.getByRole('button', {name:'Back',exact:true}).click();
  await expect(page.getByPlaceholder('Retro Coin', {exact:true})).toHaveValue('Read Only Draft');
  await expect(page.getByPlaceholder('RETRO', {exact:true})).toHaveValue('READ');
});
