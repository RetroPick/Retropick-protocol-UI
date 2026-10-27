import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Info,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Shield,
  Clock,
  Coins,
  TrendingUp,
} from 'lucide-react';
import {
  KuruPoolMarket,
  KuruVault,
  KuruPosition,
  formatUsd,
  formatNumber,
} from './kuru-data';
import {
  VolatilityStrategy,
  calculateDefaultPriceRange,
  generateDistributionBars,
  calculateDepositAmounts,
  DistributionBar,
} from './liquidity-math';

interface AddLiquidityModalProps {
  pool: KuruPoolMarket;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPos: KuruPosition) => void;
}

export function AddLiquidityModal({ pool, isOpen, onClose, onSuccess }: AddLiquidityModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [strategy, setStrategy] = useState<VolatilityStrategy>('spot');
  const [feeTier, setFeeTier] = useState<number>(0.05);

  const [minPrice, setMinPrice] = useState<number>(2455.55);
  const [maxPrice, setMaxPrice] = useState<number>(2515.2);
  const [baseInput, setBaseInput] = useState<string>('0.05');
  const [quoteInput, setQuoteInput] = useState<string>('125.0');
  const [activeInput, setActiveInput] = useState<'base' | 'quote'>('base');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSuccess(false);
      setIsSubmitting(false);
      return;
    }
    const range = calculateDefaultPriceRange(pool.currentPrice, strategy, feeTier);
    setMinPrice(range.minPrice);
    setMaxPrice(range.maxPrice);
  }, [isOpen, pool.currentPrice, strategy, feeTier]);

  useEffect(() => {
    const baseVal = parseFloat(baseInput) || 0;
    const quoteVal = parseFloat(quoteInput) || 0;
    if (activeInput === 'base' && baseVal > 0) {
      const calc = calculateDepositAmounts(baseVal, 0, pool.currentPrice, minPrice, maxPrice, 'base');
      setQuoteInput(calc.quoteRequired.toString());
    } else if (activeInput === 'quote' && quoteVal > 0) {
      const calc = calculateDepositAmounts(0, quoteVal, pool.currentPrice, minPrice, maxPrice, 'quote');
      setBaseInput(calc.baseRequired.toString());
    }
  }, [baseInput, quoteInput, activeInput, pool.currentPrice, minPrice, maxPrice]);

  if (!isOpen) return null;

  const distributionBars: DistributionBar[] = generateDistributionBars(
    minPrice,
    maxPrice,
    pool.currentPrice,
    strategy,
    20
  );

  const handleDeposit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);
      const baseNum = parseFloat(baseInput) || 0.05;
      const quoteNum = parseFloat(quoteInput) || 125.0;
      const totalUsd = baseNum * pool.currentPrice + quoteNum;
      const newPos: KuruPosition = {
        id: `pos-${Date.now()}`,
        type: 'pool',
        marketId: pool.id,
        marketSymbol: pool.symbol,
        strategy,
        feeTierPercent: feeTier,
        minPrice,
        maxPrice,
        currentPriceAtDeposit: pool.currentPrice,
        baseDeposited: baseNum,
        quoteDeposited: quoteNum,
        baseTokenSymbol: pool.baseToken.symbol,
        quoteTokenSymbol: pool.quoteToken.symbol,
        totalValueUsd: totalUsd,
        earnedFeesUsd: 0,
        status: 'in-range',
        createdAt: 'Just now',
      };
      setTimeout(() => {
        onSuccess(newPos);
        onClose();
      }, 1200);
    }, 900);
  };

  return (
    <div className="rp-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="rp-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="rp-modal-header">
          <div className="rp-modal-title-row">
            <div className="rp-pair-icons">
              <span className="rp-token-dot" style={{ backgroundColor: pool.baseToken.iconBg }}>
                {pool.baseToken.iconText || pool.baseToken.symbol[0]}
              </span>
              <span className="rp-token-dot" style={{ backgroundColor: pool.quoteToken.iconBg }}>
                {pool.quoteToken.iconText || pool.quoteToken.symbol[0]}
              </span>
            </div>
            <div>
              <h3>Add Liquidity · {pool.symbol}</h3>
              <p className="rp-modal-subtitle">
                Market {pool.id} · Monad Testnet CLOB AMM
              </p>
            </div>
          </div>
          <button className="rp-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Stepper Tabs */}
        <div className="rp-modal-steps">
          <button
            className={`rp-step-btn ${step === 1 ? 'active' : ''}`}
            onClick={() => setStep(1)}
          >
            <span>1</span> Strategy & Fee
          </button>
          <button
            className={`rp-step-btn ${step === 2 ? 'active' : ''}`}
            onClick={() => setStep(2)}
          >
            <span>2</span> Range & Deposit
          </button>
        </div>

        {/* Step 1: Strategy & Fee */}
        {step === 1 && (
          <div className="rp-modal-content">
            <label className="rp-section-label">Select Strategy</label>
            <div className="rp-strategy-grid">
              {[
                {
                  id: 'spot',
                  name: 'Spot Strategy',
                  tagline: 'Standard CLOB distribution',
                  desc: 'Places balanced limit orders evenly across the price range. Great for general pairs.',
                },
                {
                  id: 'curve',
                  name: 'Curve Strategy',
                  tagline: 'Concentrated around mid-price',
                  desc: 'Concentrates liquidity tighter around current price for maximum volume efficiency.',
                },
                {
                  id: 'bidask',
                  name: 'Bid / Ask Skew',
                  tagline: 'Wide perimeter bounds',
                  desc: 'Steeper book depth towards the range edges, ideal for mean-reverting volatile assets.',
                },
              ].map((s) => (
                <div
                  key={s.id}
                  onClick={() => setStrategy(s.id as VolatilityStrategy)}
                  className={`rp-strategy-card ${strategy === s.id ? 'selected' : ''}`}
                >
                  <div className="rp-strategy-head">
                    <span className="rp-strategy-name">{s.name}</span>
                    {strategy === s.id && <CheckCircle2 size={16} className="text-pos" />}
                  </div>
                  <span className="rp-strategy-tagline">{s.tagline}</span>
                  <p className="rp-strategy-desc">{s.desc}</p>
                </div>
              ))}
            </div>

            <label className="rp-section-label" style={{ marginTop: '16px' }}>Fee Tier</label>
            <div className="rp-fee-grid">
              {[
                { fee: 0.01, label: '0.01%', note: 'Stable' },
                { fee: 0.05, label: '0.05%', note: 'Recommended' },
                { fee: 0.3, label: '0.30%', note: 'Volatile' },
                { fee: 1.0, label: '1.00%', note: 'Exotic' },
              ].map((f) => (
                <button
                  key={f.fee}
                  type="button"
                  onClick={() => setFeeTier(f.fee)}
                  className={`rp-fee-btn ${feeTier === f.fee ? 'selected' : ''}`}
                >
                  <span className="rp-fee-val">{f.label}</span>
                  <span className="rp-fee-note">{f.note}</span>
                </button>
              ))}
            </div>

            <div className="rp-modal-actions">
              <button className="rp-btn rp-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button className="rp-btn rp-btn-primary" onClick={() => setStep(2)}>
                Next: Set Price Range <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Range & Deposit */}
        {step === 2 && (
          <div className="rp-modal-content">
            <div className="rp-price-banner">
              <span>Current Price:</span>
              <strong className="text-pos">${formatNumber(pool.currentPrice, 2)}</strong>
              <span className="rp-dim">({pool.quoteToken.symbol} per {pool.baseToken.symbol})</span>
            </div>

            {/* Distribution Visualizer */}
            <div className="rp-dist-box">
              <div className="rp-dist-head">
                <span>Orderbook Depth Distribution ({strategy})</span>
                <span className="rp-dist-legend">
                  <span className="dot bid" /> Bids <span className="dot ask" /> Asks
                </span>
              </div>
              <div className="rp-dist-bars">
                {distributionBars.map((b, idx) => (
                  <div
                    key={idx}
                    className={`rp-bar ${b.type}`}
                    style={{ height: `${b.heightPercent}%` }}
                    title={`Price: $${b.label}`}
                  />
                ))}
              </div>
              <div className="rp-dist-range-labels">
                <span>Min: ${minPrice.toFixed(2)}</span>
                <span>Mid: ${pool.currentPrice.toFixed(2)}</span>
                <span>Max: ${maxPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Price Inputs */}
            <div className="rp-range-inputs">
              <div className="rp-input-group">
                <label>Min Price ({pool.quoteToken.symbol})</label>
                <input
                  type="number"
                  step="0.01"
                  value={minPrice}
                  onChange={(e) => setMinPrice(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="rp-input-group">
                <label>Max Price ({pool.quoteToken.symbol})</label>
                <input
                  type="number"
                  step="0.01"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Deposit Inputs */}
            <div className="rp-deposit-inputs">
              <div className="rp-input-group">
                <div className="rp-input-label-row">
                  <label>Deposit {pool.baseToken.symbol}</label>
                  <span className="rp-balance">Bal: 12.45 {pool.baseToken.symbol}</span>
                </div>
                <div className="rp-input-wrap">
                  <input
                    type="number"
                    value={baseInput}
                    onChange={(e) => {
                      setActiveInput('base');
                      setBaseInput(e.target.value);
                    }}
                  />
                  <span className="rp-input-token">{pool.baseToken.symbol}</span>
                </div>
              </div>

              <div className="rp-input-group">
                <div className="rp-input-label-row">
                  <label>Deposit {pool.quoteToken.symbol}</label>
                  <span className="rp-balance">Bal: 24,379 {pool.quoteToken.symbol}</span>
                </div>
                <div className="rp-input-wrap">
                  <input
                    type="number"
                    value={quoteInput}
                    onChange={(e) => {
                      setActiveInput('quote');
                      setQuoteInput(e.target.value);
                    }}
                  />
                  <span className="rp-input-token">{pool.quoteToken.symbol}</span>
                </div>
              </div>
            </div>

            {/* Confirmation & CTA */}
            <div className="rp-modal-actions">
              <button className="rp-btn rp-btn-secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                className="rp-btn rp-btn-primary"
                onClick={handleDeposit}
                disabled={isSubmitting || success}
              >
                {success ? (
                  <>
                    <CheckCircle2 size={16} className="text-pos" /> Position Created!
                  </>
                ) : isSubmitting ? (
                  'Deploying LP Position…'
                ) : (
                  `Deposit Liquidity (${formatUsd(
                    (parseFloat(baseInput) || 0) * pool.currentPrice + (parseFloat(quoteInput) || 0)
                  )})`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface VaultDetailModalProps {
  vault: KuruVault;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPos: KuruPosition) => void;
}

export function VaultDetailModal({ vault, isOpen, onClose, onSuccess }: VaultDetailModalProps) {
  const [depositAmount, setDepositAmount] = useState<string>('500');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDeposit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);
      const amt = parseFloat(depositAmount) || 500;
      const newPos: KuruPosition = {
        id: `vault-pos-${Date.now()}`,
        type: 'vault',
        marketId: vault.id,
        marketSymbol: vault.symbol,
        baseDeposited: amt / 2 / vault.baseToken.price,
        quoteDeposited: amt / 2,
        baseTokenSymbol: vault.baseToken.symbol,
        quoteTokenSymbol: vault.quoteToken.symbol,
        totalValueUsd: amt,
        earnedFeesUsd: 0,
        status: 'in-range',
        createdAt: 'Just now',
      };
      setTimeout(() => {
        onSuccess(newPos);
        onClose();
      }, 1200);
    }, 900);
  };

  return (
    <div className="rp-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="rp-modal-box rp-modal-vault" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="rp-modal-header">
          <div className="rp-modal-title-row">
            <div className="rp-pair-icons">
              <span className="rp-token-dot" style={{ backgroundColor: vault.baseToken.iconBg }}>
                {vault.baseToken.iconText || vault.baseToken.symbol[0]}
              </span>
              <span className="rp-token-dot" style={{ backgroundColor: vault.quoteToken.iconBg }}>
                {vault.quoteToken.iconText || vault.quoteToken.symbol[0]}
              </span>
            </div>
            <div>
              <h3>{vault.symbol} Vault</h3>
              <p className="rp-modal-subtitle">
                Automated Order Book Market Maker Vault · Monad Testnet
              </p>
            </div>
          </div>
          <button className="rp-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="rp-modal-content">
          {/* APR Highlight Banner */}
          <div className="rp-vault-banner">
            <div>
              <span className="rp-dim text-xs">Annual Percentage Rate</span>
              <div className="rp-vault-apr-num">
                APR {vault.apr.toFixed(1)}%
                {vault.isBoosted && (
                  <span className="rp-boost-pill">
                    <Sparkles size={13} /> Boosted
                  </span>
                )}
              </div>
            </div>
            <div className="rp-vault-banner-stats">
              <div>
                <span className="rp-dim">TVL</span>
                <strong>{formatUsd(vault.tvl)}</strong>
              </div>
              <div>
                <span className="rp-dim">24h Vol.</span>
                <strong>{formatUsd(vault.volume24h)}</strong>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="rp-vault-desc">{vault.description}</p>

          {/* Features */}
          <div className="rp-vault-features">
            <div className="rp-feat-item">
              <Shield size={16} className="text-pos" />
              <div>
                <strong>Zero Management Fee</strong>
                <span>100% of captured trading spreads are distributed to LPs.</span>
              </div>
            </div>
            <div className="rp-feat-item">
              <Clock size={16} className="text-accent" />
              <div>
                <strong>{vault.lockupDays}-Day Cooldown</strong>
                <span>Protects against arbitrage sandwiching around rebalance events.</span>
              </div>
            </div>
            <div className="rp-feat-item">
              <TrendingUp size={16} className="text-pos" />
              <div>
                <strong>Historical Simulation ({vault.historicalSimulation.investedAgo})</strong>
                <span>
                  $1,000 deposited {vault.historicalSimulation.investedAgo} ago grew to{' '}
                  <strong className="text-pos">
                    ${formatNumber(vault.historicalSimulation.projectedReturnUsd, 0)}
                  </strong>
                  .
                </span>
              </div>
            </div>
          </div>

          {/* Deposit Form */}
          <div className="rp-deposit-box">
            <div className="rp-input-label-row">
              <label>Deposit Amount (USD)</label>
              <span className="rp-balance">Wallet: $24,379.00</span>
            </div>
            <div className="rp-input-wrap">
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
              <span className="rp-input-token">USD</span>
            </div>
          </div>

          <div className="rp-modal-actions">
            <button className="rp-btn rp-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="rp-btn rp-btn-primary"
              onClick={handleDeposit}
              disabled={isSubmitting || success}
            >
              {success ? (
                <>
                  <CheckCircle2 size={16} className="text-pos" /> Deposited into Vault!
                </>
              ) : isSubmitting ? (
                'Approving & Depositing…'
              ) : (
                `Deposit $${depositAmount} into Vault`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
