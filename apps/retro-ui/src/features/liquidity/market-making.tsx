import { useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { zeroAddress, type Address } from 'viem';
import type { KuruMarketParams } from '@retropick/launchpad-sdk/prepare';
import { assertKuruMarketIdentity } from '@retropick/launchpad-sdk/prepare';
import { marginAbi } from '@retropick/launchpad-sdk/abis/marginAbi';
import { tokenAbi } from '@retropick/launchpad-sdk/abis/tokenAbi';
import { release } from '@retropick/launchpad-sdk/chain';
import type { IndexedLiquidityPool } from '@retropick/launchpad-sdk/read-model';
import { DATA_MODE, INDEXER_URL } from '@/lib/live/env';
import { publicClient } from '@/lib/live/public-client';
import { launchKeys } from '@/lib/live/queries';
import { useSearchParams, navigate } from '@/lib/next-compat';
import { useKuruLiquidity } from '@/hooks/use-kuru-liquidity';
import { useWallet } from '@/wallet/provider';
import { AddressChip, DemoBadge, EmptyState, ErrorState, DataTable } from '@/components/trading/primitives';
import { formatRaw } from '@/lib/view-models/token-terminal';
import { demoLiquidityView, liquidityView, uniqueCapitalAssets } from '@/lib/view-models/liquidity';
import { KuruTicket } from '@/features/launchpad/kuru-ticket';
import { LiveOrdersPanel } from '@/features/launchpad/terminal/live-orders';
import { demoPool, fetchPool, fetchPools } from './liquidity-data';
import { MarketLiquidity } from './market-liquidity';
import { validateMakerDrafts, confirmMakerLeg, type MakerDraft, type MakerInputs, type MakerPair } from './maker-drafts';

const live = DATA_MODE === 'live';
const DEMO_PARAMS: KuruMarketParams = { baseAsset: zeroAddress, quoteAsset: zeroAddress, baseDecimals: 18n, quoteDecimals: 18n, pricePrecision: 1000n, sizePrecision: 100n, tickSize: 1n, minSize: 1n, maxSize: 1_000_000n, makerFeeBps: 0n, takerFeeBps: 30n };

export function MarketMaking() {
  const params = useSearchParams();
  const q = useQuery({ queryKey: launchKeys.resource('all', 'maker-pools'), enabled: live && !!INDEXER_URL, queryFn: ({ signal }) => fetchPools(INDEXER_URL!, undefined, signal), staleTime: 10_000 });
  const pools = live ? q.data?.data ?? [] : [demoPool];
  const selected = params.get('token') ?? pools[0]?.token ?? null;
  const valid = selected !== null && (live ? /^0x[\da-f]{40}$/i.test(selected) : selected === demoPool.token);
  return <><section className="rp-liquidity-card"><div className="rp-liquidity-header"><h2>Market Making</h2>{!live && <DemoBadge/>}</div><p className="rp-note">Manual limit and post-only orders use your shared Kuru margin account. Two-sided drafts are separate transactions, with independent wallet confirmations and cancellation.</p>
    <label htmlFor="maker-market">Market</label><select id="maker-market" className="rp-liquidity-select" value={selected ?? ''} onChange={e => navigate(`/liquidity/market-making?token=${e.target.value}`)}><option value="" disabled>Select a graduated market</option>{selected && !pools.some(p => p.token === selected) && <option value={selected}>{selected}</option>}{pools.map(pool => <option key={pool.token} value={pool.token}>{pool.baseSymbol} / {pool.quoteSymbol}</option>)}</select>
    {q.isError && live && <ErrorState title="Market discovery unavailable" text="A selected market can still be verified directly on chain." onRetry={() => void q.refetch()}/>}
    {q.data?.nextCursor && <p className="rp-note">Showing the first page of markets. Open another pool and choose Market making to select its exact market.</p>}
  </section>{valid && selected ? <MakerMarket key={selected} token={selected} pools={pools}/> : selected ? <ErrorState title="Invalid market token"/> : <EmptyState title={q.isPending && live ? 'Loading markets…' : 'No indexed graduated markets'}/>}</>;
}

function MakerMarket({ token, pools }: { token: string; pools: IndexedLiquidityPool[] }) {
  const wallet = useWallet();
  const search = useSearchParams();
  const [demoRejected, setDemoRejected] = useState(false), [demoMessage, setDemoMessage] = useState('');
  const liquidity = useKuruLiquidity(token, wallet.account, live);
  const pool = useQuery({ queryKey: launchKeys.resource(token, 'liquidity-pool'), enabled: live && !!INDEXER_URL, queryFn: ({ signal }) => fetchPool(INDEXER_URL!, token, signal) });
  const row = live ? pool.data?.data ?? pools.find(p => p.token === token) : demoPool;
  const view = live ? liquidityView(token, liquidity.data, { loading: liquidity.isPending, error: liquidity.isError ? liquidity.error.message : null, stale: !!liquidity.data && (liquidity.isError || Date.now() - liquidity.dataUpdatedAt >= 20_000) }) : demoLiquidityView(token);
  const market = view.market;
  const params = useQuery({ queryKey: launchKeys.resource(token, 'maker-params', { market: market ?? '' }), enabled: live && !!liquidity.data && !!market, queryFn: () => assertKuruMarketIdentity(publicClient, market as Address, token as Address), staleTime: 5_000 });
  const [draft, setDraft] = useState<MakerDraft | null>(null);
  const [pair, setPair] = useState<MakerPair | null>(null);
  const base = row?.baseSymbol ?? 'BASE', quote = row?.quoteSymbol ?? 'QUOTE';
  const qualified = view.status === 'ready' && view.best.status === 'ready' && view.best.paused === false;
  // A new wallet or chain starts a distinct manual sequence and cannot inherit another account's retry state.
  const session = `${wallet.account}:${wallet.chainId}`;
  useEffect(() => { setDraft(null); setPair(null); }, [session]);
  const onConfirmed = (draftId: string | null, hash: string) => { if (draftId) setPair(current => current ? confirmMakerLeg(current, draftId, hash) : null); };
  return <><MarketLiquidity view={view} baseSymbol={base} quoteSymbol={quote}/>
    <div className="rp-maker-grid"><div><TradingCapital token={token} pools={row ? uniqueCapitalPools([...pools, row]) : pools} enabled={qualified && live}/>
      <ManualDrafts key={session} params={live ? params.data : DEMO_PARAMS} base={base} quote={quote} pair={pair} onPair={setPair} onLoad={setDraft}/>
      {live && market && <section className="rp-liquidity-card"><h2>Orders for this market</h2><LiveOrdersPanel token={token} market={market} quoteSymbol={quote}/></section>}
    </div><div>
      {live ? qualified && market && params.data ? <KuruTicket key={`${token}:${session}`} market={market as Address} token={token as Address} tokenSymbol={base} quoteSymbol={quote} initialQuoteBalance={0n} initialBaseBalance={0n} reload={() => { void liquidity.refetch(); }} makerMode draft={draft} onOrderConfirmed={onConfirmed}/>
        : <ErrorState title={view.best.paused ? 'This market is paused' : 'Market qualification unavailable'} text="Order entry requires a fresh qualified active market. Retry the liquidity read before preparing an order." onRetry={() => void liquidity.refetch()}/>
        : <section className="rp-liquidity-card" aria-label="Demo maker confirmation"><h2>Demo order confirmation</h2><DemoBadge/><p className="rp-note">Load a reviewed draft, then simulate its confirmation. No wallet signature or financial transaction is requested.</p>{demoMessage && <p role="status">{demoMessage}</p>}{draft && <><p>{draft.side} {draft.size} {base} at {draft.price} {quote}</p><button className="rp-btn rp-btn-primary" onClick={() => { if (draft.side === 'Sell' && search.get('simulate') === 'reject-ask' && !demoRejected) { setDemoRejected(true); setDemoMessage('Ask request rejected. The confirmed bid remains on chain; retry the ask separately.'); return; } onConfirmed(draft.id, `demo:${draft.id}:receipt`); setDraft(null); setDemoMessage(''); }}>Simulate {draft.side === 'Buy' ? 'bid' : 'ask'} confirmation</button></>}</section>}
    </div></div>
  </>;
}

function uniqueCapitalPools(pools: IndexedLiquidityPool[]) { return [...new Map(pools.map(pool => [pool.token, pool])).values()]; }

function ManualDrafts({ params, base, quote, pair, onPair, onLoad }: { params?: KuruMarketParams; base: string; quote: string; pair: MakerPair | null; onPair: (pair: MakerPair | null) => void; onLoad: (draft: MakerDraft | null) => void }) {
  const [inputs, setInputs] = useState<MakerInputs>({ bidPrice: '', bidSize: '', askPrice: '', askSize: '' }), [error, setError] = useState('');
  const update = (key: keyof MakerInputs, value: string) => { setInputs(current => ({ ...current, [key]: value })); setError(''); };
  const review = () => { if (!params) return; try { const legs = validateMakerDrafts(params, inputs); onPair({ id: crypto.randomUUID(), ...legs, bidHash: null, askHash: null }); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Invalid draft.'); } };
  return <section className="rp-liquidity-card" aria-label="Manual bid and ask drafting"><h2>Manual bid + ask</h2><p className="rp-note">Review normalized prices and amounts before loading each order into the ticket. Two orders are not atomic. Funding and token approvals may require additional transactions.</p>
    <div className="rp-maker-drafts">{(['bid', 'ask'] as const).map(side => <fieldset key={side} disabled={!!pair}><legend>{side === 'bid' ? 'Bid · buy' : 'Ask · sell'}</legend><label>{side === 'bid' ? 'Bid price' : 'Ask price'} ({quote})<input aria-label={`${side} price`} inputMode="decimal" value={inputs[`${side}Price`]} onChange={e => update(`${side}Price`, e.target.value)}/></label><label>Amount ({base})<input aria-label={`${side} amount`} inputMode="decimal" value={inputs[`${side}Size`]} onChange={e => update(`${side}Size`, e.target.value)}/></label></fieldset>)}</div>
    {error && <p role="alert">{error}</p>}{!params && <p role="status" className="rp-note">Waiting for verified market parameters…</p>}
    {!pair ? <button className="rp-btn rp-btn-primary" disabled={!params} onClick={review}>Review bid and ask</button> : <div data-testid="maker-sequence" aria-live="polite"><p>Bid: {pair.bid.size} {base} at {pair.bid.price} {quote}. Ask: {pair.ask.size} {base} at {pair.ask.price} {quote}.</p><p>Step 1 · {pair.bidHash ? 'Bid confirmed' : 'Bid not submitted'} {pair.bidHash && <AddressChip value={pair.bidHash} kind="tx" label="bid receipt"/>}</p><p>Step 2 · {pair.askHash ? 'Ask confirmed' : pair.bidHash ? 'Ask not confirmed; the bid remains live or may already have filled.' : 'Wait for the bid receipt'} {pair.askHash && <AddressChip value={pair.askHash} kind="tx" label="ask receipt"/>}</p><div className="rp-liquidity-actions">{!pair.bidHash ? <button className="rp-btn rp-btn-primary" onClick={() => onLoad({ ...pair.bid, id: `${pair.id}:bid` })}>Load bid into ticket</button> : !pair.askHash ? <button className="rp-btn rp-btn-primary" onClick={() => onLoad({ ...pair.ask, id: `${pair.id}:ask` })}>Load ask into ticket</button> : null}<button className="rp-btn rp-btn-ghost" onClick={() => { onPair(null); onLoad(null); }}>Start a new draft</button></div><p className="rp-note">If an order fails or is rejected, retry that order in the ticket. Confirmed orders remain on chain until filled or cancelled; starting a new draft does not cancel them.</p></div>}
  </section>;
}

type CapitalAsset = { token: string; symbol: string; decimals: number };
function TradingCapital({ token, pools, enabled }: { token: string; pools: IndexedLiquidityPool[]; enabled: boolean }) {
  const wallet = useWallet(), account = wallet.account;
  const assets = uniqueCapitalAssets<CapitalAsset>(pools.flatMap(pool => [{ token: pool.baseAsset, symbol: pool.baseSymbol, decimals: pool.baseDecimals }, { token: pool.quoteAsset, symbol: pool.quoteSymbol, decimals: pool.quoteDecimals }]));
  const q = useQuery({ queryKey: launchKeys.wallet(account ?? 'disconnected', `maker-capital:${assets.map(a => a.token).join(',')}`), enabled: !!account && enabled, queryFn: async () => {
    const block = await publicClient.getBlockNumber({ cacheTime: 0 });
    const rows = await Promise.all(assets.map(async asset => { try { const [walletRaw, marginRaw] = await Promise.all([asset.token === zeroAddress ? publicClient.getBalance({ address: account!, blockNumber: block }) : publicClient.readContract({ address: asset.token as Address, abi: tokenAbi, functionName: 'balanceOf', args: [account!], blockNumber: block }), publicClient.readContract({ address: release.kuruEnvironment.marginAccount as Address, abi: marginAbi, functionName: 'getBalance', args: [account!, asset.token as Address], blockNumber: block })]); return { ...asset, walletRaw, marginRaw }; } catch { return { ...asset, walletRaw: null, marginRaw: null }; } }));
    return { block, rows };
  }, refetchInterval: 10_000, structuralSharing: false });
  let content: ReactNode;
  if (!live) content = <p className="rp-note">Demo capital only. Live mode reads each shared asset balance once from the wallet and Kuru margin account.</p>;
  else if (!account) content = <EmptyState title="Connect a wallet to read trading capital"/>;
  else if (q.isError) content = <ErrorState title="Trading capital unavailable" onRetry={() => void q.refetch()}/>;
  else if (!q.data) content = <p role="status">{enabled ? 'Reading trading capital…' : 'Qualify this market before reading trading capital.'}</p>;
  else content = <><p className="rp-note">Chain block {q.data.block.toString()}{Date.now() - q.dataUpdatedAt >= 20_000 ? ' · stale' : ''}</p><DataTable caption="Shared Kuru trading capital" rows={q.data.rows} rowKey={row => row.token} columns={[
    { key: 'asset', header: 'Asset', cell: row => row.symbol },
    { key: 'wallet', header: 'Wallet', align: 'right', cell: row => row.walletRaw === null ? 'Unavailable' : formatRaw(row.walletRaw, row.decimals) },
    { key: 'margin', header: 'Free margin', align: 'right', cell: row => row.marginRaw === null ? 'Unavailable' : formatRaw(row.marginRaw, row.decimals) },
  ]}/></>;
  return <section className="rp-liquidity-card" aria-label="Shared trading capital"><h2>Trading capital</h2><p className="rp-note">Each asset is counted once across the loaded markets. Free margin excludes funds committed to orders. Other Kuru markets can use the same margin credit. Manage deposits and withdrawals in the order ticket.</p>{content}{live && <p className="rp-note">Open orders and remaining amounts for this market appear below. Cross-market histories are available in Earn → Portfolio; no combined economic exposure is inferred from an incomplete order list.</p>}</section>;
}
