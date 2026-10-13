# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: staging.spec.ts >> live create economics loads admitted quotes and reaches Review without signing
- Location: e2e/staging/staging.spec.ts:104:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByLabel('Paired with', { exact: true })
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByLabel('Paired with', { exact: true })

```

```yaml
- link "Skip to content":
  - /url: "#main"
- link "RetroPick Launchpad home":
  - /url: /launchpad
  - img
- button "Search tokens and markets"
- button "Connect wallet"
- text: LIVE Monad Testnet · chain 10143 · test assets.
- main:
  - heading "Launch a token." [level=1]
  - paragraph: Token, market & economics, then review. The curve opens when your launch transaction confirms.
  - text: LIVE · 10143 Token 2 Market & economics 3 Review
  - heading "2 · Market & economics" [level=2]
  - paragraph: Terms read live from the deployed factory.
  - text: Paired with
  - combobox "Paired with Admitted by the on-chain quote registry. Buyers pay MON on the curve.":
    - option "MON · Native Monad" [selected]
    - option "USDC · 0x534b2f3A21130d7a60830c2Df862319e593943A3"
  - text: Admitted by the on-chain quote registry. Buyers pay MON on the curve. Graduates to
  - combobox "Graduates to Fixed by the venue you choose; both venues are admitted for this pair.":
    - option "Uniswap V4"
    - option "Kuru orderbook" [selected]
  - text: Fixed by the venue you choose; both venues are admitted for this pair. Creator fee wallet
  - textbox "Creator fee wallet Defaults to your wallet. Protected wallets require an explicit choice.":
    - /placeholder: 0x…
  - text: Defaults to your wallet. Protected wallets require an explicit choice. Creator fee
  - 'textbox "Creator fee Up to 10% of each trade, on top of the 1% curve fee. Unit: %."':
    - /placeholder: "0"
    - text: "0"
  - text: "Up to 10% of each trade, on top of the 1% curve fee. Unit: %. Where your creator fees go"
  - radio "Your fee wallet Fees accrue to your fee wallet to claim." [checked]
  - strong: Your fee wallet
  - paragraph: Fees accrue to your fee wallet to claim.
  - radio "Buyback & vest Part of each creator fee buys the token back; bought tokens lock and release to your fee escrow over time, with a protocol share on release."
  - strong: Buyback & vest
  - paragraph: Part of each creator fee buys the token back; bought tokens lock and release to your fee escrow over time, with a protocol share on release.
  - paragraph: Launch fee 0 MON. Graduates at 1 MON. Curve fee 1%.
  - paragraph: Your confirmed launch opens its token page immediately. Buy from the curve with a separate wallet transaction.
  - button "Back"
  - button "Review"
  - complementary:
    - text: ON THE BOARD R
    - heading "Read Only Draft" [level=3]
    - text: CRYPTO
    - paragraph: READ · MON pair
    - term: Supply
    - definition: "1000"
    - term: Graduates at
    - definition: 1 MON
    - term: Creator fee
    - definition: 0%
    - term: Launch fee
    - definition: 0 MON
    - text: "A real launch on Monad Testnet: your wallet signs one factory transaction that deploys the token and its bonding curve."
- contentinfo:
  - text: RetroPick Monad Testnet · live contract data
  - link "Docs":
    - /url: /docs
  - link "GitHub":
    - /url: https://github.com/RetroPick/retropick-protocol
- navigation "Primary navigation":
  - link "Home":
    - /url: /launchpad
  - link "Earn":
    - /url: /earn
  - link "Launch":
    - /url: /launchpad/create
