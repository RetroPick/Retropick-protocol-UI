'use client';

import React, { useState } from 'react';
import { 
  FiTrendingUp, 
  FiPlus, 
  FiSearch, 
  FiClock, 
  FiExternalLink
} from 'react-icons/fi';
import { 
  RiWallet3Line, 
  RiCoinsLine, 
  RiLineChartLine, 
  RiStackLine
} from 'react-icons/ri';
import { toast } from 'sonner';

interface EarnPortfolioDashboardProps {
  isPopulated: boolean;
  onTogglePopulate: () => void;
}

export function EarnPortfolioDashboard({ isPopulated, onTogglePopulate }: EarnPortfolioDashboardProps) {
  const [timeframe, setTimeframe] = useState<'1D' | '7D' | '30D' | 'All'>('7D');
  const [searchQuery, setSearchQuery] = useState('');
  const [hideSmall, setHideSmall] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'All' | 'Tokens' | 'Liquidity'>('All');
  const [activePerfTab, setActivePerfTab] = useState<'stats' | 'heatmap'>('stats');

  // Realistic token assets on Monad Testnet
  const tokens = isPopulated ? [
    { symbol: 'CIS', name: 'Cat In Secret', balance: '124.56', price: 1.42, change24h: 14.2, value: 176.88, logo: '🐱' },
    { symbol: 'MON', name: 'Monad Native', balance: '88.21', price: 12.80, change24h: 5.8, value: 1129.09, logo: '◈' },
    { symbol: 'WETH', name: 'Wrapped Ether', balance: '0.450', price: 3420.50, change24h: 2.1, value: 1539.23, logo: 'Ξ' },
    { symbol: 'cbBTC', name: 'Coinbase BTC', balance: '0.020', price: 94150.00, change24h: 4.3, value: 1883.00, logo: '₿' },
    { symbol: 'USDC', name: 'USD Coin', balance: '420.00', price: 1.00, change24h: 0.0, value: 420.00, logo: '💲' },
    { symbol: 'XAU0', name: 'Tether Gold', balance: '0.150', price: 2680.00, change24h: 0.9, value: 402.00, logo: '🪙' },
  ] : [];

  const activities = isPopulated ? [
    { id: 'tx-1', type: 'BUY', symbol: 'CIS / MON', amount: '+124.56 CIS', value: '$176.88', time: '2m ago', txHash: '0x8f2a...391c' },
    { id: 'tx-2', type: 'CLAIM', symbol: 'Creator Escrow', amount: '+42.50 MON', value: '$544.00', time: '14m ago', txHash: '0x4c1e...90da' },
    { id: 'tx-3', type: 'BUY', symbol: 'cbBTC / USDC', amount: '+0.02 cbBTC', value: '$1,883.00', time: '1h ago', txHash: '0x1a8f...66bc' },
    { id: 'tx-4', type: 'STAKE', symbol: 'MON / USDC Vault', amount: '+10.00 MON', value: '$128.00', time: '3h ago', txHash: '0x7e3b...219f' },
    { id: 'tx-5', type: 'SELL', symbol: 'WETH / USDC', amount: '-0.25 WETH', value: '$855.12', time: '5h ago', txHash: '0x99dd...01cc' },
  ] : [];

  const filteredTokens = tokens.filter(t => {
    if (hideSmall && t.value < 10) return false;
    if (searchQuery && !t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalValue = isPopulated ? 5550.20 : 0.00;
  const unrealizedPnl = isPopulated ? 842.15 : 0.00;
  const realizedPnl = isPopulated ? 3412.50 : 0.00;
  const winRate = isPopulated ? 74.2 : 0;
  const tradesCount = isPopulated ? 86 : 0;

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* ── TOP 3 METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Balance Card */}
        <div className="bg-[#12141c] rounded-xl p-4 sm:p-5 flex flex-col justify-between min-h-[160px] shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:bg-[#171924] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#a79fd0] flex items-center gap-1.5">
              <RiWallet3Line className="w-3.5 h-3.5 text-[#836ef9]" /> Total Balance
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#181a24] text-[#5feddf] font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-sm bg-[#5feddf]" />
              <span>{isPopulated ? '88.21 MON' : '0 MON'}</span>
            </span>
          </div>

          <div className="my-auto py-2">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-bold font-mono ${unrealizedPnl >= 0 ? 'text-[#5feddf]' : 'text-[#ff8fa3]'}`}>
                {unrealizedPnl >= 0 ? `+$${unrealizedPnl.toFixed(2)}` : `-$${Math.abs(unrealizedPnl).toFixed(2)}`}
              </span>
              {isPopulated && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-[#5feddf]/15 text-[#5feddf] font-bold">
                  +18.4%
                </span>
              )}
            </div>
          </div>

          <div className="pt-2.5 border-t border-[#1e2230] flex items-center justify-between text-xs">
            <span className="text-[#a79fd0] font-mono text-[11px]">
              Native: <strong className="text-white font-bold">{isPopulated ? '88.21 MON' : '0.00 MON'}</strong>
            </span>
            <button
              onClick={() => toast.success('Simulated wallet funding opened')}
              className="text-[11px] font-semibold text-[#836ef9] hover:text-[#a79fd0] flex items-center gap-1 cursor-pointer transition-colors bg-transparent border-none p-0"
            >
              <FiPlus className="w-3 h-3" /> Fund wallet
            </button>
          </div>
        </div>

        {/* Card 2: Realized PnL Card */}
        <div className="bg-[#12141c] rounded-xl p-4 sm:p-5 flex flex-col justify-between min-h-[160px] relative overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:bg-[#171924] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#a79fd0] flex items-center gap-1.5">
              <FiTrendingUp className="w-3.5 h-3.5 text-[#5feddf]" /> Realized PnL
            </span>
            <div className="flex items-center gap-1 bg-[#181a24] p-0.5 rounded-lg">
              {(['1D', '7D', '30D', 'All'] as const).map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded-md cursor-pointer transition-all border-none ${
                    timeframe === tf ? 'bg-[#836ef9] text-white font-bold' : 'bg-transparent text-[#615a78] hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="my-auto py-2 z-10">
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-[#5feddf]">
                {realizedPnl >= 0 ? `+$${realizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `-$${Math.abs(realizedPnl).toFixed(2)}`}
              </span>
              {isPopulated && (
                <span className="px-2 py-0.5 rounded-md bg-[#5feddf]/15 text-[#5feddf] font-mono text-[10px] font-bold">
                  +42.8% ROI
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#615a78] font-mono mt-1">
              {isPopulated ? '86 closed trades' : 'No closed trades'}
            </div>
          </div>

          {/* Sparkline curve */}
          <div className="absolute inset-x-0 bottom-0 h-12 pointer-events-none opacity-80">
            <svg viewBox="0 0 300 50" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="pnlSvgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5feddf" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#5feddf" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d={isPopulated ? "M 0 42 Q 60 38, 110 26 T 210 18 T 300 6 L 300 50 L 0 50 Z" : "M 0 45 L 300 45 L 300 50 L 0 50 Z"}
                fill="url(#pnlSvgGrad)"
              />
              <path
                d={isPopulated ? "M 0 42 Q 60 38, 110 26 T 210 18 T 300 6" : "M 0 45 L 300 45"}
                fill="none"
                stroke={isPopulated ? "#5feddf" : "#1e2230"}
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>

        {/* Card 3: Performance & Activity Card */}
        <div className="bg-[#12141c] rounded-xl p-4 sm:p-5 flex flex-col justify-between min-h-[160px] shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:bg-[#171924] transition-all sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <button
                onClick={() => setActivePerfTab('stats')}
                className={`font-semibold cursor-pointer transition-colors uppercase tracking-wider bg-transparent border-none p-0 ${
                  activePerfTab === 'stats' ? 'text-white' : 'text-[#615a78] hover:text-[#a79fd0]'
                }`}
              >
                Performance
              </button>
              <span className="text-[#334155]">/</span>
              <button
                onClick={() => setActivePerfTab('heatmap')}
                className={`font-semibold cursor-pointer transition-colors uppercase tracking-wider bg-transparent border-none p-0 ${
                  activePerfTab === 'heatmap' ? 'text-white' : 'text-[#615a78] hover:text-[#a79fd0]'
                }`}
              >
                Heatmap
              </button>
            </div>
          </div>

          {activePerfTab === 'stats' ? (
            <div className="grid grid-cols-3 gap-2 my-auto py-2 text-center">
              <div className="bg-[#181a24] rounded-lg p-2">
                <div className="text-[10px] font-mono text-[#615a78] uppercase">Win Rate</div>
                <div className="text-sm sm:text-base font-bold font-mono text-white mt-0.5">{winRate}%</div>
              </div>
              <div className="bg-[#181a24] rounded-lg p-2">
                <div className="text-[10px] font-mono text-[#615a78] uppercase">Traded</div>
                <div className="text-sm sm:text-base font-bold font-mono text-white mt-0.5">{isPopulated ? '18' : '0'}</div>
              </div>
              <div className="bg-[#181a24] rounded-lg p-2">
                <div className="text-[10px] font-mono text-[#615a78] uppercase">Txns</div>
                <div className="text-sm sm:text-base font-bold font-mono text-[#5feddf] mt-0.5">{tradesCount}</div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-center my-auto py-2 gap-1.5">
              <div className="text-[10px] text-[#615a78] font-mono flex justify-between">
                <span>Recent Frequency</span>
                <span className="text-[#5feddf]">14 days</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                {[1, 3, 0, 4, 2, 5, 2, 4, 1, 3, 5, 4, 2, 4].map((v, i) => (
                  <div
                    key={i}
                    className="w-3.5 h-6 rounded-sm transition-all"
                    style={{
                      backgroundColor: !isPopulated || v === 0 ? '#181230' : v > 3 ? '#5feddf' : '#836ef9',
                      opacity: !isPopulated || v === 0 ? 0.35 : 0.4 + (v / 5) * 0.6
                    }}
                    title={`Day ${i + 1}: ${v} trades`}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="pt-2.5 border-t border-[#1e2230] flex items-center justify-between text-[11px] font-mono text-[#615a78]">
            <span>Vol: <strong className="text-white">{isPopulated ? '$24,820' : '$0'}</strong></span>
            <span>Avg: <strong className="text-[#5feddf]">{isPopulated ? '+$42.80' : '$0'}</strong></span>
          </div>
        </div>
      </div>

      {/* ── LOWER SECTION: TOKEN HOLDINGS & ACTIVITY STREAM ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Column (8 cols): Token Holdings */}
        <div className="xl:col-span-8 bg-[#12141c] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.3)] overflow-hidden">
          {/* Header Controls */}
          <div className="p-4 border-b border-[#1e2230] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#13151f]/60">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2 m-0">
                Token Holdings <span className="text-xs text-[#615a78] font-mono">({filteredTokens.length})</span>
              </h3>

              <div className="flex items-center gap-1 bg-[#181a24] p-0.5 rounded-lg">
                {(['All', 'Tokens', 'Liquidity'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveSubTab(tab)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer transition-all border-none ${
                      activeSubTab === tab ? 'bg-[#836ef9] text-white shadow-sm font-bold' : 'bg-transparent text-[#615a78] hover:text-[#a79fd0]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <FiSearch className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search token..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-[#181a24] text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#836ef9] transition-all w-36 sm:w-44 border-none"
                />
              </div>

              <button
                onClick={() => setHideSmall(v => !v)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border-none cursor-pointer transition-all ${
                  hideSmall ? 'bg-[#836ef9]/25 text-[#a78bfa]' : 'bg-[#181a24] text-[#a79fd0] hover:text-white'
                }`}
                title="Hide small balances below $10"
              >
                &gt;$10
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[560px]">
              <thead>
                <tr className="border-b border-[#1e2230] bg-[#13151f] text-slate-400 font-mono uppercase text-[10.5px] tracking-wider">
                  <th className="py-2.5 px-4 font-semibold">Asset</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Price</th>
                  <th className="py-2.5 px-4 text-right font-semibold">24h</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Holdings</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Value</th>
                  <th className="py-2.5 px-4 text-center font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2230] text-xs font-mono">
                {filteredTokens.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <RiWallet3Line className="w-8 h-8 text-[#836ef9]/40" />
                        <span className="text-sm font-sans font-medium text-white">No active tokens in this view</span>
                        <button
                          onClick={onTogglePopulate}
                          className="px-3.5 py-1.5 rounded-lg bg-[#836ef9] hover:bg-[#9583fc] text-white font-sans font-semibold text-xs transition-all cursor-pointer shadow-[0_0_12px_rgba(131,110,249,0.25)] border-none"
                        >
                          Simulate Portfolio Data
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTokens.map(token => (
                    <tr key={token.symbol} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-sans">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-[#181a24] flex items-center justify-center text-xs shrink-0 shadow-sm font-bold text-white">
                            {token.logo}
                          </span>
                          <div>
                            <div className="text-white font-bold text-xs">
                              {token.symbol}
                            </div>
                            <div className="text-[11px] text-[#615a78]">{token.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-white">
                        ${token.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${token.change24h >= 0 ? 'text-[#5feddf]' : 'text-[#ff8fa3]'}`}>
                        {token.change24h >= 0 ? `+${token.change24h}%` : `${token.change24h}%`}
                      </td>
                      <td className="py-3 px-4 text-right text-white">
                        {token.balance}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-white">
                        ${token.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toast.info(`Trade ticket ready for ${token.symbol}`)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#836ef9] hover:bg-[#9583fc] text-white font-sans font-semibold text-xs transition-all cursor-pointer shadow-[0_0_12px_rgba(131,110,249,0.25)] border-none"
                        >
                          Trade
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (4 cols): Recent Activity Feed */}
        <div className="xl:col-span-4 bg-[#12141c] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#1e2230] flex items-center justify-between bg-[#13151f]/60">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2 m-0">
              <FiClock className="w-3.5 h-3.5 text-[#836ef9]" /> Recent Activity
            </h3>
            <span className="w-2 h-2 rounded-full bg-[#5feddf] animate-pulse" title="Live stream active" />
          </div>

          <div className="divide-y divide-[#1e2230] flex-1">
            {activities.length === 0 ? (
              <div className="py-14 px-4 text-center text-[#615a78] text-xs">
                No recent transactions recorded in this session.
              </div>
            ) : (
              activities.map(act => (
                <div key={act.id} className="p-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2 py-1 rounded-md flex items-center justify-center text-[9px] font-bold font-mono ${
                        act.type === 'BUY'
                          ? 'bg-[#5feddf]/15 text-[#5feddf]'
                          : act.type === 'CLAIM'
                          ? 'bg-[#836ef9]/15 text-[#836ef9]'
                          : act.type === 'STAKE'
                          ? 'bg-[#a78bfa]/15 text-[#a78bfa]'
                          : 'bg-[#ff8fa3]/15 text-[#ff8fa3]'
                      }`}
                    >
                      {act.type}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white">{act.symbol}</div>
                      <div className="text-[10px] text-[#615a78] font-mono flex items-center gap-1">
                        <span>{act.time}</span> • <span className="hover:text-[#836ef9] cursor-pointer">{act.txHash}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-xs font-bold text-white">{act.amount}</div>
                    <div className="text-[10px] text-[#615a78]">{act.value}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-[#13151f]/40 border-t border-[#1e2230] text-center">
            <a
              href="https://testnet.monadexplorer.com"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-[#836ef9] hover:underline font-mono inline-flex items-center gap-1"
            >
              Monad Testnet Explorer <FiExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

