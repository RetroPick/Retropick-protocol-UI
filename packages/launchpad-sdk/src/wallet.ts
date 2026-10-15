import { createWalletClient, custom, type Address } from 'viem';
import { monad } from './chain.ts';

/** Minimal EIP-1193 provider surface the SDK relies on. */
export type Eip1193Provider = {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, handler: (...args: never[]) => void): void;
  removeListener?(event: string, handler: (...args: never[]) => void): void;
};

export type Eip6963ProviderInfo = { uuid: string; name: string; icon: string; rdns: string };
export type Eip6963Announcement = { info: Eip6963ProviderInfo; provider: Eip1193Provider };

/** Monad Testnet chain id as an EIP-1193 hex quantity. */
export const MONAD_TESTNET_CHAIN_ID_HEX = '0x279f' as const;

interface Eip6963Window {
  addEventListener(event: 'eip6963:announceProvider', handler: (event: CustomEvent<Eip6963Announcement>) => void): void;
  dispatchEvent(event: Event): boolean;
  removeEventListener(event: string, handler: (event: CustomEvent<Eip6963Announcement>) => void): void;
}

/** Discover wallets via EIP-6963 multi-injected-provider discovery. */
export function discoverEip6963(timeoutMs = 250): Promise<Eip6963Announcement[]> {
  const w = globalThis as unknown as Record<string, unknown> & Partial<Eip6963Window>;
  const dispatch = w.dispatchEvent;
  const addEventListener = w.addEventListener;
  if (typeof dispatch !== 'function' || typeof addEventListener !== 'function') return Promise.resolve([]);
  return new Promise((resolve) => {
    const found: Eip6963Announcement[] = [];
    const onAnnounce = (event: CustomEvent<Eip6963Announcement>) => {
      if (event.detail?.provider && !found.some(entry => entry.provider === event.detail.provider || entry.info.uuid === event.detail.info.uuid)) found.push(event.detail);
    };
    addEventListener.call(w, 'eip6963:announceProvider', onAnnounce as never);
    dispatch.call(w, new Event('eip6963:requestProvider'));
    setTimeout(() => { w.removeEventListener?.('eip6963:announceProvider', onAnnounce); resolve(found); }, timeoutMs);
  });
}

/** Legacy single injected provider (window.ethereum), if any. */
export function injectedProvider(): Eip1193Provider | undefined {
  const candidate = (globalThis as Record<string, unknown>).ethereum as Partial<Eip1193Provider> | undefined;
  return candidate && typeof candidate.request === 'function' ? (candidate as Eip1193Provider) : undefined;
}

export async function requestAccounts(provider: Eip1193Provider): Promise<Address[]> {
  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
  return accounts.filter((value): value is Address => /^0x[0-9a-fA-F]{40}$/.test(value));
}

export async function activeChainId(provider: Eip1193Provider): Promise<number> {
  return Number(await provider.request({ method: 'eth_chainId' }));
}

export function createEvmWallet(provider: Eip1193Provider, account: Address) {
  return createWalletClient({ chain: monad, account, transport: custom(provider) });
}
export type EvmWallet = ReturnType<typeof createEvmWallet>;

function isUnrecognizedChainError(error: unknown): boolean {
  const code = (error as { code?: number; data?: { originalError?: { code?: number } } })?.code
    ?? (error as { data?: { originalError?: { code?: number } } })?.data?.originalError?.code;
  return code === 4902 || code === -32603; // wallets surface either for unknown chains
}

/** Payload for EIP-747 wallet_watchAsset (ERC-20). */
export type WatchAssetPayload = {
  type: 'ERC20';
  options: { address: Address; symbol: string; decimals: number; image?: string };
};

export type WatchAssetOptions = {
  address: Address;
  symbol: string;
  /** Actual on-chain decimals — never assume a value. */
  decimals: number;
  /** Public HTTPS image URL. ipfs:// or http:// sources are dropped: wallets cannot fetch them. */
  image?: string | null;
};

/**
 * Build the EIP-747 request payload. The image field is included only when it is an
 * https:// URL — MetaMask fetches the image from a plain web client, so ipfs:// and
 * http:// would silently degrade the token back to its letter icon.
 */
export function buildWatchAssetPayload(options: WatchAssetOptions): WatchAssetPayload {
  const image = typeof options.image === 'string' && options.image.startsWith('https://') ? options.image : undefined;
  return image
    ? { type: 'ERC20', options: { address: options.address, symbol: options.symbol, decimals: options.decimals, image } }
    : { type: 'ERC20', options: { address: options.address, symbol: options.symbol, decimals: options.decimals } };
}

/**
 * Prompt the wallet to track an ERC-20 token (EIP-747 wallet_watchAsset).
 * Refuses to issue the request unless the provider is already on Monad Testnet —
 * wallets can silently watch the asset on the wrong chain otherwise.
 * Errors propagate untouched: 4001 (user rejection) and -32601 (unsupported) stay typed.
 */
export async function watchAsset(provider: Eip1193Provider, options: WatchAssetOptions): Promise<boolean> {
  const chainId = await activeChainId(provider);
  if (chainId !== monad.id) {
    throw Object.assign(Error(`Wallet must be on Monad Testnet (chain ${monad.id}); wallet reports chain ${chainId}.`), { code: 'WRONG_CHAIN' });
  }
  return Boolean(await provider.request({ method: 'wallet_watchAsset', params: buildWatchAssetPayload(options) }));
}

/** Ensure the connected wallet is on Monad Testnet; switch or add when needed. */
export async function ensureMonadTestnet(provider: Eip1193Provider): Promise<'already' | 'switched' | 'added'> {
  if (await activeChainId(provider) === monad.id) return 'already';
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: MONAD_TESTNET_CHAIN_ID_HEX }] });
    return 'switched';
  } catch (error) {
    if (!isUnrecognizedChainError(error)) throw error;
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: MONAD_TESTNET_CHAIN_ID_HEX,
        chainName: monad.name,
        nativeCurrency: monad.nativeCurrency,
        rpcUrls: [monad.rpcUrls.default.http[0]],
        blockExplorerUrls: [monad.blockExplorers.default.url],
      }],
    });
    return 'added';
  }
}
