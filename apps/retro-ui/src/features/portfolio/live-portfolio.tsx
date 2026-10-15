'use client';
// Live portfolio: wallet + Kuru margin balances, token positions and open orders.
// Same chain/indexer reads and prepared writes as before; presented with the Earn hub chrome.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatUnits, zeroAddress, type Address } from 'viem';
import { ArrowDownToLine, Ban, Wallet } from 'lucide-react';
import { useWallet } from '@/wallet/provider';
import { publicClient } from '@/lib/live/public-client';
import { launchKeys } from '@/lib/live/queries';
import { fetchWalletState } from '@/services/wallet-state';
import { fetchLaunch } from '@/lib/live/indexer-client';
import { INDEXER_URL } from '@/lib/live/env';
import { resolveMediaSrc } from '@/lib/media/resolve';
import { TokenImage } from '@/components/product/token-image';
import { executePreparedWrite, type TxPhase } from '@/services/tx-pipeline';
import { prepareKuruCancel, prepareMarginWithdraw } from '@retropick/launchpad-sdk/prepare';
import Link from '@/components/product/safe-link';
import { ErrorState, SkeletonLine } from '@/components/trading/primitives';
import { MonoAmount, Reveal } from '@/features/earn/amount';

const MON_GLYPH = { color: '#836ef9', background: '#836ef91f' };
const TOKEN_GLYPH = { color: '#5feddf', background: '#5feddf1f' };

