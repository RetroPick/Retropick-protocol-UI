'use client';
// Earn & Portfolio finance hub (Sections 20–23), rebuilt on radix tabs + motion (bags.fm/Jupiter
// patterns: hero money bar, claimable sheet, tabbed sections). LIVE sections consume the existing
// qualified wallet/claim/referral components unchanged; DEMO shows the same information architecture
// with no claimable amounts and no copied third-party fee policy (no SOL, no "50% of fees", no
// deployer revenue rate).
import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { motion } from 'motion/react';
import { Tabs as RTabs } from 'radix-ui';
import Link from '@/components/product/safe-link';
import Portfolio from '@/features/portfolio/portfolio';
import { LivePortfolio } from '@/features/portfolio/live-portfolio';
import { ReferralCard } from './referrals';
import { FundWallet } from './fund-wallet';
import { SendToWallet } from './send-to-wallet';
import { ClaimsTab } from './live-earn';
import { ClaimSheet } from './claim-sheet';
import { EarnHero, HideValuesProvider, Money } from './earn-hero';
import { useEarnWallet } from './use-claims';
import { ReferralQr } from './referral-qr';
import { StrategyVault } from './strategy-vault';
import { ProtectedEarn } from './protected-earn';
import { Reveal } from './amount';
import { DATA_MODE, INDEXER_URL } from '@/lib/live/env';
import { useCreatedLaunches } from '@/hooks/use-created-launches';
import { launchKeys } from '@/lib/live/queries';
import { useWallet } from '@/wallet/provider';
import { useDemo } from '@/components/product/provider';
import { liveRow } from '@/lib/view-models/discovery';
import { DemoBadge, ErrorState, InfoHint, useCopy } from '@/components/trading/primitives';
import { LaunchTable } from '@/features/launchpad/launch-table';
import { age } from '@/lib/live/format';
import './earn-hub.css';

import { EarnPortfolioDashboard } from './components/EarnPortfolioDashboard';
import { EarnPerformanceView } from './components/EarnPerformanceView';
import { EarnProtectionView } from './components/EarnProtectionView';
import { 
  RiWallet3Line, 
  RiCoinsLine, 
  RiLineChartLine, 
  RiRocketLine, 
  RiGiftLine, 
  RiSendPlaneLine, 
  RiSafe2Line, 
  RiShieldCheckLine,
  RiDatabase2Line,
  RiStackLine,
  RiExchangeDollarLine
} from 'react-icons/ri';
import { toast } from 'sonner';

const TABS: Array<[string, string, ReactNode]> = [
  ['portfolio', 'Portfolio', <RiWallet3Line key="p" size={14} className="shrink-0" aria-hidden />],
  ['claims', 'Claims', <RiCoinsLine key="c" size={14} className="shrink-0" aria-hidden />],
  ['performance', 'Performance', <RiLineChartLine key="b" size={14} className="shrink-0" aria-hidden />],
  ['created', 'Created', <RiRocketLine key="l" size={14} className="shrink-0" aria-hidden />],
  ['referrals', 'Referrals', <RiGiftLine key="r" size={14} className="shrink-0" aria-hidden />],
  ['funding', 'Fund & Send', <RiSendPlaneLine key="f" size={14} className="shrink-0" aria-hidden />],
  ['vault', 'Vault', <RiSafe2Line key="v" size={14} className="shrink-0" aria-hidden />],
  ['protection', 'Protection', <RiShieldCheckLine key="s" size={14} className="shrink-0" aria-hidden />],
];

function initialTab(): string {
  try {
    const hash = window.location.hash.slice(1);
    return TABS.some(([id]) => id === hash) ? hash : 'portfolio';
  } catch { return 'portfolio'; }
}

function HubTabs({ tab, onTab, contents }: { tab: string; onTab: (value: string) => void; contents: Record<string, ReactNode> }) {
  return <RTabs.Root value={tab} onValueChange={onTab}>
    <nav className="rp-hub-nav-wrap" aria-label="Earn and portfolio sections">
      <RTabs.List className="rp-hub-tabs">
        {TABS.map(([id, label, icon]) => <RTabs.Trigger key={id} value={id} className="rp-hub-tab">{icon}{label}</RTabs.Trigger>)}
      </RTabs.List>
    </nav>
    {TABS.map(([id]) => <RTabs.Content key={id} value={id} className="rp-hub-panel">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
        {contents[id]}
      </motion.div>
    </RTabs.Content>)}
  </RTabs.Root>;
}

