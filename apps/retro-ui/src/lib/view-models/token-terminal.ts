// Typed presentation boundary for the token terminal.
// One component tree renders both sources; provenance stays explicit through `dataMode`.
// Every on-chain amount is an exact integer string (raw units) — no float math happens here.
import type { IndexedCandle, IndexedHolder, IndexedOrder, IndexedTrade } from '@retropick/launchpad-sdk/read-model';

export type DataMode = 'demo' | 'live';
export type Lifecycle = 'ACTIVE' | 'GRADUATION_READY' | 'GRADUATING' | 'GRADUATED' | 'PENDING_CONFIRMATION';
export type Venue = 'CURVE' | 'KURU' | 'UNSUPPORTED';

/** Visible chart time range — independent from candle interval. Values match the indexer `range` parameter. */
export type ChartRange = '1h' | '6h' | '24h' | '7d' | 'all';
/** Candle aggregation interval. Values match the indexer `resolution` parameter. */
export type CandleInterval = '1m' | '5m' | '15m' | '1h';

export const RANGE_LABELS: Record<ChartRange, string> = { '1h': '1H', '6h': '6H', '24h': '1D', '7d': '7D', all: 'All' };
export const INTERVAL_SECONDS: Record<CandleInterval, number> = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600 };
export const RANGE_SECONDS: Record<ChartRange, number> = { '1h': 3600, '6h': 21600, '24h': 86400, '7d': 604800, all: Number.POSITIVE_INFINITY };
/**
 * Interval choices per range. The indexer accepts every range × interval pair, but a page holds at most
 * 1500 candles by default; combinations are restricted so one page always covers the full visible range
 * (7D × 15m = 672, 1D × 5m = 288, 6H × 1m = 360). 'All' may still be paginated and is labelled when truncated.
 */
export const RANGE_INTERVALS: Record<ChartRange, CandleInterval[]> = {
  '1h': ['1m', '5m'],
  '6h': ['1m', '5m', '15m'],
  '24h': ['5m', '15m', '1h'],
  '7d': ['15m', '1h'],
  all: ['15m', '1h'],
};
export const DEFAULT_INTERVAL: Record<ChartRange, CandleInterval> = { '1h': '1m', '6h': '5m', '24h': '15m', '7d': '1h', all: '1h' };

export function intervalFor(range: ChartRange, wanted: CandleInterval): CandleInterval {
  return RANGE_INTERVALS[range].includes(wanted) ? wanted : DEFAULT_INTERVAL[range];
}

export interface AddressSet {
  token: string | null;
  curve: string | null;
  factory: string | null;
  coordinator: string | null;
  quoteAsset: string | null;
  creator: string | null;
  creatorFeeRecipient: string | null;
  market: string | null;
  vault: string | null;
  lpLock: string | null;
  excessLock: string | null;
}

export interface TerminalEconomics {
  curveFeeBps: number | null;
  creatorFeeBps: number | null;
  /** Quote policy identity, as read from the launch packet. */
  policy: string | null;
  buybackEnabled: boolean | null;
  graduationThresholdRaw: string | null;
}

export interface Freshness { indexedBlock: string; lagBlocks: number; stale: boolean }

export interface Paged<T> {
  rows: T[];
  /** null = the source returned the complete set; string = more pages exist. */
  nextCursor: string | null;
  status: 'ready' | 'loading' | 'error' | 'unavailable';
}

export interface TokenTerminalVM {
  dataMode: DataMode;
  /** For demo: fixture id (demo namespace). For live: lower-case token address. */
  id: string;
  /** Present only for demo fixtures; versioned for deterministic tests. */
  fixtureVersion?: string;
  name: string;
  symbol: string;
  description: string;
  logo: string | null;
  icon: { glyph: string; color: string };
  socials: Partial<Record<'website' | 'twitter' | 'telegram' | 'discord' | 'farcaster', string>>;
  createdAt: number | null; // unix seconds
  /** Reference clock: Date.now() for live, the fixture snapshot for demo. */
  now: number;
  quote: { symbol: string; decimals: number; native: boolean };
  baseDecimals: number;
  lifecycle: Lifecycle;
  venue: Venue;
  price: { x18: string | null; source: string };
  change24hBps: string | null;
  marketCapRaw: string | null;
  liquidityRaw: string | null;
  liquidityNote: string;
  volume24hRaw: string | null;
  lifetimeVolumeRaw: string | null;
  trades24h: number | null;
  holderCount: number | null;
  supplyRaw: string | null;
  /** Per-launch creator earnings are not exposed by the indexer (documented dependency). */
  creatorEarnedRaw: string | null;
  bondingProgressBps: number | null;
  addresses: AddressSet;
  economics: TerminalEconomics;
  txs: { launch: string | null; graduation: string | null };
  graduationTimestamp: number | null;
  freshness: Freshness | null;
  sync: { onchain: 'ready' | 'syncing' | 'error'; indexer: 'ready' | 'pending' | 'stale' | 'unavailable'; message: string | null };
}

