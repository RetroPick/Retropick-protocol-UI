// Disposable offchain ownership proof only. No transaction signing/broadcast or persisted signatures.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(new URL('../../apps/referral-service/package.json',import.meta.url));
const {generatePrivateKey,privateKeyToAccount}=require('viem/accounts');
const account=privateKeyToAccount(generatePrivateKey());const referrer=privateKeyToAccount(generatePrivateKey());
const base='http://127.0.0.1:8788/api/referrals';const origin='http://127.0.0.1:3000';
const records=[];
async function call(path,input,cookie,requestOrigin=origin){const response=await fetch(base+path,{method:input?'POST':'GET',headers:{...(input?{'content-type':'application/json',origin:requestOrigin}:{}),...(cookie?{cookie}:{})},...(input?{body:JSON.stringify(input)}:{})});const data=await response.json();return{status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0]};}
function gate(name,actual,expected){records.push({name,status:actual,expected,pass:actual===expected});}
const health=await call('/health');gate('health',health.status,200);
const forbidden=await call('/challenge',{wallet:account.address},undefined,'https://invalid.example');gate('origin rejected',forbidden.status,403);
const self=await call('/challenge',{wallet:account.address,referrer:account.address});gate('self-referral rejected',self.status,400);
const challenge=await call('/challenge',{wallet:account.address,referrer:referrer.address,firstSeenAt:Date.now()});gate('challenge',challenge.status,200);
if(challenge.status!==200)throw Error('Referral challenge gate failed');
const signature=await account.signMessage({message:challenge.data.message});
const payload={challengeId:challenge.data.challengeId,signature};
const verified=await call('/verify',payload);gate('ownership verification',verified.status,200);
const replay=await call('/verify',payload);gate('nonce replay rejected',replay.status,401);
const summary=await call('/summary',undefined,verified.cookie);gate('authenticated summary',summary.status,200);
const immutable=await call('/challenge',{wallet:account.address,referrer:privateKeyToAccount(generatePrivateKey()).address});gate('immutable association',immutable.status,409);
const logout=await call('/logout',{},verified.cookie);gate('logout',logout.status,200);
const expired=await call('/summary',undefined,verified.cookie);gate('session revoked',expired.status,401);
const proxy=await fetch(`${origin}/api/referrals/health`);gate('same-origin dev proxy',proxy.status,200);
const output={measuredAt:new Date().toISOString(),chainId:10143,method:'Disposable generated in-memory EOA; offchain referral message only; no financial wallet methods or transactions',records,earningsEnabled:verified.data.earningsEnabled,health:health.data,summaryFields:Object.keys(summary.data),signaturesPersisted:false,productionProxyQualified:false};
await mkdir('evidence/launchpad/productization/resume/referrals',{recursive:true});await writeFile('evidence/launchpad/productization/resume/referrals/runtime.json',JSON.stringify(output,null,2));
console.log(JSON.stringify({pass:records.filter(r=>r.pass).length,fail:records.filter(r=>!r.pass).length,earningsEnabled:output.earningsEnabled}));
if(records.some(r=>!r.pass)||output.earningsEnabled!==false)process.exitCode=1;
