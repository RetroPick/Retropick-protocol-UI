'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatUnits, zeroAddress, type Address } from 'viem';
import { publicClient } from '@/lib/live/public-client';
import { launchKeys, queryClient } from '@/lib/live/queries';
import { measureStage, markStage } from '@/lib/live/performance';
import { useWallet } from '@/wallet/provider';
import { executePreparedWrite, type TxPhase } from '@/services/tx-pipeline';
import { useIndexedRecord } from '@/hooks/use-indexed-record';
import { kuruAbi } from '@retropick/launchpad-sdk/abis/kuruAbi';
import { marginAbi } from '@retropick/launchpad-sdk/abis/marginAbi';
import { release } from '@retropick/launchpad-sdk/chain';
import { assertKuruMarketIdentity, kuruGrid, prepareMarginDeposit, prepareMarginWithdraw, prepareBatchWithdrawMax, prepareKuruLimitOrder, prepareKuruMarketOrder } from '@retropick/launchpad-sdk/prepare';
import { parseExact, minOutput } from '@retropick/launchpad-sdk/math';
import { toast } from 'sonner';
import { AmountField, QuoteLines, SlippageControl, TicketShell, TxProgress, stageFromPhase, trim, type OrderKind, type Side } from '@/features/trading/ticket-shell';
import { flowBusy, flowMessage, runDepositThenOrder, shortfall, type FlowState, type WriteResult } from '@/features/trading/deposit-order-machine';
import { SegmentedControl } from '@/components/trading/primitives';
import type { MakerDraft } from '@/features/liquidity/maker-drafts';

type MarketParams = Awaited<ReturnType<typeof assertKuruMarketIdentity>>;

/**
 * Exact collateral an order needs in the margin account — the same quantity prepareKuruLimitOrder /
 * prepareKuruMarketOrder compare against getBalance (no new math: SDK kuruGrid + parseExact).
 */
export function requiredCollateral(params: MarketParams, kind: OrderKind, side: Side, price: string, size: string): { amount: bigint; asset: 'quote' | 'base' } | null {
  try {
    if (kind === 'Limit') {
      const sizeRaw = parseExact(size, Number(params.baseDecimals));
      if (side === 'Sell') return { amount: sizeRaw, asset: 'base' };
      const priceUnits = kuruGrid.priceToUnits(parseExact(price, Number(params.quoteDecimals)), params, 'buy');
      return { amount: kuruGrid.quoteCostBuy(priceUnits, kuruGrid.sizeToUnits(sizeRaw, params), params), asset: 'quote' };
    }
    return side === 'Buy' ? { amount: parseExact(size, Number(params.quoteDecimals)), asset: 'quote' } : { amount: parseExact(size, Number(params.baseDecimals)), asset: 'base' };
  } catch { return null; }
}

