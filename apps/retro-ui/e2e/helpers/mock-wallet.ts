import type { Page } from '@playwright/test';

/**
 * Injected EIP-1193 + EIP-6963 mock wallet for UI automation.
 * It can return accounts and a chain id, switch chain, and RECORD signing / sending requests.
 * It NEVER signs and NEVER broadcasts: every eth_sendTransaction / eth_sign* / personal_sign request is
 * recorded in window.__mockWallet.calls and rejected (EIP-1193 4001 user rejection by default).
 */
export interface MockWalletOptions {
  account?: string;
  chainId?: number;
  /** 'reject' (default): every signature request is rejected with code 4001. */
  signing?: 'reject';
  /** Behavior of wallet_watchAsset (EIP-747): resolve true, reject 4001, or unsupported -32601. Default: resolve. */
  watchAsset?: 'resolve' | 'reject' | 'unsupported';
  announce?: boolean;
}

export const MOCK_ACCOUNT = '0x00000000000000000000000000000000000e2e01';

export async function installMockWallet(page: Page, options: MockWalletOptions = {}): Promise<void> {
  const config = { account: options.account ?? MOCK_ACCOUNT, chainId: options.chainId ?? 10143, announce: options.announce ?? true, watchAsset: options.watchAsset ?? 'resolve' };
  await page.addInitScript((cfg) => {
    const listeners: Record<string, Array<(v: unknown) => void>> = {};
    const state = { chainId: cfg.chainId, connected: false, calls: [] as Array<{ method: string; at: number; params?: unknown }> };
    const SIGNING = ['eth_sendTransaction', 'eth_sendRawTransaction', 'eth_sign', 'personal_sign', 'eth_signTypedData', 'eth_signTypedData_v3', 'eth_signTypedData_v4', 'eth_signTransaction', 'wallet_sendCalls'];
    const emit = (event: string, value: unknown) => (listeners[event] ?? []).forEach((fn) => fn(value));
    const reject = (code: number, message: string) => Object.assign(new Error(message), { code });
    const provider = {
      isRetroPickMock: true,
      async request({ method, params }: { method: string; params?: unknown[] }) {
        state.calls.push({ method, at: Date.now(), params });
        if (SIGNING.includes(method)) throw reject(4001, 'MockWallet: user rejected the request (automation never signs).');
        switch (method) {
          case 'eth_requestAccounts': state.connected = true; return [cfg.account];
          case 'eth_accounts': return state.connected ? [cfg.account] : [];
          case 'eth_chainId': return '0x' + state.chainId.toString(16);
          case 'net_version': return String(state.chainId);
          case 'wallet_switchEthereumChain': {
            const id = Number((params?.[0] as { chainId: string })?.chainId);
            state.chainId = id; emit('chainChanged', '0x' + id.toString(16)); return null;
          }
          case 'wallet_addEthereumChain': return null;
          case 'wallet_watchAsset': {
            if (cfg.watchAsset === 'unsupported') throw reject(-32601, 'MockWallet: wallet_watchAsset not supported in UI automation');
            if (cfg.watchAsset === 'reject') throw reject(4001, 'MockWallet: user rejected the watchAsset request (automation never signs).');
            return true;
          }
          default: throw reject(-32601, `MockWallet: ${method} not supported in UI automation`);
        }
      },
      on(event: string, fn: (v: unknown) => void) { (listeners[event] ??= []).push(fn); },
      removeListener(event: string, fn: (v: unknown) => void) { listeners[event] = (listeners[event] ?? []).filter((x) => x !== fn); },
    };
    (window as unknown as { __mockWallet: unknown }).__mockWallet = { state, provider, setChain(id: number) { state.chainId = id; emit('chainChanged', '0x' + id.toString(16)); } };
    (window as unknown as { ethereum: unknown }).ethereum = provider;
    if (cfg.announce) {
      const info = { uuid: 'e2e-mock-wallet', name: 'E2E Mock Wallet', icon: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E', rdns: 'xyz.retropick.e2e-mock' };
      const announce = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: Object.freeze({ info, provider }) }));
      window.addEventListener('eip6963:requestProvider', announce);
      announce();
    }
  }, config);
}

export async function walletCalls(page: Page): Promise<string[]> {
  return page.evaluate(() => ((window as unknown as { __mockWallet?: { state: { calls: Array<{ method: string }> } } }).__mockWallet?.state.calls ?? []).map((c) => c.method));
}

/** Full call records (method + params) for one RPC method, in request order. */
export async function walletMethodCalls<T = { method: string; params?: unknown }>(page: Page, method: string): Promise<T[]> {
  return page.evaluate((target) => (((window as unknown as { __mockWallet?: { state: { calls: Array<{ method: string; params?: unknown }> } } }).__mockWallet?.state.calls ?? []).filter((c) => c.method === target) as T[]), method);
}
