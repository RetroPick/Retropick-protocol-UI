'use client';

import Link from '@/components/product/safe-link';
import { DATA_MODE } from '@/lib/live/env';
import { CommandPalette } from './command-palette';
import { TopNavbar } from './top-navbar';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';
import { ArrowUpRight } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

export function Shell({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = !!target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') || (event.key === '/' && !typing)) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  return (
    <div className="min-h-screen bg-[#090a10] text-[#f8fafc] flex flex-col">
      <a href="#main" className="skip">Skip to content</a>
      
      {/* 1. Left Vertical Sidebar (Desktop only: lg+) */}
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} 
        onOpenSearch={() => setSearchOpen(true)} 
      />

      {/* 2. Main Content Layout (Offset on desktop for sidebar) */}
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[260px]'
        }`}
      >
        {/* Modern Top Header */}
        <TopNavbar onOpenSearch={() => setSearchOpen(true)} />

        {/* Subtle Demo/Live Strip */}
        <div className="demo-strip border-b border-white/[0.06] bg-[#0b0d14] text-xs font-mono py-1.5 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {DATA_MODE === 'live' ? (
              <>
                <span className="demo-pill px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">LIVE</span>
                <span className="text-slate-400 text-[11.5px]">Monad Testnet · chain 10143 · live contracts.</span>
              </>
            ) : (
              <>
                <span className="demo-pill px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/30 text-[10px] font-bold">DEMO</span>
                <span className="text-slate-400 text-[11.5px]">Simulated test data — no real funds.</span>
              </>
            )}
          </div>
          <Link href="/docs" className="text-violet-400 hover:text-violet-300 flex items-center gap-1 text-[11.5px] hover:underline">
            How it works <ArrowUpRight size={12} />
          </Link>
        </div>

        {/* Page Content */}
        <main id="main" className="main flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>

        {/* Global Footer */}
        <footer className="footer border-t border-white/[0.06] bg-[#0b0d14] mt-auto py-5 px-4 sm:px-6 lg:px-8 text-xs font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white font-mono">RetroPick Protocol</span>
            <span className="text-slate-600">·</span>
            <span>{DATA_MODE === 'live' ? 'Monad Testnet live contract feed' : 'Demo snapshot · High performance AMM'}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="hover:text-slate-300 transition-colors">Documentation</Link>
            <a 
              href="https://github.com/RetroPick/retropick-protocol" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-slate-300 flex items-center gap-1 transition-colors"
            >
              GitHub <ArrowUpRight size={12} />
            </a>
          </div>
        </footer>
      </div>

      <MobileNav />
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
