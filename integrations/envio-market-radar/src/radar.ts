// Pure market-quality aggregation over RetroPick launch-lifecycle + Kuru orderbook
// events. No I/O: the stream module feeds decoded events in, snapshots come out.
// All quantities are exact bigints; quote volume is 18-decimal normalized
// (priceX18 × filledSize / 1e18) and labeled as such downstream.
//
// Addresses are normalised to lowercase everywhere (config, event args, log address).
// Market → token mapping is AUTHORITATIVELY derived onchain from the coordinator's
// GraduationCompleted(token, destination=bytes32(market), …); configured mappings are a
// bootstrap only and a conflict with the onchain value is counted, never silently merged.
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
  /** Kuru market from GraduationCompleted.destination (lowercase) */
  market: string | null;
  launchTx: string | null;
  graduationTx: string | null;
  graduationBlock: number | null;
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
  firstTradeBlock: number | null;
  firstTradeAt: number | null;
  firstTradeTx: string | null;
  lastTradeBlock: number | null;
  lastTradeAt: number | null;
  lastTradeTx: string | null;
}

export type Phase = 'LAUNCHED' | 'COMMITTED' | 'GRADUATION_SECURED' | 'GRADUATED' | 'UNKNOWN';

export interface RadarMetrics {
  lastBlock: number;
  counts: { launched: number; committed: number; secured: number; completed: number };
  activeOnCurve: number;
  tokens: Array<TokenLifecycle & { phase: Phase; timeToFirstKuruTradeS: number | null }>;
  markets: MarketActivity[];
  computedAt: number;
  /** Separated freshness metrics (never conflate these). */
  freshness: {
    /** Latest chain height observed from the stream/source. */
    headHeight: number;
    /** Block of the last RELEVANT event ingested (0 when none). */
    lastEventBlock: number;
    /** Next block the stream will read (processing cursor). */
    cursorBlock: number;
    /** headHeight − cursorBlock: true processing lag. */
    lagBlocks: number;
    /** headHeight − lastEventBlock (informational; events are sparse by nature). */
    headMinusEvent: number;
  };
  /** Decoding failures — counted, never silently dropped. */
  decodeErrors: number;
  mappingConflicts: number;
}

const lc = (v: unknown) => String(v ?? '').toLowerCase();
const BIG_KEYS = ['filledBaseUnits', 'quoteVolume18'] as const;

/** bytes32 left-padded address → lowercase 20-byte address, or null if not address-shaped. */
export function bytes32ToAddress(value: unknown): string | null {
  const s = lc(value);
  const m = s.match(/^0x0{24}([0-9a-f]{40})$/);
  if (m) return '0x' + m[1];
  return /^0x[0-9a-f]{40}$/.test(s) ? s : null;
}

export interface PersistedAggregator {
  seen: string[];
  tokens: [string, TokenLifecycle][];
  markets: [string, MarketActivity][];
  marketTokens: [string, string][];
  counts: RadarMetrics['counts'];
  lastBlock: number;
  decodeErrors: number;
  mappingConflicts: number;
  lastEventBlock: number;
}

export class RadarAggregator {
  #seen = new Set<string>();
  #tokens = new Map<string, TokenLifecycle>();
  #markets = new Map<string, MarketActivity>();
  #counts = { launched: 0, committed: 0, secured: 0, completed: 0 };
  #lastBlock = 0;
  #marketTokens: Map<string, string>;
  #decodeErrors = 0;
  #mappingConflicts = 0;
  #lastEventBlock = 0;
  #headHeight = 0;

  constructor(marketTokens: Record<string, string> = {}) {
    this.#marketTokens = new Map(Object.entries(marketTokens).map(([m, t]) => [lc(m), lc(t)]));
  }

