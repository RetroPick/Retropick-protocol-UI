import { test } from 'node:test';
import assert from 'node:assert/strict';
import { type Address, zeroAddress } from 'viem';
import { createServer } from 'node:http';
import { createChain, release, type ChainClient } from '../src/chain.ts';
import { readLaunchEssential, readLaunchEconomic, readLaunchProof } from '../src/model.ts';
import { prepareFeeClaimToken, prepareBuybackRelease, prepareKuruMarketOrder, prepareKuruCancel, prepareLaunchToken, kuruGrid, type KuruMarketParams } from '../src/prepare.ts';
import { readKuruOrder } from '../src/orders.ts';
import { prepareTransfer, simulateTransfer } from '../src/transfer.ts';
const account='0x1111111111111111111111111111111111111111' as Address,token='0x2222222222222222222222222222222222222222' as Address,market='0x3333333333333333333333333333333333333333' as Address,curve='0x4444444444444444444444444444444444444444' as Address;
const params=[100_000_000n,100_000_000n,token,18,zeroAddress,18,1,100_000n,10n**18n,30,0] as const;
function mock(overrides:Record<string,unknown>={}) {
 const calls:{functionName:string;args?:unknown[];blockNumber?:bigint}[]=[];
 const values:Record<string,unknown>={packet:{token,curve,quoteAsset:zeroAddress,quoteDecimals:18,venue:1},ledger:{phase:2,protectedLPReceiver:account,protectedExcessReceiver:account},receipt:{market,vault:curve,lpAsset:token},name:'Test',symbol:'TEST',totalSupply:10n**27n,description:'Real',logo:'',deployer:account,getReserves:[10n**18n,10n**27n],sellableTokens:1000n,reservedTokens:100n,realQuoteReserve:100n,feeBps:50n,creatorTaxBps:0n,getLaunchedToken:{exists:true},balanceOf:10n**24n,balanceOfToken:10n**18n,releasable:10n**18n,vestingTerms:[account,curve,1000],getMarketParams:params,verifiedMarket:params,marginAccountAddress:release.kuruEnvironment.marginAccount,orderBookImplementation:release.kuruEnvironment.orderBookImplementation,kuruAmmVaultImplementation:release.kuruEnvironment.vaultImplementation,getBalance:10n**24n,s_orders:[account,10n,0,0,0,1,0,true],s_buyPricePoints:[1,1],s_sellPricePoints:[1,1],validate:undefined,...overrides};
 const chain={getBlockNumber:async()=>77n,getCode:async()=>'0x6000',getChainId:async()=>10143,getBalance:async()=>10n**24n,estimateGas:async()=>21000n,estimateFeesPerGas:async()=>({maxFeePerGas:1n}),readContract:async(call:typeof calls[number])=>{calls.push(call);const value=values[call.functionName];return typeof value==='function'?(value as (x:typeof call)=>unknown)(call):value;},simulateContract:async()=>({result:10n**18n})} as unknown as ChainClient;
 return {chain,calls};
}
test('escrow credit reads recipient then token, matching deployed storage',async()=>{
 const {chain,calls}=mock({balanceOfToken:(call:{args:Address[]})=>call.args[0]===account&&call.args[1]===token?5n:0n});
 assert.equal((await prepareFeeClaimToken(chain,account,token)).functionName,'claimToken');assert.deepEqual(calls[0].args,[account,token]);
});
test('buyback release requires current vest beneficiary',async()=>{
 const {chain}=mock({vestingTerms:[curve,token,1000]});await assert.rejects(()=>prepareBuybackRelease(chain,token,account),/beneficiary/);
});
test('Tier A excludes wallet, completion, fee and custody; Tier B anchors same block',async()=>{
 const {chain,calls}=mock({ledger:{phase:0},receipt:{market:zeroAddress},completionQuote:[1n,2n]});const essential=await readLaunchEssential(chain,token);
 assert.ok(!calls.some(c=>['balanceOf','feeBps','completionQuote'].includes(c.functionName)));await readLaunchEconomic(chain,essential,account);assert.ok(calls.every(c=>c.blockNumber===77n));assert.equal(await readLaunchProof(chain,essential),undefined);
 const count=calls.filter(c=>c.functionName==='packet').length;await readLaunchEssential(chain,token);assert.equal(calls.filter(c=>c.functionName==='packet').length,count);
});
test('market order min output derives from fresh fee-inclusive quote',async()=>{
 const {chain,calls}=mock();const prepared=await prepareKuruMarketOrder(chain,account,{market,token,side:'buy',amountRaw:10n**18n,minOutcomeRaw:0n,slippageBps:50n});assert.deepEqual(prepared.args,[100_000_000n,995_000_000_000_000_000n,true,true]);assert.ok(calls.every(c=>c.blockNumber===77n));
});
test('registered market still must match coordinator receipt',async()=>{
 const {chain}=mock({receipt:{market:curve}});await assert.rejects(()=>prepareKuruMarketOrder(chain,account,{market,token,side:'sell',amountRaw:10n**18n,minOutcomeRaw:0n}),/verified RetroPick/);
});
test('cancel validates ownership while gone IDs use NoRevert',async()=>{
 await assert.rejects(()=>prepareKuruCancel(mock({s_orders:[curve,10n,0,0,0,1,0,true]}).chain,market,account,[1]),/another wallet/);
 assert.equal((await prepareKuruCancel(mock({s_orders:[zeroAddress,0n,0,0,0,0,0,false]}).chain,market,account,[1])).functionName,'batchCancelOrdersNoRevert');
});
test('create reads current hook policy and rejects combined hook fee',async()=>{
 const {chain,calls}=mock({launchEnabled:true,canLaunch:true,launchFee:1n,maxCreatorTaxBps:2000n,snipeTaxSeconds:0n,snipeTaxStartBps:0n,launchConfigCount:1n,CIRCLE_TEST_USDC:token,decimals:18,getConfig:{enabled:true,decimals:18,venueMask:3,policyVersion:1,phantomQuote:1n,graduationThreshold:1n,graduationQuoteCeiling:50n,policyHash:'0x01',assetId:'0x02'},getLaunchConfig:{supply:10n**27n,curveFeeBps:0n,phantomQuote:1n,graduationThreshold:1n,poolFee:0,tickSpacing:1,enabled:true},admitted:{enabled:true,decimals:18,venueMask:3,policyVersion:1,phantomQuote:1n,graduationThreshold:1n,graduationQuoteCeiling:50n,policyHash:'0x01',assetId:'0x02'},previewVenueEconomics:'0x'+'01'.repeat(32),currentFeePolicy:{hookFeeBps:1000n}});
 await assert.rejects(()=>prepareLaunchToken(chain,account,{name:'T',symbol:'TT',logo:'',description:'',socials:{},creatorTaxBps:1500n,buybackEnabled:false,launchConfigId:0n,pairToken:zeroAddress,venue:1}),/Combined hook/);assert.ok(calls.some(c=>c.functionName==='currentFeePolicy'));assert.ok(!calls.some(c=>c.functionName==='getLaunchFeePolicy'));assert.ok(calls.every(c=>c.blockNumber===77n));
});
test('same-chain send rejects zero recipient, gas overspend and false ERC20',async()=>{
 const {chain}=mock();await assert.rejects(()=>prepareTransfer(chain,account,{recipient:zeroAddress,asset:zeroAddress,amount:1n}),/nonzero/);await assert.rejects(()=>prepareTransfer(chain,account,{recipient:curve,asset:zeroAddress,amount:10n**24n}),/network gas/);chain.simulateContract=async()=>({result:false}) as never;await assert.rejects(()=>prepareTransfer(chain,account,{recipient:curve,asset:token,amount:1n}),/return success/);
});
test('unhealthy fallback is excluded; contract revert does not trip primary circuit',async()=>{
 let secondary=0;const servers=[createServer((req,res)=>{let body='';req.on('data',c=>body+=c);req.on('end',()=>{const handle=(r:{id:number;method:string})=>r.method==='eth_call'?{jsonrpc:'2.0',id:r.id,error:{code:3,message:'execution reverted'}}:{jsonrpc:'2.0',id:r.id,result:r.method==='eth_chainId'?'0x279f':'0x1'};const parsed=JSON.parse(body);res.setHeader('content-type','application/json');res.end(JSON.stringify(Array.isArray(parsed)?parsed.map(handle):handle(parsed)));});}),createServer((req,res)=>{secondary++;res.statusCode=401;res.end('Unauthorized');})];
 await Promise.all(servers.map(s=>new Promise<void>(resolve=>s.listen(0,'127.0.0.1',resolve))));
 try{const client=createChain(servers.map(s=>`http://127.0.0.1:${(s.address() as {port:number}).port}`));await client.probeProviders();assert.equal(client.rpcHealth()[1].health,'disabled');const count=secondary;await assert.rejects(()=>client.request({method:'eth_call',params:[{to:token},'latest']}));assert.equal(client.rpcHealth()[0].health,'healthy');await client.getBlockNumber({cacheTime:0});assert.equal(secondary,count);}finally{await Promise.all(servers.map(s=>new Promise<void>(resolve=>s.close(()=>resolve()))));}
});

