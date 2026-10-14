// RetroPick trading design-system primitives (Section 4). Built on installed radix-ui + lucide only.
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Tooltip as RTooltip } from 'radix-ui';
import { AlertTriangle, Check, Copy, ExternalLink, Info, RefreshCw, SearchX } from 'lucide-react';
import { explorer } from '@retropick/launchpad-sdk/chain';
import { lifecycleLabel, shortHex, type Lifecycle } from '@/lib/view-models/token-terminal';
import { quoteAssetByAddress } from '@retropick/launchpad-sdk/quote-assets';
import { PairAvatars } from './pair-identity';
import { TokenImage } from '@/components/product/token-image';
import './trading.css';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

/** Accessible radiogroup segmented control: arrow keys move + select, Home/End jump, disabled options are skipped. */
export function SegmentedControl<T extends string>({ label, options, value, onChange, size = 'md', className }: {
  label: string; value: T; onChange: (value: T) => void; size?: 'sm' | 'md'; className?: string;
  options: Array<{ value: T; label: ReactNode; disabled?: boolean; reason?: string; tone?: 'buy' | 'sell' }>;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
  const onKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const pos = enabled.indexOf(index);
    let next: number | undefined;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = enabled[(pos + 1) % enabled.length];
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = enabled[(pos - 1 + enabled.length) % enabled.length];
    else if (event.key === 'Home') next = enabled[0];
    else if (event.key === 'End') next = enabled.at(-1);
    if (next === undefined) return;
    event.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };
  return <div role="radiogroup" aria-label={label} className={cx('rp-seg', `rp-seg-${size}`, className)}>
    {options.map((o, i) => {
      const selected = o.value === value;
      const button = <button key={o.value} ref={(el) => { refs.current[i] = el; }} type="button" role="radio" aria-checked={selected}
        aria-disabled={o.disabled || undefined} data-tone={o.tone} tabIndex={selected ? 0 : -1}
        className={cx('rp-seg-item', selected && 'is-selected')}
        onClick={() => { if (!o.disabled) onChange(o.value); }} onKeyDown={(e) => onKey(e, i)}>{o.label}</button>;
      return o.disabled && o.reason ? <Hint key={o.value} text={o.reason}>{button}</Hint> : button;
    })}
  </div>;
}

/** Tooltip wrapper (radix). Content is also exposed via aria-describedby for screen readers. */
export function Hint({ text, children }: { text: ReactNode; children: ReactNode }) {
  return <RTooltip.Provider delayDuration={150}><RTooltip.Root><RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
    <RTooltip.Portal><RTooltip.Content className="rp-tooltip" sideOffset={6}>{text}<RTooltip.Arrow className="rp-tooltip-arrow"/></RTooltip.Content></RTooltip.Portal></RTooltip.Root></RTooltip.Provider>;
}

export function InfoHint({ text, label = 'Definition' }: { text: ReactNode; label?: string }) {
  return <Hint text={text}><button type="button" className="rp-info" aria-label={label}><Info size={12} aria-hidden/></button></Hint>;
}

export function Metric({ label, value, unit, note, definition, testId }: { label: string; value: ReactNode; unit?: string; note?: ReactNode; definition?: ReactNode; testId?: string }) {
  return <div className="rp-metric" data-testid={testId}>
    <dt>{label}{definition && <InfoHint text={definition} label={`About ${label}`}/>}</dt>
    <dd><span className="rp-metric-value">{value}</span>{unit && value !== '—' && <span className="rp-metric-unit">{unit}</span>}</dd>
    {note && <small>{note}</small>}
  </div>;
}

export function MetricStrip({ children, label, variant = 'primary' }: { children: ReactNode; label: string; variant?: 'primary' | 'secondary' }) {
  return <dl className={cx('rp-metric-strip', `rp-metric-strip-${variant}`)} aria-label={label}>{children}</dl>;
}

/** Copy + explorer chip. Demo identifiers (demo:…) are shown but never linked to an explorer. */
export function AddressChip({ value, kind = 'address', label, full = false }: { value: string | null | undefined; kind?: 'address' | 'tx'; label?: string; full?: boolean }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (!copied) return; const t = setTimeout(() => setCopied(false), 1400); return () => clearTimeout(t); }, [copied]);
  if (!value) return <span className="rp-address rp-muted">—</span>;
  const chain = /^0x[0-9a-fA-F]{40}$|^0x[0-9a-fA-F]{64}$/.test(value);
  const text = value.startsWith('demo:') ? `demo·${value.slice(5, 9)}…${value.slice(-4)}` : full ? value : shortHex(value);
  const copy = () => { void navigator.clipboard?.writeText(value).then(() => setCopied(true), () => setCopied(false)); };
  return <span className="rp-address" data-address={value}>
    <span className="rp-mono" title={value}>{text}</span>
    <button type="button" className="rp-icon-btn" onClick={copy} aria-label={copied ? `${label ?? 'Address'} copied` : `Copy ${label ?? (kind === 'tx' ? 'transaction hash' : 'address')}`}>
      {copied ? <Check size={12} aria-hidden/> : <Copy size={12} aria-hidden/>}
    </button>
    {chain && <a className="rp-icon-btn" href={explorer(value, kind)} target="_blank" rel="noreferrer" aria-label={`Open ${label ?? value} in Monad Explorer`}><ExternalLink size={12} aria-hidden/></a>}
    <span className="rp-sr" aria-live="polite">{copied ? 'Copied' : ''}</span>
  </span>;
}

