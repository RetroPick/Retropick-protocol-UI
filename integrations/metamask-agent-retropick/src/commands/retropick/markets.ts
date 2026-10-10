import { type CommandIO, PluginCommand } from '@metamask/agent-wallet/plugin';
import { RETROPICK, abis, monadClient } from '../../context.ts';

/** `mm retropick markets` — discover RetroPick launches with live lifecycle state (read-only). */
export default class MarketsCommand extends PluginCommand<Array<{ token: string; phase: number; market: string | null }>> {
  static override description = 'List verified RetroPick launches with lifecycle phase and Kuru market';
  protected readonly pluginCommandId = 'retropick markets';

  async execute(io: CommandIO) {
    const client = monadClient();
    const out = [];
    for (const entry of RETROPICK.tokens) {
      const ledger = (await client.readContract({ abi: abis.coordinator, functionName: 'ledger', address: RETROPICK.coordinator as `0x${string}`, args: [entry.token as `0x${string}`] })) as unknown as readonly unknown[];
      const receipt = (await client.readContract({ abi: abis.coordinator, functionName: 'receipt', address: RETROPICK.coordinator as `0x${string}`, args: [entry.token as `0x${string}`] })) as unknown as readonly unknown[];
      const phase = Number(ledger[0]);
      const market = phase === 2 ? String(receipt[2]) : null;
      out.push({ token: entry.token, phase, market });
      io.emit(`${entry.token} phase=${phase} (${phase === 2 ? `graduated → Kuru ${market}` : 'on curve'})`);
    }
    return out;
  }
}
