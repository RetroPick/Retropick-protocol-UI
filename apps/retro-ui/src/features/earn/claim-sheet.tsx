'use client';
// Claim sheet (bags.fm claimable-positions pattern): per-source rows with source badges, per-row
// claim actions and a sequential "Claim all" batch. Each claim is its own wallet signature —
// no batching contract exists and none is implied.
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RiLoader4Line } from 'react-icons/ri';
import { EmptyState } from '@/components/trading/primitives';
import { useHideValues } from './earn-hero';
import type { ClaimRow, RowPhase, useEarnWallet } from './use-claims';

type Earn = ReturnType<typeof useEarnWallet>;

const ACTIVE_PHASES = new Set(['preparing', 'approving', 'simulating', 'awaiting-signature', 'broadcasting', 'confirming']);

function phaseLabel(phase: RowPhase, actionLabel: string): string {
  if (phase.kind === 'failed') return 'Retry';
  if (phase.kind === 'success') return 'Done';
  if (phase.kind === 'idle') return actionLabel;
  if (phase.kind === 'awaiting-signature') return 'Confirm in wallet…';
  if (phase.kind === 'broadcasting') return 'Broadcasting…';
  if (phase.kind === 'confirming') return 'Confirming…';
  if (phase.kind === 'approving') return 'Approving…';
  if (phase.kind === 'simulating') return 'Simulating…';
  return 'Preparing…';
}

/** One claimable row: token glyph, amount, source badge, action with inline tx phase. */
export function ClaimRowItem({ row, phase, onAction, disabled }: {
  row: ClaimRow; phase: RowPhase; onAction: () => void; disabled?: boolean;
}) {
  const [hidden] = useHideValues();
  const busy = ACTIVE_PHASES.has(phase.kind);
  return <div className="rp-claim-row" data-phase={phase.kind} title={phase.kind === 'failed' ? phase.reason : undefined}>
    <span className="rp-glyph" style={{ color: row.color, background: `${row.color}1f` }} aria-hidden>{row.glyph}</span>
    <div className="rp-claim-info">
      <strong>{row.symbol}</strong>
      <span className="rp-claim-source">{row.source}</span>
    </div>
    <div className="rp-claim-amount">
      <span className="rp-mono">{hidden ? '•••' : row.amountLabel}</span>
      <small>{row.kind === 'buyback-release' ? 'releasable now' : 'in escrow'}</small>
    </div>
    <button type="button" className="rp-btn rp-btn-sm" disabled={disabled || busy} onClick={onAction}>
      {busy && <RiLoader4Line size={13} className="rp-spin" aria-hidden />}
      {phaseLabel(phase, row.actionLabel)}
    </button>
  </div>;
}

export function ClaimSheet({ open, onOpenChange, earn }: { open: boolean; onOpenChange: (open: boolean) => void; earn: Earn }) {
  const { claimRows, buybackRows, phaseOf, claimRow, releaseBuyback, claimAll, batch, wallet } = earn;
  const batchProgress = batch ? `Claiming ${Math.min(batch.done + 1, batch.total)} of ${batch.total}…` : null;
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="rp-claim-sheet">
      <DialogHeader>
        <DialogTitle>Claimable positions</DialogTitle>
        <DialogDescription>Per-asset escrow credits for your wallet. Every claim is a separate transaction you sign.</DialogDescription>
      </DialogHeader>
      {claimRows.length
        ? <div className="rp-claim-list">{claimRows.map((row) =>
          <ClaimRowItem key={row.key} row={row} phase={phaseOf(row.key)} disabled={!!batch} onAction={() => void claimRow(row)} />)}</div>
        : <EmptyState title="Nothing ready to claim" text="Creator fee credits appear here while your launches trade on the bonding curve." />}
      {buybackRows.length > 0 && <div className="rp-sheet-group">
        <h4>Buyback releases · one step away</h4>
        <p className="rp-note">Releasing credits the fee escrow; claim the token from the list above afterwards.</p>
        <div className="rp-claim-list">{buybackRows.map((row) =>
          <ClaimRowItem key={row.key} row={row} phase={phaseOf(row.key)} disabled={!!batch} onAction={() => void releaseBuyback(row)} />)}</div>
      </div>}
      <DialogFooter>
        <p className="rp-note">Testnet MON has no assumed USD value.</p>
        <button type="button" className="rp-btn rp-btn-primary" disabled={!claimRows.length || !!batch || !wallet.wallet} onClick={() => void claimAll()}>
          {batchProgress ?? `Claim all${claimRows.length ? ` (${claimRows.length})` : ''}`}
        </button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
