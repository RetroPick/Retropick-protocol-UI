import { test, expect } from '@playwright/test';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
const evidence = process.env.E2E_EVIDENCE_DIR ?? '/tmp/retropick-multi-asset-evidence';
async function snap(page: import('@playwright/test').Page, name: string) { mkdirSync(evidence,{recursive:true});await page.screenshot({path:join(evidence,`${test.info().project.name}-${name}.png`),fullPage:true}); }
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{ const calls:string[]=[];(window as any).__quoteSigningCalls=calls;Object.defineProperty(window,'ethereum',{value:{request:async({method}:any)=>{calls.push(method);throw new Error('Read-only quote validation; wallet actions blocked');}},configurable:true}); });
});
test('catalog search, keyboard choice, category counts and unavailable preview persist through review',async({page})=>{
 await page.goto('/launchpad/create');await page.getByPlaceholder('Retro Coin',{exact:true}).fill('Quote Preview');await page.getByPlaceholder('RETRO',{exact:true}).fill('QPRE');await page.getByRole('button',{name:'Continue',exact:true}).click();
 const catalog=page.getByRole('region',{name:'Quote asset catalog'});await expect(catalog).toContainText('83 curated assets');
 await page.getByRole('button',{name:/Stocks & ETFs 24/}).click();await expect(page.getByRole('radio',{name:/NVDAx/})).toBeVisible();
 await page.getByLabel('Search quote assets').fill('NVIDIA');await expect(catalog.getByRole('radio')).toHaveCount(1);await page.getByRole('radio',{name:/NVDAx/}).click();
 await page.getByRole('button',{name:'Review',exact:true}).click();await expect(page.getByTestId('launch-review')).toContainText('NVDAx');await expect(page.getByTestId('launch-review')).toContainText('Reference only');
 await expect(page.getByRole('button',{name:'Connect wallet to launch'})).toHaveCount(0);await expect(page.getByRole('button',{name:'Save local preview'})).toBeVisible();
 await page.getByRole('button',{name:'Back',exact:true}).click();await expect(page.getByLabel('Search quote assets')).toHaveValue('NVIDIA');await expect(page.getByRole('radio',{name:/NVDAx/})).toHaveAttribute('aria-checked','true');
 await page.getByRole('button',{name:'Clear search'}).click();await page.getByRole('radio',{name:/SPYx/}).focus();await page.getByRole('radio',{name:/SPYx/}).press('ArrowRight');await expect(page.getByRole('radio',{name:/NVDAx/})).toHaveAttribute('aria-checked','true');
 await snap(page,'quote-picker');await page.getByRole('button',{name:'Review',exact:true}).click();await snap(page,'quote-review');await page.getByRole('button',{name:'Save local preview'}).click();await expect(page.getByRole('heading',{name:'Your local preview is ready.'})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).__quoteSigningCalls.filter((m:string)=>/send|sign/i.test(m)))).toEqual([]);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('retropick-quote-preview')!))).toMatchObject({provenance:'LOCAL_PREVIEW',assetId:'stocks-nvdax',quoteAddress:null,economics:null});
});
test('live feed has dual logos, real counts, composable URL filters and quote-denominated progress goals',async({page,request})=>{
 const api=await request.get('/v1/launches?limit=100');expect(api.ok()).toBeTruthy();const indexed=await api.json();expect(indexed.freshness.chainId).toBe(10143);
 await page.goto('/launchpad');await expect(page.getByTestId('launch-row').first()).toBeVisible({timeout:45000});await expect(page.locator('[data-logo-kind="quote"]').first()).toBeVisible();await expect(page.locator('[data-logo-kind="base"]').first()).toBeVisible();await expect(page.getByTestId('bonding-progress').first()).toContainText('Graduation goal');
 await expect(page.locator('[data-provenance="demo"]')).toHaveCount(0);await snap(page,'discovery');
 await page.getByRole('button',{name:/Stocks & ETFs 0/}).click();await expect(page).toHaveURL(/category=STOCKS/);await expect(page.getByText('No launches match these filters')).toBeVisible();
 await page.getByRole('button',{name:/All assets/}).click();await page.getByLabel('Pair filter').selectOption('0x0000000000000000000000000000000000000000');await expect(page).toHaveURL(/quote=0x/);await page.getByLabel('Search launch markets').fill('RETRO');await expect(page).toHaveURL(/q=RETRO/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
test('graduated live terminal uses the SDK orderbook and shows completed bonding goal',async({page})=>{
 await page.goto('/launchpad/token/0x43e7e9b1b7d9A143573307b13D14B51580c18f15');await expect(page.getByTestId('token-terminal')).toHaveAttribute('data-lifecycle','GRADUATED',{timeout:45000});
 await expect(page.getByTestId('bonding-progress')).toContainText('100%');await expect(page.getByTestId('bonding-progress')).toContainText('MON');await expect(page.getByTestId('depth-panel')).toBeVisible({timeout:45000});await expect(page.getByRole('tab',{name:'Orders'})).toBeEnabled();
 await expect(page.locator('[data-logo-kind="quote"]').first()).toBeVisible();await snap(page,'graduated-orderbook');
 if(test.info().project.name.includes('mobile')) {await page.getByRole('button',{name:'Trade',exact:true}).click();await expect(page.getByTestId('pair-identity').last()).toBeVisible();await snap(page,'mobile-ticket');}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
