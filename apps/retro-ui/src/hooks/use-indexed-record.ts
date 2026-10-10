import { useQuery } from '@tanstack/react-query';
import { INDEXER_URL } from '@/lib/live/env';
import { fetchTrades, queryPath, request } from '@/lib/live/indexer-client';
import { findIndexedRecord, type IndexedMatch } from '@/lib/live/indexed-record';
import { launchKeys } from '@/lib/live/queries';
import type { IndexedOrder } from '@retropick/launchpad-sdk/read-model';
/** Exact scoped identity lookup; rechecks canonical history after matching so reorgs can revoke it. */
export function useIndexedRecord(kind:'trade'|'order'|null,token:string|null,hash:string|null,owner?:string|null):'idle'|'pending'|'indexed' {
 const enabled=!!INDEXER_URL&&!!kind&&!!token&&!!hash;
 const query=useQuery<IndexedMatch>({queryKey:[...launchKeys.all,'indexed-record',kind,token?.toLowerCase(),hash?.toLowerCase(),owner?.toLowerCase()??''],enabled,retry:false,staleTime:0,
  refetchInterval:q=>q.state.data?.matched?10000:2500,
  queryFn:({signal})=>findIndexedRecord({kind:kind!,token:token!,hash:hash!,owner},cursor=>kind==='trade'
   ?fetchTrades(INDEXER_URL!,token!,{limit:100,transactionHash:hash!,cursor},signal)
   :request<IndexedOrder[]>(INDEXER_URL!,queryPath(`/v1/launches/${token}/orders`,{owner:owner??undefined,status:'all',limit:100,transactionHash:hash!,cursor}),signal),signal),
 });
 return !enabled?'idle':query.data?.matched&&!query.isError?'indexed':'pending';
}
