import { isAddress, zeroAddress, type Address, type Hex } from 'viem';
import { addresses, monad, release, type ChainClient } from './chain.ts';
import { coordinatorAbi } from './abis/coordinatorAbi.ts';
import { kuruAbi } from './abis/kuruAbi.ts';
import { kuruVaultAbi } from './abis/kuruVaultAbi.ts';
import { kuruEnvironmentAbi } from './abis/kuruEnvironmentAbi.ts';
import { lockAbi } from './abis/lockAbi.ts';
import { routerAbi } from './abis/routerAbi.ts';
import { readKuruBook } from './kuru.ts';

export type LiquiditySection<T> =
  | { status: 'available'; source: string; data: T }
  | { status: 'unavailable' | 'not-requested'; source: string; data: null; error: string | null };

export type KuruLiquidityIdentity = {
  token: Address; quoteAsset: Address; market: Address; vault: Address; lpLock: Address; marginAccount: Address;
  baseDecimals: number; quoteDecimals: number; pricePrecision: bigint; sizePrecision: bigint;
};
export type KuruVaultLiquidity = {
  baseAssetsRaw: bigint; quoteAssetsRaw: bigint; totalSharesRaw: bigint; shareDecimals: number;
  bidX18: bigint | null; askX18: bigint | null; bidOrderSizeUnits: bigint; askOrderSizeUnits: bigint;
  bidPartiallyFilledUnits: bigint; askPartiallyFilledUnits: bigint;
  bidAvailableBaseRaw: bigint; askAvailableBaseRaw: bigint; spreadBps: bigint;
};
export type KuruBestExecutable = { bidX18: bigint | null; askX18: bigint | null; marketState: number };
export type KuruLiquidityCustody = { lockedSharesRaw: bigint; excessBaseRaw: bigint; infrastructureSharesRaw: bigint };
export type KuruLiquidityPosition = {
  account: Address; sharesRaw: bigint; previewBaseRaw: bigint; previewQuoteRaw: bigint;
  kind: 'wallet' | 'protocol-lock' | 'infrastructure';
};
export type KuruLiquidityState = {
  chainId: 10143; blockNumber: bigint; blockHash: Hex; observedAt: number; identity: KuruLiquidityIdentity;
  clob: LiquiditySection<Awaited<ReturnType<typeof readKuruBook>>>;
  vault: LiquiditySection<KuruVaultLiquidity>;
  bestExecutable: LiquiditySection<KuruBestExecutable>;
  custody: LiquiditySection<KuruLiquidityCustody>;
  position: LiquiditySection<KuruLiquidityPosition>;
};

const UINT256_MAX = 2n ** 256n - 1n;
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const validNonzero = (a: string) => isAddress(a) && !same(a, zeroAddress);
const bidPrice = (value: bigint) => value === 0n || value === UINT256_MAX ? null : value;
const askPrice = (value: bigint) => value === 0n || value === UINT256_MAX ? null : value;
const skipped = <T>(source: string): LiquiditySection<T> => ({ status: 'not-requested', source, data: null, error: null });
async function section<T>(source: string, read: () => Promise<T>): Promise<LiquiditySection<T>> {
  try { return { status: 'available', source, data: await read() }; }
  // RPC errors can contain URLs, headers and provider bodies. Expose a fixed code only.
  catch { return { status: 'unavailable', source, data: null, error: 'LIQUIDITY_READ_UNAVAILABLE' }; }
}

/**
 * Qualified display reads only. Identity failures throw; optional section failures never become zero.
 * CLOB levels remain ordinary resting orders. Best prices and current AMM step sizes are not a
 * size-dependent execution guarantee; order preparation must still simulate the connected account.
 */
