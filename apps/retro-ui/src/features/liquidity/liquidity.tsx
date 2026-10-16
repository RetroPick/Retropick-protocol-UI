import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { IndexedLiquidityPool, IndexedLPPosition, IndexFreshness } from '@retropick/launchpad-sdk/read-model';
import type { Address } from 'viem';
import { Droplets } from 'lucide-react';
import Link from '@/components/product/safe-link';
import { usePathname, useSearchParams } from '@/lib/next-compat';
import { DATA_MODE, INDEXER_URL } from '@/lib/live/env';
import { launchKeys } from '@/lib/live/queries';
import { isStale } from '@/lib/live/indexer-client';
import { useWallet } from '@/wallet/provider';
import { useKuruLiquidity } from '@/hooks/use-kuru-liquidity';
import { AddressChip, DataTable, DemoBadge, EmptyState, ErrorState, FreshnessIndicator } from '@/components/trading/primitives';
import { formatRaw } from '@/lib/view-models/token-terminal';
import { demoLiquidityView, liquidityView } from '@/lib/view-models/liquidity';
import { LiveMarketLiquidity, MarketLiquidity, StateValue } from './market-liquidity';
import { demoPool, demoPoolEvents, fetchLPPositions, fetchPool, fetchPoolEvents, fetchPools } from './liquidity-data';
import { MarketMaking } from './market-making';
import './liquidity.css';

const live = DATA_MODE === 'live';
const addressValid = (token: string) => /^0x[\da-f]{40}$/i.test(token);

export function LiquidityFreshness({ freshness }: { freshness?: IndexFreshness }) {
  return <FreshnessIndicator freshness={freshness ? { indexedBlock: String(freshness.indexedBlock), lagBlocks: freshness.lagBlocks, stale: isStale(freshness) } : null}/>;
}

function PageLinks({ cursor, next, onCursor }: { cursor?: string; next?: string | null; onCursor: (cursor?: string) => void }) {
  return <div className="rp-pager"><span className="rp-muted">{next ? 'More results available; this page is not the complete list.' : 'End of list'}</span>{cursor && <button className="rp-btn rp-btn-ghost rp-btn-sm" onClick={() => onCursor(undefined)}>First page</button>}{next && <button className="rp-btn rp-btn-ghost rp-btn-sm" onClick={() => onCursor(next)}>Next page</button>}</div>;
}

export default function Liquidity({ token, maker = false }: { token?: string; maker?: boolean }) {
  const pathname = usePathname(), params = useSearchParams();
  const positions = !maker && !token && params.get('tab') === 'positions';
  return <div className="rp-liquidity" data-testid="liquidity-page" data-data-mode={live ? 'live' : 'demo'}>
    <header><h1><Droplets size={25} aria-hidden/> Liquidity</h1><p className="rp-note">Pools, protected protocol liquidity and manual market making on Monad Testnet.</p>{!live && <DemoBadge/>}</header>
    <nav className="rp-liquidity-tabs" aria-label="Liquidity sections"><Link href="/liquidity" aria-current={!positions && !maker ? 'page' : undefined}>Pools</Link><Link href="/liquidity?tab=positions" aria-current={positions ? 'page' : undefined}>My Positions</Link><Link href="/liquidity/market-making" aria-current={pathname.includes('/market-making') ? 'page' : undefined}>Market Making</Link></nav>
    {maker ? <MarketMaking/> : token ? <PoolDetails key={token} token={token}/> : positions ? <LPPositions/> : <Pools/>}
  </div>;
}

