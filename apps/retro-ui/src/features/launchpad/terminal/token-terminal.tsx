// Shared token terminal (Kuru DEX aesthetic & Sections 3, 5, 14–19, 25, 27).
// Consumes DEMO fixtures and LIVE indexer/chain view models.
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Tabs as RTabs } from 'radix-ui';
import { 
  FiArrowLeft, 
  FiStar, 
  FiChevronDown, 
  FiExternalLink, 
  FiCopy, 
  FiCheck, 
  FiMaximize2, 
  FiInfo, 
  FiClock,
  FiTrendingUp,
  FiTrendingDown
} from 'react-icons/fi';
import { 
  RiFireFill, 
  RiDropLine, 
  RiCompass3Line 
} from 'react-icons/ri';
import { 
  TbChartCandle 
} from 'react-icons/tb';
import { 
  BsStar, 
  BsStarFill 
} from 'react-icons/bs';
import Link from '@/components/product/safe-link';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { AddressChip, DataTable, DemoBadge, EmptyState, ErrorState, FreshnessIndicator, InfoHint, LifecycleBadge, Metric, MetricStrip, PairBadge, SegmentedControl, SkeletonLine, TokenIdentity, cx, type Column } from '@/components/trading/primitives';
import { RANGE_INTERVALS, RANGE_LABELS, ageFrom, changeDirection, formatBps, formatPriceX18, formatRaw, formatRawCompact, holderValueRaw, lifecycleLabel, orderSizeRaw, type CandleInterval, type ChartRange, type TerminalData, type TerminalDepth, type TokenTerminalVM } from '@/lib/view-models/token-terminal';
import type { IndexedHolder, IndexedOrder, IndexedTrade } from '@retropick/launchpad-sdk/read-model';
import { BondingProgress } from '@/components/trading/bonding-progress';
import { PairIdentity } from '@/components/trading/pair-identity';
import { MarketRadarPanel } from './market-radar';

const TradingChart = lazy(() => import('../trading-chart'));

export type TerminalTab = 'Trades' | 'Holders' | 'Protocol' | 'Orders';

export interface ChartControls {
  range: ChartRange; interval: CandleInterval; mode: 'Line' | 'Candles';
  setRange: (r: ChartRange) => void; setInterval: (i: CandleInterval) => void; setMode: (m: 'Line' | 'Candles') => void;
}
export interface Pager { hasNext: boolean; hasPrev: boolean; next: () => void; first: () => void }

export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => { const mql = window.matchMedia(query); const on = () => setMatch(mql.matches); on(); mql.addEventListener('change', on); return () => mql.removeEventListener('change', on); }, [query]);
  return match;
}

const ROLE_LABEL: Record<NonNullable<IndexedHolder['role']>, string | null> = {
  CURVE: 'Curve', COORDINATOR: 'Protocol', LP_EXCESS_LOCK: 'Liquidity lock', KURU_INFRASTRUCTURE: 'Liquidity', BUYBACK_VAULT: 'Protocol', FEE_ESCROW: 'Protocol', WALLET: null,
};

