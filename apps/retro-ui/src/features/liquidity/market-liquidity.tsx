import type { ReactNode } from 'react';
import Link from '@/components/product/safe-link';
import { AddressChip, DemoBadge, Metric, MetricStrip } from '@/components/trading/primitives';
import { useKuruLiquidity } from '@/hooks/use-kuru-liquidity';
import { liquidityView, type LiquidityStatus, type LiquidityView } from '@/lib/view-models/liquidity';
import { formatPriceX18, formatRaw } from '@/lib/view-models/token-terminal';
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
  return <section className="rp-liquidity-card" aria-label="Market liquidity" data-testid="market-liquidity" data-status={view.status}>
    <header className="rp-liquidity-header"><h2>Market liquidity</h2>{view.demo ? <DemoBadge/> : <span className="rp-muted">{view.block ? `Chain snapshot · block ${view.block}` : 'Chain snapshot unavailable'}</span>}</header>
    {view.error && <p className="rp-note" role="status">{view.error} {onRetry && <button className="rp-link" onClick={onRetry}>Retry liquidity</button>}</p>}
    {view.status === 'stale' && <p className="rp-note" role="status">This liquidity snapshot is stale. Refresh before relying on these values.</p>}
    <MetricStrip label="Independent liquidity sources" variant="secondary">
      <Metric label="Resting CLOB" value={<StateValue status={view.clob.status}>{view.clob.bids === 0 && view.clob.asks === 0 ? 'No resting CLOB orders' : `${view.clob.bids ?? '—'} bid / ${view.clob.asks ?? '—'} ask levels`}</StateValue>} note="User limit orders only"/>
      <Metric label={`AMM ${baseSymbol}`} value={<StateValue status={view.vaultState.status}>{formatRaw(view.vaultState.baseRaw, view.baseDecimals)}</StateValue>} unit={baseSymbol}/>
      <Metric label={`AMM ${quoteSymbol}`} value={<StateValue status={view.vaultState.status}>{formatRaw(view.vaultState.quoteRaw, view.quoteDecimals)}</StateValue>} unit={quoteSymbol}/>
      <Metric label="Market state" value={<StateValue status={view.best.status}>{view.best.paused === null ? 'Unknown' : view.best.paused ? 'Paused' : 'Active'}</StateValue>} note={view.best.paused ? 'New orders restricted' : 'Account and size must still be simulated'}/>
    </MetricStrip>
    <dl className="rp-liquidity-quotes"><div><dt>Best combined bid</dt><dd><StateValue status={view.best.status}>{view.best.bidX18 === null ? 'No bid' : `${formatPriceX18(view.best.bidX18)} ${quoteSymbol}`}</StateValue></dd></div><div><dt>Best combined ask</dt><dd><StateValue status={view.best.status}>{view.best.askX18 === null ? 'No ask' : `${formatPriceX18(view.best.askX18)} ${quoteSymbol}`}</StateValue></dd></div></dl>
    <p className="rp-note">CLOB depth and AMM inventory are separate. Best prices combine both sources; execution depends on your amount, account, available funds and fresh simulation.</p>
    {!view.demo && view.observedAt !== null && <p className="rp-note" title={view.blockHash ?? undefined}>Monad Testnet (10143) · observed {new Date(view.observedAt).toISOString()} · sources {view.sources.clob}, {view.sources.vault}, {view.sources.best}</p>}
    {!compact && <><dl className="rp-liquidity-quotes"><div><dt>Vault bid / ask</dt><dd><StateValue status={view.vaultState.status}>{formatPriceX18(view.vaultState.bidX18)} / {formatPriceX18(view.vaultState.askX18)} {quoteSymbol}</StateValue></dd></div><div><dt>Protected LP shares</dt><dd><StateValue status={view.custody.status}>{view.shareDecimals === null ? `${view.custody.sharesRaw ?? '—'} atomic shares` : formatRaw(view.custody.sharesRaw, view.shareDecimals)}</StateValue></dd></div></dl><div className="rp-liquidity-addresses"><span>Market <AddressChip value={view.market} label="Kuru market"/></span><span>Vault <AddressChip value={view.vault} label="AMM vault"/></span><span>Permanent lock <AddressChip value={view.lpLock} label="permanent liquidity lock"/></span></div></>}
    <div className="rp-liquidity-actions">{compact ? <Link className="rp-link" href={`/liquidity/pools/${view.token}`}>View pool details →</Link> : <Link className="rp-link" href={`/launchpad/token/${view.token}`}>Open trading terminal →</Link>}<Link className="rp-link" href={`/liquidity/market-making?token=${view.token}`}>Market making →</Link>{onRetry && <button className="rp-link" onClick={onRetry}>Refresh liquidity</button>}</div>
  </section>;
}
