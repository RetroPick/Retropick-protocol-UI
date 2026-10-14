import { zeroAddress, isAddress, type Abi, type Address, parseAbi } from 'viem';
import { addresses, release, type ChainClient } from './chain.ts';
import { coordinatorAbi } from './abis/coordinatorAbi.ts';
import { curveAbi } from './abis/curveAbi.ts';
import { factoryAbi } from './abis/factoryAbi.ts';
import { kuruAbi } from './abis/kuruAbi.ts';
import { kuruEnvironmentAbi } from './abis/kuruEnvironmentAbi.ts';
import { marginAbi } from './abis/marginAbi.ts';
import { routerAbi } from './abis/routerAbi.ts';
import { tokenAbi } from './abis/tokenAbi.ts';
import { retroPickBuybackVaultV2Abi } from './abis/retroPickBuybackVaultV2Abi.ts';
import { retroPickFeeEscrowV2Abi } from './abis/retroPickFeeEscrowV2Abi.ts';
import { readTradeLaunch as readLaunch } from './model.ts';
import { readKuruOrder } from './orders.ts';
import { memeHookAbi } from './abis/memeHookAbi.ts';
import { buyQuote, minOutput, sellQuote } from './math.ts';
import { VENUE, readLaunchPreconditions, readBuybackReleasable, readFeeEscrowCredit, type VenueId } from './registry.ts';

const marginAddress = release.kuruEnvironment.marginAccount as Address;

/**
 * Prepared writes are the only sanctioned way the application produces contract
 * calldata. Each prepare function performs fresh chain reads, validates every
 * precondition exactly as the deployed source requires, and returns a complete,
 * bigint-exact transaction description plus any ERC20 approvals that must
 * precede it. The UI pipeline then simulates, signs, broadcasts and decodes.
 */

export type Approval = { token: Address; spender: Address; amount: bigint; label: string };

export type PreparedWrite = {
  to: Address;
  abi: readonly unknown[];
  functionName: string;
  args: readonly unknown[];
  value: bigint;
  account: Address;
  approvals: Approval[];
  /** Exact reviewed economic intent for passkey confirmation; authority remains onchain. */
  intent?: { asset: Address; destination: Address; amount: bigint };
  label: string;
  /** Preconditions that were verified while preparing (for the review UI). */
  checks: string[];
};

function fail(message: string): never {
  throw Error(message);
}

export function randomSalt(): `0x${string}` {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
}

// ---------------------------------------------------------------------------
// Flow A — launchToken
// ---------------------------------------------------------------------------

export type LaunchSocials = { twitter?: string; telegram?: string; discord?: string; website?: string; farcaster?: string };

export type LaunchTokenInput = {
  name: string;
  symbol: string;
  logo: string;
  description: string;
  socials: LaunchSocials;
  creatorFeeRecipient?: Address;
  creatorTaxBps: bigint;
  buybackEnabled: boolean;
  launchConfigId: bigint;
  pairToken: Address;
  venue: VenueId;
  expectedEconomics?: `0x${string}`; // pin; read fresh from previewVenueEconomics when absent
  salt?: `0x${string}`;
};

