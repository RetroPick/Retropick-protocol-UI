import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { verifyMessage, type Address } from 'viem';
import { ReferralAuth } from '../src/auth.ts';
import { ReferralStore } from '../src/store.ts';
import { AttributionSync } from '../src/sync.ts';
import { createReferralApp } from '../src/app.ts';
import { CHALLENGE_MS, FIRST_TOUCH_MS, SESSION_MS, type ActivityEnvelope, type IndexFreshness, type QualifyingEvent } from '../src/model.ts';

const alice=privateKeyToAccount(generatePrivateKey());
const bob=privateKeyToAccount(generatePrivateKey());
const carol=privateKeyToAccount(generatePrivateKey());
const origin='http://127.0.0.1:3000';
const lower=(address:string)=>address.toLowerCase();
function setup() {
  const store=new ReferralStore(':memory:');let now=1700000000000;let block=100;
  const auth=new ReferralAuth(store,origin,(wallet,message,signature)=>verifyMessage({address:wallet as Address,message,signature}),async()=>block,()=>now);
  return {store,auth,get now(){return now;},advance:(ms:number)=>now+=ms,setBlock:(next:number)=>block=next};
}
async function associate(s:ReturnType<typeof setup>, wallet=alice,referrer=bob.address) {
  const c=s.auth.challenge({wallet:wallet.address,referrer});
  return s.auth.verify({challengeId:c.id,signature:await wallet.signMessage({message:c.message})});
}
const hexHash=(byte:string)=>`0x${byte.repeat(64)}`;
function freshness(revision=0,indexedBlock=200):IndexFreshness {
  return {chainId:10143,indexedBlock,headBlock:indexedBlock+8,confirmations:8,lagBlocks:8,indexedAt:'2026-10-10T00:00:00Z',syncing:false,error:null,source:'MONAD_EVENT_INDEXER',indexedBlockHash:hexHash('a'),reorgRevision:revision,projectionVersion:revision+1};
}
function event(blockNumber=110,eventName:QualifyingEvent['eventName']='CurveBuy',changes:Partial<QualifyingEvent>={}):QualifyingEvent {
  return {id:`event-${blockNumber}-${eventName}`,chainId:10143,blockNumber,blockHash:hexHash('b'),txHash:hexHash('c'),logIndex:0,transactionIndex:0,timestamp:1700000000,eventName,actor:lower(alice.address),token:lower(carol.address),quote:'0x0000000000000000000000000000000000000000',quoteAmountRaw:eventName==='TokenLaunched'?'0':'9007199254740993123456789',...changes};
}
function envelope(events:QualifyingEvent[],from=100,to=200,revision=0):ActivityEnvelope {
  return {data:{events,nextCursor:null,canonicalFromBlock:from,canonicalToBlock:to},freshness:freshness(revision,to)};
}
const requestReturning=(make:(url:URL)=>ActivityEnvelope|Response)=>async(input:Parameters<typeof fetch>[0])=>{
  const result=make(new URL(String(input)));return result instanceof Response?result:Response.json(result);
};

test('wallet ownership proof binds domain, chain, referrer, nonce, expiry and purpose',async()=>{
  const s=setup();try {
    const c=s.auth.challenge({wallet:alice.address,referrer:bob.address});
    assert.match(c.message,/127\.0\.0\.1:3000/);assert.match(c.message,/Chain ID: 10143/);assert.match(c.message,new RegExp(lower(bob.address)));
    assert.match(c.message,/Nonce:/);assert.match(c.message,/Expiration Time:/);assert.match(c.message,/No transaction or payout/);
    await assert.rejects(s.auth.verify({challengeId:c.id,signature:await bob.signMessage({message:c.message})}),/INVALID_SIGNATURE/);
    await assert.rejects(s.auth.verify({challengeId:c.id,signature:await alice.signMessage({message:c.message})}),/CHALLENGE_EXPIRED_OR_USED/);
    assert.equal(s.store.association(lower(alice.address)),null);
    const valid=await associate(s);assert.equal(valid.wallet,lower(alice.address));assert.equal(s.store.session(valid.token,s.now),lower(alice.address));
    assert.equal(s.store.association(lower(alice.address))?.associationBlock,100);
    s.advance(SESSION_MS);assert.equal(s.store.session(valid.token,s.now),null);
  }finally{s.store.close();}
});

test('message tampering and expired challenges cannot establish attribution',async()=>{
  const s=setup();try {
    const c=s.auth.challenge({wallet:alice.address,referrer:bob.address});
    await assert.rejects(s.auth.verify({challengeId:c.id,signature:await alice.signMessage({message:c.message.replace('10143','143')})}),/INVALID_SIGNATURE/);
    const expired=s.auth.challenge({wallet:alice.address,referrer:bob.address});s.advance(CHALLENGE_MS);
    await assert.rejects(s.auth.verify({challengeId:expired.id,signature:await alice.signMessage({message:expired.message})}),/CHALLENGE_EXPIRED_OR_USED/);
  }finally{s.store.close();}
});

