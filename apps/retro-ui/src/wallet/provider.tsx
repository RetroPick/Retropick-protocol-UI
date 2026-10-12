'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Address } from 'viem';
import { WalletPickerDialog } from './wallet-picker';
import {
  activeChainId,
  requestAccounts,
  createEvmWallet,
  discoverEip6963,
  ensureMonadTestnet,
  injectedProvider,
  type Eip1193Provider,
  type Eip6963Announcement,
  type EvmWallet,
} from '@retropick/launchpad-sdk/wallet';

export type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'wrong-chain';

export interface WalletState {
  status: WalletStatus;
  account: Address | null;
  chainId: number | null;
  announcements: Eip6963Announcement[];
  provider: Eip1193Provider | null;
  error: string | null;
  connect: (announcement?: Eip6963Announcement | null) => Promise<void>;
  disconnect: () => void;
  switchChain: () => Promise<void>;
  wallet: EvmWallet | null;
  /** Human name of the connected wallet (from its EIP-6963 metadata). */
  walletName: string | null;
  /** Re-run EIP-6963 discovery (late-announcing extensions). */
  refreshAnnouncements: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

const RDNS_KEY = 'retropick-wallet-rdns';
const NAME_KEY = 'retropick-wallet-name';

export const MONAD_TESTNET = 10143;

/**
 * Real EIP-1193 wallet for LIVE mode. The demo wallet (DemoProvider) remains
 * the wallet of demo modules and can never authorize a live economic action:
 * this provider is the only path the transaction pipeline will sign through.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [announcements, setAnnouncements] = useState<Eip6963Announcement[]>([]);
  const [provider, setProvider] = useState<Eip1193Provider | null>(null);
  const [account, setAccount] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [status, setStatus] = useState<WalletStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const providerRef = useRef<Eip1193Provider | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const unwatch = useRef<(() => void) | null>(null);
  useEffect(() => () => unwatch.current?.(), []);

  const refreshAnnouncements = useCallback(() => {
    void discoverEip6963().then(setAnnouncements);
  }, []);

  useEffect(() => {
    refreshAnnouncements();
    try { setWalletName(localStorage.getItem(NAME_KEY)); } catch { /* ignore */ }
  }, [refreshAnnouncements]);

  const watch = useCallback((connected: Eip1193Provider) => {
    unwatch.current?.();
    const accountsChanged = ((accounts: string[]) => {
      const next = accounts[0] as Address | undefined;
      if (!next) {
        setAccount(null); setProvider(null); setChainId(null); providerRef.current = null;
        unwatch.current?.(); unwatch.current = null;
        setStatus('disconnected');
      } else {
        setAccount(next);
      }
    }) as (...args: never[]) => void;
    const chainChanged = ((chain: string) => {
      const id = Number(chain);
      setChainId(id);
      setStatus((prev) => (prev === 'disconnected' ? prev : id === MONAD_TESTNET ? 'connected' : 'wrong-chain'));
    }) as (...args: never[]) => void;
    connected.on?.('accountsChanged', accountsChanged);
    connected.on?.('chainChanged', chainChanged);
    unwatch.current = () => { connected.removeListener?.('accountsChanged', accountsChanged); connected.removeListener?.('chainChanged', chainChanged); };
  }, []);

  const connect = useCallback(async (announcement?: Eip6963Announcement | null) => {
    if (announcement === undefined) { setPickerOpen(true); return; }
    unwatch.current?.(); unwatch.current = null;
    providerRef.current = null; setProvider(null); setAccount(null); setChainId(null);
    setStatus('connecting');
    setError(null);
    try {
      let selected = announcement?.provider;
      let chosenName = announcement?.info.name;
      if (!selected) {
        selected = injectedProvider(); chosenName = 'Browser wallet';
      }
      if (!selected) throw Error('No wallet found. Install Rabby, MetaMask or another EIP-1193 wallet.');
      if (announcement) {
        try {
          localStorage.setItem(RDNS_KEY, announcement.info.rdns);
          localStorage.setItem(NAME_KEY, announcement.info.name);
        } catch { /* ignore */ }
        setWalletName(announcement.info.name);
      }
      setWalletName(chosenName ?? 'Browser wallet');
      const accounts = await requestAccounts(selected);
      if (!accounts.length) throw Error('Wallet returned no accounts.');
      const id = await ensureMonadTestnet(selected);
      const current = await activeChainId(selected);
      providerRef.current = selected;
      setProvider(selected);
      setAccount(accounts[0]);
      setChainId(current);
      setStatus(current === MONAD_TESTNET ? 'connected' : 'wrong-chain');
      watch(selected);
    } catch (cause) {
      setStatus('disconnected');
      setError(cause instanceof Error ? cause.message : 'Wallet connection failed.');
      throw cause;
    }
  }, [announcements, watch]);

  const disconnect = useCallback(() => {
    unwatch.current?.(); unwatch.current = null;
    providerRef.current = null;
    setProvider(null);
    setAccount(null);
    setChainId(null);
    setStatus('disconnected');
    setError(null);
  }, []);

  const switchChain = useCallback(async () => {
    const selected = providerRef.current;
    if (!selected) return;
    try {
      await ensureMonadTestnet(selected);
      const id = await activeChainId(selected);
      setChainId(id);
      setStatus(id === MONAD_TESTNET ? 'connected' : 'wrong-chain');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chain switch failed.');
    }
  }, []);

  const wallet = useMemo(() => (provider && account && chainId === MONAD_TESTNET ? createEvmWallet(provider, account) : null), [provider, account, chainId]);

  const value = useMemo<WalletState>(() => ({
    status, account, chainId, announcements, provider, error, connect, disconnect, switchChain, wallet, walletName, refreshAnnouncements,
  }), [status, account, chainId, announcements, provider, error, connect, disconnect, switchChain, wallet, walletName, refreshAnnouncements]);

  return <WalletContext.Provider value={value}>{children}<WalletPickerDialog open={pickerOpen} onOpenChange={setPickerOpen}/></WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const context = useContext(WalletContext);
  if (!context) throw Error('useWallet requires WalletProvider');
  return context;
}