export async function prepareLaunchToken(chain: ChainClient, account: Address, input: LaunchTokenInput): Promise<PreparedWrite> {
  const checks: string[] = [];
  const blockNumber = await chain.getBlockNumber({ cacheTime: 0 });
  const byteLength = (text: string) => new TextEncoder().encode(text).length;
  if (byteLength(input.name) > 64 || byteLength(input.symbol) > 16 || byteLength(input.logo) > 512 || byteLength(input.description) > 2048 || Object.values(input.socials).some(value => byteLength(value ?? "") > 256)) fail("Token metadata exceeds the deployed byte limits.");
  if (!input.name.trim() || !input.symbol.trim()) fail('Token name and symbol are required.');
  const [preconditions, economics, feePolicy] = await Promise.all([
    readLaunchPreconditions(chain, account, blockNumber, { candidateAddresses: [input.pairToken] }),
    chain.readContract({
      address: addresses.factory,
      abi: factoryAbi,
      functionName: 'previewVenueEconomics',
      args: [input.launchConfigId, input.pairToken, input.venue], blockNumber,
    }),
    // Hook fee leg of the deployed combined-fee check (factory _launchToken).
    chain.readContract({
      address: addresses.hook,
      abi: memeHookAbi,
      functionName: 'currentFeePolicy', blockNumber,
    }),
  ]);
  if (input.expectedEconomics && input.expectedEconomics.toLowerCase() !== economics.toLowerCase()) fail('Launch economics changed. Review the refreshed terms before signing.');
  if (!preconditions.launchEnabled) fail('The factory is not accepting launches.');
  if (preconditions.canLaunch === false) fail('This wallet is not authorized to launch. Launches may be whitelist-only right now.');
  const config = preconditions.configs.find((entry) => entry.id === input.launchConfigId);
  if (!config) fail('Unknown launch configuration.');
  if (!config.enabled) fail('This launch configuration is disabled.');
  if (input.creatorTaxBps < 0n || input.creatorTaxBps > preconditions.maxCreatorTaxBps) {
    fail(`Creator tax ${input.creatorTaxBps} bps exceeds the ${preconditions.maxCreatorTaxBps} bps limit.`);
  }
  if (config.curveFeeBps + input.creatorTaxBps > 2000n) fail('Combined curve fee and creator tax exceeds the 2000 bps protocol limit.');
  const policyTuple = feePolicy as unknown as { hookFeeBps?: bigint | number } | [unknown, unknown, bigint | number, number] | undefined;
  const rawHookFee = Array.isArray(policyTuple) ? policyTuple[3] : policyTuple?.hookFeeBps;
  const hookFeeBps = rawHookFee === undefined ? undefined : BigInt(rawHookFee);
  if (hookFeeBps !== undefined && hookFeeBps + input.creatorTaxBps > 2000n) {
    fail('Combined hook fee and creator tax exceeds the 2000 bps protocol limit.');
  }
  const admitted = preconditions.quotes.some((quote) => quote.venue === input.venue && quote.address.toLowerCase() === input.pairToken.toLowerCase());
  if (!admitted) fail('This quote asset is not admitted for the selected graduation venue.');
  checks.push(`launchFee ${preconditions.launchFee} wei exact`);
  checks.push(`economics pin ${economics}`);
  checks.push(`venue ${input.venue === VENUE.KURU ? 'KURU' : 'UNISWAP_V4'}`);
  return {
    to: addresses.factory,
    abi: factoryAbi,
    functionName: 'launchToken',
    // Canonical overload: launchToken(TokenParams,uint256,address,uint8)
    args: [
      {
        name: input.name,
        symbol: input.symbol,
        logo: input.logo,
        description: input.description,
        socials: {
          twitter: input.socials.twitter ?? '',
          telegram: input.socials.telegram ?? '',
          discord: input.socials.discord ?? '',
          website: input.socials.website ?? '',
          farcaster: input.socials.farcaster ?? '',
        },
        creatorFeeRecipient: input.creatorFeeRecipient ?? account,
        creatorTaxBps: input.creatorTaxBps,
        buybackEnabled: input.buybackEnabled,
        expectedEconomics: input.expectedEconomics ?? economics,
        salt: input.salt ?? randomSalt(),
      },
      input.launchConfigId,
      input.pairToken,
      input.venue,
    ],
    value: preconditions.launchFee,
    account,
    approvals: [],
    label: 'Launch token',
    checks,
  };
}

// ---------------------------------------------------------------------------
// Flow B — bonding curve buy / sell
// ---------------------------------------------------------------------------

export async function prepareCurveBuy(
  chain: ChainClient,
  token: Address,
  account: Address,
  options: { quoteIn: bigint; slippageBps?: bigint; recipient?: Address },
): Promise<PreparedWrite> {
  const launch = await readLaunch(chain, token, account);
  if (Number(launch.ledger.phase) !== 0) fail('Trading has ended: this launch is no longer in the bonding phase.');
  if (options.quoteIn <= 0n) fail('Enter a buy amount.');
  const [quoteReserve, tokenReserve] = launch.reserves;
  const expected = buyQuote(options.quoteIn, quoteReserve, tokenReserve, launch.remaining, launch.fee, launch.tax);
  if (expected <= 0n) fail('This buy would return zero tokens.');
  const minTokensOut = minOutput(expected, options.slippageBps ?? 50n);
  const native = launch.packet.quoteAsset === zeroAddress;
  if (native) {
    const balance = await chain.getBalance({ address: account, blockNumber: launch.blockNumber });
    if (balance < options.quoteIn) fail('Insufficient MON balance.');
  } else {
    const balance = await chain.readContract({
      address: launch.packet.quoteAsset,
      abi: tokenAbi,
      functionName: 'balanceOf',
      args: [account],
      blockNumber: launch.blockNumber,
    });
    if (balance < options.quoteIn) fail('Insufficient quote asset balance.');
  }
  const checks = [
    `expect ≈${expected} tokens, min ${minTokensOut} after slippage`,
    native ? 'native MON: value = quoteIn' : 'ERC20 quote: approve then buy with value 0',
  ];
  return {
    to: launch.packet.curve,
    abi: curveAbi,
    functionName: 'buy',
    args: [options.quoteIn, minTokensOut, options.recipient ?? account],
    value: native ? options.quoteIn : 0n,
    account,
    approvals: native ? [] : [{ token: launch.packet.quoteAsset, spender: launch.packet.curve, amount: options.quoteIn, label: 'Approve quote asset' }],
    label: `Buy ${launch.symbol}`,
    checks,
  };
}

