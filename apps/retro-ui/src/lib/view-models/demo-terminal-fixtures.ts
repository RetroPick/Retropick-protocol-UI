// Deterministic, versioned DEMO fixtures for the shared token terminal.
// These are SIMULATED values for presentation and interaction testing only. They never resolve to an
// on-chain address (ids are slugs, never 0x…), never reach live adapters and are labelled DEMO everywhere.
import type { IndexedCandle, IndexedHolder, IndexedOrder, IndexedTrade } from '@retropick/launchpad-sdk/read-model';
import type { Lifecycle, Paged, TerminalData, TokenTerminalVM } from './token-terminal';

export const DEMO_FIXTURE_VERSION = 'demo-terminal-v1';
/** Fixed reference clock: 2026-09-17T12:00:00Z (the existing demo snapshot). */
export const DEMO_NOW_MS = Date.UTC(2026, 8, 17, 12, 0, 0);
const NOW_S = DEMO_NOW_MS / 1000;
const E18 = 10n ** 18n;

export const DEMO_SCENARIOS = ['default', 'slow-rpc', 'stale-indexer', 'no-holders', 'no-orders', 'margin-shortfall', 'no-book'] as const;
export type DemoScenario = (typeof DEMO_SCENARIOS)[number];
export function parseScenario(value: string | null | undefined): DemoScenario {
  return (DEMO_SCENARIOS as readonly string[]).includes(value ?? '') ? (value as DemoScenario) : 'default';
}

/** Simulated curve reserves used by the demo ticket preview (real SDK quote math over simulated state). */
export interface DemoCurveState { quoteReserve: bigint; tokenReserve: bigint; remaining: bigint; feeBps: bigint; taxBps: bigint }
export interface DemoWalletState { quoteWallet: bigint; tokenWallet: bigint; quoteMargin: bigint; tokenMargin: bigint }
export interface DemoKuruState { tickRaw: bigint; bestBidX18: bigint; bestAskX18: bigint }
/** Simulated L2 book (tick-aggregated levels) for the depth ladder; price x18 / base raw units. */
export interface DemoBookState { bids: Array<{ price: bigint; size: bigint }>; asks: Array<{ price: bigint; size: bigint }> }

export interface DemoFixture {
  vm: TokenTerminalVM;
  data: TerminalData;
  curve: DemoCurveState | null;
  kuru: DemoKuruState | null;
  book: DemoBookState | null;
  wallet: DemoWalletState;
  scenario: DemoScenario;
}

interface Seed {
  id: string; aliases: string[]; name: string; symbol: string; glyph: string; color: string; description: string;
  quote: { symbol: string; decimals: number; native: boolean }; lifecycle: Lifecycle;
  /** Price in quote units ×1e8 (integer, deterministic). */
  startPrice8: number; endPrice8: number; ageDays: number; volatility: number; tradesPerHour: number;
  supplyTokens: bigint; progressBps: number;
  socials?: TokenTerminalVM['socials'];
}

const SEEDS: Seed[] = [
  { id: 'monad-dog', aliases: ['demo-active'], name: 'Monad Dog', symbol: 'MDOG', glyph: '◉', color: '#7f91ff',
    description: 'A fixed-supply community token on the RetroPick bonding curve. DEMO fixture.',
    quote: { symbol: 'MON', decimals: 18, native: true }, lifecycle: 'ACTIVE', startPrice8: 180_000, endPrice8: 284_000, ageDays: 6, volatility: 0.018, tradesPerHour: 22, supplyTokens: 1_000_000_000n, progressBps: 7200,
    socials: { website: 'https://example.org/monad-dog', twitter: 'https://x.com/example' } },
  { id: 'orbit-cult', aliases: ['demo-graduation-ready'], name: 'Orbit Cult', symbol: 'ORBIT', glyph: '✦', color: '#5ec4d3',
    description: 'The curve reached its graduation threshold; the permissionless graduation transaction has not run yet. DEMO fixture.',
    quote: { symbol: 'MON', decimals: 18, native: true }, lifecycle: 'GRADUATION_READY', startPrice8: 410_000, endPrice8: 1_420_000, ageDays: 7, volatility: 0.022, tradesPerHour: 30, supplyTokens: 1_000_000_000n, progressBps: 10_000 },
  { id: 'comet-relay', aliases: ['demo-graduating'], name: 'Comet Relay', symbol: 'CMTR', glyph: '☄', color: '#e0a862',
    description: 'Graduation is in progress: liquidity is moving from the curve to a Kuru market. DEMO fixture.',
    quote: { symbol: 'MON', decimals: 18, native: true }, lifecycle: 'GRADUATING', startPrice8: 520_000, endPrice8: 1_610_000, ageDays: 5, volatility: 0.02, tradesPerHour: 26, supplyTokens: 1_000_000_000n, progressBps: 10_000 },
  { id: 'nvidia-cult', aliases: ['demo-graduated'], name: 'NVIDIA CULT', symbol: 'NVC', glyph: 'N', color: '#8bcf62',
    description: 'Graduated to a Kuru orderbook market. The pair asset is an illustrative stock-reference quote token; the launched token is not equity. DEMO fixture.',
    quote: { symbol: 'NVDAx', decimals: 18, native: false }, lifecycle: 'GRADUATED', startPrice8: 690_000, endPrice8: 1_120_000, ageDays: 7, volatility: 0.016, tradesPerHour: 34, supplyTokens: 1_000_000_000n, progressBps: 10_000 },
  { id: 'apple-signal', aliases: [], name: 'Apple Signal', symbol: 'ASIG', glyph: 'A', color: '#e0a862',
    description: 'A normal launch token paired against an illustrative tokenized-stock quote asset. DEMO fixture.',
    quote: { symbol: 'AAPLx', decimals: 18, native: false }, lifecycle: 'ACTIVE', startPrice8: 330_000, endPrice8: 490_000, ageDays: 4, volatility: 0.015, tradesPerHour: 14, supplyTokens: 1_000_000_000n, progressBps: 5500 },
];