test('nonzero stale order storage does not imply an open order after its price head advances',async()=>{
 const {chain}=mock({s_buyPricePoints:[2,2]});assert.equal((await readKuruOrder(chain,market,1,77n)).active,false);
});


test('market execution simulation enforces connected-account FOK and positive minimum', async () => {
 const {chain}=mock(); const simulations: Array<Record<string,unknown>>=[];
 chain.simulateContract=async (call:any)=>{simulations.push(call);if(call.account===account)throw Error('InsufficientLiquidity');return {result:1000n} as never;};
 await assert.rejects(()=>prepareKuruMarketOrder(chain,account,{market,token,side:'buy',amountRaw:10n**18n,minOutcomeRaw:999n}),/InsufficientLiquidity/);
 assert.equal(simulations.length,2);assert.equal(simulations[0].account,zeroAddress);assert.equal(simulations[1].account,account);assert.equal(simulations[1].blockNumber,77n);assert.equal(simulations[1].value,0n);assert.deepEqual(simulations[1].args,[100_000_000n,999n,true,true]);
});
test('market sell derives a fresh minimum and exact sell grid',async()=>{
 const {chain}=mock(); const simulations:Array<any>=[];chain.simulateContract=async(call:any)=>{simulations.push(call);return {result:10_000n} as never;};
 const prepared=await prepareKuruMarketOrder(chain,account,{market,token,side:'sell',amountRaw:10n**18n,minOutcomeRaw:9000n});assert.deepEqual(prepared.args,[100_000_000n,9950n,true,true]);assert.equal(simulations[1].account,account);
 await assert.rejects(()=>prepareKuruMarketOrder(chain,account,{market,token,side:'sell',amountRaw:1n,minOutcomeRaw:0n}),/finer/);
});
test('zero output and precision-floor minimum never produce a prepared market write',async()=>{
 for (const output of [0n,1n]) {const {chain}=mock();chain.simulateContract=async()=>({result:output}) as never;await assert.rejects(()=>prepareKuruMarketOrder(chain,account,{market,token,side:'buy',amountRaw:10n**18n,minOutcomeRaw:0n}),/liquidity|precision/);}
});
test('quote sizing rejects fractional grids and uint32 max price is rejected',()=>{
 const grid:KuruMarketParams={pricePrecision:100_000_000n,sizePrecision:100_000_000n,baseAsset:token,baseDecimals:18n,quoteAsset:zeroAddress,quoteDecimals:18n,tickSize:1n,minSize:1n,maxSize:10n**18n,takerFeeBps:30n,makerFeeBps:0n};
 assert.equal(kuruGrid.quoteToUnits(10n**18n,grid),100_000_000n);assert.throws(()=>kuruGrid.quoteToUnits(10n**18n+1n,grid),/finer/);assert.throws(()=>kuruGrid.priceToUnits((2n**32n-1n)*10n**10n,grid,'buy'),/outside/);
 assert.equal(kuruGrid.quoteToUnits(1n,{...grid,quoteDecimals:6n}),100n);
});
test('release admits both current recipients but rejects empty vest and old creator',async()=>{
 assert.equal((await prepareBuybackRelease(mock({vestingTerms:[curve,account,1000]}).chain,token,account)).functionName,'release');await assert.rejects(()=>prepareBuybackRelease(mock({releasable:0n}).chain,token,account),/Nothing/);await assert.rejects(()=>prepareFeeClaimToken(mock({balanceOfToken:0n}).chain,account,token),/No claimable/);
});
test('execution transfer rechecks chain, gas, false return and descriptor integrity',async()=>{
 const {chain}=mock();const prepared=await prepareTransfer(chain,account,{recipient:curve,asset:zeroAddress,amount:1n});chain.getChainId=async()=>1;await assert.rejects(()=>simulateTransfer(chain,prepared),/Monad Testnet/);
 chain.getChainId=async()=>10143;chain.getBalance=async()=>1n;await assert.rejects(()=>simulateTransfer(chain,prepared),/network gas/);chain.getBalance=async()=>10n**24n;await assert.rejects(()=>simulateTransfer(chain,{...prepared,to:token}),/descriptor/);
 chain.simulateContract=async()=>({result:true}) as never;const erc20=await prepareTransfer(chain,account,{recipient:curve,asset:token,amount:1n});chain.simulateContract=async()=>({result:false}) as never;await assert.rejects(()=>simulateTransfer(chain,erc20),/return success/);
});

