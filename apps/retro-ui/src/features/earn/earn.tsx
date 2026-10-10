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
import { ArrowUpRight, Coins, Gift, Layers, Link2, Rocket, Send, Wallet } from 'lucide-react';
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
import { Reveal } from './amount';
import { DATA_MODE, INDEXER_URL } from '@/lib/live/env';
import { fetchSearch } from '@/lib/live/indexer-client';
import { launchKeys } from '@/lib/live/queries';
import { useWallet } from '@/wallet/provider';
import { useDemo } from '@/components/product/provider';
import { liveRow } from '@/lib/view-models/discovery';
import { DemoBadge, ErrorState, InfoHint, useCopy } from '@/components/trading/primitives';
import { LaunchTable } from '@/features/launchpad/launch-table';
import { age } from '@/lib/live/format';
import './earn-hub.css';

const TABS: Array<[string, string, ReactNode]> = [
  ['claims', 'Claims', <Coins key="c" size={14} aria-hidden />],
  ['portfolio', 'Portfolio', <Wallet key="p" size={14} aria-hidden />],
  ['created', 'Created', <Rocket key="l" size={14} aria-hidden />],
  ['referrals', 'Referrals', <Gift key="r" size={14} aria-hidden />],
  ['funding', 'Fund & send', <Send key="f" size={14} aria-hidden />],
];

function initialTab(): string {
  try {
    const hash = window.location.hash.slice(1);
    return TABS.some(([id]) => id === hash) ? hash : 'claims';
  } catch { return 'claims'; }
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
  const q = useQuery({ queryKey: [...launchKeys.all, 'created', account ?? ''], enabled: !!INDEXER_URL && !!account, queryFn: ({ signal }) => fetchSearch(INDEXER_URL!, account!, signal), staleTime: 10000 });
  const rows = (q.data?.data ?? []).filter((l) => l.creator.toLowerCase() === account?.toLowerCase()).map(liveRow);
  if (!account) return <Reveal><div className="rp-empty-panel">
    <span className="rp-empty-disc"><Rocket size={22} aria-hidden /></span>
    <strong>Connect a wallet to see launches you created</strong>
    <p>Every launch lists its creator wallet; yours appear here with their curve status, volume and fees.</p>
  </div></Reveal>;
  if (q.isError) return <ErrorState title="Launch search is unavailable" text="The indexer search did not respond. Retry in a moment." onRetry={() => void q.refetch()} />;
  return <div className="rp-hub-section">
    {rows.length
      ? <Reveal><LaunchTable rows={rows} view="list" now={Date.now()} /></Reveal>
      : <Reveal><div className="rp-empty-panel">
        <span className="rp-empty-disc"><Rocket size={22} aria-hidden /></span>
        <strong>No indexed launches list this wallet as creator</strong>
        <p>Launch a token on the bonding curve and it appears here with its lifecycle, volume and fee escrow.</p>
        <div className="rp-empty-actions">
          <Link className="rp-btn rp-btn-primary" href="/launchpad/create">Launch a token</Link>
          <Link className="rp-btn rp-btn-ghost" href="/launchpad">Explore launches</Link>
        </div>
      </div></Reveal>}
    <p className="rp-note">Matched by creator address through indexer search (first 20 matches). {(q.data?.data.length ?? 0) >= 20 ? 'More launches may exist — this list is not complete.' : 'This list may still be incomplete until the indexer exposes a creator filter.'}</p>
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
      <header className="rp-hub-head"><div><h1>Earn &amp; Portfolio</h1><p>Real balances, claims and attribution for your connected Monad Testnet wallet.</p></div></header>
      <EarnHero mode="live"
        claimable={data ? formatUnits(data.nativeCreditRaw, 18) : '—'}
        ready={(data?.nativeCreditRaw ?? 0n) > 0n}
        tokenCreditCount={earn.tokenCreditCount}
        onOpenClaims={openClaims}
        canClaim={!!earn.account && earn.claimRows.length > 0}
        stats={[
          { label: 'Wallet MON', value: <Money value={data ? Number(formatUnits(data.monRaw, 18)) : null} />, hint: 'Spendable native balance read from chain.' },
          { label: 'Kuru margin MON', value: <Money value={data ? Number(formatUnits(data.nativeMarginRaw, 18)) : null} />, hint: 'Free margin balance on the Kuru margin account. Withdraw from the Portfolio tab.' },
          { label: 'Lifetime claims', value: earn.claims.length || '0', note: lastClaim ? `Last claim ${age(lastClaim.timestamp)} ago` : 'No claims yet' },
        ]} />
      <HubTabs tab={tab} onTab={(value) => { setTab(value); try { history.replaceState(null, '', `#${value}`); } catch { /* ignore */ } }} contents={{
        claims: <ClaimsTab earn={earn} />,
        portfolio: <LivePortfolio />,
        created: <CreatedLaunches />,
        referrals: <Reveal delay={0.05}><ReferralCard /></Reveal>,
        funding: <Reveal delay={0.05}><FundWallet><SendToWallet /></FundWallet></Reveal>,
      }} />
      <ClaimSheet open={sheetOpen} onOpenChange={setSheetOpen} earn={earn} />
    </div>
  </HideValuesProvider>;
}

const DEMO_REFERRAL = 'https://demo.retropick.xyz/r/DEMO-0001';

