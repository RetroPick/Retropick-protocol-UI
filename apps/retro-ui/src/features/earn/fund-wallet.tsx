'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Collapsible } from 'radix-ui';
import { ArrowRight, ChevronDown, Droplets, Wallet } from 'lucide-react';
import { fiatProviders, MONAD_TESTNET_FAUCET, type FiatCapability } from '@/lib/live/fiat-provider';

export function FundWallet({children}:{children?:ReactNode}) {
  const [capabilities,setCapabilities]=useState<FiatCapability[]>([]);
  const [open,setOpen]=useState(true);
  useEffect(()=>{void Promise.all(fiatProviders.map(p=>p.capabilities({chainId:10143,asset:{symbol:'MON'}}))).then(setCapabilities);},[]);
  return <section className="rp-hub-card" aria-label="Fund wallet and transfer">
    <div className="rp-hub-card-head">
      <span className="rp-card-icon"><Wallet size={15} aria-hidden/></span>
      <h3>Fund wallet</h3>
      <span className="rp-chip">Monad Testnet · 10143</span>
    </div>
    <p className="rp-card-sub">Get test MON from the official faucet. Fiat purchases and bank/card cash-out are unavailable on this test network.</p>
    <a className="rp-faucet" href={MONAD_TESTNET_FAUCET} target="_blank" rel="noopener noreferrer">
      <span className="rp-card-icon"><Droplets size={16} aria-hidden/></span>
      <span><strong>Get test MON</strong><small>Official Monad Testnet faucet — funds your wallet directly</small></span>
      <ArrowRight size={16} className="rp-faucet-arrow" aria-hidden/>
    </a>
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger className="rp-collapse-trigger">
        Fiat on-ramp / off-ramp providers
        <span className="rp-count-chip">{capabilities.length} unavailable</span>
        <ChevronDown size={14} className="rp-collapse-chevron" aria-hidden/>
      </Collapsible.Trigger>
      <Collapsible.Content className="rp-collapse-content">
        <div className="rp-provider-list">{capabilities.map(c=>(
          <div className="rp-provider-row" key={c.provider}>
            <strong>{c.provider}</strong>
            <span className="rp-chip rp-chip-warn">Unsupported on Monad Testnet</span>
            <p>{c.reason}</p>
            <button className="btn" disabled title={c.reason}>Buy / cash out unavailable</button>
            <a className="rp-doc-link" href={c.documentationUrl} target="_blank" rel="noopener noreferrer">Provider support</a>
          </div>))}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
    <p className="rp-note">Claims settle to your wallet first. A separate supported off-ramp would be required for a bank payout.</p>
    {children}
  </section>;
}
