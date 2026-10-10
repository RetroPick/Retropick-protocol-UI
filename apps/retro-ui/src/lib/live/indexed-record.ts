import type { IndexEnvelope, IndexedTrade, IndexedOrder } from '@retropick/launchpad-sdk/read-model';
export interface RecordIdentity { kind:'trade'|'order';token:string;hash:string;owner?:string|null }
export interface IndexedMatch { matched:boolean;reorgRevision:number|null;indexedBlockHash:string|null;pages:number;bounded:boolean }
/** Read at most five pages of one immutable projection. A changed/failed snapshot is unknown, never a match. */
export async function findIndexedRecord(identity:RecordIdentity,read:(cursor?:string)=>Promise<IndexEnvelope<Array<IndexedTrade|IndexedOrder>>>,signal?:AbortSignal,maxPages=5):Promise<IndexedMatch> {
 const pending:IndexedMatch={matched:false,reorgRevision:null,indexedBlockHash:null,pages:0,bounded:false};
 if(!/^0x[\da-f]{40}$/i.test(identity.token)||!/^0x[\da-f]{64}$/i.test(identity.hash)||!Number.isInteger(maxPages)||maxPages<1||maxPages>10)return pending;
 let cursor:string|undefined,anchor:string|undefined;const visited=new Set<string>();
 for(let i=0;i<maxPages;i++){
  signal?.throwIfAborted();const page=await read(cursor);signal?.throwIfAborted();
  const f=page.freshness,version=JSON.stringify([f.projectionVersion,f.reorgRevision,f.indexedBlockHash,f.indexedBlock]);
  if(f.chainId!==10143||f.source!=='MONAD_EVENT_INDEXER'||f.error||!Array.isArray(page.data)||(anchor!==undefined&&version!==anchor))return {...pending,pages:i+1};
  anchor=version;
  const matched=page.data.some(row=>row.token.toLowerCase()===identity.token.toLowerCase()&&row.transactionHash.toLowerCase()===identity.hash.toLowerCase()&&(identity.kind==='trade'?'actor'in row&&(!identity.owner||row.actor.toLowerCase()===identity.owner.toLowerCase()):'owner'in row&&(!identity.owner||row.owner.toLowerCase()===identity.owner.toLowerCase())));
  if(matched)return {matched:true,reorgRevision:f.reorgRevision??null,indexedBlockHash:f.indexedBlockHash??null,pages:i+1,bounded:false};
  if(!page.nextCursor)return {...pending,pages:i+1};
  if(visited.has(page.nextCursor))return {...pending,pages:i+1,bounded:true};
  visited.add(page.nextCursor);cursor=page.nextCursor;
 }
 return {...pending,pages:maxPages,bounded:true};
}