function DemoClaims() {
  return <section className="rp-hub-section">
    <div className="rp-tile-grid">
      <div className="rp-tile"><span className="rp-tile-label"><span className="rp-cell-glyph" style={{ color: '#836ef9', background: '#836ef91f' }} aria-hidden><Coins size={13} /></span>Creator fees<InfoHint text="The creator fee configured on each launch (shown on the token's Protocol tab) is credited to the fee escrow on every curve trade." /></span><strong>—</strong><small>Fee escrow credit · live only</small></div>
      <div className="rp-tile"><span className="rp-tile-label"><span className="rp-cell-glyph" style={{ color: '#b09cfa', background: '#b09cfa1f' }} aria-hidden><Layers size={13} /></span>Buyback / vested release</span><strong>—</strong><small>Releasable share from buyback vaults · live only</small></div>
      <div className="rp-tile"><span className="rp-tile-label"><span className="rp-cell-glyph" style={{ color: '#5feddf', background: '#5feddf1f' }} aria-hidden><Gift size={13} /></span>Referral earnings</span><strong>Not enabled</strong><small>Referral attribution is tracked; payouts are not funded.</small></div>
    </div>
    <p className="rp-note">In live mode the claim sheet lists one row per asset with its own signed claim transaction, plus a sequential claim-all for the batch.</p>
  </section>;
}

function DemoHub() {
  const demo = useDemo();
  const [copied, copy] = useCopy();
  const [showPositions, setShowPositions] = useState(false);
  const [tab, setTab] = useState(initialTab);
  return <HideValuesProvider>
    <div className="rp-hub" data-testid="earn-hub" data-data-mode="demo">
      <header className="rp-hub-head"><div><h1>Earn &amp; Portfolio <DemoBadge /></h1><p>How creator fees, buyback releases, referrals and wallet funding appear in RetroPick. No real funds and no claim contract are connected in demo mode.</p></div></header>
      <EarnHero mode="demo" claimable="—" ready={false} tokenCreditCount={0} stats={[
        { label: 'Wallet MON', value: '—', hint: 'Live mode reads the spendable native balance from chain.' },
        { label: 'Kuru margin MON', value: '—', hint: 'Live mode reads the free margin balance on the Kuru margin account.' },
        { label: 'Lifetime claims', value: '—', hint: 'Live mode counts indexed claim transactions for the wallet.' },
      ]} />
      <HubTabs tab={tab} onTab={(value) => { setTab(value); try { history.replaceState(null, '', `#${value}`); } catch { /* ignore */ } }} contents={{
        claims: <DemoClaims />,
        portfolio: <section className="rp-hub-section" aria-label="Portfolio">
          <div className="rp-hub-row"><h2 className="rp-section-title"><Wallet size={15} aria-hidden />Portfolio</h2>
            <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" onClick={() => setShowPositions((v) => !v)} aria-expanded={showPositions}>{showPositions ? 'Hide demo positions' : 'Show demo positions'}</button></div>
          <p className="rp-note">Live mode lists wallet assets, Kuru margin (with withdraw), and open orders from chain + indexer.{demo.connected ? '' : ' Prediction/PRISM demo positions are available below.'}</p>
          {showPositions && <div className="rp-hub-embed"><Portfolio /></div>}
        </section>,
        created: <Reveal><section className="rp-hub-section">
          <div className="rp-empty-panel">
            <span className="rp-empty-disc"><Rocket size={22} aria-hidden /></span>
            <strong>Launches your wallet creates appear here in live mode</strong>
            <p>Matched by creator address, with lifecycle status, volume and fee escrow per launch.</p>
            <div className="rp-empty-actions">
              <Link className="rp-btn rp-btn-primary" href="/launchpad/create">Launch a token</Link>
              <Link className="rp-btn rp-btn-ghost" href="/launchpad">Explore launches <ArrowUpRight size={13} aria-hidden /></Link>
            </div>
          </div>
        </section></Reveal>,
        referrals: <Reveal><section className="rp-hub-section" aria-label="Referrals">
          <div className="rp-hub-card">
            <div className="rp-hub-card-head">
              <span className="rp-card-icon"><Gift size={15} aria-hidden /></span>
              <h3>Referrals</h3>
              <span className="rp-chip">Attribution</span>
            </div>
            <p className="rp-card-sub">Share a link to attribute confirmed launches and trades to your wallet. Referral earnings are not enabled.</p>
            <div className="rp-ref-grid">
              <div className="rp-ref">
                <div className="rp-ref-link"><Link2 size={13} aria-hidden style={{ color: 'var(--text-3)', flexShrink: 0 }} /><input id="demo-ref" readOnly value={DEMO_REFERRAL} aria-label="Your referral link" /></div>
                <button type="button" className="rp-btn rp-btn-sm" onClick={() => copy(DEMO_REFERRAL)}>{copied ? 'Link copied' : 'Copy'}</button>
                <DemoBadge />
              </div>
              <ReferralQr value={DEMO_REFERRAL} label="Demo referral link" />
            </div>
          </div>
        </section></Reveal>,
        funding: <Reveal><section className="rp-hub-section"><FundWallet /><div className="rp-hub-send"><h3 className="rp-section-title"><Send size={15} aria-hidden />Send</h3><p className="rp-note">Transfers to an EVM address on Monad Testnet. Connect a live wallet in live mode; demo mode never sends.</p></div></section></Reveal>,
      }} />
    </div>
  </HideValuesProvider>;
}

export default function EarnPage() {
  return DATA_MODE === 'live' ? <LiveHub /> : <DemoHub />;
}