export interface TerminalData {
  candles: Paged<IndexedCandle>;
  trades: Paged<IndexedTrade>;
  holders: Paged<IndexedHolder>;
  orders: Paged<IndexedOrder> | null;
}

// ── Orderbook depth (aggregated Kuru L2 book; display-only, exact bigint) ──────

export interface DepthLevel { priceX18: bigint; sizeRaw: bigint; cumulativeRaw: bigint }
export interface DepthLadder {
  /** Ascending by price; asks[0] is the best (lowest) ask. */
  asks: DepthLevel[];
  /** Descending by price; bids[0] is the best (highest) bid. */
  bids: DepthLevel[];
  spreadX18: bigint | null;
  /** Integer midpoint (truncating halves); null when a side is empty. */
  midX18: bigint | null;
}
export interface TerminalDepth {
  status: 'ready' | 'loading' | 'error' | 'stale' | 'unavailable';
  ladder: DepthLadder | null;
  /** Chain block the book was read at (live) or '0' (demo fixture). */
  block: string | null;
  observedAt: number | null;
}

/**
 * Aggregate raw orderbook levels into a cumulative ladder. The on-chain L2 book is already
 * tick-aggregated, but levels are deduped and re-sorted here so malformed or replayed inputs
 * can never produce a crossed-looking display. Same-price levels merge (sizes sum).
 */
