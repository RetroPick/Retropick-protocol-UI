import test from 'node:test';import assert from 'node:assert/strict';
import {findIndexedRecord} from '../src/lib/live/indexed-record.ts';
const token='0x'+'a'.repeat(40),hash='0x'+'b'.repeat(64),owner='0x'+'c'.repeat(40);
const freshness={chainId:10143,source:'MONAD_EVENT_INDEXER',error:null,indexedBlock:100,indexedBlockHash:'0x'+'d'.repeat(64),projectionVersion:2,reorgRevision:0};
const row={token,transactionHash:hash,actor:owner};const page=(data,nextCursor=null,f=freshness)=>({data,nextCursor,freshness:f});const want={kind:'trade',token,hash};
test('finds exact transaction past100rows when legacy server ignores scope',async()=>{let calls=0;const result=await findIndexedRecord(want,async cursor=>{calls++;return cursor?page([row]):page(Array.from({length:100},()=>({...row,transactionHash:'0x'+'e'.repeat(64)})),'next');});assert.equal(result.matched,true);assert.equal(calls,2);});
test('order owner and token must both match',async()=>{assert.equal((await findIndexedRecord({...want,kind:'order',owner},async()=>page([{...row,owner:'0x'+'f'.repeat(40)}]))).matched,false);assert.equal((await findIndexedRecord(want,async()=>page([{...row,token:owner}]))).matched,false);});
test('reorg or changed snapshot across pages leaves pending',async()=>{assert.equal((await findIndexedRecord(want,async c=>c?page([row],null,{...freshness,reorgRevision:1}):page([],'next'))).matched,false);});
test('bounded pagination and repeated cursor never report false absence as success',async()=>{let calls=0;const result=await findIndexedRecord(want,async()=>page([],'p'+ ++calls));assert.equal(calls,5);assert.equal(result.matched,false);assert.equal(result.bounded,true);});
test('stale failure envelope and cancelled reads cannot confirm',async()=>{assert.equal((await findIndexedRecord(want,async()=>page([row],null,{...freshness,error:'STALE'}))).matched,false);const c=new AbortController();c.abort();await assert.rejects(findIndexedRecord(want,async()=>page([row]),c.signal),{name:'AbortError'});});

test('trade actor must match requested wallet even within same transaction',async()=>{assert.equal((await findIndexedRecord({...want,owner},async()=>page([{...row,actor:'0x'+'f'.repeat(40)}]))).matched,false);assert.equal((await findIndexedRecord({...want,owner},async()=>page([row]))).matched,true);});
