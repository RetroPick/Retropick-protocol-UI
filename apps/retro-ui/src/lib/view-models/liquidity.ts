import type { KuruLiquidityState } from '@retropick/launchpad-sdk/liquidity';

export type LiquidityStatus = 'ready' | 'loading' | 'stale' | 'unavailable';
export interface LiquidityView {
  token: string; market: string | null; vault: string | null; lpLock: string | null;
  baseDecimals: number; quoteDecimals: number; shareDecimals: number | null;
  block: string | null; blockHash: string | null; observedAt: number | null; demo: boolean; status: LiquidityStatus; error: string | null;
  sources: { clob: string; vault: string; best: string; custody: string; position: string };
  clob: { status: LiquidityStatus; bids: number | null; asks: number | null };
  vaultState: { status: LiquidityStatus; baseRaw: string | null; quoteRaw: string | null; sharesRaw: string | null; bidX18: string | null; askX18: string | null };
  best: { status: LiquidityStatus; bidX18: string | null; askX18: string | null; paused: boolean | null };
  custody: { status: LiquidityStatus; sharesRaw: string | null; excessRaw: string | null };
  position: { status: LiquidityStatus; sharesRaw: string | null; baseRaw: string | null; quoteRaw: string | null; kind: string | null };
}

export function liquidityView(token: string, state: KuruLiquidityState | undefined, options: { error?: string | null; loading?: boolean; stale?: boolean } = {}): LiquidityView {
  const status: LiquidityStatus = options.loading && !state ? 'loading' : options.error && !state ? 'unavailable' : options.stale ? 'stale' : state ? 'ready' : 'unavailable';
  const section = (available: boolean): LiquidityStatus => available ? status : status === 'loading' ? 'loading' : 'unavailable';
  const clob = state?.clob.data, vault = state?.vault.data, best = state?.bestExecutable.data, custody = state?.custody.data, position = state?.position.data;
  return {
    token, market: state?.identity.market ?? null, vault: state?.identity.vault ?? null, lpLock: state?.identity.lpLock ?? null,
    baseDecimals: state?.identity.baseDecimals ?? 18, quoteDecimals: state?.identity.quoteDecimals ?? 18, shareDecimals: vault?.shareDecimals ?? null,
    block: state?.blockNumber.toString() ?? null, blockHash: state?.blockHash ?? null, observedAt: state?.observedAt ?? null, demo: false, status, error: options.error ?? null,
    sources: { clob: state?.clob.source ?? 'KURU_CLOB', vault: state?.vault.source ?? 'KURU_VAULT', best: state?.bestExecutable.source ?? 'KURU_BEST_BID_ASK', custody: state?.custody.source ?? 'PROTECTED_LP', position: state?.position.source ?? 'USER_LP' },
    clob: { status: section(!!clob), bids: clob?.bids.length ?? null, asks: clob?.asks.length ?? null },
    vaultState: { status: section(!!vault), baseRaw: vault?.baseAssetsRaw.toString() ?? null, quoteRaw: vault?.quoteAssetsRaw.toString() ?? null, sharesRaw: vault?.totalSharesRaw.toString() ?? null, bidX18: vault?.bidX18?.toString() ?? null, askX18: vault?.askX18?.toString() ?? null },
    best: { status: section(!!best), bidX18: best?.bidX18?.toString() ?? null, askX18: best?.askX18?.toString() ?? null, paused: best ? best.marketState !== 0 : null },
    custody: { status: section(!!custody), sharesRaw: custody?.lockedSharesRaw.toString() ?? null, excessRaw: custody?.excessBaseRaw.toString() ?? null },
    position: { status: section(!!position), sharesRaw: position?.sharesRaw.toString() ?? null, baseRaw: position?.previewBaseRaw.toString() ?? null, quoteRaw: position?.previewQuoteRaw.toString() ?? null, kind: position?.kind ?? null },
  };
}

/** Explicit synthetic presentation data; never passed to a chain reader or preparer. */
export function demoLiquidityView(token = 'demo-graduated', scenario = ''): LiquidityView {
  const unavailable = scenario === 'rpc-error', stale = scenario === 'stale', noVault = scenario === 'no-vault' || scenario === 'both-empty';
  const noBook = scenario === 'no-book' || scenario === 'both-empty';
  const status: LiquidityStatus = unavailable ? 'unavailable' : stale ? 'stale' : 'ready';
  return {
    token, market: `demo:${token}:market`, vault: `demo:${token}:vault`, lpLock: `demo:${token}:lock`, baseDecimals: 18, quoteDecimals: 18, shareDecimals: 18,
    block: '0', blockHash: 'demo:block', observedAt: 1_792_000_000_000, demo: true, status, error: unavailable ? 'Simulated RPC failure' : null,
    sources: { clob: 'DEMO_CLOB', vault: 'DEMO_VAULT', best: 'DEMO_BEST_QUOTE', custody: 'DEMO_LOCK', position: 'DEMO_POSITION' },
    clob: { status, bids: unavailable ? null : noBook ? 0 : 7, asks: unavailable ? null : noBook ? 0 : 7 },
    vaultState: { status: noVault ? 'unavailable' : status, baseRaw: unavailable || noVault ? null : '124560000000000000000', quoteRaw: unavailable || noVault ? null : '88210000000000000000', sharesRaw: unavailable || noVault ? null : '100000000000000000000', bidX18: unavailable || noVault ? null : '697000000000000000', askX18: unavailable || noVault ? null : '704000000000000000' },
    best: { status, bidX18: unavailable || scenario === 'both-empty' ? null : '697000000000000000', askX18: unavailable || scenario === 'both-empty' ? null : '704000000000000000', paused: unavailable ? null : scenario === 'paused' },
    custody: { status, sharesRaw: unavailable ? null : '99900000000000000000', excessRaw: unavailable ? null : '5000000000000000000' },
    position: { status, sharesRaw: unavailable ? null : '0', baseRaw: unavailable ? null : '0', quoteRaw: unavailable ? null : '0', kind: 'wallet' },
  };
}

/** Margin credit is shared across markets. Never count the same asset twice. */
export function uniqueCapitalAssets<T extends { token: string }>(rows: T[]): T[] {
  return [...new Map(rows.map(row => [row.token.toLowerCase(), row])).values()];
}
