'use client';

import Link from '@/components/product/safe-link';
import { usePathname } from '@/lib/next-compat';
import { useDemo } from '@/components/product/provider';
import { useWallet } from '@/wallet/provider';
import { DATA_MODE } from '@/lib/live/env';
import { toggleTheme, useTheme } from '@/lib/theme';
import { 
  FiSearch, 
  FiSun, 
  FiMoon, 
  FiChevronRight,
  FiPlus
} from 'react-icons/fi';
import { 
  RiRocketLine, 
  RiWallet3Line 
} from 'react-icons/ri';

interface TopNavbarProps {
  onOpenSearch: () => void;
  onToggleMobileNav?: () => void;
}

export function TopNavbar({ onOpenSearch, onToggleMobileNav }: TopNavbarProps) {
  const pathname = usePathname();
  const theme = useTheme();
  const demo = useDemo();
  const wallet = useWallet();
  const live = DATA_MODE === 'live';

  const walletLabel = !live 
    ? (demo.connected ? '0x71C...39a' : 'Connect wallet')
    : (wallet.status === 'connected' ? `${wallet.account?.slice(0, 6)}…${wallet.account?.slice(-4)}`
    : wallet.status === 'wrong-chain' ? 'Wrong chain'
    : wallet.status === 'connecting' ? 'Connecting…'
    : 'Connect wallet');

  const handleWalletClick = () => {
    if (!live) {
      demo.setConnected(!demo.connected);
    } else {
      if (wallet.status === 'disconnected') void wallet.connect();
      else if (wallet.status === 'wrong-chain') void wallet.switchChain();
      else wallet.disconnect();
    }
  };

  const getPageTitle = () => {
    if (pathname.includes('/launchpad/create')) return 'Create Launch';
    if (pathname.includes('/launchpad/prediction')) return 'Prediction Market';
    if (pathname.includes('/launchpad/token')) return 'Token Details';
    if (pathname.startsWith('/liquidity')) return 'Liquidity & AMM';
    if (pathname.startsWith('/earn')) return 'Earn & Staking';
    if (pathname.startsWith('/prism')) return 'PRISM Baskets';
    if (pathname.startsWith('/portfolio')) return 'My Portfolio';
    if (pathname.startsWith('/docs')) return 'Documentation';
    return 'Launchpad Discovery';
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/[0.08] bg-[#090a10]/90 backdrop-blur-md">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Trigger + Breadcrumb / Page Title */}
        <div className="flex items-center gap-3">
          {/* Mobile brand / menu button on screens < 1024px */}
          <div className="lg:hidden flex items-center gap-2">
            <Link href="/launchpad" className="flex items-center gap-2">
              <img src="/brand/retropick.png" alt="RetroPick" className="w-7 h-7 object-contain" />
              <span className="font-bold text-sm text-white font-mono">RetroPick</span>
            </Link>
          </div>

          {/* Desktop Breadcrumb Context */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
            <span className="text-slate-500">Platform</span>
            <FiChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-white font-semibold flex items-center gap-1.5">
              <RiRocketLine className="w-3.5 h-3.5 text-[#836ef9]" />
              {getPageTitle()}
            </span>
          </div>
        </div>

        {/* Center: Quick Search Bar on Desktop */}
        <div className="hidden lg:flex items-center flex-1 max-w-[260px] xl:max-w-xs mx-3 min-w-0">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between h-8 px-3 rounded-lg bg-[#11131c] hover:bg-[#161824] text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer group min-w-0 overflow-hidden"
            aria-label="Search tokens and markets"
            title="Search (⌘K)"
          >
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              <FiSearch className="w-3.5 h-3.5 text-[#836ef9] group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-slate-400 group-hover:text-slate-200 truncate whitespace-nowrap text-xs">Search markets...</span>
            </div>
            <kbd className="text-[10px] bg-[#836ef9]/15 text-[#836ef9] px-1.5 py-0.5 rounded border border-[#836ef9]/30 font-mono shrink-0 ml-1.5">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Network status, Quick Launch, Wallet & Theme */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Monad Testnet status */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#13151f] text-xs font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Monad Testnet</span>
          </div>

          {/* Quick Launch CTA Button (Monad Purple) */}
          <Link
            href="/launchpad/create"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#836ef9] to-[#6d28d9] hover:from-[#9583fc] hover:to-[#7c3aed] text-white font-bold text-xs shadow-[0_0_15px_rgba(131,110,249,0.35)] transition-all cursor-pointer font-sans"
          >
            <FiPlus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Launch</span>
          </Link>

          {/* Search Trigger for Mobile & Tablet */}
          <button
            onClick={onOpenSearch}
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-[#13151f] text-slate-300 hover:text-white cursor-pointer"
            aria-label="Search"
            title="Search"
          >
            <FiSearch className="w-3.5 h-3.5 text-[#836ef9]" />
          </button>

          {/* Wallet Button */}
          <button
            onClick={handleWalletClick}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
              (!live && demo.connected) || (live && wallet.status === 'connected')
                ? 'bg-emerald-500/15 text-emerald-400 font-mono font-bold'
                : 'bg-[#13151f] hover:bg-[#1a1c28] text-white font-sans'
            }`}
            aria-label={walletLabel}
          >
            <RiWallet3Line className={`w-3.5 h-3.5 ${(!live && demo.connected) || (live && wallet.status === 'connected') ? 'text-emerald-400' : 'text-[#836ef9]'}`} />
            <span className="inline">{walletLabel}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#13151f] hover:bg-[#1a1c28] text-slate-400 hover:text-white transition-all cursor-pointer"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? <FiSun className="w-3.5 h-3.5 text-amber-400" /> : <FiMoon className="w-3.5 h-3.5 text-[#836ef9]" />}
          </button>
        </div>
      </div>
    </header>
  );
}
