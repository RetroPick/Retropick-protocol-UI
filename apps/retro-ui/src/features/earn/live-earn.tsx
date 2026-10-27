'use client';
// Claims tab: ready escrow credits, one-step-away buyback releases and the claim history ledger.
import { formatUnits, zeroAddress } from 'viem';
import { RiCoinsLine, RiWallet3Line } from 'react-icons/ri';
import { FiDownload, FiClock, FiFileText } from 'react-icons/fi';
import { toast } from 'sonner';
import { AddressChip, DataTable, ErrorState, SkeletonLine, type Column } from '@/components/trading/primitives';
import { ClaimRowItem } from './claim-sheet';
import { MonoAmount, Reveal } from './amount';
import { age } from '@/lib/live/format';
import type { IndexedClaim, IndexedWalletAsset } from '@retropick/launchpad-sdk/read-model';
import type { useEarnWallet } from './use-claims';

type Earn = ReturnType<typeof useEarnWallet>;

function Disc({ children }: { children: React.ReactNode }) {
  return <span className="rp-empty-disc">{children}</span>;
}

function ClaimSkeleton() {
  return <div className="rp-hub-section" role="status" aria-label="Loading earnings">
    <div className="rp-hub-card"><SkeletonLine height={20} width={190} /><div className="rp-claim-list">
      {[0, 1].map((i) => <div className="rp-claim-row" key={i}><SkeletonLine width={230} height={42} /></div>)}
    </div></div>
    <div className="rp-hub-card"><SkeletonLine height={160} /></div>
  </div>;
}

function NoCreditsEmpty() {
  return <div className="rp-empty-panel">
    <Disc><RiCoinsLine size={22} aria-hidden /></Disc>
    <strong>No escrow credits right now</strong>
    <p>Credits build up as traders buy and sell your launches on the bonding curve.</p>
    <div className="rp-steps" aria-label="How credits build up">
      <div className="rp-step"><span className="rp-step-num">1</span><span>Traders swap your launch</span></div>
      <div className="rp-step"><span className="rp-step-num">2</span><span>Fee escrow credits your wallet</span></div>
      <div className="rp-step"><span className="rp-step-num">3</span><span>Claim from this list</span></div>
    </div>
  </div>;
}

function BuybackEmpty() {
  return <div className="rp-empty-panel rp-empty-compact">
    <Disc><FiClock size={18} aria-hidden /></Disc>
    <div><strong>No indexed vesting positions</strong>
      <p>Buyback vault shares vest over time. When a release becomes available it appears here, one step away from claiming.</p></div>
  </div>;
}

