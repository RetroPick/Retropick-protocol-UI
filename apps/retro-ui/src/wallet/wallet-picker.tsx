'use client';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useWallet } from '@/wallet/provider';
import { injectedProvider, type Eip6963Announcement } from '@retropick/launchpad-sdk/wallet';
import { Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';

const RDNS_KEY = 'retropick-wallet-rdns';

/**
 * Wallet picker: lists every EIP-6963 discovered wallet (plus an explicit
 * window.ethereum fallback) so connecting never silently picks whichever
 * extension announced first. The last-used wallet is remembered and marked.
 */
export function WalletPickerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { announcements, connect, refreshAnnouncements } = useWallet();
  const [lastRdns, setLastRdns] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyRdns, setBusyRdns] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Re-discover on open: some extensions announce late or on demand.
    refreshAnnouncements();
    try { setLastRdns(localStorage.getItem(RDNS_KEY)); } catch { /* ignore */ }
  }, [open, refreshAnnouncements]);

  const pick = async (entry: Eip6963Announcement | null) => {
    setBusyRdns(entry?.info.rdns ?? 'injected');
    setError(null);
    try {
      await connect(entry);
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Wallet connection failed.');
    } finally {
      setBusyRdns(null);
    }
  };

  const injected = injectedProvider();
  const showInjectedFallback = Boolean(injected) && !announcements.some((entry) => entry.provider === injected);
  const entries = [...announcements].sort((a, b) => (a.info.rdns === lastRdns ? -1 : b.info.rdns === lastRdns ? 1 : 0));

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="product-dialog">
      <DialogTitle>Connect a wallet</DialogTitle>
      <DialogDescription>Choose which wallet to use for this session.</DialogDescription>
      <div className="search-results" role="group" aria-label="Wallet choices">
        {entries.map((entry) => (
          <button
            key={entry.info.rdns}
            className="wallet-option"
            disabled={busyRdns !== null}
            onClick={() => void pick(entry)}
            data-selected={entry.info.rdns === lastRdns || undefined}
          >
            {entry.info.icon ? <img src={entry.info.icon} alt="" className="wallet-option-icon"/> : <Wallet size={18}/>}
            <span>{entry.info.name}</span>
            {entry.info.rdns === lastRdns && <small>last used</small>}
          </button>
        ))}
        {showInjectedFallback && (
          <button className="wallet-option" disabled={busyRdns !== null} onClick={() => void pick(null)}>
            <Wallet size={18}/>
            <span>Browser wallet</span>
            <small>window.ethereum</small>
          </button>
        )}
        {!entries.length && !showInjectedFallback && (
          <p className="empty-copy">No wallet found. Install a browser wallet (Rabby, MetaMask, …) and reload this page.</p>
        )}
      </div>
      {error && <div role="alert" className="form-error">{error}</div>}
    </DialogContent>
  </Dialog>;
}
