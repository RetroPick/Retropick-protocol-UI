// One trade-ticket shell for every venue (Curve bonding market, Kuru orderbook, DEMO preview).
// Venue adapters own execution; this file only renders controls and states.
import { useState, type ReactNode } from 'react';
import { formatUnits } from 'viem';
import { Check, ChevronDown, CircleDashed, Loader2, X } from 'lucide-react';
import { SegmentedControl, DemoBadge, Hint, cx } from '@/components/trading/primitives';
import type { TxPhase } from '@/services/tx-pipeline';

export type OrderKind = 'Market' | 'Limit';
export type Side = 'Buy' | 'Sell';

export const LIMIT_LOCKED_REASON = 'Limit orders unlock when this market graduates to Kuru.';

export function TicketShell({ title = 'Trade', venue, demo, kind, onKind, limitDisabledReason, side, onSide, sideDisabled, sync, children, cta, status, footer, testId = 'trade-ticket' }: {
  title?: string; venue: string; demo?: boolean;
  kind: OrderKind; onKind: (k: OrderKind) => void; limitDisabledReason?: string | null;
  side: Side; onSide: (s: Side) => void; sideDisabled?: boolean;
  sync?: ReactNode; children: ReactNode; cta: ReactNode; status?: ReactNode; footer?: ReactNode; testId?: string;
}) {
  return <section className="rp-ticket" aria-label={`${title} ticket`} data-testid={testId} data-order-kind={kind} data-side={side}>
    {!sideDisabled && <SegmentedControl label="Trade side" value={side} onChange={onSide} size="md" className="rp-side" options={[
      { value: 'Buy', label: 'Buy', tone: 'buy' }, { value: 'Sell', label: 'Sell', tone: 'sell' },
    ]}/>}
    <SegmentedControl label="Order type" value={kind} onChange={onKind} options={[
      { value: 'Market', label: 'Market' },
      { value: 'Limit', label: 'Limit', disabled: !!limitDisabledReason, reason: limitDisabledReason ?? undefined },
    ]}/>
    {sync && <div className="rp-ticket-sync" role="status">{sync}</div>}
    <div className="rp-ticket-body">{children}</div>
    {status}
    <div className="rp-ticket-cta">{cta}</div>
    {footer && <div className="rp-ticket-foot">{footer}</div>}
  </section>;
}

const PCTS = [25, 50, 75, 100] as const;

/** Amount input with exact bigint percentage presets (pct × balance / 100, truncated). */
export function AmountField({ label, value, onChange, unit, balanceRaw, decimals, maxDisabledReason, testId, balanceLabel = 'Balance' }: {
  label: string; value: string; onChange: (v: string) => void; unit: string; balanceRaw?: bigint | null; decimals: number; maxDisabledReason?: string; testId?: string; balanceLabel?: string;
}) {
  const id = `amt-${testId ?? label.replace(/\W+/g, '-').toLowerCase()}`;
  return <div className="rp-field">
    <div className="rp-field-top"><label htmlFor={id}>{label}</label>{balanceRaw != null && <span className="rp-muted">{balanceLabel} {trim(formatUnits(balanceRaw, decimals))} {unit}</span>}</div>
    <div className="rp-input"><input id={id} data-testid={testId} inputMode="decimal" autoComplete="off" placeholder="0.0" value={value} onChange={(e) => onChange(e.target.value.replace(/,/g, '.'))} aria-describedby={`${id}-unit`}/><span id={`${id}-unit`} className="rp-input-unit">{unit}</span></div>
    <div className="rp-pcts" role="group" aria-label={`${label} presets`}>
      {PCTS.map((pct) => {
        const disabled = balanceRaw == null || balanceRaw === 0n || (pct === 100 && !!maxDisabledReason);
        const button = <button key={pct} type="button" className="rp-chip" disabled={disabled}
          onClick={() => balanceRaw != null && onChange(trim(formatUnits(balanceRaw * BigInt(pct) / 100n, decimals)))}>{pct === 100 ? 'Max' : `${pct}%`}</button>;
        return pct === 100 && maxDisabledReason ? <Hint key={pct} text={maxDisabledReason}><span tabIndex={0}>{button}</span></Hint> : button;
      })}
    </div>
  </div>;
}

export function trim(text: string): string {
  return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text;
}

