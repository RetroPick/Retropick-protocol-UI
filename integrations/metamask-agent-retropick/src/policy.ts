// Policy core for the RetroPick MetaMask Agent Wallet plugin.
// Pure functions, exact bigints, no I/O — the security boundary every trading command
// must pass before anything is proposed to the user for approval. An agent NEVER
// bypasses a failed check: every reason is surfaced and the action is refused.

export const RETROPICK_CHAIN_ID = 10143;

export interface AgentPolicy {
  /** Exactly the RetroPick Monad Testnet deployment. */
  chainId: number;
  /** Markets verified onchain through the Kuru router (lowercase). */
  verifiedMarkets: string[];
  /** Hard cap on quote-collateral per order (18-dec raw). */
  maxNotionalQuoteRaw: bigint;
  /** Hard cap on base-asset size per order (base-dec raw). */
  maxOrderSizeBaseRaw: bigint;
  /** A quote older than this is stale and must be refreshed. */
  quoteExpiryMs: number;
  /** Maximum tolerated lag between the observed book and the chain head. */
  maxBookLagBlocks: number;
  /** Minimum allowed price x18 — underprices and dust are rejected outright. */
  minPriceX18: bigint;
}

/** Defaults aligned to the hackathon testnet deployment; operators may tighten them. */
export const DEFAULT_POLICY: AgentPolicy = {
  chainId: RETROPICK_CHAIN_ID,
  verifiedMarkets: ['0x1f5de72616a7fe645cf45ac66dfce8ac7452c57f'],
  maxNotionalQuoteRaw: 5n * 10n ** 16n, // 0.05 MON
  maxOrderSizeBaseRaw: 2_000_000n * 10n ** 18n, // 2M base units
  quoteExpiryMs: 30_000,
  maxBookLagBlocks: 16,
  minPriceX18: 10n ** 14n, // 0.0001
};

export type Side = 'buy' | 'sell';

export interface OrderCheckInput {
  chainId: number;
  market: string;
  side: Side;
  priceX18: bigint;
  sizeBaseRaw: bigint;
  /** Margin actually available for the required asset at check time. */
  marginAvailableRaw: bigint;
  tickSizeX18: bigint;
  /** Freshness context. */
  nowMs: number;
  quoteAtMs: number;
  bookBlock: number;
  headBlock: number;
}

export interface PolicyDecision {
  ok: boolean;
  reasons: string[];
  /** Exact quote collateral this order would lock (18-dec raw). */
  notionalQuoteRaw: bigint;
}

/** Full pre-flight check for a proposed limit order. */
export function checkOrder(policy: AgentPolicy, input: OrderCheckInput): PolicyDecision {
  const reasons: string[] = [];
  if (input.chainId !== policy.chainId) reasons.push(`chain ${input.chainId} is not the RetroPick deployment (10143)`);
  if (!policy.verifiedMarkets.includes(input.market.toLowerCase())) reasons.push('market is not in the verified Kuru registry');
  if (input.sizeBaseRaw <= 0n) reasons.push('order size must be positive');
  if (input.sizeBaseRaw > policy.maxOrderSizeBaseRaw) reasons.push(`order size exceeds policy cap (${policy.maxOrderSizeBaseRaw} base units)`);
  if (input.priceX18 < policy.minPriceX18) reasons.push('price below policy minimum — underprice protection');
  const notionalQuoteRaw = (input.priceX18 * input.sizeBaseRaw) / 10n ** 18n;
  if (notionalQuoteRaw > policy.maxNotionalQuoteRaw) reasons.push(`notional exceeds policy cap`);
  if (input.tickSizeX18 > 0n && input.priceX18 % input.tickSizeX18 !== 0n) reasons.push('price is not tick-aligned');
  const quoteAge = input.nowMs - input.quoteAtMs;
  if (quoteAge < 0 || quoteAge > policy.quoteExpiryMs) reasons.push(`quote is stale (${quoteAge}ms old)`);
  const lag = input.headBlock - input.bookBlock;
  if (lag < 0 || lag > policy.maxBookLagBlocks) reasons.push(`orderbook is ${lag} blocks behind head`);
  const required = input.side === 'buy' ? notionalQuoteRaw : input.sizeBaseRaw;
  if (input.marginAvailableRaw < required) reasons.push(`insufficient ${input.side === 'buy' ? 'quote' : 'base'} margin`);
  return { ok: reasons.length === 0, reasons, notionalQuoteRaw };
}

export interface RiskAssessmentInput {
  bestBidX18: bigint;
  bestAskX18: bigint;
  midX18: bigint;
  lastTradeBlock: number | null;
  headBlock: number;
}

export interface RiskAssessment {
  spreadBps: bigint | null;
  oneSided: boolean;
  staleBook: boolean;
  /** Human-readable, factor-explained verdict (never an ungrounded score). */
  notes: string[];
  caution: boolean;
}

/** Explainable risk read on a market before position entry. */
export function assessRisk(policy: AgentPolicy, input: RiskAssessmentInput): RiskAssessment {
  const notes: string[] = [];
  const oneSided = input.bestBidX18 === 0n || input.bestAskX18 === 0n;
  let spreadBps: bigint | null = null;
  if (!oneSided && input.midX18 > 0n) {
    spreadBps = ((input.bestAskX18 - input.bestBidX18) * 10_000n) / input.midX18;
    if (spreadBps > 300n) notes.push(`wide spread (${spreadBps} bps) — crossing costs are high`);
  } else {
    notes.push('one-sided or empty book — market orders may fail');
  }
  const lag = input.lastTradeBlock === null ? null : input.headBlock - input.lastTradeBlock;
  const staleBook = input.lastTradeBlock === null || lag === null ? false : lag > policy.maxBookLagBlocks * 8;
  if (input.lastTradeBlock === null) notes.push('no observed trades yet');
  else if (staleBook) notes.push(`last trade ${lag} blocks ago — activity may have moved`);
  return { spreadBps, oneSided, staleBook, notes, caution: notes.length > 0 };
}

/** Cancel-policy check: only orders belonging to the acting agent wallet may be cancelled. */
export function checkCancel(policy: AgentPolicy, input: { chainId: number; market: string; orderOwner: string; agentAddress: string }): PolicyDecision {
  const reasons: string[] = [];
  if (input.chainId !== policy.chainId) reasons.push('wrong chain');
  if (!policy.verifiedMarkets.includes(input.market.toLowerCase())) reasons.push('unverified market');
  if (!/^0x[0-9a-fA-F]{40}$/.test(input.agentAddress)) reasons.push('no authenticated agent wallet address — fail closed');
  else if (input.orderOwner.toLowerCase() !== input.agentAddress.toLowerCase()) reasons.push('order belongs to a different wallet — signer ownership required');
  return { ok: reasons.length === 0, reasons, notionalQuoteRaw: 0n };
}

/**
 * Resolve the AUTHENTICATED agent-wallet address from the wallet state ONLY. Never falls back to a
 * caller-supplied argument (that would let a caller assert ownership of someone else's order).
 * Returns null when no wallet is connected → callers must fail closed.
 */
export function requireAgentAddress(walletAddress: string | null | undefined): string | null {
  return walletAddress && /^0x[0-9a-fA-F]{40}$/.test(walletAddress) ? walletAddress : null;
}
