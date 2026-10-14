import { useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Address } from 'viem';
import { readLaunchEssential, readLaunchEconomic, readLaunchProof, type EssentialLaunch, type LiveLaunch } from '@retropick/launchpad-sdk/model';
import { errorText } from '@retropick/launchpad-sdk/chain';
import { readKuru, type KuruState } from '@retropick/launchpad-sdk/kuru';
import { fetchLaunch, fetchTrades, fetchCandles, isStale, type IndexedLaunch, type IndexedTrade, type IndexedCandle, type IndexFreshness } from '@/lib/live/indexer-client';
import { INDEXER_URL } from '@/lib/live/env';
import { publicClient } from '@/lib/live/public-client';
import { queryClient, launchKeys, type LaunchSeed } from '@/lib/live/queries';
import { markStage, measureStage } from '@/lib/live/performance';
export type LaunchDetailStatus = 'loading' | 'ready' | 'stale' | 'partial' | 'unavailable';
export interface DetailOptions { resolution?: string; range?: string; proofEnabled?: boolean }
export interface LaunchDetail {
 indexed: IndexedLaunch | null; freshness: IndexFreshness | null; essential: EssentialLaunch | null;
 launch: LiveLaunch | null; seed: LaunchSeed | null; readyToGraduate: boolean; kuru: KuruState | null;
 proof: Awaited<ReturnType<typeof readLaunchProof>> | null; trades: IndexedTrade[]; candles: IndexedCandle[];
 essentialError: string | null; economicError: string | null; essentialStatus: 'loading' | 'ready' | 'error'; economicStatus: 'loading' | 'ready' | 'error'; economicFresh: boolean; status: LaunchDetailStatus; error: string | null; pendingConfirmation: boolean; reload: () => void;
}
export function useLaunchDetail(token: string | null, account?: Address, options: DetailOptions = {}): LaunchDetail {
 const address=(token??'').toLowerCase() as Address;
 const valid=/^0x[0-9a-f]{40}$/.test(address);
 const seedQuery=useQuery({queryKey:launchKeys.seed(address),queryFn:()=>queryClient.getQueryData<LaunchSeed>(launchKeys.seed(address))??null,enabled:false,staleTime:Infinity,structuralSharing:false});
 const seed=seedQuery.data??null;
 const health=useQuery({queryKey:[...launchKeys.all,'health'],enabled:valid&&!!seed&&!!INDEXER_URL,queryFn:async({signal})=>{const r=await fetch(INDEXER_URL+'/health',{signal});if(!r.ok)throw Error('Indexer unavailable');return r.json() as Promise<{freshness:IndexFreshness}>;},refetchInterval:3000});
 const canIndex=valid&&!!INDEXER_URL&&(!seed||!!health.data&&BigInt(health.data.freshness.indexedBlock)>=seed.receiptBlock);
 const indexed=useQuery({queryKey:launchKeys.indexed(address),enabled:canIndex,queryFn:({signal})=>fetchLaunch(INDEXER_URL!,address,signal),staleTime:3000,refetchInterval:10000});
 const essential=useQuery({queryKey:launchKeys.essential(address),enabled:valid,queryFn:async()=>{const finish=measureStage('detail:essential');const value=await readLaunchEssential(publicClient,address);finish();return value;},staleTime:5000,refetchInterval:10000,structuralSharing:false});
 const current=essential.data;
 const economic=useQuery({
  queryKey:[...launchKeys.economic(address,account)],enabled:valid&&!!current,
  queryFn:async()=>{const finish=measureStage('detail:economic');const launch=await readLaunchEconomic(publicClient,current!,account);finish();return{launch,account:account?.toLowerCase()??null};},
  staleTime:5000,refetchInterval:10000,gcTime:30000,structuralSharing:false,
  placeholderData:(previous)=>previous?.account===(account?.toLowerCase()??null)&&previous.launch.token.toLowerCase()===address?previous:undefined,
 });
 useEffect(()=>{if(economic.data)markStage('detail:trade-interactive');},[economic.data]);
 const graduated=current?.ledger.phase===2;
 const kuru=useQuery({
  queryKey:launchKeys.resource(address,'kuru-quotes',{account:account??''}),enabled:valid&&!!graduated,
  queryFn:()=>readKuru(publicClient,current!.receipt.market,address,current!.receipt.vault,account,{includeBook:false,includeBalances:false,quoteAsset:current!.packet.quoteAsset}),
  staleTime:5000,refetchInterval:10000,structuralSharing:false,
 });
 const proof=useQuery({queryKey:launchKeys.resource(address,'proof'),enabled:valid&&!!current&&!!options.proofEnabled,queryFn:()=>readLaunchProof(publicClient,current!),staleTime:60000,structuralSharing:false});
 const candleParams={resolution:options.resolution??'5m',range:options.range??'24h'};
 const candles=useQuery({queryKey:launchKeys.resource(address,'candles',candleParams),enabled:canIndex,queryFn:({signal})=>fetchCandles(INDEXER_URL!,address,candleParams,signal),staleTime:3000,refetchInterval:10000});
 const trades=useQuery({queryKey:launchKeys.resource(address,'trades'),enabled:canIndex,queryFn:({signal})=>fetchTrades(INDEXER_URL!,address,{},signal),staleTime:3000,refetchInterval:10000});
 useEffect(()=>{if(indexed.data||current||seed)markStage('detail:content');},[indexed.data,current,seed]);
 const reload=useCallback(()=>{void queryClient.invalidateQueries({queryKey:launchKeys.all});},[]);
 const hasContent=!!(indexed.data||current||seed);
 const status:LaunchDetailStatus=!valid?'unavailable':!hasContent?(essential.isError&&indexed.isError?'unavailable':'loading'):indexed.data&&isStale(indexed.data.freshness)?'stale':essential.isError||economic.isError||indexed.isError?'partial':'ready';
 const error=essential.error??economic.error??kuru.error??indexed.error;
 return{indexed:indexed.data?.data??null,freshness:indexed.data?.freshness??null,essential:current??null,launch:economic.data?.launch??null,seed,
  readyToGraduate:current?.ledger.phase===0&&current.remaining===0n,kuru:kuru.data??null,proof:proof.data??null,
  essentialError:essential.error?errorText(essential.error):null,economicError:economic.error?errorText(economic.error):null,essentialStatus:essential.isError?'error':current?'ready':'loading',economicStatus:economic.isError?'error':economic.data?'ready':'loading',economicFresh:!!economic.data&&!economic.isError&&!economic.isPlaceholderData&&Date.now()-economic.dataUpdatedAt<20000&&!essential.isError&&economic.data.launch.ledger.phase===current?.ledger.phase,
  trades:trades.data?.data??[],candles:candles.data?.data??[],status,error:error?errorText(error):null,
  pendingConfirmation:!!seed&&!indexed.data,reload};
}
