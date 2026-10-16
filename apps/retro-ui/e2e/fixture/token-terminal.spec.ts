import { test, expect, expectClean, expectNoHorizontalOverflow } from '../helpers/test';
import { walletCalls } from '../helpers/mock-wallet';

const STATES = [
  ['ACTIVE', 'demo-active', 'MDOG'],
  ['GRADUATION_READY', 'demo-graduation-ready', 'ORBIT'],
  ['GRADUATING', 'demo-graduating', 'CMTR'],
  ['GRADUATED', 'demo-graduated', 'NVC'],
] as const;

for (const theme of ['dark', 'light'] as const) {
  test.describe(`terminal ${theme}`, () => {
    test.use({ theme });
    for (const [state, id, symbol] of STATES) {
      test(`@terminal ${state} renders shared terminal with DEMO provenance`, async ({ page, observed, snap }) => {
        await page.goto(`/launchpad/token/${id}`);
        const terminal = page.getByTestId('token-terminal');
        await expect(terminal).toHaveAttribute('data-lifecycle', state);
        await expect(terminal).toHaveAttribute('data-data-mode', 'demo');
        await expect(terminal).toHaveAttribute('data-fixture-version', 'demo-terminal-v1');
        await expect(terminal.locator('[data-provenance="demo"]').first()).toBeVisible();
        await expect(page.getByTestId('token-price')).not.toHaveText('—');
        await expect(page.getByTestId('token-price')).not.toContainText('$');
        await expect(terminal).toContainText(symbol);
        await expect(page.locator('[data-chart-mode="Line"] canvas').first()).toBeVisible();
        // Never a blocking full-page loader.
        await expect(page.getByText('Loading launch…')).toHaveCount(0);
        // Demo identifiers are never linked to the chain explorer.
        await expect(terminal.locator('a[href*="monadexplorer"]')).toHaveCount(0);
        await expectNoHorizontalOverflow(page);
        const ticketBox = (await page.getByTestId('trade-ticket').count()) ? await page.getByTestId('trade-ticket').boundingBox() : null;
        const canvasBox = await page.locator('.rp-chart-canvas').boundingBox();
        if (ticketBox && canvasBox && ticketBox.x > canvasBox.x) expect(canvasBox.x + canvasBox.width, 'chart must not overlap the ticket').toBeLessThanOrEqual(ticketBox.x);
        await snap(`terminal-${state.toLowerCase()}-${theme}`);
        expectClean(observed);
      });
    }
  });
}