  /** Restore from a persisted snapshot. Accepts bigint fields as strings (JSON). */
  static restore(state: Partial<PersistedAggregator>, marketTokens: Record<string, string> = {}): RadarAggregator {
    const agg = new RadarAggregator(marketTokens);
    for (const [m, t] of state.marketTokens ?? []) agg.#marketTokens.set(lc(m), lc(t));
    for (const id of state.seen ?? []) agg.#seen.add(id);
    for (const [k, v] of state.tokens ?? []) agg.#tokens.set(lc(k), { ...v });
    for (const entry of state.markets ?? []) {
      const [key, raw] = entry as [string, MarketActivity];
      const m = { ...raw } as MarketActivity & Record<string, unknown>;
      for (const k of BIG_KEYS) m[k] = BigInt((raw as unknown as Record<string, unknown>)[k] as string | bigint ?? 0);
      agg.#markets.set(lc(key), m);
    }
    if (state.counts) agg.#counts = { ...state.counts };
    agg.#lastBlock = state.lastBlock ?? 0;
    agg.#lastEventBlock = state.lastEventBlock ?? state.lastBlock ?? 0;
    agg.#decodeErrors = state.decodeErrors ?? 0;
    agg.#mappingConflicts = state.mappingConflicts ?? 0;
    return agg;
  }