export async function prepareCurveSell(
  chain: ChainClient,
  token: Address,
  account: Address,
  options: { tokensIn: bigint; slippageBps?: bigint; recipient?: Address },
): Promise<PreparedWrite> {
  const launch = await readLaunch(chain, token, account);
  if (Number(launch.ledger.phase) !== 0) fail('Trading has ended: this launch is no longer in the bonding phase.');
  if (options.tokensIn <= 0n) fail('Enter a sell amount.');
  if (launch.balance < options.tokensIn) fail('Insufficient token balance.');
  if (options.tokensIn > launch.remaining) fail('Sell exceeds the tokens still tradeable on the curve.');
  const [quoteReserve, tokenReserve] = launch.reserves;
  const expected = sellQuote(options.tokensIn, tokenReserve, quoteReserve, launch.fee, launch.tax);
  if (expected <= 0n) fail('This sell would return zero quote.');
  const minQuoteOut = minOutput(expected, options.slippageBps ?? 50n);
  return {
    to: launch.packet.curve,
    abi: curveAbi,
    functionName: 'sell',
    args: [options.tokensIn, minQuoteOut, options.recipient ?? account],
    value: 0n,
    account,
    approvals: [{ token, spender: launch.packet.curve, amount: options.tokensIn, label: 'Approve launch token' }],
    label: `Sell ${launch.symbol}`,
    checks: [`expect ≈${expected} quote, min ${minQuoteOut} after slippage`, 'token approve then sell'],
  };
}

// ---------------------------------------------------------------------------
// Flow C — graduation
// ---------------------------------------------------------------------------

/** Qualified pathway: factory.graduate(token) once the curve reports readiness. */
export async function prepareFactoryGraduate(chain: ChainClient, token: Address, account: Address): Promise<PreparedWrite> {
  const launch = await readLaunch(chain, token);
  if (Number(launch.ledger.phase) !== 0) fail('Graduation has already started for this launch.');
  const graduated = await chain.readContract({
    address: launch.packet.curve,
    abi: curveAbi,
    functionName: 'graduated',
    blockNumber: launch.blockNumber,
  });
  if (graduated) fail('This curve has already graduated.');
  // Binding readiness signal from the deployed curve: sellable supply exhausted
  // (comparing virtual reserves against terminalQuote is NOT the condition).
  const ready = await chain.readContract({
    address: launch.packet.curve,
    abi: curveAbi,
    functionName: 'readyToGraduate',
    blockNumber: launch.blockNumber,
  });
  if (!ready) fail('The bonding curve has not reached its completion threshold yet.');
  return {
    to: addresses.factory,
    abi: factoryAbi,
    functionName: 'graduate',
    args: [token],
    value: 0n,
    account,
    approvals: [],
    label: 'Graduate launch',
    checks: ['coordinator phase NONE', 'curve readyToGraduate'],
  };
}

/** Recovery path: coordinator.complete(token) when a graduation is stuck in GRADUATING. */
export async function prepareCoordinatorComplete(chain: ChainClient, token: Address, account: Address): Promise<PreparedWrite> {
  const launch = await readLaunch(chain, token);
  if (Number(launch.ledger.phase) !== 1) fail('Completion is only available while a graduation is in progress.');
  return {
    to: addresses.coordinator,
    abi: coordinatorAbi,
    functionName: 'complete',
    args: [token],
    value: 0n,
    account,
    approvals: [],
    label: 'Complete graduation',
    checks: ['coordinator phase GRADUATING'],
  };
}

// ---------------------------------------------------------------------------
// Flow D — Kuru margin + orders
// ---------------------------------------------------------------------------

export type KuruMarketParams = {
  pricePrecision: bigint;
  sizePrecision: bigint;
  baseAsset: Address;
  baseDecimals: bigint;
  quoteAsset: Address;
  quoteDecimals: bigint;
  tickSize: bigint;
  minSize: bigint;
  maxSize: bigint;
  takerFeeBps: bigint;
  makerFeeBps: bigint;
};

