// Read-only staging validation against the deployed Vercel URL (no local server).
// Run: STAGING_URL=https://… pnpm --filter @retropick/retro-ui exec playwright test --config e2e/staging.config.ts
// Wallet bridge is never installed (no VITE_WALLET_BRIDGE_URL in staging); these tests
// never sign — read-only rendering/data assertions over the public deployment.
import { defineConfig, devices } from '@playwright/test';

const stagingUrl = process.env.STAGING_URL;
if (!stagingUrl) throw new Error('STAGING_URL is required for the staging config');

export default defineConfig({
  testDir: './staging',
  timeout: 45_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: stagingUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'staging-desktop-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'staging-mobile-390', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
});