test('concurrent verification consumes nonce once and existing referrer stays immutable',async()=>{
  const s=setup();try {
    const c=s.auth.challenge({wallet:alice.address,referrer:bob.address});const signature=await alice.signMessage({message:c.message});
    const results=await Promise.allSettled([s.auth.verify({challengeId:c.id,signature}),s.auth.verify({challengeId:c.id,signature})]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.throws(()=>s.auth.challenge({wallet:alice.address,referrer:carol.address}),/REFERRER_IMMUTABLE/);
    s.setBlock(150);await associate(s);
    assert.equal(s.store.association(lower(alice.address))?.associationBlock,100);
  }finally{s.store.close();}
});

test('invalid addresses, self referral and unbounded first-touch dates fail closed',()=>{
  const s=setup();try {
    for(const wallet of ['garbage','0x'+'0'.repeat(40),42])assert.throws(()=>s.auth.challenge({wallet}),/INVALID_WALLET/);
    assert.throws(()=>s.auth.challenge({wallet:alice.address,referrer:alice.address}),/SELF_REFERRAL/);
    for(const firstSeenAt of [s.now+1,s.now-FIRST_TOUCH_MS-1,'2026-10-10'])assert.throws(()=>s.auth.challenge({wallet:alice.address,firstSeenAt}),/INVALID_FIRST_SEEN/);
    assert.throws(()=>new ReferralAuth(s.store,'https://example.com/path',async()=>true,async()=>1),/exact HTTP/);
  }finally{s.store.close();}
});

test('confirmed actor activity qualifies after association; volumes stay exact and separated by quote',async()=>{
  const s=setup();try {
    await associate(s);
    const quote2=lower(bob.address);
    const events=[event(99,'CurveSell',{txHash:hexHash('1')}),event(100,'CurveSell',{txHash:hexHash('5')}),event(110),event(120,'KuruTrade',{txHash:hexHash('2'),quote:quote2,quoteAmountRaw:'123'}),event(125,'TokenLaunched',{txHash:hexHash('3')}),event(130,'CurveBuy',{txHash:hexHash('4'),actor:lower(carol.address)})];
    const sync=new AttributionSync(s.store,'http://indexer.local',requestReturning(()=>envelope(events.filter(e=>e.blockNumber>=100))));await sync.sync();assert.equal(sync.error,null);
    const result=s.store.summary(lower(bob.address));assert.equal(result.referredWallets,1);assert.equal(result.qualifiedWallets,1);assert.equal(result.createdLaunches,1);
    assert.deepEqual(result.volumeByQuote,[{quote:'0x'+'0'.repeat(40),volumeRaw:'9007199254740993123456789'},{quote:quote2,volumeRaw:'123'}]);
    assert.equal(result.referrals[0].qualifyingAction,'CurveBuy');assert.equal(result.earningsEnabled,false);assert.equal(result.referralPayoutRequiresProtocolChange,true);
    await sync.sync();assert.deepEqual(s.store.summary(lower(bob.address)).volumeByQuote,result.volumeByQuote);
  }finally{s.store.close();}
});

test('full canonical replay removes orphaned qualification, launch count and volume',async()=>{
  const s=setup();try {
    await associate(s);let events=[event(110),event(120,'TokenLaunched',{txHash:hexHash('2')})];let revision=0;
    const sync=new AttributionSync(s.store,'http://indexer.local',requestReturning(url=>envelope(events,Number(url.searchParams.get('fromBlock')),200,revision)));
    await sync.sync();assert.equal(s.store.summary(lower(bob.address)).qualifiedWallets,1);
    events=[];revision++;await sync.sync();const result=s.store.summary(lower(bob.address));
    assert.equal(result.qualifiedWallets,0);assert.equal(result.createdLaunches,0);assert.deepEqual(result.volumeByQuote,[]);assert.equal(result.referrals[0].status,'ASSOCIATED');
  }finally{s.store.close();}
});

test('pagination error, malformed event and unconfirmed windows never partially replace projection',async()=>{
  const s=setup();try {
    await associate(s);s.store.reconcile(100,200,[event(110)],freshness());let mode='cursor';
    const sync=new AttributionSync(s.store,'http://indexer.local',requestReturning(url=>{
      if(mode==='cursor')return url.searchParams.has('cursor')?Response.json({error:'CURSOR_EXPIRED'},{status:409}):{...envelope([event(120)]),data:{...envelope([]).data,nextCursor:'next'}};
      if(mode==='malformed')return envelope([event(110,'CurveBuy',{quoteAmountRaw:'1.5'})]);
      if(mode==='unconfirmed')return {...envelope([]),freshness:{...freshness(),headBlock:200}};
      return envelope([event(110),event(110)]);
    }));
    for(mode of ['cursor','malformed','unconfirmed','duplicate']){await sync.sync();assert.ok(sync.error);assert.equal(s.store.summary(lower(bob.address)).qualifiedWallets,1);assert.equal(s.store.summary(lower(bob.address)).volumeByQuote[0].volumeRaw,'9007199254740993123456789');}
  }finally{s.store.close();}
});

test('deep reorg revision replays from earliest association instead of retaining older orphaned rows',async()=>{
  const s=setup();try {
    await associate(s);s.store.reconcile(100,1000,[event(110)],freshness(0,1000));const from:number[]=[];
    const sync=new AttributionSync(s.store,'http://indexer.local',requestReturning(url=>{const start=Number(url.searchParams.get('fromBlock'));from.push(start);return envelope([],start,1000,1);}));
    await sync.sync();assert.deepEqual(from,[488,100]);assert.equal(s.store.summary(lower(bob.address)).qualifiedWallets,0);
  }finally{s.store.close();}
});

test('HTTP Origin, cookie ownership, invalid parameters, session expiry and logout boundaries',async()=>{
  const s=setup();const server=createReferralApp({store:s.store,auth:s.auth,secure:true,clock:()=>s.now});server.listen(0,'127.0.0.1');await once(server,'listening');
  const port=(server.address() as {port:number}).port;const base=`http://127.0.0.1:${port}/api/referrals`;
  const post=(path:string,data:unknown,headers:Record<string,string>={})=>fetch(`${base}/${path}`,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...headers},body:JSON.stringify(data)});
  try {
    assert.equal((await fetch(`${base}/summary`)).status,401);
    assert.equal((await post('challenge',{wallet:alice.address},{Origin:'https://evil.example'})).status,403);
    assert.equal((await fetch(`${base}/challenge`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({wallet:alice.address})})).status,403);
    assert.equal((await post('challenge',{wallet:alice.address,extra:'forged'})).status,400);
    const c=await (await post('challenge',{wallet:alice.address,referrer:bob.address})).json() as {challengeId:string;message:string};
    const verified=await post('verify',{challengeId:c.challengeId,signature:await alice.signMessage({message:c.message})});assert.equal(verified.status,200);
    const cookie=verified.headers.get('set-cookie')!;assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);assert.match(cookie,/Secure/);assert.match(cookie,/Max-Age=3600/);
    const session=cookie.split(';')[0];const own=await fetch(`${base}/summary`,{headers:{Cookie:session}});assert.equal(own.status,200);assert.equal((await own.json() as {wallet:string}).wallet,lower(alice.address));
    assert.equal((await fetch(`${base}/summary?wallet=${bob.address}`,{headers:{Cookie:session}})).status,400); // Params cannot select another user's summary.
    await post('logout',{}, {Cookie:session});assert.equal((await fetch(`${base}/summary`,{headers:{Cookie:session}})).status,401);
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));s.store.close();}
});


