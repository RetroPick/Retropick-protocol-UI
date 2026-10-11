import { test, expect } from '../helpers/test';

// Indexer failure vs genuine empty result (2026-10-12 live-data incident). Both cases are
// produced by routing the browser's /v1/* requests — labelled ROUTED FIXTURE, never live evidence.
const freshness = { chainId: 10143, source: 'MONAD_EVENT_INDEXER', error: null, indexedBlock: 100, indexedBlockHash: '0x' + 'd'.repeat(64), headBlock: 101, lagBlocks: 1, projectionVersion: 2, reorgRevision: 0 };

test('@live indexer unreachable renders an explicit unavailable state, not an empty filter result', async ({ page }) => {
  await page.route(/\/v1\//, (route) => route.abort('namenotresolved'));
  await page.goto('/launchpad');
  const alert = page.getByTestId('indexer-unavailable');
  await expect(alert).toBeVisible();
  await expect(alert).toHaveAttribute('data-failure-kind', 'unreachable');
  await expect(alert).toContainText('Indexer unreachable');
  await expect(alert.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expect(page.getByText('No launches match these filters')).toHaveCount(0);
  await expect(page.getByText('Launch data unavailable')).toBeVisible();
});

test('@live indexer HTTP 502 is classified as an outage', async ({ page }) => {
  await page.route(/\/v1\//, (route) => route.fulfill({ status: 502, contentType: 'application/json', body: '{"error":"STAGING_GATEWAY_UPSTREAM_UNAVAILABLE"}' }));
  await page.goto('/launchpad');
  await expect(page.getByTestId('indexer-unavailable')).toHaveAttribute('data-failure-kind', 'http');
  await expect(page.getByText('No launches match these filters')).toHaveCount(0);
});

test('@live wrong-chain envelope is rejected', async ({ page }) => {
  await page.route(/\/v1\//, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], nextCursor: null, freshness: { ...freshness, chainId: 1 } }) }));
  await page.goto('/launchpad');
  await expect(page.getByTestId('indexer-unavailable')).toHaveAttribute('data-failure-kind', 'wrong-chain');
});

test('@live successful zero-row result keeps the genuine empty state', async ({ page }) => {
  await page.route(/\/v1\//, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], nextCursor: null, freshness }) }));
  await page.goto('/launchpad');
  await expect(page.getByText('No launches match these filters')).toBeVisible();
  await expect(page.getByTestId('indexer-unavailable')).toHaveCount(0);
  await expect(page.getByText('0 launches on this page')).toBeVisible();
});
