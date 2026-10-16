#!/usr/bin/env node
/** Reuse the production indexer engine for bounded offline projection-3 catch-up.
 *
 * Requires a database copied by SQLite backup. Never resets checkpoints and never starts
 * the HTTP server. Each invocation advances a fixed target by at most maxBlocksPerPass
 * per vault, so interruptions can safely resume from durable per-vault cursors.
 */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {addresses} from '@retropick/launchpad-sdk/chain';
import {Store} from '../src/store.ts';
import {Indexer} from '../src/sync.ts';
import {project} from '../src/project.ts';
import {rpcEndpoints} from '../src/server.ts';
import {kuruVaultAbi} from '@retropick/launchpad-sdk/abis/kuruVaultAbi';
import {decodeEventLog} from 'viem';

const args=new Map(process.argv.slice(2).map((value,index,all)=>value.startsWith('--')?[value.slice(2),all[index+1]]:[null,null]));
const db=args.get('db'), output=args.get('output'), target=Number(args.get('target') ?? 0), maxBlocks=Number(args.get('max-blocks') ?? 20000);
assert.ok(db && output && Number.isSafeInteger(target) && target>0 && Number.isSafeInteger(maxBlocks) && maxBlocks>0,'Usage: liquidity-full-catchup.mjs --db BACKUP --output REPORT.json --target BLOCK [--max-blocks N]');
assert.ok(!db.endsWith('/monad-testnet.sqlite') && !resolve(db).startsWith(resolve('..','..','apps','indexer','.data')),'Pass an offline SQLite backup, not the live database.');
const urls=rpcEndpoints({...process.env,MONAD_TESTNET_RPC_URLS:process.env.MONAD_TESTNET_RPC_URLS ?? process.env.MONAD_TESTNET_RPC_URL ?? 'https://testnet-rpc.monad.xyz'});
const store=new Store(resolve(db));
const snapshotBefore=store.get('snapshot');
assert.equal(snapshotBefore?.projectionVersion,2,'Offline backup must start at projection 2');
const indexer=new Indexer(store,urls,8,maxBlocks);
const originalLiquidity=indexer.liquidity.bind(indexer);
indexer.liquidity=async (seeds,catchupTarget)=>{
  const qualified=await originalLiquidity(seeds,catchupTarget,{scan:false});
  const active=qualified.map(pool=>({pool,vaultStage:indexer.vaultStage(pool.vault)}));
  const cursors=new Map(active.map(({vaultStage})=>[vaultStage,store.cursor(vaultStage,0)]));
  const vaultEvents=kuruVaultAbi.filter(e=>e.type==='event');
  const earliest=Math.min(...active.map(({pool,vaultStage})=>Math.max(pool.graduationBlock,cursors.get(vaultStage)+1)));
  for(let from=earliest;from<=catchupTarget;from+=100){
    const to=Math.min(catchupTarget,from+99);
    const addresses=active.filter(({pool,vaultStage})=>pool.graduationBlock<=to&&cursors.get(vaultStage)<to).map(({pool})=>pool.vault);
    if(!addresses.length)continue;
    const logs=await indexer.client.getLogs({address:addresses,events:vaultEvents,fromBlock:BigInt(from),toBlock:BigInt(to)});
    const grouped=new Map(active.map(({vaultStage})=>[vaultStage,[]]));
    for(const log of logs){
      const row=active.find(({pool})=>pool.vault.toLowerCase()===log.address.toLowerCase());
      if(!row)throw Error('Unexpected grouped vault emitter');
      const decoded=decodeEventLog({abi:vaultEvents,data:log.data,topics:log.topics});
      const header=await indexer.header(Number(log.blockNumber));
      if(log.blockHash?.toLowerCase()!==header.hash.toLowerCase())throw Error('Log block mismatch');
      grouped.get(row.vaultStage).push({id:`10143:${log.blockHash}:${log.transactionHash}:${log.logIndex}`,chainId:10143,address:row.pool.vault,name:decoded.eventName,args:{...decoded.args,value:decoded.args.value ?? decoded.args.amount},block:Number(log.blockNumber),blockHash:log.blockHash,transactionHash:log.transactionHash,transactionIndex:log.transactionIndex,logIndex:log.logIndex,timestamp:header.timestamp});
    }
    const hash=(await indexer.header(to)).hash;
    for(const [vaultStage,events] of grouped){
      const pool=active.find(row=>row.vaultStage===vaultStage)?.pool;
      if(!pool||cursors.get(vaultStage)>=to||pool.graduationBlock>to)continue;
      store.commit(vaultStage,to,hash,events);
      cursors.set(vaultStage,to);
    }
  }
  return active.map(({pool,vaultStage})=>({...pool,historyIndexedBlock:store.cursor(vaultStage,pool.graduationBlock),historyComplete:store.cursor(vaultStage,pool.graduationBlock)>=catchupTarget}));
};
const startedAt=Date.now();
let seeds=[];
let pools=[];
let failure=null;
try {
  // Scan root at the pinned target before discovery so Coordinator event and ledger state
  // describe the same chain snapshot (new graduations may exist after the V2 backup).
  await indexer.scan('root',target,[addresses.factory,addresses.coordinator]);
  const originalDiscover=indexer.discover.bind(indexer);
  const originalEvents=indexer.store.events.bind(indexer.store);
  indexer.store.events=(stage,untilTarget)=>{
    const events=originalEvents(stage,untilTarget);
    return Object.defineProperties(events.filter(event=>event.block<=target),{
      [Symbol.species]:{value:Array,configurable:true},
      __qualificationTarget:{value:target,configurable:true}
    });
  };
  seeds=await indexer.discover(target);
  pools=await indexer.liquidity(seeds,target);
} catch(error) { failure=error instanceof Error?error.message:String(error); }
const targetHeader=await indexer.header(target,true).catch(error=>{throw Error(`Target block unavailable: ${error.message}`);});
const beforeStages=['root','dynamic','beneficiary'].map(stage=>[stage,store.cursor(stage,0)]);
const rows=[];
for(const pool of pools) {
  const stage=indexer.vaultStage(pool.vault);
  const events=store.events(stage);
  const balances=new Map();
  for(const event of events) {
    if(event.name!=='Transfer')continue;
    const value=BigInt(String(event.args.value ?? event.args.amount ?? 0));
    for(const [wallet,sign] of [[String(event.args.from).toLowerCase(),-1n],[String(event.args.to).toLowerCase(),1n]]) {
      if(wallet==='0x0000000000000000000000000000000000000000')continue;
      balances.set(wallet,(balances.get(wallet) ?? 0n)+sign*value);
    }
  }
  const derived=[...balances.values()].reduce((sum,value)=>sum+value,0n);
  rows.push({
    token:pool.token,market:pool.market,vault:pool.vault,lpLock:pool.lpLock,graduationBlock:pool.graduationBlock,
    targetBlock:target,lastScannedBlock:pool.historyIndexedBlock,blocksRemaining:Math.max(0,target-pool.historyIndexedBlock),
    cursor:store.cursor(stage,pool.graduationBlock),cursorHash:store.checkpoints(stage).at(-1)?.hash ?? null,
    eventsIndexed:events.length,historyComplete:pool.historyComplete,status:pool.status,
    baseAssetsRaw:pool.baseAssetsRaw,quoteAssetsRaw:pool.quoteAssetsRaw,observedTotalSharesRaw:pool.totalSharesRaw,
    derivedTotalSharesRaw:derived.toString(),supplyReconciliation:pool.totalSharesRaw===derived.toString()?'PASS':'FAIL',
    balances:[...balances].sort((a,b)=>a[1]>b[1]?-1:a[1]<b[1]?1:a[0].localeCompare(b[0])).map(([wallet,sharesRaw])=>({wallet,sharesRaw:sharesRaw.toString()}))
  });
}
let projection=null;
try {
  // Project all persisted events bounded by the explicit target; this validates reconciliation
  // without publishing an offline snapshot.
  projection=project(store.events().filter(event=>event.block<=target),seeds,targetHeader.timestamp,{liquidityPools:pools});
} catch(error) { failure ??=error instanceof Error?error.message:String(error); }
const snapshotAfter=store.get('snapshot');
const result={
  startedAt:new Date(startedAt).toISOString(),finishedAt:new Date().toISOString(),database:resolve(db),
  rpcEndpoints:urls.map(url=>new URL(url).host),targetBlock:target,targetHash:targetHeader.hash,
  maxBlocksPerVault:maxBlocks,projection2SnapshotPreserved:snapshotAfter?.projectionVersion===2,
  originalStagesBeforeRun:beforeStages,discoveredLaunches:seeds.length,discoveredPools:pools.length,failure,
  allVaultsComplete:rows.length>0&&rows.every(row=>row.historyComplete),supplyReconciliation:rows.length>0&&rows.every(row=>row.supplyReconciliation==='PASS')?'PASS':'FAIL',
  projectionLiquidityEventCount:projection?.liquidityEvents.length ?? null,projectionLPPositionCount:projection?.lpPositions.length ?? null,
  pools:rows
};
const file=resolve(output);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,JSON.stringify(result,(_,value)=>typeof value==='bigint'?value.toString():value,2)+'\n');
console.log(JSON.stringify({...result,pools:rows.map(({token,vault,historyComplete,blocksRemaining,supplyReconciliation})=>({token,vault,historyComplete,blocksRemaining,supplyReconciliation}))},null,2));
if(failure||!result.allVaultsComplete||result.supplyReconciliation!=='PASS')process.exitCode=2;
store.close();
