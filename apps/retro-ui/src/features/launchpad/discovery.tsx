import './feed.css';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers, Plus, Target } from 'lucide-react';
import Link from '@/components/product/safe-link';
import { DATA_MODE, INDEXER_URL } from '@/lib/live/env';
import { fetchPairs } from '@/lib/live/indexer-client';
import { useLiveLaunches } from '@/hooks/use-live-launches';
import { useSearchParams, useRouter } from '@/lib/next-compat';
import { prefetchLaunch, launchKeys } from '@/lib/live/queries';
import { DemoBadge, ErrorState, FreshnessIndicator } from '@/components/trading/primitives';
import { LIFECYCLE_FILTERS, demoRows, filterDemoRows, liveRow, type LifecycleFilter } from '@/lib/view-models/discovery';
import { DEMO_NOW_MS } from '@/lib/view-models/demo-terminal-fixtures';
import { DiscoveryControls, LaunchTable } from './launch-table';

const PredictionDemo = lazy(() => import('./demo-discovery'));
const VIEW_KEY = 'retropick-discovery-view';

function useView(): ['list' | 'grid', (v: 'list' | 'grid') => void] {
  const [view, setView] = useState<'list' | 'grid'>(() => { try { return localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'list'; } catch { return 'list'; } });
  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view); } catch { /* ignore */ } }, [view]);
  return [view, setView];
}
function useParamSetter() {
  const params = useSearchParams(), router = useRouter();
  return (key: string, value: string) => { const next = new URLSearchParams(params); next.delete('cursor'); if (value) next.set(key, value); else next.delete(key); router.replace(`/launchpad${next.size ? `?${next}` : ''}`, { scroll: false }); };
}
const parseFilter = (v: string | null): LifecycleFilter => (LIFECYCLE_FILTERS.some(([f]) => f === v) ? v as LifecycleFilter : 'marketCap');

function Heading({ subtitle }: { subtitle: string }) {
  return <header className="rp-disc-head"><div><h1>Launchpad</h1><p>{subtitle}</p></div><Link className="rp-btn rp-btn-primary" href="/launchpad/create"><Plus size={16} aria-hidden/>Launch token</Link></header>;
}

function LiveDiscovery() {
  const params = useSearchParams(), router = useRouter(), set = useParamSetter();
  const [view, setView] = useView();
  const filter = parseFilter(params.get('filter'));
  const query = { sort: filter === 'new' ? 'new' : 'marketCap', phase: ['active', 'near-graduation', 'graduated'].includes(filter) ? filter : undefined, quote: params.get('quote') ?? undefined, cursor: params.get('cursor') ?? undefined };
  const feed = useLiveLaunches(true, query);
  // Pair list is decorative: a failure here only empties the dropdown, never the feed.
  const pairs = useQuery({ queryKey: [...launchKeys.all, 'pairs'], queryFn: ({ signal }) => fetchPairs(INDEXER_URL!, signal), staleTime: 10000, retry: 1 });
  const rows = useMemo(() => feed.launches.map(liveRow), [feed.launches]);
  return <div className="rp-disc" data-testid="discovery" data-data-mode="live">
    <Heading subtitle="Live token markets on Monad Testnet. Values are in each launch's quote asset."/>
    <DiscoveryControls filter={filter} onFilter={(f) => set('filter', f === 'marketCap' ? '' : f)} pairs={(pairs.data?.data ?? []).map((p) => ({ value: p.quoteAsset, label: p.symbol }))} pair={query.quote ?? ''} onPair={(p) => set('quote', p)} view={view} onView={setView}/>
    {filter === 'near-graduation' && <p className="rp-note">Active curves at or above 80% graduation progress.</p>}
    {feed.status === 'unavailable' && feed.failure
      ? <div data-testid="indexer-unavailable" data-failure-kind={feed.failure.kind}><ErrorState title={feed.failure.title} text={feed.failure.text} onRetry={() => void feed.reload()}/></div>
      : feed.status === 'loading' && !rows.length ? <p className="rp-note" role="status">Loading indexed launches…</p>
      : <>
        {feed.status === 'stale' && feed.failure && <p className="rp-note" role="status" data-testid="indexer-refresh-failed">Latest refresh failed ({feed.failure.title.toLowerCase()}); showing the last indexed page.</p>}
        <LaunchTable rows={rows} view={view} now={Date.now()} onHover={(r) => void prefetchLaunch(r.id)}/>
      </>}
    <div className="rp-disc-foot">
      <FreshnessIndicator freshness={feed.freshness ? { indexedBlock: String(feed.freshness.indexedBlock), lagBlocks: feed.freshness.lagBlocks, stale: feed.status === 'stale' } : null}/>
      <span>{feed.status === 'unavailable' ? 'Launch data unavailable' : `${rows.length} launches on this page`}{feed.nextCursor ? ' · more on the next page' : ''}{!query.quote && filter !== 'new' ? ' · ranked within each quote asset' : ''}</span>
      <span>
        <button className="rp-btn rp-btn-ghost rp-btn-sm" onClick={() => void feed.reload()}>Refresh</button>{' '}
        {query.cursor && <button className="rp-btn rp-btn-ghost rp-btn-sm" onClick={() => set('cursor', '')}>First page</button>}{' '}
        {feed.nextCursor && <button className="rp-btn rp-btn-ghost rp-btn-sm" onClick={() => { const next = new URLSearchParams(params); next.set('cursor', feed.nextCursor!); router.replace('/launchpad?' + next, { scroll: false }); }}>Next page</button>}
      </span>
    </div>
    <p className="rp-note">Testnet assets are displayed in their quote denomination. MON has no implied USD value.</p>
  </div>;
}