test('activity page size stays within the actual indexer API contract',async()=>{
 const s=setup();try {
  await associate(s);let observed=false;
  const sync=new AttributionSync(s.store,'http://indexer.local',requestReturning(url=>{
   assert.equal(url.searchParams.get('limit'),'100');observed=true;return envelope([event(110)]);
  }));await sync.sync();assert.equal(sync.error,null);assert.equal(observed,true);
 }finally{s.store.close();}
});

test('multi-page activity keeps the cursor-bound query identical', async () => {
  const s = setup();
  try {
    await associate(s);
    const windows: (string | null)[] = [];
    const sync = new AttributionSync(s.store, 'http://indexer.local', requestReturning(url => {
      const key = JSON.stringify([...url.searchParams.entries()].filter(([name]) => name !== 'cursor').sort());
      const cursor = url.searchParams.get('cursor');
      windows.push(url.searchParams.get('toBlock'));
      if (cursor && Buffer.from(cursor, 'base64url').toString() !== key)
        return Response.json({ error: 'CURSOR_QUERY_MISMATCH' }, { status: 400 });
      const value = envelope([cursor ? event(120, 'CurveBuy', { txHash: hexHash('d') }) : event(110)]);
      value.data.nextCursor = cursor ? null : Buffer.from(key).toString('base64url');
      return value;
    }));
    await sync.sync();
    assert.equal(sync.error, null);
    assert.deepEqual(windows, [null, '200', '200']);
    assert.equal(s.store.summary(lower(bob.address)).volumeByQuote[0].volumeRaw,
      String(2n * 9007199254740993123456789n));
  } finally { s.store.close(); }
});

test('canonical head falling below association clears orphaned qualification and records pending freshness',async()=>{
  const s=setup();try {
    await associate(s);s.store.reconcile(100,200,[event(110),event(120,'TokenLaunched',{txHash:hexHash('2')})],freshness());
    assert.equal(s.store.summary(lower(bob.address)).qualifiedWallets,1);
    const sync=new AttributionSync(s.store,'http://indexer.local',requestReturning(url=>envelope([],Number(url.searchParams.get('fromBlock')),90,1)));
    await sync.sync();assert.equal(sync.error,null);
    const summary=s.store.summary(lower(bob.address));
    assert.equal(summary.qualifiedWallets,0);assert.equal(summary.createdLaunches,0);assert.deepEqual(summary.volumeByQuote,[]);
    assert.equal(summary.referrals[0].status,'ASSOCIATED');assert.equal(summary.freshness?.indexedBlock,90);assert.equal(summary.freshness?.reorgRevision,1);
    assert.equal(s.store.association(lower(alice.address))?.associationBlock,100);
  }finally{s.store.close();}
});
