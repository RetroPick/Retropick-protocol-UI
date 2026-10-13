'use client';

import {
  Home,
  Coins,
  FileText,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Search,
  Sun,
  Moon,
  Wallet,
} from 'lucide-react';
import Link from '@/components/product/safe-link';
import { usePathname } from '@/lib/next-compat';
import { useDemo } from '@/components/product/provider';
import { useWallet } from '@/wallet/provider';
import { useState } from 'react';
import { DATA_MODE } from '@/lib/live/env';
import { toggleTheme, useTheme } from '@/lib/theme';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSearch: () => void;
}

// Primary navigation lives entirely in the sidebar — there is no top navbar.
// Home → /launchpad (includes all tradeable markets) · Earn → /earn
export function Sidebar({ isCollapsed, onToggleCollapse, onOpenSearch }: SidebarProps) {
  const pathname = usePathname();
  const theme = useTheme();
  const demo = useDemo();
  const isActive = (id: 'home' | 'earn') => {
    if (id === 'earn') return pathname.startsWith('/earn') || pathname.startsWith('/portfolio');
    return pathname.startsWith('/launchpad') || pathname.startsWith('/prism') || pathname.startsWith('/creator') || pathname === '/docs';
  };

  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home, href: '/launchpad' },
    { id: 'earn' as const, label: 'Earn', icon: Coins, href: '/earn' },
  ];

  return (
    <aside className={`sidebar${isCollapsed ? ' collapsed' : ''}`}>
      <div className="side-top">
        <div className="side-brand">
          <Link href="/launchpad" className="side-brand-link" aria-label="RetroPick Launchpad home">
            <img src="/brand/retropick.png" alt="" className="w-8 h-8 object-contain"/>
            {!isCollapsed && <span className="side-brand-name">Retro</span>}
          </Link>
          <button onClick={onToggleCollapse} className="side-collapse" aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {isCollapsed ? <ChevronsRight className="w-4 h-4"/> : <ChevronsLeft className="w-4 h-4"/>}
          </button>
        </div>

        <button className="side-search" onClick={onOpenSearch} aria-label="Search tokens and markets" title="Search (⌘K)">
          <Search size={15}/>
          {!isCollapsed && <><span>Search</span><kbd>⌘K</kbd></>}
        </button>

        <nav className="side-nav" aria-label="Primary navigation">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.id);
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`side-link${active ? ' active' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <IconComponent className="w-5 h-5"/>
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <Link href="/launchpad/create" className="launch-btn" title="Launch a token">
          <Plus className="w-4 h-4 stroke-[3]"/>
          {!isCollapsed && <span>Launch</span>}
        </Link>
      </div>

      <div className="side-bottom">
        <WalletButton isCollapsed={isCollapsed}/>
        <button className="side-action" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
          {theme === 'dark' ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
          {!isCollapsed && <span className="side-label">{theme === 'dark' ? 'Light theme' : 'Dark theme'}</span>}
        </button>
        <Link href="/docs" className="side-action" title="Docs">
          <FileText className="w-5 h-5"/>
          {!isCollapsed && <span className="side-label">Docs</span>}
        </Link>
      </div>
    </aside>
  );
}

/** Live mode connects a real EIP-1193 wallet; mock mode keeps the demo wallet. */
function WalletButton({ isCollapsed }: { isCollapsed: boolean }) {
  const demo = useDemo();
  const live = DATA_MODE === 'live';
  const wallet = useWallet();
  if (!live) {
    return <button className="side-action side-wallet" onClick={() => demo.setConnected(!demo.connected)} aria-label={demo.connected ? 'Demo wallet' : 'Connect wallet'} title={demo.connected ? 'Demo wallet' : 'Connect wallet'}>
      <Wallet className="w-5 h-5"/>
      {!isCollapsed && <span className="side-label">{demo.connected ? 'Demo wallet' : 'Connect wallet'}</span>}
    </button>;
  }
  const label = wallet.status === 'connected' ? `${wallet.account?.slice(0, 6)}…${wallet.account?.slice(-4)}`
    : wallet.status === 'wrong-chain' ? 'Wrong chain'
    : wallet.status === 'connecting' ? 'Connecting…'
    : 'Connect wallet';
  return <>
    <button className="side-action side-wallet" onClick={() => (wallet.status === 'disconnected' ? void wallet.connect() : wallet.status === 'wrong-chain' ? void wallet.switchChain() : wallet.disconnect())} aria-label={label} title={wallet.walletName ? `${wallet.walletName} · ${label}` : label} data-wallet-status={wallet.status}>
      <Wallet className="w-5 h-5"/>
      {!isCollapsed && <span className="side-label">{label}</span>}
    </button>
  </>;
}
