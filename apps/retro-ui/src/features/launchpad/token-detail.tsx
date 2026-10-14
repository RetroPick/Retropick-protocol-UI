import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type Address, zeroAddress } from 'viem';
import Link from '@/components/product/safe-link';
import { DATA_MODE, INDEXER_URL } from '@/lib/live/env';
import { resolveMediaSrc } from '@/lib/media/resolve';
import { ticketLaunch, ticketKuru } from '@/lib/live/trade-ticket-inputs';
import { fetchHolders, fetchTrades } from '@/lib/live/indexer-client';
import { launchKeys } from '@/lib/live/queries';
import { useLaunchDetail } from '@/hooks/use-launch-detail';
import { useKuruBook } from '@/hooks/use-kuru-book';
import { useWallet } from '@/wallet/provider';
import { useSearchParams } from '@/lib/next-compat';
import { bondingProgressBps } from '@retropick/launchpad-sdk/graduation';
import { addresses } from '@retropick/launchpad-sdk/chain';
import { EmptyState, ErrorState, SkeletonLine } from '@/components/trading/primitives';
import { TokenTerminal, type TerminalTab } from './terminal/token-terminal';
import { DemoTicket } from './terminal/demo-ticket';
import { LiveOrdersPanel } from './terminal/live-orders';
import { getDemoFixture, parseScenario } from '@/lib/view-models/demo-terminal-fixtures';
import { DEFAULT_INTERVAL, RANGE_SECONDS, aggregateCandles, buildDepthLadder, curveSpotX18, intervalFor, marketCapRaw, type CandleInterval, type ChartRange, type Lifecycle, type TerminalData, type TokenTerminalVM } from '@/lib/view-models/token-terminal';

const Ticket = lazy(() => import('./live-trading-ticket').then((m) => ({ default: m.LiveTradingTicket })));

function useChartControls() {
  const [range, setRangeState] = useState<ChartRange>('24h');
  const [interval, setIntervalState] = useState<CandleInterval>(DEFAULT_INTERVAL['24h']);
  const [mode, setMode] = useState<'Line' | 'Candles'>('Line');
  const setRange = useCallback((r: ChartRange) => { setRangeState(r); setIntervalState((i) => intervalFor(r, i)); }, []);
  return { range, interval, mode, setRange, setInterval: setIntervalState, setMode };
}

const TICKET_FALLBACK = <section className="rp-ticket" aria-label="Trade ticket" data-testid="trade-ticket"><header className="rp-ticket-head"><h2>Trade</h2></header><div className="rp-ticket-sync" role="status">Syncing on-chain state…</div><SkeletonLine height={44}/><SkeletonLine height={44}/><SkeletonLine height={48}/></section>;

/** DEMO route: deterministic fixtures through the shared terminal. Scenario via ?scenario=… (DEMO only). */
function DemoTokenRoute({ id }: { id: string }) {
  const params = useSearchParams();
  const scenario = parseScenario(params.get('scenario'));
  const fixture = useMemo(() => getDemoFixture(id, scenario), [id, scenario]);
  const chart = useChartControls();
  const [tab, setTab] = useState<TerminalTab>('Trades');
  const [tradePage, setTradePage] = useState(0);
  const PAGE = 50;
  const data = useMemo<TerminalData | null>(() => {
    if (!fixture) return null;
    const since = fixture.vm.now / 1000 - RANGE_SECONDS[chart.range];
    const rows = aggregateCandles(fixture.data.candles.rows.filter((c) => c.timestamp >= since), chart.interval);
    const all = fixture.data.trades.rows;
    // Same page size + cursor semantics as the indexer (50 rows, next cursor when more exist).
    const trades = { rows: all.slice(tradePage * PAGE, (tradePage + 1) * PAGE), nextCursor: (tradePage + 1) * PAGE < all.length ? String(tradePage + 1) : null, status: 'ready' as const };
    return { ...fixture.data, trades, candles: { rows, nextCursor: null, status: 'ready' } };
  }, [fixture, chart.range, chart.interval, tradePage]);
  if (!fixture || !data) return <EmptyState title="Token launch not found" text="This demo token is not part of the DEMO fixture set." action={<Link className="rp-btn rp-btn-ghost" href="/launchpad">Back to Launchpad</Link>}/>;
  // Depth (DEMO): the fixture book through the same aggregation the live hook uses.
  const depth = fixture.vm.lifecycle === 'GRADUATED' && fixture.book ? { status: 'ready' as const, ladder: buildDepthLadder(fixture.book), block: '0', observedAt: fixture.vm.now } : null;
  return <TokenTerminal vm={fixture.vm} data={data} chart={chart} depth={depth} tab={tab} onTab={setTab}
    tradesPager={{ hasNext: data.trades.nextCursor !== null, hasPrev: tradePage > 0, next: () => setTradePage((p) => p + 1), first: () => setTradePage(0) }}
    ticket={<DemoTicket key={`${fixture.vm.id}:${scenario}`} fixture={fixture}/>}/>;
}

