// Shared token terminal (Sections 3, 5, 14–19, 25, 27). Renders DEMO fixtures and LIVE indexer/chain view models
// through the same presentational tree; the ticket and live-only tabs are injected by the route.
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Tabs as RTabs } from 'radix-ui';
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Globe, MessageCircle, Send, Twitter } from 'lucide-react';
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

export function TokenTerminal({ vm, data, chart, ticket, depth, tab, onTab, tradesPager, holdersPager, ordersPanel, onRetry, backHref = '/launchpad' }: {
  vm: TokenTerminalVM; data: TerminalData; chart: ChartControls; ticket: ReactNode; depth?: TerminalDepth | null;
  tab: TerminalTab; onTab: (t: TerminalTab) => void; tradesPager?: Pager; holdersPager?: Pager; ordersPanel?: ReactNode; onRetry?: () => void; backHref?: string;
}) {
  const demo = vm.dataMode === 'demo';
  const mobile = useMediaQuery('(max-width: 767px)');
  const [sheet, setSheet] = useState(false);
  const dir = changeDirection(vm.change24hBps);
  const q = vm.quote.symbol;
  const kuruOrders = vm.lifecycle === 'GRADUATED' && vm.venue === 'KURU';
  const tabs: Array<{ value: TerminalTab; disabled?: string }> = [{ value: 'Trades' }, { value: 'Holders' }, { value: 'Protocol' }, { value: 'Orders', disabled: kuruOrders ? undefined : 'Orders are available after graduation to Kuru.' }];
  useEffect(() => { if (tab === 'Orders' && !kuruOrders) onTab('Trades'); }, [tab, kuruOrders, onTab]);

  return <div className="rp-terminal" data-testid="token-terminal" data-data-mode={vm.dataMode} data-lifecycle={vm.lifecycle} data-fixture-version={vm.fixtureVersion}>
    <Link className="rp-back" href={backHref}><ArrowLeft size={14} aria-hidden/>Launches</Link>

    <header className="rp-head">
      <TokenIdentity name={vm.name} symbol={vm.symbol} icon={vm.icon} logo={vm.logo} quote={{ address: vm.addresses.quoteAsset, symbol: q }} size="lg">
        <div className="rp-meta">
          {demo && <DemoBadge/>}
          <LifecycleBadge lifecycle={vm.lifecycle}/>
          <PairBadge base={vm.symbol} quote={q}/>
          <span>by <AddressChip value={vm.addresses.creator} label="creator"/></span>
          <span title={vm.createdAt ? new Date(vm.createdAt * 1000).toISOString() : undefined}>{vm.createdAt ? `${ageFrom(vm.createdAt, vm.now)} old` : '—'}</span>
          <AddressChip value={vm.addresses.token} label="token"/>
        </div>
      </TokenIdentity>
      <div className="rp-price" aria-live="off">
        <div className="rp-price-label">Price{demo && ' · SIMULATED'}</div>
        <div className="rp-price-main" data-testid="token-price">{vm.price.x18 ? <>{formatPriceX18(vm.price.x18)}<span className="rp-price-unit">{q}</span></> : <span className="rp-muted">—</span>}</div>
        <div className="rp-price-sub">
          <span className={cx('rp-change', `rp-${dir}`)} data-testid="token-change">{dir === 'up' ? <ArrowUpRight size={14} aria-hidden/> : dir === 'down' ? <ArrowDownRight size={14} aria-hidden/> : null}{dir === 'none' ? '—' : formatBps(vm.change24hBps, true)}<span className="rp-sr">{dir === 'up' ? ' increase' : dir === 'down' ? ' decrease' : ''}</span> <small>24h</small></span>
          <span className="rp-mcap">MCap <strong>{formatRawCompact(vm.marketCapRaw, vm.quote.decimals)}</strong> {vm.marketCapRaw ? q : ''}</span>
        </div>
        <small className="rp-muted">{vm.price.source}</small>
      </div>
    </header>

    {(vm.sync.indexer === 'stale' || vm.sync.indexer === 'unavailable') && <div className="rp-banner" role="status"><FreshnessIndicator freshness={vm.freshness} demo={demo}/><span>{vm.sync.message ?? 'Indexed history may be behind. Trading reads current on-chain state.'}</span>{onRetry && <button className="rp-link" onClick={onRetry}>Retry</button>}</div>}

    <BondingProgress progressBps={vm.bondingProgressBps} goalRaw={vm.economics.graduationThresholdRaw} decimals={vm.quote.decimals} symbol={q} graduated={vm.lifecycle === 'GRADUATED'}/>
    {vm.lifecycle === 'GRADUATED' && !kuruOrders && <p className="rp-note">This market graduated to Uniswap V4. An AMM venue has no resting orderbook; this release supports orderbook trading on Kuru.</p>}
    <div className="rp-grid">
      <section className="rp-chart-panel" aria-label="Price chart">
        <ChartToolbar chart={chart} truncated={data.candles.nextCursor !== null}/>
        <div className="rp-chart-box">
          {data.candles.status === 'loading' && !data.candles.rows.length ? <div className="rp-chart-loading"><SkeletonLine height={300} label="Loading chart"/></div>
            : data.candles.status === 'error' ? <ErrorState title="Chart history unavailable" text="Price history could not be loaded. On-chain trading is unaffected." onRetry={onRetry}/>
            : <Suspense fallback={<div className="rp-chart-loading"><SkeletonLine height={300} label="Loading chart"/></div>}>
              <TradingChart candles={data.candles.rows} quoteDecimals={vm.quote.decimals} quoteSymbol={q} mode={chart.mode} graduationTimestamp={vm.graduationTimestamp} emptyText={`No confirmed trades in the last ${RANGE_LABELS[chart.range]}.`}/>
            </Suspense>}
        </div>
        <div className="rp-chart-foot"><FreshnessIndicator freshness={vm.freshness} demo={demo}/><span>{demo ? 'SIMULATED candles from a deterministic fixture.' : 'Candles from confirmed executed trades.'}</span></div>
      </section>
      {!mobile && <aside className="rp-rail" aria-label="Trade">{kuruOrders && <MarketDepth vm={vm} depth={depth ?? null}/>}<div className="rp-ticket-pair"><PairIdentity name={vm.name} symbol={vm.symbol} logo={vm.logo} quoteAddress={vm.addresses.quoteAsset} quoteSymbol={q} compact/></div>{ticket}</aside>}
    </div>

    {mobile && kuruOrders && <MarketDepth vm={vm} depth={depth ?? null}/>}

    <MetricStrip label="Key metrics">
      <Metric testId="metric-mcap" label="Market cap" value={formatRawCompact(vm.marketCapRaw, vm.quote.decimals)} unit={q} definition="Price × total supply, in the quote asset."/>
      <Metric testId="metric-holders" label="Holders" value={vm.holderCount ?? '—'} definition="Addresses with a non-zero balance, from indexed Transfer events (includes protocol contracts)."/>
      <Metric testId="metric-trades" label="Trades 24h" value={vm.trades24h ?? '—'} definition="Confirmed executed trades in the last 24 hours. A lifetime trade count is not indexed yet."/>
      <Metric testId="metric-supply" label="Supply" value={formatRawCompact(vm.supplyRaw, vm.baseDecimals)} unit={vm.symbol}/>
      <Metric testId="metric-creator" label="Creator earned" value={vm.creatorEarnedRaw ? formatRawCompact(vm.creatorEarnedRaw, vm.quote.decimals) : '—'} unit={q} definition="Per-launch creator earnings are not exposed by the indexer yet. See Earn for your claimable balance."/>
    </MetricStrip>
    <MetricStrip label="Market analytics" variant="secondary">
      <Metric label="Liquidity" value={formatRawCompact(vm.liquidityRaw, vm.quote.decimals)} unit={q} note={vm.liquidityNote}/>
      <Metric label="Volume 24h" value={formatRawCompact(vm.volume24hRaw, vm.quote.decimals)} unit={q}/>
      <Metric label="Lifetime volume" value={formatRawCompact(vm.lifetimeVolumeRaw, vm.quote.decimals)} unit={q}/>
      <Metric label="Curve progress" value={vm.lifecycle === 'ACTIVE' && vm.bondingProgressBps !== null ? formatBps(vm.bondingProgressBps) : vm.lifecycle === 'PENDING_CONFIRMATION' ? '—' : 'Complete'} definition="Quote reserve relative to the graduation threshold."/>
    </MetricStrip>

    <section className="rp-contracts" aria-label="Contracts">
      <div><span>Token</span><AddressChip value={vm.addresses.token} label="token"/></div>
      <div><span>Curve</span><AddressChip value={vm.addresses.curve} label="curve"/></div>
      <div><span>Launched</span>{vm.txs.launch ? <AddressChip value={vm.txs.launch} kind="tx" label="launch transaction"/> : <span className="rp-muted">—</span>}</div>
      <div><span>Graduated</span>{vm.txs.graduation ? <AddressChip value={vm.txs.graduation} kind="tx" label="graduation transaction"/> : <span className="rp-muted">{vm.lifecycle === 'GRADUATED' ? '—' : 'Not yet'}</span>}</div>
    </section>

    <section className="rp-about" aria-labelledby="rp-about-h">
      <h2 id="rp-about-h">About</h2>
      <p>{vm.description || <span className="rp-muted">The creator has not provided a description.</span>}</p>
      <Socials socials={vm.socials}/>
    </section>

    {vm.addresses.token && <MarketRadarPanel token={vm.addresses.token} quoteSymbol={q}/>}

    <RTabs.Root className="rp-tabs" value={tab} onValueChange={(v) => onTab(v as TerminalTab)}>
      <RTabs.List className="rp-tablist" aria-label="Token data">
        {tabs.map((t) => <RTabs.Trigger key={t.value} value={t.value} disabled={!!t.disabled} title={t.disabled} className="rp-tab">{t.value}{t.value === 'Holders' && vm.holderCount !== null ? <span className="rp-count">{vm.holderCount}</span> : null}</RTabs.Trigger>)}
      </RTabs.List>
      <RTabs.Content value="Trades" className="rp-tabpanel"><TradesTable vm={vm} page={data.trades} pager={tradesPager}/></RTabs.Content>
      <RTabs.Content value="Holders" className="rp-tabpanel"><HoldersTable vm={vm} page={data.holders} pager={holdersPager}/></RTabs.Content>
      <RTabs.Content value="Protocol" className="rp-tabpanel"><ProtocolPanel vm={vm}/></RTabs.Content>
      <RTabs.Content value="Orders" className="rp-tabpanel">{ordersPanel ?? <OrdersTable vm={vm} page={data.orders}/>}</RTabs.Content>
    </RTabs.Root>

    {mobile && <>
      <div className="rp-mobile-trade" data-testid="mobile-trade-bar">
        <div><strong>{vm.price.x18 ? `${formatPriceX18(vm.price.x18)} ${q}` : '—'}</strong><small>{vm.sync.onchain === 'syncing' ? (vm.sync.message ?? 'Syncing on-chain state…') : `${lifecycleLabel[vm.lifecycle]}${demo ? ' · DEMO' : ''}`}</small></div>
        <button className="rp-btn rp-btn-primary" onClick={() => setSheet(true)}>Trade</button>
      </div>
      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="bottom" className="rp-sheet">
          <SheetTitle className="rp-sr">Trade {vm.symbol}</SheetTitle>
          <SheetDescription className="rp-sr">Order ticket for {vm.name}</SheetDescription>
          <div className="rp-ticket-pair"><PairIdentity name={vm.name} symbol={vm.symbol} logo={vm.logo} quoteAddress={vm.addresses.quoteAsset} quoteSymbol={q} compact/></div>{ticket}
        </SheetContent>
      </Sheet>
    </>}
  </div>;
}

