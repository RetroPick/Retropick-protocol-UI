import { formatUnits } from 'viem';
import { kuruGrid, type KuruMarketParams } from '@retropick/launchpad-sdk/prepare';
import { parseExact } from '@retropick/launchpad-sdk/math';

export interface MakerLeg { side: 'Buy' | 'Sell'; price: string; size: string }
export interface MakerDraft extends MakerLeg { id: string }
export interface MakerInputs { bidPrice: string; bidSize: string; askPrice: string; askSize: string }
export interface MakerPair { id: string; bid: MakerLeg; ask: MakerLeg; bidHash: string | null; askHash: string | null }

export function validateMakerDrafts(params: KuruMarketParams, inputs: MakerInputs): { bid: MakerLeg; ask: MakerLeg } {
  const leg = (side: 'Buy' | 'Sell', price: string, size: string) => {
    const p = kuruGrid.priceToUnits(parseExact(price, Number(params.quoteDecimals)), params, side === 'Buy' ? 'buy' : 'sell');
    const s = kuruGrid.sizeToUnits(parseExact(size, Number(params.baseDecimals)), params);
    if (p <= 0n || p >= 2n ** 32n - 1n) throw Error('Price is outside the market price range.');
    if (s < params.minSize || s > params.maxSize) throw Error('Amount is outside the market size range.');
    return { units: p, draft: { side, price: formatUnits(kuruGrid.unitsToPriceRaw(p, params), Number(params.quoteDecimals)), size: formatUnits(kuruGrid.unitsToSize(s, params), Number(params.baseDecimals)) } };
  };
  const bid = leg('Buy', inputs.bidPrice, inputs.bidSize), ask = leg('Sell', inputs.askPrice, inputs.askSize);
  if (bid.units >= ask.units) throw Error('The normalized bid must be below the normalized ask.');
  return { bid: bid.draft, ask: ask.draft };
}

/** A successful first leg is retained when the second leg fails or is rejected. */
export function confirmMakerLeg(pair: MakerPair, draftId: string, hash: string): MakerPair {
  if (draftId === `${pair.id}:bid` && pair.bidHash === null) return { ...pair, bidHash: hash };
  if (draftId === `${pair.id}:ask` && pair.bidHash !== null && pair.askHash === null) return { ...pair, askHash: hash };
  return pair;
}
