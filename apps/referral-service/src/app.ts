import { createServer, type IncomingMessage } from 'node:http';
import { ApiError, SESSION_MS } from './model.ts';
import { ReferralAuth } from './auth.ts';
import { ReferralStore } from './store.ts';
import type { AttributionSync } from './sync.ts';

const COOKIE='rp_referral_session';
const PREFIX='/api/referrals';
function sessionToken(req: IncomingMessage) {
  const token=(req.headers.cookie??'').split(';').map(v=>v.trim()).find(v=>v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);
  return token&&/^[\da-f]{64}$/.test(token)?token:null;
}
async function body(req: IncomingMessage): Promise<Record<string,unknown>> {
  if(req.headers['content-type']?.split(';')[0]!=='application/json')throw new ApiError(415,'JSON_REQUIRED');
  let bytes=0;const parts:Buffer[]=[];
  for await(const chunk of req){const part=Buffer.from(chunk);bytes+=part.length;if(bytes>16384)throw new ApiError(413,'REQUEST_TOO_LARGE');parts.push(part);}
  try {const value=JSON.parse(Buffer.concat(parts).toString('utf8')) as unknown;if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value as Record<string,unknown>;}
  catch{throw new ApiError(400,'INVALID_JSON');}
}
function fields(value: Record<string,unknown>, allowed: string[]) {
  if(Object.keys(value).some(k=>!allowed.includes(k)))throw new ApiError(400,'INVALID_PARAMETERS');
}

export function createReferralApp({store,auth,authByOrigin,sync,secure=false,clock=Date.now}:{store:ReferralStore;auth:ReferralAuth;authByOrigin?:ReadonlyMap<string,ReferralAuth>;sync?:AttributionSync;secure?:boolean;clock?:()=>number}) {
  const rates=new Map<string,{count:number;until:number}>();
  const cookie=(token:string,clear=false)=>`${COOKIE}=${token}; Path=${PREFIX}; HttpOnly; SameSite=Strict; Max-Age=${clear?0:SESSION_MS/1000}${secure?'; Secure':''}`;
  return createServer(async(req,res)=>{
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    const send=(status:number,value:unknown)=>{res.statusCode=status;res.end(JSON.stringify(value));};
    try {
      const requestUrl=new URL(req.url??'/',auth.origin);const path=requestUrl.pathname;
      if(requestUrl.search)throw new ApiError(400,'INVALID_PARAMETERS');
      if(path===`${PREFIX}/health` && req.method==='GET'){send(200,{chainId:10143,attributionOnly:true,earningsEnabled:false,syncError:sync?.error??null});return;}
      if(![`${PREFIX}/challenge`,`${PREFIX}/verify`,`${PREFIX}/logout`,`${PREFIX}/summary`].includes(path))throw new ApiError(404,'NOT_FOUND');
      const expectedMethod=path.endsWith('/summary')?'GET':'POST';
      if(req.method!==expectedMethod)throw new ApiError(405,'METHOD_NOT_ALLOWED');
      const origin=req.headers.origin;
      const requestAuth=origin===undefined?auth:(origin===auth.origin?auth:authByOrigin?.get(origin));
      if((expectedMethod==='POST' && origin===undefined)||!requestAuth)throw new ApiError(403,'INVALID_ORIGIN');
      const now=clock();const rateKey=req.socket.remoteAddress??'unknown';let rate=rates.get(rateKey);
      if(!rate||rate.until<=now){rate={count:0,until:now+60000};rates.set(rateKey,rate);}
      if(++rate.count>60)throw new ApiError(429,'RATE_LIMITED');
      if(rates.size>1000)for(const[key,value]of rates)if(value.until<=now)rates.delete(key);
      store.cleanup(now);
      if(path.endsWith('/challenge')){
        const input=await body(req);fields(input,['wallet','referrer','firstSeenAt']);
        const c=requestAuth.challenge({wallet:input.wallet,referrer:input.referrer,firstSeenAt:input.firstSeenAt});
        send(200,{challengeId:c.id,message:c.message,expiresAt:new Date(c.expiresAt).toISOString(),chainId:10143});return;
      }
      if(path.endsWith('/verify')){
        const input=await body(req);fields(input,['challengeId','signature']);
        const result=await requestAuth.verify({challengeId:input.challengeId,signature:input.signature});
        const previous=sessionToken(req);if(previous)store.logout(previous);
        res.setHeader('Set-Cookie',cookie(result.token));send(200,{wallet:result.wallet,earningsEnabled:false});return;
      }
      const token=sessionToken(req);
      if(path.endsWith('/logout')){if(token)store.logout(token);res.setHeader('Set-Cookie',cookie('',true));send(200,{loggedOut:true});return;}
      const wallet=token?store.session(token,now):null;
      if(!wallet)throw new ApiError(401,'AUTHENTICATION_REQUIRED');
      send(200,{...store.summary(wallet),syncError:sync?.error??null});
    }catch(cause){send(cause instanceof ApiError?cause.status:503,{error:cause instanceof ApiError?cause.code:'SERVICE_UNAVAILABLE'});}
  });
}
