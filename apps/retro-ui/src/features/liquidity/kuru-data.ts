export interface KuruToken {
  symbol: string;
  name: string;
  iconBg: string;
  iconColor: string;
  iconText?: string;
  address: string;
  decimals: number;
  price: number;
}

export interface KuruPoolMarket {
  id: string; // e.g. "#00718"
  symbol: string; // e.g. "WETH / USDC"
  baseToken: KuruToken;
  quoteToken: KuruToken;
  marketAddress: string;
  tvl: number;
  volume24h: number;
  fees24h: number;
  poolApr: number;
  currentPrice: number;
  priceChange24h: number;
  sizePrecision: string;
  minSize: string;
  takerFeeBps: number;
  tickSize: string;
  pricePrecision: string;
  maxSize: string;
  makerFeeBps: number;
  kuruAmmSpread: string;
  verified: boolean;
}

export interface KuruVault {
  id: string;
  symbol: string;
  baseToken: KuruToken;
  quoteToken: KuruToken;
  apr: number;
  isBoosted: boolean;
  tvl: number;
  volume24h: number;
  managementFee: number;
  vaultAddress: string;
  lockupDays: number;
  description: string;
  historicalSimulation: {
    investedAgo: string;
    initialDepositUsd: number;
    projectedReturnUsd: number;
  };
}

export interface KuruPosition {
  id: string;
  type: 'pool' | 'vault';
  marketId: string;
  marketSymbol: string;
  strategy?: 'spot' | 'curve' | 'bidask';
  feeTierPercent?: number;
  minPrice?: number;
  maxPrice?: number;
  currentPriceAtDeposit?: number;
  baseDeposited: number;
  quoteDeposited: number;
  baseTokenSymbol: string;
  quoteTokenSymbol: string;
  totalValueUsd: number;
  earnedFeesUsd: number;
  status: 'in-range' | 'out-of-range';
  createdAt: string;
}

export const TOKENS: Record<string, KuruToken> = {
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    iconBg: '#3b82f6',
    iconColor: '#ffffff',
    iconText: 'Ξ',
    address: '0xee8c1955c4d0b13481b7a2d825c0410656cf1242',
    decimals: 18,
    price: 2480.92,
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    iconBg: '#2563eb',
    iconColor: '#ffffff',
    iconText: '$',
    address: '0x7547ff56372bf94998816c278065bfd96d7fb603',
    decimals: 6,
    price: 1.0,
  },
  MON: {
    symbol: 'MON',
    name: 'Monad Token',
    iconBg: '#836ef9',
    iconColor: '#ffffff',
    iconText: '◆',
    address: '0xd0f878b301c238ba4c107e3240eef671d44ebadc',
    decimals: 18,
    price: 14.28,
  },
  AUSD: {
    symbol: 'AUSD',
    name: 'Agora USD',
    iconBg: '#ca8a04',
    iconColor: '#ffffff',
    iconText: '▲',
    address: '0x8891cf2390a82b982c81d8302f31aa92482333a1',
    decimals: 6,
    price: 1.0,
  },
  CBBTC: {
    symbol: 'cbBTC',
    name: 'Coinbase Wrapped BTC',
    iconBg: '#0284c7',
    iconColor: '#ffffff',
    iconText: '₿',
    address: '0xcb21a8d055a4073356885df19ce22df149b0991e',
    decimals: 8,
    price: 68420.0,
  },
  XAU0: {
    symbol: 'XAU0',
    name: 'Tether Gold Zero',
    iconBg: '#d97706',
    iconColor: '#ffffff',
    iconText: '₮',
    address: '0x712a84976cf8b394c8e1008064bf4df0120afa41',
    decimals: 6,
    price: 2640.5,
  },
  CIS: {
    symbol: 'CIS',
    name: 'RetroPick Native CIS',
    iconBg: '#5feddf',
    iconColor: '#0c0819',
    iconText: '●',
    address: '0x0000000000000000000000000000000000000101',
    decimals: 18,
    price: 1.41,
  },
};

export const KURU_VAULTS: KuruVault[] = [
  {
    id: 'mon-usdc',
    symbol: 'MON / USDC',
    baseToken: TOKENS.MON,
    quoteToken: TOKENS.USDC,
    apr: 536.4,
    isBoosted: true,
    tvl: 37900,
    volume24h: 491000,
    managementFee: 0,
    vaultAddress: '0xd0f878b301c238ba4c107e3240eef671d44ebadc',
    lockupDays: 4,
    description:
      'This vault generates yield by market making on the MON/USDC order book, capturing spreads from trades while actively rebalancing to maintain a 50/50 split. Liquidity providers are exposed to MON price movements, accumulating more MON when prices fall and more USDC when prices rise, with continuously compounding earned spreads.',
    historicalSimulation: {
      investedAgo: '6M',
      initialDepositUsd: 1000,
      projectedReturnUsd: 2682,
    },
  },
  {
    id: 'mon-ausd',
    symbol: 'MON / AUSD',
    baseToken: TOKENS.MON,
    quoteToken: TOKENS.AUSD,
    apr: 0.0,
    isBoosted: false,
    tvl: 16200,
    volume24h: 0,
    managementFee: 0,
    vaultAddress: '0x8891cf2390a82b982c81d8302f31aa92482333a1',
    lockupDays: 4,
    description:
      'Provides automated algorithmic liquidity between MON and AUSD on Kuru CLOB order books, earning maker rebates and trading fees with zero management fees.',
    historicalSimulation: {
      investedAgo: '3M',
      initialDepositUsd: 1000,
      projectedReturnUsd: 1000,
    },
  },
];

