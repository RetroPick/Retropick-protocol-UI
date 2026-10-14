// Discovery row view model shared by live (indexer) and demo (fixture) launch tables. Exact raw strings only.
import type { IndexedLaunch } from '@retropick/launchpad-sdk/read-model';
import { resolveMediaSrc } from '@/lib/media/resolve';
import { DEMO_NOW_MS, demoFixtureIds, getDemoFixture } from './demo-terminal-fixtures';
import type { Lifecycle } from './token-terminal';

export type LifecycleFilter = 'marketCap' | 'new' | 'active' | 'near-graduation' | 'graduated';
export const LIFECYCLE_FILTERS: Array<[LifecycleFilter, string]> = [['marketCap', 'Market cap'], ['new', 'New'], ['active', 'Active'], ['near-graduation', 'Near graduation'], ['graduated', 'Graduated']];
/** Same threshold as the indexer's NEAR_GRADUATION_BPS. */
export const NEAR_GRADUATION_BPS = 8000;

export interface DiscoveryRow {
  dataMode: 'demo' | 'live';
  id: string;
  href: string;
  name: string;
  symbol: string;
  logo: string | null;
  icon: { glyph: string; color: string };
  quote: { symbol: string; decimals: number; address: string | null };
  lifecycle: Lifecycle;
  bondingProgressBps: number | null;
  quoteReserveRaw?: string;
  priceX18: string | null;
  change24hBps: string | null;
  marketCapRaw: string | null;
  liquidityRaw: string | null;
  volume24hRaw: string | null;
  lifetimeVolumeRaw: string | null;
  trades24h: number | null;
  createdAt: number | null;
  creator: string | null;
  /** Real bucket closes (x18) used for the row sparkline; empty → no graph. */
  closes: string[];
}

export function liveRow(l: IndexedLaunch): DiscoveryRow {
  return {
    dataMode: 'live', id: l.token, href: `/launchpad/token/${l.token}`, name: l.name, symbol: l.symbol,
    logo: resolveMediaSrc(l.logo), icon: { glyph: (l.name[0] ?? '◈').toUpperCase(), color: '#836ef9' },
    quote: { symbol: l.quoteSymbol, decimals: l.quoteDecimals, address: l.quoteAsset }, lifecycle: l.phase, bondingProgressBps: l.bondingProgressBps, quoteReserveRaw: l.quoteReserveRaw,
    priceX18: l.priceX18 ?? l.priceRaw, change24hBps: l.change24hBps, marketCapRaw: l.marketCapRaw, liquidityRaw: l.liquidityRaw ?? null,
    volume24hRaw: l.volume24hRaw, lifetimeVolumeRaw: l.lifetimeVolumeRaw, trades24h: l.trades24h,
    createdAt: Math.floor(Date.parse(l.createdAt) / 1000) || null, creator: l.creator, closes: (l.candles ?? []).map((c) => c.close),
  };
}

let demoCache: DiscoveryRow[] | null = null;
export function demoRows(): DiscoveryRow[] {
  if (demoCache) return demoCache;
  demoCache = demoFixtureIds.map((id) => {
    const { vm, data } = getDemoFixture(id)!;
    const since = DEMO_NOW_MS / 1000 - 86400;
    const day = data.candles.rows.filter((c) => c.timestamp >= since);
    // Hourly sample of the fixture's own 24h candles (SIMULATED, labelled in the UI).
    const closes = day.filter((_, i) => i % Math.max(1, Math.floor(day.length / 24)) === 0).map((c) => c.close);
    return {
      dataMode: 'demo', id, href: `/launchpad/token/${id}`, name: vm.name, symbol: vm.symbol, logo: null, icon: vm.icon,
      quote: { symbol: vm.quote.symbol, decimals: vm.quote.decimals, address: null }, lifecycle: vm.lifecycle, bondingProgressBps: vm.bondingProgressBps,
      priceX18: vm.price.x18, change24hBps: vm.change24hBps, marketCapRaw: vm.marketCapRaw, liquidityRaw: vm.liquidityRaw, volume24hRaw: vm.volume24hRaw,
      lifetimeVolumeRaw: vm.lifetimeVolumeRaw, trades24h: vm.trades24h, createdAt: vm.createdAt, creator: vm.addresses.creator, closes,
    } satisfies DiscoveryRow;
  });
  return demoCache;
}

const big = (v: string | null) => (v ? BigInt(v) : -1n);
/** Client-side equivalent of the indexer feed filter for DEMO rows (live filtering stays server-side). */
export function filterDemoRows(rows: DiscoveryRow[], filter: LifecycleFilter, quote: string): DiscoveryRow[] {
  const out = rows.filter((r) => (!quote || r.quote.symbol === quote)
    && (filter === 'active' ? r.lifecycle === 'ACTIVE'
      : filter === 'near-graduation' ? r.lifecycle === 'ACTIVE' && (r.bondingProgressBps ?? 0) >= NEAR_GRADUATION_BPS
      : filter === 'graduated' ? r.lifecycle === 'GRADUATED' : true));
  return out.sort((a, b) => filter === 'new' ? (b.createdAt ?? 0) - (a.createdAt ?? 0) : big(b.marketCapRaw) > big(a.marketCapRaw) ? 1 : big(b.marketCapRaw) < big(a.marketCapRaw) ? -1 : 0);
}

export function searchDemoRows(q: string): DiscoveryRow[] {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  return demoRows().filter((r) => `${r.name} ${r.symbol} ${r.creator ?? ''} ${r.id}`.toLowerCase().includes(t));
}