function DemoDiscovery() {
  const params = useSearchParams(), set = useParamSetter();
  const [view, setView] = useView();
  const filter = parseFilter(params.get('filter'));
  const pair = params.get('quote') ?? '';
  const all = demoRows();
  const type = params.get('type');
  const STOCK_QUOTES = ['NVDAx', 'AAPLx'];
  const rows = useMemo(() => filterDemoRows(all, filter, pair).filter((r) => type === 'stocks' ? STOCK_QUOTES.includes(r.quote.symbol) : type === 'crypto' ? !STOCK_QUOTES.includes(r.quote.symbol) : true), [all, filter, pair, type]);
  const pairs = [...new Set(all.map((r) => r.quote.symbol))].map((s) => ({ value: s, label: s }));
  return <div className="rp-disc" data-testid="discovery" data-data-mode="demo">
    <Heading subtitle="Token launches, prediction markets and PRISM baskets. All values on this page are DEMO fixtures."/>
    <nav className="rp-category" aria-label="Launchpad categories">
      <Link href="/launchpad" aria-current={!type ? 'page' : undefined}>All tokens</Link>
      <Link href="/launchpad?type=crypto" aria-current={type === 'crypto' ? 'page' : undefined}>Crypto</Link>
      <Link href="/launchpad?type=stocks" aria-current={type === 'stocks' ? 'page' : undefined}>Stock-paired</Link>
      <Link href="/launchpad?type=prediction">Prediction</Link>
      <Link href="/prism">PRISM</Link>
    </nav>
    <DiscoveryControls filter={filter} onFilter={(f) => set('filter', f === 'marketCap' ? '' : f)} pairs={pairs} pair={pair} onPair={(p) => set('quote', p)} view={view} onView={setView}/>
    {filter === 'near-graduation' && <p className="rp-note">Active curves at or above 80% graduation progress.</p>}
    <LaunchTable rows={rows} view={view} now={DEMO_NOW_MS}/>
    <div className="rp-disc-foot"><span><DemoBadge text="SIMULATED"/> {rows.length} of {all.length} demo launches · graphs use simulated fixture candles</span></div>
    <section className="rp-modules" aria-label="Other RetroPick modules">
      <Link className="rp-module" href="/launchpad?type=prediction"><Target size={18} aria-hidden/><h3>Prediction markets</h3><p>Collateralized YES/NO outcome markets (research module, demo data).</p></Link>
      <Link className="rp-module" href="/prism"><Layers size={18} aria-hidden/><h3>PRISM</h3><p>Fully backed baskets of event outcomes (research module, demo data).</p></Link>
    </section>
  </div>;
}

export default function Discovery() {
  const params = useSearchParams();
  if (DATA_MODE === 'live') return <LiveDiscovery/>;
  // The Prediction category keeps the existing demo module listing (Prediction & PRISM regression safety).
  const type = params.get('type');
  if (type === 'prediction') return <Suspense fallback={<p className="rp-note">Loading…</p>}><PredictionDemo/></Suspense>;
  return <DemoDiscovery/>;
}
