import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createPublicClient, http, type Address } from 'viem';
import { monadTestnet } from 'viem/chains';
import { createReferralApp } from './app.ts';
import { ReferralAuth } from './auth.ts';
import { ReferralStore } from './store.ts';
import { AttributionSync } from './sync.ts';
import { acquireReferralDbLock } from './lock.ts';

const origin=process.env.REFERRAL_ORIGIN??'http://127.0.0.1:3000';
const production=process.env.NODE_ENV==='production';
if(production && !origin.startsWith('https://'))throw Error('Production REFERRAL_ORIGIN requires HTTPS');
const db=resolve(process.env.REFERRAL_DB??'.data/referral-attribution.sqlite');mkdirSync(dirname(db),{recursive:true});
const releaseLock=acquireReferralDbLock(db);
process.on('exit',releaseLock);
const store=new ReferralStore(db);
const client=createPublicClient({chain:monadTestnet,transport:http(process.env.REFERRAL_RPC_URL??'https://testnet-rpc.monad.xyz',{timeout:5000,retryCount:1})});
if(await client.getChainId()!==10143)throw Error('Referral service requires Monad Testnet chain 10143');
const auth=new ReferralAuth(store,origin,(wallet,message,signature)=>client.verifyMessage({address:wallet as Address,message,signature}),()=>client.getBlockNumber({cacheTime:0}).then(Number));
const authByOrigin=new Map<string,ReferralAuth>();
for(const allowed of (process.env.REFERRAL_ORIGINS??origin).split(',').map(value=>value.trim()).filter(Boolean)) {
  if(production&&!allowed.startsWith('https://'))throw Error('Production REFERRAL_ORIGINS requires HTTPS');
  const scoped=new ReferralAuth(store,allowed,(wallet,message,signature)=>client.verifyMessage({address:wallet as Address,message,signature}),()=>client.getBlockNumber({cacheTime:0}).then(Number));
  authByOrigin.set(scoped.origin,scoped);
}
const sync=new AttributionSync(store,process.env.REFERRAL_INDEXER_URL??'http://127.0.0.1:8787');
const server=createReferralApp({store,auth,authByOrigin,sync,secure:production||origin.startsWith('https://')});
const port=Number(process.env.REFERRAL_PORT??8788);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid REFERRAL_PORT');
server.listen(port,'127.0.0.1',()=>console.log('Referral attribution service listening on',port));
const timer=setInterval(()=>void sync.sync(),15000);void sync.sync();
const stop=()=>{clearInterval(timer);server.close(()=>{store.close();process.exit(0);});};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