- region "Notifications alt+T"
```

# Test source

```ts
  11  |   const terminal = page.locator('[data-testid="discovery"], main').first();
  12  |   await expect(terminal).toBeVisible();
  13  |   // Live mode must never show the DEMO provenance badge or fixture version.
  14  |   await expect(page.locator('[data-provenance="demo"]')).toHaveCount(0);
  15  |   await expect(page.getByText('LIVE', { exact: true })).toBeVisible();
  16  |   // Real indexed rows eventually render (indexer is live through the tunnel).
  17  |   await expect(page.locator('a[href^="/launchpad/token/0x"]').first()).toBeVisible({ timeout: 30_000 });
  18  | });
  19  |
  20  | test('SPA deep link renders the graduated token terminal with Kuru depth + orders tab', async ({ page }) => {
  21  |   await page.goto(`/launchpad/token/${GRADUATED_TOKEN}`);
  22  |   const term = page.getByTestId('token-terminal');
  23  |   await expect(term).toBeVisible({ timeout: 30_000 });
  24  |   await expect(term).toHaveAttribute('data-lifecycle', 'GRADUATED');
  25  |   // Live provenance — never demo.
  26  |   await expect(term).toHaveAttribute('data-data-mode', 'live');
  27  |   await expect(page.locator('[data-provenance="demo"]')).toHaveCount(0);
  28  |   // Stage-1 depth panel is present for the graduated market (reads the on-chain book).
  29  |   // The live book is honest about its state: a two-sided ladder shows the spread row;
  30  |   // an empty book (resting orders consumed) shows the designed empty state. Both are
  31  |   // correct — what must NEVER happen is fabricated depth.
  32  |   await expect(page.getByTestId('depth-panel')).toBeVisible({ timeout: 30_000 });
  33  |   // Three honest terminal states, all truthful: a two-sided ladder (Spread), an empty
  34  |   // book (No resting orders / No two-sided book), or the unavailable state when the
  35  |   // public RPC rejects the heavy L2 read. Fabricated depth must never appear.
  36  |   await expect(page.getByTestId('depth-panel')).toContainText(/Spread|No two-sided book|No resting orders|depth is unavailable/, { timeout: 30_000 });
  37  |   // Orders tab is enabled after graduation.
  38  |   await expect(page.getByRole('tab', { name: 'Orders' })).toBeEnabled();
  39  | });
  40  |
  41  | test('Earn hub renders with the Mera Vault tab mounted', async ({ page }) => {
  42  |   await page.goto('/earn');
  43  |   const hub = page.getByTestId('earn-hub');
  44  |   await expect(hub).toBeVisible({ timeout: 30_000 });
  45  |   await expect(hub).toHaveAttribute('data-data-mode', 'live');
  46  |   await page.locator('.rp-hub-tab', { hasText: 'Vault' }).click();
  47  |   const vault = page.getByTestId('strategy-vault');
  48  |   await expect(vault).toBeVisible();
  49  |   await expect(vault).toHaveAttribute('data-state', 'none');
  50  |   await expect(page.getByTestId('vault-create')).toBeVisible();
  51  |   await expect(page.getByTestId('vault-disclosure')).toContainText(/never grants spending authority/i);
  52  | });
  53  |
  54  | test('referral rewrite path serves the backend through the same origin', async ({ page, request }) => {
  55  |   const health = await request.get('/api/referrals/health');
  56  |   expect(health.status()).toBe(200);
  57  |   expect(await health.json()).toMatchObject({ chainId: 10143 });
  58  |   const media = await request.get('/api/media/health');
  59  |   expect(media.status()).toBe(200);
  60  |   // The UI panel itself mounts without console errors on this page.
  61  |   const errors: string[] = [];
  62  |   const page2 = await page.context().newPage();
  63  |   page2.on('pageerror', (e) => errors.push(String(e)));
  64  |   await page2.goto('/earn#referrals');
  65  |   await expect(page2.getByTestId('earn-hub')).toBeVisible({ timeout: 30_000 });
  66  |   expect(errors).toEqual([]);
  67  | });
  68  |
  69  | test('staging has no uncaught console errors and no horizontal overflow (both viewports)', async ({ page }) => {
  70  |   const errors: string[] = [];
  71  |   page.on('pageerror', (e) => errors.push(String(e)));
  72  |   await page.goto('/launchpad');
  73  |   await expect(page.locator('a[href^="/launchpad/token/0x"]').first()).toBeVisible({ timeout: 30_000 });
  74  |   await page.goto(`/launchpad/token/${GRADUATED_TOKEN}`);
  75  |   await expect(page.getByTestId('token-terminal')).toBeVisible({ timeout: 30_000 });
  76  |   const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  77  |   expect(overflow, 'no horizontal overflow').toBe(false);
  78  |   expect(errors).toEqual([]);
  79  | });
  80  |
  81  | test('wallet connect prompts the EIP-6963 picker (no implicit connect), read-only', async ({ page }) => {
  82  |   await page.goto(`/launchpad/token/${GRADUATED_TOKEN}`);
  83  |   await expect(page.getByTestId('token-terminal')).toBeVisible({ timeout: 30_000 });
  84  |   // In a clean browser with no injected wallets the ticket shows the connect CTA;
  85  |   // clicking opens the picker (or its empty state) — never signs anything.
  86  |   const connect = page.getByRole('button', { name: 'Connect wallet', exact: true }).first();
  87  |   await connect.click();
  88  |   await expect(page.getByRole('dialog')).toHaveCount(1);
  89  |   await expect(page.getByRole('heading', { name: 'Connect a wallet' })).toBeVisible();
  90  |   await expect(page.getByText(/No wallet found/)).toBeVisible();
  91  | });
  92  |
  93  | test('public release and indexer projection match the reviewed source', async ({ request }) => {
  94  |   const release = await request.get('/release.json'); expect(release.status()).toBe(200);
  95  |   const record = await release.json(); expect(record.chainId).toBe(10143);
  96  |   if (process.env.STAGING_SOURCE_SHA) expect(record.sourceSha).toBe(process.env.STAGING_SOURCE_SHA);
  97  |   const health = await request.get('/health'); expect(health.status()).toBe(200);
  98  |   const value = await health.json(); expect(value.ready).toBe(true);
  99  |   expect(value.projection).toEqual({expected:2,published:2});
  100 |   expect(value.freshness.chainId).toBe(10143); expect(value.freshness.source).toBe('MONAD_EVENT_INDEXER');
  101 |   expect(value.freshness.lagBlocks).toBeLessThanOrEqual(64);
  102 | });
  103 |
  104 | test('live create economics loads admitted quotes and reaches Review without signing', async ({page}) => {
  105 |   await page.goto('/launchpad/create');
  106 |   await page.getByPlaceholder('Retro Coin', {exact:true}).fill('Read Only Draft');
  107 |   await page.getByPlaceholder('RETRO', {exact:true}).fill('READ');
  108 |   await page.getByRole('button', {name:'Continue',exact:true}).click();
  109 |   await expect(page.getByRole('heading', {name:/2 · Market & economics/})).toBeVisible();
  110 |   const pair=page.getByLabel('Paired with', {exact:true});
> 111 |   await expect(pair).toBeVisible({timeout:30000});
      |                      ^ Error: expect(locator).toBeVisible() failed
  112 |   await expect(pair.locator('option').first()).toContainText('MON');
  113 |   await expect(page.getByText('Launch terms unavailable.', {exact:false})).toHaveCount(0);
  114 |   await expect(page.getByText(/Launch fee .* MON\. Graduates at/)).toBeVisible();
  115 |   await page.getByRole('button', {name:'Review',exact:true}).click();
  116 |   await expect(page.getByTestId('launch-review')).toContainText('Read Only Draft · READ');
  117 |   await expect(page.getByTestId('launch-review')).not.toContainText('DEMO');
  118 |   await expect(page.getByRole('button', {name:'Connect wallet to launch',exact:true})).toBeVisible();
  119 |   await page.getByRole('button', {name:'Back',exact:true}).click();
  120 |   await page.getByRole('button', {name:'Back',exact:true}).click();
  121 |   await expect(page.getByPlaceholder('Retro Coin', {exact:true})).toHaveValue('Read Only Draft');
  122 |   await expect(page.getByPlaceholder('RETRO', {exact:true})).toHaveValue('READ');
  123 | });
  124 |
```