test('@terminal chart: Line/Candles and range vs interval are independent controls', async ({ page, observed }) => {
  await page.goto('/launchpad/token/demo-active');
  const types = page.getByRole('radiogroup', { name: 'Chart type' });
  await types.getByRole('radio', { name: 'Candles' }).click();
  await expect(page.locator('[data-chart-mode="Candles"] canvas').first()).toBeVisible();
  const ranges = page.getByRole('radiogroup', { name: 'Time range' });
  const intervals = page.getByRole('radiogroup', { name: 'Candle interval' });
  await ranges.getByRole('radio', { name: '6H' }).click();
  await expect(ranges.getByRole('radio', { name: '6H' })).toHaveAttribute('aria-checked', 'true');
  // 6H offers genuine 1m/5m/15m candles; 1h candles are not offered for a 6H range.
  await expect(intervals.getByRole('radio', { name: '1h' })).toHaveAttribute('aria-disabled', 'true');
  await intervals.getByRole('radio', { name: '15m' }).click();
  await expect(intervals.getByRole('radio', { name: '15m' })).toHaveAttribute('aria-checked', 'true');
  const count15 = Number(await page.locator('[data-candle-count]').getAttribute('data-candle-count'));
  expect(count15).toBeGreaterThan(0);
  expect(count15).toBeLessThanOrEqual(24);
  await ranges.getByRole('radio', { name: '7D' }).click();
  await expect(intervals.getByRole('radio', { name: '15m' })).toHaveAttribute('aria-checked', 'true');
  // Keyboard: arrow keys move within the radiogroup.
  await intervals.getByRole('radio', { name: '15m' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(intervals.getByRole('radio', { name: '1h' })).toHaveAttribute('aria-checked', 'true');
  expectClean(observed);
});

test('@terminal ACTIVE ticket: Market/Limit then Buy/Sell; limit locked with reason; presets and slippage', async ({ page, observed, snap }, info) => {
  test.skip(info.project.name.startsWith('mobile'), 'mobile ticket covered in sheet test');
  await page.goto('/launchpad/token/demo-active');
  const ticket = page.getByTestId('trade-ticket');
  await expect(ticket.getByRole('radiogroup', { name: 'Order type' }).getByRole('radio', { name: 'Limit' })).toHaveAttribute('aria-disabled', 'true');
  await ticket.getByRole('radiogroup', { name: 'Order type' }).getByRole('radio', { name: 'Limit' }).hover();
  await expect(page.getByRole('tooltip')).toContainText('Limit orders unlock when this market graduates to Kuru.');
  await expect(ticket.getByRole('button', { name: 'Connect demo wallet' })).toBeVisible();
  await ticket.getByRole('button', { name: 'Connect demo wallet' }).click();
  await ticket.getByRole('button', { name: '25%' }).click();
  await expect(page.getByTestId('ticket-amount')).toHaveValue('30');
  await expect(page.getByTestId('ticket-receive')).toContainText('MDOG');
  await expect(ticket.getByRole('button', { name: 'Max' })).toBeDisabled(); // native MON keeps gas
  await ticket.getByRole('button', { name: /Adjust/ }).click();
  await ticket.getByRole('radiogroup', { name: 'Slippage tolerance' }).getByRole('radio', { name: '2%' }).click();
  await expect(ticket).toContainText('2%');
  await ticket.getByRole('radiogroup', { name: 'Trade side' }).getByRole('radio', { name: 'Sell' }).click();
  await expect(ticket).toHaveAttribute('data-side', 'Sell');
  await page.getByTestId('ticket-amount').fill('1000');
  await expect(page.getByTestId('ticket-receive')).toContainText('MON');
  await ticket.getByRole('button', { name: /Sell MDOG · SIMULATED/ }).click();
  await expect(ticket.locator('[data-stage="completed"]')).toContainText('SIMULATED');
  await snap('ticket-active-sell');
  expect(await walletCalls(page)).toEqual([]);
  expectClean(observed);
});

test('@terminal GRADUATED ticket: limit enabled with GTC, margin shortfall shows two-step funding', async ({ page, observed, snap }, info) => {
  test.skip(info.project.name.startsWith('mobile'), 'mobile ticket covered in sheet test');
  await page.goto('/launchpad/token/demo-graduated?scenario=margin-shortfall');
  const ticket = page.getByTestId('trade-ticket');
  await ticket.getByRole('button', { name: 'Connect demo wallet' }).click();
  await ticket.getByRole('radiogroup', { name: 'Order type' }).getByRole('radio', { name: 'Limit' }).click();
  await expect(ticket).toContainText('Good till cancelled');
  await expect(ticket).not.toContainText(/30 days|expires/i);
  await page.getByTestId('ticket-limit-price').fill('0.01');
  await page.getByTestId('ticket-amount').fill('100');
  await expect(page.getByTestId('ticket-total')).toHaveText('1 NVDAx');
  await expect(page.getByTestId('funding-preview')).toContainText('Step 1/2 · Deposit 0.5 NVDAx to Kuru margin');
  await expect(page.getByTestId('funding-preview')).toContainText('Two wallet signatures');
  await expect(ticket.getByRole('button', { name: /Deposit & place order/ })).toBeEnabled();
  await snap('ticket-graduated-shortfall', page, { fullPage: false });
  await ticket.getByRole('button', { name: /Deposit & place order/ }).click();
  await expect(ticket.locator('[data-flow="done"]')).toHaveText('Order placed');
  expect(await walletCalls(page)).toEqual([]);
  expectClean(observed);
});

test('@terminal deposit rejected → no order; order rejected → "Margin deposited; order not placed" → retry without re-deposit', async ({ page, observed }, info) => {
  test.skip(info.project.name.startsWith('mobile'));
  await page.goto('/launchpad/token/demo-graduated?scenario=margin-shortfall&simulate=reject-deposit');
  let ticket = page.getByTestId('trade-ticket');
  await ticket.getByRole('button', { name: 'Connect demo wallet' }).click();
  await page.getByTestId('ticket-amount').fill('10');
  await ticket.getByRole('button', { name: /Deposit & place order/ }).click();
  await expect(ticket.locator('[data-flow="deposit-failed"]')).toContainText('rejected');
  await page.goto('/launchpad/token/demo-graduated?scenario=margin-shortfall&simulate=reject-order');
  ticket = page.getByTestId('trade-ticket');
  await ticket.getByRole('button', { name: 'Connect demo wallet' }).click();
  await page.getByTestId('ticket-amount').fill('10');
  await ticket.getByRole('button', { name: /Deposit & place order/ }).click();
  await expect(ticket.locator('[data-flow="order-failed"]')).toContainText('Margin deposited; order not placed');
  await expect(ticket.getByRole('button', { name: /Place order \(margin already deposited\)/ })).toBeVisible();
  await ticket.locator('summary', { hasText: 'Advanced' }).click();
  await expect(page.getByTestId('margin-quote')).toHaveText('10');
  expect(await walletCalls(page)).toEqual([]);
  expectClean(observed);
});

test('@terminal tabs: trades, holders with classification, protocol groups, orders by status', async ({ page, observed, snap }) => {
  await page.goto('/launchpad/token/demo-graduated');
  const tabs = page.getByRole('tablist', { name: 'Token data' });
  await expect(page.getByRole('table', { name: /Recent trades/ })).toBeVisible();
  await expect(page.getByRole('table', { name: /Recent trades/ }).locator('tbody tr').first()).toContainText(/Buy|Sell/);
  await tabs.getByRole('tab', { name: /Holders/ }).click();
  await expect(page.getByRole('table', { name: /Holders of/ })).toContainText('Liquidity');
  await tabs.getByRole('tab', { name: 'Protocol' }).click();
  for (const g of ['Launch', 'Economics', 'Graduation', 'Verification']) await expect(page.getByRole('heading', { name: g, exact: true })).toBeVisible();
  await expect(page.getByRole('tabpanel')).toContainText('DEMO fixture');
  await tabs.getByRole('tab', { name: 'Orders' }).click();
  const statuses = page.getByRole('radiogroup', { name: 'Order status' });
  await expect(page.getByRole('table', { name: 'Your orders' }).locator('tbody tr')).toHaveCount(3);
  await statuses.getByRole('radio', { name: 'Filled' }).click();
  await expect(page.getByRole('table', { name: 'Your orders' }).locator('tbody tr')).toHaveCount(1);
  await snap('tabs-orders');
  // Copy feedback.
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await tabs.getByRole('tab', { name: 'Trades' }).click();
  await page.getByRole('button', { name: 'Copy token' }).first().click();
  await expect(page.getByRole('button', { name: 'token copied' }).first()).toBeVisible();
  expectClean(observed);
});

test('@terminal empty scenarios: no holders, no orders, stale indexer, slow RPC', async ({ page, observed }) => {
  await page.goto('/launchpad/token/demo-active?scenario=no-holders');
  await page.getByRole('tab', { name: /Holders/ }).click();
  await expect(page.getByText('No holders indexed')).toBeVisible();
  await page.goto('/launchpad/token/demo-graduated?scenario=no-orders');
  await page.getByRole('tab', { name: 'Orders' }).click();
  await expect(page.getByText('No open orders')).toBeVisible();
  await page.goto('/launchpad/token/demo-active?scenario=stale-indexer');
  await expect(page.getByText(/Indexer delayed · 412 blocks behind/).first()).toBeVisible();
  await expect(page.getByTestId('token-price')).not.toHaveText('—');
  await page.goto('/launchpad/token/demo-active?scenario=slow-rpc');
  await expect(page.getByText(/Syncing on-chain state/).first()).toBeVisible();
  await expect(page.getByTestId('token-terminal')).toBeVisible();
  expectClean(observed);
});

test('@terminal ACTIVE orders tab is disabled until graduation', async ({ page, observed }) => {
  await page.goto('/launchpad/token/demo-active');
  await expect(page.getByRole('tab', { name: 'Orders' })).toBeDisabled();
  expectClean(observed);
});

test('@terminal GRADUATED renders aggregated orderbook depth; ACTIVE hides it; no-book shows empty state', async ({ page, observed, snap }) => {
  await page.goto('/launchpad/token/demo-graduated');
  const depth = page.getByTestId('depth-panel');
  await expect(depth).toBeVisible();
  await expect(depth).toHaveAttribute('data-data-mode', 'demo');
  await expect(depth.locator('[data-provenance="demo"]').first()).toBeVisible();
  await expect(depth.locator('.rp-depth-row[data-side="bid"]')).toHaveCount(7);
  await expect(depth.locator('.rp-depth-row[data-side="ask"]')).toHaveCount(7);
  // Ladder ordering: best bid (highest) first; best ask (lowest) last on the ask side.
  const bidPrices = await depth.locator('.rp-depth-row[data-side="bid"] .rp-depth-price').allTextContents();
  expect(Number(bidPrices[0].replace(/,/g, ''))).toBeGreaterThan(Number(bidPrices[1].replace(/,/g, '')));
  const askPrices = await depth.locator('.rp-depth-row[data-side="ask"] .rp-depth-price').allTextContents();
  expect(Number(askPrices[0].replace(/,/g, ''))).toBeGreaterThan(Number(askPrices[6].replace(/,/g, '')));
  await expect(page.getByTestId('depth-spread')).toContainText('Spread');
  // Cumulative bars exist and are bounded.
  for (const bar of await depth.locator('.rp-depth-bar').all()) {
    const width = (await bar.boundingBox())?.width ?? 0;
    expect(width).toBeGreaterThan(0);
  }
  await snap('depth-graduated');
  await page.goto('/launchpad/token/demo-active');
  await expect(page.getByTestId('depth-panel')).toHaveCount(0);
  await page.goto('/launchpad/token/demo-graduated?scenario=no-book');
  const empty = page.getByTestId('depth-panel');
  await expect(empty).toBeVisible();
  await expect(empty).toContainText('No resting CLOB orders');
  expectClean(observed);
});

test('@terminal GRADUATED post-only toggle switches order policy', async ({ page, observed }, info) => {
  test.skip(info.project.name.startsWith('mobile'), 'mobile ticket covered in sheet test');
  await page.goto('/launchpad/token/demo-graduated');
  const ticket = page.getByTestId('trade-ticket');
  await ticket.getByRole('button', { name: 'Connect demo wallet' }).click();
  await ticket.getByRole('radiogroup', { name: 'Order type' }).getByRole('radio', { name: 'Limit' }).click();
  const postOnly = page.getByTestId('ticket-post-only');
  await expect(ticket).toContainText('Good till cancelled');
  await postOnly.check();
  await expect(postOnly).toBeChecked();
  await expect(ticket).toContainText('Post-only · maker only');
  await expect(ticket.getByTestId('ticket-limit-price')).toBeVisible();
  await postOnly.uncheck();
  await expect(ticket).toContainText('Good till cancelled');
  expectClean(observed);
});

test('@terminal mobile: sticky Trade bar opens bottom-sheet ticket', async ({ page, observed, snap }, info) => {
  test.skip(!info.project.name.startsWith('mobile'), 'mobile only');
  await page.goto('/launchpad/token/demo-active');
  await expect(page.getByTestId('trade-ticket')).toHaveCount(0);
  const bar = page.getByTestId('mobile-trade-bar');
  await expect(bar).toBeVisible();
  await snap('mobile-terminal');
  await bar.getByRole('button', { name: 'Trade' }).tap();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByTestId('trade-ticket')).toBeVisible();
  await dialog.getByRole('button', { name: 'Connect demo wallet' }).tap();
  await dialog.getByRole('button', { name: '50%' }).tap();
  await expect(dialog.getByTestId('ticket-receive')).toContainText('MDOG');
  await snap('mobile-sheet', page, { fullPage: false });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  expectClean(observed);
});
