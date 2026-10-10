import { test as base, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { installMockWallet, type MockWalletOptions } from './mock-wallet';
import { installNetworkGuard, redactUrl, type NetworkGuard } from './network-guard';

export type Theme = 'dark' | 'light';
const TARGET = (process.env.E2E_TARGET ?? 'fixture') as 'fixture' | 'live' | 'research';
export const EVIDENCE_DIR = process.env.E2E_EVIDENCE_DIR ?? join(import.meta.dirname, '..', '..', '..', '..', 'evidence/platform/frontend/browser-validation', 'adhoc');

export interface ConsoleRecord { type: string; text: string; url?: string; classification: 'app' | 'third-party' | 'guard-blocked' | 'provider-rpc' | 'dev-tooling' | 'environment' }

function classify(text: string, url = ''): ConsoleRecord['classification'] {
  const s = `${text} ${url}`;
  if (/ERR_BLOCKED_BY_CLIENT/.test(s)) return 'guard-blocked';
  if (/ERR_NETWORK_CHANGED|ERR_NETWORK_IO_SUSPENDED|ERR_ADDRESS_UNREACHABLE|ERR_INTERNET_DISCONNECTED/.test(s)) return 'environment';
  if (/fonts\.(googleapis|gstatic)\.com|googletagmanager|sentry|analytics|posthog|intercom|cloudflareinsights|mixpanel|segment|hotjar/i.test(s)) return 'third-party';
  if (/rpc|monad|429|Too Many Requests|HTTP request failed|Failed to fetch|ERR_CONNECTION_REFUSED|ERR_NAME_NOT_RESOLVED|indexer/i.test(s)) return 'provider-rpc';
  if (/\[vite\]|Download the React DevTools|react-devtools/i.test(s)) return 'dev-tooling';
  return 'app';
}

export interface Observed {
  console: ConsoleRecord[];
  pageErrors: string[];
  failedRequests: Array<{ url: string; failure: string }>;
  guard: NetworkGuard;
}

interface Fixtures {
  theme: Theme;
  wallet: MockWalletOptions | false;
  observed: Observed;
  snap: (name: string, page?: Page, opts?: { fullPage?: boolean }) => Promise<string>;
}

export const test = base.extend<Fixtures>({
  theme: ['dark', { option: true }],
  wallet: [{}, { option: true }],
  observed: async ({ page, theme, wallet }, use, testInfo) => {
    if (TARGET !== 'research') {
      await page.addInitScript((t) => { try { localStorage.setItem('retropick-theme', t); } catch { /* ignore */ } }, theme);
      if (wallet !== false) await installMockWallet(page, wallet);
    }
    const guard = await installNetworkGuard(page, TARGET);
    const observed: Observed = { console: [], pageErrors: [], failedRequests: [], guard };
    page.on('console', (m) => {
      if (m.type() !== 'error' && m.type() !== 'warning') return;
      const url = m.location()?.url ?? '';
      observed.console.push({ type: m.type(), text: redactText(m.text()).slice(0, 600), url: redactUrl(url), classification: classify(m.text(), url) });
    });
    page.on('pageerror', (e) => observed.pageErrors.push(redactText(String(e.message)).slice(0, 600)));
    page.on('requestfailed', (r) => observed.failedRequests.push({ url: redactUrl(r.url()), failure: r.failure()?.errorText ?? 'unknown' }));
    await use(observed);
    writeObserved(testInfo, observed);
  },
  snap: async ({ page }, use, testInfo) => {
    await use(async (name, p = page, opts = {}) => {
      const dir = join(EVIDENCE_DIR, 'screenshots', testInfo.project.name);
      mkdirSync(dir, { recursive: true });
      const file = join(dir, `${name}.png`);
      await p.screenshot({ path: file, fullPage: opts.fullPage ?? true, animations: 'disabled' });
      return file;
    });
  },
});

function redactText(text: string): string {
  return text.replace(/https?:\/\/[^\s"'<>]+/g, (url) => redactUrl(url));
}

function writeObserved(testInfo: TestInfo, observed: Observed): void {
  const dir = join(EVIDENCE_DIR, 'observed');
  mkdirSync(dir, { recursive: true });
  const slug = `${testInfo.project.name}__${testInfo.titlePath.slice(1).join('__')}`.replace(/[^a-z0-9_-]+/gi, '-').slice(0, 180);
  const record = {
    test: testInfo.titlePath.join(' > '), project: testInfo.project.name, status: testInfo.status,
    appConsoleErrors: observed.console.filter((c) => c.type === 'error' && c.classification === 'app'),
    console: observed.console, pageErrors: observed.pageErrors, failedRequests: observed.failedRequests,
    guardViolations: observed.guard.violations, blockedExternal: observed.guard.blockedExternal,
    requestCount: observed.guard.requests.length,
  };
  writeFileSync(join(dir, `${slug}.json`), JSON.stringify(record, null, 2));
  appendFileSync(join(EVIDENCE_DIR, 'console-summary.ndjson'), JSON.stringify({ test: record.test, project: record.project, app: record.appConsoleErrors.length, pageErrors: record.pageErrors.length, guardViolations: record.guardViolations.length, nonApp: observed.console.length - record.appConsoleErrors.length }) + '\n');
}

/** Standard quality gate: no new app exceptions, no signing/broadcast attempt. */
export function expectClean(observed: Observed): void {
  expect(observed.guard.violations, 'no signing/broadcast request may leave the browser').toEqual([]);
  expect(observed.pageErrors, 'no uncaught page errors').toEqual([]);
  expect(observed.console.filter((c) => c.type === 'error' && c.classification === 'app').map((c) => c.text), 'no app console errors').toEqual([]);
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'no horizontal page overflow').toBeLessThanOrEqual(1);
}

export { expect };