function LiveTokenRoute({ id }: { id: string }) {
  const wallet = useWallet();
  const chart = useChartControls();
  const [tab, setTab] = useState<TerminalTab>('Trades');
  const [tradeCursor, setTradeCursor] = useState<string | undefined>();
  const [holderCursor, setHolderCursor] = useState<string | undefined>();
  const detail = useLaunchDetail(id, wallet.account ?? undefined, { range: chart.range, resolution: chart.interval, proofEnabled: tab === 'Protocol' });
  // Depth (live): aggregated on-chain L2 book for the graduated Kuru market; null before graduation.
  const market = detail.essential && detail.essential.ledger.phase === 2 ? detail.essential.receipt.market : null;
  const depth = useKuruBook(id, market ?? null, detail.essential?.ledger.phase === 2 && detail.essential.packet.venue === 1);
  const trades = useQuery({ queryKey: launchKeys.resource(id, 'trade-page', { cursor: tradeCursor }), queryFn: ({ signal }) => fetchTrades(INDEXER_URL!, id, { cursor: tradeCursor }, signal), enabled: !!detail.indexed && tab === 'Trades', refetchInterval: tradeCursor ? false : 10000 });
  const holders = useQuery({ queryKey: launchKeys.resource(id, 'holders', { cursor: holderCursor }), queryFn: ({ signal }) => fetchHolders(INDEXER_URL!, id, { cursor: holderCursor }, signal), enabled: !!detail.indexed && tab === 'Holders', refetchInterval: holderCursor ? false : 10000 });

  const vm = useMemo<TokenTerminalVM | null>(() => {
    const indexed = detail.indexed, state = detail.essential, economic = detail.launch, seed = detail.seed;
    const name = state?.name ?? indexed?.name ?? seed?.name;
    if (!name) return null;
    const decimals = state?.packet.quoteDecimals ?? indexed?.quoteDecimals ?? seed?.quoteDecimals ?? 18;
    const baseDecimals = indexed?.baseDecimals ?? 18;
    const quoteAsset = state?.packet.quoteAsset ?? indexed?.quoteAsset ?? null;
    const lifecycle: Lifecycle = state ? state.ledger.phase === 2 ? 'GRADUATED' : state.ledger.phase === 1 ? 'GRADUATING' : detail.readyToGraduate ? 'GRADUATION_READY' : 'ACTIVE' : (indexed?.phase ?? 'PENDING_CONFIRMATION');
    // Price authority (unchanged rules): curve spot from live reserves while bonding; Kuru last trade after graduation.
    let price: string | null = indexed?.priceX18 ?? indexed?.priceRaw ?? null, source = 'Last executed trade';
    if (state?.ledger.phase === 0 && state.reserves[1] > 0n) { price = curveSpotX18(state.reserves[0], state.reserves[1], decimals).toString(); source = 'Current curve spot price'; }
    if (lifecycle === 'GRADUATED' && indexed?.priceSource !== 'KURU_LAST_TRADE') { price = null; source = 'No executed Kuru trade yet'; }
    const mcap = price && state ? marketCapRaw(BigInt(price), state.supply, decimals, baseDecimals).toString() : indexed?.marketCapRaw ?? null;
    const venue = (state ? (state.packet.venue === 1 ? 'KURU' : 'UNSUPPORTED') : indexed?.venue === 'UNISWAP_V4' ? 'UNSUPPORTED' : 'KURU') as TokenTerminalVM['venue'];
    return {
      dataMode: 'live', id: id.toLowerCase(), name, symbol: state?.symbol ?? indexed?.symbol ?? seed?.symbol ?? '', description: state?.description ?? indexed?.description ?? seed?.description ?? '',
      logo: resolveMediaSrc(state?.logo ?? indexed?.logo ?? seed?.logo ?? null), icon: { glyph: (name[0] ?? '◈').toUpperCase(), color: '#836ef9' },
      socials: indexed?.socials ?? {}, createdAt: indexed?.createdAt ? Math.floor(Date.parse(indexed.createdAt) / 1000) : null, now: Date.now(),
      quote: { symbol: indexed?.quoteSymbol ?? seed?.quoteSymbol ?? (quoteAsset === zeroAddress ? 'MON' : 'QUOTE'), decimals, native: quoteAsset === zeroAddress },
      baseDecimals, lifecycle, venue, price: { x18: price, source }, change24hBps: indexed?.change24hBps ?? null,
      marketCapRaw: mcap, liquidityRaw: state?.ledger.phase === 0 ? state.realQuote.toString() : indexed?.liquidityRaw ?? null,
      liquidityNote: lifecycle === 'GRADUATED' ? 'Kuru book depth is not aggregated' : 'Real curve quote reserve',
      volume24hRaw: indexed?.volume24hRaw ?? null, lifetimeVolumeRaw: indexed?.lifetimeVolumeRaw ?? null, trades24h: indexed?.trades24h ?? null, holderCount: indexed?.holderCount ?? null,
      supplyRaw: state ? state.supply.toString() : indexed?.supplyRaw ?? null, creatorEarnedRaw: null, bondingProgressBps: state ? state.ledger.phase === 2 ? 10000 : bondingProgressBps(state.realQuote, state.packet.graduationThreshold) : indexed?.bondingProgressBps ?? null,
      addresses: { token: id, curve: state?.packet.curve ?? indexed?.curve ?? null, factory: addresses.factory ?? null, coordinator: addresses.coordinator ?? null, quoteAsset, creator: state?.creator ?? indexed?.creator ?? seed?.creator ?? null, creatorFeeRecipient: economic?.record.creatorFeeRecipient ?? null, market: state?.receipt.market && state.receipt.market !== zeroAddress ? state.receipt.market : indexed?.market ?? null, vault: state?.receipt.vault && state.receipt.vault !== zeroAddress ? state.receipt.vault : indexed?.vault ?? null, lpLock: state?.ledger.protectedLPReceiver && state.ledger.protectedLPReceiver !== zeroAddress ? state.ledger.protectedLPReceiver : null, excessLock: state?.ledger.protectedExcessReceiver && state.ledger.protectedExcessReceiver !== zeroAddress ? state.ledger.protectedExcessReceiver : null },
      economics: { curveFeeBps: economic ? Number(economic.fee) : null, creatorFeeBps: economic ? Number(economic.tax) : null, policy: state ? `Version ${state.packet.quotePolicyVersion} · ${String(state.packet.quotePolicyHash).slice(0, 10)}…` : null, buybackEnabled: economic ? Boolean(economic.record.buybackEnabled) : null, graduationThresholdRaw: state ? String(state.packet.graduationThreshold) : null },
      txs: { launch: indexed?.launchTransactionHash ?? null, graduation: indexed?.graduationTransactionHash ?? null },
      graduationTimestamp: indexed?.graduationTimestamp ?? null,
      freshness: detail.freshness ? { indexedBlock: String(detail.freshness.indexedBlock), lagBlocks: detail.freshness.lagBlocks, stale: detail.status === 'stale' } : null,
      sync: { onchain: state ? 'ready' : detail.essential === null && detail.error ? 'error' : 'syncing', indexer: detail.pendingConfirmation ? 'pending' : detail.status === 'stale' ? 'stale' : detail.indexed ? 'ready' : 'unavailable', message: detail.pendingConfirmation ? 'Pending indexer confirmation. Trading state is read from chain.' : null },
    };
  }, [id, detail]);

  const data = useMemo<TerminalData>(() => ({
    candles: { rows: detail.candles, nextCursor: null, status: detail.indexed ? 'ready' : detail.status === 'loading' ? 'loading' : 'ready' },
    trades: { rows: trades.data?.data ?? detail.trades, nextCursor: trades.data?.nextCursor ?? null, status: trades.isError ? 'error' : trades.isLoading && !detail.trades.length ? 'loading' : 'ready' },
    holders: { rows: holders.data?.data ?? [], nextCursor: holders.data?.nextCursor ?? null, status: holders.isError ? 'error' : !holders.data ? 'loading' : 'ready' },
    orders: null,
  }), [detail, trades.data, trades.isError, trades.isLoading, holders.data, holders.isError]);

  if (!/^0x[\da-fA-F]{40}$/.test(id)) return <ErrorState title="Invalid token address" text="Token pages use a 0x-prefixed 20-byte address."/>;
  if (!vm) {
    if (detail.status === 'unavailable') return <ErrorState title="Launch unavailable" text={detail.error ?? 'This address is not a RetroPick V2 launch on Monad Testnet.'} onRetry={detail.reload}/>;
    // Progressive shell: identity skeleton only — never a blank full-page blocker.
    return <div className="rp-terminal" data-testid="token-terminal" aria-busy="true"><div className="rp-head"><SkeletonLine width={280} height={48} label="Loading token"/><SkeletonLine width={200} height={48}/></div><div className="rp-grid"><section className="rp-chart-panel"><SkeletonLine height={380}/></section><aside className="rp-rail">{TICKET_FALLBACK}</aside></div></div>;
  }
  return <TokenTerminal vm={vm} data={data} chart={chart} depth={depth} tab={tab} onTab={(t) => { setTab(t); setTradeCursor(undefined); setHolderCursor(undefined); }} onRetry={detail.reload}
    tradesPager={{ hasNext: !!trades.data?.nextCursor, hasPrev: !!tradeCursor, next: () => setTradeCursor(trades.data!.nextCursor!), first: () => { setTradeCursor(undefined); void trades.refetch(); } }}
    holdersPager={{ hasNext: !!holders.data?.nextCursor, hasPrev: !!holderCursor, next: () => setHolderCursor(holders.data!.nextCursor!), first: () => { setHolderCursor(undefined); void holders.refetch(); } }}
    ordersPanel={vm.lifecycle === 'GRADUATED' ? <LiveOrdersPanel token={vm.id} market={vm.addresses.market} quoteSymbol={vm.quote.symbol}/> : undefined}
    ticket={<Suspense fallback={TICKET_FALLBACK}>{detail.essential ? <Ticket token={id as Address} launch={ticketLaunch(detail.launch)} kuru={ticketKuru(detail.kuru)} quoteSymbol={vm.quote.symbol} readyToGraduate={detail.readyToGraduate} reload={detail.reload} essential={detail.essential} economicFresh={detail.economicFresh} resourceError={detail.essentialError ?? detail.economicError}/> : <section className="rp-ticket"><p role="status">{detail.essentialStatus === 'error' ? 'On-chain state unavailable.' : 'Loading on-chain state…'}</p><button className="rp-btn rp-btn-ghost" onClick={detail.reload}>Retry on-chain reads</button></section>}</Suspense>}/>;
}

export default function TokenDetail({ id }: { id: string }) {
  return DATA_MODE === 'live' ? <LiveTokenRoute key={id.toLowerCase()} id={id}/> : <DemoTokenRoute id={id}/>;
}
