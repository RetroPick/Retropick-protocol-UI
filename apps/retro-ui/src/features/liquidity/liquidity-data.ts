import type { IndexedLiquidityPool, IndexedLiquidityEvent, IndexedLPPosition } from '@retropick/launchpad-sdk/read-model';
import { queryPath, request } from '@/lib/live/indexer-client';

export const fetchPools = (base: string, cursor?: string, signal?: AbortSignal) => request<IndexedLiquidityPool[]>(base, queryPath('/v1/liquidity/pools', { limit: 25, cursor }), signal);
export const fetchPool = (base: string, token: string, signal?: AbortSignal) => request<IndexedLiquidityPool>(base, `/v1/liquidity/pools/${token}`, signal);
export const fetchPoolEvents = (base: string, token: string, cursor?: string, signal?: AbortSignal) => request<IndexedLiquidityEvent[]>(base, queryPath(`/v1/liquidity/pools/${token}/events`, { limit: 25, cursor }), signal);
export const fetchLPPositions = (base: string, wallet: string, cursor?: string, signal?: AbortSignal) => request<IndexedLPPosition[]>(base, queryPath(`/v1/wallets/${wallet}/lp-positions`, { limit: 25, cursor }), signal);

/** Synthetic identifiers deliberately cannot pass a live contract address validator. */
export const demoPool: IndexedLiquidityPool = {
  token: 'demo-graduated', market: 'demo:market', vault: 'demo:vault', lpLock: 'demo:lock', baseAsset: 'demo:token', quoteAsset: 'demo:MON', baseDecimals: 18, quoteDecimals: 18,
  baseSymbol: 'CIS', quoteSymbol: 'MON', baseAssetsRaw: '124560000000000000000', quoteAssetsRaw: '88210000000000000000', totalSharesRaw: '100000000000000000000',
  protectedSharesRaw: '99900000000000000000', infrastructureSharesRaw: '1000', historyComplete: true, historyIndexedBlock: 0, graduationBlock: 0, status: 'READY',
};
export const demoPoolEvents: IndexedLiquidityEvent[] = [{ id: 'demo:deposit', token: demoPool.token, vault: demoPool.vault, kind: 'DEPOSIT', actor: 'demo:graduation-executor', sharesRaw: demoPool.totalSharesRaw!, baseRaw: demoPool.baseAssetsRaw!, quoteRaw: demoPool.quoteAssetsRaw!, block: 0, transactionIndex: 0, logIndex: 0, timestamp: 1_792_000_000, transactionHash: 'demo:graduation-receipt' }];
