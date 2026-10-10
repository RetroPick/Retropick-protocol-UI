import { Args } from '@oclif/core';
import { type CommandIO, PluginCommand } from '@metamask/agent-wallet/plugin';
import { RETROPICK, abis, monadClient } from '../../../context.ts';

/** `mm retropick market inspect <token>` — lifecycle + live orderbook state (read-only). */
export default class MarketInspectCommand extends PluginCommand<{ token: string; phase: number; market: string; bestBidX18: string; bestAskX18: string; headBlock: string }> {
  static override description = 'Inspect a RetroPick launch: graduation ledger + Kuru best bid/ask';
  static override args = { token: Args.string({ required: true, description: 'launch token address' }) };
  protected readonly pluginCommandId = 'retropick market inspect';

  async execute(io: CommandIO) {
    const token = this.argv[0] ?? '';
    const entry = RETROPICK.tokens.find((t) => t.token.toLowerCase() === token.toLowerCase());
    if (!entry) throw new Error('unknown token — not a verified RetroPick launch');
    const client = monadClient();
    const [ledger, best, headBlock] = (await Promise.all([
      client.readContract({ abi: abis.coordinator, functionName: 'ledger', address: RETROPICK.coordinator as `0x${string}`, args: [entry.token as `0x${string}`] }),
      client.readContract({ abi: abis.kuru, functionName: 'bestBidAsk', address: entry.market as `0x${string}` }),
      client.getBlockNumber(),
    ])) as unknown as [readonly bigint[], readonly bigint[], bigint];
    const phase = Number(ledger[0]);
    io.emit(`phase=${phase} bestBid=${best[0]} bestAsk=${best[1]} head=${headBlock}`);
    return { token: entry.token, phase, market: entry.market, bestBidX18: best[0].toString(), bestAskX18: best[1].toString(), headBlock: headBlock.toString() };
  }
}