function ChartToolbar({ chart, truncated }: { chart: ChartControls; truncated: boolean }) {
  return <div className="rp-chart-toolbar" role="toolbar" aria-label="Chart controls">
    <SegmentedControl label="Chart type" size="sm" value={chart.mode} onChange={chart.setMode} options={[{ value: 'Line', label: 'Line' }, { value: 'Candles', label: 'Candles' }]}/>
    <SegmentedControl label="Time range" size="sm" value={chart.range} onChange={chart.setRange} options={(Object.keys(RANGE_LABELS) as ChartRange[]).map((r) => ({ value: r, label: RANGE_LABELS[r] }))}/>
    <SegmentedControl label="Candle interval" size="sm" value={chart.interval} onChange={chart.setInterval}
      options={(['1m', '5m', '15m', '1h'] as CandleInterval[]).map((i) => ({ value: i, label: i, disabled: !RANGE_INTERVALS[chart.range].includes(i), reason: `${i} candles are not offered for the ${RANGE_LABELS[chart.range]} range (one page must cover the full range).` }))}/>
    {truncated && <span className="rp-note">Showing the most recent page of candles</span>}
  </div>;
}

function Socials({ socials }: { socials: TokenTerminalVM['socials'] }) {
  const items = ([['website', Globe, 'Website'], ['twitter', Twitter, 'X / Twitter'], ['telegram', Send, 'Telegram'], ['discord', MessageCircle, 'Discord'], ['farcaster', MessageCircle, 'Farcaster']] as const)
    .filter(([key]) => !!socials[key] && /^https:\/\//.test(socials[key]!));
  if (!items.length) return null;
  return <ul className="rp-socials">{items.map(([key, Icon, label]) => <li key={key}><a href={socials[key]} target="_blank" rel="noreferrer noopener" aria-label={label}><Icon size={15} aria-hidden/></a></li>)}</ul>;
}

function PagerBar({ pager, status, complete }: { pager?: Pager; status: string; complete: boolean }) {
  return <div className="rp-pager">
    {status === 'error' && <span role="alert">History unavailable. <button className="rp-link" onClick={pager?.first}>Retry</button></span>}
    <span className="rp-muted">{complete ? 'End of list' : 'More rows available'}</span>
    {pager?.hasPrev && <button className="rp-btn rp-btn-ghost rp-btn-sm" onClick={pager.first}>First page</button>}
    {pager?.hasNext && <button className="rp-btn rp-btn-ghost rp-btn-sm" onClick={pager.next}>Next page</button>}
  </div>;
}

function TradesTable({ vm, page, pager }: { vm: TokenTerminalVM; page: TerminalData['trades']; pager?: Pager }) {
  const q = vm.quote.symbol;
  const cols: Column<IndexedTrade>[] = [
    { key: 'side', header: 'Side', cell: (t) => <span className={cx('rp-side-tag', t.side === 'buy' ? 'rp-up' : 'rp-down')}>{t.side === 'buy' ? 'Buy' : 'Sell'}</span> },
    { key: 'trader', header: 'Trader', cell: (t) => <AddressChip value={t.actor} label="trader"/> },
    { key: 'quote', header: q, align: 'right', cell: (t) => formatRaw(t.quoteRaw, vm.quote.decimals, 4) },
    { key: 'token', header: vm.symbol, align: 'right', priority: 2, cell: (t) => formatRawCompact(t.tokensRaw, vm.baseDecimals) },
    { key: 'price', header: 'Price', align: 'right', priority: 2, cell: (t) => formatPriceX18(t.priceX18 ?? t.priceRaw) },
    { key: 'venue', header: 'Venue', priority: 3, cell: (t) => t.venue === 'KURU' ? 'Kuru' : 'Curve' },
    { key: 'age', header: 'Age', align: 'right', cell: (t) => /^0x/.test(t.transactionHash) ? <a className="rp-link" href={`https://testnet.monadexplorer.com/tx/${t.transactionHash}`} target="_blank" rel="noreferrer" title="Open transaction">{ageFrom(t.timestamp, vm.now)}</a> : ageFrom(t.timestamp, vm.now) },
  ];
  if (page.status === 'loading' && !page.rows.length) return <TableSkeleton/>;
  return <DataTable caption={`Recent trades for ${vm.symbol}`} columns={cols} rows={page.rows} rowKey={(t) => t.id} rowTone={(t) => t.side}
    empty={page.status === 'error' ? <ErrorState title="Trades unavailable" text="Indexed trade history could not be loaded." onRetry={pager?.first}/> : <EmptyState title="No trades yet" text="Trades appear here after confirmation and indexing."/>}
    footer={<PagerBar pager={pager} status={page.status} complete={page.nextCursor === null}/>}/>;
}

function HoldersTable({ vm, page, pager }: { vm: TokenTerminalVM; page: TerminalData['holders']; pager?: Pager }) {
  const cols: Column<IndexedHolder>[] = [
    { key: 'rank', header: '#', cell: (h, i) => h.rank ?? i + 1 },
    { key: 'wallet', header: 'Wallet', cell: (h) => <span className="rp-holder"><AddressChip value={h.address} label="holder"/>{h.role && ROLE_LABEL[h.role] && <span className="rp-badge rp-role" data-role={h.role}>{ROLE_LABEL[h.role]}</span>}{h.address === vm.addresses.creator && <span className="rp-badge rp-role">Creator</span>}</span> },
    { key: 'balance', header: 'Balance', align: 'right', cell: (h) => `${formatRawCompact(h.balanceRaw, vm.baseDecimals)} ${vm.symbol}` },
    { key: 'pct', header: '% supply', align: 'right', cell: (h) => h.supplyBps != null ? formatBps(h.supplyBps) : '—' },
    { key: 'value', header: 'Value', align: 'right', priority: 2, cell: (h) => vm.price.x18 ? `${formatRawCompact(holderValueRaw(h.balanceRaw, vm.price.x18, vm.quote.decimals, vm.baseDecimals), vm.quote.decimals)} ${vm.quote.symbol}` : '—' },
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
    { key: 'side', header: 'Side', cell: (o) => <span className={cx('rp-side-tag', o.side === 'buy' ? 'rp-up' : 'rp-down')}>{o.side === 'buy' ? 'Buy' : 'Sell'}</span> },
    { key: 'price', header: 'Limit price', align: 'right', cell: (o) => `${formatPriceX18(o.priceX18)} ${vm.quote.symbol}` },
    { key: 'size', header: 'Size', align: 'right', cell: (o) => formatRawCompact(orderSizeRaw(o.originalSizeUnits, o.baseDecimals, o.sizePrecision), o.baseDecimals) },
    { key: 'filled', header: 'Filled', align: 'right', priority: 2, cell: (o) => formatRawCompact(orderSizeRaw((BigInt(o.originalSizeUnits) - BigInt(o.remainingSizeUnits)).toString(), o.baseDecimals, o.sizePrecision), o.baseDecimals) },
    { key: 'status', header: 'Status', cell: (o) => o.status.replaceAll('_', ' ').toLowerCase() },
    { key: 'created', header: 'Created', priority: 3, cell: (o) => ageFrom(o.createdAt, vm.now) },
    { key: 'id', header: 'Order ID', priority: 3, cell: (o) => <span className="rp-mono">#{o.orderId}</span> },
    { key: 'cancel', header: <span className="rp-sr">Actions</span>, cell: () => <button className="rp-btn rp-btn-ghost rp-btn-sm" disabled title="DEMO: no transaction is sent">Cancel</button> },
  ];
  return <div>
    <SegmentedControl label="Order status" size="sm" value={filter} onChange={setFilter} options={[{ value: 'open', label: 'Open' }, { value: 'filled', label: 'Filled' }, { value: 'cancelled', label: 'Cancelled' }]}/>
    <DataTable caption="Your orders" columns={cols} rows={page.rows.filter(match)} rowKey={(o) => o.orderId}
      empty={<EmptyState title={`No ${filter} orders`} text={vm.dataMode === 'demo' ? 'SIMULATED order history for the demo wallet.' : undefined}/>}/>
    {vm.dataMode === 'demo' && <p className="rp-note"><DemoBadge text="SIMULATED"/> Orders belong to the demo wallet. Cancel is disabled in demo mode.</p>}
  </div>;
}

function ProtocolPanel({ vm }: { vm: TokenTerminalVM }) {
  const a = vm.addresses, e = vm.economics, q = vm.quote.symbol;
  const groups: Array<[string, string, Array<[string, ReactNode, string?]>]> = [
    ['Launch', 'Contracts that created and hold this launch.', [['Token', <AddressChip value={a.token} label="token"/>], ['Curve', <AddressChip value={a.curve} label="curve"/>], ['Factory', <AddressChip value={a.factory} label="factory"/>], ['Coordinator', <AddressChip value={a.coordinator} label="coordinator"/>, 'Moves liquidity from the curve to the mature venue at graduation.']]],
    ['Economics', 'Fees read from the launch configuration.', [['Quote asset', vm.quote.native ? 'MON (native)' : <span>{q} <AddressChip value={a.quoteAsset} label="quote asset"/></span>], ['Curve fee', e.curveFeeBps !== null ? formatBps(e.curveFeeBps) : 'Syncing…'], ['Creator fee', e.creatorFeeBps !== null ? formatBps(e.creatorFeeBps) : 'Syncing…', 'Fee routed to the creator fee recipient on each curve trade.'], ['Creator fee recipient', <AddressChip value={a.creatorFeeRecipient} label="creator fee recipient"/>], ['Buyback', e.buybackEnabled === null ? 'Syncing…' : e.buybackEnabled ? 'Enabled' : 'Disabled'], ['Quote policy', e.policy ?? 'Syncing…']]],
    ['Graduation', 'Where trading continues after the curve completes.', [['Phase', lifecycleLabel[vm.lifecycle]], ['Threshold', e.graduationThresholdRaw ? `${formatRaw(e.graduationThresholdRaw, vm.quote.decimals, 2)} ${q}` : 'Syncing…'], ['Venue', vm.venue === 'KURU' || vm.lifecycle !== 'GRADUATED' ? 'Kuru orderbook' : 'Unsupported venue'], ['Kuru market', a.market ? <AddressChip value={a.market} label="Kuru market"/> : <span className="rp-muted">After graduation</span>], ['Vault', a.vault ? <AddressChip value={a.vault} label="vault"/> : <span className="rp-muted">After graduation</span>], ['Liquidity lock', a.lpLock ? <AddressChip value={a.lpLock} label="liquidity lock"/> : <span className="rp-muted">After graduation</span>], ['Excess lock', a.excessLock ? <AddressChip value={a.excessLock} label="excess lock"/> : <span className="rp-muted">After graduation</span>]]],
    ['Verification', 'Provenance of the data on this page.', [['Network', vm.dataMode === 'demo' ? <span>DEMO fixture <DemoBadge text="SIMULATED"/></span> : 'Monad Testnet · chain 10143'], ['Source', vm.dataMode === 'demo' ? `Fixture ${vm.fixtureVersion}` : 'Deployed RetroPick V2 contracts + Monad event indexer'], ['Indexer', <FreshnessIndicator freshness={vm.freshness} demo={vm.dataMode === 'demo'}/>], ['Explorer', vm.dataMode === 'demo' ? <span className="rp-muted">Not deployed</span> : <a className="rp-link" href={`https://testnet.monadexplorer.com/address/${a.token}`} target="_blank" rel="noreferrer">Monad Explorer</a>]]],
  ];
  return <div className="rp-protocol">{groups.map(([title, text, rows]) => <section key={title} className="rp-protocol-group" aria-labelledby={`proto-${title}`}>
    <h3 id={`proto-${title}`}>{title}</h3><p className="rp-muted">{text}</p>
    <dl>{rows.map(([k, v, hint]) => <div key={k} className="rp-row"><dt>{k}{hint && <InfoHint text={hint} label={`About ${k}`}/>}</dt><dd>{v}</dd></div>)}</dl>
  </section>)}</div>;
}

/** Aggregated resting-order depth around the spread. Display-only; read from the on-chain L2
 *  book (live) or the fixture book (demo). Never used as an execution quote. */
function MarketDepth({ vm, depth }: { vm: TokenTerminalVM; depth: TerminalDepth | null }) {
  if (!depth) return null;
  const q = vm.quote.symbol;
  const ladder = depth.ladder;
  const empty = depth.status === 'ready' && (!ladder || (!ladder.asks.length && !ladder.bids.length));
  const maxCumulative = ladder ? [ladder.asks.at(-1)?.cumulativeRaw ?? 0n, ladder.bids.at(-1)?.cumulativeRaw ?? 0n].reduce((a, b) => a > b ? a : b) : 0n;
  return <section className="rp-depth" aria-label="Orderbook depth" data-testid="depth-panel" data-data-mode={vm.dataMode} data-status={depth.status}>
    <header className="rp-depth-head">
      <h3>Orderbook</h3>
      {vm.dataMode === 'demo' ? <DemoBadge text="SIMULATED"/> : depth.block ? <span className="rp-muted">block {depth.block}</span> : null}
    </header>
    {depth.status === 'loading' && <div role="status" aria-label="Loading orderbook depth">{Array.from({ length: 5 }, (_, i) => <SkeletonLine key={i} height={16}/>)}</div>}
    {depth.status === 'stale' && <p className="rp-note" role="status">Orderbook snapshot is stale. The current book is unavailable; this snapshot cannot qualify a market order.</p>}
    {depth.status === 'error' && <p className="rp-note" role="status">Live orderbook depth is unavailable. Trading reads current on-chain state when you place an order.</p>}
    {empty && <EmptyState title="No resting orders" text="The book has no open depth right now. Market orders may fail until liquidity is posted."/>}
    {depth.status === 'ready' && ladder && !empty && <>
      <div className="rp-depth-cols" aria-hidden="true"><span>Price</span><span>{vm.symbol}</span><span>Total</span></div>
      <ul className="rp-depth-side" data-side="ask" aria-label="Asks (lowest ask last)">
        {[...ladder.asks].reverse().slice(0, 7).map((level) => <DepthRow key={level.priceX18.toString()} level={level} vm={vm} maxCumulative={maxCumulative} side="ask"/>)}
      </ul>
      <p className="rp-depth-spread" data-testid="depth-spread">
        {ladder.spreadX18 !== null ? <>Spread <strong>{formatPriceX18(ladder.spreadX18.toString())} {q}</strong>{ladder.midX18 !== null ? <> · mid {formatPriceX18(ladder.midX18.toString())}</> : null}</> : 'No two-sided book — spread unavailable'}
      </p>
      <ul className="rp-depth-side" data-side="bid" aria-label="Bids (highest bid first)">
        {ladder.bids.slice(0, 7).map((level) => <DepthRow key={level.priceX18.toString()} level={level} vm={vm} maxCumulative={maxCumulative} side="bid"/>)}
      </ul>
    </>}
  </section>;
}

function DepthRow({ level, vm, maxCumulative, side }: { level: { priceX18: bigint; sizeRaw: bigint; cumulativeRaw: bigint }; vm: TokenTerminalVM; maxCumulative: bigint; side: 'ask' | 'bid' }) {
  const pct = maxCumulative > 0n ? Number(level.cumulativeRaw * 10000n / maxCumulative) / 100 : 0;
  return <li className="rp-depth-row" data-side={side}>
    <span className="rp-depth-bar" data-side={side} style={{ width: `${pct}%` }} aria-hidden="true"/>
    <span className="rp-depth-price">{formatPriceX18(level.priceX18.toString())}</span>
    <span className="rp-depth-size">{formatRawCompact(level.sizeRaw, vm.baseDecimals)}</span>
    <span className="rp-depth-total">{formatRawCompact(level.cumulativeRaw, vm.baseDecimals)}</span>
  </li>;
}

function TableSkeleton() {
  return <div className="rp-table-skel" aria-label="Loading rows" role="status">{Array.from({ length: 6 }, (_, i) => <SkeletonLine key={i} height={18}/>)}</div>;
}