export async function readMarketParams(chain: ChainClient, market: Address, blockNumber?: bigint): Promise<KuruMarketParams> {
  const raw = await chain.readContract({ address: market, abi: kuruAbi, functionName: 'getMarketParams', blockNumber });
  const [pricePrecision, sizePrecision, baseAsset, baseDecimals, quoteAsset, quoteDecimals, tickSize, minSize, maxSize, takerFeeBps, makerFeeBps] = raw as unknown as [bigint, bigint, Address, bigint, Address, bigint, bigint, bigint, bigint, bigint, bigint];
  // Normalize scalar decodings (viem may hand back numbers for small uints).
  return { pricePrecision: BigInt(pricePrecision), sizePrecision: BigInt(sizePrecision), baseAsset, baseDecimals: BigInt(baseDecimals), quoteAsset, quoteDecimals: BigInt(quoteDecimals), tickSize: BigInt(tickSize), minSize: BigInt(minSize), maxSize: BigInt(maxSize), takerFeeBps: BigInt(takerFeeBps), makerFeeBps: BigInt(makerFeeBps) };
}

/** Grid math: real amounts ↔ Kuru uint32 price / uint96 size units. */
export const kuruGrid = {
  /** size units for an exact raw base amount; must divide evenly. */
  sizeToUnits(sizeRaw: bigint, params: KuruMarketParams): bigint {
    const scaled = sizeRaw * params.sizePrecision;
    if (scaled % 10n ** params.baseDecimals !== 0n) fail('Token amount is finer than this market supports.');
    const units = scaled / 10n ** params.baseDecimals;
    if (units <= 0n) fail('Order size rounds to zero on this market\'s grid.');
    return units;
  },
  unitsToSize(units: bigint, params: KuruMarketParams): bigint {
    return units * 10n ** params.baseDecimals / params.sizePrecision;
  },
  /**
   * Price units are pricePrecision-scaled quote per whole token
   * (OrderBook: quote = ceil(price*size/sizePrecision) * 10^qD / pricePrecision).
   * Snapped to tick away from crossing: down for buys, up for sells.
   */
  priceToUnits(priceRaw: bigint, params: KuruMarketParams, side: 'buy' | 'sell'): bigint {
    const numerator = priceRaw * params.pricePrecision;
    const denominator = 10n ** params.quoteDecimals;
    let units = numerator / denominator;
    if (side === 'sell' && numerator % denominator !== 0n) units += 1n;
    units = side === 'buy'
      ? units / params.tickSize * params.tickSize
      : (units + params.tickSize - 1n) / params.tickSize * params.tickSize;
    if (units <= 0n || units >= 2n ** 32n - 1n) fail('Price is outside this market\'s grid.');
    return units;
  },
  unitsToPriceRaw(units: bigint, params: KuruMarketParams): bigint {
    return units * 10n ** params.quoteDecimals / params.pricePrecision;
  },
  /** quote grid units for a raw quote amount (market-buy sizing). */
  quoteToUnits(quoteRaw: bigint, params: KuruMarketParams): bigint {
    const scaled = quoteRaw * params.pricePrecision;
    if (scaled % 10n ** params.quoteDecimals !== 0n) fail('Quote amount is finer than this market supports.');
    const units = scaled / 10n ** params.quoteDecimals;
    if (units <= 0n) fail('Amount is below this market\'s quote precision.');
    return units;
  },
  /** Quote raw debited by a resting buy: mulDivUp(price,size,sizePrecision)
   * then × 10^qD / pricePrecision, mirroring the deployed book exactly. */
  quoteCostBuy(priceUnits: bigint, sizeUnits: bigint, params: KuruMarketParams): bigint {
    const intermediate = (priceUnits * sizeUnits + params.sizePrecision - 1n) / params.sizePrecision;
    return intermediate * 10n ** params.quoteDecimals / params.pricePrecision;
  },
};

const erc20Abi = parseAbi(['function balanceOf(address) view returns (uint256)', 'function allowance(address,address) view returns (uint256)']);

export async function readAllowance(chain: ChainClient, token: Address, owner: Address, spender: Address): Promise<bigint> {
  return chain.readContract({ address: token, abi: erc20Abi, functionName: 'allowance', args: [owner, spender] });
}