test('voluntary handoff verifies current recipient and active owner override at one block',async()=>{
 const {prepareTransferCreatorFeeRecipient}=await import('../src/prepare.ts');
 const setup=(overrides:Record<string,unknown>={})=>{
  const value=mock({getLaunchedToken:{exists:true,deployer:curve,creatorFeeRecipient:account},pendingCreatorFeeRecipient:[zeroAddress,0n,0n],...overrides});
  (value.chain as unknown as {getBlock:()=>Promise<{timestamp:bigint}>}).getBlock=async()=>({timestamp:100n});return value;
 };
 const {chain,calls}=setup();const p=await prepareTransferCreatorFeeRecipient(chain,token,account,market);
 assert.equal(p.functionName,'transferCreatorFeeRecipient');assert.deepEqual(p.args,[token,market]);assert.ok(p.checks.some(check=>check.includes('escrowed credits stay')));assert.ok(calls.every(call=>call.blockNumber===77n));
 await assert.rejects(()=>prepareTransferCreatorFeeRecipient(setup({getLaunchedToken:{exists:true,deployer:account,creatorFeeRecipient:curve}}).chain,token,account,market),/Only the current/);
 await assert.rejects(()=>prepareTransferCreatorFeeRecipient(setup({pendingCreatorFeeRecipient:[market,200n,300n]}).chain,token,account,market),/pending owner/);
 assert.equal((await prepareTransferCreatorFeeRecipient(setup({pendingCreatorFeeRecipient:[market,10n,99n]}).chain,token,account,market)).functionName,'transferCreatorFeeRecipient');
 await assert.rejects(()=>prepareTransferCreatorFeeRecipient(chain,token,account,account),/equals/);
});

