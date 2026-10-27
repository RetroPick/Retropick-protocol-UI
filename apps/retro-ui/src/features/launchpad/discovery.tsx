import './feed.css';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { RiStackLine, RiTargetLine } from 'react-icons/ri';
import { FiPlus } from 'react-icons/fi';
import Link from '@/components/product/safe-link';
import { DATA_MODE, INDEXER_URL } from '@/lib/live/env';
import { useQuery } from '@tanstack/react-query';
import { ASSET_CATEGORIES, CATEGORY_LABELS } from '@retropick/launchpad-sdk/quote-assets';
import { filterIndexedLaunches, launchQuoteCategory, readDiscoverySnapshot, snapshotIdentity } from '@retropick/launchpad-sdk/discovery-snapshot';
import './quote-picker.css';
import { describeIndexerError, fetchLaunches, isStale } from '@/lib/live/indexer-client';
import { useSearchParams, useRouter } from '@/lib/next-compat';
import { prefetchLaunch, launchKeys } from '@/lib/live/queries';
import { DemoBadge, ErrorState, FreshnessIndicator } from '@/components/trading/primitives';
import { LIFECYCLE_FILTERS, demoRows, filterDemoRows, liveRow, type LifecycleFilter, type DiscoveryRow } from '@/lib/view-models/discovery';
import { DEMO_NOW_MS } from '@/lib/view-models/demo-terminal-fixtures';
import { DiscoveryControls, LaunchTable, O1LaunchpadHeader } from './launch-table';

const PredictionDemo = lazy(() => import('./demo-discovery'));
const VIEW_KEY = 'retropick-discovery-view';

function useView(): ['list' | 'grid', (v: 'list' | 'grid') => void] {
  const [view, setView] = useState<'list' | 'grid'>(() => { try { return localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'list'; } catch { return 'list'; } });
  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view); } catch { /* ignore */ } }, [view]);
  return [view, setView];
}

function useParamSetter() {
  const params = useSearchParams(), router = useRouter();
  return (key: string, value: string) => { 
    const next = new URLSearchParams(params); 
    next.delete('cursor'); 
    if (value) next.set(key, value); 
    else next.delete(key); 
    router.replace(`/launchpad${next.size ? `?${next}` : ''}`, { scroll: false }); 
  };
}

const parseFilter = (v: string | null): LifecycleFilter => (LIFECYCLE_FILTERS.some(([f]) => f === v) ? v as LifecycleFilter : 'marketCap');

function Heading({ subtitle }: { subtitle: string }) {
  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#241e42]/60">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white m-0">Launchpad</h1>
          <span className="px-2 py-0.5 rounded-md bg-[#836ef9]/15 text-[#836ef9] text-[11px] font-mono font-bold">
            o1 Terminal v2
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#a79fd0] mt-1 m-0">{subtitle}</p>
      </div>

      <Link 
        className="px-4 py-2 rounded-lg bg-[#836ef9] hover:bg-[#9583fc] text-white text-xs font-bold font-mono shadow-[0_0_20px_rgba(131,110,249,0.4)] flex items-center gap-1.5 transition-all cursor-pointer" 
        href="/launchpad/create"
      >
        <FiPlus className="w-4 h-4" aria-hidden />
        <span>Launch token</span>
      </Link>
    </header>
  );
}