export function LifecycleBadge({ lifecycle }: { lifecycle: Lifecycle }) {
  return <span className={cx('rp-badge', `rp-life-${lifecycle.toLowerCase().replaceAll('_', '-')}`)} data-lifecycle={lifecycle}><span className="rp-dot" aria-hidden/>{lifecycleLabel[lifecycle]}</span>;
}

export function PairBadge({ base, quote }: { base: string; quote: string }) {
  return <span className="rp-badge rp-pair" aria-label={`Pair ${base} against ${quote}`}>{base}<span aria-hidden>/</span>{quote}</span>;
}

/** DEMO/SIMULATED provenance label. Rendered on every simulated surface. */
export function DemoBadge({ text = 'DEMO' }: { text?: 'DEMO' | 'SIMULATED' | string }) {
  return <span className="rp-badge rp-demo" data-provenance="demo">{text}</span>;
}

export function TokenIdentity({ name, symbol, icon, logo, quote, size = 'md', children }: { quote?: { address: string | null; symbol: string }; name: string; symbol: string; icon: { glyph: string; color: string }; logo?: string | null; size?: 'sm' | 'md' | 'lg'; children?: ReactNode }) {
  return <div className={cx('rp-identity', `rp-identity-${size}`)}>
    {quote ? <PairAvatars baseSymbol={symbol} baseLogo={logo} quote={quoteAssetByAddress(10143, quote.address)} quoteSymbol={quote.symbol} size={size === 'lg' ? 56 : 32}/> : <TokenImage src={logo} className="rp-avatar" alt="" width={size === 'lg' ? 56 : 32} height={size === 'lg' ? 56 : 32}
      fallback={<span className="rp-avatar" style={{ color: icon.color, background: `${icon.color}1f` }} aria-hidden>{icon.glyph}</span>}/>}

    <div className="rp-identity-text"><div className="rp-identity-name"><strong>{name}</strong><span className="rp-symbol">{symbol}</span></div>{children}</div>
  </div>;
}

export function EmptyState({ title, text, action }: { title: string; text?: ReactNode; action?: ReactNode }) {
  return <div className="rp-empty" role="status"><SearchX size={22} aria-hidden/><strong>{title}</strong>{text && <p>{text}</p>}{action}</div>;
}

export function ErrorState({ title, text, onRetry, action }: { title: string; text?: ReactNode; onRetry?: () => void; action?: ReactNode }) {
  return <div className="rp-error" role="alert"><AlertTriangle size={18} aria-hidden/><div><strong>{title}</strong>{text && <p>{text}</p>}</div>
    {onRetry && <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" onClick={onRetry}><RefreshCw size={13} aria-hidden/>Retry</button>}{action}</div>;
}

export function FreshnessIndicator({ freshness, demo }: { freshness: { indexedBlock: string; lagBlocks: number; stale: boolean } | null; demo?: boolean }) {
  if (!freshness) return <span className="rp-fresh rp-fresh-unknown" role="status"><span className="rp-dot" aria-hidden/>Indexer history unavailable</span>;
  return <span className={cx('rp-fresh', freshness.stale ? 'rp-fresh-stale' : 'rp-fresh-ok')} role="status" title={`Indexed through block ${freshness.indexedBlock}`}>
    <span className="rp-dot" aria-hidden/>{freshness.stale ? `Indexer delayed · ${freshness.lagBlocks} blocks behind` : `Indexed · lag ${freshness.lagBlocks}`}{demo ? ' · SIMULATED' : ''}
  </span>;
}

export function SkeletonLine({ width = '100%', height = 14, label }: { width?: string | number; height?: number; label?: string }) {
  return <span className="rp-skel" style={{ width, height }} aria-hidden={label ? undefined : true} aria-label={label} role={label ? 'status' : undefined}/>;
}

export interface Column<T> { key: string; header: ReactNode; cell: (row: T, index: number) => ReactNode; align?: 'left' | 'right'; priority?: 1 | 2 | 3; mobileLabel?: string }

/** Dense table on desktop; labelled rows (cards) on narrow screens. Real table semantics are kept for screen readers. */
export function DataTable<T>({ caption, columns, rows, rowKey, empty, rowTone, footer }: {
  caption: string; columns: Column<T>[]; rows: T[]; rowKey: (row: T, index: number) => string; empty?: ReactNode; rowTone?: (row: T) => string | undefined; footer?: ReactNode;
}) {
  const id = useId();
  if (!rows.length) return <>{empty}{footer}</>;
  return <div className="rp-table-wrap"><table className="rp-table" aria-describedby={`${id}-cap`}>
    <caption id={`${id}-cap`} className="rp-sr">{caption}</caption>
    <thead><tr>{columns.map((c) => <th key={c.key} scope="col" className={cx(c.align === 'right' && 'rp-right', c.priority && `rp-p${c.priority}`)}>{c.header}</th>)}</tr></thead>
    <tbody>{rows.map((row, i) => <tr key={rowKey(row, i)} data-tone={rowTone?.(row)}>{columns.map((c) => <td key={c.key} data-label={c.mobileLabel ?? (typeof c.header === 'string' ? c.header : c.key)} className={cx(c.align === 'right' && 'rp-right', c.priority && `rp-p${c.priority}`)}>{c.cell(row, i)}</td>)}</tr>)}</tbody>
  </table>{footer}</div>;
}

export function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (!copied) return; const t = setTimeout(() => setCopied(false), 1400); return () => clearTimeout(t); }, [copied]);
  return [copied, useCallback((text: string) => { void navigator.clipboard?.writeText(text).then(() => setCopied(true)); }, [])];
}

export { cx };