  /** Serializable state (bigints remain bigint; the snapshot writer stringifies). */
  persist(): PersistedAggregator {
    return {
      seen: [...this.#seen],
      tokens: [...this.#tokens.entries()].map(([k, v]) => [k, { ...v }]),
      markets: [...this.#markets.entries()].map(([k, v]) => [k, { ...v }]),
      marketTokens: [...this.#marketTokens.entries()],
      counts: { ...this.#counts },
      lastBlock: this.#lastBlock,
      decodeErrors: this.#decodeErrors,
      mappingConflicts: this.#mappingConflicts,
      lastEventBlock: this.#lastEventBlock,
    };
  }

  recordDecodeError(n = 1): void { this.#decodeErrors += n; }
  observeHead(height: number): void { this.#headHeight = Math.max(this.#headHeight, height); }
  has(id: string): boolean { return this.#seen.has(id); }
  /** Kuru logs are only aggregated for markets mapped to a RetroPick token. */
  isTrackedMarket(address: string): boolean { return this.#marketTokens.has(lc(address)); }

  /** Idempotent ingest: each (block, logIndex, tx) is processed exactly once. */
  ingest(events: RadarEvent[]): { accepted: number; duplicates: number } {
    let accepted = 0, duplicates = 0;
    for (const e of events) {
      const key = eventId(e);
      if (this.#seen.has(key)) { duplicates++; continue; }
      this.#seen.add(key);
      this.#lastBlock = Math.max(this.#lastBlock, e.blockNumber);
      this.#lastEventBlock = Math.max(this.#lastEventBlock, e.blockNumber);
      this.#apply(e);
      accepted++;
    }
    return { accepted, duplicates };
  }

  #apply(e: RadarEvent): void {
    switch (e.name) {
      case 'TokenLaunched': {
        const t = this.#lifecycle(lc(e.args.token));
        if (t.launchedAt === null) this.#counts.launched++;
        t.launchedAt = e.blockTimestamp; t.launchTx = e.transactionHash;
        if (t.completedAt !== null) t.graduationLatencyS = t.completedAt - t.launchedAt;
        break;
      }
      case 'LaunchCommitted': {
        this.#lifecycle(lc(e.args.token)).committedAt = e.blockTimestamp;
        this.#counts.committed++;
        break;
      }
      case 'GraduationSecured': {
        this.#lifecycle(lc(e.args.token)).securedAt = e.blockTimestamp;
        this.#counts.secured++;
        break;
      }
      case 'GraduationCompleted': {
        const token = lc(e.args.token);
        const t = this.#lifecycle(token);
        t.completedAt = e.blockTimestamp; t.graduationTx = e.transactionHash; t.graduationBlock = e.blockNumber;
        this.#counts.completed++;
        if (t.launchedAt !== null) t.graduationLatencyS = e.blockTimestamp - t.launchedAt;
        const market = bytes32ToAddress(e.args.destination);
        if (market && market !== '0x' + '0'.repeat(40)) {
          t.market = market;
          const prior = this.#marketTokens.get(market);
          if (prior && prior !== token) this.#mappingConflicts++;
          this.#marketTokens.set(market, token);
          const m = this.#markets.get(market);
          if (m) m.token = token;
        }
        break;
      }
      case 'Trade': {
        const m = this.#market(e.address);
        m.trades++;
        if (m.firstTradeBlock === null) { m.firstTradeBlock = e.blockNumber; m.firstTradeAt = e.blockTimestamp; m.firstTradeTx = e.transactionHash; }
        m.lastTradeBlock = e.blockNumber; m.lastTradeAt = e.blockTimestamp; m.lastTradeTx = e.transactionHash;
        const filled = BigInt((e.args.filledSize as bigint | undefined) ?? 0n);
        const price = BigInt((e.args.price as bigint | undefined) ?? 0n);
        m.filledBaseUnits += filled;
        m.quoteVolume18 += (price * filled) / 10n ** 18n;
        break;
      }
      case 'OrderCreated': this.#market(e.address).ordersCreated++; break;
      case 'OrderCanceled': this.#market(e.address).ordersCanceled++; break;
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
    if (!t) { t = { token, launchedAt: null, committedAt: null, securedAt: null, completedAt: null, graduationLatencyS: null, market: null, launchTx: null, graduationTx: null, graduationBlock: null }; this.#tokens.set(token, t); }
    return t;
  }

  #market(address: string): MarketActivity {
    const key = lc(address);
    let m = this.#markets.get(key);
    if (!m) { m = { market: key, token: this.#marketTokens.get(key) ?? null, trades: 0, ordersCreated: 0, ordersCanceled: 0, filledBaseUnits: 0n, quoteVolume18: 0n, firstTradeBlock: null, firstTradeAt: null, firstTradeTx: null, lastTradeBlock: null, lastTradeAt: null, lastTradeTx: null }; this.#markets.set(key, m); }
    return m;
  }

  snapshot(cursorBlock = 0): RadarMetrics {
    const tokens = [...this.#tokens.values()].map((t) => {
      const m = t.market ? this.#markets.get(t.market) : undefined;
      const phase: Phase = t.completedAt !== null ? 'GRADUATED' : t.securedAt !== null ? 'GRADUATION_SECURED' : t.committedAt !== null ? 'COMMITTED' : t.launchedAt !== null ? 'LAUNCHED' : 'UNKNOWN';
      const timeToFirstKuruTradeS = t.completedAt !== null && m?.firstTradeAt != null ? Math.max(0, m.firstTradeAt - t.completedAt) : null;
      return { ...t, phase, timeToFirstKuruTradeS };
    });
    const activeOnCurve = tokens.filter((t) => t.launchedAt !== null && t.completedAt === null).length;
    return {
      lastBlock: this.#lastBlock,
      counts: { ...this.#counts },
      activeOnCurve,
      tokens: tokens.sort((a, b) => (b.launchedAt ?? 0) - (a.launchedAt ?? 0)),
      markets: [...this.#markets.values()].map((m) => ({ ...m })),
      computedAt: Math.floor(Date.now() / 1000),
      freshness: {
        headHeight: this.#headHeight,
        lastEventBlock: this.#lastEventBlock,
        cursorBlock,
        lagBlocks: Math.max(0, this.#headHeight - cursorBlock),
        headMinusEvent: this.#headHeight - this.#lastEventBlock,
      },
      decodeErrors: this.#decodeErrors,
      mappingConflicts: this.#mappingConflicts,
    };
  }
}

export const eventId = (e: Pick<RadarEvent, 'blockNumber' | 'logIndex' | 'transactionHash'>) => `${e.blockNumber}:${e.logIndex}:${e.transactionHash.toLowerCase()}`;

/** JSON-safe rendering (bigint → string), the only wire format the server emits. */
export function radarJson(metrics: RadarMetrics): string {
  return JSON.stringify(metrics, (_, v) => (typeof v === 'bigint' ? v.toString() : v));
}

/** Freshness helper: seconds since the market's last trade (null when never traded). */
export function marketStalenessS(m: MarketActivity, nowS: number): number | null {
  return m.lastTradeAt === null ? null : Math.max(0, nowS - m.lastTradeAt);
}