function Pools() {
  const [cursor, setCursor] = useState<string>();
  const q = useQuery({ queryKey: launchKeys.resource('all', 'liquidity-pools', { cursor }), enabled: live && !!INDEXER_URL, queryFn: ({ signal }) => fetchPools(INDEXER_URL!, cursor, signal), refetchInterval: cursor ? false : 15_000 });
  const rows = live ? q.data?.data ?? [] : [demoPool];
  return <section className="rp-liquidity-card" aria-label="Liquidity pools"><div className="rp-liquidity-header"><h2>Pools</h2>{live && <LiquidityFreshness freshness={q.data?.freshness}/>}</div>
    <p className="rp-note">Base and quote inventory are shown separately. Inventory does not guarantee execution for a particular order size.</p>
    {live && q.isError ? <ErrorState title="Pool discovery unavailable" text={q.error.message} onRetry={() => void q.refetch()}/> : <DataTable caption="Kuru liquidity pools" rows={rows} rowKey={row => row.token} empty={<EmptyState title={live && q.isPending ? 'Loading pools…' : 'No indexed Kuru pools'} text="Only graduated RetroPick Kuru markets appear here."/>} columns={[
      { key: 'pool', header: 'Pool', cell: row => <Link className="rp-link" href={`/liquidity/pools/${row.token}`}>{row.baseSymbol} / {row.quoteSymbol}</Link> },
      { key: 'base', header: 'AMM base assets', align: 'right', cell: row => row.baseAssetsRaw === null ? 'Unavailable' : `${formatRaw(row.baseAssetsRaw, row.baseDecimals)} ${row.baseSymbol}` },
      { key: 'quote', header: 'AMM quote assets', align: 'right', cell: row => row.quoteAssetsRaw === null ? 'Unavailable' : `${formatRaw(row.quoteAssetsRaw, row.quoteDecimals)} ${row.quoteSymbol}` },
      { key: 'state', header: 'Snapshot', cell: row => row.status === 'UNAVAILABLE' ? 'Unavailable' : row.historyComplete ? 'Indexed' : 'History backfill pending' },
      { key: 'action', header: 'Actions', cell: row => <div className="rp-liquidity-actions"><Link className="rp-link" href={`/launchpad/token/${row.token}`}>Trade</Link><Link className="rp-link" href={`/liquidity/market-making?token=${row.token}`}>Make markets</Link></div> },
    ]}/>}
    {live && !q.isError && q.data && <PageLinks cursor={cursor} next={q.data.nextCursor} onCursor={setCursor}/>}
  </section>;
}

function PoolDetails({ token }: { token: string }) {
  const params = useSearchParams();
  const valid = live ? addressValid(token) : token === demoPool.token;
  const q = useQuery({ queryKey: launchKeys.resource(token, 'liquidity-pool'), enabled: live && valid && !!INDEXER_URL, queryFn: ({ signal }) => fetchPool(INDEXER_URL!, token, signal), refetchInterval: 15_000 });
  if (!valid) return <ErrorState title="Invalid pool" text={live ? 'A pool route must identify a RetroPick token address.' : 'This pool is not part of the demo fixture.'}/>;
  const pool = live ? q.data?.data : demoPool;
  return <><Link href="/liquidity" className="rp-back">← All pools</Link>
    {live && q.isError && <ErrorState title="Indexed pool details unavailable" text={q.error.message} onRetry={() => void q.refetch()}/>}
    {live ? <LiveMarketLiquidity token={token} baseSymbol={pool?.baseSymbol ?? 'BASE'} quoteSymbol={pool?.quoteSymbol ?? 'QUOTE'}/> : <MarketLiquidity view={demoLiquidityView(token, params.get('scenario') ?? '')} baseSymbol={demoPool.baseSymbol} quoteSymbol={demoPool.quoteSymbol}/>}
    <p className="rp-note">Graduation LP shares are permanently protected. This page provides read-only LP information. Public LP deposits, minting and withdrawals are not enabled.</p>
    <PoolHistory token={token} pool={pool}/>
  </>;
}

function PoolHistory({ token, pool }: { token: string; pool?: IndexedLiquidityPool }) {
  const [cursor, setCursor] = useState<string>();
  const q = useQuery({ queryKey: launchKeys.resource(token, 'liquidity-events', { cursor }), enabled: live && !!INDEXER_URL, queryFn: ({ signal }) => fetchPoolEvents(INDEXER_URL!, token, cursor, signal), refetchInterval: cursor ? false : 15_000 });
  const rows = live ? q.data?.data ?? [] : demoPoolEvents;
  return <section className="rp-liquidity-card" aria-label="Vault history"><div className="rp-liquidity-header"><h2>Vault history</h2>{live && <LiquidityFreshness freshness={q.data?.freshness}/>}</div>
    {pool && !pool.historyComplete && <p className="rp-note" role="status">Vault history backfill is pending. An empty page cannot establish a zero position.</p>}
    {live && q.isError ? <ErrorState title="Vault history unavailable" text="The indexer may still be backfilling this vault. Current chain liquidity is read independently." onRetry={() => void q.refetch()}/> : <DataTable caption="Vault deposit withdrawal and share transfer history" rows={rows} rowKey={row => row.id} empty={<EmptyState title={live && q.isPending ? 'Loading vault history…' : 'No vault events on this page'}/>} columns={[
      { key: 'kind', header: 'Event', cell: row => row.kind.toLowerCase() },
      { key: 'shares', header: 'Shares (atomic units)', align: 'right', cell: row => row.sharesRaw },
      { key: 'base', header: 'Base assets', align: 'right', cell: row => row.baseRaw !== undefined && pool ? `${formatRaw(row.baseRaw, pool.baseDecimals)} ${pool.baseSymbol}` : '—' },
      { key: 'quote', header: 'Quote assets', align: 'right', cell: row => row.quoteRaw !== undefined && pool ? `${formatRaw(row.quoteRaw, pool.quoteDecimals)} ${pool.quoteSymbol}` : '—' },
      { key: 'receipt', header: 'Receipt', cell: row => <AddressChip value={row.transactionHash} kind="tx" label="vault event transaction"/> },
    ]}/>}
    {live && !q.isError && q.data && <PageLinks cursor={cursor} next={q.data.nextCursor} onCursor={setCursor}/>}
  </section>;
}