test('ERC20 Kuru enrichment binds the committed quote and reads that asset margin balance',async()=>{
 const {readKuru}=await import('../src/kuru.ts');
 const ercParams=[...params];ercParams[4]=curve as never;ercParams[5]=6 as never;
 const {chain,calls}=mock({getMarketParams:ercParams,verifiedMarket:ercParams,getVaultParams:[curve]});
 const state=await readKuru(chain,market,token,curve,account,{includeBook:false,quoteAsset:curve});
 assert.equal(state.params[4],curve);assert(calls.some(c=>c.functionName==='getBalance'&&c.args?.[1]===curve));
 await assert.rejects(readKuru(chain,market,token,curve,account,{includeBook:false,freshIdentity:true}),/identity/);
});

test('changed reviewed economics cannot prepare a signing request',async()=>{
 const {chain}=mock({launchEnabled:true,canLaunch:true,launchFee:1n,maxCreatorTaxBps:2000n,snipeTaxSeconds:0n,snipeTaxStartBps:0n,launchConfigCount:0n,CIRCLE_TEST_USDC:token,decimals:18,getConfig:{enabled:false},previewVenueEconomics:'0x'+'01'.repeat(32),currentFeePolicy:{hookFeeBps:100}});
 await assert.rejects(prepareLaunchToken(chain,account,{name:'T',symbol:'TT',logo:'',description:'',socials:{},creatorTaxBps:0n,buybackEnabled:false,launchConfigId:0n,pairToken:zeroAddress,venue:1,expectedEconomics:('0x'+'02'.repeat(32)) as `0x${string}`}),/economics changed/);
});
