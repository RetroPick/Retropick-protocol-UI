// Real public apex validation. GET-only app requests; JSON-RPC calls are reads.
// No hostname routing, fixtures, writes, wallet signatures or WebAuthn enrollment.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const {chromium}=createRequire(new URL('../../../../apps/retro-ui/package.json',import.meta.url))('@playwright/test');
const out=fileURLToPath(new URL('.',import.meta.url));
const apex='https://retropick.xyz', backend='https://api-staging.retropick.xyz', stage='https://retropick-metropolis-retro-ui-stagi.vercel.app';
const sha='caf23208f6831b424b1cc51c0785ecf6bdeae264';
const result={at:new Date().toISOString(),origin:apex,sourceSha:sha,readOnly:true,fixtures:false,requestInterception:false,checks:[]};
async function check(name,fn){try{const detail=await fn();result.checks.push({name,status:'PASS',...detail});}catch(e){result.checks.push({name,status:'FAIL',error:String(e)});}writeFileSync(out+'live-validation.json',JSON.stringify(result,null,2)+'\n');}
await check('real apex, stable backend and retained staging API routes',async()=>{
 const responses=[];
 for(const origin of [apex,backend,stage])for(const path of ['/health','/v1/launches?limit=100','/v1/pairs','/v1/activity?limit=100','/api/referrals/health','/api/media/health','/api/radar/health']){
 const r=await fetch(origin+path,{signal:AbortSignal.timeout(15000)});assert.equal(r.status,200,origin+path);const b=await r.json();
 if(path==='/health'){assert.equal(b.ready,true);assert.equal(b.projection.published,2);assert.equal(b.freshness.chainId,10143);assert.equal(b.freshness.error,null);assert(b.freshness.lagBlocks<=64);assert(Date.now()-Date.parse(b.freshness.indexedAt)<120000);}
 if(path.includes('launches'))assert(b.data.length>0);
 if(path.includes('referrals'))assert.equal(b.syncError,null);
 if(path.includes('radar')){assert.equal(b.configured,true);assert.equal(b.lastError,null);}
 responses.push({origin,path,status:r.status,rows:Array.isArray(b.data)?b.data.length:undefined,freshness:b.freshness});
 }return {responses};
});
await check('exact public release and unauthenticated referral boundary',async()=>{
 const release=await(await fetch(apex+'/release.json')).json();assert.equal(release.sourceSha,sha);assert.equal(release.chainId,10143);
 const r=await fetch(apex+'/api/referrals/summary',{headers:{Origin:apex}});assert.equal(r.status,401);const b=await r.json();assert.equal(b.error,'AUTHENTICATION_REQUIRED');return {release,referralStatus:r.status,error:b.error};
});
await check('existing media byte preservation through apex',async()=>{
 const path='/api/media/43d7651d1dbf950196d5ddff5a1b02ea438d1626f4f6f7131efbd45518eccd3e.webp';
 const r=await fetch(apex+path);assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/webp');const bytes=Buffer.from(await r.arrayBuffer());const hash=createHash('sha256').update(bytes).digest('hex');assert.equal(hash,path.split('/').at(-1).split('.')[0]);return {path,bytes:bytes.length,sha256:hash};
});
const browser=await chromium.launch({headless:true});
try{for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
 await check('real apex browser RPC, market reads, wallet and Mera origin '+viewport.width,async()=>{
 const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[],unexpected502=[],apiRequests=[],mutations=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()===502)unexpected502.push(r.url());});page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/v1/'))apiRequests.push(r.url());if(u.origin===apex&&!['GET','HEAD','OPTIONS'].includes(r.method()))mutations.push({url:r.url(),method:r.method()});});
 try{
 const resp=await page.goto(apex+'/launchpad');await page.locator('a[href^="/launchpad/token/0x"]').first().waitFor({timeout:30000});const headers=resp.headers();assert.equal(headers['x-frame-options'],'DENY');assert.equal(headers['x-content-type-options'],'nosniff');assert(headers['content-security-policy'].includes("frame-ancestors 'none'"));assert(headers['permissions-policy'].includes('publickey-credentials-get=(self)'));
 const rpc=await page.evaluate(async()=>{const results=[];for(const url of ['https://testnet-rpc.monad.xyz','https://rpc.ankr.com/monad_testnet']){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify([{jsonrpc:'2.0',id:1,method:'eth_chainId',params:[]},{jsonrpc:'2.0',id:2,method:'eth_blockNumber',params:[]}])});results.push({url,status:r.status,body:await r.json()});}return results;});
 for(const r of rpc){assert.equal(r.status,200);assert.equal(parseInt(r.body.find(x=>x.id===1).result,16),10143);assert(parseInt(r.body.find(x=>x.id===2).result,16)>0);}
 await page.screenshot({path:out+'launchpad-'+viewport.width+'.png',fullPage:true});
 await page.locator('a[href^="/launchpad/token/0x"]').first().click();await page.getByTestId('token-terminal').waitFor();await page.screenshot({path:out+'terminal-'+viewport.width+'.png',fullPage:true});
 const connect=page.getByRole('button',{name:'Connect wallet',exact:true}).first();await connect.click();await page.getByRole('heading',{name:'Connect a wallet'}).waitFor();assert(await page.getByText(/No wallet found/).isVisible());await page.keyboard.press('Escape');
 await page.goto(apex+'/earn');await page.getByTestId('earn-hub').waitFor();await page.locator('.rp-hub-tab',{hasText:'Vault'}).click();await page.getByTestId('strategy-vault').waitFor();
 const rp=await page.evaluate(()=>({origin:location.origin,rpHostname:location.hostname,secureContext:isSecureContext,webAuthnApiPresent:typeof PublicKeyCredential!=='undefined',credentialsApiPresent:typeof navigator.credentials!=='undefined'}));assert.equal(rp.rpHostname,'retropick.xyz');assert.equal(rp.secureContext,true);assert.equal(rp.webAuthnApiPresent,true);
 await page.screenshot({path:out+'mera-vault-'+viewport.width+'.png',fullPage:true});
 assert(apiRequests.length>0);assert(apiRequests.every(u=>new URL(u).origin===apex));assert.deepEqual(errors,[]);assert.deepEqual(unexpected502,[]);assert.deepEqual(mutations,[]);
 return {headers,rpc,rp,apiRequests,unexpected502,pageAndConsoleErrors:errors,appMutations:mutations,hardwareCeremonyPerformed:false,walletSignatures:false};
 }finally{await context.close();}
 });
}}finally{await browser.close();}
console.log(JSON.stringify({passed:result.checks.filter(x=>x.status==='PASS').length,failed:result.checks.filter(x=>x.status==='FAIL').length}));process.exitCode=result.checks.some(x=>x.status==='FAIL')?1:0;
