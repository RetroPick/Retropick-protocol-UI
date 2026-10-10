import { test, expect, expectClean, expectNoHorizontalOverflow } from '../helpers/test';
import { walletCalls } from '../helpers/mock-wallet';

for (const theme of ['dark', 'light'] as const) {
  test.describe(`earn ${theme}`, () => {
    test.use({ theme });
    test('@earn hub shows honest capabilities, no copied competitor policy', async ({ page, observed, snap }) => {
      await page.goto('/earn');
      const hub = page.getByTestId('earn-hub');
      await expect(hub).toHaveAttribute('data-data-mode', 'demo');
      await expect(hub.locator('[data-provenance="demo"]').first()).toBeVisible();
      // No claimable amount and no active claim CTA without a claim contract.
      await expect(page.getByTestId('claimable-total')).toHaveText('—');
      await expect(hub.getByRole('button', { name: 'Claim all' })).toBeDisabled();
      // Tab content is unmounted when inactive — walk every tab and scan each for copied policy text.
      for (const [, label] of [['claims', 'Claims'], ['portfolio', 'Portfolio'], ['created', 'Created'], ['referrals', 'Referrals'], ['funding', 'Fund & send']] as const) {
        await page.getByRole('tab', { name: label }).click();
        const text = await hub.innerText();
        expect(text, `tab ${label}`).not.toMatch(/\bSOL\b|Bags|50% of protocol fees|0\.20%|Robinhood|\$0(\.00)?\b/);
      }
      await page.getByRole('tab', { name: 'Referrals' }).click();
      await expect(hub).toContainText('Referral earnings are not enabled');
      await page.getByRole('tab', { name: 'Fund & send' }).click();
      // Section 23: no exchange/third-party destinations implied for Send (capability rows are disabled + explained).
      expect(await hub.locator('.rp-hub-send').innerText()).not.toMatch(/Coinbase|Binance|Solana|Robinhood/);
      // Fiat providers are rendered by capability flags: unsupported → disabled with reason.
      const unavailable = hub.getByRole('button', { name: 'Buy / cash out unavailable' });
      expect(await unavailable.count()).toBeGreaterThan(0);
      for (const b of await unavailable.all()) await expect(b).toBeDisabled();
      await expect(hub.getByRole('link', { name: 'Get test MON' })).toHaveAttribute('href', /faucet\.monad\.xyz/);
      await expectNoHorizontalOverflow(page);
      await snap(`earn-${theme}`);
      expectClean(observed);
    });
  });
}

test('@earn referral copy, section tabs, demo positions toggle', async ({ page, observed }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await page.goto('/earn');
  await page.getByRole('tab', { name: 'Referrals' }).click();
  await expect(page).toHaveURL(/#referrals/);
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible();
  await page.getByRole('tab', { name: 'Portfolio' }).click();
  await page.getByRole('button', { name: 'Show demo positions' }).click();
  await expect(page.getByRole('region', { name: 'Portfolio' }).getByRole('heading', { name: 'Portfolio', exact: true, level: 1 })).toBeVisible();
  expect(await walletCalls(page)).toEqual([]);
  await expectNoHorizontalOverflow(page);
  expectClean(observed);
});

test('@earn legacy /portfolio route still renders demo portfolio', async ({ page, observed }) => {
  await page.goto('/portfolio');
  await expect(page.getByRole('heading', { name: 'Portfolio', exact: true, level: 1 })).toBeVisible();
  expectClean(observed);
});
