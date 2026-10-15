import { test, expect, expectClean } from '../helpers/test';
import { walletCalls, walletMethodCalls } from '../helpers/mock-wallet';

// Live-mode Add-to-Wallet (EIP-747 wallet_watchAsset) coverage for launch tokens on Monad Testnet.
// The browser runs against the real chain RPC (read-only); the wallet is the EIP-1193 mock, so the
// request payload is asserted exactly and the wallet prompt is always user-initiated (a click).
// Token identity/decimals/logo all resolve on-chain, so only the RPC must be reachable.
const RPC = 'https://testnet-rpc.monad.xyz';
// CIS ("College is Scam") — live launch with an on-chain ipfs:// logo.
const CIS = '0xc399c1a37d1d202d315f7f4c1a24e34c8e50e50f';
const CIS_LOGO_CID = 'QmSHMEd2FMpQfEzuzMt3arZCStvrY9g4QjU6pJsZNLkKND';
const CIS_WALLET_ICON = 'https://retropick.xyz/wallet/416b0da3cf5de37a329f941291a19230f6d7a45ee9572e858e6b7dc46d84f9fb.png'; // Committed square-PNG derivative of the on-chain GIF.

let liveReady = false; let reason = '';
test.beforeAll(async () => {
  try {
    const response = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }), signal: AbortSignal.timeout(8000) });
    const body = await response.json() as { result?: string };
    liveReady = Number(body?.result) === 10143;
    if (!liveReady) reason = `RPC chainId ${body?.result}`;
  } catch (cause) { reason = `ENVIRONMENT: Monad RPC unreachable (${(cause as Error).message})`; }
});

/** The sticky mobile trade bar overlays bottom controls on mobile widths; activate by keyboard there. */
async function activate(page: import('@playwright/test').Page, locator: import('@playwright/test').Locator): Promise<void> {
  if (test.info().project.name.startsWith('mobile')) { await locator.focus(); await locator.press('Enter'); }
  else await locator.click();
}

/** Open the CIS token page. vite preview does not serve the same-origin radar rewrite, so the
 * panel's snapshot is fulfilled with a valid empty snapshot — the radar fail-closes to its own
 * honest empty note, and no unrelated console noise pollutes the quality gate. */
async function openTokenPage(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/radar/radar', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ source: 'ENVIO_HYPERSYNC', chainId: 10143, counts: { launched: 0, committed: 0, secured: 0, completed: 0 }, activeOnCurve: 0, tokens: [], markets: [], freshness: { headHeight: 0, lastEventBlock: 0, cursorBlock: 0, lagBlocks: 0 }, health: { ok: false, status: 'OFFLINE', anchorVerified: false }, computedAt: 0 }),
  }));
  await page.goto(`/launchpad/token/${CIS}`);
}

async function connectMockWallet(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('button[data-wallet-status="disconnected"]:visible').first().click();
  await page.getByRole('button', { name: 'E2E Mock Wallet' }).click();
  await expect(page.locator('button[data-wallet-status="connected"]:visible').first()).toBeVisible();
}

test('@live add to wallet: registers the token only on click, with the on-chain payload', async ({ page, observed, snap }) => {
  test.skip(!liveReady, reason);
  await openTokenPage(page);
  const button = page.getByTestId('add-to-wallet');
  await expect(button).toBeVisible();

  // Nothing asks the wallet anything during page load — no auto-prompt.
  expect(await walletCalls(page)).not.toContain('wallet_watchAsset');
  await connectMockWallet(page);
  expect(await walletCalls(page)).not.toContain('wallet_watchAsset');

  await activate(page, button);
  await expect(page.getByText('submitted to your wallet')).toBeVisible();

  const requests = await walletMethodCalls<{ params: { type: string; options: Record<string, unknown> } }>(page, 'wallet_watchAsset');
  expect(requests, 'exactly one watchAsset request per click').toHaveLength(1);
  const payload = requests[0].params;
  expect(payload.type).toBe('ERC20');
  expect(payload.options.address.toLowerCase()).toBe(CIS);
  expect(payload.options.symbol).toBe('CIS');
  expect(payload.options.decimals, 'decimals are the on-chain value').toBe(18);
  const image = String(payload.options.image);
  expect(image, 'wallet receives the committed square-PNG derivative').toBe(CIS_WALLET_ICON);
  await snap('live-add-to-wallet-registered');
  expectClean(observed);
});

test.describe('wallet rejects the watchAsset prompt', () => {
  test.use({ wallet: { watchAsset: 'reject' } });
  test('@live add to wallet: wallet rejection surfaces once, without retry loops', async ({ page, observed }) => {
    test.skip(!liveReady, reason);
    await openTokenPage(page);
    await expect(page.getByTestId('add-to-wallet')).toBeVisible();
    await connectMockWallet(page);
    await activate(page, page.getByTestId('add-to-wallet'));
    await expect(page.getByText('Request rejected in wallet.')).toBeVisible();
    expect(await walletMethodCalls(page, 'wallet_watchAsset')).toHaveLength(1);
    expectClean(observed);
  });
});

test.describe('wallet cannot register tokens', () => {
  test.use({ wallet: { watchAsset: 'unsupported' } });
  test('@live add to wallet: unsupported wallets get the copy-address fallback', async ({ page, observed }) => {
    test.skip(!liveReady, reason);
    await openTokenPage(page);
    await expect(page.getByTestId('add-to-wallet')).toBeVisible();
    await connectMockWallet(page);
    await activate(page, page.getByTestId('add-to-wallet'));
    await expect(page.getByText('This wallet cannot register tokens.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy token address' })).toBeVisible();
    expect(await walletMethodCalls(page, 'wallet_watchAsset')).toHaveLength(1);
    expectClean(observed);
  });
});

test('@live add to wallet: wrong-chain click switches the wallet back before registering', async ({ page, observed }) => {
  test.skip(!liveReady, reason);
  await openTokenPage(page);
  await expect(page.getByTestId('add-to-wallet')).toBeVisible();
  await connectMockWallet(page);
  // Drag the wallet to another chain after connect; the app must switch it back before watching.
  await page.evaluate(() => (window as unknown as { __mockWallet: { setChain: (id: number) => void } }).__mockWallet.setChain(1));
  await expect(page.locator('button[data-wallet-status="wrong-chain"]:visible').first()).toBeVisible();

  await activate(page, page.getByTestId('add-to-wallet'));
  await expect(page.getByText('Switch requested')).toBeVisible();
  expect(await walletMethodCalls(page, 'wallet_switchEthereumChain')).toHaveLength(1);
  expect(await walletCalls(page)).not.toContain('wallet_watchAsset');
  await expect(page.locator('button[data-wallet-status="connected"]:visible').first()).toBeVisible();

  // Second click, wallet now on Monad Testnet: the registration goes out with the correct payload.
  await activate(page, page.getByTestId('add-to-wallet'));
  await expect(page.getByText('submitted to your wallet')).toBeVisible();
  const requests = await walletMethodCalls<{ params: { options: Record<string, unknown> } }>(page, 'wallet_watchAsset');
  expect(requests).toHaveLength(1);
  expect(requests[0].params.options.decimals).toBe(18);
  expect(String(requests[0].params.options.image)).toBe(CIS_WALLET_ICON);
  expectClean(observed);
});
