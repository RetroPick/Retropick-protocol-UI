import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './recovery', timeout: 60000, expect: { timeout: 15000 }, fullyParallel: false, workers: 1, retries: 0,
  reporter: [['list'], ['json', { outputFile: '/tmp/retro-p0-recovery-results.json' }]],
  use: { baseURL: 'http://127.0.0.1:4320', trace: 'retain-on-failure', screenshot: 'only-on-failure', serviceWorkers: 'block' },
  projects: [ { name: 'recovery-desktop-1440', use: { viewport: { width: 1440, height: 900 } } }, { name: 'recovery-mobile-390', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } } ],
  webServer: {
    cwd: resolve(import.meta.dirname, '..'),
    command: 'pnpm exec vite build --outDir /tmp/retro-ui-p0-recovery-dist --emptyOutDir --logLevel warn && pnpm exec vite preview --outDir /tmp/retro-ui-p0-recovery-dist --port 4320 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:4320/launchpad', reuseExistingServer: false, timeout: 240000,
    env: { VITE_DATA_MODE: 'live', VITE_INDEXER_URL: 'http://127.0.0.1:4320', VITE_MONAD_RPC_URL: 'http://127.0.0.1:9996', VITE_MONAD_RPC_FALLBACK_URL: 'http://127.0.0.1:9997', VITE_WALLET_BRIDGE_URL: '', DISABLE_HMR: 'true' },
  },
});
