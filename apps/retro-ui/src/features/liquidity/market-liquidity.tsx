import type { ReactNode } from 'react';
import Link from '@/components/product/safe-link';
import { AddressChip, DemoBadge, Metric, MetricStrip } from '@/components/trading/primitives';
import { useKuruLiquidity } from '@/hooks/use-kuru-liquidity';
import { liquidityView, type LiquidityStatus, type LiquidityView } from '@/lib/view-models/liquidity';
import { formatPriceX18, formatRaw } from '@/lib/view-models/token-terminal';
import { ArrowUpRight, CheckCircle2, Droplets, Layers, ShieldCheck, TrendingUp, Sparkles, RefreshCcw } from 'lucide-react';
import './liquidity.css';

export function LiveMarketLiquidity({ token, baseSymbol, quoteSymbol, compact = false }: { token: string; baseSymbol: string; quoteSymbol: string; compact?: boolean }) {
  const q = useKuruLiquidity(token);
  const view = liquidityView(token, q.data, { loading: q.isPending, error: q.isError ? 'Qualified liquidity is unavailable. This does not establish a zero balance.' : null, stale: !!q.data && (q.isError || Date.now() - q.dataUpdatedAt >= 20_000) });
  return <MarketLiquidity view={view} baseSymbol={baseSymbol} quoteSymbol={quoteSymbol} compact={compact} onRetry={() => void q.refetch()}/>;
}

export function StateValue({ status, children }: { status: LiquidityStatus; children: ReactNode }) {
  return <>{status === 'loading' ? 'Loading…' : status === 'unavailable' ? 'Unavailable' : children}{status === 'stale' ? ' · stale' : ''}</>;
}

