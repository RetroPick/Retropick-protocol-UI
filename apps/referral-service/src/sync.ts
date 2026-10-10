import { ApiError, CHAIN_ID, validateEvent, type ActivityEnvelope, type QualifyingEvent } from './model.ts';
import { ReferralStore } from './store.ts';

export class AttributionSync {
  private running=false;
  error: string | null=null;
  private store: ReferralStore;
  private indexerUrl: string;
  private request: typeof fetch;
  constructor(store: ReferralStore, indexerUrl: string, request: typeof fetch=fetch) {this.store=store;this.indexerUrl=indexerUrl;this.request=request;}
  async sync() {
    if(this.running)return;
    const earliest=this.store.earliestAssociationBlock();if(earliest===null)return;
    this.running=true;
    try {
      const prior=this.store.freshness();let from=prior?Math.max(earliest,prior.indexedBlock-512):earliest;
      let envelope=await this.page(from);
      if(prior && (prior.reorgRevision!==envelope.freshness.reorgRevision || envelope.freshness.indexedBlock<prior.indexedBlock)) {
        from=earliest;envelope=await this.page(from);
      }
      const to=envelope.data.canonicalToBlock;
      // Association can be newer than the indexer's confirmation buffer.
      if(to<from){this.store.reconcile(from,to,[],envelope.freshness);this.error=null;return;}
      const events: QualifyingEvent[]=[]; const seen=new Set<string>(); const seenLogs=new Set<string>();
      let pages=0; const first=envelope.freshness;
      while(true) {
        if(++pages>10000 || envelope.data.canonicalFromBlock!==from || envelope.data.canonicalToBlock!==to
          || envelope.freshness.projectionVersion!==first.projectionVersion || envelope.freshness.reorgRevision!==first.reorgRevision
          || envelope.freshness.indexedBlockHash!==first.indexedBlockHash)throw new ApiError(502,'INCONSISTENT_INDEXER_WINDOW');
        for(const value of envelope.data.events) {
          const e=validateEvent(value);const log=`${e.txHash}:${e.logIndex}`;
          if(e.blockNumber<from||e.blockNumber>to||seen.has(e.id)||seenLogs.has(log))throw new ApiError(502,'INVALID_INDEXER_WINDOW');
          seen.add(e.id);seenLogs.add(log);events.push(e);
        }
        if(!envelope.data.nextCursor)break;
        envelope=await this.page(from,to,envelope.data.nextCursor);
      }
      this.store.reconcile(from,to,events,first);this.error=null;
    } catch(cause) { this.error=cause instanceof ApiError?cause.code:'ATTRIBUTION_SYNC_UNAVAILABLE'; }
    finally {this.running=false;}
  }
  private async page(from: number,to?: number,cursor?: string): Promise<ActivityEnvelope> {
    const url=new URL('/v1/activity',this.indexerUrl);url.searchParams.set('fromBlock',String(from));url.searchParams.set('limit','100');
    if(to!==undefined)url.searchParams.set('toBlock',String(to));if(cursor)url.searchParams.set('cursor',cursor);
    const response=await this.request(url,{signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new ApiError(502,response.status===409?'CURSOR_EXPIRED':'INDEXER_UNAVAILABLE');
    const envelope=await response.json() as ActivityEnvelope;
    const f=envelope.freshness;
    if(!f||f.chainId!==CHAIN_ID||f.source!=='MONAD_EVENT_INDEXER'||f.error||!Number.isSafeInteger(f.indexedBlock)||!Number.isSafeInteger(f.headBlock)
      ||!Number.isSafeInteger(f.confirmations)||f.confirmations<1||f.indexedBlock>f.headBlock-f.confirmations
      ||!Number.isSafeInteger(f.reorgRevision)||!Number.isSafeInteger(f.projectionVersion)||!/^0x[\da-fA-F]{64}$/.test(f.indexedBlockHash)
      ||!envelope.data||!Array.isArray(envelope.data.events)||!Number.isSafeInteger(envelope.data.canonicalFromBlock)||!Number.isSafeInteger(envelope.data.canonicalToBlock)
      ||envelope.data.canonicalToBlock>f.indexedBlock||(envelope.data.nextCursor!==null&&typeof envelope.data.nextCursor!=='string'))throw new ApiError(502,'UNCONFIRMED_INDEXER_WINDOW');
    return envelope;
  }
}
