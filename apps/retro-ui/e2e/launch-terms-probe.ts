import {createChain} from '@retropick/launchpad-sdk/chain';
import {readLaunchPreconditions} from '@retropick/launchpad-sdk/registry';
for(const url of ['https://testnet-rpc.monad.xyz','https://rpc.ankr.com/monad_testnet']) {
 const chain=createChain(url,{timeoutMs:8000,maxConcurrent:4,requestsPerSecond:10});
 const proxy=new Proxy(chain,{get(t,k){if(k==='readContract')return async(a:any)=>{try{const v=await t.readContract(a);console.log(a.functionName,JSON.stringify(v,(_,x)=>typeof x==='bigint'?x.toString():x));return v;}catch(e){console.log('FAILED',a.functionName, String(e).slice(0,1800));throw e;}};return Reflect.get(t,k);}});
 try{console.log('RESULT',url,JSON.stringify(await readLaunchPreconditions(proxy),(_,x)=>typeof x==='bigint'?x.toString():x));}catch(e){console.log('PRECONDITIONS_FAILED',url,String(e).slice(0,2500));}
}
