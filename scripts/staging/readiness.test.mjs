import test from 'node:test';
import assert from 'node:assert/strict';
import { stagingReady, reconciliationDelay } from './readiness.mjs';
import { deploymentUrl, backendOrigin } from './deploy-vercel.mjs';
const healthy = { ready:true, freshness:{chainId:10143,indexedBlock:92,headBlock:100,indexedAt:new Date().toISOString(),lagBlocks:8,error:null,syncing:false,source:'MONAD_EVENT_INDEXER'},projection:{expected:2,published:2} };
const probe = (health=healthy, list={data:[],freshness:healthy.freshness}, status=200) => stagingReady('https://example.test',async url=>new Response(JSON.stringify(url.endsWith('/health')?health:list),{status}));
test('readiness rejects stale, wrong-chain, wrong-projection, non-list and HTTP failure',async()=>{
 assert.equal(await probe(),true);
 assert.equal(await probe({...healthy,freshness:{...healthy.freshness,syncing:true}}),true,'normal syncing retains a valid published snapshot');
 for(const bad of [{...healthy,ready:false},{...healthy,freshness:{...healthy.freshness,chainId:1}},{...healthy,freshness:{...healthy.freshness,lagBlocks:65}},{...healthy,freshness:{...healthy.freshness,error:'behind'}},{...healthy,projection:{expected:2,published:1}}])assert.equal(await probe(bad),false);
 assert.equal(await probe(healthy,{data:null}),false);assert.equal(await probe(healthy,{data:[]},502),false);
 assert.equal(await probe({...healthy,freshness:{...healthy.freshness,headBlock:0,lagBlocks:0}}),false,'restart with old snapshot and unknown head is not fresh');
 assert.equal(await probe({...healthy,freshness:{...healthy.freshness,indexedAt:'2020-01-01T00:00:00Z'}}),false,'a stopped chain/head poll cannot retain readiness forever');
 assert.equal(await probe(healthy,{data:[],freshness:{...healthy.freshness,lagBlocks:100}}),false,'list freshness must also be current');
});
test('rotation retry is bounded and authorization failures back off visibly',()=>{
 assert.equal(reconciliationDelay(0),3000);assert.equal(reconciliationDelay(10),60000);assert.equal(reconciliationDelay(1,true),300000);
});
test('deploy URL supports both CLI formats and rejects a JSON success without URL',()=>{
 const url='https://retropick-example.vercel.app';assert.equal(deploymentUrl(url),url);assert.equal(deploymentUrl(JSON.stringify({deployment:{url}})),url);assert.throws(()=>deploymentUrl('{"status":"ok"}'));
});
test('stable backend overrides workstation tunnel and rejects credential-bearing targets',()=>{
 const quick='https://rotating.trycloudflare.com';
 assert.equal(backendOrigin(null,'https://backend.example.test',quick),'https://backend.example.test');
 assert.equal(backendOrigin('https://new.example.test/', 'https://old.example.test',quick),'https://new.example.test');
 assert.equal(backendOrigin(null,null,quick),quick);
 for(const invalid of ['http://backend.test','https://user:secret@backend.test','https://backend.test/path','https://backend.test?token=x',''])assert.throws(()=>backendOrigin(invalid,null,quick));
});