function LPPositions() {
  const wallet = useWallet(), account = wallet.account;
  const [cursor, setCursor] = useState<string>();
  const q = useQuery({ queryKey: launchKeys.wallet(account ?? 'disconnected', `lp-positions:${cursor ?? ''}`), enabled: live && !!account && !!INDEXER_URL, queryFn: ({ signal }) => fetchLPPositions(INDEXER_URL!, account!, cursor, signal), refetchInterval: cursor ? false : 15_000 });
  if (live && !account) return <EmptyState title="Connect a wallet to see LP positions" text="LP shares are distinct from Kuru trading margin." action={<button className="rp-btn rp-btn-primary" onClick={() => void wallet.connect().catch(() => {})}>Connect wallet</button>}/>;
  const rows: IndexedLPPosition[] = live ? q.data?.data ?? [] : [];
  return <section className="rp-liquidity-card" aria-label="Your LP positions"><div className="rp-liquidity-header"><h2>My Positions</h2>{live && <LiquidityFreshness freshness={q.data?.freshness}/>}</div><p className="rp-note">Read-only wallet-owned LP shares. Protected graduation shares belong to the protocol lock. Trading capital and open orders remain separate.</p>
    {live && q.isError ? <ErrorState title="LP positions unavailable" text="Position history is unavailable or still syncing. This does not establish a zero share balance." onRetry={() => void q.refetch()}/> : rows.length ? rows.map(row => <VerifiedPosition key={`${row.vault}:${row.wallet}`} row={row} account={account!}/>) : <EmptyState title={live && q.isPending ? 'Loading LP positions…' : 'No indexed LP positions on this page'} text={live ? 'Only verified, indexed Kuru vault positions appear here.' : 'The demo wallet has no LP shares. Demo margin balances are trading capital, not LP ownership.'}/>}
    {live && !q.isError && q.data && <PageLinks cursor={cursor} next={q.data.nextCursor} onCursor={setCursor}/>}
  </section>;
}

function VerifiedPosition({ row, account }: { row: IndexedLPPosition; account: Address }) {
  const q = useKuruLiquidity(row.token, account);
  const view = liquidityView(row.token, q.data, { loading: q.isPending, error: q.isError ? q.error.message : null, stale: !!q.data && (q.isError || Date.now() - q.dataUpdatedAt >= 20_000) });
  return <article className="rp-liquidity-card"><h3><Link className="rp-link" href={`/liquidity/pools/${row.token}`}>View pool</Link> <AddressChip value={row.token} label="position token"/></h3><p className="rp-note">{row.role === 'PROTECTED' ? 'Protected protocol position' : row.role === 'INFRASTRUCTURE' ? 'Infrastructure position' : 'Wallet position'} · {view.block ? `chain block ${view.block}` : 'Chain confirmation unavailable'}</p>
    <dl className="rp-liquidity-quotes"><div><dt>Current shares</dt><dd><StateValue status={view.position.status}>{view.shareDecimals === null ? `${view.position.sharesRaw ?? '—'} atomic shares` : formatRaw(view.position.sharesRaw, view.shareDecimals)}</StateValue></dd></div><div><dt>Underlying preview · base / quote</dt><dd><StateValue status={view.position.status}>{formatRaw(view.position.baseRaw, view.baseDecimals)} / {formatRaw(view.position.quoteRaw, view.quoteDecimals)}</StateValue></dd></div></dl><p className="rp-note">Underlying values are the current vault withdrawal preview; they are not guaranteed withdrawal proceeds.</p>
  </article>;
}