export async function readKuruLiquidity(
  chain: ChainClient,
  token: Address,
  options: { blockNumber?: bigint; account?: Address; includeBook?: boolean } = {},
): Promise<KuruLiquidityState> {
  if (!validNonzero(token)) throw Error('Invalid launch token address.');
  if (options.account && !validNonzero(options.account)) throw Error('Invalid liquidity account address.');
  if (await chain.getChainId() !== monad.id) throw Error('Liquidity reads require Monad Testnet (10143).');
  const blockNumber = options.blockNumber ?? await chain.getBlockNumber({ cacheTime: 0 });
  const header = await chain.getBlock({ blockNumber });
  if (!header.hash || header.number !== blockNumber) throw Error('Liquidity block is unavailable.');
  const [packet, ledger, receipt] = await Promise.all([
    chain.readContract({ address: addresses.coordinator, abi: coordinatorAbi, functionName: 'packet', args: [token], blockNumber }),
    chain.readContract({ address: addresses.coordinator, abi: coordinatorAbi, functionName: 'ledger', args: [token], blockNumber }),
    chain.readContract({ address: addresses.coordinator, abi: coordinatorAbi, functionName: 'receipt', args: [token], blockNumber }),
  ]);
  const { market, vault } = receipt;
  const lpLock = ledger.protectedLPReceiver;
  if (!same(packet.token, token) || packet.venue !== 1 || ledger.phase !== 2
    || !validNonzero(market) || !validNonzero(vault) || !validNonzero(lpLock)
    || !same(receipt.lpAsset, vault) || !same(receipt.protectedLPReceiver, lpLock)
    || !same(packet.protectedLPReceiver, lpLock) || !same(ledger.protectedExcessReceiver, lpLock)
    || !same(receipt.protectedExcessReceiver, lpLock) || !same(packet.protectedExcessReceiver, lpLock)) {
    throw Error('Not a qualified graduated RetroPick Kuru pool.');
  }
  const router = release.kuruEnvironment.router as Address;
  const [params, vaultParams, registered, marginAccount, orderImplementation, vaultImplementation,
    vaultToken1, vaultToken2, vaultMarket, vaultMargin, vaultOwner, lockToken, lockQuote, lockMarket, lockVault] = await Promise.all([
    chain.readContract({ address: market, abi: kuruAbi, functionName: 'getMarketParams', blockNumber }),
    chain.readContract({ address: market, abi: kuruAbi, functionName: 'getVaultParams', blockNumber }),
    chain.readContract({ address: router, abi: routerAbi, functionName: 'verifiedMarket', args: [market], blockNumber }),
    chain.readContract({ address: router, abi: routerAbi, functionName: 'marginAccountAddress', blockNumber }),
    chain.readContract({ address: router, abi: routerAbi, functionName: 'orderBookImplementation', blockNumber }),
    chain.readContract({ address: router, abi: routerAbi, functionName: 'kuruAmmVaultImplementation', blockNumber }),
    chain.readContract({ address: vault, abi: kuruVaultAbi, functionName: 'token1', blockNumber }),
    chain.readContract({ address: vault, abi: kuruVaultAbi, functionName: 'token2', blockNumber }),
    chain.readContract({ address: vault, abi: kuruVaultAbi, functionName: 'market', blockNumber }),
    chain.readContract({ address: vault, abi: kuruVaultAbi, functionName: 'marginAccount', blockNumber }),
    chain.readContract({ address: vault, abi: kuruVaultAbi, functionName: 'owner', blockNumber }),
    chain.readContract({ address: lpLock, abi: lockAbi, functionName: 'launchToken', blockNumber }),
    chain.readContract({ address: lpLock, abi: lockAbi, functionName: 'quoteToken', blockNumber }),
    chain.readContract({ address: lpLock, abi: lockAbi, functionName: 'market', blockNumber }),
    chain.readContract({ address: lpLock, abi: lockAbi, functionName: 'vault', blockNumber }),
    chain.readContract({ address: addresses.kuruEnvironment, abi: kuruEnvironmentAbi, functionName: 'validate', blockNumber }),
    ...[market, vault, lpLock].map(address => chain.getCode({ address, blockNumber }).then(code => {
      if (!code || code === '0x') throw Error('Pool contract code is unavailable.');
    })),
  ]);
  if (registered.length !== params.length || registered.some((value, i) => !same(String(value), String(params[i])))
    || !same(params[2], token) || !same(params[4], packet.quoteAsset) || Number(params[5]) !== packet.quoteDecimals
    || !same(vaultParams[0], vault) || !same(marginAccount, release.kuruEnvironment.marginAccount)
    || !same(orderImplementation, release.kuruEnvironment.orderBookImplementation)
    || !same(vaultImplementation, release.kuruEnvironment.vaultImplementation)
    || !same(vaultToken1, token) || !same(vaultToken2, packet.quoteAsset) || !same(vaultMarket, market)
    || !same(vaultMargin, marginAccount) || !same(vaultOwner, router)
    || !same(lockToken, token) || !same(lockQuote, packet.quoteAsset) || !same(lockMarket, market) || !same(lockVault, vault)
    || BigInt(params[0]) <= 0n || params[1] <= 0n || params[3] > 255n || params[5] > 255n) {
    throw Error('Kuru pool identity/environment mismatch.');
  }
  const identity: KuruLiquidityIdentity = {
    token, quoteAsset: packet.quoteAsset, market, vault, lpLock, marginAccount,
    baseDecimals: Number(params[3]), quoteDecimals: Number(params[5]), pricePrecision: BigInt(params[0]), sizePrecision: params[1],
  };
  const [clob, vaultState, bestExecutable, custody, position] = await Promise.all([
    options.includeBook === false ? skipped<Awaited<ReturnType<typeof readKuruBook>>>('KURU_CLOB') : section('KURU_CLOB', async () => {
      const book = await readKuruBook(chain, market, blockNumber);
      if (book.block !== blockNumber) throw Error('CLOB block mismatch.');
      return book;
    }),
    section<KuruVaultLiquidity>('KURU_VAULT', async () => {
      const [assets, totalSharesRaw, shareDecimals] = await Promise.all([
        chain.readContract({ address: vault, abi: kuruVaultAbi, functionName: 'totalAssets', blockNumber }),
        chain.readContract({ address: vault, abi: kuruVaultAbi, functionName: 'totalSupply', blockNumber }),
        chain.readContract({ address: vault, abi: kuruVaultAbi, functionName: 'decimals', blockNumber }),
      ]);
      const [, bid, bidFilled, ask, askFilled, bidSize, askSize, spreadBps] = vaultParams;
      if (bidFilled > bidSize || askFilled > askSize) throw Error('Invalid partial vault fill.');
      const scale = 10n ** BigInt(identity.baseDecimals);
      return {
        baseAssetsRaw: assets[0], quoteAssetsRaw: assets[1], totalSharesRaw, shareDecimals,
        bidX18: bidPrice(bid), askX18: askPrice(ask), bidOrderSizeUnits: bidSize, askOrderSizeUnits: askSize,
        bidPartiallyFilledUnits: bidFilled, askPartiallyFilledUnits: askFilled,
        bidAvailableBaseRaw: (bidSize - bidFilled) * scale / identity.sizePrecision,
        askAvailableBaseRaw: (askSize - askFilled) * scale / identity.sizePrecision, spreadBps,
      };
    }),
    section<KuruBestExecutable>('KURU_BEST_BID_ASK', async () => {
      const [best, marketState] = await Promise.all([
        chain.readContract({ address: market, abi: kuruAbi, functionName: 'bestBidAsk', blockNumber }),
        chain.readContract({ address: market, abi: kuruAbi, functionName: 'marketState', blockNumber }),
      ]);
      if (marketState > 2) throw Error('Unsupported Kuru market state.');
      return { bidX18: bidPrice(best[0]), askX18: askPrice(best[1]), marketState };
    }),
    section<KuruLiquidityCustody>('RETROPICK_LIQUIDITY_LOCK', async () => {
      const [protectedBalances, infrastructureSharesRaw] = await Promise.all([
        chain.readContract({ address: lpLock, abi: lockAbi, functionName: 'protectedBalances', blockNumber }),
        chain.readContract({ address: vault, abi: kuruVaultAbi, functionName: 'balanceOf', args: [marginAccount], blockNumber }),
      ]);
      if (protectedBalances[0] < ledger.protectedLPAmount || protectedBalances[1] < ledger.protectedExcessAmount) throw Error('Protected custody shortage.');
      return { lockedSharesRaw: protectedBalances[0], excessBaseRaw: protectedBalances[1], infrastructureSharesRaw };
    }),
    options.account ? section<KuruLiquidityPosition>('KURU_VAULT_PREVIEW_WITHDRAW', async () => {
      const account = options.account!;
      const sharesRaw = await chain.readContract({ address: vault, abi: kuruVaultAbi, functionName: 'balanceOf', args: [account], blockNumber });
      // Avoid a zero-share preview on an upstream vault that may reject empty supply/size math.
      const preview = sharesRaw === 0n ? [0n, 0n] as const : await chain.readContract({ address: vault, abi: kuruVaultAbi, functionName: 'previewWithdraw', args: [sharesRaw], blockNumber });
      return { account, sharesRaw, previewBaseRaw: preview[0], previewQuoteRaw: preview[1], kind: same(account, lpLock) ? 'protocol-lock' : same(account, marginAccount) ? 'infrastructure' : 'wallet' };
    }) : skipped<KuruLiquidityPosition>('KURU_VAULT_PREVIEW_WITHDRAW'),
  ]);
  const finalHeader = await chain.getBlock({ blockNumber });
  if (!finalHeader.hash || finalHeader.number !== blockNumber || !same(finalHeader.hash, header.hash)) throw Error('Liquidity snapshot changed during reads; retry.');
  return { chainId: 10143, blockNumber, blockHash: header.hash, observedAt: Date.now(), identity, clob, vault: vaultState, bestExecutable, custody, position };
}
