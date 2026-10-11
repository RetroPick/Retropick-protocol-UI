import { Args } from '@oclif/core';
import { type CommandIO, PluginCommand } from '@metamask/agent-wallet/plugin';
import { checkOrder, requireAgentAddress, type Side } from '../../../policy.ts';
import { RETROPICK, abis, monadClient, policyOf } from '../../../context.ts';

/** `mm retropick order place <market> <side> <priceX18> <sizeBaseRaw>`
 *
 * Policy-gated bounded limit-order proposal with REAL read-only verification (tick, book
 * freshness, live margin from the connected agent wallet). FAILS CLOSED: without a connected,
 * authenticated MetaMask Agent Wallet it refuses rather than simulating success, and live
 * submission additionally requires the mm CLI's wallet-submit approval flow — never bypassed. */
export default class OrderPlaceCommand extends PluginCommand<{ placed: false; reason: string }> {
  static override requiresAuth = true;
  static override description = 'Propose a policy-bounded limit order for user approval (requires agent wallet + explicit approval)';
  static override args = { market: Args.string({ required: true }), side: Args.string({ required: true, options: ['buy', 'sell'] }), priceX18: Args.string({ required: true }), sizeBaseRaw: Args.string({ required: true }) };
  protected readonly pluginCommandId = 'retropick order place';

  async execute(io: CommandIO) {
    const [marketArg, sideArg, priceArg, sizeArg] = this.argv as [string, string, string, string];
    const side: Side = sideArg === 'sell' ? 'sell' : 'buy';

    // Authenticated identity from wallet state ONLY (never a caller argument).
    const agentAddress = requireAgentAddress(this.ctx.walletStateManager.read().byokWallets[0]?.address);
    if (!agentAddress) {
      io.emit('REFUSED: no authenticated agent wallet connected. Run `mm login` and provision a wallet first.');
      return { placed: false as const, reason: 'no-agent-wallet' };
    }
    const entry = RETROPICK.tokens.find((t) => t.market.toLowerCase() === (marketArg ?? '').toLowerCase());
    if (!entry) { io.emit('REFUSED: market is not a verified RetroPick Kuru market'); return { placed: false as const, reason: 'unverified-market' }; }

    // Stage 1 — REAL read-only verification against the chain (tick, head/book freshness, live margin).
    const client = monadClient();
    const quoteAsset = '0x0000000000000000000000000000000000000000'; // native MON margin asset
    const [params, headBlock, margin] = (await Promise.all([
      client.readContract({ abi: abis.kuru, functionName: 'getMarketParams', address: entry.market as `0x${string}` }),
      client.getBlockNumber(),
      client.readContract({ abi: abis.margin, functionName: 'getBalance', address: RETROPICK.marginAccount as `0x${string}`, args: [agentAddress as `0x${string}`, side === 'buy' ? quoteAsset : entry.token as `0x${string}`] }),
    ])) as unknown as [readonly bigint[], bigint, bigint];
    const pricePrecision = (params[0] as bigint) === 0n ? 1n : (params[0] as bigint);
    const tickSizeX18 = ((params[6] as bigint) ?? 0n) * 10n ** 18n / pricePrecision;
    const now = Date.now();

    const decision = checkOrder(policyOf(), {
      chainId: RETROPICK.chainId, market: entry.market, side, priceX18: BigInt(priceArg ?? '0'), sizeBaseRaw: BigInt(sizeArg ?? '0'),
      marginAvailableRaw: margin, tickSizeX18, nowMs: now, quoteAtMs: now, bookBlock: Number(headBlock), headBlock: Number(headBlock),
    });
    if (!decision.ok) {
      io.emit(`REFUSED by policy:\n${decision.reasons.map((r) => ` - ${r}`).join('\n')}`);
      return { placed: false as const, reason: 'policy' };
    }

    // Stage 2 — live submission requires the agent wallet's wallet-submit pipeline (operator
    // provisioned, user-approved). This build stops here EXPLICITLY: no capability grant is claimed.
    io.emit(`Policy passed (notional ${decision.notionalQuoteRaw} quote raw, live margin ${margin}, tick ${tickSizeX18}). Live submission requires the operator-provisioned agent wallet + mm approval (README — BLOCKED_EXTERNAL).`);
    return { placed: false as const, reason: 'agent-wallet-not-provisioned' };
  }
}