export const KURU_POOLS: KuruPoolMarket[] = [
  {
    id: '#00718',
    symbol: 'WETH / USDC',
    baseToken: TOKENS.WETH,
    quoteToken: TOKENS.USDC,
    marketAddress: '0xa6afb5113d7890981977e2056faeef0cd354d132',
    tvl: 9590,
    volume24h: 1060000,
    fees24h: 0,
    poolApr: 0,
    currentPrice: 2480.92,
    priceChange24h: 1.85,
    sizePrecision: '10^10',
    minSize: '0.002 WETH',
    takerFeeBps: 0,
    tickSize: '100 bps',
    pricePrecision: '10^4',
    maxSize: '100,000,000 WETH',
    makerFeeBps: 0,
    kuruAmmSpread: '30 bps',
    verified: true,
  },
  {
    id: '#00722',
    symbol: 'cbBTC / USDC',
    baseToken: TOKENS.CBBTC,
    quoteToken: TOKENS.USDC,
    marketAddress: '0x99b1a03f8a03c28ba491a92d472fe27b140cc1e8',
    tvl: 6540,
    volume24h: 536000,
    fees24h: 0,
    poolApr: 0,
    currentPrice: 68420.0,
    priceChange24h: 0.94,
    sizePrecision: '10^8',
    minSize: '0.0001 cbBTC',
    takerFeeBps: 0,
    tickSize: '100 bps',
    pricePrecision: '10^4',
    maxSize: '10,000,000 cbBTC',
    makerFeeBps: 0,
    kuruAmmSpread: '30 bps',
    verified: true,
  },
  {
    id: '#00558',
    symbol: 'MON / USDC',
    baseToken: TOKENS.MON,
    quoteToken: TOKENS.USDC,
    marketAddress: '0x12a884976cf8b394c8e1008064bf4df0120af11b',
    tvl: 50300,
    volume24h: 517000,
    fees24h: 0,
    poolApr: 0,
    currentPrice: 14.28,
    priceChange24h: 7.32,
    sizePrecision: '10^10',
    minSize: '0.1 MON',
    takerFeeBps: 0,
    tickSize: '100 bps',
    pricePrecision: '10^4',
    maxSize: '500,000,000 MON',
    makerFeeBps: 0,
    kuruAmmSpread: '30 bps',
    verified: true,
  },
  {
    id: '#00730',
    symbol: 'XAU0 / USDC',
    baseToken: TOKENS.XAU0,
    quoteToken: TOKENS.USDC,
    marketAddress: '0x6a084c79bb50392fa44a957802871adcf102830c',
    tvl: 2000,
    volume24h: 22300,
    fees24h: 0,
    poolApr: 0,
    currentPrice: 2640.5,
    priceChange24h: -0.15,
    sizePrecision: '10^8',
    minSize: '0.01 XAU0',
    takerFeeBps: 0,
    tickSize: '100 bps',
    pricePrecision: '10^4',
    maxSize: '1,000,000 XAU0',
    makerFeeBps: 0,
    kuruAmmSpread: '30 bps',
    verified: true,
  },
  {
    id: '#00101',
    symbol: 'CIS / MON',
    baseToken: TOKENS.CIS,
    quoteToken: TOKENS.MON,
    marketAddress: '0x0000000000000000000000000000000000000101',
    tvl: 124560,
    volume24h: 88210,
    fees24h: 120,
    poolApr: 14.2,
    currentPrice: 1.41,
    priceChange24h: 4.5,
    sizePrecision: '10^18',
    minSize: '1.0 CIS',
    takerFeeBps: 10,
    tickSize: '50 bps',
    pricePrecision: '10^4',
    maxSize: '10,000,000 CIS',
    makerFeeBps: 0,
    kuruAmmSpread: '20 bps',
    verified: true,
  },
];

export const INITIAL_USER_POSITIONS: KuruPosition[] = [
  {
    id: 'pos-1',
    type: 'pool',
    marketId: '#00718',
    marketSymbol: 'WETH / USDC',
    strategy: 'spot',
    feeTierPercent: 0.05,
    minPrice: 2455.55,
    maxPrice: 2515.2,
    currentPriceAtDeposit: 2480.92,
    baseDeposited: 0.04875864,
    quoteDeposited: 125.496024,
    baseTokenSymbol: 'WETH',
    quoteTokenSymbol: 'USDC',
    totalValueUsd: 256.22,
    earnedFeesUsd: 4.82,
    status: 'in-range',
    createdAt: '2 hours ago',
  },
  {
    id: 'pos-2',
    type: 'vault',
    marketId: 'mon-usdc',
    marketSymbol: 'MON / USDC',
    baseDeposited: 35.0,
    quoteDeposited: 500.0,
    baseTokenSymbol: 'MON',
    quoteTokenSymbol: 'USDC',
    totalValueUsd: 999.8,
    earnedFeesUsd: 38.65,
    status: 'in-range',
    createdAt: '1 day ago',
  },
];

export function formatUsd(val: number): string {
  if (val === 0) return '$0';
  if (val >= 1_000_000) {
    const formatted = (val / 1_000_000).toFixed(2).replace(/\.00$/, '');
    return `$${formatted}M`;
  }
  if (val >= 1_000) {
    const formatted = (val / 1_000).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    return `$${formatted}K`;
  }
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatNumber(val: number, maxDecimals: number = 4): string {
  if (isNaN(val)) return '0';
  return val.toLocaleString('en-US', {
    maximumFractionDigits: maxDecimals,
  });
}
