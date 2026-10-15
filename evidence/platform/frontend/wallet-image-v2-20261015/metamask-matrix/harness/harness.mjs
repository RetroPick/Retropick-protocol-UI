// Differential real-MetaMask harness — final (MetaMask v12.23.1 local build, patched scuttle/snow).
// Usage: node harness.mjs <A|B|C|D|E> — fresh throwaway wallet per run.
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, getMetaMask } from '@chainsafe/dappeteer';

const MODE = process.argv[2];
if (!['A', 'B', 'C', 'D', 'E'].includes(MODE)) { console.error('usage: node harness.mjs <A|B|C|D|E>'); process.exit(1); }
const PASSWORD = 'RetroPick-Test-Wallet-1';
const PORT = 8931;
const OUT = `/tmp/metamask-harness/results/${MODE}`;
mkdirSync(OUT, { recursive: true });

const MONAD = {
  chainId: '0x279f', chainName: 'Monad Testnet', nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: ['https://testnet-rpc.monad.xyz'], blockExplorerUrls: ['https://testnet.monadexplorer.com'],
};
const GIF = 'https://gateway.pinata.cloud/ipfs/QmSHMEd2FMpQfEzuzMt3arZCStvrY9g4QjU6pJsZNLkKND';
const PNG = 'https://gateway.pinata.cloud/ipfs/QmQ3ZHQKVpFfZQ4voXyT1pt4Re3KjKL73D1cPugqYx6KGt';
const RETRO_PNG = 'https://gateway.pinata.cloud/ipfs/Qmc3ZojHMWXFkautyJvnud1YzDN3jNvPH7QWb39bYmy9aL';

const CASES = {
  A: [{ label: 'import-gif', options: { address: '0xc399c1a37d1d202d315f7f4c1a24e34c8e50e50f', symbol: 'CIS', decimals: 18, image: GIF } }],
  B: [{ label: 'import-png', options: { address: '0xc399c1a37d1d202d315f7f4c1a24e34c8e50e50f', symbol: 'CIS', decimals: 18, image: PNG } }],
  C: [
    { label: 'import-no-image', options: { address: '0xc399c1a37d1d202d315f7f4c1a24e34c8e50e50f', symbol: 'CIS', decimals: 18 } },
    { label: 're-watch-png', options: { address: '0xc399c1a37d1d202d315f7f4c1a24e34c8e50e50f', symbol: 'CIS', decimals: 18, image: PNG } },
  ],
  D: [{ label: 'import-png', options: { address: '0xc399c1a37d1d202d315f7f4c1a24e34c8e50e50f', symbol: 'CIS', decimals: 18, image: PNG } }],
  E: [{ label: 'control-retro-png', options: { address: '0xf8f17922599136b44e175eec9a43123c000f3366', symbol: 'RETRO', decimals: 18, image: RETRO_PNG } }],
};

const PAGE_HTML = `<!doctype html><html><body><h3>watchAsset harness</h3><script>
window.__watch = (options) => window.ethereum.request({ method: 'wallet_watchAsset', params: { type: 'ERC20', options } })
  .then((r) => ({ ok: true, result: r }), (e) => ({ ok: false, code: e.code, message: String(e.message) }));
window.__chainId = () => window.ethereum.request({ method: 'eth_chainId' });
window.__addChain = (params) => window.ethereum.request({ method: 'wallet_addEthereumChain', params: [params] });
</script></body></html>`;
const server = createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(PAGE_HTML); });
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const record = { mode: MODE, startedAt: new Date().toISOString(), steps: [] };
const log = (step, extra = {}) => { record.steps.push({ step, at: new Date().toISOString(), ...extra }); console.log(`[${MODE}] ${step}`, extra.result ?? extra.error ?? ''); };

const browser = await launch({ automation: 'playwright', metaMaskPath: '/tmp/metamask-harness/ext-v12', headless: false, playwrightOptions: { headless: false } });
let mm = null;
for (let i = 0; i < 40 && !mm; i++) { await new Promise(r => setTimeout(r, 1000)); mm = (await browser.pages()).map(p => p.getSource()).find(p => p.url().includes('home.html')); }
if (!mm) throw new Error('MetaMask tab never opened');
const extId = (mm.url().match(/chrome-extension:\/\/([a-p]{32})/) || [])[1];

const shoot = (n) => mm.screenshot({ path: `${OUT}/${n}.png` }).catch(() => {});
const clickB = async (name, exact = false) => { await mm.getByRole('button', { name, exact }).first().click({ timeout: 4000 }); await mm.waitForTimeout(1500); };

