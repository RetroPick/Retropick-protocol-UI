/**
 * Read-only client for the Envio Market Quality Radar (sponsor: Envio).
 *
 * The radar is a SECONDARY, historical-insight source. The indexer stays canonical for
 * launch discovery; direct Kuru reads stay canonical for executable orderbook depth. The
 * radar never carries a credential (the ENVIO_API_TOKEN lives only in the backend radar
 * process); the browser reads same-origin `/api/radar/*` through the staging gateway.
 *
 * All numeric aggregates arrive as decimal strings (exact bigints on the wire) and are
 * parsed to bigint here — never to float.
 */
import { RADAR_URL, CHAIN_ID } from './env';

export interface RadarMarket {
  market: string;
  token: string | null;
  trades: number;
  ordersCreated: number;
  ordersCanceled: number | null;
  baseDecimals: number | null;
  filledBaseUnits: bigint | null;
  quoteVolume18: bigint | null;
  firstTradeAt: number | null;
  firstTradeTx: string | null;
  lastTradeAt: number | null;
  lastTradeTx: string | null;
  stalenessS: number | null;
}

export interface RadarToken {
  token: string;
  phase: 'LAUNCHED' | 'COMMITTED' | 'GRADUATION_SECURED' | 'GRADUATED' | 'UNKNOWN';
  launchedAt: number | null;
  completedAt: number | null;
  graduationLatencyS: number | null;
  timeToFirstKuruTradeS: number | null;
  market: string | null;
  graduationTx: string | null;
}

export interface RadarSnapshot {
  aggregationVersion: number | null;
  source: 'ENVIO_HYPERSYNC';
  chainId: number;
  counts: { launched: number; committed: number; secured: number; completed: number };
  activeOnCurve: number;
  tokens: RadarToken[];
  markets: RadarMarket[];
  freshness: { headHeight: number; lastEventBlock: number; cursorBlock: number; lagBlocks: number };
  health: { ok: boolean; status: string; anchorVerified: boolean };
  computedAt: number;
}

export class RadarUnavailableError extends Error {
  constructor(message: string, readonly cause?: unknown) { super(message); this.name = 'RadarUnavailableError'; }
}

const big = (v: unknown) => typeof v === 'string' && /^\d+$/.test(v) ? BigInt(v) : null;

/** Exact units; never describe a positive amount below display precision as zero. */
export function formatRadarAmount(raw: bigint | null, decimals: number | null): string {
  if (raw === null || decimals === null || !Number.isInteger(decimals) || decimals < 0 || decimals > 255 || raw < 0n) return 'Unavailable';
  if (raw === 0n) return '0';
  const scale = 10n ** BigInt(decimals);
  if (raw * 10_000n < scale) return '<0.0001';
  const whole = raw / scale;
  const fraction = (raw % scale).toString().padStart(decimals, '0').slice(0, 4).replace(/0+$/, '');
  return `${whole.toLocaleString('en-US')}${fraction ? '.' + fraction : ''}`;
}

export async function fetchRadar(signal?: AbortSignal): Promise<RadarSnapshot> {
  if (!RADAR_URL) throw new RadarUnavailableError('Radar disabled (no live mode).');
  let res: Response;
  try {
    res = await fetch(`${RADAR_URL}/radar`, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000), headers: { accept: 'application/json' } });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new RadarUnavailableError('Market radar unreachable.', error);
  }
  if (res.status === 503) throw new RadarUnavailableError('Market radar is syncing or degraded.');
  if (!res.ok) throw new RadarUnavailableError(`Market radar HTTP ${res.status}.`);
  let raw: Record<string, unknown>;
  try { raw = await res.json() as Record<string, unknown>; } catch (error) { throw new RadarUnavailableError('Market radar returned non-JSON.', error); }
  return parseRadarSnapshot(raw);
}

export function parseRadarSnapshot(raw: Record<string, unknown>): RadarSnapshot {
  if (raw.source !== 'ENVIO_HYPERSYNC' || raw.chainId !== CHAIN_ID) throw new RadarUnavailableError('Market radar provenance/chain rejected.');
  const current = raw.aggregationVersion === 4;
  const markets = (Array.isArray(raw.markets) ? raw.markets as Array<Record<string, unknown>> : []).map((m) => {
    const baseDecimals = current && typeof m.baseDecimals === 'number' && Number.isInteger(m.baseDecimals) && m.baseDecimals >= 0 && m.baseDecimals <= 255 ? m.baseDecimals : null;
    return {
      market: String(m.market), token: (m.token as string | null) ?? null,
      trades: Number(m.trades ?? 0), ordersCreated: Number(m.ordersCreated ?? 0), ordersCanceled: current ? Number(m.ordersCanceled ?? 0) : null,
      baseDecimals, filledBaseUnits: baseDecimals === null ? null : big(m.filledBaseUnits), quoteVolume18: baseDecimals === null ? null : big(m.quoteVolume18),
      firstTradeAt: (m.firstTradeAt as number | null) ?? null, firstTradeTx: (m.firstTradeTx as string | null) ?? null,
      lastTradeAt: (m.lastTradeAt as number | null) ?? null, lastTradeTx: (m.lastTradeTx as string | null) ?? null,
      stalenessS: (m.stalenessS as number | null) ?? null,
    } satisfies RadarMarket;
  });
  const tokens = (raw.tokens as Array<Record<string, unknown>> ?? []).map((t) => ({
    token: String(t.token), phase: t.phase as RadarToken['phase'],
    launchedAt: (t.launchedAt as number | null) ?? null, completedAt: (t.completedAt as number | null) ?? null,
    graduationLatencyS: (t.graduationLatencyS as number | null) ?? null, timeToFirstKuruTradeS: (t.timeToFirstKuruTradeS as number | null) ?? null,
    market: (t.market as string | null) ?? null, graduationTx: (t.graduationTx as string | null) ?? null,
  }) satisfies RadarToken);
  const f = raw.freshness as RadarSnapshot['freshness'] | undefined;
  return {
    aggregationVersion: typeof raw.aggregationVersion === 'number' ? raw.aggregationVersion : null,
    source: 'ENVIO_HYPERSYNC', chainId: CHAIN_ID,
    counts: raw.counts as RadarSnapshot['counts'], activeOnCurve: Number(raw.activeOnCurve ?? 0),
    tokens, markets,
    freshness: { headHeight: Number(f?.headHeight ?? 0), lastEventBlock: Number(f?.lastEventBlock ?? 0), cursorBlock: Number(f?.cursorBlock ?? 0), lagBlocks: Number(f?.lagBlocks ?? 0) },
    health: (raw.health as RadarSnapshot['health']) ?? { ok: false, status: 'UNKNOWN', anchorVerified: false },
    computedAt: Number(raw.computedAt ?? 0),
  };
}

/** Find the radar entry for a token (lowercased match). */
export function radarForToken(snapshot: RadarSnapshot, token: string): { token: RadarToken | null; market: RadarMarket | null } {
  const t = snapshot.tokens.find((x) => x.token.toLowerCase() === token.toLowerCase()) ?? null;
  const market = t?.market ? snapshot.markets.find((m) => m.market.toLowerCase() === t.market!.toLowerCase()) ?? null : null;
  return { token: t, market };
}