// Deterministic PRNG (mulberry32) seeded from the fixture id.
function rng(seedText: string): () => number {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) { h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hex = (rand: () => number, bytes: number) => '0x' + Array.from({ length: bytes }, () => Math.floor(rand() * 256).toString(16).padStart(2, '0')).join('');
/** Demo "addresses" are deliberately not 0x-prefixed so they can never be confused with, or routed as, chain addresses. */
const demoAddr = (rand: () => number) => 'demo:' + hex(rand, 20).slice(2);
const p8ToX18 = (p8: number) => BigInt(Math.max(1, Math.round(p8))) * 10n ** 10n;

const cache = new Map<string, Omit<DemoFixture, 'scenario'>>();

function build(seed: Seed): Omit<DemoFixture, 'scenario'> {
  const rand = rng(`${DEMO_FIXTURE_VERSION}:${seed.id}`);
  const start = NOW_S - seed.ageDays * 86400;
  const firstMinute = start - (start % 60);
  const minutes = Math.floor((NOW_S - firstMinute) / 60);
  const qScale = 10n ** BigInt(seed.quote.decimals);
  const candles: IndexedCandle[] = [];
  const trades: IndexedTrade[] = [];
  const drift = Math.log(seed.endPrice8 / seed.startPrice8) / minutes;
  let logP = Math.log(seed.startPrice8);
  const tradeProb = Math.min(0.95, seed.tradesPerHour / 60);
  const traders = Array.from({ length: 40 }, () => demoAddr(rand));
  for (let m = 0; m < minutes; m++) {
    const t = firstMinute + m * 60;
    // Minutes without a trade produce no candle (real gaps, as the indexer does).
    if (rand() > tradeProb) { logP += drift; continue; }
    const open = Math.exp(logP);
    logP += drift + (rand() - 0.5) * seed.volatility;
    const close = Math.exp(logP);
    const high = Math.max(open, close) * (1 + rand() * seed.volatility * 0.4);
    const low = Math.min(open, close) * (1 - rand() * seed.volatility * 0.4);
    const count = 1 + Math.floor(rand() * 3);
    const volQuoteMilli = BigInt(Math.floor(200 + rand() * 9_000)); // 0.2 – 9.2 quote per candle
    candles.push({ timestamp: t, open: p8ToX18(open).toString(), high: p8ToX18(high).toString(), low: p8ToX18(low).toString(), close: p8ToX18(close).toString(), quoteVolumeRaw: (volQuoteMilli * qScale / 1000n).toString(), tradeCount: count });
    if (t > NOW_S - 86400 * 2) {
      const priceX18 = p8ToX18(close);
      const quoteRaw = volQuoteMilli * qScale / 1000n / BigInt(count);
      const tokensRaw = quoteRaw * E18 * (10n ** 18n) / (priceX18 * qScale);
      const graduated = seed.lifecycle === 'GRADUATED' && t > NOW_S - 86400;
      trades.push({ id: `${seed.id}:${t}`, token: seed.id, venue: graduated ? 'KURU' : 'CURVE', side: close >= open ? 'buy' : 'sell', actor: traders[Math.floor(rand() * traders.length)], quoteRaw: quoteRaw.toString(), tokensRaw: tokensRaw.toString(), priceRaw: priceX18.toString(), priceX18: priceX18.toString(), feeRaw: null, block: 1_000_000 + m, timestamp: t + Math.floor(rand() * 59), transactionHash: 'demo:' + hex(rand, 32).slice(2), logIndex: 0 });
    }
  }
  trades.reverse(); // newest first, like the indexer
  const last = candles.at(-1)!;
  const dayAgo = candles.find((c) => c.timestamp >= NOW_S - 86400) ?? candles[0];
  const priceX18 = BigInt(last.close);
  const changeBps = (priceX18 - BigInt(dayAgo.open)) * 10_000n / BigInt(dayAgo.open);
  const supplyRaw = seed.supplyTokens * E18;
  const sum = (rows: IndexedCandle[]) => rows.reduce((acc, c) => acc + BigInt(c.quoteVolumeRaw), 0n);
  const vol24 = sum(candles.filter((c) => c.timestamp >= NOW_S - 86400));
  const trades24 = candles.filter((c) => c.timestamp >= NOW_S - 86400).reduce((a, c) => a + c.tradeCount, 0);
  const curveState: DemoCurveState | null = seed.lifecycle === 'ACTIVE'
    ? { quoteReserve: 30_000n * qScale * BigInt(seed.progressBps) / 10_000n, tokenReserve: supplyRaw * 6n / 10n, remaining: supplyRaw / 3n, feeBps: 100n, taxBps: 50n }
    : null;
  const holders: IndexedHolder[] = [];
  const roles: Array<IndexedHolder['role']> = seed.lifecycle === 'GRADUATED' ? ['KURU_INFRASTRUCTURE', 'LP_EXCESS_LOCK', 'FEE_ESCROW'] : ['CURVE'];
  let left = supplyRaw;
  roles.forEach((role, i) => { const share = supplyRaw * BigInt([46, 18, 2][i] ?? 2) / 100n; left -= share; holders.push({ address: demoAddr(rand), balanceRaw: share.toString(), role }); });
  for (let i = 0; i < 24; i++) { const share = left * BigInt(8 + Math.floor(rand() * 6)) / 100n; left -= share; holders.push({ address: i === 0 ? 'demo:creator' : traders[i], balanceRaw: share.toString(), role: 'WALLET' }); }
  holders.sort((a, b) => (BigInt(b.balanceRaw) > BigInt(a.balanceRaw) ? 1 : -1));
  holders.forEach((h, i) => { h.rank = i + 1; h.supplyBps = (BigInt(h.balanceRaw) * 10_000n / supplyRaw).toString(); });
  const orders: IndexedOrder[] | null = seed.lifecycle === 'GRADUATED'
    ? (['OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'OPEN'] as const).map((status, i) => ({ market: 'demo:market', token: seed.id, orderId: String(9100 + i), owner: 'demo:you', side: i % 2 ? 'sell' as const : 'buy' as const, priceUnits: String(1000 + i * 15), priceX18: (priceX18 * BigInt(95 + i * 3) / 100n).toString(), originalSizeUnits: String(5000 + i * 1000), remainingSizeUnits: status === 'FILLED' || status === 'CANCELLED' ? '0' : status === 'PARTIALLY_FILLED' ? String(2500 + i * 500) : String(5000 + i * 1000), baseDecimals: 18, sizePrecision: '100', createdAt: NOW_S - (i + 1) * 5400, createdBlock: 1_009_000 + i, status, transactionHash: 'demo:' + hex(rand, 32).slice(2) }))
    : null;
  const graduationTs = seed.lifecycle === 'GRADUATED' ? NOW_S - 86400 : null;
  const graduationThreshold = 30_000n * qScale;
  const vm: TokenTerminalVM = {
    dataMode: 'demo', id: seed.id, fixtureVersion: DEMO_FIXTURE_VERSION, name: seed.name, symbol: seed.symbol, description: seed.description,
    logo: null, icon: { glyph: seed.glyph, color: seed.color }, socials: seed.socials ?? {}, createdAt: start, now: DEMO_NOW_MS,
    quote: seed.quote, baseDecimals: 18, lifecycle: seed.lifecycle, venue: seed.lifecycle === 'GRADUATED' ? 'KURU' : 'CURVE',
    price: { x18: priceX18.toString(), source: seed.lifecycle === 'GRADUATED' ? 'Last Kuru trade · SIMULATED' : 'Curve spot · SIMULATED' },
    change24hBps: changeBps.toString(),
    marketCapRaw: (priceX18 * supplyRaw * qScale / (E18 * E18)).toString(),
    liquidityRaw: seed.lifecycle === 'GRADUATED' ? null : (graduationThreshold * BigInt(seed.progressBps) / 10_000n).toString(),
    liquidityNote: seed.lifecycle === 'GRADUATED' ? 'AMM quote assets shown separately' : 'Curve quote reserve',
    volume24hRaw: vol24.toString(), lifetimeVolumeRaw: sum(candles).toString(), trades24h: trades24, holderCount: holders.length,
    supplyRaw: supplyRaw.toString(), creatorEarnedRaw: null, bondingProgressBps: seed.progressBps,
    addresses: { token: demoAddr(rand), curve: demoAddr(rand), factory: demoAddr(rand), coordinator: demoAddr(rand), quoteAsset: seed.quote.native ? 'native MON' : demoAddr(rand), creator: 'demo:creator', creatorFeeRecipient: 'demo:creator', market: seed.lifecycle === 'GRADUATED' ? 'demo:market' : null, vault: seed.lifecycle === 'GRADUATED' ? demoAddr(rand) : null, lpLock: seed.lifecycle === 'GRADUATED' ? demoAddr(rand) : null, excessLock: seed.lifecycle === 'GRADUATED' ? demoAddr(rand) : null },
    economics: { curveFeeBps: 100, creatorFeeBps: 50, policy: 'Version 1 · demo policy', buybackEnabled: false, graduationThresholdRaw: graduationThreshold.toString() },
    txs: { launch: 'demo:' + hex(rand, 32).slice(2), graduation: graduationTs ? 'demo:' + hex(rand, 32).slice(2) : null },
    graduationTimestamp: graduationTs,
    freshness: { indexedBlock: String(1_000_000 + minutes), lagBlocks: 1, stale: false },
    sync: { onchain: 'ready', indexer: 'ready', message: null },
  };
  const page = <T,>(rows: T[]): Paged<T> => ({ rows, nextCursor: null, status: 'ready' });
  return {
    vm,
    data: { candles: page(candles), trades: page(trades), holders: page(holders), orders: orders ? page(orders) : null },
    curve: curveState,
    kuru: seed.lifecycle === 'GRADUATED' ? { tickRaw: 10n ** 13n, bestBidX18: priceX18 * 99n / 100n, bestAskX18: priceX18 * 101n / 100n } : null,
    // Depth ladder fixture: 7 tick-spaced levels a side around the simulated best bid/ask,
    // deterministic sizes from the same seeded stream (thousands of tokens at 18 decimals).
    book: seed.lifecycle === 'GRADUATED' ? (() => {
      const kuruTick = 10n ** 13n, bestBid = priceX18 * 99n / 100n / kuruTick * kuruTick, bestAsk = (priceX18 * 101n / 100n + kuruTick - 1n) / kuruTick * kuruTick;
      const level = (i: number) => BigInt(3 + Math.floor(rand() * 17)) * 10n ** 21n;
      return {
        bids: Array.from({ length: 7 }, (_, i) => ({ price: bestBid - BigInt(i) * kuruTick, size: level(i) })),
        asks: Array.from({ length: 7 }, (_, i) => ({ price: bestAsk + BigInt(i) * kuruTick, size: level(i) })),
      };
    })() : null,
    wallet: { quoteWallet: 120n * qScale, tokenWallet: 50_000n * E18, quoteMargin: 25n * qScale, tokenMargin: 12_000n * E18 },
  };
}

export const demoFixtureIds = SEEDS.map((s) => s.id);

export function getDemoFixture(id: string, scenario: DemoScenario = 'default'): DemoFixture | null {
  const seed = SEEDS.find((s) => s.id === id || s.aliases.includes(id));
  if (!seed) return null;
  let base = cache.get(seed.id);
  if (!base) { base = build(seed); cache.set(seed.id, base); }
  const vm: TokenTerminalVM = { ...base.vm, sync: { ...base.vm.sync } };
  const data: TerminalData = { ...base.data };
  const wallet = { ...base.wallet };
  if (scenario === 'slow-rpc') vm.sync = { onchain: 'syncing', indexer: 'ready', message: 'Syncing on-chain state… (SIMULATED slow RPC)' };
  if (scenario === 'stale-indexer') { vm.freshness = { indexedBlock: base.vm.freshness!.indexedBlock, lagBlocks: 412, stale: true }; vm.sync = { onchain: 'ready', indexer: 'stale', message: 'Indexer is 412 blocks behind (SIMULATED)' }; }
  if (scenario === 'no-holders') { data.holders = { rows: [], nextCursor: null, status: 'ready' }; vm.holderCount = 0; }
  if (scenario === 'no-orders' && data.orders) data.orders = { rows: [], nextCursor: null, status: 'ready' };
  if (scenario === 'margin-shortfall') { wallet.quoteMargin = 5n * 10n ** BigInt(vm.quote.decimals) / 10n; wallet.tokenMargin = 0n; }
  // no-book keeps the panel mounted with an empty ladder (the real empty-book state), unlike
  // pre-graduation fixtures where the whole panel is absent.
  const book = scenario === 'no-book' && base.book ? { bids: [], asks: [] } : base.book;
  return { vm, data, curve: base.curve, kuru: base.kuru, book, wallet, scenario };
}
