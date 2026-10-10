import { chromium } from '@playwright/test';
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto('http://127.0.0.1:3000/earn');
await page.waitForTimeout(1200);
for (const tab of ['Claims', 'Created', 'Referrals', 'Fund & send']) {
  await page.getByRole('tab', { name: tab }).click();
  await page.waitForTimeout(650);
  await page.screenshot({ path: `/tmp/earn-live-${tab.replaceAll(/[^\w]+/g, '-').toLowerCase()}.png` });
}
// send form interaction: pick preset + type recipient to show validation + review state
await page.getByRole('tab', { name: 'Fund & send' }).click();
await page.getByRole('button', { name: '50%' }).click();
await page.locator('input[placeholder="0x…"]').fill('0x1234567890abcdef1234567890abcdef12345678');
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/earn-live-send-filled.png' });
await b.close();