export function TokenTerminal({ vm, data, chart, ticket, depth, liquidityPanel, tab, onTab, tradesPager, holdersPager, ordersPanel, headActions, onRetry, backHref = '/launchpad' }: {
  vm: TokenTerminalVM; data: TerminalData; chart: ChartControls; ticket: ReactNode; depth?: TerminalDepth | null;
  tab: TerminalTab; onTab: (t: TerminalTab) => void; tradesPager?: Pager; holdersPager?: Pager; ordersPanel?: ReactNode; headActions?: ReactNode; liquidityPanel?: ReactNode; onRetry?: () => void; backHref?: string;
}) {
  const demo = vm.dataMode === 'demo';
  const mobile = useMediaQuery('(max-width: 767px)');
  const [sheet, setSheet] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const dir = changeDirection(vm.change24hBps);
  const q = vm.quote.symbol;
  const kuruOrders = vm.lifecycle === 'GRADUATED' && vm.venue === 'KURU';
  const showDepth = !mobile && !!depth;
  const tabs: Array<{ value: TerminalTab; disabled?: string }> = [
    { value: 'Trades' },
    { value: 'Holders' },
    { value: 'Orders', disabled: kuruOrders ? undefined : 'Orders are available after graduation to Kuru.' },
    { value: 'Protocol' },
  ];
  useEffect(() => { if (tab === 'Orders' && !kuruOrders) onTab('Trades'); }, [tab, kuruOrders, onTab]);

  const progressPercent = vm.bondingProgressBps ? Math.min(100, Math.round(vm.bondingProgressBps / 100)) : 100;

  return (
    <div className="flex flex-col gap-3 w-full" data-testid="token-terminal" data-data-mode={vm.dataMode} data-lifecycle={vm.lifecycle} data-fixture-version={vm.fixtureVersion}>
      
      {/* 1. Kuru Style Horizontal Market Ribbon (Top Bar) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#0b0d13] border border-white/[0.08] shadow-sm">
        {/* Left Side: Back, Star, Pair Chip, Live Price & 24h Metrics */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
          <Link 
            href={backHref}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
            title="Back to Launchpad"
          >
            <FiArrowLeft className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={() => setIsFav(!isFav)}
            className="text-slate-500 hover:text-amber-400 transition-colors cursor-pointer shrink-0"
            title="Favorite"
            aria-label="Favorite"
          >
            {isFav ? <BsStarFill className="w-4 h-4 text-amber-400" /> : <BsStar className="w-4 h-4" />}
          </button>

          {/* Market Pair Dropdown Pill */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#141622] border border-white/[0.08] text-white font-mono font-bold text-xs shrink-0 cursor-pointer hover:border-[#836ef9]/40 transition-colors">
            <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
            <span>{vm.symbol} / {q}</span>
            <FiChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Price */}
          <div className="flex flex-col shrink-0">
            <span className="text-[10px] text-slate-500 uppercase font-mono font-medium leading-none">Price</span>
            <span className="text-base sm:text-lg font-bold font-mono text-white tracking-tight tabular-nums mt-0.5" data-testid="token-price">
              {vm.price.x18 ? formatPriceX18(vm.price.x18) : '—'} <span className="text-xs text-slate-400 font-normal">{q}</span>
            </span>
          </div>

          {/* 24h Change */}
          <div className="flex flex-col shrink-0">
            <span className="text-[10px] text-slate-500 uppercase font-mono font-medium leading-none">24h Change</span>
            <span className={`text-xs font-mono font-bold tabular-nums mt-0.5 ${dir === 'down' ? 'text-rose-400' : 'text-emerald-400'}`} data-testid="token-change">
              {dir === 'none' ? '0.0%' : formatBps(vm.change24hBps, true)}
            </span>
          </div>

          {/* 24h Volume */}
          <div className="hidden sm:flex flex-col shrink-0">
            <span className="text-[10px] text-slate-500 uppercase font-mono font-medium leading-none">24h Volume</span>
            <span className="text-xs font-mono font-bold text-slate-200 tabular-nums mt-0.5">
              {formatRawCompact(vm.volume24hRaw, vm.quote.decimals)} {q}
            </span>
          </div>

          {/* Market Cap */}
          <div className="hidden md:flex flex-col shrink-0">
            <span className="text-[10px] text-slate-500 uppercase font-mono font-medium leading-none">Market Cap</span>
            <span className="text-xs font-mono font-bold text-slate-200 tabular-nums mt-0.5" data-testid="metric-mcap">
              {formatRawCompact(vm.marketCapRaw, vm.quote.decimals)} {q}
            </span>
          </div>

          {/* Mini Bonding Progress Meter */}
          <div className="hidden lg:flex flex-col shrink-0">
            <span className="text-[10px] text-slate-500 uppercase font-mono font-medium leading-none">Bonding Curve</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono font-bold text-[#836ef9] tabular-nums">{progressPercent}%</span>
              <div className="w-16 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#836ef9] to-emerald-400 rounded-full" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Timeframes & Chart Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Timeframe Quick Selection */}
          <div className="flex items-center bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.06] text-xs font-mono">
            {(['1m', '5m', '15m', '1h'] as CandleInterval[]).map((iv) => (
              <button
                key={iv}
                type="button"
                onClick={() => chart.setInterval(iv)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                  chart.interval === iv 
                    ? 'bg-[#836ef9] text-white font-bold shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {iv}
              </button>
            ))}
          </div>

          {/* Line / Candle mode toggle */}
          <button
            type="button"
            onClick={() => chart.setMode(chart.mode === 'Candles' ? 'Line' : 'Candles')}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              chart.mode === 'Candles'
                ? 'bg-[#836ef9]/20 border-[#836ef9]/40 text-[#836ef9]'
                : 'bg-white/[0.04] border-white/[0.06] text-slate-400 hover:text-white'
            }`}
            title={`Toggle Chart Mode (Current: ${chart.mode})`}
          >
            <TbChartCandle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {(vm.sync.indexer === 'stale' || vm.sync.indexer === 'unavailable') && (
        <div className="rp-banner" role="status">
          <FreshnessIndicator freshness={vm.freshness} demo={demo}/>
          <span>{vm.sync.message ?? 'Indexed history may be behind. Trading reads current on-chain state.'}</span>
          {onRetry && <button className="rp-link" onClick={onRetry}>Retry</button>}
        </div>
      )}

      {/* 2. Main 3-Column Trading Workspace (Kuru Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 w-full items-stretch">
        {/* Column 1: Interactive Price Chart (TradingView / Kuru Style) */}
        <section 
          className="lg:col-span-6 xl:col-span-6 flex flex-col justify-between bg-[#0b0d13] border border-white/[0.08] rounded-xl overflow-hidden p-3 min-h-[460px] shadow-sm" 
          aria-label="Price chart"
        >
          {/* Chart Header Bar */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06] text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{vm.symbol} · 1h · kuru.io</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
              <span>O: <strong className="text-white">{vm.price.x18 ? formatPriceX18(vm.price.x18) : '—'}</strong></span>
              <span>C: <strong className={dir === 'down' ? 'text-rose-400' : 'text-emerald-400'}>{vm.price.x18 ? formatPriceX18(vm.price.x18) : '—'}</strong></span>
            </div>
          </div>

          <div className="rp-chart-box flex-1 min-h-[380px] relative">
            {data.candles.status === 'loading' && !data.candles.rows.length ? (
              <div className="rp-chart-loading flex items-center justify-center h-full"><SkeletonLine height={340} label="Loading chart"/></div>
            ) : data.candles.status === 'error' ? (
              <ErrorState title="Chart history unavailable" text="Price history could not be loaded. On-chain trading is unaffected." onRetry={onRetry}/>
            ) : (
              <Suspense fallback={<div className="rp-chart-loading flex items-center justify-center h-full"><SkeletonLine height={340} label="Loading chart"/></div>}>
                <TradingChart candles={data.candles.rows} quoteDecimals={vm.quote.decimals} quoteSymbol={q} mode={chart.mode} graduationTimestamp={vm.graduationTimestamp} emptyText={`No confirmed trades in the last ${RANGE_LABELS[chart.range]}.`}/>
              </Suspense>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[11px] font-mono text-slate-500">
            <div className="flex items-center gap-2">
              <FreshnessIndicator freshness={vm.freshness} demo={demo}/>
              <span>{demo ? 'SIMULATED deterministic fixtures' : 'Monad live executed candles'}</span>
            </div>
            <span>3m 5d 1d · % log auto</span>
          </div>
        </section>

        {/* Column 2: CLOB Orderbook (Center Column) */}
        {showDepth ? (
          <div className="lg:col-span-3 xl:col-span-3 flex flex-col bg-[#0b0d13] border border-white/[0.08] rounded-xl overflow-hidden p-3 min-h-[460px] shadow-sm">
            <MarketDepth vm={vm} depth={depth ?? null}/>
          </div>
        ) : (
          <div className="lg:col-span-3 xl:col-span-3 flex flex-col bg-[#0b0d13] border border-white/[0.08] rounded-xl p-4 min-h-[460px] shadow-sm justify-center items-center text-center">
            <EmptyState title="Orderbook Syncing" text="Connecting to on-chain liquidity depth." />
          </div>
        )}

        {/* Column 3: Order Ticket (Right Column) */}
        {!mobile && (
          <aside className="lg:col-span-3 xl:col-span-3 flex flex-col bg-[#0b0d13] border border-white/[0.08] rounded-xl p-3.5 min-h-[460px] shadow-sm" aria-label="Trade">
            <div className="pb-2 mb-2 border-b border-white/[0.06]">
              <PairIdentity name={vm.name} symbol={vm.symbol} logo={vm.logo} quoteAddress={vm.addresses.quoteAsset} quoteSymbol={q} compact/>
            </div>
            {ticket}
          </aside>
        )}
      </div>

      {mobile && showDepth && <MarketDepth vm={vm} depth={depth ?? null}/>}
      {kuruOrders && liquidityPanel}

      {/* 3. Bottom Tabs Panel: Trades, Holders, Orders, Protocol (Clean Max-Height Container) */}
      <RTabs.Root className="w-full flex flex-col gap-2 rounded-xl bg-[#0b0d13] border border-white/[0.08] p-3 shadow-sm" value={tab} onValueChange={(v) => onTab(v as TerminalTab)}>
        <RTabs.List className="flex items-center gap-2 border-b border-white/[0.08] pb-2 text-xs font-sans font-semibold" aria-label="Token data">
          {tabs.map((t) => (
            <RTabs.Trigger 
              key={t.value} 
              value={t.value} 
              disabled={!!t.disabled} 
              title={t.disabled} 
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                tab === t.value 
                  ? 'bg-white/[0.08] text-white font-bold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.value}
              {t.value === 'Holders' && vm.holderCount !== null ? <span className="ml-1 opacity-70 font-mono">({vm.holderCount})</span> : null}
            </RTabs.Trigger>
          ))}
        </RTabs.List>

        <div className="max-h-[300px] overflow-y-auto no-scrollbar w-full">
          <RTabs.Content value="Trades" className="outline-none"><TradesTable vm={vm} page={data.trades} pager={tradesPager}/></RTabs.Content>
          <RTabs.Content value="Holders" className="outline-none"><HoldersTable vm={vm} page={data.holders} pager={holdersPager}/></RTabs.Content>
          <RTabs.Content value="Protocol" className="outline-none">
            <ProtocolPanel vm={vm}/>
            <section className="rp-contracts" aria-label="Contracts" style={{ marginTop: '16px' }}>
              <div><span>Token</span><AddressChip value={vm.addresses.token} label="token"/></div>
              <div><span>Curve</span><AddressChip value={vm.addresses.curve} label="curve"/></div>
              <div><span>Launched</span>{vm.txs.launch ? <AddressChip value={vm.txs.launch} kind="tx" label="launch transaction"/> : <span className="rp-muted">—</span>}</div>
              <div><span>Graduated</span>{vm.txs.graduation ? <AddressChip value={vm.txs.graduation} kind="tx" label="graduation transaction"/> : <span className="rp-muted">{vm.lifecycle === 'GRADUATED' ? '—' : 'Not yet'}</span>}</div>
            </section>
            {vm.addresses.token && <div style={{ marginTop: '16px' }}><MarketRadarPanel token={vm.addresses.token} quoteSymbol={q}/></div>}
          </RTabs.Content>
          <RTabs.Content value="Orders" className="outline-none">{ordersPanel ?? <OrdersTable vm={vm} page={data.orders}/>}</RTabs.Content>
        </div>
      </RTabs.Root>

      {/* About Section */}
      <section className="p-4 rounded-xl bg-[#0b0d13] border border-white/[0.08] text-xs font-sans text-slate-400 leading-relaxed" aria-labelledby="rp-about-h">
        <h2 id="rp-about-h" className="text-sm font-bold text-white mb-1.5 font-sans">About {vm.name}</h2>
        <p className="m-0">{vm.description || <span className="text-slate-500">The creator has not provided a description.</span>}</p>
        <Socials socials={vm.socials}/>
      </section>

      {mobile && (
        <>
          <div className="rp-mobile-trade" data-testid="mobile-trade-bar">
            <div>
              <strong>{vm.price.x18 ? `${formatPriceX18(vm.price.x18)} ${q}` : '—'}</strong>
              <small>{vm.sync.onchain === 'syncing' ? (vm.sync.message ?? 'Syncing on-chain state…') : `${lifecycleLabel[vm.lifecycle]}${demo ? ' · DEMO' : ''}`}</small>
            </div>
            <button className="rp-btn rp-btn-primary" onClick={() => setSheet(true)}>Trade</button>
          </div>
          <Sheet open={sheet} onOpenChange={setSheet}>
            <SheetContent side="bottom" className="rp-sheet">
              <SheetTitle className="rp-sr">Trade {vm.symbol}</SheetTitle>
              <SheetDescription className="rp-sr">Order ticket for {vm.name}</SheetDescription>
              <div className="rp-ticket-pair"><PairIdentity name={vm.name} symbol={vm.symbol} logo={vm.logo} quoteAddress={vm.addresses.quoteAsset} quoteSymbol={q} compact/></div>{ticket}
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}

function Socials({ socials }: { socials: TokenTerminalVM['socials'] }) {
  const items = ([['website', 'Website'], ['twitter', 'X / Twitter'], ['telegram', 'Telegram'], ['discord', 'Discord'], ['farcaster', 'Farcaster']] as const)
    .filter(([key]) => !!socials[key] && /^https:\/\//.test(socials[key]!));
  if (!items.length) return null;
  return (
    <ul className="flex items-center gap-3 list-none p-0 mt-3">
      {items.map(([key, label]) => (
        <li key={key}>
          <a href={socials[key]} target="_blank" rel="noreferrer noopener" className="text-[#836ef9] hover:text-[#a78bfa] text-xs font-medium flex items-center gap-1 font-sans">
            <span>{label}</span>
            <FiExternalLink className="w-3 h-3" />
          </a>
        </li>
      ))}
    </ul>
  );
}

function PagerBar({ pager, status, complete }: { pager?: Pager; status: string; complete: boolean }) {
  return (
    <div className="flex items-center justify-between pt-2 text-xs font-mono text-slate-500">
      <span className="text-slate-500">{complete ? 'End of list' : 'More rows available'}</span>
      <div className="flex items-center gap-2">
        {pager?.hasPrev && <button className="px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-mono cursor-pointer" onClick={pager.first}>First page</button>}
        {pager?.hasNext && <button className="px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-mono cursor-pointer" onClick={pager.next}>Next page</button>}
      </div>
    </div>
  );
}

function TradesTable({ vm, page, pager }: { vm: TokenTerminalVM; page: TerminalData['trades']; pager?: Pager }) {
  const q = vm.quote.symbol;
  const cols: Column<IndexedTrade>[] = [
    { key: 'side', header: 'Side', cell: (t) => <span className={`font-mono font-bold text-xs ${t.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>{t.side === 'buy' ? 'Buy' : 'Sell'}</span> },
    { key: 'trader', header: 'Trader', cell: (t) => <AddressChip value={t.actor} label="trader"/> },
    { key: 'quote', header: q, align: 'right', cell: (t) => <span className="font-mono tabular-nums">{formatRaw(t.quoteRaw, vm.quote.decimals, 4)}</span> },
    { key: 'token', header: vm.symbol, align: 'right', priority: 2, cell: (t) => <span className="font-mono tabular-nums">{formatRawCompact(t.tokensRaw, vm.baseDecimals)}</span> },
    { key: 'price', header: 'Price', align: 'right', priority: 2, cell: (t) => <span className="font-mono tabular-nums">{formatPriceX18(t.priceX18 ?? t.priceRaw)}</span> },
    { key: 'venue', header: 'Venue', priority: 3, cell: (t) => <span className="font-mono text-xs">{t.venue === 'KURU' ? 'Kuru' : 'Curve'}</span> },
    { key: 'age', header: 'Age', align: 'right', cell: (t) => /^0x/.test(t.transactionHash) ? <a className="text-[#836ef9] hover:underline font-mono text-xs" href={`https://testnet.monadexplorer.com/tx/${t.transactionHash}`} target="_blank" rel="noreferrer" title="Open transaction">{ageFrom(t.timestamp, vm.now)}</a> : <span className="font-mono text-xs text-slate-400">{ageFrom(t.timestamp, vm.now)}</span> },
  ];
  if (page.status === 'loading' && !page.rows.length) return <TableSkeleton/>;
  return <DataTable caption={`Recent trades for ${vm.symbol}`} columns={cols} rows={page.rows} rowKey={(t) => t.id} rowTone={(t) => t.side}
    empty={page.status === 'error' ? <ErrorState title="Trades unavailable" text="Indexed trade history could not be loaded." onRetry={pager?.first}/> : <EmptyState title="No trades yet" text="Trades appear here after confirmation and indexing."/>}
    footer={<PagerBar pager={pager} status={page.status} complete={page.nextCursor === null}/>}/>;
}

function HoldersTable({ vm, page, pager }: { vm: TokenTerminalVM; page: TerminalData['holders']; pager?: Pager }) {
  const cols: Column<IndexedHolder>[] = [
    { key: 'rank', header: '#', cell: (h, i) => <span className="font-mono font-bold text-slate-400">{h.rank ?? i + 1}</span> },
    { key: 'wallet', header: 'Wallet', cell: (h) => <span className="rp-holder"><AddressChip value={h.address} label="holder"/>{h.role && ROLE_LABEL[h.role] && <span className="rp-badge rp-role" data-role={h.role}>{ROLE_LABEL[h.role]}</span>}{h.address === vm.addresses.creator && <span className="rp-badge rp-role">Creator</span>}</span> },
    { key: 'balance', header: 'Balance', align: 'right', cell: (h) => <span className="font-mono tabular-nums">{formatRawCompact(h.balanceRaw, vm.baseDecimals)} {vm.symbol}</span> },
    { key: 'pct', header: '% supply', align: 'right', cell: (h) => <span className="font-mono tabular-nums">{h.supplyBps != null ? formatBps(h.supplyBps) : '—'}</span> },
    { key: 'value', header: 'Value', align: 'right', priority: 2, cell: (h) => vm.price.x18 ? <span className="font-mono tabular-nums">{formatRawCompact(holderValueRaw(h.balanceRaw, vm.price.x18, vm.quote.decimals, vm.baseDecimals), vm.quote.decimals)} {vm.quote.symbol}</span> : '—' },
  ];
  if (page.status === 'loading' && !page.rows.length) return <TableSkeleton/>;
  return <DataTable caption={`Holders of ${vm.symbol}`} columns={cols} rows={page.rows.filter((h) => !/^0x0{40}$/.test(h.address))} rowKey={(h) => h.address}
    empty={page.status === 'error' ? <ErrorState title="Holders unavailable" text="Indexed holder balances could not be loaded." onRetry={pager?.first}/> : <EmptyState title="No holders indexed" text="Holder balances appear after the first indexed transfer."/>}
    footer={<PagerBar pager={pager} status={page.status} complete={page.nextCursor === null}/>}/>;
}

function OrdersTable({ vm, page }: { vm: TokenTerminalVM; page: TerminalData['orders'] }) {
  const [filter, setFilter] = useState<'open' | 'filled' | 'cancelled'>('open');
  if (!page) return <EmptyState title="No orderbook yet" text="Orders are available after graduation to Kuru."/>;
  const match = (o: IndexedOrder) => filter === 'open' ? (o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED') : filter === 'filled' ? o.status === 'FILLED' : o.status === 'CANCELLED';
  const cols: Column<IndexedOrder>[] = [
    { key: 'side', header: 'Side', cell: (o) => <span className={`font-mono font-bold text-xs ${o.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>{o.side === 'buy' ? 'Buy' : 'Sell'}</span> },
    { key: 'price', header: 'Limit price', align: 'right', cell: (o) => <span className="font-mono tabular-nums">{formatPriceX18(o.priceX18)} {vm.quote.symbol}</span> },
    { key: 'size', header: 'Size', align: 'right', cell: (o) => <span className="font-mono tabular-nums">{formatRawCompact(orderSizeRaw(o.originalSizeUnits, o.baseDecimals, o.sizePrecision), o.baseDecimals)}</span> },
    { key: 'filled', header: 'Filled', align: 'right', priority: 2, cell: (o) => <span className="font-mono tabular-nums">{formatRawCompact(orderSizeRaw((BigInt(o.originalSizeUnits) - BigInt(o.remainingSizeUnits)).toString(), o.baseDecimals, o.sizePrecision), o.baseDecimals)}</span> },
    { key: 'status', header: 'Status', cell: (o) => <span className="font-mono text-xs">{o.status.replaceAll('_', ' ').toLowerCase()}</span> },
    { key: 'created', header: 'Created', priority: 3, cell: (o) => <span className="font-mono text-xs text-slate-400">{ageFrom(o.createdAt, vm.now)}</span> },
    { key: 'id', header: 'Order ID', priority: 3, cell: (o) => <span className="rp-mono font-mono text-xs">#{o.orderId}</span> },
    { key: 'cancel', header: <span className="rp-sr">Actions</span>, cell: () => <button className="rp-btn rp-btn-ghost rp-btn-sm" disabled title="DEMO: no transaction is sent">Cancel</button> },
  ];
  return (
    <div className="flex flex-col gap-2">
      <SegmentedControl label="Order status" size="sm" value={filter} onChange={setFilter} options={[{ value: 'open', label: 'Open' }, { value: 'filled', label: 'Filled' }, { value: 'cancelled', label: 'Cancelled' }]}/>
      <DataTable caption="Your orders" columns={cols} rows={page.rows.filter(match)} rowKey={(o) => o.orderId}
        empty={<EmptyState title={`No ${filter} orders`} text={vm.dataMode === 'demo' ? 'SIMULATED order history for the demo wallet.' : undefined}/>}/>
      {vm.dataMode === 'demo' && <p className="rp-note"><DemoBadge text="SIMULATED"/> Orders belong to the demo wallet. Cancel is disabled in demo mode.</p>}
    </div>
  );
}

function ProtocolPanel({ vm }: { vm: TokenTerminalVM }) {
  const a = vm.addresses, e = vm.economics, q = vm.quote.symbol;
  const groups: Array<[string, string, Array<[string, ReactNode, string?]>]> = [
    ['Launch', 'Contracts that created and hold this launch.', [['Token', <AddressChip value={a.token} label="token"/>], ['Curve', <AddressChip value={a.curve} label="curve"/>], ['Factory', <AddressChip value={a.factory} label="factory"/>], ['Coordinator', <AddressChip value={a.coordinator} label="coordinator"/>, 'Moves liquidity from the curve to the mature venue at graduation.']]],
    ['Economics', 'Fees read from the launch configuration.', [['Quote asset', vm.quote.native ? 'MON (native)' : <span>{q} <AddressChip value={a.quoteAsset} label="quote asset"/></span>], ['Curve fee', e.curveFeeBps !== null ? formatBps(e.curveFeeBps) : 'Syncing…'], ['Creator fee', e.creatorFeeBps !== null ? formatBps(e.creatorFeeBps) : 'Syncing…', 'Fee routed to the creator fee recipient on each curve trade.'], ['Creator fee recipient', <AddressChip value={a.creatorFeeRecipient} label="creator fee recipient"/>], ['Buyback', e.buybackEnabled === null ? 'Syncing…' : e.buybackEnabled ? 'Enabled' : 'Disabled'], ['Quote policy', e.policy ?? 'Syncing…']]],
    ['Graduation', 'Where trading continues after the curve completes.', [['Phase', lifecycleLabel[vm.lifecycle]], ['Threshold', e.graduationThresholdRaw ? `${formatRaw(e.graduationThresholdRaw, vm.quote.decimals, 2)} ${q}` : 'Syncing…'], ['Venue', vm.venue === 'KURU' || vm.lifecycle !== 'GRADUATED' ? 'Kuru orderbook' : 'Unsupported venue'], ['Kuru market', a.market ? <AddressChip value={a.market} label="Kuru market"/> : <span className="rp-muted">After graduation</span>], ['Vault', a.vault ? <AddressChip value={a.vault} label="vault"/> : <span className="rp-muted">After graduation</span>], ['Liquidity lock', a.lpLock ? <AddressChip value={a.lpLock} label="liquidity lock"/> : <span className="rp-muted">After graduation</span>], ['Excess lock', a.excessLock ? <AddressChip value={a.excessLock} label="excess lock"/> : <span className="rp-muted">After graduation</span>]]],
    ['Verification', 'Provenance of the data on this page.', [['Network', vm.dataMode === 'demo' ? <span>DEMO fixture <DemoBadge text="SIMULATED"/></span> : 'Monad Testnet · chain 10143'], ['Source', vm.dataMode === 'demo' ? `Fixture ${vm.fixtureVersion}` : 'Deployed RetroPick V2 contracts + Monad event indexer'], ['Indexer', <FreshnessIndicator freshness={vm.freshness} demo={vm.dataMode === 'demo'}/>], ['Explorer', vm.dataMode === 'demo' ? <span className="rp-muted">Not deployed</span> : <a className="rp-link" href={`https://testnet.monadexplorer.com/address/${a.token}`} target="_blank" rel="noreferrer">Monad Explorer</a>]]],
  ];
  return (
    <div className="rp-protocol">
      {groups.map(([title, text, rows]) => (
        <section key={title} className="rp-protocol-group" aria-labelledby={`proto-${title}`}>
          <h3 id={`proto-${title}`}>{title}</h3><p className="rp-muted">{text}</p>
          <dl>{rows.map(([k, v, hint]) => <div key={k} className="rp-row"><dt>{k}{hint && <InfoHint text={hint} label={`About ${k}`}/>}</dt><dd>{v}</dd></div>)}</dl>
        </section>
      ))}
    </div>
  );
}

function MarketDepth({ vm, depth }: { vm: TokenTerminalVM; depth: TerminalDepth | null }) {
  if (!depth) return null;
  const q = vm.quote.symbol;
  const ladder = depth.ladder;
  const empty = depth.status === 'ready' && (!ladder || (!ladder.asks.length && !ladder.bids.length));
  const maxCumulative = ladder ? [ladder.asks.at(-1)?.cumulativeRaw ?? 0n, ladder.bids.at(-1)?.cumulativeRaw ?? 0n].reduce((a, b) => a > b ? a : b) : 0n;

  return (
    <div className="flex flex-col justify-between h-full font-mono text-xs" data-testid="depth-panel">
      {/* Top Header: Orderbook / Trades Tab toggle & Precision controls */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 font-sans">
          <span className="font-bold text-white text-xs border-b border-[#836ef9] pb-0.5">Orderbook</span>
          <span className="text-slate-500 hover:text-white text-xs cursor-pointer">Trades</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">0.0001 ⌄</span>
          <span className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">{q} ⌄</span>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 py-1.5 text-[10px] text-slate-500 font-semibold uppercase tracking-wider border-b border-white/[0.04]">
        <span>Price ({q})</span>
        <span className="text-right">Size ({vm.symbol})</span>
        <span className="text-right">Total</span>
      </div>

      {depth.status === 'loading' && <div role="status" aria-label="Loading orderbook depth">{Array.from({ length: 5 }, (_, i) => <SkeletonLine key={i} height={16}/>)}</div>}
      {empty && <div className="p-4 text-center text-slate-500 text-xs">No resting limit orders in depth</div>}

      {depth.status === 'ready' && ladder && !empty && (
        <div className="flex flex-col justify-between flex-1 py-1">
          {/* Asks (Sell Orders - Red) */}
          <ul className="flex flex-col gap-0.5 list-none p-0 m-0" data-side="ask">
            {[...ladder.asks].reverse().slice(0, 6).map((level) => (
              <DepthRow key={level.priceX18.toString()} level={level} vm={vm} maxCumulative={maxCumulative} side="ask"/>
            ))}
          </ul>

          {/* Center Spread Banner */}
          <div className="py-2 my-1 px-2 rounded bg-white/[0.02] border-y border-white/[0.04] flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-300">
            <span className="text-emerald-400 font-bold">{vm.price.x18 ? formatPriceX18(vm.price.x18) : '0.000060'}</span>
            <span className="text-slate-500 text-[10px] uppercase">Spread 0.28%</span>
          </div>

          {/* Bids (Buy Orders - Green) */}
          <ul className="flex flex-col gap-0.5 list-none p-0 m-0" data-side="bid">
            {ladder.bids.slice(0, 6).map((level) => (
              <DepthRow key={level.priceX18.toString()} level={level} vm={vm} maxCumulative={maxCumulative} side="bid"/>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DepthRow({ level, vm, maxCumulative, side }: { level: { priceX18: bigint; sizeRaw: bigint; cumulativeRaw: bigint }; vm: TokenTerminalVM; maxCumulative: bigint; side: 'ask' | 'bid' }) {
  const pct = maxCumulative > 0n ? Number(level.cumulativeRaw * 10000n / maxCumulative) / 100 : 0;
  return (
    <li className="relative grid grid-cols-3 py-0.5 px-1 items-center text-[11px] font-mono tabular-nums group overflow-hidden">
      <span 
        className={`absolute inset-y-0 right-0 opacity-15 pointer-events-none transition-all ${
          side === 'ask' ? 'bg-rose-500' : 'bg-emerald-500'
        }`}
        style={{ width: `${Math.min(100, Math.max(5, pct))}%` }} 
        aria-hidden="true"
      />
      <span className={`font-semibold z-10 ${side === 'ask' ? 'text-rose-400' : 'text-emerald-400'}`}>
        {formatPriceX18(level.priceX18.toString())}
      </span>
      <span className="text-right text-slate-300 z-10">
        {formatRawCompact(level.sizeRaw, vm.baseDecimals)}
      </span>
      <span className="text-right text-slate-400 z-10">
        {formatRawCompact(level.cumulativeRaw, vm.baseDecimals)}
      </span>
    </li>
  );
}

function TableSkeleton() {
  return <div className="rp-table-skel" aria-label="Loading rows" role="status">{Array.from({ length: 6 }, (_, i) => <SkeletonLine key={i} height={18}/>)}</div>;
}
