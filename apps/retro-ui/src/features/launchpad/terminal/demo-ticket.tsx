// DEMO ticket: same TicketShell as live, real SDK quote math over SIMULATED fixture state.
// It never contacts a wallet or RPC. The deposit → order sequence runs the real state machine
// with simulated executors so interaction tests can exercise every branch without signing.
import { useMemo, useRef, useState } from 'react';
import { formatUnits } from 'viem';
import { buyQuote, minOutput, parseExact, sellQuote } from '@retropick/launchpad-sdk/math';
import { useDemo } from '@/components/product/provider';
import { useSearchParams } from '@/lib/next-compat';
import { DemoBadge } from '@/components/trading/primitives';
import type { DemoFixture } from '@/lib/view-models/demo-terminal-fixtures';
import { formatPriceX18 } from '@/lib/view-models/token-terminal';
import { AmountField, LIMIT_LOCKED_REASON, QuoteLines, SlippageControl, TicketShell, TxProgress, trim, type OrderKind, type Side, type TicketStage } from '@/features/trading/ticket-shell';
import { flowBusy, flowMessage, runDepositThenOrder, shortfall, type FlowState, type WriteResult } from '@/features/trading/deposit-order-machine';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function DemoTicket({ fixture }: { fixture: DemoFixture }) {
  const { vm, curve, kuru, wallet: w } = fixture;
  const demo = useDemo();
  const params = useSearchParams();
  const simulate = params.get('simulate') ?? 'success';
  const graduated = vm.lifecycle === 'GRADUATED';
  const [kind, setKind] = useState<OrderKind>('Market');
  const [side, setSide] = useState<Side>('Buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [slippage, setSlippage] = useState('50');
  const [postOnly, setPostOnly] = useState(false);
  const [stage, setStage] = useState<TicketStage | null>(null);
  const [flow, setFlow] = useState<FlowState>({ step: 'idle' });
  const [margin, setMargin] = useState({ quote: w.quoteMargin, base: w.tokenMargin });
  const marginRef = useRef(margin); marginRef.current = margin;
  const running = useRef(false);
  const qd = vm.quote.decimals, bd = vm.baseDecimals, q = vm.quote.symbol, s = vm.symbol;

  const curveQuote = useMemo(() => {
    if (!curve || !amount) return null;
    try {
      const input = parseExact(amount, side === 'Buy' ? qd : bd);
      const out = side === 'Buy' ? buyQuote(input, curve.quoteReserve, curve.tokenReserve, curve.remaining, curve.feeBps, curve.taxBps) : sellQuote(input, curve.tokenReserve, curve.quoteReserve, curve.feeBps, curve.taxBps);
      return out > 0n ? { out, min: minOutput(out, BigInt(slippage)), dec: side === 'Buy' ? bd : qd, unit: side === 'Buy' ? s : q } : null;
    } catch { return null; }
  }, [curve, amount, side, slippage, qd, bd, s, q]);

  // Kuru (graduated) preview: total = limitPrice × size, exact bigint; market uses the simulated best ask/bid.
  const kuruPreview = useMemo(() => {
    if (!kuru || !amount) return null;
    try {
      if (kind === 'Limit') {
        const pRaw = parseExact(price, qd), size = parseExact(amount, bd);
        const total = pRaw * size / 10n ** BigInt(bd);
        return { total, receive: side === 'Buy' ? `${trim(formatUnits(size, bd))} ${s}` : `${trim(formatUnits(total, qd))} ${q}`, required: side === 'Buy' ? total : size, asset: side === 'Buy' ? 'quote' as const : 'base' as const };
      }
      const input = parseExact(amount, side === 'Buy' ? qd : bd);
      const px = side === 'Buy' ? kuru.bestAskX18 : kuru.bestBidX18;
      const out = side === 'Buy' ? input * 10n ** 18n * 10n ** BigInt(bd) / (px * 10n ** BigInt(qd)) : input * px * 10n ** BigInt(qd) / (10n ** 18n * 10n ** BigInt(bd));
      return { total: input, receive: `${trim(formatUnits(out, side === 'Buy' ? bd : qd))} ${side === 'Buy' ? s : q}`, min: minOutput(out, BigInt(slippage)), required: input, asset: side === 'Buy' ? 'quote' as const : 'base' as const };
    } catch { return null; }
  }, [kuru, amount, price, kind, side, slippage, qd, bd, s, q]);

  const gap = demo.connected && kuruPreview ? shortfall(kuruPreview.required, kuruPreview.asset === 'quote' ? margin.quote : margin.base) : 0n;
  const fundSym = kuruPreview?.asset === 'base' ? s : q, fundDec = kuruPreview?.asset === 'base' ? bd : qd;
  const resumable = flow.step === 'order-failed' && !!flow.depositHash;
  const busy = flowBusy(flow) || (stage !== null && !['completed', 'failed', 'rejected'].includes(stage));

  const simulateWrite = async (which: 'deposit' | 'order', amountRaw?: bigint): Promise<WriteResult> => {
    setStage('signature'); await wait(250);
    if ((which === 'deposit' && simulate === 'reject-deposit') || (which === 'order' && simulate === 'reject-order')) { setStage('rejected'); return { kind: 'failed', reason: 'Request rejected in wallet.', failure: 'rejected' }; }
    if (which === 'order' && simulate === 'fail-order') { setStage('failed'); return { kind: 'failed', reason: 'Simulated revert: price moved beyond the limit.', failure: 'revert' }; }
    setStage('confirming'); await wait(250);
    if (which === 'deposit' && amountRaw) { const m = marginRef.current; const next = kuruPreview?.asset === 'base' ? { ...m, base: m.base + amountRaw } : { ...m, quote: m.quote + amountRaw }; marginRef.current = next; setMargin(next); }
    setStage('completed');
    return { kind: 'success', hash: `demo:${which}-${Date.now().toString(16)}` };
  };

  const submitKuru = async () => {
    if (!kuruPreview || running.current) return;
    running.current = true;
    try {
      await runDepositThenOrder({
        required: kuruPreview.required,
        readMargin: async () => (kuruPreview.asset === 'quote' ? marginRef.current.quote : marginRef.current.base),
        deposit: (a) => simulateWrite('deposit', a),
        placeOrder: () => simulateWrite('order'),
        onState: setFlow,
      }, resumable ? flow : { step: 'idle' });
    } finally { running.current = false; }
  };
  const submitCurve = async () => { if (running.current) return; running.current = true; try { setStage('review'); await wait(150); setStage('signature'); await wait(250); setStage('confirming'); await wait(250); setStage('completed'); } finally { running.current = false; } };

  const connect = <button className="rp-btn rp-btn-primary rp-btn-block" onClick={() => demo.setConnected(true)}>Connect demo wallet</button>;
  const closed = vm.lifecycle === 'GRADUATION_READY' || vm.lifecycle === 'GRADUATING';
  let cta = connect;
  if (demo.connected) {
    if (closed) cta = <button className="rp-btn rp-btn-primary rp-btn-block" disabled title="DEMO: graduation is not executed in demo mode">{vm.lifecycle === 'GRADUATING' ? 'Complete graduation · DEMO' : 'Graduate to Kuru · DEMO'}</button>;
    else if (graduated) cta = <button className="rp-btn rp-btn-block" data-tone={side === 'Buy' ? 'buy' : 'sell'} disabled={busy || !kuruPreview} onClick={() => void submitKuru()}>{busy ? 'Working…' : resumable ? 'Place order (margin already deposited)' : gap > 0n ? 'Deposit & place order' : `${side} ${s}`} · SIMULATED</button>;
    else cta = <button className="rp-btn rp-btn-block" data-tone={side === 'Buy' ? 'buy' : 'sell'} disabled={busy || !curveQuote} onClick={() => void submitCurve()}>{busy ? 'Working…' : `${side} ${s}`} · SIMULATED</button>;
  }
  const flowText = flowMessage(flow, `${trim(formatUnits(gap, fundDec))} ${fundSym}`);
  const balance = demo.connected ? (graduated ? (kind === 'Market' && side === 'Buy' ? margin.quote : side === 'Sell' ? margin.base : null) : side === 'Buy' ? w.quoteWallet : w.tokenWallet) : null;

  return <TicketShell demo venue={graduated ? 'Kuru orderbook' : 'Bonding curve'} kind={kind} onKind={(k) => { setKind(k); setStage(null); setFlow({ step: 'idle' }); }}
    limitDisabledReason={graduated ? null : LIMIT_LOCKED_REASON} side={side} onSide={(x) => { setSide(x); setAmount(''); setStage(null); setFlow({ step: 'idle' }); }} sideDisabled={closed}
    sync={vm.sync.onchain === 'syncing' ? vm.sync.message : null}
    cta={cta}
    status={<>
      {graduated && gap > 0n && !busy && flow.step === 'idle' && <div className="rp-steps" data-testid="funding-preview"><p><strong>Two wallet signatures</strong> · not one atomic transaction</p><ol><li>Step 1/2 · Deposit {trim(formatUnits(gap, fundDec))} {fundSym} to Kuru margin</li><li>Step 2/2 · Place {kind.toLowerCase()} {side.toLowerCase()} order</li></ol><p className="rp-note">You can reject either request. If the order fails after the deposit, the margin stays deposited.</p></div>}
      {flowText && <div className={`rp-tx ${flow.step === 'order-failed' && flow.depositHash ? 'rp-tx-warn' : flow.step.endsWith('failed') ? 'rp-tx-neutral' : ''}`} role="status" data-flow={flow.step}>{flowText}</div>}
      {!graduated && <TxProgress stage={stage} indexable={false} message={stage === 'completed' ? 'SIMULATED — no transaction was sent.' : null}/>}
    </>}
    footer={<><DemoBadge text="SIMULATED"/> Quotes use RetroPick SDK math over simulated fixture state. No wallet request is made.{graduated && kind === 'Limit' ? ' Limit orders are good till cancelled (GTC).' : ''}</>}>
    {closed ? <p className="rp-note" role="status">{vm.lifecycle === 'GRADUATING' ? 'Graduation is in progress; curve trading is closed until the Kuru market is live.' : 'The curve is complete. Graduation moves liquidity to Kuru, then trading continues on the orderbook.'}</p> : <>
      {graduated && kind === 'Limit' && <div className="rp-field"><div className="rp-field-top"><label htmlFor="demo-limit-price">Limit price</label><span className="rp-muted">{q} per {s} · best ask {formatPriceX18(kuru?.bestAskX18.toString())}</span></div><div className="rp-input"><input id="demo-limit-price" data-testid="ticket-limit-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.0"/><span className="rp-input-unit">{q}</span></div></div>}
      {graduated && kind === 'Limit' && <label className="rp-check"><input type="checkbox" data-testid="ticket-post-only" checked={postOnly} onChange={(e) => setPostOnly(e.target.checked)}/><span>Post-only (maker only)<span className="rp-muted"> — rejects if it would cross the spread</span></span></label>}
      <AmountField testId="ticket-amount" label={kind === 'Limit' ? 'Amount' : side === 'Buy' ? 'Pay' : 'Sell'} unit={kind === 'Market' && side === 'Buy' ? q : s} value={amount} onChange={setAmount} balanceRaw={balance} decimals={kind === 'Market' && side === 'Buy' ? qd : bd} maxDisabledReason={side === 'Buy' && vm.quote.native && !graduated ? 'Keep some MON for network gas.' : undefined}/>
      <QuoteLines rows={graduated
        ? kind === 'Limit'
          ? [['Order total', kuruPreview ? `${trim(formatUnits(kuruPreview.total, qd))} ${q}` : '—', 'ticket-total'], ['You receive', kuruPreview?.receive ?? '—', 'ticket-receive'], ['Order policy', postOnly ? 'Post-only · maker only' : 'Good till cancelled']]
          : [['You receive', kuruPreview?.receive ?? '—', 'ticket-receive'], ['Minimum received', kuruPreview && 'min' in kuruPreview && kuruPreview.min !== undefined ? trim(formatUnits(kuruPreview.min, side === 'Buy' ? bd : qd)) : '—']]
        : [['You receive', curveQuote ? `${trim(formatUnits(curveQuote.out, curveQuote.dec))} ${curveQuote.unit}` : '—', 'ticket-receive'], ['Minimum received', curveQuote ? `${trim(formatUnits(curveQuote.min, curveQuote.dec))} ${curveQuote.unit}` : '—'], ['Fees', curve ? `${Number(curve.feeBps) / 100}% curve + ${Number(curve.taxBps) / 100}% creator` : '—']]}/>
      {kind === 'Market' && <SlippageControl bps={slippage} onChange={setSlippage}/>}
      {graduated && demo.connected && <details className="rp-advanced"><summary>Advanced · Kuru margin</summary><QuoteLines rows={[[`Margin ${q}`, trim(formatUnits(margin.quote, qd)), 'margin-quote'], [`Margin ${s}`, trim(formatUnits(margin.base, bd))]]}/><p className="rp-note">SIMULATED margin balances. Deposit and withdraw are live-only.</p></details>}
    </>}
  </TicketShell>;
}
