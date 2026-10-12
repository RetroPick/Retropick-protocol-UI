'use client';

import Link from '@/components/product/safe-link';
import { useDemo } from '@/components/product/provider';
import { useWallet } from '@/wallet/provider';
import { DATA_MODE } from '@/lib/live/env';
import { CommandPalette } from './command-palette';
import { RetroLogo } from '@/components/Icons';
import { Sidebar } from '@/components/shell/sidebar';
import { MobileNav } from '@/components/shell/mobile-nav';
import { ArrowUpRight, Search, Wallet } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';


const SIDEBAR_COLLAPSED_KEY = 'retropick-sidebar-collapsed';

// No top navbar: desktop chrome is the sidebar alone (search, wallet and
// theme toggle included). Phones get a one-row fallback bar for search and
// wallet, since the sidebar is hidden below md.
export function Shell({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try { setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'); } catch { /* ignore */ }
  }, []);
  const toggleCollapsed = () => setCollapsed((value) => {
    const next = !value;
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0'); } catch { /* ignore */ }
    return next;
  });
  useEffect(() => { const key = (event: KeyboardEvent) => { const target = event.target as HTMLElement | null; const typing = !!target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)); if (((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') || (event.key === '/' && !typing)) { event.preventDefault(); setSearchOpen(true); } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, []);
  return <><a href="#main" className="skip">Skip to content</a><Sidebar isCollapsed={collapsed} onToggleCollapse={toggleCollapsed} onOpenSearch={() => setSearchOpen(true)}/><div className={`min-h-screen flex flex-col transition-all duration-200 ${collapsed ? 'md:pl-[72px]' : 'md:pl-[240px]'}`}><div className="mobilebar"><Link href="/launchpad" aria-label="RetroPick Launchpad home"><RetroLogo className="w-7 h-7"/></Link><span className="spacer"/><button className="icon-btn" onClick={() => setSearchOpen(true)} aria-label="Search tokens and markets"><Search size={18}/></button><MobileWalletButton/></div><div className="demo-strip">{DATA_MODE === 'live' ? <><span className="demo-pill">LIVE</span><span>Monad Testnet · chain 10143 · test assets.</span></> : <><span className="demo-pill">DEMO</span><span>Illustrative data — no real funds.</span></>}<Link href="/docs">How it works <ArrowUpRight size={12}/></Link></div><main id="main" className="main">{children}</main><footer className="footer"><div><span className="footer-brand">RetroPick</span><span>{DATA_MODE === 'live' ? 'Monad Testnet · live contract data' : 'Demo snapshot · Sep 17, 2026'}</span></div><div><Link href="/docs">Docs</Link><a href="https://github.com/RetroPick/retropick-protocol" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={12}/></a></div></footer></div><MobileNav/><CommandPalette open={searchOpen} onOpenChange={setSearchOpen}/></>;
}

/** Mobile bar wallet: real wallet in live mode, demo toggle in mock mode. */
function MobileWalletButton() {
  const demo = useDemo();
  const wallet = useWallet(); // provider is always mounted; mock mode ignores it
  if (DATA_MODE !== 'live') return <button className="icon-btn" onClick={() => demo.setConnected(!demo.connected)} aria-label={demo.connected ? 'Demo wallet' : 'Connect wallet'}><Wallet size={18}/></button>;
  return <>
    <button className="icon-btn" onClick={() => (wallet.status === 'disconnected' ? void wallet.connect() : wallet.disconnect())} aria-label={wallet.status === 'connected' ? `Wallet ${wallet.account}` : 'Connect wallet'} data-wallet-status={wallet.status}><Wallet size={18}/></button>
  </>;
}
