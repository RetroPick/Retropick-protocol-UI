import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
const evidence = process.env.E2E_EVIDENCE_DIR;
if (!evidence) throw new Error('E2E_EVIDENCE_DIR required');
mkdirSync(evidence, { recursive: true });
const browser = await chromium.launch();
const feed = await fetch('http://127.0.0.1:8787/v1/launches?limit=20').then(r => r.json());
const token = feed.data.find(l => l.phase === 'GRADUATED').token;
const activeToken = feed.data.find(l => l.phase === 'ACTIVE').token;
const results = [];
const variants = (process.env.E2E_PROBE_VARIANTS ?? 'strict-clean,no-strict-clean,strict-no-performance-measure,strict-devtools-hook').split(',');
for (const variant of variants) {
  const page = await browser.newPage();
  const record = { variant, extensions: 'none (fresh isolated Chromium)', errors: [], consoleErrors: [], blocked: [], routes: [] };
  let currentRoute = '';
  page.on('pageerror', e => record.errors.push({route:currentRoute,message:e.message, stack:e.stack?.replace(/https?:\/\/[^\s)]+/g, '[source]')}));
  page.on('console', m => { if (m.type() === 'error') record.consoleErrors.push(m.text().replace(/https?:\/\/[^\s)]+/g, '[source]').slice(0,1500)); });
  await page.route('**/*', async route => {
    const request = route.request();
    const body = request.postData() ?? '';
    if (request.method() === 'POST' && (!body.includes('"jsonrpc"') || /"method"\s*:\s*"(?:eth_send\w*|eth_sign\w*|personal_sign|wallet_send\w*)"/.test(body))) {
      record.blocked.push({ method:request.method(), reason:'write blocked' });
      return route.abort('blockedbyclient');
    }
    if (variant === 'no-strict-clean' && new URL(request.url()).pathname === '/src/main.tsx') {
      const response = await route.fetch();
      return route.fulfill({ response, body:(await response.text()).replace(/\bStrictMode\b/g, 'Fragment') });
    }
    return route.continue();
  });
  if (variant === 'strict-no-performance-measure') await page.addInitScript(() => { performance.measure = undefined; });
  if (variant === 'strict-devtools-hook') await page.addInitScript(() => { const renderers = new Map(); window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { renderers, supportsFiber:true, inject:r=>{renderers.set(1,r);return 1;}, onCommitFiberRoot:()=>{}, onCommitFiberUnmount:()=>{}, onPostCommitFiberRoot:()=>{} }; });
  await page.addInitScript(() => {
    const stringify = JSON.stringify;
    window.__failedBigintArrays = [];
    JSON.stringify = function(value, ...args) {
      try { return stringify.call(JSON, value, ...args); }
      catch(error) { if (Array.isArray(value)) window.__failedBigintArrays.push(value.map(v=>({type:typeof v,value:String(v)}))); throw error; }
    };
  });
  for (const route of ['/launchpad', `/launchpad/token/${activeToken}`, `/launchpad/token/${token}`, '/launchpad/create']) {
    currentRoute = route;
    await page.goto(`http://127.0.0.1:4319${route}`, { waitUntil:'domcontentloaded', timeout:90000 });
    await page.waitForTimeout(10000);
    if (process.env.E2E_ASSERT_CLEAN && route.includes('/token/')) await page.getByTestId('token-terminal').waitFor({timeout:60000});
    record.routes.push({ route, bodyLength: await page.locator('body').innerText().then(x=>x.length), terminal:await page.getByTestId('token-terminal').count(), failedArrays:await page.evaluate(()=>window.__failedBigintArrays), profilerFailure:await page.evaluate(()=>window.__profilerFailure ?? null) });
  }
  results.push(record);
  await page.close();
  writeFileSync(`${evidence}/dev-probe.json`, JSON.stringify(results,null,2));
}
await browser.close();
console.log(JSON.stringify(results.map(r=>({variant:r.variant, errors:r.errors.length, consoleErrors:r.consoleErrors.length, routes:r.routes})),null,2));
if (process.env.E2E_ASSERT_CLEAN && results.some(r=>r.errors.length || r.consoleErrors.length || r.blocked.length)) throw new Error('Dev regression probe failed; see dev-probe.json');
