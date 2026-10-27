export type VolatilityStrategy = 'spot' | 'curve' | 'bidask';

export interface DistributionBar {
  price: number;
  type: 'bid' | 'ask';
  heightPercent: number; // 0 to 100
  size: number;
  label: string;
}

export function calculateDefaultPriceRange(
  currentPrice: number,
  strategy: VolatilityStrategy = 'spot',
  feeTierPercent: number = 0.05
): { minPrice: number; maxPrice: number; numOrders: number } {
  let rangePercent = 1.2;
  let numOrders = 49;

  if (strategy === 'spot') {
    rangePercent = 1.2 + feeTierPercent * 2;
    numOrders = 49;
  } else if (strategy === 'curve') {
    rangePercent = 0.6 + feeTierPercent;
    numOrders = 39;
  } else if (strategy === 'bidask') {
    rangePercent = 2.0 + feeTierPercent * 4;
    numOrders = 59;
  }

  const minPrice = Number((currentPrice * (1 - rangePercent / 100)).toFixed(2));
  const maxPrice = Number((currentPrice * (1 + rangePercent / 100)).toFixed(2));

  return { minPrice, maxPrice, numOrders };
}

export function generateDistributionBars(
  minPrice: number,
  maxPrice: number,
  currentPrice: number,
  strategy: VolatilityStrategy = 'spot',
  totalBars: number = 24
): DistributionBar[] {
  const bars: DistributionBar[] = [];
  const step = (maxPrice - minPrice) / (totalBars - 1 || 1);

  for (let i = 0; i < totalBars; i++) {
    const price = Number((minPrice + i * step).toFixed(2));
    const isBid = price < currentPrice;
    const type: 'bid' | 'ask' = isBid ? 'bid' : 'ask';

    let weight = 1;
    const normDist = Math.abs(price - currentPrice) / (maxPrice - minPrice || 1);

    if (strategy === 'spot') {
      weight = 0.85 + Math.sin(i * 1.5) * 0.08;
    } else if (strategy === 'curve') {
      weight = Math.exp(-Math.pow(normDist * 3, 2));
    } else if (strategy === 'bidask') {
      weight = 0.4 + normDist * 0.8;
    }

    const heightPercent = Math.min(100, Math.max(20, Math.round(weight * 85)));
    const size = Number((0.02 * (heightPercent / 100)).toFixed(4));

    bars.push({
      price,
      type,
      heightPercent,
      size,
      label: price.toFixed(2),
    });
  }

  return bars;
}

export function calculateDepositAmounts(
  baseInput: number,
  quoteInput: number,
  currentPrice: number,
  minPrice: number,
  maxPrice: number,
  activeInput: 'base' | 'quote'
): { baseRequired: number; quoteRequired: number; baseUsd: number; quoteUsd: number; totalUsd: number } {
  let baseRequired = 0;
  let quoteRequired = 0;

  if (currentPrice <= minPrice) {
    if (activeInput === 'quote') {
      quoteRequired = quoteInput;
      baseRequired = 0;
    } else {
      baseRequired = 0;
      quoteRequired = baseInput * currentPrice;
    }
  } else if (currentPrice >= maxPrice) {
    if (activeInput === 'base') {
      baseRequired = baseInput;
      quoteRequired = 0;
    } else {
      quoteRequired = 0;
      baseRequired = quoteInput / currentPrice;
    }
  } else {
    const bidRange = currentPrice - minPrice;
    const askRange = maxPrice - currentPrice;
    const ratio = askRange / (bidRange || 1);

    if (activeInput === 'base') {
      baseRequired = baseInput;
      quoteRequired = baseInput * currentPrice * (1 / (ratio || 1));
    } else {
      quoteRequired = quoteInput;
      baseRequired = (quoteInput / currentPrice) * ratio;
    }
  }

  const baseUsd = baseRequired * currentPrice;
  const quoteUsd = quoteRequired;
  const totalUsd = baseUsd + quoteUsd;

  return {
    baseRequired: Number(baseRequired.toFixed(6)),
    quoteRequired: Number(quoteRequired.toFixed(4)),
    baseUsd: Number(baseUsd.toFixed(2)),
    quoteUsd: Number(quoteUsd.toFixed(2)),
    totalUsd: Number(totalUsd.toFixed(2)),
  };
}
