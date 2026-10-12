import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createChain } from '../src/chain.ts';

async function fixture(initial = 'healthy') {
 let mode = initial, hits = 0;
 const server = createServer((req,res) => {
  hits++; let body=''; req.on('data',chunk=>body+=chunk);req.on('end',()=>{
   if (mode==='auth'||mode==='rate'||mode==='down') {res.statusCode=mode==='auth'?403:mode==='rate'?429:503;res.end('gateway private-path-token');return;}
   if(mode==='timeout')return;
   const handle=(r:{id:number;method:string})=>{
    if(mode==='revert-geth'&&r.method==='eth_call')return {jsonrpc:'2.0',id:r.id,error:{code:-32000,message:'execution reverted private-path-token',data:'0x12345678'}};
    if(mode==='rate-code')return {jsonrpc:'2.0',id:r.id,error:{code:-32011,message:'rate limit private-path-token'}};
    if(mode==='notfound')return {jsonrpc:'2.0',id:r.id,error:{code:-32000,message:'header not found private-path-token'}};
    if(mode==='unmapped')return {jsonrpc:'2.0',id:r.id,error:{code:-31999,message:'gateway private-path-token'}};
    if(r.method==='eth_call')return {jsonrpc:'2.0',id:r.id,error:{code:3,message:'execution reverted private-path-token',data:'0x12345678'}};
    if(mode==='invalid-probe')return {jsonrpc:'2.0',id:r.id,result:true};
    if(mode==='malformed')return {jsonrpc:'2.0',id:r.id};
    if(mode==='range')return {jsonrpc:'2.0',id:r.id,error:{code:-32005,message:'block range too large private-path-token'}};
    if(mode==='internal')return {jsonrpc:'2.0',id:r.id,error:{code:-32603,message:'private-path-token'}};
    return {jsonrpc:'2.0',id:r.id,result:r.method==='eth_chainId'?(mode==='wrong'?'0x1':'0x279f'):'0x7'};
   };
   const parsed=JSON.parse(body);res.setHeader('content-type','application/json');res.end(JSON.stringify(Array.isArray(parsed)?parsed.map(handle):handle(parsed)));
  });
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${(server.address() as {port:number}).port}/private-path-token?apiKey=private-path-token`;
 return {url,mode:(value:string)=>{mode=value;},hits:()=>hits,close:async()=>{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}};
}
test('wrong chain and authorization permanently disable providers and health reveals host only',async()=>{
 for(const mode of ['wrong','auth']) {const bad=await fixture(mode),good=await fixture();try{const client=createChain([bad.url,good.url],{httpBatch:false});await client.probeProviders();assert.equal(client.rpcHealth()[0].health,'disabled');assert.ok(client.rpcHealth().every(h=>!h.origin.includes('private-path-token')));const hits=bad.hits();assert.equal(await client.getBlockNumber({cacheTime:0}),7n);assert.equal(bad.hits(),hits);}finally{await bad.close();await good.close();}}
});
test('429, 5xx, timeout and internal RPC failures fall back and respect cooldown',async()=>{
 for(const mode of ['rate','down','timeout','internal']) {const bad=await fixture(),good=await fixture();try{const client=createChain([bad.url,good.url],{httpBatch:false,timeoutMs:500});await client.probeProviders();bad.mode(mode);assert.equal(await client.getBlockNumber({cacheTime:0}),7n);assert.equal(client.rpcHealth()[0].health,'circuit-open');const hits=bad.hits();assert.equal(await client.getBlockNumber({cacheTime:0}),7n);assert.equal(bad.hits(),hits);}finally{await bad.close();await good.close();}}
});
test('application revert stays on primary, retains ABI data and redacts raw gateway messages',async()=>{
 const primary=await fixture(),fallback=await fixture();try{const client=createChain([primary.url,fallback.url],{httpBatch:false});await client.probeProviders();const hits=fallback.hits();await assert.rejects(()=>client.request({method:'eth_call',params:[{to:'0x1111111111111111111111111111111111111111'},'latest']}),error=>{assert.ok(!String(error).includes('private-path-token'));let current:any=error, payload:unknown;for(let depth=0;current&&depth<8;depth++,current=current.cause){if(current.data)payload=current.data;assert.ok(!String(current.message).includes('private-path-token'));}assert.equal(payload,'0x12345678');return true;});assert.equal(client.rpcHealth()[0].health,'healthy');assert.equal(fallback.hits(),hits);primary.mode('down');fallback.mode('down');await assert.rejects(()=>client.getBlockNumber({cacheTime:0}),error=>!String(error).includes('private-path-token'));}finally{await primary.close();await fallback.close();}
});

test('geth-style -32000 reverts stay application responses with the payload and revert signal intact',async()=>{
 const primary=await fixture(),fallback=await fixture();try{const client=createChain([primary.url,fallback.url],{httpBatch:false});await client.probeProviders();primary.mode('revert-geth');const hits=fallback.hits();await assert.rejects(()=>client.request({method:'eth_call',params:[{to:'0x1111111111111111111111111111111111111111'},'latest']}),error=>{const message=String(error);assert.ok(!message.includes('private-path-token'));assert.ok(message.includes('Execution reverted'),message);assert.equal((error as {data?:string}).data,'0x12345678');assert.equal((error as {code?:number}).code,3);return true;});assert.equal(client.rpcHealth()[0].health,'healthy');assert.equal(fallback.hits(),hits);}finally{await primary.close();await fallback.close();}
});

test('geth -32000 provider faults and unmapped codes fail over with a clean classified error',async()=>{
 for(const mode of ['notfound','unmapped']) {const bad=await fixture(),good=await fixture();try{const client=createChain([bad.url,good.url],{httpBatch:false,timeoutMs:500});await client.probeProviders();bad.mode(mode);assert.equal(await client.getBlockNumber({cacheTime:0}),7n);assert.equal(client.rpcHealth()[0].health,'circuit-open');good.mode(mode);await assert.rejects(()=>client.getBlockNumber({cacheTime:0}),error=>{assert.ok(String(error).includes('RPC_RPC_INTERNAL'));assert.ok(!String(error).includes('private-path-token'));return true;});}finally{await bad.close();await good.close();}}
});

test('logs range limits remain application errors without fallback or circuit opening',async()=>{
 const primary=await fixture(),fallback=await fixture();try{const client=createChain([primary.url,fallback.url],{httpBatch:false});await client.probeProviders();primary.mode('range');const hits=fallback.hits();await assert.rejects(()=>client.request({method:'eth_getLogs',params:[{}]}),error=>!String(error).includes('private-path-token'));assert.equal(client.rpcHealth()[0].health,'healthy');assert.equal(fallback.hits(),hits);}finally{await primary.close();await fallback.close();}
});

test('malformed envelopes fail over transiently instead of NaN permanent wrong-chain classification',async()=>{
 const bad=await fixture('malformed'),good=await fixture();try{const client=createChain([bad.url,good.url],{httpBatch:true});await client.probeProviders();assert.equal(client.rpcHealth()[0].health,'circuit-open');assert.equal(client.rpcHealth()[0].chainId,null);assert.equal(await client.getBlockNumber({cacheTime:0}),7n);}finally{await bad.close();await good.close();}
});

test('non-hex chain/head responses are transient malformed data rather than wrong-chain ids',async()=>{
 const bad=await fixture('invalid-probe'),good=await fixture();try{const client=createChain([bad.url,good.url],{httpBatch:false});await client.probeProviders();assert.equal(client.rpcHealth()[0].health,'circuit-open');assert.equal(client.rpcHealth()[0].chainId,null);assert.equal(await client.getChainId(),10143);}finally{await bad.close();await good.close();}
});

test('provider -32011 rate limits fail over and half-open recovery is single flight', async (t) => {
 const bad=await fixture(), good=await fixture();
 try {
  t.mock.timers.enable({apis:['Date'],now:1000000});
  const client=createChain([bad.url,good.url],{httpBatch:false});await client.probeProviders();
  bad.mode('rate-code');assert.equal(await client.getBlockNumber({cacheTime:0}),7n);
  const hits=bad.hits();assert.equal(client.rpcHealth()[0].health,'circuit-open');
  await client.probeProviders();assert.equal(bad.hits(),hits,'manual probes respect cooldown');
  bad.mode('healthy');t.mock.timers.tick(30001);
  await Promise.all(Array.from({length:8},()=>client.request({method:'eth_getBalance',params:['0x1111111111111111111111111111111111111111','latest']})));
  assert.equal(client.rpcHealth()[0].health,'healthy');assert.equal(bad.hits()-hits,10,'one chain/head probe, eight requests');
 } finally {t.mock.timers.reset();await bad.close();await good.close();}
});

test('browser request budget counts every logical call inside HTTP batches',async()=>{
 const received:number[]=[];let active=0,maxActive=0;
 const server=createServer((req,res)=>{let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
  const parsed=JSON.parse(body), rows=Array.isArray(parsed)?parsed:[parsed];
  for(const _ of rows)received.push(Date.now());active+=rows.length;maxActive=Math.max(maxActive,active);
  setTimeout(()=>{const results=rows.map((r:{id:number;method:string})=>({jsonrpc:'2.0',id:r.id,result:r.method==='eth_chainId'?'0x279f':'0x7'}));res.setHeader('content-type','application/json');res.end(JSON.stringify(Array.isArray(parsed)?results:results[0]));active-=rows.length;},20);
 });});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {
  const client=createChain(`http://127.0.0.1:${(server.address() as {port:number}).port}`,{maxConcurrent:2,requestsPerSecond:4});await client.probeProviders();
  await Promise.all(Array.from({length:8},()=>client.request({method:'eth_getBalance',params:['0x1111111111111111111111111111111111111111','latest']})));
  assert.ok(maxActive<=2,`concurrent ${maxActive}`);
  for(const start of received)assert.ok(received.filter(at=>at>=start&&at<start+980).length<=4,'logical calls exceed rolling request budget');
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
