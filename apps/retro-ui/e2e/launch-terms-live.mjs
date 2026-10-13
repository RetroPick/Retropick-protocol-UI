// Live browser reproduction/verification; local draft only, no signing or launch.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const origin=process.env.LAUNCH_TERMS_ORIGIN??'https://retropick.xyz';
const unavailable=process.env.EXPECT_TERMS==='unavailable',out=process.env.LAUNCH_TERMS_EVIDENCE;
assert(out);const browser=await chromium.launch({headless:true}),checks=[];
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:width===390?844:900}}),page=await context.newPage();const failures=[];
 page.on('response',async r=>{if(/monad\.xyz|ankr\.com/.test(r.url())){try{const b=await r.json();for(const v of Array.isArray(b)?b:[b])if(v.error)failures.push({provider:new URL(r.url()).host,error:v.error,request:r.request().postDataJSON()});}catch{}}});
 await page.goto(origin+'/launchpad/create');await page.getByPlaceholder('Retro Coin',{exact:true}).fill('Read Only Draft');await page.getByPlaceholder('RETRO',{exact:true}).fill('READ');await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('heading',{name:/2 · Market & economics/}).waitFor();
 if(unavailable){await page.getByText('Launch terms unavailable. Retry without losing your draft.',{exact:false}).waitFor({timeout:45000});await page.getByRole('button',{name:'Retry launch terms'}).click();await page.getByText('Launch terms unavailable. Retry without losing your draft.',{exact:false}).waitFor();}
 else{await page.getByRole('combobox',{name:/^Paired with/}).waitFor({timeout:30000});assert(await page.getByRole('combobox',{name:/^Paired with/}).locator('option').count()>0);await page.getByRole('button',{name:'Review',exact:true}).click();await page.getByTestId('launch-review').waitFor();assert((await page.getByTestId('launch-review').innerText()).includes('Read Only Draft'));}
 await page.screenshot({path:out+'/'+(unavailable?'before':'after')+'-'+width+'.png',fullPage:true});const text=await page.locator('main').innerText();await page.getByRole('button',{name:'Back',exact:true}).click();if(!unavailable)await page.getByRole('button',{name:'Back',exact:true}).click();assert.equal(await page.getByPlaceholder('Retro Coin',{exact:true}).inputValue(),'Read Only Draft');assert.equal(await page.getByPlaceholder('RETRO',{exact:true}).inputValue(),'READ');
 checks.push({width,origin,expectedState:unavailable?'terms unavailable':'live terms and Review',draftPreserved:true,text,rpcFailures:failures,financialWrites:false});await context.close();
}}finally{await browser.close();}
writeFileSync(out+'/'+(unavailable?'browser-before':'browser-after')+'.json',JSON.stringify({at:new Date().toISOString(),checks},null,2)+'\n');console.log('2/2 verified');
