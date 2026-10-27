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
import { 
  Briefcase, 
  ChevronDown, 
  Layers, 
  Plus, 
  Send, 
  TrendingUp, 
  ShieldCheck, 
  AlertCircle,
  CheckCircle2,
  Wallet,
  ArrowRight,
  Flame,
  Clock,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

const live = DATA_MODE === 'live';
const DEMO_PARAMS: KuruMarketParams = { baseAsset: zeroAddress, quoteAsset: zeroAddress, baseDecimals: 18n, quoteDecimals: 18n, pricePrecision: 1000n, sizePrecision: 100n, tickSize: 1n, minSize: 1n, maxSize: 1_000_000n, makerFeeBps: 0n, takerFeeBps: 30n };

export function MarketMaking() {
  const params = useSearchParams();
  const q = useQuery({ queryKey: launchKeys.resource('all', 'maker-pools'), enabled: live && !!INDEXER_URL, queryFn: ({ signal }) => fetchPools(INDEXER_URL!, undefined, signal), staleTime: 10_000 });
  const pools = live ? q.data?.data ?? [] : [demoPool];
  const selected = params.get('token') ?? pools[0]?.token ?? null;
  const valid = selected !== null && (live ? /^0x[\da-f]{40}$/i.test(selected) : selected === demoPool.token);

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Market Selector Header Card */}
      <section className="bg-[#12141c] rounded-xl p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2230] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#836ef9]/15 flex items-center justify-center text-[#836ef9]">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Market Making Desk</h2>
                {!live && <DemoBadge />}
              </div>
              <p className="text-xs text-[#615a78] mt-0.5">
                Provide two-sided limit and post-only liquidity to earn trading fees across Monad CLOB orderbooks.
              </p>
            </div>
          </div>

          {/* Styled Market Select */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#615a78]">Market:</span>
            <div className="relative">
              <select
                id="maker-market"
                className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#181a24] hover:bg-[#232636] text-white focus:outline-none focus:ring-1 focus:ring-[#836ef9] cursor-pointer transition-all"
                value={selected ?? ''}
                onChange={e => navigate(`/liquidity/market-making?token=${e.target.value}`)}
              >
                <option value="" disabled>Select a graduated market</option>
                {selected && !pools.some(p => p.token === selected) && <option value={selected}>{selected}</option>}
                {pools.map(pool => (
                  <option key={pool.token} value={pool.token}>{pool.baseSymbol} / {pool.quoteSymbol}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#a79fd0] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {q.isError && live && (
          <div className="mt-4">
            <ErrorState title="Market discovery unavailable" text="A selected market can still be verified directly on chain." onRetry={() => void q.refetch()} />
          </div>
        )}
      </section>

      {valid && selected ? (
        <MakerMarket key={selected} token={selected} pools={pools} />
      ) : selected ? (
        <ErrorState title="Invalid market token" />
      ) : (
        <EmptyState title={q.isPending && live ? 'Loading markets…' : 'No indexed graduated markets'} />
      )}
    </div>
  );
}

function MakerMarket({ token, pools }: { token: string; pools: IndexedLiquidityPool[] }) {
  const wallet = useWallet();
  const search = useSearchParams();
  const [demoRejected, setDemoRejected] = useState(false);
  const [demoMessage, setDemoMessage] = useState('');
  const liquidity = useKuruLiquidity(token, wallet.account, live);
  const pool = useQuery({ queryKey: launchKeys.resource(token, 'liquidity-pool'), enabled: live && !!INDEXER_URL, queryFn: ({ signal }) => fetchPool(INDEXER_URL!, token, signal) });
  const row = live ? pool.data?.data ?? pools.find(p => p.token === token) : demoPool;
  const view = live ? liquidityView(token, liquidity.data, { loading: liquidity.isPending, error: liquidity.error ? liquidity.error.message : null, stale: !!liquidity.data && (liquidity.isError || Date.now() - liquidity.dataUpdatedAt >= 20_000) }) : demoLiquidityView(token);
  const market = view.market;
  const params = useQuery({ queryKey: launchKeys.resource(token, 'maker-params', { market: market ?? '' }), enabled: live && !!liquidity.data && !!market, queryFn: () => assertKuruMarketIdentity(publicClient, market as Address, token as Address), staleTime: 5_000 });
  const [draft, setDraft] = useState<MakerDraft | null>(null);
  const [pair, setPair] = useState<MakerPair | null>(null);
  const base = row?.baseSymbol ?? 'BASE', quote = row?.quoteSymbol ?? 'QUOTE';
  const qualified = view.status === 'ready' && view.best.status === 'ready' && view.best.paused === false;

  const session = `${wallet.account}:${wallet.chainId}`;
  useEffect(() => { setDraft(null); setPair(null); }, [session]);
  const onConfirmed = (draftId: string | null, hash: string) => { 
    if (draftId) setPair(current => current ? confirmMakerLeg(current, draftId, hash) : null); 
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Market Liquidity Depth Card */}
      <MarketLiquidity view={view} baseSymbol={base} quoteSymbol={quote} />

      {/* Two-Column Maker Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (7 cols): Capital & Two-Sided Quote Desk */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <TradingCapital token={token} pools={row ? uniqueCapitalPools([...pools, row]) : pools} enabled={qualified && live} />
          <ManualDrafts key={session} params={live ? params.data : DEMO_PARAMS} base={base} quote={quote} pair={pair} onPair={setPair} onLoad={setDraft} />
          {live && market && (
            <section className="bg-[#12141c] rounded-xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <h2 className="text-sm font-bold text-white mb-3">Live Orders for this Market</h2>
              <LiveOrdersPanel token={token} market={market} quoteSymbol={quote} />
            </section>
          )}
        </div>

        {/* Right Column (5 cols): Order Confirmation & Ticket */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {live ? (
            qualified && market && params.data ? (
              <KuruTicket key={`${token}:${session}`} market={market as Address} token={token as Address} tokenSymbol={base} quoteSymbol={quote} initialQuoteBalance={0n} initialBaseBalance={0n} reload={() => { void liquidity.refetch(); }} makerMode draft={draft} onOrderConfirmed={onConfirmed} />
            ) : (
              <ErrorState title={view.best.paused ? 'This market is paused' : 'Market qualification unavailable'} text="Order entry requires a fresh qualified active market. Retry the liquidity read before preparing an order." onRetry={() => void liquidity.refetch()} />
            )
          ) : (
            <section className="bg-[#12141c] rounded-xl p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col gap-4" aria-label="Demo maker confirmation">
              <div className="flex items-center justify-between border-b border-[#1e2230] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#836ef9]" />
                  <h2 className="text-sm font-bold text-white tracking-tight">Order Execution Stage</h2>
                </div>
                <DemoBadge />
              </div>

              <p className="text-xs text-[#615a78]">
                Staged drafts simulate atomic Kuru CLOB limit placement on Monad Testnet without gas fees.
              </p>

              {demoMessage && (
                <div className="p-3 rounded-lg bg-[#5feddf]/10 text-xs text-[#5feddf]">
                  {demoMessage}
                </div>
              )}

              {draft ? (
                <div className="p-4 rounded-lg bg-[#181a24] flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${draft.side === 'Buy' ? 'bg-[#5feddf]/15 text-[#5feddf]' : 'bg-[#ff8fa3]/15 text-[#ff8fa3]'}`}>
                      {draft.side.toUpperCase()} ORDER
                    </span>
                    <span className="text-xs font-mono text-white font-bold">{draft.size} {base}</span>
                  </div>

                  <div className="flex items-baseline justify-between text-xs font-mono border-t border-[#1e2230] pt-2">
                    <span className="text-[#615a78]">Limit Price:</span>
                    <strong className="text-white">{draft.price} {quote}</strong>
                  </div>

                  <button
                    className="w-full py-2.5 rounded-lg bg-[#836ef9] hover:bg-[#9583fc] text-white text-xs font-semibold shadow-[0_0_15px_rgba(131,110,249,0.35)] transition-all cursor-pointer mt-1"
                    onClick={() => {
                      if (draft.side === 'Sell' && search.get('simulate') === 'reject-ask' && !demoRejected) {
                        setDemoRejected(true);
                        setDemoMessage('Ask request rejected. Confirmed bid remains on chain.');
                        return;
                      }
                      onConfirmed(draft.id, `demo:${draft.id}:receipt`);
                      toast.success(`Simulated ${draft.side} order confirmed!`);
                      setDraft(null);
                      setDemoMessage('');
                    }}
                  >
                    Simulate {draft.side === 'Buy' ? 'Bid' : 'Ask'} Confirmation
                  </button>
                </div>
              ) : (
                <div className="py-8 px-4 text-center rounded-lg bg-[#181a24] text-xs text-[#615a78] flex flex-col items-center justify-center gap-2">
                  <Layers className="w-6 h-6 text-[#836ef9]/40" />
                  <span>No order draft currently loaded into stage.</span>
                  <span className="text-[11px] text-[#a79fd0]">Configure prices on the left desk and click &quot;Review bid and ask&quot;.</span>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function uniqueCapitalPools(pools: IndexedLiquidityPool[]) { 
  return [...new Map(pools.map(pool => [pool.token, pool])).values()]; 
}

function ManualDrafts({ params, base, quote, pair, onPair, onLoad }: { params?: KuruMarketParams; base: string; quote: string; pair: MakerPair | null; onPair: (pair: MakerPair | null) => void; onLoad: (draft: MakerDraft | null) => void }) {
  const [inputs, setInputs] = useState<MakerInputs>({ bidPrice: '0.695', bidSize: '10', askPrice: '0.705', askSize: '10' });
  const [error, setError] = useState('');

  const update = (key: keyof MakerInputs, value: string) => { 
    setInputs(current => ({ ...current, [key]: value })); 
    setError(''); 
  };

  const review = () => { 
    if (!params) return; 
    try { 
      const legs = validateMakerDrafts(params, inputs); 
      onPair({ id: crypto.randomUUID(), ...legs, bidHash: null, askHash: null }); 
      setError(''); 
      toast.info('Two-sided quotes staged. Ready to load into ticket.');
    } catch (e) { 
      setError(e instanceof Error ? e.message : 'Invalid draft.'); 
    } 
  };

  return (
    <section className="bg-[#12141c] rounded-xl p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col gap-4" aria-label="Manual bid and ask drafting">
      <div className="flex items-center justify-between border-b border-[#1e2230] pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#5feddf]" />
          <h2 className="text-sm font-bold text-white tracking-tight">Manual Two-Sided Quote Desk</h2>
        </div>
        <span className="text-[11px] font-mono text-[#836ef9] bg-[#836ef9]/15 px-2 py-0.5 rounded-md font-bold">
          CLOB Maker
        </span>
      </div>

      <p className="text-xs text-[#615a78]">
        Configure symmetric bid &amp; ask spread around current market midpoint. Both sides execute as independent maker limit transactions.
      </p>

      {/* Side-by-side Bid & Ask Input Desks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bid Side */}
        <div className="p-4 rounded-lg bg-[#181a24] flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#5feddf] font-bold flex items-center gap-1.5 uppercase">
              <span className="w-2 h-2 rounded-full bg-[#5feddf]" /> Bid · Buy Side
            </span>
            <span className="text-[10px] text-[#615a78]">Maker</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase text-[#615a78]">Bid Price ({quote})</label>
            <input
              type="text"
              aria-label="bid price"
              inputMode="decimal"
              disabled={!!pair}
              value={inputs.bidPrice}
              onChange={e => update('bidPrice', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#12141c] text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#836ef9] transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase text-[#615a78]">Amount ({base})</label>
            <input
              type="text"
              aria-label="bid amount"
              inputMode="decimal"
              disabled={!!pair}
              value={inputs.bidSize}
              onChange={e => update('bidSize', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#12141c] text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#836ef9] transition-all"
            />
          </div>
        </div>

        {/* Ask Side */}
        <div className="p-4 rounded-lg bg-[#181a24] flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#ff8fa3] font-bold flex items-center gap-1.5 uppercase">
              <span className="w-2 h-2 rounded-full bg-[#ff8fa3]" /> Ask · Sell Side
            </span>
            <span className="text-[10px] text-[#615a78]">Maker</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase text-[#615a78]">Ask Price ({quote})</label>
            <input
              type="text"
              aria-label="ask price"
              inputMode="decimal"
              disabled={!!pair}
              value={inputs.askPrice}
              onChange={e => update('askPrice', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#12141c] text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#836ef9] transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase text-[#615a78]">Amount ({base})</label>
            <input
              type="text"
              aria-label="ask amount"
              inputMode="decimal"
              disabled={!!pair}
              value={inputs.askSize}
              onChange={e => update('askSize', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#12141c] text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#836ef9] transition-all"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-[#ff8fa3]/10 text-xs text-[#ff8fa3]">
          {error}
        </div>
      )}

      {!pair ? (
        <button
          className="w-full py-2.5 rounded-lg bg-[#836ef9] hover:bg-[#9583fc] text-white text-xs font-semibold shadow-[0_0_15px_rgba(131,110,249,0.35)] transition-all cursor-pointer disabled:opacity-50"
          disabled={!params}
          onClick={review}
        >
          Review Bid and Ask
        </button>
      ) : (
        <div className="p-4 rounded-lg bg-[#181a24] flex flex-col gap-3 font-mono text-xs" data-testid="maker-sequence">
          <div className="flex items-center justify-between text-white font-bold pb-2 border-b border-[#1e2230]">
            <span>Staged Sequence Active</span>
            <span className="text-[10px] text-[#5feddf]">2 Legs Staged</span>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between p-2 rounded-md bg-[#12141c]">
              <span className="text-[#a79fd0]">Leg 1 (Bid): {pair.bid.size} {base} @ {pair.bid.price} {quote}</span>
              <span className={pair.bidHash ? 'text-[#5feddf] font-bold' : 'text-[#615a78]'}>
                {pair.bidHash ? 'Confirmed ✓' : 'Ready'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-md bg-[#12141c]">
              <span className="text-[#a79fd0]">Leg 2 (Ask): {pair.ask.size} {base} @ {pair.ask.price} {quote}</span>
              <span className={pair.askHash ? 'text-[#5feddf] font-bold' : 'text-[#615a78]'}>
                {pair.askHash ? 'Confirmed ✓' : 'Awaiting Leg 1'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {!pair.bidHash ? (
              <button
                className="flex-1 py-2 rounded-lg bg-[#836ef9] text-white text-xs font-semibold hover:bg-[#9583fc] transition-all cursor-pointer"
                onClick={() => onLoad({ ...pair.bid, id: `${pair.id}:bid` })}
              >
                Load Bid into Ticket
              </button>
            ) : !pair.askHash ? (
              <button
                className="flex-1 py-2 rounded-lg bg-[#836ef9] text-white text-xs font-semibold hover:bg-[#9583fc] transition-all cursor-pointer"
                onClick={() => onLoad({ ...pair.ask, id: `${pair.id}:ask` })}
              >
                Load Ask into Ticket
              </button>
            ) : null}

            <button
              className="px-3.5 py-2 rounded-lg bg-[#181a24] hover:bg-[#232636] text-xs font-semibold text-[#a79fd0] hover:text-white transition-all cursor-pointer"
              onClick={() => { onPair(null); onLoad(null); }}
            >
              Reset Draft
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

type CapitalAsset = { token: string; symbol: string; decimals: number };
function TradingCapital({ token, pools, enabled }: { token: string; pools: IndexedLiquidityPool[]; enabled: boolean }) {
  const wallet = useWallet(), account = wallet.account;
  const assets = uniqueCapitalAssets<CapitalAsset>(pools.flatMap(pool => [
    { token: pool.baseAsset, symbol: pool.baseSymbol, decimals: pool.baseDecimals }, 
    { token: pool.quoteAsset, symbol: pool.quoteSymbol, decimals: pool.quoteDecimals }
  ]));

  const q = useQuery({ 
    queryKey: launchKeys.wallet(account ?? 'disconnected', `maker-capital:${assets.map(a => a.token).join(',')}`), 
    enabled: !!account && enabled, 
    queryFn: async () => {
      const block = await publicClient.getBlockNumber({ cacheTime: 0 });
      const rows = await Promise.all(assets.map(async asset => { 
        try { 
          const [walletRaw, marginRaw] = await Promise.all([
            asset.token === zeroAddress ? publicClient.getBalance({ address: account!, blockNumber: block }) : publicClient.readContract({ address: asset.token as Address, abi: tokenAbi, functionName: 'balanceOf', args: [account!], blockNumber: block }), 
            publicClient.readContract({ address: release.kuruEnvironment.marginAccount as Address, abi: marginAbi, functionName: 'getBalance', args: [account!, asset.token as Address], blockNumber: block })
          ]); 
          return { ...asset, walletRaw, marginRaw }; 
        } catch { 
          return { ...asset, walletRaw: null, marginRaw: null }; 
        } 
      }));
      return { block, rows };
    }, 
    refetchInterval: 10_000, 
    structuralSharing: false 
  });

  return (
    <section className="bg-[#12141c] rounded-xl p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col gap-3" aria-label="Shared trading capital">
      <div className="flex items-center justify-between border-b border-[#1e2230] pb-3">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-[#836ef9]" />
          <h2 className="text-sm font-bold text-white tracking-tight">Kuru Trading Capital &amp; Margin</h2>
        </div>
        <span className="text-[11px] font-mono text-[#5feddf]">Available</span>
      </div>

      <p className="text-xs text-[#615a78]">
        Free margin excludes funds locked in active limit orders and can be deployed directly into market-making brackets.
      </p>

      {/* Styled Table */}
      <div className="w-full overflow-x-auto rounded-lg bg-[#181a24]">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-[#1e2230] bg-[#13151f] text-[#94a3b8] text-[10.5px] uppercase">
              <th className="py-2.5 px-4 font-semibold">Asset</th>
              <th className="py-2.5 px-4 text-right font-semibold">Spendable Wallet</th>
              <th className="py-2.5 px-4 text-right font-semibold">Free Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2230] text-white">
            {!live ? (
              <>
                <tr className="hover:bg-[#120d24]/50 transition-colors">
                  <td className="py-2.5 px-4 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#836ef9]" /> CIS
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium">124.56 CIS</td>
                  <td className="py-2.5 px-4 text-right font-bold text-[#5feddf]">250.00 CIS</td>
                </tr>
                <tr className="hover:bg-[#120d24]/50 transition-colors">
                  <td className="py-2.5 px-4 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#5feddf]" /> MON
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium">88.21 MON</td>
                  <td className="py-2.5 px-4 text-right font-bold text-[#5feddf]">10.00 MON</td>
                </tr>
              </>
            ) : !account ? (
              <tr><td colSpan={3} className="py-6 text-center text-[#615a78]">Connect a wallet to view margin capital</td></tr>
            ) : q.isError ? (
              <tr><td colSpan={3} className="py-6 text-center text-[#ff8fa3]">Trading capital query unavailable</td></tr>
            ) : !q.data ? (
              <tr><td colSpan={3} className="py-6 text-center text-[#615a78]">Reading trading capital…</td></tr>
            ) : (
              q.data.rows.map(row => (
                <tr key={row.token} className="hover:bg-[#120d24]/50 transition-colors">
                  <td className="py-2.5 px-4 font-bold">{row.symbol}</td>
                  <td className="py-2.5 px-4 text-right">{row.walletRaw === null ? 'Unavailable' : formatRaw(row.walletRaw, row.decimals)}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-[#5feddf]">{row.marginRaw === null ? 'Unavailable' : formatRaw(row.marginRaw, row.decimals)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
