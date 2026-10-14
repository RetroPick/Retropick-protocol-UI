import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ContractFunctionExecutionError, ContractFunctionRevertedError, encodeErrorResult, zeroAddress, type Address} from 'viem';
import {addresses,release,type ChainClient} from '../src/chain.ts';
import {readLaunchPreconditions} from '../src/registry.ts';
import {registryAbi} from '../src/abis/registryAbi.ts';
const usdc='0x534b2f3A21130d7a60830c2Df862319e593943A3' as Address;
const wrapped=release.addresses.wrappedNative as Address;
function rejected(name:'UnsupportedQuote'|'InvalidQuoteConfig') {
 const cause=new ContractFunctionRevertedError({abi:registryAbi,functionName:'admitted',data:encodeErrorResult({abi:registryAbi,errorName:name})});
 return new ContractFunctionExecutionError(cause,{abi:registryAbi,functionName:'admitted',contractAddress:addresses.quoteRegistry,args:[wrapped,0]});
}
function chain(admission:(asset:Address,venue:number)=>unknown) {
 const reads:{functionName:string;blockNumber?:bigint}[]=[];
 const values:Record<string,unknown>={launchEnabled:true,launchFee:0n,maxCreatorTaxBps:1000n,snipeTaxSeconds:15n,snipeTaxStartBps:0n,launchConfigCount:1n,canLaunch:true,CIRCLE_TEST_USDC:usdc,currentFeePolicy:{hookFeeBps:100},getLaunchConfig:{supply:1000n*10n**18n,curveFeeBps:100n,phantomQuote:10n**18n,graduationThreshold:10n**18n,poolFee:0,tickSpacing:60,enabled:true}};
 return {reads,client:{getBlockNumber:async()=>700n,getChainId:async()=>10143,getCode:async()=>'0x6000',readContract:async(a:any)=>{reads.push(a);if(a.functionName==='getConfig') return {...admitted, decimals:a.args[0].toLowerCase()===usdc.toLowerCase()?6:18};if(a.functionName==='symbol')return a.address.toLowerCase()===usdc.toLowerCase()?'USDC':'WETH';if(a.functionName==='admitted')return {...admission(a.args[0],a.args[1]) as object, decimals:a.args[0].toLowerCase()===usdc.toLowerCase()?6:18};if(a.functionName==='decimals')return a.address.toLowerCase()===usdc.toLowerCase()?6:18;return values[a.functionName];}} as unknown as ChainClient};
}
const admitted={enabled:true,venueMask:3,policyVersion:1,policyHash:'0x'+'11'.repeat(32),assetId:'0x'+'22'.repeat(32),phantomQuote:1n,graduationThreshold:2n,graduationQuoteCeiling:50n};
test('unadmitted WMON does not discard live MON and USDC economics',async()=>{
 const {client,reads}=chain(asset=>{if(asset===wrapped)throw rejected('UnsupportedQuote');return admitted;});
 const terms=await readLaunchPreconditions(client,usdc);
 assert.deepEqual(terms.quotes.map(q=>[q.symbol,q.venue]),[['MON',0],['USDC',0],['MON',1],['USDC',1]]);
 assert.equal(terms.launchEnabled,true);assert.equal(terms.canLaunch,true);assert.equal(terms.currentHookFeeBps,100n);assert.equal(terms.configs[0].supply,1000n*10n**18n);assert(reads.every(r=>r.blockNumber===700n));
});
test('admission is filtered per venue rather than per asset',async()=>{
 const {client}=chain((asset,venue)=>{if(asset!==zeroAddress||venue===0)throw rejected('UnsupportedQuote');return admitted;});
 const terms=await readLaunchPreconditions(client);assert.equal(terms.quotes.length,1);assert.equal(terms.quotes[0].symbol,'MON');assert.equal(terms.quotes[0].venue,1);
});
test('no admitted quote returns an honest empty list, not fabricated assets',async()=>{
 const {client}=chain(()=>{throw rejected('UnsupportedQuote');});assert.deepEqual((await readLaunchPreconditions(client)).quotes,[]);
});
test('other contract errors and provider failures still fail launch terms',async()=>{
 for(const error of [rejected('InvalidQuoteConfig'),new Error('RPC_TIMEOUT'),new Error('UnsupportedQuote')]){
 const {client}=chain(()=>{throw error;});await assert.rejects(readLaunchPreconditions(client),e=>e===error);
 }
});

test('custom candidate authorization requires code and matching decimals at the pinned block',async()=>{
 const extra='0x7777777777777777777777777777777777777777' as Address;
 const {client,reads}=chain(()=>admitted);
 const terms=await readLaunchPreconditions(client,undefined,701n,{candidateAddresses:[extra,extra]});
 assert.equal(terms.quotes.filter(q=>q.address===extra).length,2);assert(reads.every(r=>r.blockNumber===701n));
 client.getCode=async()=>undefined;await assert.rejects(readLaunchPreconditions(client),/no contract code/);
});
test('wrong chain is rejected before registry inspection',async()=>{const {client,reads}=chain(()=>admitted);client.getChainId=async()=>143;await assert.rejects(readLaunchPreconditions(client),/10143/);assert.equal(reads.length,0);});
test('disabled candidates never require token metadata',async()=>{
 const {client}=chain(()=>admitted);const read=client.readContract;
 client.readContract=(async(a:any)=>a.functionName==='getConfig'?{enabled:false}:a.functionName==='decimals'?Promise.reject(Error('should not read')):read(a)) as typeof read;
 assert.deepEqual((await readLaunchPreconditions(client)).quotes,[]);
});
test('token decimals and registry policy must match',async()=>{
 const {client}=chain(()=>admitted);const read=client.readContract;
 client.readContract=(async(a:any)=>a.functionName==='decimals'?8:read(a)) as typeof read;
 await assert.rejects(readLaunchPreconditions(client),/decimals mismatch/);
});
