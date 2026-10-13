import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(new URL('../../../../apps/retro-ui/package.json',import.meta.url))('@playwright/test');
const out=fileURLToPath(new URL('.',import.meta.url)),rows=[];
const browser=await chromium.launch({headless:true});
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:width===390?844:900}}),page=await context.newPage(),errors=[],bad=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()===502)bad.push(r.url());});
 const response=await page.goto('https://retropick.xyz/');assert.equal(response.status(),200);await page.locator('a[href^="/launchpad/token/0x"]').first().waitFor({timeout:30000});assert(!await page.getByText('RetroPick Waitlist',{exact:true}).count());
 const rootUrl=page.url();await page.goto('https://retropick.xyz/earn');await page.getByTestId('earn-hub').waitFor();await page.locator('.rp-hub-tab',{hasText:'Referrals'}).click();await page.getByText('Connect your wallet to get your referral link',{exact:true}).waitFor();await page.screenshot({path:out+'referrals-'+width+'.png',fullPage:true});assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);rows.push({width,status:'PASS',rootUrl,referralPanel:'wallet connect required',pageErrors:errors,unexpected502:bad});await context.close();
}}finally{await browser.close();}
writeFileSync(out+'root-referrals.json',JSON.stringify({at:new Date().toISOString(),readOnly:true,fixtures:false,checks:rows},null,2)+'\n');console.log('2/2 PASS');
