import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createChain, release, addresses, type ChainClient } from '../src/chain.ts';
import { curveAbi } from '../src/abis/curveAbi.ts';
import { coordinatorAbi } from '../src/abis/coordinatorAbi.ts';
import { tokenAbi } from '../src/abis/tokenAbi.ts';
import { encodeFunctionData, keccak256, parseAbi, type Address, type Hex } from 'viem';

if(process.env.RPC_BENCHMARK_PROVIDER==='infura'&&!process.env.MONAD_TESTNET_RPC_URL)throw Error('Configured server RPC is required');
const url=process.env.RPC_BENCHMARK_PROVIDER==='infura'?process.env.MONAD_TESTNET_RPC_URL!:process.env.FRONTEND_RPC_BENCHMARK_URL ?? process.env.MONAD_TESTNET_RPC_FALLBACK_URL ?? 'https://testnet-rpc.monad.xyz';
const count=Number(process.env.RPC_BENCHMARK_SAMPLES ?? 30);
if (!Number.isInteger(count)||count<1) throw Error('Invalid sample count');
const availableModes=[{name:'parallel-http',httpBatch:false,multicall:false},{name:'json-rpc-batch',httpBatch:true,multicall:false},{name:'multicall3',httpBatch:false,multicall:true},{name:'frontend-default',httpBatch:true,multicall:false},{name:'frontend-multicall-candidate',httpBatch:true,multicall:true}];
const requestedModes=process.env.RPC_BENCHMARK_MODES?.split(',');
const modes=requestedModes?availableModes.filter(mode=>requestedModes.includes(mode.name)):availableModes;
if(!modes.length || requestedModes?.some(name=>!availableModes.some(mode=>mode.name===name)))throw Error('Invalid benchmark modes');
const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
type Metrics={requests:number;rpcCalls:number;ethCalls:number;bytesFetched:number};
let measuring:Metrics|null=null;
// One process-wide request scheduler applies to probes, warmup and all modes.
// Sliding window counts eth_call entries inside a JSON batch individually.
let schedule=Promise.resolve(); const callStarts:number[]=[];
async function pace(calls:number) {
 const gate=schedule.then(async()=>{
  if(calls>10)throw Error('BENCHMARK_BATCH_EXCEEDS_RATE_BUDGET');
  while(calls>0) {
   const now=performance.now();while(callStarts.length&&callStarts[0]<=now-1000)callStarts.shift();
   if(callStarts.length+calls<=10){for(let i=0;i<calls;i++)callStarts.push(now);return;}
   await sleep(Math.max(1,1001-(now-callStarts[0])));
  }
 });schedule=gate.catch(()=>{});await gate;
}
let active=0;const waiters:Array<()=>void>=[];
async function acquire(){if(active>=3)await new Promise<void>(resolve=>waiters.push(resolve));else active++;}
function releaseSlot(){const next=waiters.shift();if(next)next();else active--;}
const fetchOriginal=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 const sample=measuring;let rpcCalls=1,ethCalls=0;
 try{const body=JSON.parse(String(init?.body));const entries=Array.isArray(body)?body:[body];rpcCalls=entries.length;ethCalls=entries.filter(r=>r.method==='eth_call').length;}catch{}
 await acquire();
 try{
  await pace(ethCalls);
  if(sample){sample.requests++;sample.rpcCalls+=rpcCalls;sample.ethCalls+=ethCalls;}
  const response=await fetchOriginal(input,init);
  if(sample)sample.bytesFetched+=(await response.clone().arrayBuffer()).byteLength;
  return response;
 }finally{releaseSlot();}
};
function errorClass(error:unknown):string {
 const seen=new Set<unknown>();
 for(let e:any=error;e&&typeof e==='object'&&!seen.has(e);e=e.cause){seen.add(e);const message=String(e.message??'');const fixed=message.match(/RPC_(AUTH|WRONG_CHAIN|RATE_LIMIT|TIMEOUT|HTTP_5XX|NETWORK|RPC_INTERNAL)/);if(fixed)return fixed[1];if(e.status===429)return 'RATE_LIMIT';if(e.status===401||e.status===403)return 'AUTH';if(e.status>=500)return 'HTTP_5XX';if(e.name==='TimeoutError')return 'TIMEOUT';if(message.includes('READ_MISMATCH'))return 'READ_MISMATCH';}
 return 'RPC_UNAVAILABLE';
}
async function reads(client:ChainClient,blockNumber:bigint) {
 // Await every call even after one failure, preventing cross-sample overlap.
 const outcomes=await Promise.allSettled([
  client.readContract({address:release.demo.curve,abi:curveAbi,functionName:'getReserves',blockNumber}),
  client.readContract({address:release.demo.curve,abi:curveAbi,functionName:'realQuoteReserve',blockNumber}),
  client.readContract({address:release.demo.curve,abi:curveAbi,functionName:'sellableTokens',blockNumber}),
  client.readContract({address:release.demo.curve,abi:curveAbi,functionName:'reservedTokens',blockNumber}),
  client.readContract({address:release.demo.curve,abi:curveAbi,functionName:'feeBps',blockNumber}),
  client.readContract({address:release.demo.curve,abi:curveAbi,functionName:'creatorTaxBps',blockNumber}),
  client.readContract({address:release.demo.curve,abi:curveAbi,functionName:'readyToGraduate',blockNumber}),
  client.readContract({address:addresses.coordinator,abi:coordinatorAbi,functionName:'ledger',args:[release.demo.token],blockNumber}),
  client.readContract({address:addresses.coordinator,abi:coordinatorAbi,functionName:'receipt',args:[release.demo.token],blockNumber}),
 ]);
 const failed=outcomes.find(r=>r.status==='rejected');if(failed?.status==='rejected')throw failed.reason;
 return JSON.stringify(outcomes.map(r=>r.status==='fulfilled'?r.value:null),(_,v)=>typeof v==='bigint'?String(v):v);
}
const quantile=(values:number[],q:number)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*q)-1]??null;
const mean=(values:number[])=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
const output=process.env.RPC_BENCHMARK_OUTPUT ?? 'evidence/launchpad/productization/resume/sdk/rpc-public.json';
const evidence:any={measuredAt:new Date().toISOString(),providerHost:new URL(url).host,samplesPerMode:count,qualificationMinimum:30,scenario:'Nine identical launch reads at one pinned block; decoded results compared exactly',protocol:{modeDeadlineMs:120000,ethCallLimitPerSecond:10,maxConcurrentHttpRequests:3,warmupSamples:1,probesExcluded:true,failedCallsFullySettled:true,maxAttempts:count+10,maxConsecutiveErrors:3},verification:null,results:[],winner:null,status:'PARTIAL'};
const save=()=>{mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(evidence,null,2)+'\n');};
try{
 evidence.stage='probe';const primary=createChain(url,{httpBatch:false});await primary.probeProviders();evidence.bootstrapHealth=primary.rpcHealth();
 evidence.stage='chain-id';if(await primary.getChainId()!==10143)throw Error('RPC_WRONG_CHAIN');
 evidence.stage='block-number';const blockNumber=process.env.RPC_BENCHMARK_BLOCK?BigInt(process.env.RPC_BENCHMARK_BLOCK):await primary.getBlockNumber({cacheTime:0});
 const multicall='0xcA11bde05977b3631167028862bE2a173976CA11' as Address;
 evidence.stage='multicall-bytecode';const code=await primary.getBytecode({address:multicall,blockNumber});if(!code||code==='0x')throw Error('No Multicall3 runtime');
 if(keccak256(code)!=='0xd5c15df687b16f2ff992fc8d767b4216323184a2bbc6ee2f9c398c318e770891')throw Error('MULTICALL_RUNTIME_MISMATCH');
 const calls=[{target:release.demo.token as Address,allowFailure:false,callData:encodeFunctionData({abi:tokenAbi,functionName:'totalSupply'})}];
 evidence.stage='aggregate3';const aggregate=(await primary.readContract({address:multicall,abi:parseAbi(['function aggregate3((address target,bool allowFailure,bytes callData)[] calls) payable returns ((bool success,bytes returnData)[])']),functionName:'aggregate3',args:[calls],blockNumber})) as unknown as Array<{success:boolean;returnData:Hex}>;
 evidence.stage='direct-call';const direct=await primary.call({to:release.demo.token as Address,data:calls[0].callData,blockNumber});
 if(!aggregate[0]?.success||aggregate[0].returnData!==direct.data)throw Error('READ_MISMATCH');
 evidence.verification={address:multicall,chainId:10143,blockNumber:String(blockNumber),codeHash:keccak256(code),codeBytes:(code.length-2)/2,aggregate3MatchesDirect:true};save();
 let expected:string|undefined;
 for(const mode of modes){evidence.stage=mode.name;save();
  const client=createChain(url,{...mode,timeoutMs:10_000});await client.probeProviders();
  const samples: Array<Metrics&{ms:number}>=[],errors:string[]=[];let warmup='PASS',consecutive=0,attempts=0;
  try{const values=await reads(client,blockNumber);if(expected&&expected!==values)throw Error('READ_MISMATCH');expected=values;}catch(error){warmup=errorClass(error);await sleep(5000);await client.probeProviders();}
  // Rate budget and HTTP work from warmup are excluded from timed samples.
  await sleep(1100);
  const modeStarted=performance.now();
  while(samples.length<count&&attempts<count+10&&consecutive<3&&performance.now()-modeStarted<120000){
   attempts++;measuring={requests:0,rpcCalls:0,ethCalls:0,bytesFetched:0};const started=performance.now();
   try{const values=await reads(client,blockNumber);if(expected&&expected!==values)throw Error('READ_MISMATCH');expected=values;samples.push({ms:Math.round((performance.now()-started)*100)/100,...measuring});consecutive=0;}
   catch(error){errors.push(errorClass(error));consecutive++;}
   finally{measuring=null;}
   evidence.inProgress={mode:mode.name,samples:samples.length,attempts,errors:errors.length};if(consecutive||samples.length%5===0)save();
   if(consecutive){await sleep(5000);await client.probeProviders();}
   // Each sample starts with a full rate window; sample latency retains the
   // actual 3-request HTTP parallelism without prior-sample pacing penalties.
   await sleep(1100);
  }
  const summary={mode:mode.name,providerHealth:client.rpcHealth(),httpBatch:mode.httpBatch,multicall:mode.multicall,samples:samples.length,attempts,errors:errors.length,warmup,status:samples.length>=30?'QUALIFIED':'PARTIAL',p50Ms:quantile(samples.map(s=>s.ms),.5),p95Ms:quantile(samples.map(s=>s.ms),.95),meanRequests:mean(samples.map(s=>s.requests)),meanRpcCalls:mean(samples.map(s=>s.rpcCalls)),meanEthCalls:mean(samples.map(s=>s.ethCalls)),meanBytesFetched:mean(samples.map(s=>s.bytesFetched))};
  delete evidence.inProgress;evidence.results.push({...summary,samplesDetail:samples,errorClasses:errors});save();console.log(JSON.stringify(summary));
 }
 const qualified=evidence.results.filter((r:any)=>r.samples>=30&&r.errors===0&&r.warmup==='PASS').sort((a:any,b:any)=>a.p95Ms-b.p95Ms);
 // No winner is inferred unless every compared mode met the same threshold.
 evidence.selectionPolicy='Descriptive sequential samples only; no automatic transport winner';
 if(qualified.length===modes.length)evidence.status='QUALIFIED';
}catch(error){evidence.fatalError=errorClass(error);}
finally{globalThis.fetch=fetchOriginal;save();console.log(JSON.stringify({evidence:output,status:evidence.status,winner:evidence.winner}));}
