'use client';
import { useMemo, useState } from 'react';
import { formatUnits, zeroAddress, type Address } from 'viem';
import type { TicketLaunch, TicketKuru } from '@/lib/live/trade-ticket-inputs';
import { buyQuote, sellQuote, parseExact, minOutput } from '@retropick/launchpad-sdk/math';
import { errorText } from '@retropick/launchpad-sdk/chain';
import { prepareCurveBuy, prepareCurveSell, prepareFactoryGraduate, prepareCoordinatorComplete } from '@retropick/launchpad-sdk/prepare';
import { useWallet } from '@/wallet/provider';
import { publicClient } from '@/lib/live/public-client';
import { executePreparedWrite, type TxPhase } from '@/services/tx-pipeline';
import { markStage, measureStage } from '@/lib/live/performance';
import { useIndexedRecord } from '@/hooks/use-indexed-record';
import { AmountField, LIMIT_LOCKED_REASON, QuoteLines, SlippageControl, TicketShell, TxProgress, stageFromPhase, trim, type OrderKind, type Side } from '@/features/trading/ticket-shell';
import { KuruTicket } from './kuru-ticket';
import { toast } from 'sonner';

export interface LiveTradingTicketProps { token: Address | string; launch: TicketLaunch | null; kuru: TicketKuru | null; quoteSymbol: string; readyToGraduate: boolean; reload: () => void }

