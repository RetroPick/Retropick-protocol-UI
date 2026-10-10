// Pure market-quality aggregation over RetroPick launch-lifecycle + Kuru orderbook
// events. No I/O: the stream module feeds decoded events in, snapshots come out.
// All quantities are exact bigints; quote volume is 18-decimal normalized
// (priceX18 × filledSize / 1e18) and labeled as such downstream.
export interface RadarEvent {
  name: string;
  address: string;
  blockNumber: number;
  blockTimestamp: number; // seconds
  logIndex: number;
  transactionHash: string;
  args: Record<string, unknown>;
}

export interface TokenLifecycle {
  token: string;
  launchedAt: number | null;
  committedAt: number | null;
  securedAt: number | null;
  completedAt: number | null;
  /** Graduation latency = GraduationCompleted − TokenLaunched (seconds), null until both. */
  graduationLatencyS: number | null;
}

export interface MarketActivity {
  market: string;
  token: string | null;
  trades: number;
  ordersCreated: number;
  ordersCanceled: number;
  filledBaseUnits: bigint;
  /** 18-decimal-normalized quote volume (see module comment). */
  quoteVolume18: bigint;
  lastTradeBlock: number | null;
  lastTradeAt: number | null;
}

export interface RadarMetrics {
  lastBlock: number;
  counts: { launched: number; committed: number; secured: number; completed: number };
  activeOnCurve: number;
  tokens: TokenLifecycle[];
  markets: MarketActivity[];
  computedAt: number;
}

export class RadarAggregator {
  #seen = new Set<string>();
  #tokens = new Map<string, TokenLifecycle>();
  #markets = new Map<string, MarketActivity>();
  #counts = { launched: 0, committed: 0, secured: 0, completed: 0 };
  #lastBlock = 0;
  /** market address → token, discovered from caller config or the launch journal upstream. */
  #marketTokens: Map<string, string>;

  constructor(marketTokens: Record<string, string> = {}) {
    this.#marketTokens = new Map(Object.entries(marketTokens));
  }

  /** Idempotent ingest: each (block, logIndex, tx) is processed exactly once. */
  ingest(events: RadarEvent[]): { accepted: number; duplicates: number } {
    let accepted = 0, duplicates = 0;
    for (const e of events) {
      const key = `${e.blockNumber}:${e.logIndex}:${e.transactionHash}`;
      if (this.#seen.has(key)) { duplicates++; continue; }
      this.#seen.add(key);
      this.#lastBlock = Math.max(this.#lastBlock, e.blockNumber);
      this.#apply(e);
      accepted++;
    }
    return { accepted, duplicates };
  }

  #apply(e: RadarEvent): void {
    switch (e.name) {
      case 'TokenLaunched': {
        const token = String(e.args.token);
        this.#tokens.set(token, { token, launchedAt: e.blockTimestamp, committedAt: null, securedAt: null, completedAt: null, graduationLatencyS: null });
        this.#counts.launched++;
        break;
      }
      case 'LaunchCommitted': {
        const t = this.#lifecycle(String(e.args.token));
        t.committedAt = e.blockTimestamp;
        this.#counts.committed++;
        break;
      }
      case 'GraduationSecured': {
        const t = this.#lifecycle(String(e.args.token));
        t.securedAt = e.blockTimestamp;
        this.#counts.secured++;
        break;
      }
      case 'GraduationCompleted': {
        const t = this.#lifecycle(String(e.args.token));
        t.completedAt = e.blockTimestamp;
        this.#counts.completed++;
        if (t.launchedAt !== null) t.graduationLatencyS = e.blockTimestamp - t.launchedAt;
        break;
      }
      case 'Trade': {
        const m = this.#market(e.address);
        m.trades++;
        m.lastTradeBlock = e.blockNumber;
        m.lastTradeAt = e.blockTimestamp;
        const filled = BigInt(e.args.filledSize ?? 0n);
        const price = BigInt(e.args.price ?? 0n);
        m.filledBaseUnits += filled;
        m.quoteVolume18 += (price * filled) / 10n ** 18n;
        break;
      }
      case 'OrderCreated': {
        this.#market(e.address).ordersCreated++;
        break;
      }
      case 'OrderCanceled': {
        this.#market(e.address).ordersCanceled++;
        break;
      }
      case 'OrdersCanceled': {
        const ids = Array.isArray(e.args.orderId) ? e.args.orderId : [];
        this.#market(e.address).ordersCanceled += ids.length;
        break;
      }
      default: break; // unknown events are ignored, never fatal
    }
  }

  #lifecycle(token: string): TokenLifecycle {
    let t = this.#tokens.get(token);
    if (!t) { t = { token, launchedAt: null, committedAt: null, securedAt: null, completedAt: null, graduationLatencyS: null }; this.#tokens.set(token, t); }
    return t;
  }

  #market(address: string): MarketActivity {
    const key = address.toLowerCase();
    let m = this.#markets.get(key);
    if (!m) { m = { market: key, token: this.#marketTokens.get(key) ?? null, trades: 0, ordersCreated: 0, ordersCanceled: 0, filledBaseUnits: 0n, quoteVolume18: 0n, lastTradeBlock: null, lastTradeAt: null }; this.#markets.set(key, m); }
    return m;
  }

  snapshot(): RadarMetrics {
    const tokens = [...this.#tokens.values()];
    const activeOnCurve = tokens.filter((t) => t.launchedAt !== null && t.completedAt === null).length;
    const json: RadarMetrics = {
      lastBlock: this.#lastBlock,
      counts: { ...this.#counts },
      activeOnCurve,
      tokens: tokens.sort((a, b) => (b.launchedAt ?? 0) - (a.launchedAt ?? 0)),
      markets: [...this.#markets.values()].map((m) => ({ ...m })),
      computedAt: Math.floor(Date.now() / 1000),
    };
    return json;
  }
}

/** JSON-safe rendering (bigint → string), the only wire format the server emits. */
export function radarJson(metrics: RadarMetrics): string {
  return JSON.stringify(metrics, (_, v) => (typeof v === 'bigint' ? v.toString() : v));
}

/** Freshness helper: seconds since the market's last trade (null when never traded). */
export function marketStalenessS(m: MarketActivity, nowS: number): number | null {
  return m.lastTradeAt === null ? null : Math.max(0, nowS - m.lastTradeAt);
}
