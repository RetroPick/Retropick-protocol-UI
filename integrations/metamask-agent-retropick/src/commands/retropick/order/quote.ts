import { Args } from '@oclif/core';
import { type CommandIO, PluginCommand } from '@metamask/agent-wallet/plugin';
import { checkOrder, type Side } from '../../../policy.ts';
import { RETROPICK, abis, monadClient, policyOf } from '../../../context.ts';

/** `mm retropick order quote <market> <side> <priceX18> <sizeBaseRaw>` — exact executable
 *  parameters + full policy verdict. Read-only; no order is placed. */
export default class OrderQuoteCommand extends PluginCommand<{ ok: boolean; reasons: string[]; notionalQuoteRaw: string }> {
  static override description = 'Compute exact order parameters and run the full policy check (no order placed)';
  static override args = {
    market: Args.string({ required: true }),
    side: Args.string({ required: true, options: ['buy', 'sell'] }),
    priceX18: Args.string({ required: true, description: 'limit price in 1e18 fixed point' }),
    sizeBaseRaw: Args.string({ required: true, description: 'size in base raw units' }),
  };
  protected readonly pluginCommandId = 'retropick order quote';

  async execute(io: CommandIO) {
    const [market, sideArg, priceArg, sizeArg] = this.argv as [string, string, string, string];
    const side = sideArg === 'sell' ? 'sell' : 'buy';
    const entry = RETROPICK.tokens.find((t) => t.market.toLowerCase() === (market ?? '').toLowerCase());
    if (!entry) throw new Error('market is not a verified RetroPick Kuru market');
    const client = monadClient();
    const [params, headBlock, now] = (await Promise.all([
      client.readContract({ abi: abis.kuru, functionName: 'getMarketParams', address: entry.market as `0x${string}` }),
      client.getBlockNumber(),
      Promise.resolve(Date.now()),
    ])) as unknown as [readonly bigint[], bigint, number];
    const pricePrecision = params[0] === 0n ? 1n : (params[0] as bigint);
    const tick = (params[6] as bigint) ?? 0n;
    const decision = checkOrder(policyOf(), {
      chainId: RETROPICK.chainId, market: entry.market, side: side as Side, priceX18: BigInt(priceArg ?? '0'), sizeBaseRaw: BigInt(sizeArg ?? '0'),
      marginAvailableRaw: 0n, // quoting does not claim margin sufficiency; `place` re-checks live
      tickSizeX18: tick * 10n ** 18n / pricePrecision,
      nowMs: now, quoteAtMs: now, bookBlock: Number(headBlock), headBlock: Number(headBlock),
    });
    if (decision.ok) io.emit(`OK — notional ${decision.notionalQuoteRaw} quote raw; passes all policy checks`);
    else io.emit(`REFUSED:\n${decision.reasons.map((r) => ` - ${r}`).join('\n')}`);
    return { ok: decision.ok, reasons: decision.reasons, notionalQuoteRaw: decision.notionalQuoteRaw.toString() };
  }
}
