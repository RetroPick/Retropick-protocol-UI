import { test, expect, expectClean, expectNoHorizontalOverflow } from '../helpers/test';

test('@liquidity navigation, pool detail, read-only positions and mobile overflow', async ({ page, observed }) => {
  await page.goto('/liquidity');
  await expect(page.getByRole('heading', { name: 'Liquidity', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Liquidity sections' }).getByRole('link', { name: 'Pools', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('link', { name: 'CIS / MON', exact: true }).click();
  await expect(page.getByTestId('market-liquidity')).toContainText('124.56');
  await expect(page.getByRole('heading', { name: 'Vault history', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /deposit|mint|withdraw/i })).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Liquidity sections' }).getByRole('link', { name: 'My Positions' }).click();
  await expect(page.getByText('No indexed LP positions on this page')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expectClean(observed);
});

test('@liquidity empty CLOB retains separately labelled AMM assets and no execution claim', async ({ page, observed }) => {
  await page.goto('/launchpad/token/demo-graduated?scenario=no-book');
  await expect(page.getByTestId('depth-panel')).toContainText('No resting CLOB orders');
  const health = page.getByTestId('market-liquidity');
  await expect(health).toContainText('No resting CLOB orders');
  await expect(health).toContainText('124.56');
  await expect(health).toContainText('execution depends on your amount');
  await expect(page.getByText('Market orders may fail until liquidity is posted.')).toHaveCount(0);
  expectClean(observed);
});

for (const state of ['rpc-error', 'stale', 'paused', 'both-empty']) {
  test(`@liquidity ${state} is distinct from zero inventory`, async ({ page, observed }) => {
    await page.goto(`/liquidity/pools/demo-graduated?scenario=${state}`);
    const health = page.getByTestId('market-liquidity');
    if (state === 'rpc-error') { await expect(health).toHaveAttribute('data-status', 'unavailable'); await expect(health).toContainText('Unavailable'); }
    if (state === 'stale') await expect(health).toHaveAttribute('data-status', 'stale');
    if (state === 'paused') await expect(health).toContainText('Paused');
    if (state === 'both-empty') { await expect(health).toContainText('No bid'); await expect(health).toContainText('No ask'); }
    expectClean(observed);
  });
}

test('@liquidity manual bid and ask require separate confirmations and preserve bid on ask rejection', async ({ page, observed }) => {
  await page.goto('/liquidity/market-making?token=demo-graduated&simulate=reject-ask');
  await page.getByRole('textbox', { name: 'bid price', exact: true }).fill('0.697');
  await page.getByRole('textbox', { name: 'bid amount', exact: true }).fill('1.23');
  await page.getByRole('textbox', { name: 'ask price', exact: true }).fill('0.704');
  await page.getByRole('textbox', { name: 'ask amount', exact: true }).fill('1.23');
  await page.getByRole('button', { name: 'Review bid and ask', exact: true }).click();
  await expect(page.getByTestId('maker-sequence')).toContainText('Bid not submitted');
  await page.getByRole('button', { name: 'Load bid into ticket', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Simulate ask confirmation', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Simulate bid confirmation', exact: true }).click();
  await page.getByRole('button', { name: 'Load ask into ticket', exact: true }).click();
  await page.getByRole('button', { name: 'Simulate ask confirmation', exact: true }).click();
  await expect(page.getByTestId('maker-sequence')).toContainText('Bid confirmed');
  await expect(page.getByTestId('maker-sequence')).toContainText('Ask not confirmed');
  await expect(page.getByText('Ask request rejected. The confirmed bid remains on chain; retry the ask separately.')).toBeVisible();
  await page.getByRole('button', { name: 'Simulate ask confirmation', exact: true }).click();
  await expect(page.getByTestId('maker-sequence')).toContainText('Ask confirmed');
  await expect(page.getByRole('button', { name: 'Load bid into ticket', exact: true })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  expectClean(observed);
});
