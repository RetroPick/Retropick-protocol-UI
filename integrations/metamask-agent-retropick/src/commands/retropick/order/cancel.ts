import { Args } from '@oclif/core';
import { type CommandIO, PluginCommand } from '@metamask/agent-wallet/plugin';
import { checkCancel } from '../../../policy.ts';
import { policyOf } from '../../../context.ts';

/** `mm retropick order cancel <market> <orderId> <owner>`
 * Signer-ownership checked: only orders belonging to the acting agent wallet may be cancelled. */
export default class OrderCancelCommand extends PluginCommand<{ cancelled: false; reason: string }> {
  static override requiresAuth = true;
  static override description = 'Cancel one of the agent wallet\'s own orders (policy + ownership gated)';
  static override args = { market: Args.string({ required: true }), orderId: Args.string({ required: true }), owner: Args.string({ required: true }) };
  protected readonly pluginCommandId = 'retropick order cancel';

  async execute(io: CommandIO) {
    const [market, orderId, owner] = this.argv;
    const agentAddress = this.ctx.walletStateManager.read().byokWallets[0]?.address ?? owner ?? '';
    const decision = checkCancel(policyOf(), { chainId: 10143, market: market ?? '', orderOwner: owner ?? '', agentAddress });
    if (!decision.ok) {
      io.emit(`REFUSED by policy:\n${decision.reasons.map((r) => ` - ${r}`).join('\n')}`);
      return { cancelled: false as const, reason: 'policy' };
    }
    io.emit('Ownership verified. Live cancellation requires the operator-provisioned agent wallet (README — BLOCKED_EXTERNAL).');
    return { cancelled: false as const, reason: 'agent-wallet-not-provisioned' };
  }
}