/** Created launches. The indexer has no creator filter; search by the wallet address is capped at 20 results. */
function CreatedLaunches() {
  const { account } = useWallet();
  const q = useCreatedLaunches(account);
  const rows = (q.data?.pages.flatMap(page => page.data) ?? []).map(liveRow);
  if (q.isPending && account) return <p role="status">Loading created launches…</p>;
  if (!account) return <Reveal><div className="rp-empty-panel">
    <span className="rp-empty-disc"><RiRocketLine size={22} aria-hidden /></span>
    <strong>Connect a wallet to see launches you created</strong>
    <p>Every launch lists its creator wallet; yours appear here with their curve status, volume and fees.</p>
  </div></Reveal>;
  if (q.isError) return <ErrorState title="Launch search is unavailable" text="The indexer search did not respond. Retry in a moment." onRetry={() => void q.refetch()} />;
  return <div className="rp-hub-section">
    {q.hasNextPage && <button className="rp-btn rp-btn-ghost" disabled={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>Load more created launches</button>}
    {rows.length
      ? <Reveal><LaunchTable rows={rows} view="list" now={Date.now()} /></Reveal>
      : <Reveal><div className="rp-empty-panel">
        <span className="rp-empty-disc"><RiRocketLine size={22} aria-hidden /></span>
        <strong>No indexed launches list this wallet as creator</strong>
        <p>Launch a token on the bonding curve and it appears here with its lifecycle, volume and fee escrow.</p>
        <div className="rp-empty-actions">
          <Link className="rp-btn rp-btn-primary" href="/launchpad/create">Launch a token</Link>
          <Link className="rp-btn rp-btn-ghost" href="/launchpad">Explore launches</Link>
        </div>
      </div></Reveal>}
    <p className="rp-note">Created launches are paginated by creator address. Indexing may be delayed; current fee-recipient rights are verified onchain in Protected Earn.</p>
  </div>;
}

function LiveHub() {
  const earn = useEarnWallet();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tab, setTab] = useState(initialTab);
  const data = earn.state.data;
  const lastClaim = [...earn.claims].sort((a, b) => b.timestamp - a.timestamp)[0];
  const openClaims = () => setSheetOpen(true);
  return <HideValuesProvider>
    <div className="rp-hub" data-testid="earn-hub" data-data-mode="live">
      <header className="rp-hub-head">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white m-0">Earn &amp; Portfolio</h1>
      </header>
      <EarnHero mode="live"
        claimable={data ? formatUnits(data.nativeCreditRaw, 18) : '—'}
        ready={(data?.nativeCreditRaw ?? 0n) > 0n}
        tokenCreditCount={earn.tokenCreditCount}
        onOpenClaims={openClaims}
        canClaim={!!earn.account && earn.claimRows.length > 0}
        stats={[
          {
            label: 'Wallet Balance',
            value: <Money value={data ? Number(formatUnits(data.monRaw, 18)) : null} />,
            unit: 'MON',
            subValue: data ? `≈ $${(Number(formatUnits(data.monRaw, 18)) * 12.80).toFixed(2)}` : 'Onchain balance',
            icon: <RiWallet3Line size={13} style={{ color: '#836ef9' }} />,
          },
          {
            label: 'Kuru Margin',
            value: <Money value={data ? Number(formatUnits(data.nativeMarginRaw, 18)) : null} />,
            unit: 'MON',
            subValue: 'Free CLOB margin',
            icon: <RiExchangeDollarLine size={13} style={{ color: '#5feddf' }} />,
          },
          {
            label: 'Lifetime Claims',
            value: earn.claims.length ? `${earn.claims.length}` : '0',
            unit: 'TX',
            note: lastClaim ? `Last ${age(lastClaim.timestamp)} ago` : 'No claims yet',
            icon: <RiShieldCheckLine size={13} style={{ color: '#b09cfa' }} />,
          },
        ]} />
      <HubTabs tab={tab} onTab={(value) => { setTab(value); try { history.replaceState(null, '', `#${value}`); } catch { /* ignore */ } }} contents={{
        portfolio: <LivePortfolio />,
        claims: <ClaimsTab earn={earn} />,
        performance: <EarnPerformanceView isPopulated={true} />,
        created: <CreatedLaunches />,
        referrals: <Reveal delay={0.05}><ReferralCard /></Reveal>,
        funding: <Reveal delay={0.05}><FundWallet><SendToWallet /></FundWallet></Reveal>,
        vault: <Reveal delay={0.05}><StrategyVault /></Reveal>,
        protection: <EarnProtectionView />,
      }} />
      <ClaimSheet open={sheetOpen} onOpenChange={setSheetOpen} earn={earn} />
    </div>
  </HideValuesProvider>;
}

const DEMO_REFERRAL = 'https://demo.retropick.xyz/r/DEMO-0001';

