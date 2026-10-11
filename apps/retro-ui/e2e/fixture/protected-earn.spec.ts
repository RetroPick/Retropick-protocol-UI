import { test, expect } from '../helpers/test';

// Protected Earn panel renders with honest mode labels (demo/fixture mode shows the live-only
// note; the live panel is covered by unit tests for the binding + signer and manual passkey
// evidence). This guards that the tab mounts and the honesty copy is present.
test('@smoke Earn Protection tab shows honest protection modes', async ({ page }) => {
  await page.goto('/earn#protection');
  // Demo mode: live-only note. Live mode: full panel. Either way the tab must exist and mount.
  await expect(page.getByRole('tab', { name: 'Protection' })).toBeVisible();
  await page.getByRole('tab', { name: 'Protection' }).click();
  const liveOnly = page.getByText(/Protected Earn .* is a live-mode feature/);
  const panel = page.getByTestId('protected-earn');
  await expect(liveOnly.or(panel).first()).toBeVisible();
});