/** Margin deposit. token zeroAddress = native MON (msg.value = amount). */
export async function prepareMarginDeposit(
  chain: ChainClient,
  account: Address,
  options: { token: Address; amount: bigint },
): Promise<PreparedWrite> {
  if (options.amount <= 0n) fail('Enter a deposit amount.');
  const native = options.token === zeroAddress;
  const approvals: Approval[] = [];
  if (native) {
    const balance = await chain.getBalance({ address: account });
    if (balance < options.amount) fail('Insufficient MON balance.');
  } else {
    const balance = await chain.readContract({ address: options.token, abi: erc20Abi, functionName: 'balanceOf', args: [account] });
    if (balance < options.amount) fail('Insufficient token balance.');
    approvals.push({ token: options.token, spender: marginAddress, amount: options.amount, label: 'Approve margin account' });
  }
  return {
    to: marginAddress,
    abi: marginAbi,
    functionName: 'deposit',
    args: [account, options.token, options.amount],
    value: native ? options.amount : 0n,
    account,
    approvals,
    label: 'Deposit to Kuru margin',
    checks: [native ? 'native MON: value = amount' : 'ERC20: approve then deposit'],
  };
}

/** Margin withdrawal (token zeroAddress = native MON). */
export async function prepareMarginWithdraw(
  chain: ChainClient,
  account: Address,
  options: { token: Address; amount: bigint },
): Promise<PreparedWrite> {
  if (options.amount <= 0n) fail('Enter a withdrawal amount.');
  const balance = await chain.readContract({
    address: marginAddress,
    abi: marginAbi,
    functionName: 'getBalance',
    args: [account, options.token],
  });
  if (balance < options.amount) fail('Amount exceeds margin balance.');
  return {
    to: marginAddress,
    abi: marginAbi,
    functionName: 'withdraw',
    args: [options.amount, options.token],
    value: 0n,
    account,
    approvals: [],
    intent: { asset: options.token, destination: account, amount: options.amount },
    label: 'Withdraw from Kuru margin',
    checks: [`margin balance ${balance}`],
  };
}

export type KuruLimitOrderInput = {
  market: Address;
  /** Launch token (base asset) — used for market identity verification. */
  token: Address;
  side: 'buy' | 'sell';
  /** Desired price in quote-raw per one whole base token. */
  priceRaw: bigint;
  /** Desired base size in token-raw units. */
  sizeRaw: bigint;
  postOnly: boolean;
};

/** Resting limit order; funds are held in the Kuru margin account. */
export async function prepareKuruLimitOrder(chain: ChainClient, account: Address, input: KuruLimitOrderInput): Promise<PreparedWrite> {
  const blockNumber = await chain.getBlockNumber({ cacheTime: 0 });
  const params = await assertKuruMarketIdentity(chain, input.market, input.token, blockNumber);
  const priceUnits = kuruGrid.priceToUnits(input.priceRaw, params, input.side);
  if (priceUnits % params.tickSize !== 0n) fail('Price is not on this market\'s tick grid.');
  const sizeUnits = kuruGrid.sizeToUnits(input.sizeRaw, params);
  if (sizeUnits < params.minSize) fail(`Order size is below this market's minimum (${params.minSize} grid units).`);
  if (sizeUnits > params.maxSize) fail(`Order size is above this market's maximum (${params.maxSize} grid units).`);
  if (input.side === 'buy') {
    const cost = kuruGrid.quoteCostBuy(priceUnits, sizeUnits, params);
    const balance = await chain.readContract({
      address: marginAddress, abi: marginAbi, functionName: 'getBalance', args: [account, params.quoteAsset], blockNumber,
    });
    if (balance < cost) fail('Insufficient quote balance in the Kuru margin account for this order.');
  } else {
    const balance = await chain.readContract({
      address: marginAddress, abi: marginAbi, functionName: 'getBalance', args: [account, params.baseAsset], blockNumber,
    });
    if (balance < input.sizeRaw) fail('Insufficient token balance in the Kuru margin account for this order.');
  }
  return {
    to: input.market,
    abi: kuruAbi,
    functionName: input.side === 'buy' ? 'addBuyOrder' : 'addSellOrder',
    args: [Number(priceUnits), sizeUnits, input.postOnly],
    value: 0n,
    account,
    approvals: [],
    label: `${input.side === 'buy' ? 'Buy' : 'Sell'} limit order`,
    checks: [
      `price ${priceUnits} grid units (tick ${params.tickSize})`,
      `size ${sizeUnits} grid units`,
      'funds debited from margin account',
    ],
  };
}

export type KuruMarketOrderInput = {
  market: Address;
  /** Launch token (base asset) — used for market identity verification. */
  token: Address;
  side: 'buy' | 'sell';
  /** Buy: quote amount raw. Sell: base amount raw. */
  amountRaw: bigint;
  /** Optional explicit minimum; the SDK also derives a fresh quoted slippage bound. */
  minOutcomeRaw: bigint;
  slippageBps?: bigint;
};

