import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { quoteAssets, quoteCatalogSchema, quoteAssetSchema, quoteAssetByAddress, quoteAssetById, categoryCounts, matchesQuoteSearch, customQuote } from '../src/quote-assets.ts';
test('catalog has distinct identities, artwork provenance and honest reference semantics', () => {
 assert(quoteAssets.length >= 60 && quoteAssets.length <= 100);
 assert.equal(Object.values(categoryCounts()).reduce((a,b)=>a+b,0),quoteAssets.length);
 for(const a of quoteAssets) {
  if(a.logo.src) assert(existsSync(new URL('../../../apps/retro-ui/public'+a.logo.src,import.meta.url)));
  if(a.status==='REFERENCE_ONLY') { assert.equal(a.monadTestnetAddress,null);assert.deepEqual(a.venues,[]);assert.equal(a.decimals,null); }
  assert.equal(a.oracle,null);
 }
 assert.equal(quoteAssets.filter(a=>a.status==='LIVE_TESTNET').length,2);
 assert(quoteAssets.filter(a=>a.category==='PRIVATE').every(a=>a.unavailableReason.includes('No equity')));
});
test('chain/address identity prevents reference substitution and rejects malformed catalog entries',()=>{
 const mon=quoteAssetById('crypto-mon')!;
 assert.equal(quoteAssetByAddress(10143,mon.monadTestnetAddress)?.id,mon.id);
 assert.equal(quoteAssetByAddress(1,mon.monadTestnetAddress),undefined);
 assert(matchesQuoteSearch(quoteAssetById('currencies-usdc')!,'534b2f3'));
 assert.equal(quoteCatalogSchema.safeParse([mon,mon]).success,false);
 assert.equal(quoteAssetSchema.safeParse({...mon,status:'REFERENCE_ONLY'}).success,false);
 assert.equal(customQuote().monadTestnetAddress,null); assert.throws(()=>customQuote('fake'));
});
