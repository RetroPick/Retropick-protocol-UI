import type { IndexedLaunch, IndexedTrade, IndexedCandle, IndexedOrder, IndexedWalletAsset, IndexedClaim, IndexedBuyback, IndexedAssetMetadata, IndexedQualifyingEvent, IndexedHolder, CandleResolution, IndexedLiquidityPool, IndexedLPPosition, IndexedLiquidityEvent } from '@retropick/launchpad-sdk/read-model';
import { release } from '@retropick/launchpad-sdk/chain';
import type { JournalEvent } from './store.ts';
export const PROJECTION_VERSION = 3;
export const ZERO = '0x0000000000000000000000000000000000000000';
export type LaunchSeed = { launch: Omit<IndexedLaunch, 'volume24hRaw' | 'lifetimeVolumeRaw' | 'trades24h' | 'holderCount' | 'change24hBps' | 'candles'> };
export type Projection = { launches: IndexedLaunch[]; trades: IndexedTrade[]; activity: JournalEvent[]; holders: Record<string, IndexedHolder[]>; orders: IndexedOrder[]; walletAssets: Record<string, IndexedWalletAsset[]>; claims: IndexedClaim[]; buybacks: IndexedBuyback[]; qualifyingEvents: IndexedQualifyingEvent[]; liquidityPools: IndexedLiquidityPool[]; lpPositions: IndexedLPPosition[]; liquidityEvents: IndexedLiquidityEvent[] };
export type Snapshot = Projection & { indexedBlock: number; indexedBlockHash: string; indexedTimestamp: number; indexedAt: string; projectionVersion: number; reorgRevision: number; beneficiaryIndexedBlock: number };
const amount = (v: unknown) => BigInt(String(v ?? 0));
const lower = (v: unknown) => String(v ?? ZERO).toLowerCase();
const scale = (decimals: number) => 10n ** BigInt(decimals);
export function executionPriceX18(quote: bigint, tokens: bigint, baseDecimals: number, quoteDecimals: number) {
  return tokens > 0n ? quote * scale(baseDecimals) * scale(18) / (tokens * scale(quoteDecimals)) : 0n;
}
export function marketCapQuoteRaw(price: bigint, supply: bigint, baseDecimals: number, quoteDecimals: number) {
  return price * supply * scale(quoteDecimals) / (scale(baseDecimals) * scale(18));
}
export function aggregateCandles(base: IndexedCandle[], resolution: CandleResolution): IndexedCandle[] {
  const width = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600 }[resolution];
  const result = new Map<number, IndexedCandle>();
  for (const row of [...base].sort((a, b) => a.timestamp - b.timestamp)) {
    const time = Math.floor(row.timestamp / width) * width;
    const current = result.get(time);
    if (!current) result.set(time, { ...row, timestamp: time });
    else {
      current.high = (amount(row.high) > amount(current.high) ? row.high : current.high);
      current.low = (amount(row.low) < amount(current.low) ? row.low : current.low);
      current.close = row.close;
      current.quoteVolumeRaw = (amount(current.quoteVolumeRaw) + amount(row.quoteVolumeRaw)).toString();
      current.tradeCount += row.tradeCount;
    }
  }
  return [...result.values()];
}

