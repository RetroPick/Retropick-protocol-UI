'use client';

import React, { useState } from 'react';
import { FiShare2, FiEdit3, FiCheck } from 'react-icons/fi';
import { toast } from 'sonner';

interface EarnPerformanceViewProps {
  isPopulated: boolean;
}

export function EarnPerformanceView({ isPopulated }: EarnPerformanceViewProps) {
  const [timeframe, setTimeframe] = useState<'All' | '30d' | '7d'>('7d');

  const netWorth = isPopulated ? 5550.20 : 0;
  const volume = isPopulated ? 24820 : 0;
  const profit = isPopulated ? 3412.50 : 0;
  const rank = isPopulated ? '#1,482' : '--';

  const chartPointsMap = {
    '7d': [
      { date: 'Oct 14', val: netWorth * 0.88 },
      { date: 'Oct 15', val: netWorth * 0.91 },
      { date: 'Oct 16', val: netWorth * 0.89 },
      { date: 'Oct 17', val: netWorth * 0.94 },
      { date: 'Oct 18', val: netWorth * 0.96 },
      { date: 'Oct 19', val: netWorth * 0.98 },
      { date: 'Oct 20', val: netWorth },
    ],
    '30d': [
      { date: 'Sep 20', val: netWorth * 0.65 },
      { date: 'Sep 27', val: netWorth * 0.72 },
      { date: 'Oct 04', val: netWorth * 0.81 },
      { date: 'Oct 11', val: netWorth * 0.87 },
      { date: 'Oct 18', val: netWorth * 0.96 },
      { date: 'Oct 20', val: netWorth },
    ],
    'All': [
      { date: 'Jul 26', val: netWorth * 0.30 },
      { date: 'Aug 26', val: netWorth * 0.55 },
      { date: 'Sep 26', val: netWorth * 0.78 },
      { date: 'Oct 20', val: netWorth },
    ],
  };

  const points = chartPointsMap[timeframe];
  const minVal = Math.min(...points.map(p => p.val), 0);
  const maxVal = Math.max(...points.map(p => p.val), netWorth > 0 ? netWorth * 1.1 : 100);

  const svgWidth = 600;
  const svgHeight = 160;
  const paddingX = 20;
  const paddingY = 20;

  const coords = points.map((p, index) => {
    const x = paddingX + (index / (points.length - 1 || 1)) * (svgWidth - paddingX * 2);
    const y = svgHeight - paddingY - ((p.val - minVal) / (maxVal - minVal || 1)) * (svgHeight - paddingY * 2);
    return { x, y, ...p };
  });

  const pathD = coords.reduce((acc, curr, index) => `${acc} ${index === 0 ? 'M' : 'L'} ${curr.x} ${curr.y}`, '');
  const areaD = `${pathD} L ${coords[coords.length - 1]?.x || 0} ${svgHeight} L ${coords[0]?.x || 0} ${svgHeight} Z`;

  const categories = [
    { name: 'Monad Native & Meme', value: isPopulated ? 2300 : 0, color: '#836ef9', pct: 41 },
    { name: 'DeFi & Vaults', value: isPopulated ? 1539 : 0, color: '#5feddf', pct: 28 },
    { name: 'BTC & Wrapped Assets', value: isPopulated ? 1289 : 0, color: '#c084fc', pct: 23 },
    { name: 'Stablecoins', value: isPopulated ? 420 : 0, color: '#38bdf8', pct: 8 },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: User Profile + Category Distribution */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* User Profile Card */}
          <div className="bg-[#12141c] border-none rounded-xl p-5 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#836ef9] to-[#5feddf] p-0.5 shadow-md shrink-0">
                <div className="w-full h-full rounded-[10px] bg-[#12141c] flex items-center justify-center text-lg font-bold text-white">
                  ◈
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white tracking-tight truncate">
                    RetroTrader_093
                  </span>
                  <button
                    onClick={() => toast.info('Edit Profile opened')}
                    className="p-1 text-[#615a78] hover:text-white rounded-md transition-colors cursor-pointer border-none bg-transparent"
                  >
                    <FiEdit3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#181a24] border-none rounded-md text-xs text-[#a6a0b7]">
                    <span className="font-mono text-[#836ef9]">@User_093cDF</span>
                    <FiCheck className="w-3 h-3 text-[#5feddf]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-[#1e2230] text-center">
              <div>
                <span className="text-[10px] font-mono text-[#615a78] uppercase">Following</span>
                <div className="text-sm font-bold font-mono text-white">12</div>
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#615a78] uppercase">Followers</span>
                <div className="text-sm font-bold font-mono text-white">348</div>
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#615a78] uppercase">Pnl Rank</span>
                <div className="text-sm font-bold font-mono text-[#5feddf]">{rank}</div>
              </div>
            </div>
          </div>

          {/* Category Distribution Card */}
          <div className="bg-[#12141c] border-none rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between">
            <h3 className="text-base font-semibold text-white">Category Distribution</h3>
            
            <div className="flex items-center gap-6 mt-4">
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg width="112" height="112" className="transform -rotate-90">
                  <circle cx="56" cy="56" r="44" fill="transparent" stroke="#181a24" strokeWidth="12" />
                  {isPopulated && (
                    <>
                      <circle cx="56" cy="56" r="44" fill="transparent" stroke="#836ef9" strokeWidth="12" strokeDasharray="113 276" strokeDashoffset="0" />
                      <circle cx="56" cy="56" r="44" fill="transparent" stroke="#5feddf" strokeWidth="12" strokeDasharray="77 276" strokeDashoffset="-113" />
                      <circle cx="56" cy="56" r="44" fill="transparent" stroke="#c084fc" strokeWidth="12" strokeDasharray="63 276" strokeDashoffset="-190" />
                      <circle cx="56" cy="56" r="44" fill="transparent" stroke="#38bdf8" strokeWidth="12" strokeDasharray="23 276" strokeDashoffset="-253" />
                    </>
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-bold font-mono text-white">{isPopulated ? '100%' : '0%'}</span>
                  <span className="text-[9px] text-[#615a78] uppercase font-mono">Portfolio</span>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-2">
                {categories.map(c => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="text-[#a6a0b7]">{c.name}</span>
                    </div>
                    <span className="font-mono font-bold text-white ml-2">{isPopulated ? `${c.pct}%` : '0%'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (8 cols): Net Worth History Chart */}
        <div className="lg:col-span-8 bg-[#12141c] border-none rounded-xl p-6 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-mono uppercase text-[#a6a0b7]">Portfolio Net Worth</span>
                <div className="text-3xl font-extrabold font-mono text-white mt-1">
                  ${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-[#0e1017] p-1 rounded-lg border-none">
                  {(['All', '30d', '7d'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTimeframe(t)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all border-none ${
                        timeframe === t ? 'bg-[#836ef9] text-white shadow-sm' : 'bg-transparent text-[#a6a0b7] hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => toast.success('Performance card link copied')}
                  className="w-8 h-8 rounded-lg bg-[#836ef9]/15 hover:bg-[#836ef9]/30 border-none text-[#836ef9] flex items-center justify-center cursor-pointer transition-all"
                  title="Share Performance"
                >
                  <FiShare2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chips bar */}
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <div className="px-3 py-1 rounded-md bg-[#181a24] border-none text-xs font-mono text-[#a6a0b7]">
                Volume: <strong className="text-white">${volume.toLocaleString()}</strong>
              </div>
              <div className="px-3 py-1 rounded-md bg-[#181a24] border-none text-xs font-mono text-[#a6a0b7]">
                Profit: <strong className={profit >= 0 ? 'text-[#5feddf]' : 'text-[#ff8fa3]'}>{profit >= 0 ? `+$${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `-$${Math.abs(profit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</strong>
              </div>
              <div className="px-3 py-1 rounded-md bg-[#181a24] border-none text-xs font-mono text-[#a6a0b7]">
                Global Rank: <strong className="text-white">{rank}</strong>
              </div>
            </div>
          </div>

          {/* Main Chart */}
          <div className="h-56 w-full mt-6 relative flex flex-col justify-end">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#836ef9" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#836ef9" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line x1="0" y1={paddingY} x2={svgWidth} y2={paddingY} stroke="#1e2230" strokeDasharray="3 3" />
              <line x1="0" y1={svgHeight / 2} x2={svgWidth} y2={svgHeight / 2} stroke="#1e2230" strokeDasharray="3 3" />
              <line x1="0" y1={svgHeight - paddingY} x2={svgWidth} y2={svgHeight - paddingY} stroke="#1e2230" strokeDasharray="3 3" />

              <path d={areaD} fill="url(#netWorthGrad)" />
              <path d={pathD} fill="none" stroke="#836ef9" strokeWidth="2.5" />

              {isPopulated && coords.map((c, i) => (
                <circle key={i} cx={c.x} cy={c.y} r="3.5" fill="#5feddf" stroke="#12141c" strokeWidth="2" />
              ))}
            </svg>

            {/* X-axis dates */}
            <div className="flex items-center justify-between text-[10px] font-mono text-[#615a78] mt-2 px-1">
              {points.map((p, i) => (
                <span key={i}>{p.date}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
