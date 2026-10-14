// Shared launch discovery table/grid (Sections 11, 12). Consumes DiscoveryRow from live indexer or demo fixtures.
import { DiscoveryBondingProgress } from '@/components/trading/bonding-progress';
import { LayoutGrid, List } from 'lucide-react';
import Link from '@/components/product/safe-link';
import { DemoBadge, EmptyState, LifecycleBadge, SegmentedControl, TokenIdentity, cx } from '@/components/trading/primitives';
import { ageFrom, changeDirection, formatBps, formatPriceX18, formatRawCompact } from '@/lib/view-models/token-terminal';
import { LIFECYCLE_FILTERS, type DiscoveryRow, type LifecycleFilter } from '@/lib/view-models/discovery';
import '@/components/trading/trading.css';
import './launch-table.css';

/** Sparkline from REAL bucket closes only (bigint → relative position). Fewer than 2 points → "—". */
export function Sparkline({ closes, label, width = 96, height = 28 }: { closes: string[]; label: string; width?: number; height?: number }) {
  if (closes.length < 2) return <span className="rp-muted" aria-label="No price history">—</span>;
  const values = closes.map((c) => BigInt(c));
  const lo = values.reduce((a, b) => (b < a ? b : a)), hi = values.reduce((a, b) => (b > a ? b : a));
  const span = hi - lo || 1n;
  const pts = values.map((v, i) => `${((i * width) / (values.length - 1)).toFixed(1)},${(height - 2 - Number(((v - lo) * BigInt((height - 4) * 1000)) / span) / 1000).toFixed(1)}`).join(' ');
  const up = values[values.length - 1] >= values[0];
  return <svg className={cx('rp-spark', up ? 'rp-up' : 'rp-down')} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}><polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/></svg>;
}

export function DiscoveryControls({ filter, onFilter, pairs, pair, onPair, view, onView }: {
  filter: LifecycleFilter; onFilter: (f: LifecycleFilter) => void; pairs: Array<{ value: string; label: string }>; pair: string; onPair: (p: string) => void; view: 'list' | 'grid'; onView: (v: 'list' | 'grid') => void;
}) {
  return <div className="rp-disc-controls">
    <SegmentedControl label="Launch lifecycle" value={filter} onChange={onFilter} options={LIFECYCLE_FILTERS.map(([value, label]) => ({ value, label }))}/>
    <div className="rp-disc-right">
      <label className="rp-select"><span className="rp-sr">Pair filter</span>
        <select aria-label="Pair filter" value={pair} onChange={(e) => onPair(e.target.value)}><option value="">Any pair</option>{pairs.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select>
      </label>
      <SegmentedControl label="Layout" size="sm" value={view} onChange={onView} options={[{ value: 'list', label: <><List size={14} aria-hidden/><span className="rp-sr">List</span></> }, { value: 'grid', label: <><LayoutGrid size={14} aria-hidden/><span className="rp-sr">Grid</span></> }]}/>
    </div>
  </div>;
}

const value = (raw: string | null, r: DiscoveryRow) => raw ? <>{formatRawCompact(raw, r.quote.decimals)} <span className="rp-unit">{r.quote.symbol}</span></> : <span className="rp-muted">—</span>;

export function LaunchTable({ rows, view, now, onHover, empty }: { rows: DiscoveryRow[]; view: 'list' | 'grid'; now: number; onHover?: (r: DiscoveryRow) => void; empty?: string }) {
  if (!rows.length) return <EmptyState title="No launches match these filters" text={empty ?? 'Try another lifecycle or pair.'}/>;
  if (view === 'grid') return <ul className="rp-grid-cards" aria-label="Launches">{rows.map((r) => {
    const dir = changeDirection(r.change24hBps);
    return <li key={r.id}><Link href={r.href} className="rp-card" onMouseEnter={() => onHover?.(r)} onFocus={() => onHover?.(r)} data-testid="launch-card">
      <div className="rp-card-top"><TokenIdentity name={r.symbol} symbol={r.name} icon={r.icon} logo={r.logo} quote={r.quote} size="sm"/>{r.dataMode === 'demo' && <DemoBadge/>}</div>
      <div className="rp-card-mid"><div><small>Market cap</small><strong>{value(r.marketCapRaw, r)}</strong></div><Sparkline closes={r.closes} label={`${r.symbol} price history${r.dataMode === 'demo' ? ' (simulated)' : ''}`}/></div>
      <DiscoveryBondingProgress row={r}/><div className="rp-card-foot"><span className="rp-badge rp-pair">{r.quote.symbol}</span><span>Vol {value(r.volume24hRaw, r)}</span><span className={`rp-${dir}`}>{dir === 'none' ? '—' : formatBps(r.change24hBps, true)}</span></div>
    </Link></li>;
  })}</ul>;
  return <div className="rp-table-wrap"><table className="rp-table rp-launch-table" aria-label="Launches">
    <thead><tr><th scope="col">Token</th><th scope="col">Pair & bonding</th><th scope="col" className="rp-p2">Graph</th><th scope="col" className="rp-right">Price</th><th scope="col" className="rp-right">Market cap</th><th scope="col" className="rp-right rp-p2">Liquidity</th><th scope="col" className="rp-right">Volume 24h</th><th scope="col" className="rp-right rp-p3">Lifetime volume</th><th scope="col" className="rp-right rp-p3">Trades 24h</th></tr></thead>
    <tbody>{rows.map((r) => {
      const dir = changeDirection(r.change24hBps);
      return <tr key={r.id} onMouseEnter={() => onHover?.(r)} data-testid="launch-row">
        <td data-label="Token"><Link href={r.href} className="rp-row-link" onFocus={() => onHover?.(r)}><TokenIdentity name={r.name} symbol={r.symbol} icon={r.icon} logo={r.logo} quote={r.quote} size="sm"><div className="rp-row-meta"><LifecycleBadge lifecycle={r.lifecycle}/>{r.dataMode === 'demo' && <DemoBadge/>}<span>{ageFrom(r.createdAt, now)}</span></div></TokenIdentity></Link></td>
        <td data-label="Pair"><span className="rp-badge rp-pair">{r.symbol}/{r.quote.symbol}</span><DiscoveryBondingProgress row={r}/></td>
        <td data-label="Graph" className="rp-p2"><Sparkline closes={r.closes} label={`${r.symbol} price history${r.dataMode === 'demo' ? ' (simulated)' : ''}`}/></td>
        <td data-label="Price" className="rp-right"><div>{r.priceX18 ? <>{formatPriceX18(r.priceX18)} <span className="rp-unit">{r.quote.symbol}</span></> : '—'}</div><small className={`rp-${dir}`}>{dir === 'none' ? '' : formatBps(r.change24hBps, true)}</small></td>
        <td data-label="Market cap" className="rp-right">{value(r.marketCapRaw, r)}</td>
        <td data-label="Liquidity" className="rp-right rp-p2">{value(r.liquidityRaw, r)}</td>
        <td data-label="Volume 24h" className="rp-right">{value(r.volume24hRaw, r)}</td>
        <td data-label="Lifetime volume" className="rp-right rp-p3">{value(r.lifetimeVolumeRaw, r)}</td>
        <td data-label="Trades 24h" className="rp-right rp-p3">{r.trades24h ?? '—'}</td>
      </tr>;
    })}</tbody>
  </table></div>;
}
