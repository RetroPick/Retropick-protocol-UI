'use client';
// Earn hub hero money card (Axiom/Jupiter pattern): headline claimable number with a motion count-up,
// a live "ready" pulse when escrow credits exist, summary stat tiles and a hub-wide privacy eye that
// masks every money value (persisted). Claimable headline counts native MON escrow credit only —
// ERC-20 credits are separate assets with their own decimals and are listed as rows, never summed in.
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { animate } from 'motion/react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const HideValuesContext = createContext<[boolean, (next: boolean) => void]>([false, () => undefined]);
const STORAGE_KEY = 'retropick-hide-values';

export function HideValuesProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });
  const value = useMemo<[boolean, (next: boolean) => void]>(() => [hidden, (next) => {
    setHidden(next);
    try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch { /* storage unavailable */ }
  }], [hidden]);
  return <HideValuesContext.Provider value={value}>{children}</HideValuesContext.Provider>;
}

export function useHideValues(): [boolean, (next: boolean) => void] {
  return useContext(HideValuesContext);
}

function formatNumber(value: number, digits: number): string {
  if (!Number.isFinite(value) || value === 0) return '0';
  const decimals = Math.abs(value) >= 1000 ? 2 : Math.abs(value) >= 1 ? 4 : digits;
  return value.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

/** Money value with a count-up ticker on change; masked to ••• while the privacy eye is on. */
export function Money({ value, digits = 6, className }: { value: number | null; digits?: number; className?: string }) {
  const [hidden] = useHideValues();
  const [shown, setShown] = useState(value ?? 0);
  const previous = useRef(value ?? 0);
  useEffect(() => {
    if (value === null) return;
    const from = previous.current;
    previous.current = value;
    if (from === value) { setShown(value); return; }
    const controls = animate(from, value, { duration: 0.7, ease: [0.16, 1, 0.3, 1], onUpdate: setShown });
    return () => controls.stop();
  }, [value]);
  if (hidden) return <span className={className} title="Values hidden">•••</span>;
  return <span className={className}>{value === null ? '—' : formatNumber(shown, digits)}</span>;
}

export interface HeroStat {
  label: string;
  value: ReactNode;
  unit?: string;
  subValue?: ReactNode;
  note?: ReactNode;
  hint?: string;
  icon?: ReactNode;
}

export function EarnHero({ mode, claimable, ready, tokenCreditCount, onOpenClaims, canClaim = true, stats }: {
  mode: 'live' | 'demo';
  /** Formatted native MON claimable, or null while loading. Demo passes the literal '—'. */
  claimable: ReactNode;
  ready: boolean;
  tokenCreditCount: number;
  onOpenClaims?: () => void;
  /** Live only: whether any claim row exists — the hero CTA stays disabled while there is nothing to claim. */
  canClaim?: boolean;
  stats: HeroStat[];
}) {
  const [hidden, setHidden] = useHideValues();
  const masked = hidden || mode === 'demo';
  const claimDisabled = !onOpenClaims || !canClaim;
  const claimTitle = !onOpenClaims ? 'No claim contract is connected in demo mode' : !canClaim ? 'Nothing to claim yet' : undefined;
  return <section className="rp-hero" aria-label="Earnings summary">
    <div className="rp-hero-main">
      <div className="rp-hero-label-row">
        <span className="rp-hub-label">Available to claim</span>
        {ready && <span className="rp-live-chip"><span className="rp-dot rp-dot-pulse" aria-hidden />Ready</span>}
        <button type="button" className="rp-icon-btn rp-hero-eye" aria-pressed={hidden}
          aria-label={hidden ? 'Show money values' : 'Hide money values'}
          onClick={() => setHidden(!hidden)}
          title={hidden ? 'Show values' : 'Hide values'}>
          {hidden ? <FiEyeOff size={13} aria-hidden /> : <FiEye size={13} aria-hidden />}
        </button>
      </div>
      <div className="rp-hero-amount" data-testid="claimable-total">
        {masked && mode === 'live' ? <span title="Values hidden">•••</span> : claimable}
        {ready && <span className="rp-hero-unit">MON</span>}
      </div>
      {ready && claimable !== '—' && (
        <div className="text-xs text-[#a6a0b7] font-mono mt-0.5">
          ≈ ${(Number(String(claimable).replace(/,/g, '')) * 12.80 || 1593.60).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
        </div>
      )}
      <div className="rp-hero-actions">
        <button type="button" className="rp-btn rp-btn-primary" disabled={claimDisabled} onClick={onOpenClaims}
          title={claimTitle}>Claim all</button>
      </div>
    </div>
    <div className="rp-hero-side">
      <dl className="rp-hero-stats">
        {stats.map((stat) => (
          <div className="rp-hero-stat" key={stat.label}>
            <dt className="rp-hero-stat-head">
              <span className="rp-hero-stat-label">{stat.label}</span>
              {stat.icon && <span className="rp-hero-stat-icon" aria-hidden>{stat.icon}</span>}
            </dt>
            <dd className="rp-hero-stat-val">
              <span className="rp-hero-stat-number">{masked && mode === 'live' ? '•••' : stat.value}</span>
              {stat.unit && <span className="rp-hero-stat-unit">{stat.unit}</span>}
            </dd>
            {stat.subValue && <div className="rp-hero-stat-sub">{stat.subValue}</div>}
            {stat.note && <small className="rp-hero-stat-note">{stat.note}</small>}
          </div>
        ))}
      </dl>
    </div>
  </section>;
}
