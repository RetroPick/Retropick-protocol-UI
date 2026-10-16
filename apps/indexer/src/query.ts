import { createHash } from 'node:crypto';
import type { IndexEnvelope, IndexFreshness, CandleResolution, CandleRange, IndexedLaunch, IndexedActivityPage } from '@retropick/launchpad-sdk/read-model';
import { aggregateCandles, ZERO, type Snapshot } from './project.ts';
export const NEAR_GRADUATION_BPS = 8000;
export class QueryError extends Error { readonly status: number; readonly code: string; constructor(status: number, code: string) { super(code); this.status = status; this.code = code; } }
const fail = (code = 'INVALID_QUERY'): never => { throw new QueryError(400, code); };
const address = (value: string) => /^0x[\da-fA-F]{40}$/.test(value);
const big = (value: string | null | undefined) => value === null || value === undefined ? null : BigInt(value);
const compareRaw = (a: string | null | undefined, b: string | null | undefined) => {
  const x = big(a), y = big(b); if (x === y) return 0; if (x === null) return 1; if (y === null) return -1; return x > y ? -1 : 1;
};
const descendingEvent = (a: { block: number; logIndex: number; transactionIndex?: number }, b: { block: number; logIndex: number; transactionIndex?: number }) => b.block - a.block || (b.transactionIndex ?? 0) - (a.transactionIndex ?? 0) || b.logIndex - a.logIndex;
export const snapshotVersion = (s: Snapshot) => `${s.projectionVersion}:${s.reorgRevision}:${s.indexedBlock}:${s.indexedBlockHash}`;
export function query(snapshot: Snapshot, url: URL, freshness: IndexFreshness): IndexEnvelope<unknown> {
  const params = url.searchParams; const path = url.pathname;
  const limitText = params.get('limit') ?? (path.endsWith('/candles') ? '1500' : '50');
  if (!/^\d+$/.test(limitText)) fail('INVALID_LIMIT');
  const limit = Number(limitText); if (limit < 1 || limit > (path.endsWith('/candles') ? 2000 : 100)) fail('INVALID_LIMIT');
  const queryParams = [...params.entries()].filter(([key]) => key !== 'cursor').sort((a, b) => a[0].localeCompare(b[0]));
  const key = createHash('sha256').update(JSON.stringify([path, queryParams])).digest('hex');
  type Cursor = { v: string; q: string; after: string };
  let cursor: Cursor | null = null;
  if (params.has('cursor')) {
    try { const raw = params.get('cursor')!; if (raw.length > 1024) fail('INVALID_CURSOR'); cursor = JSON.parse(Buffer.from(raw, 'base64url').toString()) as Cursor; if (!cursor || typeof cursor.after !== 'string' || typeof cursor.v !== 'string' || typeof cursor.q !== 'string') fail('INVALID_CURSOR'); }
    catch (error) { if (error instanceof QueryError) throw error; fail('INVALID_CURSOR'); }
    if (!cursor) throw new QueryError(400, 'INVALID_CURSOR');
    if (cursor.q !== key) fail('CURSOR_QUERY_MISMATCH');
    if (cursor.v !== snapshotVersion(snapshot)) throw new QueryError(409, 'CURSOR_EXPIRED');
  }
  const page = <T>(rows: T[], rowKey: (row: T) => string) => {
    const start = cursor ? rows.findIndex(row => rowKey(row) === cursor!.after) + 1 : 0;
    if (cursor && start === 0) throw new QueryError(409, 'CURSOR_EXPIRED');
    const data = rows.slice(start, start + limit);
    const nextCursor = start + data.length < rows.length && data.length ? Buffer.from(JSON.stringify({ v: snapshotVersion(snapshot), q: key, after: rowKey(data.at(-1)!) })).toString('base64url') : null;
    return { data, freshness, nextCursor };
  };
  const transactionHash = params.get('transactionHash')?.toLowerCase();
  if (transactionHash && !/^0x[0-9a-f]{64}$/.test(transactionHash)) fail('INVALID_TRANSACTION_HASH');
  const term = (params.get('q') ?? '').trim().toLowerCase(); if (term.length > 180) fail('INVALID_SEARCH');
  const matches = (l: IndexedLaunch) => !term || [l.name, l.symbol, l.token, l.creator].some(v => v.toLowerCase().includes(term));
  if (path === '/v1/pairs') {
    const pairs = new Map<string, { quoteAsset: string; symbol: string; decimals: number; launchCount: number }>();
    for (const l of snapshot.launches) { const p = pairs.get(l.quoteAsset); if (p) p.launchCount++; else pairs.set(l.quoteAsset, { quoteAsset: l.quoteAsset, symbol: l.quoteSymbol, decimals: l.quoteDecimals, launchCount: 1 }); }
    return page([...pairs.values()].sort((a, b) => a.quoteAsset === ZERO ? -1 : b.quoteAsset === ZERO ? 1 : a.quoteAsset.localeCompare(b.quoteAsset)), p => p.quoteAsset);
  }
  if (path === '/v1/launches' || path === '/v1/search') {
    const sort = params.get('sort') ?? (path === '/v1/search' ? 'new' : 'marketCap'); if (!['marketCap', 'new', 'volume', 'liquidity', 'price'].includes(sort)) fail('INVALID_SORT');
    const phase = params.get('phase'); if (phase && !['active', 'near-graduation', 'graduated'].includes(phase)) fail('INVALID_PHASE');
    const quote = params.get('quote')?.toLowerCase();
    const creator = params.get('creator');
    if (creator !== null && !address(creator)) fail('INVALID_CREATOR');
    let rows = snapshot.launches.filter(matches).filter(l => !creator || l.creator.toLowerCase() === creator.toLowerCase()).filter(l => !quote || l.quoteAsset === quote || l.quoteSymbol.toLowerCase() === quote).filter(l => !phase || (phase === 'active' ? l.phase === 'ACTIVE' : phase === 'graduated' ? l.phase === 'GRADUATED' : ['ACTIVE', 'GRADUATION_READY'].includes(l.phase) && l.bondingProgressBps >= NEAR_GRADUATION_BPS));
    if (path === '/v1/search' && !term) rows = [];
    rows = [...rows].sort((a, b) => {
      const tie = b.createdBlock - a.createdBlock || a.token.localeCompare(b.token);
      if (sort === 'new') return tie;
      const group = a.quoteAsset === b.quoteAsset ? 0 : a.quoteAsset === ZERO ? -1 : b.quoteAsset === ZERO ? 1 : a.quoteAsset.localeCompare(b.quoteAsset);
      if (group) return group;
      const field = { marketCap: 'marketCapRaw', volume: 'volume24hRaw', liquidity: 'liquidityRaw', price: 'priceX18' }[sort] as 'marketCapRaw' | 'volume24hRaw' | 'liquidityRaw' | 'priceX18';
      return compareRaw(a[field], b[field]) || tie;
    });
    return { ...page(rows.map(l => ({ ...l, candles: l.candles.slice(-32) })), l => l.token), ...(sort !== 'new' ? { sortGrouping: 'QUOTE_ASSET' as const } : {}) };
  }
  if (path === '/v1/activity') {
    const number = (name: string, fallback: number) => { const v = params.get(name); if (v === null) return fallback; if (!/^\d+$/.test(v) || !Number.isSafeInteger(Number(v))) fail('INVALID_BLOCK'); return Number(v); };
    const from = number('fromBlock', 0), to = Math.min(number('toBlock', snapshot.indexedBlock), snapshot.indexedBlock);
    const rows = snapshot.qualifyingEvents.filter(e => e.blockNumber >= from && e.blockNumber <= to).sort((a, b) => a.blockNumber - b.blockNumber || a.transactionIndex - b.transactionIndex || a.logIndex - b.logIndex || a.id.localeCompare(b.id));
    const result = page(rows, e => e.id);
    return { ...result, data: { events: result.data, nextCursor: result.nextCursor, canonicalFromBlock: from, canonicalToBlock: to } satisfies IndexedActivityPage };
  }
  if (path === '/v1/liquidity/pools') {
    const rows = (snapshot.liquidityPools ?? []).filter(p => !term || [p.token, p.baseSymbol, p.quoteSymbol].some(v => v.toLowerCase().includes(term))).sort((a, b) => a.token.localeCompare(b.token));
    return page(rows, p => p.token);
  }
  const poolMatch = /^\/v1\/liquidity\/pools\/(0x[\da-fA-F]{40})(?:\/(events))?$/.exec(path);
  if (poolMatch) {
    const token = poolMatch[1].toLowerCase(); const pool = snapshot.liquidityPools?.find(p => p.token === token);
    if (!pool) throw new QueryError(404, 'POOL_NOT_FOUND');
    if (!poolMatch[2]) return { data: pool, freshness };
    if (!pool.historyComplete) throw new QueryError(503, 'LIQUIDITY_HISTORY_SYNCING');
    return page(snapshot.liquidityEvents.filter(e => e.token === token && (!transactionHash || e.transactionHash.toLowerCase() === transactionHash)).sort(descendingEvent), e => e.id);
  }
  const lpWallet = /^\/v1\/wallets\/(0x[\da-fA-F]{40})\/lp-positions$/.exec(path);
  if (lpWallet) {
    if (!snapshot.liquidityPools || snapshot.liquidityPools.some(p => !p.historyComplete)) throw new QueryError(503, 'LIQUIDITY_HISTORY_SYNCING');
    return page(snapshot.lpPositions.filter(p => p.wallet === lpWallet[1].toLowerCase()).sort((a, b) => a.token.localeCompare(b.token)), p => p.vault);
  }
  const walletMatch = /^\/v1\/wallets\/(0x[\da-fA-F]{40})\/(assets|orders|claims|buybacks)$/.exec(path);
  if (walletMatch) {
    const wallet = walletMatch[1].toLowerCase();
    if (walletMatch[2] === 'assets') return page(snapshot.walletAssets[wallet] ?? [], r => r.token);
    if (walletMatch[2] === 'claims') return page(snapshot.claims.filter(c => c.wallet === wallet).sort(descendingEvent), c => c.id);
    if (walletMatch[2] === 'buybacks') return page(snapshot.buybacks.filter(b => b.creatorRecipient === wallet || b.protocolRecipient === wallet).sort((a, b) => a.token.localeCompare(b.token)), b => b.token);
    const status = params.get('status') ?? 'open'; if (!['open', 'all'].includes(status)) fail('INVALID_ORDER_STATUS');
    return page(snapshot.orders.filter(o => o.owner === wallet && (status === 'all' || ['OPEN', 'PARTIALLY_FILLED'].includes(o.status))).sort((a, b) => b.createdBlock - a.createdBlock || a.market.localeCompare(b.market) || compareRaw(a.orderId, b.orderId)), o => `${o.market}:${o.orderId}`);
  }
  const match = /^\/v1\/launches\/(0x[\da-fA-F]{40})(?:\/(trades|holders|candles|orders))?$/.exec(path);
  if (!match) throw new QueryError(404, 'NOT_FOUND');
  const token = match[1].toLowerCase(); const launch = snapshot.launches.find(l => l.token === token); if (!launch) throw new QueryError(404, 'LAUNCH_NOT_FOUND');
  if (!match[2]) return { data: { ...launch, candles: launch.candles.slice(-120) }, freshness };
  if (match[2] === 'holders') return page(snapshot.holders[token] ?? [], h => h.address);
  if (match[2] === 'trades') return page(snapshot.trades.filter(t => t.token === token && (!transactionHash || t.transactionHash.toLowerCase() === transactionHash)).sort(descendingEvent), t => t.id);
  if (match[2] === 'orders') {
    const owner = params.get('owner'); if (owner && !address(owner)) fail('INVALID_OWNER');
    const status = params.get('status') ?? 'open'; if (!['open', 'all'].includes(status)) fail('INVALID_ORDER_STATUS');
    return page(snapshot.orders.filter(o => o.token === token && (!transactionHash || o.transactionHash?.toLowerCase() === transactionHash) && (!owner || o.owner === owner.toLowerCase()) && (status === 'all' || ['OPEN', 'PARTIALLY_FILLED'].includes(o.status))).sort((a, b) => b.createdBlock - a.createdBlock || compareRaw(a.orderId, b.orderId)), o => `${o.market}:${o.orderId}`);
  }
  const resolution = params.get('resolution') ?? '1m'; if (!['1m', '5m', '15m', '1h'].includes(resolution)) fail('INVALID_RESOLUTION');
  const range = params.get('range') ?? 'all'; if (!['1h', '6h', '24h', '7d', '30d', 'all'].includes(range)) fail('INVALID_RANGE');
  const seconds = { '1h': 3600, '6h': 21600, '24h': 86400, '7d': 604800, '30d': 2592000, all: Infinity }[range as CandleRange];
  const rows = aggregateCandles(launch.candles, resolution as CandleResolution).filter(c => c.timestamp + { '1m': 60, '5m': 300, '15m': 900, '1h': 3600 }[resolution as CandleResolution] > snapshot.indexedTimestamp - seconds).reverse();
  const result = page(rows, c => String(c.timestamp));
  return { ...result, data: result.data.reverse(), resolution: resolution as CandleResolution, range: range as CandleRange };
}
