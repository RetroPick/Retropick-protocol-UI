import { test, expect, expectClean, expectNoHorizontalOverflow } from '../helpers/test';
import { walletCalls } from '../helpers/mock-wallet';

// Twelve fresh read-only matrix cases: two themes across the six configured viewports.
// Wallet is an EIP-1193 mock; signing and broadcast remain rejected/blocked.
for (const theme of ['dark', 'light'] as const) {
  test.describe(`resume ${theme}`, () => {
    test.use({ theme });
    test(`@resume-live discovery, deep terminal, chart, SPA wallet and wrong chain (${theme})`, async ({ page, observed, snap }, info) => {
      test.setTimeout(180000);
      let feed: { data: Array<{ token: string; phase: string; symbol: string }> };
      try {
        const response = await fetch(`${process.env.LIVE_INDEXER_URL ?? 'http://127.0.0.1:8787'}/v1/launches?limit=20`, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) { test.skip(true, `ENVIRONMENT: indexer HTTP ${response.status}`); return; }
        feed = await response.json();
      } catch { test.skip(true, 'ENVIRONMENT: indexer unreachable'); return; }
      const active = feed.data.find(l => l.phase === 'ACTIVE');
      const graduated = feed.data.find(l => l.phase === 'GRADUATED');
      test.skip(!active || !graduated, 'ENVIRONMENT: requires indexed ACTIVE and GRADUATED launch');
      await page.goto('/launchpad', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('discovery')).toHaveAttribute('data-data-mode', 'live');
      await expect(page.getByTestId('launch-row').first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await snap(`resume-discovery-${theme}`);
      // Connect via the real wallet picker; provider itself is harmless and rejects every signature.
      await page.locator('[data-wallet-status="disconnected"]:visible').first().click();
      await page.getByRole('listitem').filter({ hasText: 'E2E Mock Wallet' }).click();
      await expect(page.locator('[data-wallet-status="connected"]:visible').first()).toBeVisible();
      const row = page.getByTestId('launch-row').filter({ has: page.locator(`a[href="/launchpad/token/${active!.token}"]`) });
      await row.locator('a').first().click();
      await expect(page.getByTestId('token-terminal')).toHaveAttribute('data-lifecycle', 'ACTIVE');
      await expect(page.locator('[data-wallet-status="connected"]:visible').first()).toBeVisible();
      await expect(page.getByTestId('token-price')).not.toHaveText('—');
      const range = page.getByRole('radiogroup', { name: 'Time range' });
      await range.getByRole('radio', { name: '7D' }).click();
      await expect(range.getByRole('radio', { name: '7D' })).toHaveAttribute('aria-checked', 'true');
      const intervals = page.getByRole('radiogroup', { name: 'Candle interval' });
      await intervals.getByRole('radio', { name: '15m' }).click();
      await expect(intervals.getByRole('radio', { name: '15m' })).toHaveAttribute('aria-checked', 'true');
      await range.getByRole('radio', { name: '6H' }).click();
      await expect(intervals.getByRole('radio', { name: '15m' })).toHaveAttribute('aria-checked', 'true');
      await expect(intervals.getByRole('radio', { name: '1h' })).toHaveAttribute('aria-disabled', 'true');
      await expectNoHorizontalOverflow(page);
      await snap(`resume-active-${theme}`);
      if (info.project.name.startsWith('mobile')) await page.getByTestId('mobile-trade-bar').getByRole('button', { name: 'Trade' }).tap();
      await page.evaluate(() => (window as unknown as { __mockWallet: { setChain(id: number): void } }).__mockWallet.setChain(1));
      await expect(page.getByRole('button', { name: 'Switch to Monad Testnet', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Switch to Monad Testnet', exact: true }).click();
      await expect(page.locator('[data-wallet-status="connected"]:visible').first()).toBeVisible();
      if (info.project.name.startsWith('mobile')) await page.keyboard.press('Escape');
      await page.goto(`/launchpad/token/${graduated!.token}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('token-terminal')).toHaveAttribute('data-lifecycle', 'GRADUATED');
      await expect(page.getByTestId('token-terminal')).toContainText(graduated!.symbol);
      await expect(page.getByTestId('token-terminal').locator('[data-provenance="demo"]')).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
      await snap(`resume-graduated-${theme}`);
      const calls = await walletCalls(page);
      expect(calls.filter(method => /^(eth_send|eth_sign|personal_sign|wallet_send)/.test(method))).toEqual([]);
      expectClean(observed);
    });
  });
}
