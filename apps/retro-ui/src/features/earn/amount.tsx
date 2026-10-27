'use client';
// Shared presentation helpers for the Earn hub tab interiors: trimmed mono amounts with the exact
// value preserved on hover + click-to-copy, and a staggered motion reveal for section cards.
import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { FiCheck, FiCopy } from 'react-icons/fi';
import { formatUnits } from 'viem';
import { exactAmount } from '@/lib/live/format';

/** Trimmed mono amount: display via exactAmount, exact value kept as the hover title and copy target. */
export function MonoAmount({ raw, decimals, digits = 6, unit }: {
  raw: bigint | string | null | undefined; decimals: number; digits?: number; unit?: string;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (!copied) return; const t = setTimeout(() => setCopied(false), 1400); return () => clearTimeout(t); }, [copied]);
  if (raw === null || raw === undefined) return <span className="rp-mono">—</span>;
  let display = '—';
  let exact = '';
  try {
    exact = formatUnits(BigInt(raw), decimals);
    display = exactAmount(raw, decimals, digits);
  } catch { /* unparseable raw — show dash */ }
  const copy = () => { if (exact) void navigator.clipboard?.writeText(exact).then(() => setCopied(true), () => undefined); };
  return <span className="rp-amount">
    <span className="rp-mono" title={exact ? `Exact: ${exact}${unit ? ` ${unit}` : ''}` : undefined}>{display}</span>
    {unit && <small>{unit}</small>}
    {exact && <button type="button" className="rp-amount-copy-btn" aria-label={`Copy exact amount ${exact} ${unit ?? ''}`}
      onClick={copy}>{copied ? <FiCheck size={11} className="rp-amount-copied" aria-hidden /> : <FiCopy size={11} className="rp-amount-copy" aria-hidden />}</button>}
    <span className="rp-sr" aria-live="polite">{copied ? 'Copied' : ''}</span>
  </span>;
}

/** Staggered entrance for tab interior cards. */
export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay, ease: [0.16, 1, 0.3, 1] }}>
    {children}
  </motion.div>;
}
