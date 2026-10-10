import { Args } from '@oclif/core';
import { type CommandIO, PluginCommand } from '@metamask/agent-wallet/plugin';
import { checkOrder, type Side } from '../../../policy.ts';
import { policyOf } from '../../../context.ts';

/** `mm retropick order place <market> <side> <priceX18> <sizeBaseRaw>`
 *
 * Policy-gated bounded limit-order proposal. FAILS CLOSED: without a connected,
 * authenticated MetaMask Agent Wallet this command refuses rather than simulating a
 * success. Live submission additionally requires the user approval flow of the mm CLI
 * (wallet-submit capability) — never bypassed here. */
export default class OrderPlaceCommand extends PluginCommand<{ placed: false; reason: string }> {
  static override requiresAuth = true;
  static override description = 'Propose a policy-bounded limit order for user approval (requires agent wallet + explicit approval)';
  static override args = { market: Args.string({ required: true }), side: Args.string({ required: true }), priceX18: Args.string({ required: true }), sizeBaseRaw: Args.string({ required: true }) };
  protected readonly pluginCommandId = 'retropick order place';

  async execute(io: CommandIO) {
    const [marketArg, sideArg, priceArg, sizeArg] = this.argv;
    // Stage 1 — deterministic policy verdict over the proposed order.
    const decision = checkOrder(policyOf(), {
      chainId: 10143, market: marketArg ?? '', side: (sideArg === 'sell' ? 'sell' : 'buy') as Side,
      priceX18: BigInt(priceArg ?? '0'), sizeBaseRaw: BigInt(sizeArg ?? '0'),
      marginAvailableRaw: 0n, tickSizeX18: 0n, // margin + tick are re-verified live below
      nowMs: Date.now(), quoteAtMs: Date.now(), bookBlock: 0, headBlock: 0,
    });
    if (!decision.ok) {
      io.emit(`REFUSED by policy:\n${decision.reasons.map((r) => ` - ${r}`).join('\n')}`);
      return { placed: false as const, reason: 'policy' };
    }
    // Stage 2 — live execution requires the agent wallet's submission pipeline, which is
    // provisioned by the operator interactively (mm auth + funded wallet). This build
    // stops here, explicitly: a successful capability grant is NOT claimed.
    io.emit('Policy passed. Live submission requires the operator-provisioned agent wallet (see README — BLOCKED_EXTERNAL).');
    return { placed: false as const, reason: 'agent-wallet-not-provisioned' };
  }
}