export function MarketLiquidity({ view, baseSymbol, quoteSymbol, compact = false, onRetry }: { view: LiquidityView; baseSymbol: string; quoteSymbol: string; compact?: boolean; onRetry?: () => void }) {
  const bestBid = view.best.bidX18 !== null ? formatPriceX18(view.best.bidX18) : null;
  const bestAsk = view.best.askX18 !== null ? formatPriceX18(view.best.askX18) : null;

  return (
    <section className="bg-[#12141c] rounded-xl p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col gap-5" aria-label="Market liquidity" data-testid="market-liquidity" data-status={view.status}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2230] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#836ef9]/15 flex items-center justify-center text-[#836ef9]">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">Market Liquidity &amp; Depth</h2>
              {view.demo ? <DemoBadge /> : <span className="text-[11px] font-mono text-[#615a78]">{view.block ? `Block #${view.block}` : 'Live snapshot'}</span>}
            </div>
            <p className="text-xs text-[#615a78] mt-0.5">
              Hybrid liquidity aggregating resting Kuru CLOB limit orders and concentrated AMM vault reserves.
            </p>
          </div>
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 rounded-lg bg-[#181a24] hover:bg-[#232636] text-xs font-mono text-[#a79fd0] hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {view.error && (
        <div className="p-3 rounded-lg bg-[#ff8fa3]/10 text-xs text-[#ff8fa3] flex items-center justify-between">
          <span>{view.error}</span>
          {onRetry && <button className="underline font-bold cursor-pointer" onClick={onRetry}>Retry</button>}
        </div>
      )}

      {/* 4 Metric Badges Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#181a24] rounded-lg p-3.5 flex flex-col justify-between">
          <span className="text-[10.5px] font-mono uppercase text-[#615a78] tracking-wider">Resting CLOB</span>
          <div className="text-sm sm:text-base font-bold font-mono text-white mt-1">
            <StateValue status={view.clob.status}>
              {view.clob.bids === 0 && view.clob.asks === 0 ? '0 orders' : `${view.clob.bids ?? '—'} bid / ${view.clob.asks ?? '—'} ask`}
            </StateValue>
          </div>
          <span className="text-[10px] text-[#836ef9] font-mono mt-1">User Limit Orders</span>
        </div>

        <div className="bg-[#181a24] rounded-lg p-3.5 flex flex-col justify-between">
          <span className="text-[10.5px] font-mono uppercase text-[#615a78] tracking-wider">AMM {baseSymbol}</span>
          <div className="text-sm sm:text-base font-bold font-mono text-white mt-1">
            <StateValue status={view.vaultState.status}>
              {formatRaw(view.vaultState.baseRaw, view.baseDecimals)}
            </StateValue> <span className="text-xs text-[#615a78]">{baseSymbol}</span>
          </div>
          <span className="text-[10px] text-[#5feddf] font-mono mt-1">Base Vault Reserve</span>
        </div>

        <div className="bg-[#181a24] rounded-lg p-3.5 flex flex-col justify-between">
          <span className="text-[10.5px] font-mono uppercase text-[#615a78] tracking-wider">AMM {quoteSymbol}</span>
          <div className="text-sm sm:text-base font-bold font-mono text-white mt-1">
            <StateValue status={view.vaultState.status}>
              {formatRaw(view.vaultState.quoteRaw, view.quoteDecimals)}
            </StateValue> <span className="text-xs text-[#615a78]">{quoteSymbol}</span>
          </div>
          <span className="text-[10px] text-[#5feddf] font-mono mt-1">Quote Vault Reserve</span>
        </div>

        <div className="bg-[#181a24] rounded-lg p-3.5 flex flex-col justify-between">
          <span className="text-[10.5px] font-mono uppercase text-[#615a78] tracking-wider">Market State</span>
          <div className="text-sm sm:text-base font-bold font-mono text-[#5feddf] flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-[#5feddf] animate-pulse" />
            <StateValue status={view.best.status}>
              {view.best.paused === null ? 'Unknown' : view.best.paused ? 'Paused' : 'Active'}
            </StateValue>
          </div>
          <span className="text-[10px] text-[#615a78] font-mono mt-1">Ready for Trading</span>
        </div>
      </div>

      {/* Best Combined Bid & Ask Hero Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="p-4 rounded-lg bg-[#181a24] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#5feddf] font-bold flex items-center gap-1.5 uppercase">
              <TrendingUp className="w-3.5 h-3.5" /> Best Combined Bid
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#5feddf]/15 text-[#5feddf] font-bold">BUY</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-white tracking-tight">
              <StateValue status={view.best.status}>
                {bestBid ? `${bestBid} ${quoteSymbol}` : 'No bid'}
              </StateValue>
            </div>
            <div className="text-[11px] text-[#615a78] font-mono mt-0.5">Highest price a buyer is offering across AMM &amp; CLOB</div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#181a24] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#ff8fa3] font-bold flex items-center gap-1.5 uppercase">
              <TrendingUp className="w-3.5 h-3.5 rotate-180" /> Best Combined Ask
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#ff8fa3]/15 text-[#ff8fa3] font-bold">SELL</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-white tracking-tight">
              <StateValue status={view.best.status}>
                {bestAsk ? `${bestAsk} ${quoteSymbol}` : 'No ask'}
              </StateValue>
            </div>
            <div className="text-[11px] text-[#615a78] font-mono mt-0.5">Lowest price a seller is asking across AMM &amp; CLOB</div>
          </div>
        </div>
      </div>

      {/* Vault Specifics & Contract Addresses */}
      {!compact && (
        <div className="p-4 rounded-lg bg-[#181a24] flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono border-b border-[#1e2230] pb-3">
            <div>
              <span className="text-[#615a78] uppercase text-[10px] block">Vault Combined Bid / Ask:</span>
              <strong className="text-white mt-0.5 block">
                <StateValue status={view.vaultState.status}>
                  {formatPriceX18(view.vaultState.bidX18)} / {formatPriceX18(view.vaultState.askX18)} {quoteSymbol}
                </StateValue>
              </strong>
            </div>
            <div>
              <span className="text-[#615a78] uppercase text-[10px] block">Protected LP Shares:</span>
              <strong className="text-[#5feddf] mt-0.5 block">
                <StateValue status={view.custody.status}>
                  {view.shareDecimals === null ? `${view.custody.sharesRaw ?? '—'} shares` : formatRaw(view.custody.sharesRaw, view.shareDecimals)}
                </StateValue>
              </strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5 bg-[#12141c] px-2.5 py-1 rounded-md">
              <span className="text-[#615a78]">Market:</span>
              <AddressChip value={view.market} label="Kuru market" />
            </div>
            <div className="flex items-center gap-1.5 bg-[#12141c] px-2.5 py-1 rounded-md">
              <span className="text-[#615a78]">Vault:</span>
              <AddressChip value={view.vault} label="AMM vault" />
            </div>
            <div className="flex items-center gap-1.5 bg-[#12141c] px-2.5 py-1 rounded-md">
              <span className="text-[#615a78]">Permanent Lock:</span>
              <AddressChip value={view.lpLock} label="permanent liquidity lock" />
            </div>
          </div>
        </div>
      )}

      {/* Action links */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {compact ? (
          <Link className="px-3.5 py-1.5 rounded-lg bg-[#836ef9]/15 text-[#836ef9] text-xs font-semibold hover:bg-[#836ef9]/25 transition-all inline-flex items-center gap-1.5" href={`/liquidity/pools/${view.token}`}>
            View Pool Details <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <Link className="px-3.5 py-1.5 rounded-lg bg-[#836ef9] hover:bg-[#9583fc] text-white text-xs font-semibold shadow-[0_0_15px_rgba(131,110,249,0.35)] transition-all inline-flex items-center gap-1.5" href={`/launchpad/token/${view.token}`}>
            Open Trading Terminal <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        )}
        <Link className="px-3.5 py-1.5 rounded-lg bg-[#181a24] hover:bg-[#232636] text-xs font-semibold text-[#a79fd0] hover:text-white transition-all inline-flex items-center gap-1.5" href={`/liquidity/market-making?token=${view.token}`}>
          Configure Market Making <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
}
