import { Args } from '@oclif/core';
import { type CommandIO, PluginCommand } from '@metamask/agent-wallet/plugin';
import { assessRisk } from '../../../policy.ts';
import { RETROPICK, abis, monadClient, policyOf } from '../../../context.ts';

/** `mm retropick market risk <market>` — explainable pre-entry risk read (never a score without factors). */
export default class MarketRiskCommand extends PluginCommand<{ spreadBps: string | null; oneSided: boolean; staleBook: boolean; notes: string[] }> {
  static override description = 'Explainable risk factors for a market before entering a position';
  static override args = { market: Args.string({ required: true }) };
  protected readonly pluginCommandId = 'retropick market risk';

  async execute(io: CommandIO) {
    const market = this.argv[0] ?? '';
    const entry = RETROPICK.tokens.find((t) => t.market.toLowerCase() === market.toLowerCase());
    if (!entry) throw new Error('unknown market');
    const client = monadClient();
    const [best, headBlock] = (await Promise.all([
      client.readContract({ abi: abis.kuru, functionName: 'bestBidAsk', address: entry.market as `0x${string}` }),
      client.getBlockNumber(),
    ])) as unknown as [readonly bigint[], bigint];
    const mid = best[0] + best[1] > 0n ? (best[0] + best[1]) / 2n : 0n;
    const risk = assessRisk(policyOf(), { bestBidX18: best[0], bestAskX18: best[1], midX18: mid, lastTradeBlock: null, headBlock: Number(headBlock) });
    for (const note of risk.notes) io.emit(`risk: ${note}`);
    if (risk.caution) io.emit('Risk: reducing intended order size may be prudent.');
    return { spreadBps: risk.spreadBps?.toString() ?? null, oneSided: risk.oneSided, staleBook: risk.staleBook, notes: risk.notes };
  }
}
