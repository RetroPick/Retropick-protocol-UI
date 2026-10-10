import { defineConfig } from '@playwright/test';
import baseline from '../playwright.config';
import { resolve } from 'node:path';

// Separate port and build directory prevent parallel agents' fixture builds replacing served assets.
const live = process.env.E2E_TARGET === 'live';
const port = Number(process.env.E2E_RESUME_PORT ?? (live ? 4321 : 4320));
const directory = `/tmp/retro-ui-resume-${live ? 'live' : 'fixture'}-${port}-dist`;
export default defineConfig({
  ...baseline,
  testDir: '.',
  use: { ...baseline.use, baseURL: `http://127.0.0.1:${port}` },
  workers: 2,
  webServer: {
    ...baseline.webServer,
    cwd: resolve(import.meta.dirname, '..'),
    stdout: 'pipe',
    command: `pnpm exec vite build --outDir ${directory} --emptyOutDir --logLevel warn && pnpm exec vite preview --outDir ${directory} --port ${port} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${port}/launchpad`,
  },
});