/** Slippage summary with an expandable preset picker (existing values only; applied as an exact minimum). */
export function SlippageControl({ bps, onChange, options = ['10', '50', '200'], note = 'Applied as an exact minimum output on the signed transaction.' }: { bps: string; onChange: (bps: string) => void; options?: string[]; note?: string }) {
  const [open, setOpen] = useState(false);
  const pct = (b: string) => `${(Number(b) / 100).toFixed(Number(b) % 100 === 0 ? 0 : Number(b) % 10 === 0 ? 1 : 2)}%`;
  return <div className="rp-slip">
    <div className="rp-row"><span>Slippage</span><button type="button" className="rp-link" aria-expanded={open} aria-controls="rp-slip-options" onClick={() => setOpen(!open)}>{pct(bps)} <span>Adjust</span><ChevronDown size={12} aria-hidden/></button></div>
    {open && <div id="rp-slip-options"><SegmentedControl label="Slippage tolerance" size="sm" value={bps} onChange={(v) => { onChange(v); setOpen(false); }} options={options.map((o) => ({ value: o, label: pct(o) }))}/><p className="rp-note">{note}</p></div>}
  </div>;
}

export function QuoteLines({ rows }: { rows: Array<[ReactNode, ReactNode, string?]> }) {
  return <dl className="rp-quote">{rows.map(([k, v, testId], i) => <div key={i} className="rp-row"><dt>{k}</dt><dd data-testid={testId}>{v}</dd></div>)}</dl>;
}

export type TicketStage = 'review' | 'approval' | 'signature' | 'submitted' | 'confirming' | 'confirmed' | 'indexed' | 'completed' | 'failed' | 'rejected';

export function stageFromPhase(phase: TxPhase | { kind: 'idle' }): TicketStage | null {
  switch (phase.kind) {
    case 'idle': return null;
    case 'preparing': case 'simulating': return 'review';
    case 'approving': return 'approval';
    case 'awaiting-signature': return 'signature';
    case 'broadcasting': return 'submitted';
    case 'confirming': return 'confirming';
    case 'success': return 'confirmed';
    case 'failed': return phase.failure === 'rejected' ? 'rejected' : 'failed';
  }
}

const STEPS: Array<[TicketStage, string]> = [['review', 'Review'], ['approval', 'Approval'], ['signature', 'Confirm in wallet'], ['submitted', 'Submitted'], ['confirming', 'Confirming'], ['confirmed', 'Confirmed on-chain'], ['indexed', 'Indexed'], ['completed', 'Completed']];

/**
 * Inline transaction progress. `indexed` is only reached when the caller has matched the specific record
 * (tx hash / order id) in the indexer projection — never from indexer block height alone.
 */
export function TxProgress({ stage, message, hash, approvalNeeded, indexable = true }: { stage: TicketStage | null; message?: string | null; hash?: string | null; approvalNeeded?: boolean; indexable?: boolean }) {
  if (!stage) return null;
  if (stage === 'rejected') return <div className="rp-tx rp-tx-neutral" role="status" data-stage="rejected">Request rejected in your wallet. Nothing was submitted.</div>;
  if (stage === 'failed') return <div className="rp-tx rp-tx-fail" role="alert" data-stage="failed"><X size={14} aria-hidden/>{message ?? 'Transaction failed.'}</div>;
  const steps = STEPS.filter(([s]) => (s !== 'approval' || approvalNeeded || stage === 'approval') && (s !== 'indexed' || indexable));
  const at = steps.findIndex(([s]) => s === stage);
  return <div className="rp-tx" role="status" aria-live="polite" data-stage={stage}>
    <ol>{steps.map(([s, label], i) => <li key={s} className={cx(i < at && 'done', i === at && 'now')}>{i < at || stage === 'completed' ? <Check size={12} aria-hidden/> : i === at ? <Loader2 size={12} className="rp-spin" aria-hidden/> : <CircleDashed size={12} aria-hidden/>}<span>{label}</span></li>)}</ol>
    {stage === 'confirmed' && indexable && <p className="rp-note">Confirmed on-chain, awaiting indexing.</p>}
    {message && <p className="rp-note">{message}</p>}
    {hash && <p className="rp-note rp-mono">{hash.slice(0, 10)}…{hash.slice(-6)}</p>}
  </div>;
}