function DemoClaims({ isPopulated }: { isPopulated?: boolean }) {
  return <section className="rp-hub-section">
    <div className="rp-tile-grid">
      <div className="rp-tile">
        <span className="rp-tile-label">
          <span className="rp-cell-glyph" style={{ color: '#836ef9', background: '#836ef91f' }} aria-hidden><RiCoinsLine size={13} /></span>
          Creator fees
        </span>
        <strong>{isPopulated ? '88.50 MON ($1,132.80)' : '—'}</strong>
        <small>{isPopulated ? 'Ready to claim in active session' : 'Fee escrow credit'}</small>
      </div>
      <div className="rp-tile">
        <span className="rp-tile-label">
          <span className="rp-cell-glyph" style={{ color: '#b09cfa', background: '#b09cfa1f' }} aria-hidden><RiStackLine size={13} /></span>
          Buyback / vested release
        </span>
        <strong>{isPopulated ? '36.00 MON ($460.80)' : '—'}</strong>
        <small>{isPopulated ? 'Vested release 100% unlocked' : 'Releasable share from buyback vaults'}</small>
      </div>
      <div className="rp-tile">
        <span className="rp-tile-label">
          <span className="rp-cell-glyph" style={{ color: '#5feddf', background: '#5feddf1f' }} aria-hidden><RiGiftLine size={13} /></span>
          Referral earnings
        </span>
        <strong>{isPopulated ? '14 referrals tracked' : 'Not enabled'}</strong>
        <small>{isPopulated ? 'Attribution link active' : 'Referral attribution is tracked'}</small>
      </div>
    </div>

    <div className="mt-2 p-4 rounded-xl bg-[#12141c] border-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-2">
        <span className="text-sm text-white font-bold">Unclaimed Protocol Royalties</span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#5feddf]/15 text-[#5feddf] font-bold">Monad Testnet</span>
      </div>
      <button
        onClick={() => toast.success(isPopulated ? 'Simulated batch claim confirmed: +124.50 MON' : 'No escrow balance to claim')}
        className="rp-btn rp-btn-primary rp-btn-sm whitespace-nowrap"
      >
        {isPopulated ? 'Claim All Escrow' : 'Check Escrow'}
      </button>
    </div>
  </section>;
}

function DemoHub() {
  const [copied, copy] = useCopy();
  const [isPopulated, setIsPopulated] = useState(true);
  const [tab, setTab] = useState(initialTab);

  return <HideValuesProvider>
    <div className="rp-hub" data-testid="earn-hub" data-data-mode="demo">
      <header className="rp-hub-head">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white m-0">Earn &amp; Portfolio</h1>
          <button
            type="button"
            onClick={() => {
              setIsPopulated(v => !v);
              toast.info(!isPopulated ? 'Sample active portfolio activated' : 'Switched to clean $0 state');
            }}
            className="px-3 py-1.5 rounded-lg border-none text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-2"
            style={{
              background: isPopulated ? 'rgba(131, 110, 249, 0.15)' : '#181a24',
              color: isPopulated ? '#e9e6f5' : '#615a78',
              boxShadow: isPopulated ? '0 0 12px rgba(131, 110, 249, 0.2)' : 'none'
            }}
          >
            <RiDatabase2Line size={13} style={{ color: isPopulated ? '#836ef9' : '#615a78' }} />
            <span>{isPopulated ? 'Sample Portfolio' : 'Clean State'}</span>
          </button>
        </div>
      </header>

      <EarnHero
        mode={isPopulated ? 'live' : 'demo'}
        claimable={isPopulated ? '124.50' : '—'}
        ready={isPopulated}
        tokenCreditCount={isPopulated ? 2 : 0}
        canClaim={isPopulated}
        onOpenClaims={() => {
          toast.success('Batch claims simulated: +124.50 MON');
        }}
        stats={[
          {
            label: 'Wallet Balance',
            value: isPopulated ? '88.21' : '—',
            unit: 'MON',
            subValue: isPopulated ? '≈ $1,129.08' : 'Spendable balance',
            icon: <RiWallet3Line size={13} style={{ color: '#836ef9' }} />,
          },
          {
            label: 'Kuru Margin',
            value: isPopulated ? '10.00' : '—',
            unit: 'MON',
            subValue: isPopulated ? '≈ $128.00' : 'Free CLOB margin',
            icon: <RiExchangeDollarLine size={13} style={{ color: '#5feddf' }} />,
          },
          {
            label: 'Lifetime Claims',
            value: isPopulated ? '1,420.00' : '—',
            unit: 'MON',
            subValue: isPopulated ? '≈ $18,176.00' : 'Total claimed',
            icon: <RiShieldCheckLine size={13} style={{ color: '#b09cfa' }} />,
          },
        ]}
      />

      <HubTabs
        tab={tab}
        onTab={(value) => {
          setTab(value);
          try { history.replaceState(null, '', `#${value}`); } catch { /* ignore */ }
        }}
        contents={{
          portfolio: <EarnPortfolioDashboard isPopulated={isPopulated} onTogglePopulate={() => setIsPopulated(v => !v)} />,
          claims: <DemoClaims isPopulated={isPopulated} />,
          performance: <EarnPerformanceView isPopulated={isPopulated} />,
          created: <CreatedLaunches />,
          referrals: <Reveal delay={0.05}><ReferralCard /></Reveal>,
          funding: <Reveal delay={0.05}><FundWallet><SendToWallet /></FundWallet></Reveal>,
          vault: <Reveal delay={0.05}><StrategyVault /></Reveal>,
          protection: <EarnProtectionView />,
        }}
      />
    </div>
  </HideValuesProvider>;
}

export default function EarnPage() {
  return DATA_MODE === 'live' ? <LiveHub /> : <DemoHub />;
}

