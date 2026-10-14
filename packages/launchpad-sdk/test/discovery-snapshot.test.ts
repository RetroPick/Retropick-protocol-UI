import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDiscoverySnapshot, filterIndexedLaunches } from '../src/discovery-snapshot.ts';
import { bondingProgressBps, readGraduationGoal } from '../src/graduation.ts';
import type { IndexEnvelope, IndexedLaunch, IndexFreshness } from '../src/read-model.ts';
import type { ChainClient } from '../src/chain.ts';
const freshness={chainId:10143,indexedBlock:10,indexedBlockHash:'a',source:'MONAD_EVENT_INDEXER',projectionVersion:2,reorgRevision:0} as IndexFreshness;
const launch=(token:string,quoteAsset='0x0000000000000000000000000000000000000000',marketCapRaw='1')=>({token,quoteAsset,marketCapRaw,name:'Retro',symbol:'RETRO',creator:'creator',quoteSymbol:'MON',createdBlock:1,phase:'ACTIVE',bondingProgressBps:9000}) as IndexedLaunch;
const page=(data:IndexedLaunch[],nextCursor:string|null=null):IndexEnvelope<IndexedLaunch[]>=>({data,freshness,nextCursor});
test('complete snapshots include all pages; expired cursors restart without partial counts',async()=>{
 let calls=0;const result=await readDiscoverySnapshot(async cursor=>{calls++;return cursor?page([launch('b')]):page([launch('a')],'next');});assert.equal(result.data.length,2);assert.equal(calls,2);
 calls=0;const restarted=await readDiscoverySnapshot(async cursor=>{calls++;if(cursor&&calls===2)throw Object.assign(Error('expired'),{status:409});return cursor?page([launch('b')]):page([launch('a')],'next');});assert.equal(restarted.data.length,2);assert.equal(calls,4);
});
test('mismatched freshness, duplicate pages, truncation and network failures reject partial data',async()=>{
 for(const fetcher of [async(cursor?:string)=>cursor?{...page([launch('b')]),freshness:{...freshness,indexedBlock:11}}:page([launch('a')],'next'),async()=>page([launch('a')],'next'),async(cursor?:string)=>{if(cursor)throw Error('offline');return page([launch('a')],'next');}])await assert.rejects(readDiscoverySnapshot(fetcher,2));
});
test('filters compose by quote identity and rankings compare exact values within denomination',()=>{
 const usdc='0x534b2f3a21130d7a60830c2df862319e593943a3'; const rows=[launch('a',usdc,'9007199254740992'),launch('b',usdc,'9007199254740993'),launch('c')];
 assert.deepEqual(filterIndexedLaunches(rows,{category:'CURRENCIES',q:'retro',filter:'active'}).map(l=>l.token),['b','a']);
 assert.equal(filterIndexedLaunches(rows,{category:'STOCKS'}).length,0);assert.equal(filterIndexedLaunches(rows,{category:'CRYPTO',quote:usdc}).length,0);
 assert.deepEqual(filterIndexedLaunches(rows,{}).map(l=>l.token),['c','b','a']);
});
test('integer quote-goal progress and launch-packet identity fail closed',async()=>{
 assert.equal(bondingProgressBps(1n,3n),3333);assert.equal(bondingProgressBps(10n,3n),10000);assert.throws(()=>bondingProgressBps(1n,0n));
 const token='0x1111111111111111111111111111111111111111',quote='0x2222222222222222222222222222222222222222';
 const chain={readContract:async()=>({token,quoteAsset:quote,graduationThreshold:3n})} as unknown as ChainClient;
 assert.equal(await readGraduationGoal(chain,token,quote),3n);await assert.rejects(readGraduationGoal(chain,token,token),/mismatch/);
});
