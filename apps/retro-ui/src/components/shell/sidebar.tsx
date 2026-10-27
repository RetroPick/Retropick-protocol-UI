'use client';

import {
  FiSearch,
  FiPlus,
  FiSun,
  FiMoon,
  FiExternalLink,
} from 'react-icons/fi';
import {
  RiRocketLine,
  RiWaterPercentLine,
  RiCoinsLine,
  RiStackLine,
  RiTargetLine,
  RiUser3Line,
  RiBookOpenLine,
} from 'react-icons/ri';
import Link from '@/components/product/safe-link';
import { usePathname } from '@/lib/next-compat';
import { toggleTheme, useTheme } from '@/lib/theme';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSearch: () => void;
}

export function Sidebar({ isCollapsed, onToggleCollapse, onOpenSearch }: SidebarProps) {
  const pathname = usePathname();
  const theme = useTheme();

  const isRouteActive = (href: string) => {
    if (href === '/launchpad') {
      return pathname === '/' || pathname.startsWith('/launchpad') && !pathname.includes('type=prediction');
    }
    if (href === '/launchpad?type=prediction') {
      return pathname.includes('prediction');
    }
    if (href === '/portfolio') {
      return pathname.startsWith('/portfolio');
    }
    return pathname.startsWith(href);
  };

  const primaryNav = [
    { id: 'launchpad', label: 'Launchpad', icon: RiRocketLine, href: '/launchpad', badge: 'Live' },
    { id: 'liquidity', label: 'Liquidity', icon: RiWaterPercentLine, href: '/liquidity' },
    { id: 'earn', label: 'Earn & Stake', icon: RiCoinsLine, href: '/earn' },
    { id: 'prism', label: 'PRISM Baskets', icon: RiStackLine, href: '/prism' },
  ];

  const secondaryNav = [
    { id: 'prediction', label: 'Prediction', icon: RiTargetLine, href: '/launchpad?type=prediction' },
    { id: 'portfolio', label: 'My Positions', icon: RiUser3Line, href: '/portfolio' },
    { id: 'docs', label: 'Docs', icon: RiBookOpenLine, href: '/docs' },
  ];

  return (
    <aside 
      className={`sidebar ${isCollapsed ? 'collapsed' : ''} fixed top-0 left-0 bottom-0 z-40 hidden lg:flex flex-col justify-between bg-[#0e1017] border-r border-white/[0.08] transition-all duration-300 ease-in-out select-none`}
      style={{ width: isCollapsed ? 76 : 260 }}
      aria-label="Main sidebar navigation"
    >
      <div className="flex flex-col flex-1 min-h-0 p-3.5 overflow-y-auto no-scrollbar">
        {/* Brand Header - Clicking Logo Toggles Sidebar */}
        {isCollapsed ? (
          <div className="mb-4 pt-1 flex justify-center">
            <button 
              type="button"
              onClick={onToggleCollapse}
              className="w-11 h-11 rounded-xl bg-[#13151f] border border-white/[0.08] hover:border-[#836ef9]/50 hover:bg-[#836ef9]/10 flex items-center justify-center group transition-all shadow-sm cursor-pointer"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <img 
                src="/brand/retropick.png" 
                alt="RetroPick Logo" 
                className="w-7 h-7 object-contain group-hover:scale-110 transition-transform" 
              />
            </button>
          </div>
        ) : (
          <div className="mb-5 px-1 pt-1">
            <button 
              type="button"
              onClick={onToggleCollapse}
              className="w-full flex items-center gap-2.5 overflow-hidden text-left bg-transparent border-none p-1.5 -m-1.5 rounded-xl hover:bg-white/[0.04] group transition-colors cursor-pointer"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <img 
                src="/brand/retropick.png" 
                alt="RetroPick Logo" 
                className="w-8 h-8 rounded-xl object-contain shrink-0 group-hover:scale-105 transition-transform" 
              />
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-sm tracking-tight text-white font-mono leading-none group-hover:text-[#a78bfa] transition-colors">
                  RetroPick
                </span>
                <span className="text-[10px] text-emerald-400 font-mono tracking-wider mt-0.5 uppercase font-semibold">
                  Protocol V2
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Global Quick Search Trigger Button */}
        <div className="mb-4">
          <button
            onClick={onOpenSearch}
            className={`w-full flex items-center gap-2.5 rounded-xl bg-[#13151f] border border-white/[0.08] hover:border-[#836ef9]/50 text-xs text-slate-400 hover:text-white transition-all cursor-pointer group ${
              isCollapsed ? 'w-11 h-10 mx-auto justify-center px-0' : 'px-3 py-2'
            }`}
            aria-label="Search markets and tokens"
            title="Search (⌘K)"
          >
            <FiSearch className="w-4 h-4 text-[#836ef9] group-hover:scale-110 transition-transform shrink-0" />
            {!isCollapsed && (
              <>
                <span className="text-slate-400 group-hover:text-slate-200 truncate font-sans text-xs">Search markets...</span>
                <kbd className="ml-auto text-[10px] bg-[#836ef9]/15 text-[#836ef9] px-1.5 py-0.5 rounded border border-[#836ef9]/30 font-mono shrink-0">
                  ⌘K
                </kbd>
              </>
            )}
          </button>
        </div>

        {/* Nav Group 1: Platform Core */}
        <div className="space-y-1 mb-5">
          {!isCollapsed && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 block mb-1.5 font-sans">
              Platform
            </span>
          )}
          <nav className="space-y-1" aria-label="Primary navigation">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const active = isRouteActive(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl text-xs font-medium transition-all group ${
                    isCollapsed 
                      ? 'w-11 h-11 mx-auto justify-center' 
                      : 'px-3.5 py-2.5'
                  } ${
                    active
                      ? 'bg-[#836ef9]/20 text-white font-bold border border-[#836ef9]/50 shadow-[0_0_20px_rgba(131,110,249,0.25)]'
                      : 'text-slate-400 hover:text-white hover:bg-[#836ef9]/10 hover:border-[#836ef9]/20 border border-transparent'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-[#836ef9]' : 'text-slate-500 group-hover:text-[#a78bfa]'}`} />
                  {!isCollapsed && (
                    <>
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-[9.5px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-semibold">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Nav Group 2: Markets & Tools */}
        <div className="space-y-1 mb-5">
          {!isCollapsed && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 block mb-1.5 font-sans">
              Markets &amp; Tools
            </span>
          )}
          <nav className="space-y-1" aria-label="Secondary navigation">
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              const active = isRouteActive(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl text-xs font-medium transition-all group ${
                    isCollapsed 
                      ? 'w-11 h-11 mx-auto justify-center' 
                      : 'px-3.5 py-2.5'
                  } ${
                    active
                      ? 'bg-[#836ef9]/20 text-white font-bold border border-[#836ef9]/50 shadow-[0_0_20px_rgba(131,110,249,0.25)]'
                      : 'text-slate-400 hover:text-white hover:bg-[#836ef9]/10 hover:border-[#836ef9]/20 border border-transparent'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-[#836ef9]' : 'text-slate-500 group-hover:text-[#a78bfa]'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Launch Token Action CTA - Squircle blunt rounded corners, no outer border */}
        <div className="mt-auto pt-2">
          <Link 
            href="/launchpad/create" 
            className={`flex items-center justify-center gap-2 bg-gradient-to-r from-[#836ef9] to-[#6d28d9] hover:from-[#9583fc] hover:to-[#7c3aed] text-white font-bold shadow-[0_0_25px_rgba(131,110,249,0.45)] hover:shadow-[0_0_35px_rgba(131,110,249,0.65)] transition-all cursor-pointer ${
              isCollapsed 
                ? 'w-11 h-11 mx-auto rounded-xl' 
                : 'w-full py-2.5 px-4 rounded-xl text-xs font-sans'
            }`}
            title="Launch a new token"
          >
            <FiPlus className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} stroke-[2.5] shrink-0 text-white`} />
            {!isCollapsed && <span>Launch Token</span>}
          </Link>
        </div>
      </div>

      {/* Sidebar Footer: Theme and Docs actions */}
      <div className="p-3 border-t border-white/[0.08] bg-[#0b0d14] flex items-center justify-between gap-1">
        <button 
          className={`flex items-center gap-2 flex-1 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#836ef9]/10 transition-colors text-xs font-mono cursor-pointer ${
            isCollapsed ? 'justify-center' : ''
          }`}
          onClick={toggleTheme} 
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} 
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <FiSun className="w-4 h-4 shrink-0 text-amber-400"/> : <FiMoon className="w-4 h-4 shrink-0 text-[#836ef9]"/>}
          {!isCollapsed && <span className="text-[11px] text-slate-400">Theme</span>}
        </button>

        <Link 
          href="/docs" 
          className={`flex items-center gap-1.5 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#836ef9]/10 transition-colors text-xs font-mono ${
            isCollapsed ? 'hidden' : ''
          }`}
          title="Protocol Documentation"
        >
          <span className="text-[11px]">Docs</span>
          <FiExternalLink className="w-3 h-3 text-[#836ef9]" />
        </Link>
      </div>
    </aside>
  );
}
