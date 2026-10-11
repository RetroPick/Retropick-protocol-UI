// Non-signing qualification; consumes existing server env only. Never persists endpoint or RPC error body.
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/retro-ui/package.json',import.meta.url));
const {encodeFunctionData,decodeFunctionResult,keccak256,encodeEventTopics}=require('viem');
const {factoryAbi}=await import('../../packages/launchpad-sdk/src/abis/factoryAbi.ts');
const {tokenAbi}=await import('../../packages/launchpad-sdk/src/abis/tokenAbi.ts');
const {release}=await import('../../packages/launchpad-sdk/src/release.ts');
const primary=process.env.MONAD_TESTNET_INFURA_PROBE_URL??process.env.MONAD_TESTNET_RPC_URL;
const fallback=process.env.MONAD_TESTNET_RPC_FALLBACK_URL??'https://testnet-rpc.monad.xyz';
if(!primary)throw Error('Existing server RPC configuration required.');
const authPattern=/unauthori[sz]ed|forbidden|does not have access|invalid project/i;
async function rpc(url,requests){const start=performance.now();try{
 const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(requests),signal:AbortSignal.timeout(8000)});
 const text=await response.text();let parsed;try{parsed=JSON.parse(text);}catch{}
 const entries=Array.isArray(parsed)?parsed:[parsed];const requested=Array.isArray(requests)?requests:[requests];
 const malformed=!parsed||entries.length!==requested.length||entries.some(x=>!x||x.jsonrpc!=='2.0'||!requested.some(q=>q.id===x.id)||(('result'in x)===('error'in x)));
 const failure=response.status===401||response.status===403||authPattern.test(parsed ? JSON.stringify((Array.isArray(parsed)?parsed:[parsed]).map(x=>x?.error??null)) : text)?'AUTH':response.status===429?'RATE_LIMIT':!response.ok?'HTTP_'+response.status:malformed?'INVALID_JSON_RPC_ENVELOPE':(Array.isArray(parsed)?parsed:[parsed]).some(x=>x?.error)?'RPC_ERROR':null;
 return {status:response.status,ms:Math.round((performance.now()-start)*100)/100,failure,bytes:Buffer.byteLength(text),result:failure?undefined:parsed};
}catch(error){return{status:null,ms:Math.round(performance.now()-start),failure:error.name==='TimeoutError'?'TIMEOUT':'NETWORK',bytes:0};}}
const call=(method,params=[],id=1)=>({jsonrpc:'2.0',id,method,params});
const token='0x43e7e9b1b7d9A143573307b13D14B51580c18f15';const factory=release.addresses.factory;
const reports=[];
for(const [category,url]of [['configured-primary',primary],['qualified-public-fallback',fallback]]){
 const report={category,host:new URL(url).hostname,chainId:null,qualified:false,probes:[]};
 let disabled=false;
 const probe=async(name,request)=>{if(disabled){report.probes.push({name,status:null,ms:0,failure:'AUTH_CIRCUIT_OPEN',bytes:0});return undefined;}await new Promise(r=>setTimeout(r,1000));const value=await rpc(url,request);const {result,...meta}=value;report.probes.push({name,...meta});if(meta.failure==='AUTH')disabled=true;return result;};
 const chain=await probe('chainId',call('eth_chainId'));
 if(chain?.result!=='0x279f'){report.failure=chain?'WRONG_CHAIN':report.probes[0].failure;reports.push(report);continue;}
 report.chainId=10143;
 const head=await probe('head',call('eth_blockNumber'));if(!head){reports.push(report);continue;}report.head=Number(BigInt(head.result));const block='0x'+(BigInt(head.result)-8n).toString(16);
 const code=await probe('deployed-factory-code',call('eth_getCode',[factory,block]));report.factoryCodeHash=code?.result&&code.result!=='0x'?keccak256(code.result):null;
 const read=encodeFunctionData({abi:tokenAbi,functionName:'decimals'});
 const decimals=await probe('deployed-token-decimals',call('eth_call',[{to:token,data:read},block]));report.decimals=decimals?Number(decodeFunctionResult({abi:tokenAbi,functionName:'decimals',data:decimals.result})):null;
 await probe('batch-pinned-reads',[call('eth_chainId',[],1),call('eth_call',[{to:token,data:read},block],2)]);
 const multicall='0xcA11bde05977b3631167028862bE2a173976CA11';
 const mcCode=await probe('multicall-runtime',call('eth_getCode',[multicall,block]));report.multicallCodeHash=mcCode?.result&&mcCode.result!=='0x'?keccak256(mcCode.result):null;
 const abi=[{type:'function',name:'aggregate3',stateMutability:'payable',inputs:[{name:'calls',type:'tuple[]',components:[{name:'target',type:'address'},{name:'allowFailure',type:'bool'},{name:'callData',type:'bytes'}]}],outputs:[{name:'returnData',type:'tuple[]',components:[{name:'success',type:'bool'},{name:'returnData',type:'bytes'}]}]}];
 const mc=await probe('multicall-aggregate3',call('eth_call',[{to:multicall,data:encodeFunctionData({abi,functionName:'aggregate3',args:[[{target:token,allowFailure:false,callData:read}]]})},block]));
 report.multicallMatchesDirect=mc?decodeFunctionResult({abi,functionName:'aggregate3',data:mc.result})[0].returnData===decimals?.result:false;
 for(const window of [1,50,100])await probe('logs-head-window-'+window,call('eth_getLogs',[{address:factory,fromBlock:'0x'+(BigInt(head.result)-8n-BigInt(window)+1n).toString(16),toBlock:block}]));
 const deployment=BigInt(release.deploymentBlock??69509526);await probe('logs-deployment-window-100',call('eth_getLogs',[{address:factory,fromBlock:'0x'+deployment.toString(16),toBlock:'0x'+(deployment+99n).toString(16),topics:encodeEventTopics({abi:factoryAbi,eventName:'TokenLaunched'})}]));
 report.qualified=report.factoryCodeHash!==null&&report.decimals===18&&report.multicallMatchesDirect&&report.probes.every(p=>!p.failure);reports.push(report);
}
const summary={baseline:'f643cb62c7713c561cd4a95a9ffbabad5e620eb9',measuredAt:new Date().toISOString(),network:10143,infuraStatus:reports[0].qualified?'QUALIFIED':'INFURA_MONAD_TESTNET_NOT_QUALIFIED',reports};
await mkdir('evidence/launchpad/productization/resume/runtime',{recursive:true});await writeFile(process.env.RPC_QUALIFICATION_OUTPUT??'evidence/launchpad/productization/resume/runtime/rpc-qualification.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
