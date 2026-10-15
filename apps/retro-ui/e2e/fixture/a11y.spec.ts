import { test, expect, expectClean, expectNoHorizontalOverflow } from '../helpers/test';

const ROUTES = ['/launchpad', '/launchpad/token/demo-active', '/launchpad/token/demo-graduated', '/earn', '/launchpad/create', '/liquidity', '/liquidity/pools/demo-graduated', '/liquidity/market-making'];

test('@a11y keyboard: skip link, visible focus ring, tab reaches ticket controls', async ({ page, observed }, info) => {
  test.skip(info.project.name.startsWith('mobile'), 'hardware keyboard');
  await page.goto('/launchpad/token/demo-active');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  // Tab until a ticket radio receives focus; each focused element must show an outline or ring.
  let reached = false;
  for (let i = 0; i < 80 && !reached; i++) {
    await page.keyboard.press('Tab');
    const info2 = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      return { inTicket: !!el.closest('[data-testid="trade-ticket"]'), role: el.getAttribute('role'), outline: cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px', shadow: cs.boxShadow !== 'none' };
    });
    if (info2?.inTicket && info2.role === 'radio') { expect(info2.outline || info2.shadow, 'focused ticket control has a visible focus indicator').toBe(true); reached = true; }
  }
  expect(reached, 'ticket order-type control is keyboard reachable').toBe(true);
  // Arrow keys select within the radiogroup (disabled Limit is skipped while ACTIVE).
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radiogroup', { name: 'Order type' }).getByRole('radio', { name: 'Market' })).toHaveAttribute('aria-checked', 'true');
  expectClean(observed);
});

test('@a11y semantics: buy/sell not colour-only, tables have captions, controls named', async ({ page, observed }, info) => {
  await page.goto('/launchpad/token/demo-graduated');
  const rows = page.getByRole('table', { name: /Recent trades/ }).locator('tbody tr');
  await expect(rows.first()).toContainText(/Buy|Sell/);
  for (const name of ['Chart type', 'Time range', 'Candle interval']) await expect(page.getByRole('radiogroup', { name }).first()).toBeAttached();
  // Mobile: the ticket lives in a modal bottom sheet (background correctly hidden from assistive tech while open).
  if (info.project.name.startsWith('mobile')) await page.getByTestId('mobile-trade-bar').getByRole('button', { name: 'Trade' }).tap();
  for (const name of ['Order type', 'Trade side']) await expect(page.getByRole('radiogroup', { name }).first()).toBeAttached();
  const unnamed = await page.evaluate(() => [...document.querySelectorAll('button, a[href], input, select')].filter((el) => {
    const h = el as HTMLElement;
    if (h.offsetParent === null) return false;
    const name = (h.getAttribute('aria-label') ?? '') + (h.textContent ?? '') + (h.getAttribute('title') ?? '') + ((h as HTMLInputElement).labels?.length ? 'x' : '') + (h.getAttribute('aria-labelledby') ? 'x' : '') + (h.getAttribute('placeholder') ?? '');
    return !name.trim();
  }).map((el) => el.outerHTML.slice(0, 120)));
  expect(unnamed, 'every visible control has an accessible name').toEqual([]);
  expectClean(observed);
});

test('@a11y touch targets ≥ 40px on mobile for primary trading controls', async ({ page, observed }, info) => {
  test.skip(!info.project.name.startsWith('mobile'));
  await page.goto('/launchpad/token/demo-active');
  await page.getByTestId('mobile-trade-bar').getByRole('button', { name: 'Trade' }).tap();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
  const small = await dialog.evaluate((root) => [...root.querySelectorAll('button, [role="radio"], input')].map((el) => { const r = el.getBoundingClientRect(); return { h: r.height, w: r.width, t: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20) }; }).filter((r) => r.h > 0 && (r.h < 40 || r.w < 40) && r.t !== 'Close'));
  expect(small, 'ticket touch targets').toEqual([]);
  expectClean(observed);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' } as never);
  test('@a11y reduced motion disables shimmer/spinner animation', async ({ page, observed }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/launchpad/token/demo-active?scenario=slow-rpc');
    const anim = await page.evaluate(() => { const el = document.createElement('span'); el.className = 'rp-skel'; document.body.append(el); const v = getComputedStyle(el).animationName; el.remove(); return v; });
    expect(anim).toBe('none');
    expectClean(observed);
  });
});

for (const theme of ['dark', 'light'] as const) {
  test.describe(`theme ${theme}`, () => {
    test.use({ theme });
    test(`@theme ${theme} matrix: key routes render with theme-specific chart palette, no overflow`, async ({ page, observed, snap }) => {
      for (const route of ROUTES) {
        await page.goto(route);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await expectNoHorizontalOverflow(page);
      }
      await page.goto('/launchpad/token/demo-active');
      const up = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--chart-up').trim());
      expect(up).toBe(theme === 'dark' ? '#5feddf' : '#0a7d73');
      await snap(`theme-${theme}-terminal`, page, { fullPage: false });
      expectClean(observed);
    });
  });
}

test('@resilience unknown route and unknown demo token keep the shell with a recovery action', async ({ page, observed }) => {
  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { name: 'This page is off the board.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore Launchpad' })).toBeVisible();
  await page.goto('/launchpad/token/not-a-fixture');
  await expect(page.getByText('Token launch not found')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to Launchpad' })).toBeVisible();
  await expect(page.getByRole('complementary').or(page.locator('.mobilebar')).first()).toBeAttached();
  // 0x addresses in demo mode never resolve to an on-chain read.
  await page.goto('/launchpad/token/0x0000000000000000000000000000000000000001');
  await expect(page.getByText('Token launch not found')).toBeVisible();
  expect(observed.guard.blockedExternal.filter((r) => /rpc|indexer/i.test(r.url))).toEqual([]);
  expectClean(observed);
});