/** Immediate fill-or-kill market order against the book, funded from the margin account. */
export async function prepareKuruMarketOrder(chain: ChainClient, account: Address, input: KuruMarketOrderInput): Promise<PreparedWrite> {
  if (!isAddress(account) || account === zeroAddress) fail('A connected nonzero wallet account is required.');
  const blockNumber = await chain.getBlockNumber({ cacheTime: 0 });
  const params = await assertKuruMarketIdentity(chain, input.market, input.token, blockNumber);
  const isBuy = input.side === 'buy';
  const units = isBuy
    // _quoteSize is denominated in quote grid units: raw * pricePrecision / 10^quoteDecimals
    ? kuruGrid.quoteToUnits(input.amountRaw, params)
    : kuruGrid.sizeToUnits(input.amountRaw, params);
  const balanceAsset = isBuy ? params.quoteAsset : params.baseAsset;
  const balance = await chain.readContract({
    address: marginAddress, abi: marginAbi, functionName: 'getBalance', args: [account, balanceAsset], blockNumber,
  });
  if (balance < input.amountRaw) fail(`Insufficient ${isBuy ? 'quote' : 'token'} balance in the Kuru margin account.`);
  if (units <= 0n || units >= 2n ** 96n) fail('Market amount is outside the uint96 grid.');
  const quoted = await chain.simulateContract({ address: input.market, abi: kuruAbi, functionName: isBuy ? 'placeAndExecuteMarketBuy' : 'placeAndExecuteMarketSell', args: [units, 0n, true, true], account: zeroAddress, blockNumber });
  const expected = BigInt(quoted.result);
  if (expected <= 0n) fail('This market order has no executable liquidity.');
  const quotedMinimum = minOutput(expected, input.slippageBps ?? 50n);
  const minimum = quotedMinimum > input.minOutcomeRaw ? quotedMinimum : input.minOutcomeRaw;
  if (minimum <= 0n) fail('Market output is below the supported precision.');
  // The source's zero-address quote returns before fill-or-kill and minimum
  // checks. Qualify the exact funded execution from the connected account too.
  await chain.simulateContract({ address: input.market, abi: kuruAbi, functionName: isBuy ? 'placeAndExecuteMarketBuy' : 'placeAndExecuteMarketSell', args: [units, minimum, true, true], account, value: 0n, blockNumber });
  return {
    to: input.market,
    abi: kuruAbi,
    functionName: isBuy ? 'placeAndExecuteMarketBuy' : 'placeAndExecuteMarketSell',
    args: [units, minimum, true, true],
    value: 0n,
    account,
    approvals: [],
    label: `${isBuy ? 'Buy' : 'Sell'} market order`,
    checks: ['margin-funded, fill-or-kill', `expected output ${expected}; minimum ${minimum} raw`],
  };
}

/** Cancel resting orders by id (ids come from OrderCreated logs); the
 * NoRevert variant skips already-filled/cancelled ids instead of reverting. */
export async function prepareKuruCancel(chain: ChainClient, market: Address, account: Address, orderIds: number[]): Promise<PreparedWrite> {
  if (orderIds.length === 0) fail('No orders selected.');
  const blockNumber = await chain.getBlockNumber({ cacheTime: 0 });
  const params = await readMarketParams(chain, market, blockNumber);
  await assertKuruMarketIdentity(chain, market, params.baseAsset, blockNumber);
  for (const id of orderIds) {
    if (!Number.isSafeInteger(id) || id <= 0 || id >= 2 ** 40) fail('Invalid event-derived order id.');
    const {order, active} = await readKuruOrder(chain, market, id, blockNumber);
    if (active && order[1] > 0n && order[0].toLowerCase() !== account.toLowerCase()) fail('This order belongs to another wallet.');
  }
  return {
    to: market,
    abi: kuruAbi,
    functionName: 'batchCancelOrdersNoRevert',
    args: [orderIds],
    value: 0n,
    account,
    approvals: [],
    label: 'Cancel orders',
    checks: [`${orderIds.length} order(s)`, 'already-gone ids skipped'],
  };
}

/** Withdraw every token balance held in the margin account. */
export async function prepareBatchWithdrawMax(chain: ChainClient, account: Address, tokens: Address[]): Promise<PreparedWrite> {
  if (tokens.length === 0) fail('No tokens selected.');
  void chain;
  return {
    to: marginAddress,
    abi: marginAbi,
    functionName: 'batchWithdrawMaxTokens',
    args: [tokens],
    value: 0n,
    account,
    approvals: [],
    label: 'Withdraw all margin balances',
    checks: [`${tokens.length} token(s)`],
  };
}