export function KuruTicket({ market, token, tokenSymbol, quoteSymbol = 'MON', initialQuoteBalance, initialBaseBalance, reload, orderKind, onKindChange, makerMode = false, draft, onOrderConfirmed }: {
  market: Address; token: Address; tokenSymbol: string; quoteSymbol?: string; initialQuoteBalance: bigint; initialBaseBalance: bigint; reload: () => void; orderKind?: string; onKindChange?: (kind: string) => void;
  makerMode?: boolean; draft?: MakerDraft | null; onOrderConfirmed?: (draftId: string | null, hash: string) => void;
}) {
  const wallet = useWallet(), account = wallet.account;
  const [side, setSide] = useState<Side>('Buy'), [localKind, setLocalKind] = useState<OrderKind>(makerMode ? 'Limit' : 'Market'), [price, setPrice] = useState(''), [size, setSize] = useState('');
  const [slippage, setSlippage] = useState('50');
  const [postOnly, setPostOnly] = useState(makerMode);
  const kind = (orderKind ?? localKind) as OrderKind, setKind = (k: OrderKind) => (onKindChange ?? ((v: string) => setLocalKind(v as OrderKind)))(k);
  const actionContext = `${market}:${account}:${wallet.chainId}:${kind}:${side}:${price}:${size}:${postOnly}:${draft?.id ?? ''}`;
  const contextRef = useRef(actionContext); contextRef.current = actionContext;
  const [depositAmount, setDepositAmount] = useState(''), [withdrawAmount, setWithdrawAmount] = useState(''), [fundAsset, setFundAsset] = useState<'quote' | 'base'>('quote');
  const [tx, setTx] = useState<TxPhase | { kind: 'idle' }>({ kind: 'idle' }), [error, setError] = useState('');
  const [flow, setFlow] = useState<FlowState>({ step: 'idle' });
  const [placed, setPlaced] = useState<string | null>(null);
  const running = useRef(false);
  const busy = !['idle', 'failed', 'success'].includes(tx.kind) || flowBusy(flow);
  const paramsQuery = useQuery({ queryKey: launchKeys.resource(token, 'ticket-params', { market }), queryFn: () => assertKuruMarketIdentity(publicClient, market, token), staleTime: 10_000, structuralSharing: false });
  const params = paramsQuery.data;
  const readMargin = async (asset: Address) => publicClient.readContract({ address: release.kuruEnvironment.marginAccount as Address, abi: marginAbi, functionName: 'getBalance', args: [account!, asset], blockNumber: await publicClient.getBlockNumber({ cacheTime: 0 }) });
  const balancesQuery = useQuery({ queryKey: launchKeys.wallet(account ?? 'disconnected', `margin:${market}`), enabled: !!account && !!params, queryFn: async () => {
    const blockNumber = await publicClient.getBlockNumber({ cacheTime: 0 });
    return await Promise.all([publicClient.readContract({ address: release.kuruEnvironment.marginAccount as Address, abi: marginAbi, functionName: 'getBalance', args: [account!, params!.quoteAsset], blockNumber }), publicClient.readContract({ address: release.kuruEnvironment.marginAccount as Address, abi: marginAbi, functionName: 'getBalance', args: [account!, token], blockNumber })]);
  }, refetchInterval: 10000, structuralSharing: false });
  useEffect(() => { setError(''); setTx({ kind: 'idle' }); setFlow({ step: 'idle' }); setPlaced(null); }, [account, wallet.chainId, market]);
  useEffect(() => { if (!draft) return; setLocalKind('Limit'); setSide(draft.side); setPrice(draft.price); setSize(draft.size); setPostOnly(true); setFlow({ step: 'idle' }); setTx({ kind: 'idle' }); }, [draft?.id]);
  const indexed = useIndexedRecord(placed && kind === 'Limit' ? 'order' : placed ? 'trade' : null, token.toLowerCase(), placed, account);
  const balancesKnown = !!balancesQuery.data && !balancesQuery.isError && Date.now() - balancesQuery.dataUpdatedAt < 20000;
  const marginQuote = balancesQuery.data?.[0] ?? 0n, marginBase = balancesQuery.data?.[1] ?? 0n;
  const [quoteRevision, setQuoteRevision] = useState(0);
  const [quoteError, setQuoteError] = useState('');
  const preview = useMemo(() => { if (!params || kind !== 'Limit') return null; try {
    const p = kuruGrid.priceToUnits(parseExact(price, Number(params.quoteDecimals)), params, side === 'Buy' ? 'buy' : 'sell'); const s = kuruGrid.sizeToUnits(parseExact(size, Number(params.baseDecimals)), params);
    return { price: formatUnits(kuruGrid.unitsToPriceRaw(p, params), Number(params.quoteDecimals)), quote: formatUnits(kuruGrid.quoteCostBuy(p, s, params), Number(params.quoteDecimals)), base: formatUnits(kuruGrid.unitsToSize(s, params), Number(params.baseDecimals)) };
  } catch { return null; } }, [params, kind, side, price, size]);
  const quoteContext = `${market}:${account}:${wallet.chainId}:${kind}:${side}:${size}:${paramsQuery.dataUpdatedAt}`;
  const [quoted, setQuoted] = useState<{ value: bigint; context: string; at: number } | null>(null);
  const marketPreview = quoted?.context === quoteContext && Date.now() - quoted.at < 20000 ? quoted.value : null;
  useEffect(() => { setQuoted(null); setQuoteError(''); if (!params || kind !== 'Market' || !size) return; let alive = true; const timer = setTimeout(() => { void (async () => {
    try { const raw = parseExact(size, Number(side === 'Buy' ? params.quoteDecimals : params.baseDecimals)); const units = side === 'Buy' ? kuruGrid.quoteToUnits(raw, params) : kuruGrid.sizeToUnits(raw, params); const quote = await publicClient.simulateContract({ address: market, abi: kuruAbi, functionName: side === 'Buy' ? 'placeAndExecuteMarketBuy' : 'placeAndExecuteMarketSell', args: [units, 0n, true, true], account: zeroAddress }); if (alive) setQuoted({ value: BigInt(quote.result), context: quoteContext, at: Date.now() }); } catch { if (alive) { setQuoted(null); setQuoteError('Market quote unavailable. Retry or use a limit order.'); } }
  })(); }, 250); return () => { alive = false; clearTimeout(timer); }; }, [params, kind, side, size, market, account, wallet.chainId, balancesQuery.dataUpdatedAt, quoteContext, quoteRevision]);

  /** Single execution path for every Kuru write (unchanged pipeline). Resolves after the receipt. */
  const exec = async (prepare: () => Promise<Parameters<typeof executePreparedWrite>[2]>): Promise<WriteResult> => {
    if (!wallet.wallet || !account) return { kind: 'failed', reason: 'Connect a wallet first.', failure: 'unknown' };
    const context = actionContext;
    if (contextRef.current !== context) return { kind: 'failed', reason: 'Wallet or draft changed. Review this action again.', failure: 'unknown' };
    setError(''); setTx({ kind: 'preparing' }); markStage('transaction.click'); const finish = measureStage('transaction.preflight');
    try {
      const prepared = await prepare(); finish();
      if (contextRef.current !== context) throw Error('Wallet or draft changed. Review this action again.');
      const result = await executePreparedWrite(publicClient, wallet.wallet, prepared, { onPhase: phase => { if (contextRef.current === context) setTx(phase); }, contextValid: () => contextRef.current === context });
      if (result.kind === 'failed') { setError(result.reason); return result; }
      toast.success(`${prepared.label} confirmed on-chain`, { description: result.hash });
      await queryClient.invalidateQueries({ queryKey: launchKeys.all }); reload();
      return { kind: 'success', hash: result.hash };
    } catch (cause) { const reason = cause instanceof Error ? cause.message : 'Transaction failed.'; setError(reason); setTx({ kind: 'failed', reason, failure: 'unknown' }); return { kind: 'failed', reason, failure: 'unknown' }; }
  };
  const prepareOrder = () => kind === 'Limit'
    ? prepareKuruLimitOrder(publicClient, account!, { market, token, side: side === 'Buy' ? 'buy' : 'sell', priceRaw: parseExact(price, Number(params!.quoteDecimals)), sizeRaw: parseExact(size, Number(params!.baseDecimals)), postOnly })
    : prepareKuruMarketOrder(publicClient, account!, { market, token, side: side === 'Buy' ? 'buy' : 'sell', amountRaw: parseExact(size, Number(side === 'Buy' ? params!.quoteDecimals : params!.baseDecimals)), minOutcomeRaw: 0n, slippageBps: BigInt(slippage) });

  const need = params ? requiredCollateral(params, kind, side, price, size) : null;
  const fundingAddress = need?.asset === 'base' ? token : params?.quoteAsset ?? zeroAddress;
  const fundingDecimals = Number(need?.asset === 'base' ? params?.baseDecimals ?? 18n : params?.quoteDecimals ?? 18n);
  const fundingSymbol = need?.asset === 'base' ? tokenSymbol : quoteSymbol;
  const gap = need && account ? shortfall(need.amount, need.asset === 'base' ? marginBase : marginQuote) : 0n;
  const resumable = flow.step === 'order-failed' && !!flow.depositHash;

  const submit = async () => {
    if (!params || paramsQuery.isError || !account || !need || !balancesKnown || (kind === 'Market' && (!marketPreview || marketPreview <= 0n)) || running.current) return;
    running.current = true; setPlaced(null);
    try {
      const final = await runDepositThenOrder({
        required: need.amount,
        readMargin: () => readMargin(fundingAddress),
        deposit: (amount) => exec(() => prepareMarginDeposit(publicClient, account, { token: fundingAddress, amount })),
        placeOrder: () => exec(prepareOrder),
        onState: setFlow,
      }, resumable ? flow : { step: 'idle' });
      if (final.step === 'done') { setPlaced(final.orderHash); setSize(''); onOrderConfirmed?.(draft && kind === 'Limit' && side === draft.side && price === draft.price && size === draft.size ? draft.id : null, final.orderHash); }
    } finally { running.current = false; }
  };

  let stage = stageFromPhase(tx);
  if (flow.step === 'done') stage = indexed === 'indexed' ? 'completed' : 'confirmed';
  const flowText = flowMessage(flow, `${trim(formatUnits(gap, fundingDecimals))} ${fundingSymbol}`);
  const ctaLabel = busy ? 'Working…' : resumable ? `Place order (margin already deposited)` : gap > 0n ? 'Deposit & place order' : `${side} ${tokenSymbol}`;
  const cta = !wallet.wallet
    ? <button className="rp-btn rp-btn-primary rp-btn-block" onClick={() => void (wallet.status === 'wrong-chain' ? wallet.switchChain() : wallet.connect()).catch(() => {})}>{wallet.status === 'wrong-chain' ? 'Switch to Monad Testnet' : 'Connect wallet'}</button>
    : <button className="rp-btn rp-btn-block" data-tone={side === 'Buy' ? 'buy' : 'sell'} disabled={busy || !params || paramsQuery.isError || !balancesKnown || (kind === 'Market' && (!marketPreview || marketPreview <= 0n)) || !size || !need || (kind === 'Limit' && !preview)} onClick={() => void submit()}>{ctaLabel}</button>;
  return <TicketShell title={makerMode ? 'Maker order' : 'Trade'} venue="Kuru orderbook + AMM · Monad Testnet" kind={kind} onKind={setKind} side={side} onSide={(s) => { setSide(s); setFlow({ step: 'idle' }); }}
    sync={!params || paramsQuery.isError ? (paramsQuery.isError ? 'Kuru market reads unavailable. Retry to refresh.' : 'Loading Kuru market state…') : null}
    cta={cta}
    status={<>{quoteError && <p role="alert">{quoteError} <button onClick={() => setQuoteRevision(value => value + 1)}>Retry quote</button></p>}{paramsQuery.isError && <button onClick={() => void paramsQuery.refetch()}>Retry Kuru market</button>}{account && !balancesKnown && <p role="status">Free margin unavailable. <button onClick={() => void balancesQuery.refetch()}>Retry balances</button></p>}
      {gap > 0n && wallet.wallet && !busy && flow.step === 'idle' && <div className="rp-steps" data-testid="funding-preview"><p><strong>Separate deposit and order transactions</strong> · not atomic</p><ol><li>Step 1/2 · Deposit {trim(formatUnits(gap, fundingDecimals))} {fundingSymbol} to Kuru margin</li><li>Step 2/2 · Place {kind.toLowerCase()} {side.toLowerCase()} order</li></ol><p className="rp-note">ERC20 funding may also require a token approval. You can reject any request. If the order fails after the deposit, the margin stays deposited and can be withdrawn under Advanced.</p></div>}
      {flowText && <div className={`rp-tx ${flow.step === 'order-failed' && flow.depositHash ? 'rp-tx-warn' : flow.step.endsWith('failed') ? 'rp-tx-neutral' : ''}`} role="status" data-flow={flow.step}>{flowText}</div>}
      <TxProgress stage={stage} message={error && flow.step === 'idle' ? error : null} hash={'hash' in tx ? tx.hash : placed}/>
    </>}
    footer={kind === 'Limit' ? (postOnly ? 'Post-only limit order · good till cancelled (GTC). Rejects instead of crossing the spread, so it rests as maker liquidity.' : 'Good till cancelled (GTC). Resting orders use your Kuru margin balance.') : 'Market orders use a fresh quote, a minimum output and fill-or-kill.'}>
    {kind === 'Limit' && <div className="rp-field"><div className="rp-field-top"><label htmlFor="kuru-limit-price">Limit price</label><span className="rp-muted">{quoteSymbol} per {tokenSymbol}</span></div><div className="rp-input"><input id="kuru-limit-price" data-testid="ticket-limit-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.0"/><span className="rp-input-unit">{quoteSymbol}</span></div>{preview && <p className="rp-note">Normalized to market tick: {trim(preview.price)} {quoteSymbol}</p>}</div>}
    {kind === 'Limit' && <label className="rp-check"><input type="checkbox" data-testid="ticket-post-only" checked={postOnly} onChange={(e) => setPostOnly(e.target.checked)}/><span>Post-only (maker only)<span className="rp-muted"> — rejects if it would cross the spread</span></span></label>}
    <AmountField balanceLabel="Free margin" testId="ticket-amount" label={kind === 'Market' && side === 'Buy' ? 'Pay' : kind === 'Limit' ? 'Amount' : 'Sell'} unit={kind === 'Market' && side === 'Buy' ? quoteSymbol : tokenSymbol} value={size} onChange={setSize}
      balanceRaw={account && balancesKnown ? (kind === 'Market' && side === 'Buy' ? marginQuote : side === 'Sell' ? marginBase : null) : null} decimals={kind === 'Market' && side === 'Buy' ? Number(params?.quoteDecimals ?? 18n) : Number(params?.baseDecimals ?? 18n)}/>
    <QuoteLines rows={kind === 'Limit'
      ? [['Order total', preview ? `${trim(preview.quote)} ${quoteSymbol}` : '—', 'ticket-total'], ['You receive', preview ? (side === 'Buy' ? `${trim(preview.base)} ${tokenSymbol}` : `${trim(preview.quote)} ${quoteSymbol}`) : '—'], ['Order policy', postOnly ? 'Post-only · maker only' : 'Good till cancelled']]
      : [['You receive', marketPreview && params ? `${trim(formatUnits(marketPreview, Number(side === 'Buy' ? params.baseDecimals : params.quoteDecimals)))} ${side === 'Buy' ? tokenSymbol : quoteSymbol}` : '—', 'ticket-receive'], ['Minimum received', marketPreview && params ? `${trim(formatUnits(minOutput(marketPreview, BigInt(slippage)), Number(side === 'Buy' ? params.baseDecimals : params.quoteDecimals)))}` : '—']]}/>
    {kind === 'Market' && <SlippageControl bps={slippage} onChange={setSlippage}/>}
    {kind === 'Market' && marketPreview !== null && <p className="rp-note">Size quote only. Your connected account, funds and minimum output are simulated again before signing.</p>}
    {makerMode && params && <QuoteLines rows={[["Price tick", trim(formatUnits(kuruGrid.unitsToPriceRaw(params.tickSize, params), Number(params.quoteDecimals)))], ["Allowed price range", `${trim(formatUnits(kuruGrid.unitsToPriceRaw(params.tickSize, params), Number(params.quoteDecimals)))} – ${trim(formatUnits(kuruGrid.unitsToPriceRaw((2n ** 32n - 2n) / params.tickSize * params.tickSize, params), Number(params.quoteDecimals)))} ${quoteSymbol}`], ["Minimum / maximum size", `${trim(formatUnits(kuruGrid.unitsToSize(params.minSize, params), Number(params.baseDecimals)))} / ${trim(formatUnits(kuruGrid.unitsToSize(params.maxSize, params), Number(params.baseDecimals)))} ${tokenSymbol}`], ['Maker / taker fees (bps)', `${params.makerFeeBps} / ${params.takerFeeBps}`]]}/>}
    <details className="rp-advanced"><summary>Advanced · Kuru margin</summary>
      <p className="rp-note">Free margin · separate from wallet balances</p>
      <QuoteLines rows={[[`Margin ${quoteSymbol}`, balancesKnown ? trim(formatUnits(marginQuote, Number(params?.quoteDecimals ?? 18n))) : 'Unavailable'], [`Margin ${tokenSymbol}`, balancesKnown ? trim(formatUnits(marginBase, Number(params?.baseDecimals ?? 18n))) : 'Unavailable']]}/>
      <SegmentedControl label="Margin asset" size="sm" value={fundAsset} onChange={setFundAsset} options={[{ value: 'quote', label: quoteSymbol }, { value: 'base', label: tokenSymbol }]}/>
      <div className="rp-adv-grid">
        <label className="rp-field">Deposit<div className="rp-input"><input inputMode="decimal" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="0.0"/></div><button className="rp-btn rp-btn-ghost rp-btn-sm" disabled={busy || !params || paramsQuery.isError || !wallet.wallet || !depositAmount} onClick={() => void exec(() => prepareMarginDeposit(publicClient, account!, { token: fundAsset === 'base' ? token : params?.quoteAsset ?? zeroAddress, amount: parseExact(depositAmount, Number(fundAsset === 'base' ? params?.baseDecimals ?? 18n : params?.quoteDecimals ?? 18n)) }))}>Deposit</button></label>
        <label className="rp-field">Withdraw<div className="rp-input"><input inputMode="decimal" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="0.0"/></div><button className="rp-btn rp-btn-ghost rp-btn-sm" disabled={busy || !params || paramsQuery.isError || !balancesKnown || !wallet.wallet || !withdrawAmount} onClick={() => void exec(() => prepareMarginWithdraw(publicClient, account!, { token: fundAsset === 'base' ? token : params?.quoteAsset ?? zeroAddress, amount: parseExact(withdrawAmount, Number(fundAsset === 'base' ? params?.baseDecimals ?? 18n : params?.quoteDecimals ?? 18n)) }))}>Withdraw</button></label>
      </div>
      {makerMode && <button className="rp-btn rp-btn-ghost rp-btn-sm" disabled={busy || !params || paramsQuery.isError || !balancesKnown || !wallet.wallet || (marginBase === 0n && marginQuote === 0n)} onClick={() => void exec(() => prepareBatchWithdrawMax(publicClient, account!, [...new Set([token, params!.quoteAsset])]))}>Withdraw all free {tokenSymbol} and {quoteSymbol} margin</button>}
    </details>
  </TicketShell>;
}
