'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Collapsible } from 'radix-ui';
import { FiArrowRight, FiChevronDown } from 'react-icons/fi';
import { RiWallet3Line, RiDropLine } from 'react-icons/ri';
import { fiatProviders, MONAD_TESTNET_FAUCET, type FiatCapability } from '@/lib/live/fiat-provider';

export function FundWallet({ children }: { children?: ReactNode }) {
  const [capabilities, setCapabilities] = useState<FiatCapability[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void Promise.all(fiatProviders.map(p => p.capabilities({ chainId: 10143, asset: { symbol: 'MON' } }))).then(setCapabilities);
  }, []);

  return <section className="rp-hub-card" aria-label="Fund wallet and transfer">
    <div className="rp-hub-card-head">
      <span className="rp-card-icon"><RiWallet3Line size={15} aria-hidden /></span>
      <h3>Fund wallet</h3>
      <span className="rp-count-chip">Monad Testnet</span>
    </div>
    <p className="rp-card-sub">Get test MON directly from the official faucet into your connected wallet.</p>
    <a className="rp-faucet" href={MONAD_TESTNET_FAUCET} target="_blank" rel="noopener noreferrer">
      <span className="rp-card-icon"><RiDropLine size={16} aria-hidden /></span>
      <span><strong>Get test MON</strong><small>Official Monad Testnet faucet</small></span>
      <FiArrowRight size={16} className="rp-faucet-arrow" aria-hidden />
    </a>
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger className="rp-collapse-trigger">
        Fiat on-ramp / off-ramp providers
        <span className="rp-count-chip">{capabilities.length} unavailable on testnet</span>
        <FiChevronDown size={14} className="rp-collapse-chevron" aria-hidden />
      </Collapsible.Trigger>
      <Collapsible.Content className="rp-collapse-content">
        <div className="rp-provider-list">
          {capabilities.map(c => (
            <div className="rp-provider-row" key={c.provider}>
              <strong>{c.provider}</strong>
              <span className="rp-chip rp-chip-warn">Unsupported on Testnet</span>
              <p>{c.reason}</p>
              <a className="rp-doc-link" href={c.documentationUrl} target="_blank" rel="noopener noreferrer">Docs</a>
            </div>
          ))}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
    {children}
  </section>;
}
