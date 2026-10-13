// Supplemental live checks and an explicitly controlled host rehearsal.
// No fixture data, financial writes, wallet signatures or custom-domain changes.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const stage = 'https://retropick-metropolis-retro-ui-stagi.vercel.app';
const backend = 'https://api-staging.retropick.xyz';
const primary = 'https://retropick.xyz';
const sha = 'caf23208f6831b424b1cc51c0785ecf6bdeae264';
const out = process.env.CUTOVER_EVIDENCE;
assert(out, 'CUTOVER_EVIDENCE is required'); mkdirSync(out, {recursive:true});
const results = {at:new Date().toISOString(),sourceSha:sha,checks:[],rehearsal:'Controlled browser routing; apex is NOT reassigned', financialWrites:false};
async function check(name, fn) { const detail = await fn(); results.checks.push({name,status:'PASS',...detail}); writeFileSync(out+'/supplemental.json',JSON.stringify(results,null,2)+'\n'); }
const browser = await chromium.launch({headless:true});
try {
await check('live backend and same-origin routes', async () => {
 const statuses=[];
 for(const origin of [backend,stage]) for(const path of ['/health','/v1/launches?limit=100','/v1/pairs','/v1/activity?limit=100','/api/referrals/health','/api/media/health','/api/radar/health']) {
 const r=await fetch(origin+path); assert.equal(r.status,200);const b=await r.json();
 if(path==='/health') {assert.equal(b.ready,true);assert.equal(b.freshness.chainId,10143);assert(b.freshness.lagBlocks<=64);assert(Date.now()-Date.parse(b.freshness.indexedAt)<120000);}
 if(path.includes('launches')) assert(b.data.length>0);
 if(path.includes('referrals')) assert.equal(b.syncError,null);
 statuses.push({origin,path,status:r.status,rows:Array.isArray(b.data)?b.data.length:undefined,freshness:b.freshness});
 } return {statuses};
});
await check('live referral and media origin enforcement', async () => {
 const checks=[];
 for(const origin of [stage,primary,'https://untrusted.example']) {
 const r=await fetch(backend+'/api/referrals/challenge',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({wallet:'0x0000000000000000000000000000000000000001'})});
 const b=await r.json();assert.equal(r.status,origin.includes('untrusted')?403:200);
 if(r.status===200) {
 assert(b.message.startsWith(new URL(origin).host+' requests'));assert(b.message.includes('\nURI: '+origin+'\n'));
 const other=origin===stage?primary:stage;
 const wrong=await fetch(backend+'/api/referrals/verify',{method:'POST',headers:{Origin:other,'Content-Type':'application/json'},body:JSON.stringify({challengeId:b.challengeId,signature:'0x'+'00'.repeat(65)})});
 assert.equal(wrong.status,403);assert.equal((await wrong.json()).error,'CHALLENGE_ORIGIN_MISMATCH');
 }
 const media=await fetch(backend+'/api/media/upload',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'});assert.equal(media.status,origin.includes('untrusted')?403:415);
 checks.push({origin,challengeStatus:r.status,crossOriginReplay:r.status===200?'403 CHALLENGE_ORIGIN_MISMATCH':'not applicable',mediaStatus:media.status});
 } return {checks,uploads:false,associationsCreated:false};
});
await check('preserved live media bytes',async()=>{
 const path='/api/media/43d7651d1dbf950196d5ddff5a1b02ea438d1626f4f6f7131efbd45518eccd3e.webp';
 for(const origin of [backend,stage]) {const r=await fetch(origin+path);assert.equal(r.status,200);const hash=createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex');assert.equal(hash,path.split('/').at(-1).split('.')[0]);}
 return {path,identical:true};
});
for(const viewport of [{width:1440,height:900},{width:390,height:844}]) {
 const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[],bad=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()===502)bad.push(r.url());});
 await check('live browser RPC and security headers '+viewport.width,async()=>{
 const r=await page.goto(stage+'/launchpad');await page.locator('a[href^="/launchpad/token/0x"]').first().waitFor();
 const h=r.headers();assert.equal(h['x-frame-options'],'DENY');assert.equal(h['x-content-type-options'],'nosniff');assert(h['permissions-policy'].includes('publickey-credentials-get=(self)'));assert(h['content-security-policy'].includes("frame-ancestors 'none'"));
 const rpc=await page.evaluate(async()=>{const r=await fetch('https://testnet-rpc.monad.xyz',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify([{jsonrpc:'2.0',id:1,method:'eth_chainId',params:[]},{jsonrpc:'2.0',id:2,method:'eth_blockNumber',params:[]}])});return {status:r.status,body:await r.json()};});
 assert.equal(rpc.status,200);assert.equal(parseInt(rpc.body.find(x=>x.id===1).result,16),10143);assert(parseInt(rpc.body.find(x=>x.id===2).result,16)>0);
 await page.screenshot({path:out+'/staging-'+viewport.width+'.png',fullPage:true});assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 return {headers:h,rpc};
 });
 await check('controlled 502 and real backend retry recovery '+viewport.width,async()=>{
 let fail=true;await page.route('**/v1/**',route=>fail?route.fulfill({status:502,contentType:'application/json',body:'{"error":"controlled outage"}'}):route.continue());
 await page.reload();await page.getByText('Indexer unavailable',{exact:true}).waitFor();fail=false;await page.getByRole('button',{name:'Retry',exact:true}).click();await page.locator('a[href^="/launchpad/token/0x"]').first().waitFor({timeout:30000});await page.unroute('**/v1/**');return {injectedFailure:true,recoveredUsingLiveData:true};
 });
 await context.close();
 const rehearsal=await browser.newContext({viewport});const rp=await rehearsal.newPage();const reqs=[],rpErrors=[];
 rp.on('pageerror',e=>rpErrors.push(String(e)));rp.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/v1/'))reqs.push(r.url());});
 await rehearsal.route(primary+'/**',async route=>{const original=new URL(route.request().url());const response=await route.fetch({url:stage+original.pathname+original.search});await route.fulfill({response});});
 await check('controlled primary-origin rehearsal '+viewport.width,async()=>{
 await rp.goto(primary+'/launchpad');await rp.locator('a[href^="/launchpad/token/0x"]').first().waitFor({timeout:30000});
 assert(reqs.length>0);assert(reqs.every(u=>new URL(u).origin===primary));assert.equal(await rp.evaluate(()=>location.hostname),'retropick.xyz');
 const release=await rp.evaluate(async()=>await(await fetch('/release.json')).json());assert.equal(release.sourceSha,sha);
 await rp.goto(primary+'/earn');await rp.getByTestId('earn-hub').waitFor();await rp.locator('.rp-hub-tab',{hasText:'Vault'}).click();await rp.getByTestId('strategy-vault').waitFor();
 assert.deepEqual(rpErrors,[]);await rp.screenshot({path:out+'/primary-rehearsal-'+viewport.width+'.png',fullPage:true});return {sameOriginRequests:reqs,secureContext:await rp.evaluate(()=>isSecureContext),rpHostname:'retropick.xyz',realPublicDomainTest:false,hardwareWebAuthnTest:false};
 });await rehearsal.close();
}
await check('apex waitlist remains unchanged',async()=>{const r=await fetch(primary);assert.equal(r.status,200);const html=await r.text();assert(html.includes('RetroPick Waitlist'));return {title:html.match(/<title>(.*?)<\/title>/)?.[1],domainChanged:false};});
} catch(error) {results.failure=String(error);writeFileSync(out+'/supplemental.json',JSON.stringify(results,null,2)+'\n');throw error;} finally {await browser.close();}
console.log(JSON.stringify({passed:results.checks.length,out}));
