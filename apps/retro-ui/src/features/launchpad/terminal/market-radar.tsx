// Envio Market Quality Radar panel (sponsor: Envio). Read-only, SECONDARY insight — the
// indexer stays canonical for discovery and direct Kuru reads stay canonical for executable
// depth. This shows historical lifecycle/activity derived from the Envio HyperSync stream:
// graduation latency, time-to-first-Kuru-trade, filled-trade count, historical quote volume,
// and ingestion freshness. Fail-closed: when the radar is unavailable the panel renders an
// honest unavailable note (never fabricated liquidity), and it is hidden entirely in demo mode.
import { useQuery } from '@tanstack/react-query';
import { Radar } from 'lucide-react';
import { RADAR_URL } from '@/lib/live/env';
import { fetchRadar, radarForToken, RadarUnavailableError } from '@/lib/live/radar-client';
import { AddressChip } from '@/components/trading/primitives';

const fmtDuration = (s: number | null): string => {
  if (s === null) return '—';
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
};
/** Base-unit bigint → compact decimal with the given decimals (default 18). Exact-integer formatting, never float. */
function fmtUnits(raw: bigint, decimals = 18): string {
  if (raw === 0n) return '0';
  const neg = raw < 0n; const v = neg ? -raw : raw;
  const base = 10n ** BigInt(decimals);
  const whole = v / base; const frac = v % base;
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, 4).replace(/0+$/, '');
  return `${neg ? '-' : ''}${whole.toLocaleString('en-US')}${fracStr ? '.' + fracStr : ''}`;
}

export function MarketRadarPanel({ token, quoteSymbol }: { token: string; quoteSymbol: string }) {
  const q = useQuery({
    queryKey: ['radar', 'snapshot'],
    enabled: !!RADAR_URL,
    queryFn: ({ signal }) => fetchRadar(signal),
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 1,
  });
  if (!RADAR_URL) return null; // demo mode / radar disabled

  const header = <h2 id="rp-radar-h"><Radar size={16} aria-hidden /> Market quality radar <span className="rp-radar-src">Envio HyperSync</span></h2>;

  if (q.isLoading) return <section className="rp-radar" aria-labelledby="rp-radar-h" data-testid="market-radar" data-radar-state="loading">{header}<p className="rp-note" role="status">Loading market radar…</p></section>;
  if (q.isError || !q.data) {
    const msg = q.error instanceof RadarUnavailableError ? q.error.message : 'Market radar unavailable.';
    return <section className="rp-radar" aria-labelledby="rp-radar-h" data-testid="market-radar" data-radar-state="unavailable">{header}
      <p className="rp-note" role="status">{msg} Discovery and live orderbook depth are unaffected — this panel only adds historical lifecycle insight.</p></section>;
  }

  const snapshot = q.data;
  const { token: t, market } = radarForToken(snapshot, token);
  const stale = !snapshot.health.ok || snapshot.freshness.lagBlocks > 120;

  if (!t) return <section className="rp-radar" aria-labelledby="rp-radar-h" data-testid="market-radar" data-radar-state="empty">{header}
    <p className="rp-note" role="status">No radar lifecycle events for this token yet{stale ? ' (radar is still syncing)' : ''}.</p></section>;

  return <section className="rp-radar" aria-labelledby="rp-radar-h" data-testid="market-radar" data-radar-state="ready" data-radar-phase={t.phase}>
    {header}
    {stale && <p className="rp-note" role="status" data-testid="radar-stale">Radar is {snapshot.health.status.toLowerCase()} (lag {snapshot.freshness.lagBlocks} blocks); figures below may be behind the chain.</p>}
    <dl className="rp-radar-grid">
      <div><dt>Lifecycle phase</dt><dd>{t.phase.replace(/_/g, ' ').toLowerCase()}</dd></div>
      <div><dt>Graduation latency</dt><dd title="GraduationCompleted − TokenLaunched">{fmtDuration(t.graduationLatencyS)}</dd></div>
      <div><dt>Time to first Kuru trade</dt><dd title="First Kuru trade − graduation">{fmtDuration(t.timeToFirstKuruTradeS)}</dd></div>
      <div><dt>Filled Kuru trades</dt><dd>{market ? market.trades : 0}</dd></div>
      <div><dt>Historical filled size</dt><dd>{market ? fmtUnits(market.filledBaseUnits) : '0'} <span className="rp-unit">base</span></dd></div>
      <div><dt>Historical quote volume</dt><dd>{market ? fmtUnits(market.quoteVolume18) : '0'} <span className="rp-unit">{quoteSymbol}</span> <span className="rp-muted" title="18-decimal normalized price × size; historical, not live depth">hist.</span></dd></div>
      <div><dt>Order churn</dt><dd>{market ? `${market.ordersCreated} created · ${market.ordersCanceled} cancelled` : '—'}</dd></div>
      <div><dt>Indexed through</dt><dd>block {snapshot.freshness.cursorBlock.toLocaleString('en-US')} · lag {snapshot.freshness.lagBlocks}</dd></div>
    </dl>
    <div className="rp-radar-proof">
      {t.graduationTx && <span>Graduation <AddressChip value={t.graduationTx} kind="tx" label="graduation transaction" /></span>}
      {market?.firstTradeTx && <span>First trade <AddressChip value={market.firstTradeTx} kind="tx" label="first Kuru trade" /></span>}
    </div>
    <p className="rp-note">Historical insight from the Envio HyperSync stream. Executable orderbook depth comes from live Kuru reads, not these counts.</p>
  </section>;
}