function LiveDiscovery() {
  const params = useSearchParams(), router = useRouter(), set = useParamSetter();
  const [view, setView] = useView();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const filter = parseFilter(params.get('filter'));
  const query = { filter, category: params.get('category') ?? '', quote: params.get('quote') ?? '', q: search };
  
  const snapshot = useQuery({ 
    queryKey: [...launchKeys.all, 'complete-discovery'], 
    enabled: !!INDEXER_URL, 
    queryFn: ({ signal }: { signal?: AbortSignal }) => readDiscoverySnapshot(cursor => fetchLaunches(INDEXER_URL!, { limit: 100, sort: 'new', cursor }, signal)), 
    staleTime: 3000, 
    refetchInterval: 10000, 
    retry: 1 
  });
  
  const all = snapshot.data?.data ?? [];
  const filtered = useMemo(() => filterIndexedLaunches(all, query), [all, filter, query.category, query.quote, search]);
  const version = snapshot.data ? snapshotIdentity(snapshot.data.freshness) : '';
  const queryIdentity = JSON.stringify(query);
  const cursor = params.get('cursor');
  let start = 0, expiredCursor = false;
  if (cursor) { 
    try { 
      const parsed = JSON.parse(atob(cursor)); 
      const i = filtered.findIndex((l: any) => l.token === parsed.after); 
      if (parsed.v !== version || parsed.q !== queryIdentity || i < 0) expiredCursor = true; 
      else start = i + 1; 
    } catch { 
      expiredCursor = true; 
    } 
  }
  
  const launches = filtered.slice(start, start + 50);
  const nextCursor = start + 50 < filtered.length ? btoa(JSON.stringify({ v: version, q: queryIdentity, after: launches.at(-1)!.token })) : null;
  const rows = useMemo(() => launches.map(liveRow), [launches]);
  const allRows = useMemo(() => all.map(liveRow), [all]);

  const freshness = snapshot.data?.freshness ?? null;
  const status = snapshot.data ? (snapshot.isError || isStale(snapshot.data.freshness) ? 'stale' : 'ready') : snapshot.isError ? 'unavailable' : 'loading';
  const failure = snapshot.isError ? describeIndexerError(snapshot.error) : null;
  const feed = { status, failure, freshness, nextCursor, reload: () => snapshot.refetch() };
  const pairCounts: { value: string; label: string }[] = [...new Map(all.map((l: any) => [l.quoteAsset.toLowerCase(), { value: l.quoteAsset, label: l.quoteSymbol }])).values()];

  return (
    <div className="flex flex-col gap-6 w-full" data-testid="discovery" data-data-mode="live">
      {/* o1.exchange Style Split Header (Stats 3x2 Grid + Trending Leaderboard) */}
      <O1LaunchpadHeader rows={allRows.length ? allRows : rows} />

      {/* Unified Search, Category & Discovery Controls */}
      <DiscoveryControls 
        filter={filter} 
        onFilter={(f) => set('filter', f)} 
        pairs={pairCounts} 
        pair={query.quote ?? ''} 
        onPair={(p) => set('quote', p)} 
        view={view} 
        onView={setView}
        search={search}
        onSearch={(q) => {
          setSearch(q);
          set('q', q);
        }}
        category={query.category}
        onCategory={(c) => set('category', c)}
        categories={[
          { value: '', label: 'All assets', count: snapshot.data ? all.length : '—' },
          ...ASSET_CATEGORIES.map(category => ({
            value: category,
            label: CATEGORY_LABELS[category],
            count: snapshot.data ? all.filter((l: any) => launchQuoteCategory(l) === category).length : '—'
          }))
        ]}
      />

      {filter === 'near-graduation' && (
        <p className="text-xs text-[#a78bfa] font-mono m-0">⚡ Active curves at or above 80% graduation progress ready to migrate to Kuru DEX.</p>
      )}

      {feed.status === 'unavailable' && feed.failure ? (
        <div data-testid="indexer-unavailable" data-failure-kind={feed.failure.kind}>
          <ErrorState title={feed.failure.title} text={feed.failure.text} onRetry={() => void feed.reload()}/>
        </div>
      ) : feed.status === 'loading' && !rows.length ? (
        <div className="p-8 text-center text-xs font-mono text-[#a79fd0]">Loading indexed launches…</div>
      ) : (
        <>
          {feed.status === 'stale' && feed.failure && (
            <p className="text-xs text-amber-400 font-mono m-0" role="status" data-testid="indexer-refresh-failed">
              Latest refresh failed ({feed.failure.title.toLowerCase()}); showing the last complete indexed snapshot.
            </p>
          )}
          <LaunchTable rows={rows} view={view} now={Date.now()} onHover={(r) => void prefetchLaunch(r.id)}/>
        </>
      )}

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#241e42] text-xs font-mono text-[#615a78]">
        <FreshnessIndicator freshness={feed.freshness ? { indexedBlock: String(feed.freshness.indexedBlock), lagBlocks: feed.freshness.lagBlocks, stale: feed.status === 'stale' } : null}/>
        <span>
          {feed.status === 'unavailable' ? 'Launch data unavailable' : `${rows.length} of ${filtered.length} matching launches · ${all.length} total on Monad 10143`}
        </span>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 rounded-lg bg-[#16102e] border border-[#241e42] hover:border-[#836ef9] text-white text-xs font-mono cursor-pointer" onClick={() => void feed.reload()}>
            Refresh
          </button>
          {cursor && (
            <button className="px-3 py-1 rounded-lg bg-[#16102e] border border-[#241e42] text-white text-xs font-mono cursor-pointer" onClick={() => set('cursor', '')}>
              First page
            </button>
          )}
          {feed.nextCursor && (
            <button className="px-3 py-1 rounded-lg bg-[#836ef9] text-white text-xs font-mono cursor-pointer" onClick={() => { const next = new URLSearchParams(params); next.set('cursor', feed.nextCursor!); router.replace('/launchpad?' + next, { scroll: false }); }}>
              Next page
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DemoDiscovery() {
  const params = useSearchParams(), router = useRouter(), set = useParamSetter();
  const [view, setView] = useView();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const filter = parseFilter(params.get('filter'));
  const pair = params.get('quote') ?? '';
  const all = demoRows();
  const type = params.get('type');
  const STOCK_QUOTES = ['NVDAx', 'AAPLx'];

  const rows = useMemo(() => {
    let list = filterDemoRows(all, filter, pair).filter((r) => 
      type === 'stocks' ? STOCK_QUOTES.includes(r.quote.symbol) 
      : type === 'crypto' ? !STOCK_QUOTES.includes(r.quote.symbol) 
      : true
    );
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r => `${r.name} ${r.symbol} ${r.quote.symbol} ${r.creator ?? ''}`.toLowerCase().includes(q));
    }
    return list;
  }, [all, filter, pair, type, search]);

  const pairs = [...new Set(all.map((r) => r.quote.symbol))].map((s) => ({ value: s, label: s }));

  const cryptoCount = all.filter(r => !STOCK_QUOTES.includes(r.quote.symbol)).length;
  const stocksCount = all.filter(r => STOCK_QUOTES.includes(r.quote.symbol)).length;

  return (
    <div className="flex flex-col gap-6 w-full" data-testid="discovery" data-data-mode="demo">
      {/* o1.exchange Style Split Header (Stats 3x2 Grid + Trending Leaderboard) */}
      <O1LaunchpadHeader rows={all} />

      {/* Unified Search & Discovery Controls (o1.exchange style) */}
      <DiscoveryControls 
        filter={filter} 
        onFilter={(f) => set('filter', f)} 
        pairs={pairs} 
        pair={pair} 
        onPair={(p) => set('quote', p)} 
        view={view} 
        onView={setView}
        search={search}
        onSearch={(q) => {
          setSearch(q);
          set('q', q);
        }}
        category={type ?? ''}
        onCategory={(c) => {
          const next = new URLSearchParams(params);
          if (c) next.set('type', c);
          else next.delete('type');
          router.replace(`/launchpad${next.size ? `?${next}` : ''}`, { scroll: false });
        }}
        categories={[
          { value: '', label: 'All', count: all.length },
          { value: 'crypto', label: 'Crypto', count: cryptoCount },
          { value: 'stocks', label: 'Stocks', count: stocksCount },
        ]}
      />

      {filter === 'near-graduation' && (
        <p className="text-xs text-[#a78bfa] font-mono m-0">⚡ Active curves at or above 80% graduation progress ready to migrate to Kuru DEX.</p>
      )}

      {/* Main Table or Card Grid */}
      <LaunchTable rows={rows} view={view} now={DEMO_NOW_MS} />

      {/* Clean Status Footer */}
      <div className="flex items-center justify-between text-xs font-sans text-slate-500 pt-1">
        <span>Showing <strong className="text-slate-300 font-mono">{rows.length}</strong> of <strong className="text-slate-300 font-mono">{all.length}</strong> launches · price feeds synchronized with Monad testnet</span>
      </div>

      {/* Additional RetroPick Sub-modules (Prediction & PRISM) - Squircle blunt rounded corners, no outer borders */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2" aria-label="Other RetroPick modules">
        <Link 
          className="p-4 sm:p-5 rounded-xl bg-[#12141c] hover:bg-[#171924] transition-all flex flex-col gap-2 group text-inherit no-underline shadow-sm" 
          href="/launchpad?type=prediction"
        >
          <div className="flex items-center gap-2.5 text-[#836ef9]">
            <div className="p-2 rounded-lg bg-[#836ef9]/10">
              <RiTargetLine className="w-4 h-4 text-[#836ef9]" aria-hidden />
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-[#a78bfa] transition-colors m-0 font-sans">Prediction Markets</h3>
          </div>
          <p className="text-xs text-slate-400 m-0 font-sans leading-relaxed">
            Collateralized YES/NO outcome markets with real-time probability pricing and instant resolution.
          </p>
        </Link>

        <Link 
          className="p-4 sm:p-5 rounded-xl bg-[#12141c] hover:bg-[#171924] transition-all flex flex-col gap-2 group text-inherit no-underline shadow-sm" 
          href="/prism"
        >
          <div className="flex items-center gap-2.5 text-[#836ef9]">
            <div className="p-2 rounded-lg bg-[#836ef9]/10">
              <RiStackLine className="w-4 h-4 text-[#836ef9]" aria-hidden />
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-[#a78bfa] transition-colors m-0 font-sans">PRISM Structured Baskets</h3>
          </div>
          <p className="text-xs text-slate-400 m-0 font-sans leading-relaxed">
            Fully backed multi-outcome baskets combining event hedges and yield generation in one single token.
          </p>
        </Link>
      </section>
    </div>
  );
}

export default function Discovery() {
  const params = useSearchParams();
  if (DATA_MODE === 'live') return <LiveDiscovery/>;
  const type = params.get('type');
  if (type === 'prediction') return <Suspense fallback={<p className="text-xs font-mono text-[#a79fd0]">Loading…</p>}><PredictionDemo/></Suspense>;
  return <DemoDiscovery/>;
}