/** Verify a caller-supplied market is the verified RetroPick Kuru deployment
 * for this base token before any order is prepared against it. */
export async function assertKuruMarketIdentity(chain: ChainClient, market: Address, token: Address, targetBlock?: bigint): Promise<KuruMarketParams> {
  const blockNumber = targetBlock ?? await chain.getBlockNumber({ cacheTime: 0 });
  const router = release.kuruEnvironment.router as Address;
  const [params, margin, orderImpl, vaultImpl, registered, receipt, ledger, packet] = await Promise.all([
    chain.readContract({ address: market, abi: kuruAbi, functionName: 'getMarketParams', blockNumber }),
    chain.readContract({ address: router, abi: routerAbi, functionName: 'marginAccountAddress', blockNumber }),
    chain.readContract({ address: router, abi: routerAbi, functionName: 'orderBookImplementation', blockNumber }),
    chain.readContract({ address: router, abi: routerAbi, functionName: 'kuruAmmVaultImplementation', blockNumber }),
    chain.readContract({ address: router, abi: routerAbi, functionName: 'verifiedMarket', args: [market], blockNumber }),
    chain.readContract({ address: addresses.coordinator, abi: coordinatorAbi, functionName: 'receipt', args: [token], blockNumber }),
    chain.readContract({ address: addresses.coordinator, abi: coordinatorAbi, functionName: 'ledger', args: [token], blockNumber }),
    chain.readContract({ address: addresses.coordinator, abi: coordinatorAbi, functionName: 'packet', args: [token], blockNumber }),
    chain.readContract({ address: addresses.kuruEnvironment, abi: kuruEnvironmentAbi, functionName: 'validate', blockNumber }),
  ]);
  const typed = params as unknown as [bigint, bigint, Address, bigint, Address, bigint, bigint, bigint, bigint, bigint, bigint];
  const lower = (value: unknown) => String(value).toLowerCase();
  if (ledger.phase !== 2 || packet.venue !== VENUE.KURU || lower(packet.token) !== lower(token) || lower(receipt.market) !== lower(market)
    || lower(packet.quoteAsset) !== lower(typed[4]) || registered.some((value, index) => lower(value) !== lower(typed[index])) || lower(typed[2]) !== lower(token)
    || lower(margin) !== lower(release.kuruEnvironment.marginAccount) || lower(orderImpl) !== lower(release.kuruEnvironment.orderBookImplementation)
    || lower(vaultImpl) !== lower(release.kuruEnvironment.vaultImplementation)) fail('This market is not the verified RetroPick Kuru deployment for that token.');
  return { pricePrecision: BigInt(typed[0]), sizePrecision: BigInt(typed[1]), baseAsset: typed[2], baseDecimals: BigInt(typed[3]), quoteAsset: typed[4], quoteDecimals: BigInt(typed[5]), tickSize: BigInt(typed[6]), minSize: BigInt(typed[7]), maxSize: BigInt(typed[8]), takerFeeBps: BigInt(typed[9]), makerFeeBps: BigInt(typed[10]) };
}

// ---------------------------------------------------------------------------
// Flow E — creator claims
// ---------------------------------------------------------------------------

/** Claim all native creator fees escrowed for the account. */
export async function prepareFeeClaim(chain: ChainClient, account: Address): Promise<PreparedWrite> {
  const credit = await readFeeEscrowCredit(chain, account);
  if (credit <= 0n) fail('No claimable creator fees.');
  return {
    to: addresses.feeEscrow,
    abi: retroPickFeeEscrowV2Abi as unknown as readonly unknown[],
    functionName: 'claim',
    args: [],
    value: 0n,
    account,
    approvals: [],
    intent: { asset: zeroAddress, destination: account, amount: credit },
    label: 'Claim creator fees',
    checks: [`escrow credit ${credit} wei`],
  };
}

/** Release vested buyback proceeds for a launched token. The vault pays the
 * creator share as FeeEscrow *token* credit — pair with prepareFeeClaimToken. */