export function LivePortfolio() {
 const wallet=useWallet(),account=wallet.account;
 const state=useQuery({queryKey:launchKeys.wallet(account??'disconnected','state'),enabled:!!account,queryFn:({signal})=>fetchWalletState(account!,signal),refetchInterval:10_000,structuralSharing:false});
 const [tx,setTx]=useState<TxPhase|{kind:'idle'}>({kind:'idle'}),[error,setError]=useState('');
 const busy=!['idle','failed','success'].includes(tx.kind),data=state.data;
 // Token-position logos: wallet-asset rows carry no artwork, so join each held launch with its
 // indexed logo (same source the discovery feed uses). Glyph fallback stays for unindexed tokens.
 const assetTokens=(data?.assets??[]).map(row=>row.token.toLowerCase());
 const logos=useQuery({queryKey:[...launchKeys.wallet(account??'disconnected','asset-logos'),assetTokens.join(',')],
  enabled:!!account&&assetTokens.length>0,
  queryFn:async({signal})=>{const entries=await Promise.all(assetTokens.map(async(token):Promise<[string,string|null]>=>{
    try{return [token,(await fetchLaunch(INDEXER_URL!,token,signal)).data?.logo??null];}catch{return [token,null];}
  }));return Object.fromEntries(entries);},
  staleTime:60_000,structuralSharing:false});
 const run=async(prepare:()=>Promise<Parameters<typeof executePreparedWrite>[2]>)=>{if(!wallet.wallet)return;setError('');setTx({kind:'preparing'});try{const result=await executePreparedWrite(publicClient,wallet.wallet,await prepare(),{onPhase:setTx});if(result.kind==='failed')setError(result.reason);else void state.refetch();}catch(e){setError(e instanceof Error?e.message:'Action failed.');}finally{setTx({kind:'idle'});}};
 if(!account)return <Reveal><section className="rp-hub-section" aria-label="Live portfolio"><h2 className="rp-section-title"><Wallet size={15} aria-hidden/>Portfolio</h2>
   <div className="rp-empty-panel"><span className="rp-empty-disc"><Wallet size={22} aria-hidden/></span><strong>Connect your wallet</strong><p>Wallet assets, Kuru margin balances and open orders appear once a wallet is connected.</p></div></section></Reveal>;
 if(state.isPending)return <section className="rp-hub-section" aria-label="Live portfolio" role="status"><h2 className="rp-section-title"><Wallet size={15} aria-hidden/>Portfolio</h2><div className="rp-tile-grid"><div className="rp-tile"><SkeletonLine height={54}/></div><div className="rp-tile"><SkeletonLine height={54}/></div></div><p className="rp-note">Reading current wallet balances…</p></section>;
 if(state.isError)return <section className="rp-hub-section" aria-label="Live portfolio"><h2 className="rp-section-title"><Wallet size={15} aria-hidden/>Portfolio</h2><ErrorState title="Balances are temporarily unavailable" onRetry={()=>void state.refetch()}/></section>;
 const assets=data?.assets.filter(row=>row.walletRaw>0n||row.marginRaw>0n)??[],orders=data?.orders.filter(o=>o.status==='OPEN'||o.status==='PARTIALLY_FILLED')??[];
 return <Reveal><section className="rp-hub-section" aria-label="Live portfolio"><h2 className="rp-section-title"><Wallet size={15} aria-hidden/>Portfolio</h2>
 <div className="rp-tile-grid">
  <div className="rp-tile"><span className="rp-tile-label"><span className="rp-cell-glyph" style={MON_GLYPH} aria-hidden><Wallet size={13}/></span>MON in wallet</span><strong><MonoAmount raw={data!.monRaw} decimals={18} unit="MON"/></strong><small>Spendable native balance read from chain</small></div>
  <div className="rp-tile"><span className="rp-tile-label"><span className="rp-cell-glyph" style={MON_GLYPH} aria-hidden><ArrowDownToLine size={13}/></span>MON in Kuru margin</span><strong><MonoAmount raw={data!.nativeMarginRaw} decimals={18} unit="MON"/></strong><small>Free margin, withdrawable to your wallet</small>{data!.nativeMarginRaw>0n&&<div className="rp-tile-actions"><button className="rp-btn rp-btn-sm" disabled={busy||!wallet.wallet} onClick={()=>void run(()=>prepareMarginWithdraw(publicClient,account,{token:zeroAddress,amount:data!.nativeMarginRaw}))}><ArrowDownToLine size={12} aria-hidden/>Withdraw to wallet</button></div>}</div>
 </div>
 {assets.length?<div className="rp-hub-card"><div className="rp-hub-card-head"><h3>Token positions</h3><span className="rp-count-chip">{assets.length} asset{assets.length===1?'':'s'}</span></div>
   <table className="detail-trades"><thead><tr><th>Asset</th><th className="rp-num">Wallet</th><th className="rp-num">Kuru margin</th><th>Action</th></tr></thead><tbody>{assets.map(row=>{
     const resolved=resolveMediaSrc(logos.data?.[row.token.toLowerCase()]??null),glyph=(row.symbol?.[0]??'T').toUpperCase();
     return <tr key={row.token}>
     <td><span className="rp-cell-asset"><span className="rp-cell-glyph" style={TOKEN_GLYPH} aria-hidden>{resolved
       ?<TokenImage src={resolved} width={16} height={16} style={{borderRadius:'50%',objectFit:'cover',display:'block'}} alt="" fallback={glyph}/>
       :glyph}</span><Link href={`/launchpad/token/${row.token}`}>{row.symbol}</Link></span></td>
     <td className="rp-num">{row.decimals===null?`${row.walletRaw} atomic units`:<MonoAmount raw={row.walletRaw} decimals={row.decimals}/>}</td>
     <td className="rp-num">{row.decimals===null?`${row.marginRaw} atomic units`:<MonoAmount raw={row.marginRaw} decimals={row.decimals}/>}</td>
     <td><button className="rp-btn rp-btn-sm" disabled={busy||!wallet.wallet||!row.marginRaw} onClick={()=>void run(()=>prepareMarginWithdraw(publicClient,account,{token:row.token as Address,amount:row.marginRaw}))}><ArrowDownToLine size={12} aria-hidden/>Withdraw</button></td>
   </tr>;})}</tbody></table></div>
  :<div className="rp-empty-panel rp-empty-compact"><span className="rp-empty-disc"><Wallet size={18} aria-hidden/></span><div><strong>No indexed token balances</strong><p>Balances held in your wallet or Kuru margin appear here once your launches are indexed.</p></div></div>}
 <div className="rp-hub-card"><div className="rp-hub-card-head"><h3>Open Kuru orders</h3><span className="rp-count-chip">{orders.length} open</span></div>
   {orders.length?<table className="detail-trades"><thead><tr><th>Side</th><th className="rp-num">Price</th><th className="rp-num">Initial resting size</th><th className="rp-num">Remaining</th><th>Created</th><th>Status</th><th>Action</th></tr></thead><tbody>{orders.map(o=><tr key={`${o.market}:${o.orderId}`}>
     <td>{o.side}</td><td className="rp-num"><MonoAmount raw={BigInt(o.priceX18)} decimals={18}/></td>
     <td className="rp-num"><MonoAmount raw={BigInt(o.originalSizeUnits)*10n**BigInt(o.baseDecimals)/BigInt(o.sizePrecision)} decimals={o.baseDecimals}/></td>
     <td className="rp-num"><MonoAmount raw={BigInt(o.remainingSizeUnits)*10n**BigInt(o.baseDecimals)/BigInt(o.sizePrecision)} decimals={o.baseDecimals}/></td>
     <td>{new Date(o.createdAt*1000).toLocaleString()}</td><td><span className="rp-chip">{o.status.replaceAll('_',' ').toLowerCase()}</span></td>
     <td><button className="rp-btn rp-btn-sm" disabled={busy||!wallet.wallet} onClick={()=>void run(()=>prepareKuruCancel(publicClient,o.market as Address,account,[Number(o.orderId)]))}><Ban size={12} aria-hidden/>Cancel</button></td>
   </tr>)}</tbody></table>
   :<div className="rp-empty-panel rp-empty-compact"><span className="rp-empty-disc"><Ban size={18} aria-hidden/></span><div><strong>No indexed open orders</strong><p>Limit orders you place on graduated Kuru books appear here with one-click cancellation.</p></div></div>}</div>
 {data?.issues.map(issue=><p role="status" key={issue}>{issue}.</p>)}{error&&<p role="alert" className="form-error">{error}</p>}{busy&&<p role="status" data-tx-phase={tx.kind}>{tx.kind==='awaiting-signature'?'Confirm in wallet…':'Working…'}</p>}
 <p className="ticket-note">Wallet balances and free margin balances are read from chain. Open order history is indexed; cancellation validates current on-chain ownership.</p></section></Reveal>;
}
