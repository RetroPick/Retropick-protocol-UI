import { Args } from '@oclif/core';
import { type CommandIO, PluginCommand } from '@metamask/agent-wallet/plugin';
import { RETROPICK, abis, monadClient } from '../../../context.ts';

/** `mm retropick wallet exposure <market>` — margin balances per asset (read-only). */
export default class WalletExposureCommand extends PluginCommand<{ address: string; quoteMarginRaw: string; baseMarginRaw: string }> {
  static override description = "Read the agent wallet's Kuru margin balances (quote and base)";
  static override args = { market: Args.string({ required: true }) };
  protected readonly pluginCommandId = 'retropick wallet exposure';

  async execute(io: CommandIO) {
    const market = this.argv[0] ?? '';
    const entry = RETROPICK.tokens.find((t) => t.market.toLowerCase() === market.toLowerCase());
    if (!entry) throw new Error('unknown market');
    const address = this.ctx.walletStateManager.read().byokWallets[0]?.address ?? '';
    if (!address) return { address: '', quoteMarginRaw: '0', baseMarginRaw: '0' };
    const client = monadClient();
    const zeroAsset = '0x0000000000000000000000000000000000000000';
    const [quote, base] = (await Promise.all([
      client.readContract({ abi: abis.margin, functionName: 'getBalance', address: RETROPICK.marginAccount as `0x${string}`, args: [address as `0x${string}`, zeroAsset] }),
      client.readContract({ abi: abis.margin, functionName: 'getBalance', address: RETROPICK.marginAccount as `0x${string}`, args: [address as `0x${string}`, entry.token as `0x${string}`] }),
    ])) as unknown as [bigint, bigint];
    io.emit(`margin MON=${quote} base=${base}`);
    return { address, quoteMarginRaw: quote.toString(), baseMarginRaw: base.toString() };
  }
}
