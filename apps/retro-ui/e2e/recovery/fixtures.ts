import { test as base, expect, type Page } from '@playwright/test';
import { decodeFunctionData, encodeFunctionResult, zeroAddress, type Abi, type AbiParameter, type Hex } from 'viem';
import { addresses, release } from '@retropick/launchpad-sdk/chain';
import { factoryAbi } from '@retropick/launchpad-sdk/abis/factoryAbi';
import { coordinatorAbi } from '@retropick/launchpad-sdk/abis/coordinatorAbi';
import { curveAbi } from '@retropick/launchpad-sdk/abis/curveAbi';
import { tokenAbi } from '@retropick/launchpad-sdk/abis/tokenAbi';
import { kuruAbi } from '@retropick/launchpad-sdk/abis/kuruAbi';
import { routerAbi } from '@retropick/launchpad-sdk/abis/routerAbi';
import { marginAbi } from '@retropick/launchpad-sdk/abis/marginAbi';
import { registryAbi } from '@retropick/launchpad-sdk/abis/registryAbi';
import { memeHookAbi } from '@retropick/launchpad-sdk/abis/memeHookAbi';
import { kuruEnvironmentAbi } from '@retropick/launchpad-sdk/abis/kuruEnvironmentAbi';
import { retroPickFeeEscrowV2Abi } from '@retropick/launchpad-sdk/abis/retroPickFeeEscrowV2Abi';
import { retroPickBuybackVaultV2Abi } from '@retropick/launchpad-sdk/abis/retroPickBuybackVaultV2Abi';
import { seed, snapshot, ALICE, TOKEN, CURVE, MARKET } from '../../../indexer/test/fixtures';
import { installMockWallet } from '../helpers/mock-wallet';
export { expect, ALICE, TOKEN, MARKET };
const abis = [factoryAbi, coordinatorAbi, curveAbi, tokenAbi, kuruAbi, routerAbi, marginAbi, registryAbi, memeHookAbi, kuruEnvironmentAbi, retroPickFeeEscrowV2Abi, retroPickBuybackVaultV2Abi] as readonly Abi[];
const freshness = { chainId:10143,indexedBlock:100,indexedBlockHash:`0x${'a'.repeat(64)}`,headBlock:108,lagBlocks:8,confirmations:8,indexedAt:new Date().toISOString(),syncing:false,error:null,source:'MONAD_EVENT_INDEXER',projectionVersion:2,reorgRevision:0 };
function defaultValue(output: AbiParameter): unknown {
  if (output.type === 'tuple') return Object.fromEntries((output as AbiParameter & { components: AbiParameter[] }).components.map(component => [component.name!, defaultValue(component)]));
  if (output.type.endsWith('[]')) return [];
  if (output.type === 'address') return zeroAddress;
  if (output.type === 'bool') return false;
  if (output.type === 'string') return '';
  if (output.type === 'bytes') return '0x';
  if (output.type.startsWith('bytes')) return `0x${'00'.repeat(Number(output.type.slice(5)))}`;
  return 0n;
}
export interface Faults { protectedGas:boolean; phase:number; economic:boolean; rpc:boolean; quote:bigint; margin:boolean; indexer:boolean; pending:boolean; recipient:string; book:'empty'|'populated'|'error'; writes:string[] }
export async function installRecovery(page: Page): Promise<Faults> {
  await installMockWallet(page, { account: ALICE });
  const faults: Faults = { protectedGas:true,phase:0,economic:false,rpc:false,quote:10n**18n,margin:false,indexer:false,pending:false,recipient:ALICE,book:'empty',writes:[] };
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') return route.abort();
    if (url.port === '9996' || url.port === '9997') {
      const input = route.request().postDataJSON();
      const handle = (row: { id: number; method: string; params: unknown[] }) => {
        const response = (result: unknown) => ({jsonrpc:'2.0',id:row.id,result});
        const error = () => ({jsonrpc:'2.0',id:row.id,error:{code:-32011,message:'fixture provider rate limit'}});
        if (/send|sign/i.test(row.method)) { faults.writes.push(row.method); return error(); }
        if (faults.rpc) return error();
        if (row.method==='eth_chainId') return response('0x279f');
        if (row.method==='eth_blockNumber') return response('0x64');
        if (row.method==='eth_getBalance') return response(!faults.protectedGas && String(row.params[0]).toLowerCase()!==ALICE.toLowerCase() ? '0x0' : '0x3635c9adc5dea00000');
        if (row.method==='eth_getBlockByNumber') return response({number:'0x64',timestamp:'0x64',hash:`0x${'a'.repeat(64)}`,parentHash:`0x${'b'.repeat(64)}`,baseFeePerGas:'0x1',gasLimit:'0x1c9c380',gasUsed:'0x0',transactions:[],difficulty:'0x0',extraData:'0x',miner:zeroAddress,nonce:'0x0000000000000000',receiptsRoot:`0x${'0'.repeat(64)}`,stateRoot:`0x${'0'.repeat(64)}`,transactionsRoot:`0x${'0'.repeat(64)}`,logsBloom:`0x${'0'.repeat(512)}`,sha3Uncles:`0x${'0'.repeat(64)}`,size:'0x0',uncles:[]});
        if (row.method==='eth_estimateGas') return response('0x5208');
        if (row.method==='eth_gasPrice'||row.method==='eth_maxPriorityFeePerGas') return response('0x1');
        if (row.method!=='eth_call') return response('0x');
        const call = row.params[0] as { to:string;data:Hex };
        for (const abi of abis) {
          let decoded;
          try { decoded = decodeFunctionData({abi,data:call.data}); } catch { continue; }
          const name=decoded.functionName;
          if (faults.economic && ['feeBps','creatorTaxBps','reservedTokens'].includes(name)) return error();
          if (faults.margin && name==='getBalance') return error();
          if (faults.book==='error'&&name==='getL2Book') return error();
          const item=abi.find(item=>item.type==='function'&&item.name===name) as Extract<Abi[number],{type:'function'}>;
          let result = item.outputs.length===1 ? defaultValue(item.outputs[0]!) : item.outputs.map(defaultValue);
          const overrides:Record<string,unknown>={
            token:TOKEN,curve:CURVE,quoteAsset:zeroAddress,quoteDecimals:18,venue:1,phase:faults.phase,creatorFeeRecipient:faults.recipient,deployer:ALICE,exists:true,name:'Recovery Token',symbol:'RCVR',description:'Fixture only',market:MARKET,vault:CURVE,lpAsset:TOKEN,supply:10n**27n,curveFeeBps:100n,enabled:true,graduationThreshold:10n**18n,phantomQuote:10n**18n,
          };
          if (item.outputs.length===1 && item.outputs[0]?.type==='tuple') result={...(result as object),...Object.fromEntries(Object.entries(overrides).filter(([key])=>key in (result as object)))};
          const params=[100000000n,100000000n,TOKEN,18,zeroAddress,18,1,100000n,10n**18n,30,0];
          const values:Record<string,unknown>={
            name:'Recovery Token',symbol:'RCVR',description:'Fixture only',logo:'',deployer:ALICE,decimals:18,totalSupply:10n**27n,getReserves:[10n**18n,10n**27n],sellableTokens:faults.phase===0?10n**25n:0n,realQuoteReserve:10n**18n,reservedTokens:0n,feeBps:100n,creatorTaxBps:0n,completionQuote:[10n**18n,0n],balanceOf:10n**18n,balanceOfToken:10n**18n,getBalance:0n,getMarketParams:params,verifiedMarket:params,getVaultParams:[CURVE,0n,0n,0n,0n,0n,0n],marginAccountAddress:release.kuruEnvironment.marginAccount,orderBookImplementation:release.kuruEnvironment.orderBookImplementation,kuruAmmVaultImplementation:release.kuruEnvironment.vaultImplementation,bestBidAsk:[0,0],getL2Book:`0x${[100n,...(faults.book==='populated'?[100000n,10n**18n]:[]),0n,...(faults.book==='populated'?[110000n,10n**18n]:[])].map(x=>x.toString(16).padStart(64,'0')).join('')}`,placeAndExecuteMarketBuy:faults.quote,placeAndExecuteMarketSell:faults.quote,launchEnabled:true,canLaunch:true,launchFee:0n,maxCreatorTaxBps:1000n,launchConfigCount:1n,CIRCLE_TEST_USDC:TOKEN,pendingCreatorFeeRecipient:[faults.pending?MARKET:zeroAddress,200n,300n],releasable:0n,vestingTerms:[ALICE,zeroAddress,1000],transfer:true,
          };
          if (name in values) result=values[name];
          try { return response(encodeFunctionResult({abi,functionName:name,result:result as never})); } catch { return error(); }
        }
        return error();
      };
      return route.fulfill({contentType:'application/json',body:JSON.stringify(Array.isArray(input)?input.map(handle):handle(input))});
    }
    if (url.pathname.startsWith('/v1/') || url.pathname==='/health') {
      if(faults.indexer)return route.fulfill({status:502,contentType:'text/plain',body:'fixture DNS_HOSTNAME_NOT_FOUND'});
      const launch = snapshot([seed({creator:ALICE,logo:'',phase:faults.phase===2?'GRADUATED':faults.phase===1?'GRADUATION_IN_PROGRESS':'ACTIVE',market:faults.phase===2?MARKET:null})]).launches[0];
      if(url.pathname==='/health')return route.fulfill({json:{freshness,ready:true,projection:{expected:2,published:2}}});
      let data:unknown=[];
      if(url.pathname==='/v1/launches'||url.pathname==='/v1/search')data=[launch];
      else if(url.pathname===`/v1/launches/${TOKEN}`)data=launch;
      return route.fulfill({json:{data,freshness,nextCursor:null}});
    }
    if(url.pathname.startsWith('/api/'))return route.fulfill({json:{data:[],chainId:10143}});
    return route.continue();
  });
  return faults;
}
export const test=base.extend<{ faults:Faults }>({ faults:async({page},use)=>{const faults=await installRecovery(page);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await use(faults);expect(faults.writes).toEqual([]);expect(errors).toEqual([]);} });