export function project(events: JournalEvent[], seeds: LaunchSeed[], now: number, context: { assets?: Record<string, IndexedAssetMetadata>; custody?: Record<string, IndexedHolder['role']>; liquidityPools?: IndexedLiquidityPool[] } = {}): Projection {
  const ordered = [...events].sort((a, b) => a.block - b.block || a.transactionIndex - b.transactionIndex || a.logIndex - b.logIndex);
  const unique = [...new Map(ordered.map(e => [e.id, e])).values()];
  const launches: IndexedLaunch[] = seeds.map(seed => ({ ...seed.launch, token: lower(seed.launch.token), curve: lower(seed.launch.curve), candles: [], volume24hRaw: '0', lifetimeVolumeRaw: '0', trades24h: 0, holderCount: 0, change24hBps: null }));
  const byToken = new Map(launches.map(l => [l.token, l]));
  const byAddress = new Map<string, IndexedLaunch>();
  for (const l of launches) for (const a of [l.token, l.curve, l.market]) if (a) byAddress.set(lower(a), l);
  const assets = new Map<string, IndexedAssetMetadata>(Object.entries(context.assets ?? {}));
  assets.set(ZERO, { token: ZERO, name: 'Monad', symbol: 'MON', decimals: 18 });
  for (const l of launches) {
    assets.set(l.token, { token: l.token, name: l.name, symbol: l.symbol, decimals: l.baseDecimals ?? 18 });
    if (!assets.has(l.quoteAsset)) assets.set(l.quoteAsset, { token: l.quoteAsset, name: l.quoteSymbol, symbol: l.quoteSymbol, decimals: l.quoteDecimals });
  }
  const candidates = new Map<string, Map<string, Set<IndexedWalletAsset['sources'][number]>>>();
  const candidate = (wallet: string, token: string, source: IndexedWalletAsset['sources'][number]) => {
    wallet = lower(wallet); token = lower(token); if (wallet === ZERO) return;
    let rows = candidates.get(wallet); if (!rows) candidates.set(wallet, rows = new Map());
    let sources = rows.get(token); if (!sources) rows.set(token, sources = new Set()); sources.add(source);
  };
  const trades: IndexedTrade[] = []; const balances = new Map<string, Map<string, bigint>>();
  const activity: JournalEvent[] = []; const orders = new Map<string, IndexedOrder>(); const claims: IndexedClaim[] = [];
  const buybacks = new Map<string, IndexedBuyback>(); const qualifyingEvents: IndexedQualifyingEvent[] = [];
  const qualifying = (e: JournalEvent, eventName: IndexedQualifyingEvent['eventName'], actor: string, token: string, quote: string, quoteAmountRaw: string) => qualifyingEvents.push({ id: e.id, chainId: 10143, blockNumber: e.block, blockHash: e.blockHash, txHash: e.transactionHash, logIndex: e.logIndex, transactionIndex: e.transactionIndex, timestamp: e.timestamp, eventName, actor: lower(actor), token: lower(token), quote: lower(quote), quoteAmountRaw });
  for (const e of unique) {
    const launch = byAddress.get(lower(e.address)); const a = e.args;
    if (e.name === 'TokenLaunched') {
      const l = byToken.get(lower(a.token)); if (l) qualifying(e, 'TokenLaunched', lower(a.deployer), l.token, l.quoteAsset, '0');
    }
    if ((e.name === 'Deposit' || e.name === 'Withdrawal') && a.owner && a.token) candidate(lower(a.owner), lower(a.token), 'margin');
    if (e.name === 'NativeCredited' || e.name === 'NativeClaimed') candidate(lower(a.recipient), ZERO, 'escrow');
    if (e.name === 'TokenCredited' || e.name === 'TokenClaimed') candidate(lower(a.recipient), lower(a.token), 'escrow');
    if (e.name === 'NativeClaimed' || e.name === 'TokenClaimed') claims.push({ id: e.id, wallet: lower(a.recipient), token: e.name === 'NativeClaimed' ? ZERO : lower(a.token), amountRaw: amount(a.amount).toString(), block: e.block, timestamp: e.timestamp, transactionHash: e.transactionHash, logIndex: e.logIndex });
    if (e.name === 'VestingTermsSnapshotted') {
      const token = lower(a.token); const l = byToken.get(token);
      if (l) buybacks.set(token, { token, symbol: l.symbol, decimals: l.baseDecimals ?? 18, creatorRecipient: lower(a.creatorRecipient), protocolRecipient: lower(a.protocolRecipient), protocolFeeShareBps: Number(a.protocolFeeShareBps) });
    }
    if (e.name === 'CreatorRecipientUpdated') {
      const row = buybacks.get(lower(a.token)); if (row) row.creatorRecipient = lower(a.newRecipient);
    }
    if (!launch) continue;
    if (e.name === 'Transfer' && lower(e.address) === launch.token) {
      let holders = balances.get(launch.token); if (!holders) balances.set(launch.token, holders = new Map());
      for (const [key, sign] of [['from', -1n], ['to', 1n]] as const) {
        const wallet = lower(a[key]); if (wallet === ZERO) continue;
        holders.set(wallet, (holders.get(wallet) ?? 0n) + sign * amount(a.value ?? a.amount)); candidate(wallet, launch.token, 'wallet');
      }
      continue;
    }
    activity.push(e);
    const marketEvent = launch.market && lower(e.address) === lower(launch.market);
    if (marketEvent && e.name === 'OrderCreated') {
      if (!launch.marketParams) throw Error('Kuru order missing verified market parameters');
      const id = amount(a.orderId).toString();
      if (id !== '0') orders.set(`${lower(e.address)}:${id}`, { market: lower(e.address), token: launch.token, orderId: id, owner: lower(a.owner), side: a.isBuy ? 'buy' : 'sell', priceUnits: amount(a.price).toString(), priceX18: (amount(a.price) * scale(18) / amount(launch.marketParams.pricePrecision)).toString(), originalSizeUnits: amount(a.size).toString(), remainingSizeUnits: amount(a.size).toString(), baseDecimals: launch.marketParams.baseDecimals, sizePrecision: launch.marketParams.sizePrecision, createdAt: e.timestamp, createdBlock: e.block, status: 'OPEN', transactionHash: e.transactionHash });
      candidate(lower(a.owner), launch.token, 'margin'); candidate(lower(a.owner), launch.quoteAsset, 'margin');
    }
    if (marketEvent && (e.name === 'OrderCanceled' || e.name === 'OrdersCanceled')) {
      const ids = e.name === 'OrderCanceled' ? [a.orderId] : Array.isArray(a.orderId) ? a.orderId : [];
      for (const id of ids) { if (amount(id) === 0n) continue; const row = orders.get(`${lower(e.address)}:${amount(id)}`); if (row && row.owner === lower(a.owner)) { row.remainingSizeUnits = '0'; row.status = 'CANCELLED'; } }
    }
    if (e.name !== 'CurveBuy' && e.name !== 'CurveSell' && !(marketEvent && e.name === 'Trade')) continue;
    const kuru = e.name === 'Trade'; const buy = kuru ? Boolean(a.isBuy) : e.name === 'CurveBuy';
    const baseDecimals = launch.baseDecimals ?? 18;
    if (kuru && !launch.marketParams) throw Error('Kuru trade missing verified market parameters');
    const tokens = kuru ? amount(a.filledSize) * scale(baseDecimals) / amount(launch.marketParams!.sizePrecision) : amount(buy ? a.tokensOut : a.tokensIn);
    if (tokens <= 0n) continue;
    const fee = amount(a.fee) + amount(a.tax);
    const settlement = kuru ? amount(a.filledSize) * amount(a.price) * scale(launch.quoteDecimals) / (amount(launch.marketParams!.sizePrecision) * scale(18)) : amount(buy ? a.quoteIn : a.quoteOut);
    const executedQuote = kuru ? settlement : buy ? settlement - fee : settlement + fee;
    if (executedQuote < 0n) throw Error('Curve fee exceeds settlement');
    const price = kuru ? amount(a.price) : executionPriceX18(executedQuote, tokens, baseDecimals, launch.quoteDecimals);
    const actor = lower(kuru ? a.takerAddress : buy ? a.buyer : a.seller);
    const trade: IndexedTrade = { id: e.id, token: launch.token, venue: kuru ? 'KURU' : 'CURVE', side: buy ? 'buy' : 'sell', actor, ...(kuru ? { maker: lower(a.makerAddress), orderId: amount(a.orderId).toString() } : {}), quoteRaw: settlement.toString(), executionQuoteRaw: executedQuote.toString(), tokensRaw: tokens.toString(), priceRaw: price.toString(), priceX18: price.toString(), feeRaw: kuru ? null : fee.toString(), block: e.block, blockHash: e.blockHash, timestamp: e.timestamp, transactionHash: e.transactionHash, transactionIndex: e.transactionIndex, logIndex: e.logIndex };
    trades.push(trade); qualifying(e, kuru ? 'KuruTrade' : e.name as 'CurveBuy' | 'CurveSell', actor, launch.token, launch.quoteAsset, executedQuote.toString());
    if (kuru) {
      candidate(actor, launch.token, 'margin'); candidate(actor, launch.quoteAsset, 'margin'); candidate(lower(a.makerAddress), launch.token, 'margin'); candidate(lower(a.makerAddress), launch.quoteAsset, 'margin');
      const row = orders.get(`${lower(e.address)}:${amount(a.orderId)}`);
      if (row && row.owner === lower(a.makerAddress)) { row.remainingSizeUnits = amount(a.updatedSize).toString(); row.status = amount(a.updatedSize) === 0n ? 'FILLED' : 'PARTIALLY_FILLED'; }
    }
  }
  for (const launch of launches) {
    const history = trades.filter(t => t.token === launch.token); const recent = history.filter(t => t.timestamp >= now - 86400);
    launch.lifetimeVolumeRaw = history.reduce((s, t) => s + amount(t.executionQuoteRaw), 0n).toString();
    launch.volume24hRaw = recent.reduce((s, t) => s + amount(t.executionQuoteRaw), 0n).toString(); launch.trades24h = recent.length;
    launch.holderCount = [...(balances.get(launch.token)?.values() ?? [])].filter(v => v > 0n).length;
    const candles = new Map<number, IndexedCandle>();
    for (const trade of history) {
      const timestamp = Math.floor(trade.timestamp / 60) * 60; const p = amount(trade.priceX18);
      let candle = candles.get(timestamp);
      if (!candle) candles.set(timestamp, candle = { timestamp, open: p.toString(), high: p.toString(), low: p.toString(), close: p.toString(), quoteVolumeRaw: '0', tradeCount: 0 });
      candle.high = (p > amount(candle.high) ? p : amount(candle.high)).toString(); candle.low = (p < amount(candle.low) ? p : amount(candle.low)).toString(); candle.close = p.toString(); candle.quoteVolumeRaw = (amount(candle.quoteVolumeRaw) + amount(trade.executionQuoteRaw)).toString(); candle.tradeCount++;
    }
    launch.candles = [...candles.values()];
    if (launch.phase === 'GRADUATED') {
      const last = history.findLast(t => t.venue === 'KURU'); launch.priceRaw = launch.priceX18 = last?.priceX18 ?? null; launch.priceSource = last ? 'KURU_LAST_TRADE' : 'UNAVAILABLE';
      launch.marketCapRaw = last ? marketCapQuoteRaw(amount(last.priceX18), amount(launch.supplyRaw), launch.baseDecimals ?? 18, launch.quoteDecimals).toString() : null;
    }
    const baseline = history.findLast(t => t.timestamp <= now - 86400) ?? history[0]; const last = history.at(-1);
    if (baseline && last && amount(baseline.priceX18) > 0n) launch.change24hBps = ((amount(last.priceX18) - amount(baseline.priceX18)) * 10000n / amount(baseline.priceX18)).toString();
  }
  const roles = new Map<string, IndexedHolder['role']>(Object.entries(context.custody ?? {}));
  for (const l of launches) { roles.set(l.curve, 'CURVE'); if (l.lpLock) roles.set(lower(l.lpLock), 'LP_EXCESS_LOCK'); for (const address of [l.market, l.vault]) if (address) roles.set(lower(address), 'KURU_INFRASTRUCTURE'); }
  const holders = Object.fromEntries([...balances].map(([token, map]) => [token, [...map].filter(([, v]) => v > 0n).map(([address, balance]) => ({ address, balanceRaw: balance.toString() })).sort((a, b) => amount(a.balanceRaw) === amount(b.balanceRaw) ? a.address.localeCompare(b.address) : amount(a.balanceRaw) > amount(b.balanceRaw) ? -1 : 1).map((row, index) => ({ ...row, rank: index + 1, supplyBps: amount(byToken.get(token)?.supplyRaw) > 0n ? (amount(row.balanceRaw) * 10000n / amount(byToken.get(token)?.supplyRaw)).toString() : '0', role: roles.get(row.address) ?? 'WALLET' }))]));
  const walletAssets = Object.fromEntries([...candidates].map(([wallet, rows]) => [wallet, [...rows].map(([token, sources]) => {
    const metadata = assets.get(token) ?? { token, name: token, symbol: token, decimals: null }; const l = byToken.get(token);
    return { ...metadata, sources: [...sources].sort(), quoteAsset: l?.quoteAsset ?? null, quoteSymbol: l?.quoteSymbol ?? null, quoteDecimals: l?.quoteDecimals ?? null };
  }).sort((a, b) => a.token.localeCompare(b.token))]));
  const liquidityPools = context.liquidityPools ?? [];
  const liquidityEvents: IndexedLiquidityEvent[] = []; const lpPositions: IndexedLPPosition[] = [];
  for (const pool of liquidityPools) {
    const balances = new Map<string, bigint>();
    for (const e of unique.filter(e => lower(e.address) === pool.vault && e.block >= pool.graduationBlock)) {
      const a = e.args;
      if (!['Transfer', 'KuruVaultDeposit', 'KuruVaultWithdraw'].includes(e.name)) continue;
      const transfer = e.name === 'Transfer';
      liquidityEvents.push({ id: e.id, token: pool.token, vault: pool.vault, kind: transfer ? 'TRANSFER' : e.name === 'KuruVaultDeposit' ? 'DEPOSIT' : 'WITHDRAW', actor: lower(transfer ? a.to : a.userAddress), ...(transfer ? { from: lower(a.from), to: lower(a.to) } : { baseRaw: amount(a.amount1).toString(), quoteRaw: amount(a.amount2).toString() }), sharesRaw: amount(transfer ? a.value ?? a.amount : a.shares).toString(), block: e.block, logIndex: e.logIndex, transactionIndex: e.transactionIndex, timestamp: e.timestamp, transactionHash: e.transactionHash });
      // Deposit/withdraw describe assets; only ERC20 transfers change share ownership.
      if (transfer) for (const [wallet, sign] of [[lower(a.from), -1n], [lower(a.to), 1n]] as const) if (wallet !== ZERO) balances.set(wallet, (balances.get(wallet) ?? 0n) + sign * amount(a.value ?? a.amount));
    }
    if (pool.historyComplete) {
      if ([...balances.values()].some(v => v < 0n)) throw Error('Incomplete vault share history');
      if (pool.totalSharesRaw !== null && [...balances.values()].reduce((a, b) => a + b, 0n) !== amount(pool.totalSharesRaw)) throw Error('Vault share supply mismatch');
      for (const [wallet, shares] of balances) if (shares > 0n) lpPositions.push({ token: pool.token, market: pool.market, vault: pool.vault, wallet, sharesRaw: shares.toString(), role: wallet === pool.lpLock ? 'PROTECTED' : wallet === release.kuruEnvironment.marginAccount.toLowerCase() ? 'INFRASTRUCTURE' : 'WALLET' });
      pool.protectedSharesRaw = (balances.get(pool.lpLock ?? ZERO) ?? 0n).toString();
      pool.infrastructureSharesRaw = (balances.get(release.kuruEnvironment.marginAccount.toLowerCase()) ?? 0n).toString();
    }
    const launch = byToken.get(pool.token);
    if (launch && pool.status === 'READY') {
      launch.liquiditySource = 'KURU_VAULT'; launch.liquidityRaw = null;
      launch.liquidity = { source: 'KURU_VAULT', baseAssetsRaw: pool.baseAssetsRaw, quoteAssetsRaw: pool.quoteAssetsRaw, baseDecimals: pool.baseDecimals, quoteDecimals: pool.quoteDecimals };
    }
  }
  return { liquidityPools, lpPositions, liquidityEvents, launches, trades, activity, holders, orders: [...orders.values()], walletAssets, claims, buybacks: [...buybacks.values()], qualifyingEvents };
}