function ClaimHistoryCard({ claims, assets }: { claims: IndexedClaim[]; assets: IndexedWalletAsset[] }) {
  const rows = claims.slice(0, 100);
  const exportCsv = () => {
    const cells = rows.map((row) => {
      const asset = assets.find((a) => a.token.toLowerCase() === row.token.toLowerCase());
      const native = row.token === zeroAddress;
      const amount = native ? formatUnits(BigInt(row.amountRaw), 18)
        : asset?.decimals !== null && asset?.decimals !== undefined ? formatUnits(BigInt(row.amountRaw), asset.decimals) : row.amountRaw;
      return [native ? 'MON' : asset?.symbol ?? 'TOKEN', amount, new Date(row.timestamp * 1000).toISOString(), row.transactionHash];
    });
    const csv = [['asset', 'amount', 'time', 'transaction'], ...cells]
      .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'retropick-claims.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Claim history exported', { description: `${rows.length} confirmed claim${rows.length === 1 ? '' : 's'}` });
  };
  const columns: Array<Column<IndexedClaim>> = [
    { key: 'asset', header: 'Asset', cell: (row) => {
      const native = row.token === zeroAddress;
      const asset = assets.find((a) => a.token.toLowerCase() === row.token.toLowerCase());
      const symbol = native ? 'MON' : asset?.symbol ?? 'Token';
      const color = native ? '#836ef9' : '#5feddf';
      return <span className="rp-cell-asset"><span className="rp-cell-glyph" style={{ color, background: `${color}1f` }} aria-hidden>{symbol[0]}</span><strong>{symbol}</strong></span>;
    } },
    { key: 'amount', header: 'Amount', cell: (row) => {
      const asset = assets.find((a) => a.token.toLowerCase() === row.token.toLowerCase());
      const native = row.token === zeroAddress;
      if (!native && (asset?.decimals === null || asset?.decimals === undefined)) return <span className="rp-mono">{row.amountRaw} atomic units</span>;
      return <MonoAmount raw={BigInt(row.amountRaw)} decimals={native ? 18 : asset!.decimals!} unit={native ? 'MON' : asset!.symbol} />;
    } },
    { key: 'time', header: 'Time', cell: (row) => <span title={new Date(row.timestamp * 1000).toLocaleString()}>{age(row.timestamp)}</span> },
    { key: 'tx', header: 'Transaction', cell: (row) => <AddressChip value={row.transactionHash} kind="tx" label="Claim transaction" /> },
  ];
  return <Reveal delay={0.12}><div className="rp-hub-card">
    <div className="rp-hub-card-head">
      <span className="rp-card-icon"><FiFileText size={15} aria-hidden /></span>
      <h3>Claim history</h3>
      <span className="rp-count-chip">{claims.length} confirmed</span>
      <div className="rp-card-aside">
        {rows.length > 0 && <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" onClick={exportCsv}><FiDownload size={13} aria-hidden />Export CSV</button>}
      </div>
    </div>
    <DataTable caption="Claim history" columns={columns} rows={rows} rowKey={(row) => row.id}
      empty={<div className="rp-empty-panel rp-empty-compact"><Disc><FiFileText size={18} aria-hidden /></Disc>
        <div><strong>No indexed claims yet</strong><p>Once you claim escrow credits, confirmed transactions appear here with explorer links.</p></div></div>} />
  </div></Reveal>;
}

export function ClaimsTab({ earn }: { earn: Earn }) {
  const { account, state, claimRows, buybackRows, claims, phaseOf, claimRow, releaseBuyback, batch } = earn;
  if (!account) return <Reveal><div className="rp-empty-panel">
    <Disc><RiWallet3Line size={22} aria-hidden /></Disc>
    <strong>Connect a wallet to see your earnings</strong>
    <p>Creator fee escrow credits, buyback releases and the claim history of your Monad Testnet wallet appear here.</p>
  </div></Reveal>;
  if (state.isPending) return <ClaimSkeleton />;
  if (state.isError) return <ErrorState title="Wallet credits are temporarily unavailable" text="Chain or indexer reads failed. Retry in a moment." onRetry={() => void state.refetch()} />;
  return <div className="rp-hub-section">
    <Reveal><div className="rp-hub-card">
      <div className="rp-hub-card-head">
        <span className="rp-card-icon"><RiCoinsLine size={15} aria-hidden /></span>
        <h3>Ready to claim</h3>
        <div className="rp-card-aside">{claimRows.length > 0 && <span className="rp-count-chip">{claimRows.length} asset{claimRows.length === 1 ? '' : 's'}</span>}</div>
      </div>
      {claimRows.length
        ? <div className="rp-claim-list">{claimRows.map((row) =>
          <ClaimRowItem key={row.key} row={row} phase={phaseOf(row.key)} disabled={!!batch} onAction={() => void claimRow(row)} />)}</div>
        : <NoCreditsEmpty />}
    </div></Reveal>
    <Reveal delay={0.06}><div className="rp-hub-card">
      <div className="rp-hub-card-head">
        <span className="rp-card-icon"><FiClock size={15} aria-hidden /></span>
        <h3>Buyback releases</h3>
      </div>
      {buybackRows.length
        ? <div className="rp-claim-list">{buybackRows.map((row) =>
          <ClaimRowItem key={row.key} row={row} phase={phaseOf(row.key)} disabled={!!batch} onAction={() => void releaseBuyback(row)} />)}</div>
        : <BuybackEmpty />}
    </div></Reveal>
    <ClaimHistoryCard claims={claims} assets={state.data?.assets ?? []} />
    {state.data?.issues.map((issue) => <p className="rp-note" role="status" key={issue}>{issue}.</p>)}
    <p className="rp-note">Balances stay grouped by asset. Testnet MON has no assumed USD value.</p>
  </div>;
}
