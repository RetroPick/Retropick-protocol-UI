import { test, expect, TOKEN, ALICE } from './fixtures';
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
async function openTicket(page: import('@playwright/test').Page) {
  const bar=page.getByTestId('mobile-trade-bar');
  if((page.viewportSize()?.width ?? 1440)<768) { await expect(bar).toBeVisible(); await bar.getByRole('button',{name:'Trade',exact:true}).click(); }
}
async function connect(page: import('@playwright/test').Page) {
  await page.getByRole('button',{name:'Connect wallet',exact:true}).first().click();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.getByRole('button',{name:/E2E Mock Wallet/}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
test('live ticket connect uses the shared picker and the actual injected wallet',async({page,faults})=>{
  await page.goto(`/launchpad/token/${TOKEN}`);
  await connect(page); await openTicket(page);
  await expect(page.getByTestId('ticket-amount')).toBeVisible();
  await page.getByTestId('ticket-amount').fill('0.001');
  await expect(page.getByTestId('ticket-receive')).not.toHaveText('—');
});
test('economic provider failure ends loading and exposes Retry',async({page,faults})=>{
  faults.economic=true;
  await page.goto(`/launchpad/token/${TOKEN}`); await openTicket(page);
  await expect(page.getByRole('button',{name:'Retry on-chain reads'})).toBeVisible({timeout:30000});
  await expect(page.locator('.rp-ticket:visible')).toContainText(/unavailable/);
  await expect(page.locator('.rp-ticket:visible')).not.toContainText('Syncing on-chain state');
});
test('Kuru empty book and zero executable quote do not enable a market order',async({page,faults})=>{
  faults.phase=2;faults.quote=0n;
  await page.goto(`/launchpad/token/${TOKEN}`);
  await expect(page.getByTestId('depth-panel')).toContainText(/No resting orders|No two-sided book/,{timeout:30000});
  await connect(page); await openTicket(page);
  await page.getByTestId('ticket-amount').fill('0.1');
  await expect(page.getByRole('button',{name:/Deposit & place order|Buy RCVR/})).toBeDisabled();
  await page.getByText('Advanced · Kuru margin', { exact:true }).click();
  await expect(page.getByText('Free margin · separate from wallet balances')).toBeVisible();
});
test('in-progress graduation exposes a completion retry',async({page,faults})=>{
  faults.phase=1;await page.goto(`/launchpad/token/${TOKEN}`);
  await connect(page); await openTicket(page);
  await expect(page.getByRole('button',{name:'Complete graduation (retry)'})).toBeVisible();
});
test('indexer 502 is shown as unavailable instead of an empty launch list',async({page,faults})=>{
  faults.indexer=true;await page.goto('/launchpad');
  await expect(page.getByRole('button',{name:/retry/i}).first()).toBeVisible();
  await expect(page.locator('main')).toContainText(/unavailable|HTTP 502/i);
});
test('selected image retains a local preview on upload failure and retry',async({page,faults})=>{
  await page.route('**/api/media/upload',route=>route.fulfill({status:503,body:'fixture failure'}));
  await page.goto('/launchpad/create');
  await page.getByLabel('Choose token image').setInputFiles({name:'selected.png',mimeType:'image/png',buffer:PNG});
  const preview=page.locator('img.image-preview').first();
  await expect(preview).toHaveAttribute('src',/^blob:/);
  await expect(page.getByRole('button',{name:'Retry upload'})).toBeVisible();
  await page.getByPlaceholder('Retro Coin',{exact:true}).fill('Recovery');
  await page.getByPlaceholder('RETRO',{exact:true}).fill('RCVR');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.locator('.form-error')).toContainText(/Retry the selected image/);
});
test('Mera enrollment, reload and address recovery exercise the live panel with fixture WebAuthn',async({page,faults})=>{
  await page.addInitScript(()=>{
    const credential=()=>({type:'public-key',rawId:new Uint8Array([1,2,3]).buffer,response:{getTransports:()=>['internal']},getClientExtensionResults:()=>({prf:{enabled:true,results:{first:new Uint8Array(32).fill(7).buffer}}})});
    Object.defineProperty(navigator,'credentials',{value:{create:async()=>credential(),get:async()=>credential()},configurable:true});
  });
  await page.goto('/earn#protection');await connect(page);
  await page.getByRole('tab',{name:'Protection'}).click();
  await page.getByRole('checkbox',{name:/Store public credential/}).check();
  await page.getByRole('button',{name:'Create a passkey',exact:true}).click();
  await expect(page.getByTestId('protected-wallet')).toBeVisible();
  const address=await page.getByLabel('Registered passkey').inputValue();
  expect(address).toBe('AQID');
  await page.getByRole('radio',{name:'App-level passkey confirmation',exact:true}).check();
  await expect(page.getByRole('radio',{name:'App-level passkey confirmation',exact:true})).toBeChecked();
  await page.reload();await connect(page);await page.getByRole('tab',{name:'Protection'}).click();
  await page.getByLabel('Registered passkey').selectOption('AQID');
  await page.getByRole('button',{name:'Recover and verify address'}).click();
  await page.getByLabel('Launch to protect').selectOption(TOKEN);
  await expect(page.locator('.rp-protect-handoff')).toContainText(ALICE);
  await expect(page.getByRole('button',{name:'Review handoff'})).toBeEnabled();
  await page.getByRole('button',{name:'Review handoff'}).click();
  await expect(page.getByTestId('prepared-handoff')).toContainText('Future fees only');
  await page.screenshot({path:`/tmp/retro-p0-protection-${test.info().project.name}.png`,fullPage:true});
  await expect(page.getByRole('radio',{name:'Onchain policy module',exact:true})).toBeDisabled();
  expect(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('retropick:mera-enrollments:v1')!)[0]).sort())).toEqual(['address','associatedCreatorWallet','chainId','credentialId','derivationVersion','enrolledAt','rpId','saltVersion'].sort());
});

