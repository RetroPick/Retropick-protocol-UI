'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatUnits, isAddress, zeroAddress, type Address } from 'viem';
import { FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { RiSendPlaneLine } from 'react-icons/ri';
import { parseExact } from '@retropick/launchpad-sdk/math';
import { prepareTransfer } from '@retropick/launchpad-sdk/transfer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { launchKeys } from '@/lib/live/queries';
import { publicClient } from '@/lib/live/public-client';
import { useWallet } from '@/wallet/provider';
import { fetchWalletState } from '@/services/wallet-state';
import { executePreparedWrite, type TxPhase } from '@/services/tx-pipeline';
import { toast } from 'sonner';
import { shortAddress } from '@/lib/live/format';
import { MonoAmount } from './amount';

export function SendToWallet() {
  const wallet = useWallet();
  const account = wallet.account;
  const state = useQuery({ queryKey: launchKeys.wallet(account ?? 'disconnected', 'state'), enabled: !!account, queryFn: ({ signal }) => fetchWalletState(account!, signal), structuralSharing: false });
  const [asset, setAsset] = useState<string>(zeroAddress);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [tx, setTx] = useState<TxPhase | { kind: 'idle' }>({ kind: 'idle' });
  const [reviewed, setReviewed] = useState(false);

  useEffect(() => { setReviewed(false); setError(''); }, [account, wallet.chainId]);
  const busy = !['idle', 'failed', 'success'].includes(tx.kind);
  const options = [{ token: zeroAddress, symbol: 'MON', decimals: 18, walletRaw: state.data?.monRaw ?? 0n }, ...(state.data?.assets.filter(a => a.decimals !== null && a.walletRaw > 0n) ?? [])];
  const selected = options.find(a => a.token === asset) ?? options[0];
  const valid = isAddress(recipient) && recipient !== zeroAddress && !!amount;
  const recipientOk = isAddress(recipient) && recipient !== zeroAddress;
  const reset = () => setReviewed(false);
  const setPreset = (pct: number) => {
    if (selected.decimals === null) return;
    const value = selected.walletRaw * BigInt(pct) / 100n;
    setAmount(formatUnits(value, selected.decimals));
    reset();
  };

  const send = async () => {
    if (state.isError || !state.data || !wallet.wallet || !account || !valid || selected.decimals === null) return;
    setError('');
    setTx({ kind: 'preparing' });
    try {
      const prepared = await prepareTransfer(publicClient, account, { recipient: recipient as Address, asset: selected.token as Address, amount: parseExact(amount, selected.decimals) });
      const result = await executePreparedWrite(publicClient, wallet.wallet, prepared, { onPhase: setTx });
      if (result.kind === 'failed') setError(result.reason);
      else {
        toast.success('Wallet transfer confirmed', { description: result.hash });
        setAmount('');
        setReviewed(false);
        void state.refetch();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transfer failed.');
    } finally {
      setTx({ kind: 'idle' });
    }
  };

  return <section className="rp-hub-card" aria-label="Send to wallet">
    <div className="rp-hub-card-head">
      <span className="rp-card-icon"><RiSendPlaneLine size={15} aria-hidden /></span>
      <h3>Send to wallet</h3>
      <span className="rp-count-chip">Monad Testnet</span>
    </div>
    <p className="rp-card-sub">Transfer native MON and tokens to another wallet on Monad Testnet.</p>
    <div className="rp-send-grid">
      <div className="rp-send-field">
        <span id="send-asset-label">Asset</span>
        <Select value={selected.token} onValueChange={(v) => { setAsset(v); reset(); }}>
          <SelectTrigger aria-labelledby="send-asset-label"><SelectValue /></SelectTrigger>
          <SelectContent>{options.map(a => <SelectItem key={a.token} value={a.token}>{a.symbol}</SelectItem>)}</SelectContent>
        </Select>
        <small className="rp-send-balance">Balance: {selected.decimals !== null && state.data && !state.isError ? <MonoAmount raw={selected.walletRaw} decimals={selected.decimals} unit={selected.symbol} /> : 'unavailable'}</small>
      </div>
      <label className="rp-send-field">
        <span>Recipient EVM address</span>
        <div className="rp-field-input">
          <input value={recipient} onChange={e => { setRecipient(e.target.value.trim()); reset(); }} placeholder="0x…" spellCheck={false} aria-invalid={recipient !== '' && !recipientOk} />
          {recipient !== '' && (recipientOk ? <FiCheckCircle size={15} className="rp-valid-icon rp-valid-ok" aria-hidden /> : <FiAlertCircle size={15} className="rp-valid-icon rp-valid-bad" aria-hidden />)}
        </div>
      </label>
      <div className="rp-send-field">
        <label htmlFor="send-amount"><span>Amount · {selected.symbol}</span></label>
        <div className="rp-amount-input">
          <input id="send-amount" inputMode="decimal" value={amount} onChange={e => { setAmount(e.target.value); reset(); }} placeholder="0" />
          <span className="rp-unit">{selected.symbol}</span>
        </div>
        <div className="rp-presets" role="group" aria-label="Amount presets">
          {[25, 50, 75].map(p => <button key={p} type="button" className="rp-preset" disabled={selected.decimals === null || state.isPending || state.isError || !state.data} onClick={() => setPreset(p)}>{p}%</button>)}
          <button type="button" className="rp-preset" disabled={selected.decimals === null || state.isPending || state.isError || !state.data} onClick={() => setPreset(100)}>Max</button>
        </div>
      </div>
      {reviewed && (
        <div className="rp-review" role="status">
          <div className="rp-review-row"><span>Send</span><strong>{amount} {selected.symbol}</strong></div>
          <div className="rp-review-row"><span>To</span><strong>{shortAddress(recipient) || recipient}</strong></div>
          <div className="rp-review-row"><span>Network</span><strong>Monad Testnet</strong></div>
          <div className="rp-review-row"><span>Gas</span><strong>Paid in MON</strong></div>
          <div className="rp-review-actions"><button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" disabled={busy} onClick={() => setReviewed(false)}>Edit</button></div>
        </div>
      )}
      {error && <p role="alert" className="form-error">{error}</p>}
      {busy && <p role="status" data-tx-phase={tx.kind}>{tx.kind === 'awaiting-signature' ? 'Confirm in wallet…' : `${tx.kind}…`}</p>}
      <button className="rp-btn rp-btn-primary" disabled={busy || !wallet.wallet || !valid || state.isPending || state.isError || !state.data} onClick={() => reviewed ? void send() : setReviewed(true)}>
        {busy ? 'Working…' : reviewed ? 'Send to wallet' : 'Review transfer'}
      </button>
    </div>
  </section>;
}