export function buildDepthLadder(book: { bids: Array<{ price: bigint; size: bigint }>; asks: Array<{ price: bigint; size: bigint }> }): DepthLadder {
  const merge = (levels: Array<{ price: bigint; size: bigint }>, descending: boolean): DepthLevel[] => {
    const byPrice = new Map<bigint, bigint>();
    for (const level of levels) {
      if (level.price <= 0n || level.size <= 0n) continue;
      byPrice.set(level.price, (byPrice.get(level.price) ?? 0n) + level.size);
    }
    const sorted = [...byPrice.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    if (descending) sorted.reverse();
    let cumulative = 0n;
    return sorted.map(([priceX18, sizeRaw]) => { cumulative += sizeRaw; return { priceX18, sizeRaw, cumulativeRaw: cumulative }; });
  };
  const asks = merge(book.asks, false), bids = merge(book.bids, true);
  const bestAsk = asks.length ? asks[0].priceX18 : null, bestBid = bids.length ? bids[0].priceX18 : null;
  const spreadX18 = bestAsk !== null && bestBid !== null && bestAsk >= bestBid ? bestAsk - bestBid : null;
  const midX18 = bestAsk !== null && bestBid !== null ? (bestAsk + bestBid) / 2n : null;
  return { asks, bids, spreadX18, midX18 };
}

// ── Exact display helpers (string/bigint only) ─────────────────────────────────

/** Exact decimal formatting of a raw integer, truncating (never rounding up) to `digits` fractional digits. */
export function formatRaw(raw: string | bigint | null | undefined, decimals: number, digits = 6): string {
  if (raw === null || raw === undefined || raw === '') return '—';
  let value: bigint;
  try { value = BigInt(raw); } catch { return '—'; }
  const negative = value < 0n;
  if (negative) value = -value;
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = (value % base).toString().padStart(decimals, '0');
  const wholeText = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  let clipped = fraction.slice(0, digits).replace(/0+$/, '');
  if (!clipped && whole === 0n && value !== 0n) {
    // Tiny non-zero values keep their first significant digits instead of collapsing to 0.
    const firstSig = fraction.search(/[1-9]/);
    clipped = fraction.slice(0, Math.min(decimals, firstSig + 4)).replace(/0+$/, '');
  }
  return `${negative ? '-' : ''}${wholeText}${clipped ? `.${clipped}` : ''}`;
}

/** Compact exact-ish display (K/M/B) computed with bigint division; used for dense metric strips. */
export function formatRawCompact(raw: string | bigint | null | undefined, decimals: number): string {
  if (raw === null || raw === undefined || raw === '') return '—';
  let value: bigint;
  try { value = BigInt(raw); } catch { return '—'; }
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const units: Array<[bigint, string]> = [[10n ** 9n, 'B'], [10n ** 6n, 'M'], [10n ** 3n, 'K']];
  for (const [size, suffix] of units) {
    if (whole >= size) {
      const hundredths = value * 100n / (size * base);
      const int = hundredths / 100n;
      const frac = (hundredths % 100n).toString().padStart(2, '0').replace(/0+$/, '');
      return `${int}${frac ? `.${frac}` : ''}${suffix}`;
    }
  }
  return formatRaw(value, decimals, whole >= 1n ? 2 : 6);
}

/** Price is quote-per-token in 1e18 fixed point. Significant digits adapt to magnitude. */
export function formatPriceX18(x18: string | null | undefined): string {
  if (!x18) return '—';
  let value: bigint;
  try { value = BigInt(x18); } catch { return '—'; }
  return formatRaw(value, 18, value >= 10n ** 18n ? 4 : 8);
}

export function formatBps(bps: string | number | null | undefined, signed = false): string {
  if (bps === null || bps === undefined || bps === '') return '—';
  let value: bigint;
  try { value = BigInt(bps); } catch { return '—'; }
  const sign = value > 0n && signed ? '+' : value < 0n ? '-' : '';
  const abs = value < 0n ? -value : value;
  const frac = (abs % 100n).toString().padStart(2, '0').replace(/0+$/, '');
  return `${sign}${abs / 100n}${frac ? `.${frac}` : ''}%`;
}

export function changeDirection(bps: string | null | undefined): 'up' | 'down' | 'flat' | 'none' {
  if (bps === null || bps === undefined || bps === '') return 'none';
  try { const v = BigInt(bps); return v > 0n ? 'up' : v < 0n ? 'down' : 'flat'; } catch { return 'none'; }
}

export function ageFrom(timestamp: number | null | undefined, now: number): string {
  if (!timestamp) return '—';
  const seconds = Math.max(0, Math.floor(now / 1000 - timestamp));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function shortHex(value: string | null | undefined): string {
  return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : '—';
}

/** Order size in raw base units (golden-tested equivalent of the former inline kuru-ticket math). */
export function orderSizeRaw(sizeUnits: string, baseDecimals: number, sizePrecision: string): bigint {
  return BigInt(sizeUnits) * 10n ** BigInt(baseDecimals) / BigInt(sizePrecision);
}

/** Value of a holder balance in quote raw units (golden-tested equivalent of the former inline token-detail math). */
export function holderValueRaw(balanceRaw: string, priceX18: string, quoteDecimals: number, baseDecimals: number): bigint {
  return BigInt(balanceRaw) * BigInt(priceX18) * 10n ** BigInt(quoteDecimals) / (10n ** BigInt(baseDecimals) * 10n ** 18n);
}

/** Curve spot price x18 from reserves (golden-tested equivalent of the former inline token-detail math). */
export function curveSpotX18(quoteReserve: bigint, tokenReserve: bigint, quoteDecimals: number): bigint {
  return quoteReserve * 10n ** 18n * 10n ** 18n / (tokenReserve * 10n ** BigInt(quoteDecimals));
}

/** Market cap in quote raw units (golden-tested equivalent of the former inline token-detail math). */
export function marketCapRaw(priceX18: bigint, supply: bigint, quoteDecimals: number, baseDecimals: number): bigint {
  return priceX18 * supply * 10n ** BigInt(quoteDecimals) / (10n ** BigInt(baseDecimals) * 10n ** 18n);
}

/**
 * Client-side candle aggregation for DEMO fixtures only (live candles come pre-aggregated from the indexer).
 * Mirrors the indexer's OHLCV bucketing rule: open = first, close = last, high/low = extremes, volumes summed.
 */
export function aggregateCandles(base: IndexedCandle[], interval: CandleInterval): IndexedCandle[] {
  const width = INTERVAL_SECONDS[interval];
  const buckets = new Map<number, IndexedCandle>();
  for (const row of [...base].sort((a, b) => a.timestamp - b.timestamp)) {
    const t = row.timestamp - (row.timestamp % width);
    const prev = buckets.get(t);
    if (!prev) { buckets.set(t, { ...row, timestamp: t }); continue; }
    prev.high = BigInt(row.high) > BigInt(prev.high) ? row.high : prev.high;
    prev.low = BigInt(row.low) < BigInt(prev.low) ? row.low : prev.low;
    prev.close = row.close;
    prev.quoteVolumeRaw = (BigInt(prev.quoteVolumeRaw) + BigInt(row.quoteVolumeRaw)).toString();
    prev.tradeCount += row.tradeCount;
  }
  return [...buckets.values()];
}

export const lifecycleLabel: Record<Lifecycle, string> = {
  ACTIVE: 'Bonding curve',
  GRADUATION_READY: 'Graduation ready',
  GRADUATING: 'Graduating',
  GRADUATED: 'Graduated · Kuru',
  PENDING_CONFIRMATION: 'Pending confirmation',
};