test('a completed older upload cannot replace the most recently selected image',async({page,faults})=>{
  let first: import('@playwright/test').Route | undefined;let count=0;
  const result=(suffix:string)=>({uri:`ipfs://Qm${suffix.repeat(44)}`,https:null,hash:suffix.repeat(64),bytes:4,mime:'image/png',mode:'pinata'});
  await page.route('**/api/media/upload',async route=>{count++;if(count===1){first=route;return;}await route.fulfill({json:result('b')});});
  await page.goto('/launchpad/create');
  await page.getByLabel('Choose token image').setInputFiles({name:'first.png',mimeType:'image/png',buffer:PNG});
  await expect.poll(()=>count).toBe(1);
  const oldSource=await page.locator('img.image-preview').first().getAttribute('src');
  await page.getByLabel('Choose token image').setInputFiles({name:'second.png',mimeType:'image/png',buffer:PNG});
  await expect(page.getByText('Stored at')).toContainText(`ipfs://Qm${'b'.repeat(44)}`);
  await first!.fulfill({json:result('a')});
  await expect(page.getByText('Stored at')).toContainText(`ipfs://Qm${'b'.repeat(44)}`);
  expect(await page.locator('img.image-preview').first().getAttribute('src')).not.toBe(oldSource);
});

test('multiple announced wallets keep the injected fallback explicit and usable',async({page,faults})=>{
  await page.addInitScript(()=>{
    const base=(window as any).__mockWallet.provider;
    const fallback={...base,request:async({method}:{method:string})=>{(window as any).__fallbackUsed=true;if(method==='eth_requestAccounts')return ['0x5555555555555555555555555555555555555555'];if(method==='eth_chainId')return '0x279f';return base.request({method});}};
    const second={...base};
    const announce=()=>window.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:{provider:second,info:{uuid:'second',rdns:'example.second',name:'Second Wallet',icon:'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E'}}}));
    window.addEventListener('eip6963:requestProvider',announce);(window as any).ethereum=fallback;
  });
  await page.goto('/launchpad/create');
  await page.getByRole('button',{name:'Connect wallet',exact:true}).first().click();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(page.getByRole('button',{name:/Second Wallet/})).toBeVisible();
  await page.getByRole('button',{name:/Browser wallet/}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).__fallbackUsed)).toBe(true);
});

test('protected claim uses its own account and fails closed without gas before broadcast',async({page,faults})=>{
  faults.protectedGas=false;
  await page.addInitScript(()=>{
    const credential=()=>({type:'public-key',rawId:new Uint8Array([1,2,3]).buffer,response:{getTransports:()=>['internal']},getClientExtensionResults:()=>({prf:{enabled:true,results:{first:new Uint8Array(32).fill(7).buffer}}})});
    Object.defineProperty(navigator,'credentials',{value:{create:async()=>credential(),get:async()=>credential()},configurable:true});
  });
  await page.goto('/earn#protection');await connect(page);await page.getByRole('tab',{name:'Protection'}).click();
  await page.getByRole('checkbox',{name:/Store public credential/}).check();await page.getByRole('button',{name:'Create a passkey',exact:true}).click();
  await expect(page.getByTestId('protected-wallet')).toBeVisible();
  await page.getByRole('button',{name:'Review fee claim'}).click();
  const review=page.getByTestId('prepared-handoff');await expect(review).toBeVisible();
  await expect(review).not.toContainText(`Signing account: ${ALICE}`);
  await page.getByRole('button',{name:'Confirm and sign protected action'}).click();
  await expect(page.getByTestId('protected-earn')).toContainText(/needs MON for network gas|Insufficient.*gas/);
  expect(faults.writes).toEqual([]);
});