// --- proven onboarding flow (v12.23.1) ---
await mm.waitForSelector('text=Get started', { timeout: 20000 });
await mm.waitForTimeout(1200);
await shoot('ob-00');
await clickB('Get started', true);
for (let i = 0; i < 10; i++) {
  await mm.evaluate(() => { const els = [...document.querySelectorAll('[role="dialog"] *')]; const s = els.filter(e => e.scrollHeight > e.clientHeight + 40).sort((a, b) => b.scrollHeight - a.scrollHeight)[0]; if (s) s.scrollTop = s.scrollHeight; }).catch(() => {});
  await mm.waitForTimeout(350);
  const agree = mm.getByRole('button', { name: 'Agree' });
  if (await agree.count() && await agree.isEnabled()) break;
}
await shoot('ob-01-terms');
const cb = mm.getByRole('checkbox').first();
if (await cb.count()) await cb.check().catch(() => {});
await mm.waitForTimeout(300);
await clickB('Agree');
await shoot('ob-02');
await clickB('Create a new wallet');
await mm.getByRole('textbox', { name: 'Create new password' }).fill(PASSWORD);
await mm.waitForTimeout(400);
await mm.getByRole('textbox', { name: 'Confirm password' }).fill(PASSWORD).catch(async () => { await mm.waitForTimeout(600); await mm.getByRole('textbox', { name: 'Confirm password' }).fill(PASSWORD); });
await mm.getByRole('checkbox').first().check();
await mm.waitForTimeout(300);
await clickB('Create password');
await shoot('ob-03');
await clickB('Remind me later');
await mm.waitForTimeout(800);
const skipBox = mm.getByRole('checkbox').first();
if (await skipBox.count()) await skipBox.check().catch(() => {});
await mm.waitForTimeout(400);
const skip = mm.getByRole('button', { name: 'Skip', exact: true }).first();
if (await skip.count()) { await skip.click({ timeout: 3000 }); await mm.waitForTimeout(1500); }
await shoot('ob-04');
await clickB('No thanks');
for (let i = 0; i < 4; i++) {
  const done = mm.getByRole('button', { name: 'Done', exact: true }).first();
  const cont = mm.getByRole('button', { name: 'Continue' }).first();
  if (await done.count()) await clickB('Done', true);
  else if (await cont.count()) await clickB('Continue');
  else break;
}
await mm.waitForTimeout(2000);
await shoot('ob-05-home');
log('onboarding complete', { url: mm.url() });

// Wallet prompts (add network / watch asset) open in a separate notification popup window.
const popupWithButton = async (names, timeoutMs = 12000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const p of mm.context().pages()) {
      const url = p.url();
      if (!url.includes('notification') && !url.includes('home.html#')) continue;
      if (p === mm && !url.includes('notification')) continue;
      for (const name of names) {
        const b = p.getByRole('button', { name }).first();
        if (await b.count().catch(() => 0)) {
          try { await b.click({ timeout: 2000 }); await new Promise(r => setTimeout(r, 1200)); return { page: p, clicked: name }; } catch { /* keep scanning */ }
        }
      }
    }
    await new Promise(r => setTimeout(r, 400));
  }
  return null;
};

let version = null;
{
  const mp = await mm.context().newPage();
  await mp.goto(`chrome-extension://${extId}/manifest.json`);
  const text = await mp.locator('body').innerText().catch(() => '');
  version = (text.match(/"version"\s*:\s*"([^"]+)"/) || [])[1] ?? null;
  await mp.close();
}
record.extension = { id: extId, version, browser: 'playwright-chromium', source: 'metamask-chrome-12.23.1.zip' };
log('wallet ready', { extensionVersion: version });

const page = await mm.context().newPage();
await page.goto(`http://127.0.0.1:${PORT}/`);

// --- add Monad Testnet ---
const addChain = page.evaluate((params) => window.__addChain(params), MONAD);
const approvedNet = await popupWithButton(['Approve', 'Add network']);
await addChain.catch((e) => log('addChain error', { error: String(e).slice(0, 120) }));
log('network prompt', { approvedNet });
record.chainId = await page.evaluate(() => window.__chainId()).catch(() => null);
log('network added', { chainId: record.chainId });
await shoot('network-added');

const iconState = async (symbol) => mm.evaluate((sym) => {
  const imgs = [...document.querySelectorAll('img')].map((i) => ({ src: (i.currentSrc || i.src || '').slice(0, 170), nw: i.naturalWidth }));
  return {
    textHasToken: document.body.innerText.includes(sym),
    remoteImgs: imgs.filter((i) => /^https?:\/\//.test(i.src)),
    dataImgs: imgs.filter((i) => i.src.startsWith('data:')).length,
  };
}, symbol).catch((e) => ({ error: String(e).slice(0, 120) }));

// --- matrix ---
for (const step of CASES[MODE]) {
  const promise = page.evaluate((options) => window.__watch(options), step.options);
  const approved = await popupWithButton(['Add token', 'Confirm', 'Approve'], 15000);
  const accepted = approved ? 'clicked:' + approved.clicked + (approved.page !== mm ? ' (popup)' : '') : 'no-prompt-found';
  if (approved && approved.page !== mm) await approved.page.screenshot({ path: OUT + '/prompt-' + step.label + '.png' }).catch(() => {});
  else await shoot('prompt-' + step.label);
  const result = await promise;
  log('watchAsset ' + step.label, { accepted, result, payload: { type: 'ERC20', options: step.options } });
  await mm.waitForTimeout(1500);
  await shoot('after-' + step.label);
}

// --- persisted-state icon evidence ---
await mm.bringToFront().catch(() => {});
await mm.reload();
await mm.waitForTimeout(4000);
await shoot('wallet-home');
record.iconState = await iconState('CIS');
log('icon state (home)', record.iconState);

try {
  const row = mm.getByText('CIS', { exact: true }).first();
  if (await row.count()) {
    await row.click({ timeout: 4000 });
    await mm.waitForTimeout(2500);
    await shoot('token-detail');
    record.iconStateDetail = await iconState('CIS');
    log('icon state (detail)', record.iconStateDetail);
  } else log('CIS row not visible on home');
} catch (e) { log('token detail open failed', { error: String(e).slice(0, 100) }); }

writeFileSync(OUT + '/record.json', JSON.stringify(record, null, 2) + '\n');
console.log('DONE ' + MODE + ' -> ' + OUT + '/record.json');
await browser.close();
server.close();
process.exit(0);