export async function prepareBuybackRelease(chain: ChainClient, token: Address, account: Address): Promise<PreparedWrite> {
  const blockNumber = await chain.getBlockNumber({ cacheTime: 0 });
  const [releasable, terms] = await Promise.all([readBuybackReleasable(chain, token, blockNumber), chain.readContract({ address: addresses.buybackVault, abi: retroPickBuybackVaultV2Abi, functionName: 'vestingTerms', args: [token], blockNumber })]);
  if (terms[0].toLowerCase() !== account.toLowerCase() && terms[1].toLowerCase() !== account.toLowerCase()) fail('Only a current vest beneficiary can release this token.');
  if (releasable <= 0n) fail('Nothing is currently releasable for this launch.');
  return {
    to: addresses.buybackVault,
    abi: retroPickBuybackVaultV2Abi as unknown as readonly unknown[],
    functionName: 'release',
    args: [token],
    value: 0n,
    account,
    approvals: [],
    intent: { asset: token, destination: account, amount: releasable },
    label: 'Release buyback proceeds',
    checks: [`releasable ${releasable}`, 'proceeds land as FeeEscrow token credit'],
  };
}

/** Claim escrowed ERC-20 fees (including released buyback credit) for `token`. */
export async function prepareFeeClaimToken(chain: ChainClient, account: Address, token: Address): Promise<PreparedWrite> {
  const credit = await chain.readContract({
    address: addresses.feeEscrow,
    abi: retroPickFeeEscrowV2Abi as never,
    functionName: 'balanceOfToken',
    args: [account, token],
  });
  if (credit <= 0n) fail('No claimable token fees for this asset yet.');
  return {
    to: addresses.feeEscrow,
    abi: retroPickFeeEscrowV2Abi as unknown as readonly unknown[],
    functionName: 'claimToken',
    args: [token],
    value: 0n,
    account,
    approvals: [],
    intent: { asset: token, destination: account, amount: credit },
    label: 'Claim token fees',
    checks: [`escrow credit ${credit}`],
  };
}

/** Approvals that still need executing before a prepared write can land. */
export async function missingApprovals(chain: ChainClient, write: PreparedWrite): Promise<Approval[]> {
  const missing: Approval[] = [];
  for (const approval of write.approvals) {
    const current = await readAllowance(chain, approval.token, write.account, approval.spender);
    if (current < approval.amount) missing.push(approval);
  }
  return missing;
}


/**
 * Prepare the VOLUNTARY transfer of a launch's creator-fee recipient to a new address, callable
 * ONLY by the current recipient (Factory.transferCreatorFeeRecipient — immediate, no timelock).
 *
 * This redirects FUTURE creator fees only. It does NOT move already-escrowed credits (those stay
 * claimable by the original msg.sender), does NOT change the immutable ERC-20 `deployer`
 * attribution, and is distinct from the owner-administered, timelocked `setCreatorFeeRecipient`
 * override. Reverts (previewed here as a precondition) if the caller is not the current recipient.
 */
export async function prepareTransferCreatorFeeRecipient(chain: ChainClient, token: Address, account: Address, newRecipient: Address): Promise<PreparedWrite> {
  if (!/^0x[0-9a-fA-F]{40}$/.test(newRecipient) || /^0x0{40}$/.test(newRecipient)) fail('New recipient must be a non-zero address.');
  const blockNumber = await chain.getBlockNumber({ cacheTime: 0 });
  const [launched, pending] = await Promise.all([
    chain.readContract({ address: addresses.factory, abi: factoryAbi, functionName: 'getLaunchedToken', args: [token], blockNumber }),
    chain.readContract({ address: addresses.factory, abi: factoryAbi, functionName: 'pendingCreatorFeeRecipient', args: [token], blockNumber }),
  ]);
  const block = await chain.getBlock({ blockNumber });
  if (pending[0] !== zeroAddress && pending[2] >= block.timestamp) fail('A pending owner recipient override is active. Resolve it before a voluntary handoff.');
  if (!launched.exists) fail('Token is not a RetroPick launch.');
  if (launched.creatorFeeRecipient.toLowerCase() !== account.toLowerCase()) fail('Only the current creator-fee recipient can transfer future fee rights.');
  if (launched.creatorFeeRecipient.toLowerCase() === newRecipient.toLowerCase()) fail('New recipient equals the current recipient.');
  return {
    to: addresses.factory,
    abi: factoryAbi as unknown as readonly unknown[],
    functionName: 'transferCreatorFeeRecipient',
    args: [token, newRecipient],
    value: 0n,
    account,
    approvals: [],
    intent: { asset: token, destination: newRecipient, amount: 0n },
    label: 'Transfer future creator fees',
    checks: [
      `current recipient ${launched.creatorFeeRecipient} == caller`,
      `immutable deployer ${launched.deployer} (attribution unchanged)`,
      `redirects FUTURE fees only; escrowed credits stay with the original recipient`,
    ],
  };
}
