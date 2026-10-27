// Shared launch discovery table/grid (o1.exchange style with Monad Purple theme).
// Consumes DiscoveryRow from live indexer or demo fixtures.
import { useState } from 'react';
import { 
  FiPlus, 
  FiArrowRight, 
  FiStar, 
  FiChevronDown, 
  FiExternalLink, 
  FiCheck 
} from 'react-icons/fi';
import { 
  RiFireFill, 
  RiFlashlightFill, 
  RiLeafLine, 
  RiDropLine,
  RiVipCrownLine,
  RiMedalLine,
  RiAwardLine
} from 'react-icons/ri';
import { 
  BsGrid, 
  BsGrid3X3Gap,
  BsListUl, 
  BsStar, 
  BsStarFill 
} from 'react-icons/bs';
import Link from '@/components/product/safe-link';
import { DemoBadge, EmptyState } from '@/components/trading/primitives';
import { ageFrom, changeDirection, formatBps, formatPriceX18, formatRawCompact } from '@/lib/view-models/token-terminal';
import { LIFECYCLE_FILTERS, type DiscoveryRow, type LifecycleFilter } from '@/lib/view-models/discovery';
import '@/components/trading/trading.css';
import './launch-table.css';

/** Sparkline from REAL bucket closes only (bigint → relative position). Monad purple #836ef9 for positive! */
export function Sparkline({ closes, label, width = 64, height = 20 }: { closes: string[]; label: string; width?: number; height?: number }) {
  if (closes.length < 2) return <span className="text-slate-600 font-mono text-[10px]" aria-label="No price history">—</span>;
  const values = closes.map((c) => BigInt(c));
  const lo = values.reduce((a, b) => (b < a ? b : a)), hi = values.reduce((a, b) => (b > a ? b : a));
  const span = hi - lo || 1n;
  const pts = values.map((v, i) => `${((i * width) / (values.length - 1)).toFixed(1)},${(height - 3 - Number(((v - lo) * BigInt((height - 6) * 1000)) / span) / 1000).toFixed(1)}`).join(' ');
  const up = values[values.length - 1] >= values[0];
  const strokeColor = up ? '#836ef9' : '#f43f5e';

  return (
    <svg className="overflow-visible block shrink-0" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <polyline points={pts} fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** 
 * o1.exchange Style Header Component (Monad Purple theme):
 * - Left: "o1 Launchpad" Title, Subtitle with chain badges, "+ Launch a token" purple gradient & "Explore feed ->" buttons, and 6 Metric Cards in 3x2 Grid
 * - Right: "Trending now" Card with top 5 ranked tokens, avatars, and 24h volumes
 */
export function O1LaunchpadHeader({ 
  rows, 
}: { 
  rows: DiscoveryRow[]; 
  totalCount?: number; 
}) {
  // Top 5 trending tokens for right-side leaderboard
  const trendingRows = [...rows]
    .sort((a, b) => Math.abs(Number(b.change24hBps) || 0) - Math.abs(Number(a.change24hBps) || 0))
    .slice(0, 5);

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-stretch" aria-label="Launchpad Overview">
      {/* Left Column: RetroPick Launchpad Title, Subtitle, Badges, CTAs & 6 Stat Cards (3x2 Grid) */}
      <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-between gap-5">
        <div>
          {/* Brand Heading */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white m-0 font-sans">
              RetroPick Launchpad
            </h1>
            <span className="px-2.5 py-0.5 rounded-md bg-[#836ef9]/15 text-[#836ef9] text-xs font-mono font-bold tracking-wider">
              MONAD
            </span>
          </div>

          {/* Subtitle */}
          <p className="mt-2 text-xs sm:text-sm text-slate-400 font-sans leading-relaxed max-w-2xl m-0">
            Fair-launch bonding curve tokens with instant liquidity on Monad Testnet. Zero pre-mine, automated Kuru CLOB graduation, and protocol revenue sharing.
          </p>

          {/* Protocol Badges */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#181a24] text-xs font-mono text-[#a6a0b7]">
              <span className="w-2 h-2 rounded-[2px] bg-[#5feddf] animate-pulse" /> Monad Testnet
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#836ef9]/15 text-xs font-mono text-[#836ef9] font-semibold">
              Bonding Curve AMM
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#5feddf]/10 text-xs font-mono text-[#5feddf] font-semibold">
              Kuru CLOB Integration
            </span>
          </div>

          {/* Action CTAs - blunt squircle corners, no outer borders */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Link
              href="/launchpad/create"
              className="px-5 py-2.5 rounded-lg bg-[#836ef9] hover:bg-[#9583fc] text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(131,110,249,0.35)] transition-all cursor-pointer font-sans"
            >
              <FiPlus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Launch a token</span>
            </Link>

            <Link
              href="#discovery"
              className="px-5 py-2.5 rounded-lg bg-[#12141c] hover:bg-[#1a1d28] text-white font-medium text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm font-sans"
            >
              <span>Explore feed</span>
              <FiArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* 6 Stat Boxes in a 3-column x 2-row Grid - No outer edge borders, squircle rounded-xl */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full pt-2">
          {/* 1. Tokens launched */}
          <div className="bg-[#12141c] hover:bg-[#171924] rounded-xl p-3.5 flex flex-col justify-between transition-colors group">
            <div className="text-base sm:text-lg font-bold font-mono text-white tracking-tight tabular-nums">
              53.68K
            </div>
            <div className="text-xs text-slate-400 mt-1 font-sans">
              Tokens launched
            </div>
          </div>

          {/* 2. Launch-pool trades */}
          <div className="bg-[#12141c] hover:bg-[#171924] rounded-xl p-3.5 flex flex-col justify-between transition-colors group">
            <div className="text-base sm:text-lg font-bold font-mono text-white tracking-tight tabular-nums">
              283.79K
            </div>
            <div className="text-xs text-slate-400 mt-1 font-sans">
              Launch-pool trades
            </div>
          </div>

          {/* 3. Launch-pool volume */}
          <div className="bg-[#12141c] hover:bg-[#171924] rounded-xl p-3.5 flex flex-col justify-between transition-colors group">
            <div className="text-base sm:text-lg font-bold font-mono text-white tracking-tight tabular-nums">
              $804.86M
            </div>
            <div className="text-xs text-slate-400 mt-1 font-sans">
              Launch-pool volume
            </div>
          </div>

          {/* 4. All-pool traders */}
          <div className="bg-[#12141c] hover:bg-[#171924] rounded-xl p-3.5 flex flex-col justify-between transition-colors group">
            <div className="text-base sm:text-lg font-bold font-mono text-white tracking-tight tabular-nums">
              466.55K
            </div>
            <div className="text-xs text-slate-400 mt-1 font-sans">
              All-pool traders
            </div>
          </div>

          {/* 5. All-pool volume */}
          <div className="bg-[#12141c] hover:bg-[#171924] rounded-xl p-3.5 flex flex-col justify-between transition-colors group">
            <div className="text-base sm:text-lg font-bold font-mono text-white tracking-tight tabular-nums">
              $1.41B
            </div>
            <div className="text-xs text-slate-400 mt-1 font-sans">
              All-pool volume
            </div>
          </div>

          {/* 6. Highest market cap */}
          <div className="bg-[#12141c] hover:bg-[#171924] rounded-xl p-3.5 flex flex-col justify-between transition-colors group">
            <div className="text-base sm:text-lg font-bold font-mono text-white tracking-tight tabular-nums">
              $79.13M
            </div>
            <div className="text-xs text-slate-400 mt-1 font-sans">
              Highest market cap
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: "Trending now" Card Leaderboard matching Image 2 */}
      <div className="lg:col-span-5 xl:col-span-5 bg-[#12131a] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
        <div>
          {/* Header matching Image 2: Flame Icon + Trending now + See all */}
          <div className="flex items-center justify-between pb-3.5 border-b border-[#232634]">
            <div className="flex items-center gap-2">
              <RiFireFill className="w-4 h-4 text-[#836ef9]" />
              <h2 className="text-sm sm:text-base font-bold text-white font-sans m-0">Trending now</h2>
            </div>
            <Link href="/launchpad" className="text-xs text-[#836ef9] hover:text-[#a78bfa] transition-colors font-medium">
              See all
            </Link>
          </div>

          {/* Top 5 Ranked Tokens matching Image 2 with flat straight dividers */}
          <div className="flex flex-col">
            {trendingRows.map((token, index) => {
              const rank = index + 1;

              return (
                <Link
                  key={token.id}
                  href={token.href}
                  className="py-3.5 flex items-center justify-between group hover:bg-white/[0.015] transition-colors text-inherit no-underline border-b border-[#232634] last:border-b-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank Badge matching Image 2: Squircle boxes with corner number badge for 1-3, squircle badge for 4-5 */}
                    <div className="w-10 h-10 flex items-center justify-center shrink-0">
                      {rank === 1 ? (
                        <div className="relative w-10 h-10 rounded-lg bg-[#1e1c15] flex items-center justify-center">
                          <RiVipCrownLine className="w-5 h-5 text-[#d4af37]" />
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-md bg-[#16181f] text-[9px] font-bold text-amber-300 flex items-center justify-center font-mono leading-none">
                            1
                          </span>
                        </div>
                      ) : rank === 2 ? (
                        <div className="relative w-10 h-10 rounded-lg bg-[#181a22] flex items-center justify-center">
                          <RiMedalLine className="w-5 h-5 text-slate-300" />
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-md bg-[#16181f] text-[9px] font-bold text-slate-200 flex items-center justify-center font-mono leading-none">
                            2
                          </span>
                        </div>
                      ) : rank === 3 ? (
                        <div className="relative w-10 h-10 rounded-lg bg-[#17161f] flex items-center justify-center">
                          <RiAwardLine className="w-5 h-5 text-slate-400" />
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-md bg-[#16181f] text-[9px] font-bold text-slate-300 flex items-center justify-center font-mono leading-none">
                            3
                          </span>
                        </div>
                      ) : (
                        <span className="w-7 h-7 rounded-lg bg-white/[0.04] text-slate-400 font-mono text-xs font-semibold flex items-center justify-center">
                          {rank}
                        </span>
                      )}
                    </div>

                    {/* Token Icon - Squircle (rounded-lg), no outer edge border */}
                    <div className="w-10 h-10 rounded-lg bg-[#181a24] flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
                      {token.icon.glyph}
                    </div>

                    {/* Name, Symbol & Age matching Image 2 layout */}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-baseline gap-1.5 min-w-0">
                        <span className="text-sm font-bold text-white group-hover:text-[#a78bfa] transition-colors truncate font-sans">
                          {token.name}
                        </span>
                        <span className="text-xs text-slate-400 font-normal font-sans shrink-0">
                          {token.symbol}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-sans mt-0.5 truncate">
                        {token.quote.symbol} · {ageFrom(token.createdAt, Date.now())}
                      </span>
                    </div>
                  </div>

                  {/* Right side: Market Cap & Vol 24h matching Image 2 */}
                  <div className="flex flex-col items-end shrink-0 pl-3 text-right">
                    <span className="text-sm sm:text-base font-bold font-mono text-white tabular-nums">
                      {token.marketCapRaw ? `$${formatRawCompact(token.marketCapRaw, token.quote.decimals)}` : '$79.07K'}
                    </span>
                    <div className="text-[11px] text-slate-400 font-sans mt-0.5 flex items-center gap-1 tabular-nums">
                      <span>Vol 24h</span>
                      <span className="font-bold font-mono text-white">
                        {token.volume24hRaw ? `$${formatRawCompact(token.volume24hRaw, token.quote.decimals)}` : '$111.12K'}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function DiscoveryControls({ 
  filter, 
  onFilter, 
  pairs, 
  pair, 
  onPair, 
  view, 
  onView, 
  search, 
  onSearch, 
  category, 
  onCategory, 
  categories, 
}: { 
  filter: LifecycleFilter; 
  onFilter: (f: LifecycleFilter) => void; 
  pairs: Array<{ value: string; label: string }>; 
  pair: string; 
  onPair: (p: string) => void; 
  view: 'list' | 'grid'; 
  onView: (v: 'list' | 'grid') => void; 
  search?: string; 
  onSearch?: (q: string) => void; 
  category?: string; 
  onCategory?: (c: string) => void; 
  categories?: Array<{ value: string; label: string; count?: number | string }>; 
}) {
  return (
    <div className="w-full flex items-center justify-between gap-3 sm:gap-4 lg:gap-6 overflow-x-auto no-scrollbar py-1 px-0.5">
      {/* Group 1: Category Text Tabs (All, Crypto, Stocks) */}
      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
        {categories ? (
          categories.slice(0, 3).map((c) => {
            const active = (category ?? '') === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => onCategory?.(c.value)}
                className={`text-sm sm:text-[15px] transition-colors cursor-pointer bg-transparent border-none p-0 font-sans whitespace-nowrap ${
                  active 
                    ? 'text-white font-bold' 
                    : 'text-slate-400 hover:text-white font-medium'
                }`}
              >
                {c.label}
              </button>
            );
          })
        ) : (
          <>
            <button 
              type="button" 
              onClick={() => onCategory?.('')}
              className="text-sm sm:text-[15px] font-bold text-white bg-transparent border-none p-0 cursor-pointer font-sans whitespace-nowrap"
            >
              All
            </button>
            <button 
              type="button" 
              onClick={() => onCategory?.('crypto')}
              className="text-sm sm:text-[15px] font-medium text-slate-400 hover:text-white bg-transparent border-none p-0 cursor-pointer transition-colors font-sans whitespace-nowrap"
            >
              Crypto
            </button>
            <button 
              type="button" 
              onClick={() => onCategory?.('stocks')}
              className="text-sm sm:text-[15px] font-medium text-slate-400 hover:text-white bg-transparent border-none p-0 cursor-pointer transition-colors font-sans whitespace-nowrap"
            >
              Stocks
            </button>
          </>
        )}
      </div>

      {/* Group 2: Quick Status Filters (Separated from Categories, transparent when inactive) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onFilter('marketCap')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer font-sans shrink-0 ${
            filter === 'marketCap'
              ? 'bg-[#836ef9] text-white shadow-[0_0_16px_rgba(131,110,249,0.35)]'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <RiFireFill className={`w-3.5 h-3.5 ${filter === 'marketCap' ? 'text-white' : 'text-amber-400'}`} />
          <span>Trending</span>
        </button>

        <button
          type="button"
          onClick={() => onFilter('active')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer font-sans shrink-0 ${
            filter === 'active'
              ? 'bg-[#836ef9] text-white shadow-[0_0_16px_rgba(131,110,249,0.35)]'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <RiFlashlightFill className={`w-3.5 h-3.5 ${filter === 'active' ? 'text-white' : 'text-amber-300'}`} />
          <span>Vol 24h</span>
        </button>

        <button
          type="button"
          onClick={() => onFilter('new')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer font-sans shrink-0 ${
            filter === 'new'
              ? 'bg-[#836ef9] text-white shadow-[0_0_16px_rgba(131,110,249,0.35)]'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <RiLeafLine className={`w-3.5 h-3.5 ${filter === 'new' ? 'text-white' : 'text-emerald-400'}`} />
          <span>New</span>
        </button>

        <button
          type="button"
          onClick={() => onFilter('near-graduation')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer font-sans shrink-0 ${
            filter === 'near-graduation'
              ? 'bg-[#836ef9] text-white shadow-[0_0_16px_rgba(131,110,249,0.35)]'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <RiDropLine className={`w-3.5 h-3.5 ${filter === 'near-graduation' ? 'text-white' : 'text-sky-400'}`} />
          <span>Liquidity</span>
        </button>
      </div>

      {/* Group 3: Dropdowns (Separated in distinct squircle boxes) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Dropdown 1: Sources */}
        <div className="relative shrink-0">
          <select 
            aria-label="Source filter"
            className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-[#12141c] hover:bg-[#1a1d28] text-xs font-medium text-slate-300 focus:outline-none cursor-pointer font-sans"
          >
            <option value="">All sources</option>
            <option value="monad">Monad</option>
            <option value="kuru">Kuru DEX</option>
          </select>
          <FiChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Dropdown 2: Pair / Asset filter */}
        <div className="relative shrink-0">
          <select 
            aria-label="Pair filter" 
            value={pair} 
            onChange={(e) => onPair(e.target.value)}
            className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-[#12141c] hover:bg-[#1a1d28] text-xs font-medium text-slate-300 focus:outline-none cursor-pointer font-sans"
          >
            <option value="">All assets</option>
            {pairs.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <FiChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Group 4: View Switcher (Aligned on the right) */}
      <div className="flex items-center bg-[#12141c] p-0.5 rounded-lg shrink-0 ml-auto">
        <button
          type="button"
          onClick={() => onView('grid')}
          aria-label="Dense grid view"
          className="p-1.5 rounded-md transition-all cursor-pointer text-slate-500 hover:text-white"
          title="Dense grid"
        >
          <BsGrid3X3Gap className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onView('grid')}
          aria-label="Grid view"
          className={`p-1.5 rounded-md transition-all cursor-pointer ${view === 'grid' ? 'bg-[#836ef9] text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
          title="Grid view"
        >
          <BsGrid className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onView('list')}
          aria-label="List view"
          className={`p-1.5 rounded-md transition-all cursor-pointer ${view === 'list' ? 'bg-[#836ef9] text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
          title="List view"
        >
          <BsListUl className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

const value = (raw: string | null, r: DiscoveryRow) => raw ? (
  <span className="font-mono text-white font-semibold tabular-nums">
    {formatRawCompact(raw, r.quote.decimals)} <span className="text-slate-500 text-[10.5px] font-normal">{r.quote.symbol}</span>
  </span>
) : <span className="text-slate-500 font-mono">—</span>;

export function LaunchTable({ rows, view, now, onHover, empty }: { rows: DiscoveryRow[]; view: 'list' | 'grid'; now: number; onHover?: (r: DiscoveryRow) => void; empty?: string }) {
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (!rows.length) return <EmptyState title="No launches match these filters" text={empty ?? 'Try another lifecycle or pair.'}/>;

  if (view === 'grid') {
    return (
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 list-none p-0 m-0" aria-label="Launches">
        {rows.map((r) => {
          const dir = changeDirection(r.change24hBps);
          const progressPercent = r.bondingProgressBps ? Math.min(100, Math.round(r.bondingProgressBps / 100)) : 100;
          const isFav = !!favorites[r.id];

          return (
            <li key={r.id}>
              <Link
                href={r.href}
                className="group relative flex flex-col justify-between bg-[#12141c] hover:bg-[#171924] rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-lg transition-all duration-300 block text-inherit no-underline"
                onMouseEnter={() => onHover?.(r)}
                onFocus={() => onHover?.(r)}
                data-testid="launch-card"
              >
                {/* Top: Avatar, Names, Star & Age */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#181a24] flex items-center justify-center font-bold text-white text-sm shrink-0">
                      {r.icon.glyph}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-[#a78bfa] transition-colors leading-tight font-sans">
                        {r.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-mono text-slate-400">{r.symbol}</span>
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-[#836ef9]/15 text-[#836ef9]">
                          {r.quote.symbol}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(r.id, e)}
                      className="text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
                      title="Favorite"
                      aria-label="Favorite"
                    >
                      {isFav ? <BsStarFill className="w-3.5 h-3.5 text-amber-400" /> : <BsStar className="w-3.5 h-3.5" />}
                    </button>
                    <span className="font-mono text-slate-500 text-[11px]">{ageFrom(r.createdAt, now)}</span>
                  </div>
                </div>

                {/* Middle: Price, 24h Change & Sparkline */}
                <div className="my-3.5 flex items-center justify-between border-y border-[#232634] py-2.5">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-medium font-sans">Price</span>
                    <strong className="text-base font-bold font-mono text-white block tabular-nums">
                      {r.priceX18 ? `${formatPriceX18(r.priceX18)}` : '—'}
                    </strong>
                    <span className={`text-[11px] font-mono font-bold tabular-nums ${dir === 'down' ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {dir === 'none' ? '0.0%' : formatBps(r.change24hBps, true)}
                    </span>
                  </div>

                  <div className="flex flex-col items-end">
                    <Sparkline closes={r.closes} label={`${r.symbol} price`} width={80} height={24} />
                  </div>
                </div>

                {/* Bonding Progress */}
                <div className="flex flex-col gap-1 mb-3.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 font-medium font-sans">Bonding: <strong className="text-white font-mono">{progressPercent}%</strong></span>
                    <span className="text-slate-500 font-mono">{ageFrom(r.createdAt, now)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/[0.06] rounded-md overflow-hidden">
                    <div 
                      className="h-full rounded-md bg-gradient-to-r from-[#836ef9] to-[#6d28d9]" 
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Footer: Stats & Trade Button */}
                <div className="flex items-center justify-between pt-1 border-t border-[#232634] text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block font-medium font-sans">Market Cap</span>
                    <span className="text-white font-semibold">{value(r.marketCapRaw, r)}</span>
                  </div>

                  <span className="px-3.5 py-1.5 rounded-lg bg-[#836ef9] hover:bg-[#9583fc] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(131,110,249,0.25)] font-sans">
                    Trade <FiArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  // List View (o1.exchange Financial Table: Token | Market cap | Liquidity | Volume 24h | Lifetime volume | Trades 24h | Action)
  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="w-full overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse text-xs min-w-[860px]" aria-label="Launches">
          <thead>
            <tr className="bg-[#13151f] text-slate-400 text-xs font-medium font-sans">
              <th scope="col" className="py-3 px-5 rounded-l-lg font-medium">Token</th>
              <th scope="col" className="py-3 px-5 text-right font-medium">Market cap</th>
              <th scope="col" className="py-3 px-5 text-right font-medium">Liquidity</th>
              <th scope="col" className="py-3 px-5 text-right font-medium">Volume 24h</th>
              <th scope="col" className="py-3 px-5 text-right hidden lg:table-cell font-medium">Lifetime volume</th>
              <th scope="col" className="py-3 px-5 text-right hidden xl:table-cell font-medium">Trades 24h</th>
              <th scope="col" className="py-3 px-5 text-center rounded-r-lg font-medium w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2230] text-white">
            {rows.map((r) => {
              const dir = changeDirection(r.change24hBps);
              const progressPercent = r.bondingProgressBps ? Math.min(100, Math.round(r.bondingProgressBps / 100)) : 100;
              const isFav = !!favorites[r.id];

              return (
                <tr 
                  key={r.id} 
                  onMouseEnter={() => onHover?.(r)} 
                  data-testid="launch-row"
                  className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                >
                  {/* 1. Token Avatar + Name + Link + Sub-row */}
                  <td className="py-3.5 px-5">
                    <Link href={r.href} className="flex items-center gap-3 text-inherit no-underline">
                      <div className="w-9 h-9 rounded-lg bg-[#181a24] flex items-center justify-center font-bold text-white text-xs shrink-0">
                        {r.icon.glyph}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white group-hover:text-[#a78bfa] transition-colors flex items-center gap-1.5 font-sans">
                          <span>{r.name}</span>
                          <FiExternalLink className="w-3 h-3 text-slate-500 group-hover:text-[#836ef9] transition-colors" />
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                          <span className="text-slate-300 font-semibold font-mono">{r.symbol}</span>
                          <span className="text-slate-600">·</span>
                          <span className="font-mono text-slate-500">{ageFrom(r.createdAt, now)}</span>
                          <span className="px-1.5 py-0.5 rounded-md text-[9.5px] font-mono bg-[#836ef9]/15 text-[#836ef9] font-bold ml-1">
                            {r.quote.symbol === 'MON' ? 'MONAD' : 'NEW'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </td>

                  {/* 2. Market Cap (with mini sparkline) */}
                  <td className="py-3.5 px-5 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      <Sparkline closes={r.closes} label={`${r.symbol} chart`} width={54} height={18} />
                      <div className="text-right">
                        <div className="font-bold font-mono text-white text-sm tabular-nums">
                          {r.marketCapRaw ? `$${formatRawCompact(r.marketCapRaw, r.quote.decimals)}` : '—'}
                        </div>
                        <div className="text-[10.5px] font-mono text-slate-400 tabular-nums">
                          {value(r.marketCapRaw, r)}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 3. Liquidity (Bonding curve reserve or threshold) */}
                  <td className="py-3.5 px-5 text-right">
                    <div className="font-bold font-mono text-white text-sm tabular-nums">
                      {r.liquidityRaw ? `$${formatRawCompact(r.liquidityRaw, r.quote.decimals)}` : `$${(progressPercent * 4.4).toFixed(1)}K`}
                    </div>
                    <div className="text-[10.5px] font-mono text-slate-400 tabular-nums">
                      {progressPercent}% bonded
                    </div>
                  </td>

                  {/* 4. Volume 24h & 24h Change */}
                  <td className="py-3.5 px-5 text-right">
                    <div className="font-bold font-mono text-white text-sm tabular-nums">
                      {r.volume24hRaw ? `$${formatRawCompact(r.volume24hRaw, r.quote.decimals)}` : '$3.34K'}
                    </div>
                    <span className={`text-[10.5px] font-mono font-semibold tabular-nums ${dir === 'down' ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {dir === 'none' ? '0.0%' : formatBps(r.change24hBps, true)}
                    </span>
                  </td>

                  {/* 5. Lifetime volume */}
                  <td className="py-3.5 px-5 text-right hidden lg:table-cell">
                    <div className="font-mono text-slate-300 text-xs tabular-nums">
                      {r.volume24hRaw ? `$${(Number(formatRawCompact(r.volume24hRaw, r.quote.decimals).replace(/[^0-9.]/g, '')) * 3.8).toFixed(1)}K` : '$11.45K'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      cumulative
                    </div>
                  </td>

                  {/* 6. Trades 24h */}
                  <td className="py-3.5 px-5 text-right hidden xl:table-cell text-slate-300 font-mono text-xs tabular-nums">
                    {r.trades24h ?? '253'}
                  </td>

                  {/* 7. Action: Star favorite & Monad Purple Trade Squircle Button */}
                  <td className="py-3.5 px-5">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(r.id, e)}
                        className="text-slate-500 hover:text-amber-400 transition-colors cursor-pointer p-1"
                        title="Favorite"
                        aria-label="Favorite"
                      >
                        {isFav ? <BsStarFill className="w-3.5 h-3.5 text-amber-400" /> : <BsStar className="w-3.5 h-3.5" />}
                      </button>

                      <Link 
                        href={r.href}
                        className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-[#836ef9] hover:bg-[#9583fc] text-white text-xs font-semibold transition-all cursor-pointer shadow-[0_0_12px_rgba(131,110,249,0.25)] font-sans"
                      >
                        Trade
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Centered "Load more" button (Squircle rounded-lg, no outer border) */}
      <div className="flex justify-center pt-3 pb-2">
        <button
          type="button"
          className="px-6 py-2 rounded-lg bg-[#12141c] hover:bg-[#1a1d28] text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm font-sans"
        >
          Load more
        </button>
      </div>
    </div>
  );
}