/** Live Curve ticket. Execution path unchanged: SDK prepare* → executePreparedWrite (approve → simulate → sign → receipt). */
export function LiveTradingTicket({ token, launch, kuru, quoteSymbol, readyToGraduate, reload }: LiveTradingTicketProps) {
  const wallet = useWallet();
  const [kind, setKind] = useState<OrderKind>('Market');
  const [side, setSide] = useState<Side>('Buy');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState('50');
  const [tx, setTx] = useState<TxPhase | { kind: 'idle' }>({ kind: 'idle' });
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ hash: string; graduation: boolean } | null>(null);
  const phase = launch ? Number(launch.ledger.phase) : null;
  const decimals = launch?.packet.quoteDecimals ?? 18;
  const nativeQuote = launch?.packet.quoteAsset === zeroAddress;
  const busy = !['idle', 'failed', 'success'].includes(tx.kind);
  const indexed = useIndexedRecord(done && !done.graduation ? 'trade' : null, String(token).toLowerCase(), done?.hash ?? null);
  const quote = useMemo(() => {
    if (!launch || phase !== 0 || readyToGraduate || !amount) return null;
    try {
      const input = parseExact(amount, side === 'Buy' ? decimals : 18);
      const q = launch.reserveQuoteRaw, t = launch.reserveTokenRaw;
      const expected = side === 'Buy' ? buyQuote(input, q, t, launch.remaining, launch.fee, launch.tax) : sellQuote(input, t, q, launch.fee, launch.tax);
      if (expected <= 0n || side === 'Sell' && input > launch.balance) return null;
      return { expected, minimum: minOutput(expected, BigInt(slippage)), decimals: side === 'Buy' ? 18 : decimals, symbol: side === 'Buy' ? launch.symbol : quoteSymbol };
    } catch { return null; }
  }, [launch, phase, readyToGraduate, amount, side, decimals, slippage, quoteSymbol]);
  const insufficient = useMemo(() => {
    if (!launch || !amount || !wallet.wallet) return false;
    try { return parseExact(amount, side === 'Buy' ? decimals : 18) > (side === 'Buy' ? launch.quoteBalance : launch.balance); } catch { return false; }
  }, [launch, amount, side, decimals, wallet.wallet]);
  const run = async (graduate = false) => {
    if (!launch || !wallet.wallet || !wallet.account || busy) return;
    setError(''); setDone(null); setTx({ kind: 'preparing' }); markStage('transaction.click');
    const preparedTiming = measureStage('transaction.preflight');
    try {
      const prepared = graduate ? phase === 1 ? await prepareCoordinatorComplete(publicClient, launch.token, wallet.account) : await prepareFactoryGraduate(publicClient, launch.token, wallet.account)
        : side === 'Buy' ? await prepareCurveBuy(publicClient, launch.token, wallet.account, { quoteIn: parseExact(amount, decimals), slippageBps: BigInt(slippage) })
        : await prepareCurveSell(publicClient, launch.token, wallet.account, { tokensIn: parseExact(amount, 18), slippageBps: BigInt(slippage) });
      preparedTiming();
      const result = await executePreparedWrite(publicClient, wallet.wallet, prepared, { onPhase: setTx });
      if (result.kind === 'failed') setError(result.reason);
      else { toast.success(graduate ? 'Graduation confirmed on-chain' : `${side} confirmed on-chain`, { description: result.hash }); setDone({ hash: result.hash, graduation: graduate }); setAmount(''); reload(); }
    } catch (cause) {
      const text = errorText(cause);
      const reason = /RPC_[A-Z_]+\b|No healthy Monad RPC provider/.test(text)
        ? 'The Monad RPC is briefly unavailable — please try again in a moment.'
        : text;
      setError(reason); setTx({ kind: 'failed', reason, failure: 'unknown' });
    }
  };
  if (launch && phase === 2 && launch.packet.venue === 1) return <KuruTicket market={launch.receipt.market} token={token as Address} tokenSymbol={launch.symbol} quoteSymbol={quoteSymbol} initialQuoteBalance={kuru?.quoteBalance ?? 0n} initialBaseBalance={kuru?.baseBalance ?? 0n} orderKind={kind} onKindChange={(k) => setKind(k as OrderKind)} reload={reload}/>;

  let stage = stageFromPhase(tx);
  if (tx.kind === 'success' && done) stage = done.graduation ? 'completed' : indexed === 'indexed' ? 'completed' : 'confirmed';
  const symbol = launch?.symbol ?? '';
  const sync = phase === null ? 'Syncing on-chain state…' : null;
  const closed = phase === 1 || phase === 2 || readyToGraduate;
  const cta = !wallet.wallet
    ? <button className="rp-btn rp-btn-primary rp-btn-block" onClick={() => void (wallet.status === 'wrong-chain' ? wallet.switchChain() : wallet.connect()).catch(() => {})}>{wallet.status === 'wrong-chain' ? 'Switch to Monad Testnet' : 'Connect wallet'}</button>
    : phase === 1 || readyToGraduate ? <button className="rp-btn rp-btn-primary rp-btn-block" disabled={busy} onClick={() => void run(true)}>{phase === 1 ? 'Complete graduation (retry)' : 'Graduate to Kuru'}</button>
    : phase === 0 ? <button className="rp-btn rp-btn-block" data-tone={side === 'Buy' ? 'buy' : 'sell'} disabled={busy || !quote || insufficient} onClick={() => void run()}>{busy ? 'Working…' : insufficient ? `Insufficient ${side === 'Buy' ? quoteSymbol : symbol}` : `${side} ${symbol}`}</button>
    : null;
  return <TicketShell venue="Bonding curve · Monad Testnet" kind={kind} onKind={setKind} limitDisabledReason={LIMIT_LOCKED_REASON} side={side} onSide={(s) => { setSide(s); setAmount(''); }} sideDisabled={closed} sync={sync}
    cta={cta}
    status={<><TxProgress stage={stage} message={error || (stage === 'completed' && !done?.graduation ? 'Trade indexed.' : null)} hash={done?.hash ?? ('hash' in tx ? tx.hash : null)} approvalNeeded={side === 'Sell'} indexable={!done?.graduation}/></>}
    footer={<>Simulated on-chain, then signed in your wallet. Fees: {launch ? `${formatUnits(launch.fee, 2)}% curve + ${formatUnits(launch.tax, 2)}% creator` : '—'}.</>}>
    {phase === 1 ? <p className="rp-note" role="status">Graduation is in progress. Completing it is a permissionless retry.</p>
      : phase === 2 ? <p className="rp-note">This launch graduated to a venue this ticket does not support.</p>
      : readyToGraduate ? <p className="rp-note">The curve is complete. Graduate to enable Kuru trading — graduation is permissionless: any wallet can trigger it, you only pay the gas.</p>
      : <>
        <AmountField testId="ticket-amount" label={side === 'Buy' ? 'Pay' : 'Sell'} unit={side === 'Buy' ? quoteSymbol : symbol} value={amount} onChange={setAmount}
          balanceRaw={wallet.wallet && launch ? (side === 'Buy' ? launch.quoteBalance : launch.balance) : null} decimals={side === 'Buy' ? decimals : 18}
          maxDisabledReason={side === 'Buy' && nativeQuote ? 'Keep some MON for network gas.' : undefined}/>
        <QuoteLines rows={[
          ['You receive', quote ? `${trim(formatUnits(quote.expected, quote.decimals))} ${quote.symbol}` : '—', 'ticket-receive'],
          ['Minimum received', quote ? `${trim(formatUnits(quote.minimum, quote.decimals))} ${quote.symbol}` : '—'],
        ]}/>
        <SlippageControl bps={slippage} onChange={setSlippage}/>
      </>}
  </TicketShell>;
}
