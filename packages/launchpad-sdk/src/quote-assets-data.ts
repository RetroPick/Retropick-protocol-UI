// Curated identities, not launch authorization. See quote-assets.ts and the release evidence.
export const quoteAssetData = [
  {
    "id": "crypto-mon",
    "symbol": "MON",
    "name": "Monad",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/mon.png",
      "source": "https://monad.xyz/android-chrome-512x512.png",
      "license": "Issuer-published brand artwork; identification only. Trademark rights remain with Monad.",
      "attribution": "Monad official website"
    },
    "issuer": null,
    "source": "https://www.monad.xyz/",
    "reference": {
      "network": "Monad Testnet",
      "address": "0x0000000000000000000000000000000000000000"
    },
    "monadTestnetAddress": "0x0000000000000000000000000000000000000000",
    "decimals": 18,
    "status": "LIVE_TESTNET",
    "venues": [
      0,
      1
    ],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://www.monad.xyz/",
      "scope": "Contract identity and registry snapshot at Monad Testnet block 70701068"
    },
    "unavailableReason": "Native Monad Testnet. Executability requires a fresh registry check."
  },
  {
    "id": "crypto-wmon",
    "symbol": "WMON",
    "name": "Wrapped Monad (deployment wrapper)",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/mon.png",
      "source": "https://monad.xyz/android-chrome-512x512.png",
      "license": "Issuer-published brand artwork; identification only. Trademark rights remain with Monad.",
      "attribution": "Monad official website"
    },
    "issuer": null,
    "source": "https://github.com/RetroPick/retropick-protocol/blob/e7188395db7ce84ab1fcae29df017b74f6582f9e/deployments/monad-testnet/v2.json",
    "reference": {
      "network": "Monad Testnet",
      "address": "0xff437B117Ec17a79a3b24Da4B5047dca4da9D0a2"
    },
    "monadTestnetAddress": "0xff437B117Ec17a79a3b24Da4B5047dca4da9D0a2",
    "decimals": 18,
    "status": "TESTNET_REPRESENTATION",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://github.com/RetroPick/retropick-protocol/blob/e7188395db7ce84ab1fcae29df017b74f6582f9e/deployments/monad-testnet/v2.json",
      "scope": "Contract identity and registry snapshot at Monad Testnet block 70701068"
    },
    "unavailableReason": "Existing native wrapper reports WETH onchain. Not admitted; operator qualification and approval required."
  },
  {
    "id": "crypto-btc",
    "symbol": "BTC",
    "name": "Bitcoin",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/btc.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/btc.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://bitcoin.org/",
    "reference": {
      "network": "Bitcoin source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://bitcoin.org/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-wbtc",
    "symbol": "WBTC",
    "name": "Wrapped Bitcoin",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/wbtc.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/wbtc.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://wbtc.network/",
    "reference": {
      "network": "Wrapped Bitcoin source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://wbtc.network/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-eth",
    "symbol": "ETH",
    "name": "Ethereum",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/eth.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/eth.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://ethereum.org/",
    "reference": {
      "network": "Ethereum source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://ethereum.org/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-weth",
    "symbol": "WETH",
    "name": "Wrapped Ether",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/weth.svg",
      "source": "https://raw.githubusercontent.com/0xa3k5/web3icons/763a55d66a03b21b603eb249f2df7c64a7522089/raw-svgs/tokens/background/ETH.svg",
      "license": "MIT; trademark rights remain with owners",
      "attribution": "web3icons contributors"
    },
    "issuer": null,
    "source": "https://ethereum.org/",
    "reference": {
      "network": "Wrapped Ether source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://ethereum.org/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-sol",
    "symbol": "SOL",
    "name": "Solana",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/sol.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/sol.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://solana.com/",
    "reference": {
      "network": "Solana source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://solana.com/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-zec",
    "symbol": "ZEC",
    "name": "Zcash",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/zec.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/zec.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://z.cash/",
    "reference": {
      "network": "Zcash source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://z.cash/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-hype",
    "symbol": "HYPE",
    "name": "Hyperliquid",
    "category": "CRYPTO",
    "logo": {
      "src": null,
      "source": null,
      "license": "Original text fallback; no third-party artwork",
      "attribution": "RetroPick"
    },
    "issuer": null,
    "source": "https://hyperliquid.xyz/",
    "reference": {
      "network": "Hyperliquid source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://hyperliquid.xyz/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-doge",
    "symbol": "DOGE",
    "name": "Dogecoin",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/doge.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/doge.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://dogecoin.com/",
    "reference": {
      "network": "Dogecoin source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://dogecoin.com/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-pepe",
    "symbol": "PEPE",
    "name": "Pepe",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/pepe.svg",
      "source": "https://raw.githubusercontent.com/0xa3k5/web3icons/763a55d66a03b21b603eb249f2df7c64a7522089/raw-svgs/tokens/background/PEPE.svg",
      "license": "MIT; trademark rights remain with owners",
      "attribution": "web3icons contributors"
    },
    "issuer": null,
    "source": "https://www.pepe.vip/",
    "reference": {
      "network": "Pepe source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://www.pepe.vip/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-shib",
    "symbol": "SHIB",
    "name": "Shiba Inu",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/shib.svg",
      "source": "https://raw.githubusercontent.com/0xa3k5/web3icons/763a55d66a03b21b603eb249f2df7c64a7522089/raw-svgs/tokens/background/SHIB.svg",
      "license": "MIT; trademark rights remain with owners",
      "attribution": "web3icons contributors"
    },
    "issuer": null,
    "source": "https://shib.io/",
    "reference": {
      "network": "Shiba Inu source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://shib.io/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-xrp",
    "symbol": "XRP",
    "name": "XRP",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/xrp.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/xrp.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://xrpl.org/",
    "reference": {
      "network": "XRP source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xrpl.org/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-avax",
    "symbol": "AVAX",
    "name": "Avalanche",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/avax.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/avax.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://avax.network/",
    "reference": {
      "network": "Avalanche source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://avax.network/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-bnb",
    "symbol": "BNB",
    "name": "BNB",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/bnb.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/bnb.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://bnbchain.org/",
    "reference": {
      "network": "BNB source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://bnbchain.org/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-link",
    "symbol": "LINK",
    "name": "Chainlink",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/link.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/link.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://chain.link/",
    "reference": {
      "network": "Chainlink source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://chain.link/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-arb",
    "symbol": "ARB",
    "name": "Arbitrum",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/arb.svg",
      "source": "https://raw.githubusercontent.com/0xa3k5/web3icons/763a55d66a03b21b603eb249f2df7c64a7522089/raw-svgs/tokens/background/ARB.svg",
      "license": "MIT; trademark rights remain with owners",
      "attribution": "web3icons contributors"
    },
    "issuer": null,
    "source": "https://arbitrum.io/",
    "reference": {
      "network": "Arbitrum source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://arbitrum.io/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-op",
    "symbol": "OP",
    "name": "Optimism",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/op.svg",
      "source": "https://raw.githubusercontent.com/0xa3k5/web3icons/763a55d66a03b21b603eb249f2df7c64a7522089/raw-svgs/tokens/background/OP.svg",
      "license": "MIT; trademark rights remain with owners",
      "attribution": "web3icons contributors"
    },
    "issuer": null,
    "source": "https://optimism.io/",
    "reference": {
      "network": "Optimism source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://optimism.io/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-sui",
    "symbol": "SUI",
    "name": "Sui",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/sui.svg",
      "source": "https://raw.githubusercontent.com/0xa3k5/web3icons/763a55d66a03b21b603eb249f2df7c64a7522089/raw-svgs/tokens/background/SUI.svg",
      "license": "MIT; trademark rights remain with owners",
      "attribution": "web3icons contributors"
    },
    "issuer": null,
    "source": "https://sui.io/",
    "reference": {
      "network": "Sui source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://sui.io/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-ton",
    "symbol": "TON",
    "name": "Toncoin",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/ton.svg",
      "source": "https://raw.githubusercontent.com/0xa3k5/web3icons/763a55d66a03b21b603eb249f2df7c64a7522089/raw-svgs/tokens/background/TON.svg",
      "license": "MIT; trademark rights remain with owners",
      "attribution": "web3icons contributors"
    },
    "issuer": null,
    "source": "https://ton.org/",
    "reference": {
      "network": "Toncoin source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://ton.org/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-near",
    "symbol": "NEAR",
    "name": "NEAR",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/near.svg",
      "source": "https://raw.githubusercontent.com/0xa3k5/web3icons/763a55d66a03b21b603eb249f2df7c64a7522089/raw-svgs/tokens/background/NEAR.svg",
      "license": "MIT; trademark rights remain with owners",
      "attribution": "web3icons contributors"
    },
    "issuer": null,
    "source": "https://near.org/",
    "reference": {
      "network": "NEAR source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://near.org/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-aave",
    "symbol": "AAVE",
    "name": "Aave",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/aave.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/aave.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://aave.com/",
    "reference": {
      "network": "Aave source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://aave.com/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-uni",
    "symbol": "UNI",
    "name": "Uniswap",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/uni.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/uni.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://uniswap.org/",
    "reference": {
      "network": "Uniswap source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://uniswap.org/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-pendle",
    "symbol": "PENDLE",
    "name": "Pendle",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/pendle.svg",
      "source": "https://raw.githubusercontent.com/0xa3k5/web3icons/763a55d66a03b21b603eb249f2df7c64a7522089/raw-svgs/tokens/background/PENDLE.svg",
      "license": "MIT; trademark rights remain with owners",
      "attribution": "web3icons contributors"
    },
    "issuer": null,
    "source": "https://pendle.finance/",
    "reference": {
      "network": "Pendle source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://pendle.finance/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-ena",
    "symbol": "ENA",
    "name": "Ethena",
    "category": "CRYPTO",
    "logo": {
      "src": null,
      "source": null,
      "license": "Original text fallback; no third-party artwork",
      "attribution": "RetroPick"
    },
    "issuer": null,
    "source": "https://ethena.fi/",
    "reference": {
      "network": "Ethena source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://ethena.fi/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-ada",
    "symbol": "ADA",
    "name": "Cardano",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/ada.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/ada.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://cardano.org/",
    "reference": {
      "network": "Cardano source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://cardano.org/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-dot",
    "symbol": "DOT",
    "name": "Polkadot",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/dot.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/dot.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://polkadot.com/",
    "reference": {
      "network": "Polkadot source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://polkadot.com/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-ltc",
    "symbol": "LTC",
    "name": "Litecoin",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/ltc.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/ltc.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://litecoin.org/",
    "reference": {
      "network": "Litecoin source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://litecoin.org/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-bch",
    "symbol": "BCH",
    "name": "Bitcoin Cash",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/bch.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/bch.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://bitcoincash.org/",
    "reference": {
      "network": "Bitcoin Cash source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://bitcoincash.org/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-atom",
    "symbol": "ATOM",
    "name": "Cosmos",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/atom.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/atom.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://cosmos.network/",
    "reference": {
      "network": "Cosmos source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://cosmos.network/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-trx",
    "symbol": "TRX",
    "name": "TRON",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/trx.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/trx.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://tron.network/",
    "reference": {
      "network": "TRON source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://tron.network/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-xlm",
    "symbol": "XLM",
    "name": "Stellar",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/xlm.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/xlm.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://stellar.org/",
    "reference": {
      "network": "Stellar source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://stellar.org/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-pol",
    "symbol": "POL",
    "name": "Polygon",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/pol.svg",
      "source": "https://raw.githubusercontent.com/0xa3k5/web3icons/763a55d66a03b21b603eb249f2df7c64a7522089/raw-svgs/tokens/background/MATIC.svg",
      "license": "MIT; trademark rights remain with owners",
      "attribution": "web3icons contributors"
    },
    "issuer": null,
    "source": "https://polygon.technology/",
    "reference": {
      "network": "Polygon source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://polygon.technology/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-jup",
    "symbol": "JUP",
    "name": "Jupiter",
    "category": "CRYPTO",
    "logo": {
      "src": "/quote-assets/jup.svg",
      "source": "https://raw.githubusercontent.com/0xa3k5/web3icons/763a55d66a03b21b603eb249f2df7c64a7522089/raw-svgs/tokens/background/JUP.svg",
      "license": "MIT; trademark rights remain with owners",
      "attribution": "web3icons contributors"
    },
    "issuer": null,
    "source": "https://jup.ag/",
    "reference": {
      "network": "Jupiter source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://jup.ag/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "crypto-bonk",
    "symbol": "BONK",
    "name": "Bonk",
    "category": "CRYPTO",
    "logo": {
      "src": null,
      "source": null,
      "license": "Original text fallback; no third-party artwork",
      "attribution": "RetroPick"
    },
    "issuer": null,
    "source": "https://bonkcoin.com/",
    "reference": {
      "network": "Bonk source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://bonkcoin.com/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-spyx",
    "symbol": "SPYx",
    "name": "SP500 xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/spyx.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/SPYx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/SPYx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/SPYx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-nvdax",
    "symbol": "NVDAx",
    "name": "NVIDIA xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/nvdax.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/NVDAx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/NVDAx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/NVDAx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-qqqx",
    "symbol": "QQQx",
    "name": "Nasdaq xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/qqqx.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/QQQx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/QQQx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/QQQx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-tslax",
    "symbol": "TSLAx",
    "name": "Tesla xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/tslax.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/TSLAx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/TSLAx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/TSLAx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-googlx",
    "symbol": "GOOGLx",
    "name": "Alphabet xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/googlx.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/GOOGLx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/GOOGLx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/GOOGLx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-aaplx",
    "symbol": "AAPLx",
    "name": "Apple xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/aaplx.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/AAPLx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/AAPLx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/AAPLx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-amznx",
    "symbol": "AMZNx",
    "name": "Amazon.com xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/amznx.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/AMZNx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/AMZNx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/AMZNx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-metax",
    "symbol": "METAx",
    "name": "Meta xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/metax.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/METAx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/METAx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/METAx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-msftx",
    "symbol": "MSFTx",
    "name": "Microsoft xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/msftx.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/MSFTx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/MSFTx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/MSFTx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-coinx",
    "symbol": "COINx",
    "name": "Coinbase xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/coinx.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/COINx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/COINx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/COINx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-mstrx",
    "symbol": "MSTRx",
    "name": "MicroStrategy xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/mstrx.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/MSTRx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/MSTRx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/MSTRx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-hoodx",
    "symbol": "HOODx",
    "name": "Robinhood xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/hoodx.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/HOODx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/HOODx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/HOODx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-pltrx",
    "symbol": "PLTRx",
    "name": "Palantir xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/pltrx.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/PLTRx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/PLTRx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/PLTRx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-crclx",
    "symbol": "CRCLx",
    "name": "Circle xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/crclx.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/CRCLx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/CRCLx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/CRCLx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-gldx",
    "symbol": "GLDx",
    "name": "Gold xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/gldx.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/GLDx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/GLDx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/GLDx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-nflxx",
    "symbol": "NFLXx",
    "name": "Netflix xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/nflxx.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/NFLXx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/NFLXx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/NFLXx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-amdx",
    "symbol": "AMDx",
    "name": "AMD xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/amdx.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/AMDx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/AMDx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/AMDx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-avgox",
    "symbol": "AVGOx",
    "name": "Broadcom xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/avgox.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/AVGOx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/AVGOx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/AVGOx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-orclx",
    "symbol": "ORCLx",
    "name": "Oracle xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/orclx.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/ORCLx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/ORCLx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/ORCLx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-jpmx",
    "symbol": "JPMx",
    "name": "JPMorgan Chase xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/jpmx.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/JPMx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/JPMx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/JPMx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-vx",
    "symbol": "Vx",
    "name": "Visa xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/vx.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/Vx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/Vx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/Vx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-max",
    "symbol": "MAx",
    "name": "Mastercard xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/max.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/MAx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/MAx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/MAx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-costx",
    "symbol": "COSTx",
    "name": "Costco xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/costx.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/COSTx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/COSTx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/COSTx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "stocks-xomx",
    "symbol": "XOMx",
    "name": "Exxon Mobil xStock",
    "category": "STOCKS",
    "logo": {
      "src": "/quote-assets/xomx.png",
      "source": "https://xstocks-metadata.backed.fi/logos/tokens/XOMx.png",
      "license": "Issuer-published brand artwork; trademarks remain with their owners. Identification only.",
      "attribution": "Backed / xStocks metadata"
    },
    "issuer": "Backed / xStocks",
    "source": "https://xstocks-metadata.backed.fi/tokens/Solana/XOMx/metadata.json",
    "reference": {
      "network": "Solana",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://xstocks-metadata.backed.fi/tokens/Solana/XOMx/metadata.json",
      "scope": "Issuer instrument metadata"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "private-anthropic",
    "symbol": "ANTHROPIC",
    "name": "Anthropic",
    "category": "PRIVATE",
    "logo": {
      "src": "/quote-assets/anthropic.svg",
      "source": "https://cdn.simpleicons.org/anthropic/ffffff",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "Simple Icons contributors"
    },
    "issuer": "Anthropic",
    "source": "https://www.anthropic.com/",
    "reference": {
      "network": "Offchain",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://www.anthropic.com/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Company identity reference only. No equity, investment exposure or issuer-backed token is available."
  },
  {
    "id": "private-openai",
    "symbol": "OPENAI",
    "name": "OpenAI",
    "category": "PRIVATE",
    "logo": {
      "src": null,
      "source": null,
      "license": "Original text fallback; no third-party artwork",
      "attribution": "RetroPick"
    },
    "issuer": "OpenAI",
    "source": "https://openai.com/",
    "reference": {
      "network": "Offchain",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://openai.com/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Company identity reference only. No equity, investment exposure or issuer-backed token is available."
  },
  {
    "id": "private-anduril",
    "symbol": "ANDURIL",
    "name": "Anduril",
    "category": "PRIVATE",
    "logo": {
      "src": null,
      "source": null,
      "license": "Original text fallback; no third-party artwork",
      "attribution": "RetroPick"
    },
    "issuer": "Anduril",
    "source": "https://www.anduril.com/",
    "reference": {
      "network": "Offchain",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://www.anduril.com/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Company identity reference only. No equity, investment exposure or issuer-backed token is available."
  },
  {
    "id": "private-polymarket",
    "symbol": "POLYMARKET",
    "name": "Polymarket",
    "category": "PRIVATE",
    "logo": {
      "src": null,
      "source": null,
      "license": "Original text fallback; no third-party artwork",
      "attribution": "RetroPick"
    },
    "issuer": "Polymarket",
    "source": "https://polymarket.com/",
    "reference": {
      "network": "Offchain",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://polymarket.com/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Company identity reference only. No equity, investment exposure or issuer-backed token is available."
  },
  {
    "id": "private-kalshi",
    "symbol": "KALSHI",
    "name": "Kalshi",
    "category": "PRIVATE",
    "logo": {
      "src": null,
      "source": null,
      "license": "Original text fallback; no third-party artwork",
      "attribution": "RetroPick"
    },
    "issuer": "Kalshi",
    "source": "https://kalshi.com/",
    "reference": {
      "network": "Offchain",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://kalshi.com/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Company identity reference only. No equity, investment exposure or issuer-backed token is available."
  },
  {
    "id": "private-neuralink",
    "symbol": "NEURALINK",
    "name": "Neuralink",
    "category": "PRIVATE",
    "logo": {
      "src": null,
      "source": null,
      "license": "Original text fallback; no third-party artwork",
      "attribution": "RetroPick"
    },
    "issuer": "Neuralink",
    "source": "https://neuralink.com/",
    "reference": {
      "network": "Offchain",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://neuralink.com/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Company identity reference only. No equity, investment exposure or issuer-backed token is available."
  },
  {
    "id": "private-figure",
    "symbol": "FIGURE",
    "name": "Figure AI",
    "category": "PRIVATE",
    "logo": {
      "src": null,
      "source": null,
      "license": "Original text fallback; no third-party artwork",
      "attribution": "RetroPick"
    },
    "issuer": "Figure AI",
    "source": "https://www.figure.ai/",
    "reference": {
      "network": "Offchain",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://www.figure.ai/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Company identity reference only. No equity, investment exposure or issuer-backed token is available."
  },
  {
    "id": "private-oura",
    "symbol": "OURA",
    "name": "Oura",
    "category": "PRIVATE",
    "logo": {
      "src": null,
      "source": null,
      "license": "Original text fallback; no third-party artwork",
      "attribution": "RetroPick"
    },
    "issuer": "Oura",
    "source": "https://ouraring.com/",
    "reference": {
      "network": "Offchain",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://ouraring.com/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Company identity reference only. No equity, investment exposure or issuer-backed token is available."
  },
  {
    "id": "currencies-usdc",
    "symbol": "USDC",
    "name": "USDC (Circle Testnet)",
    "category": "CURRENCIES",
    "logo": {
      "src": "/quote-assets/usdc.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/usdc.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://www.circle.com/multi-chain-usdc/monad",
    "reference": {
      "network": "Monad Testnet",
      "address": "0x534b2f3A21130d7a60830c2Df862319e593943A3"
    },
    "monadTestnetAddress": "0x534b2f3A21130d7a60830c2Df862319e593943A3",
    "decimals": 6,
    "status": "LIVE_TESTNET",
    "venues": [
      0,
      1
    ],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://www.circle.com/multi-chain-usdc/monad",
      "scope": "Contract identity and registry snapshot at Monad Testnet block 70701068"
    },
    "unavailableReason": "Circle-listed testnet USDC; no dollar redemption value. Fresh admission and wallet funding required."
  },
  {
    "id": "currencies-usdt",
    "symbol": "USDT",
    "name": "Tether USD",
    "category": "CURRENCIES",
    "logo": {
      "src": "/quote-assets/usdt.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/usdt.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://tether.to/",
    "reference": {
      "network": "Tether USD source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://tether.to/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "currencies-eurc",
    "symbol": "EURC",
    "name": "Euro Coin",
    "category": "CURRENCIES",
    "logo": {
      "src": "/quote-assets/eurc.svg",
      "source": "https://raw.githubusercontent.com/0xa3k5/web3icons/763a55d66a03b21b603eb249f2df7c64a7522089/raw-svgs/tokens/background/EURC.svg",
      "license": "MIT; trademark rights remain with owners",
      "attribution": "web3icons contributors"
    },
    "issuer": null,
    "source": "https://www.circle.com/eurc",
    "reference": {
      "network": "Euro Coin source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://www.circle.com/eurc",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "currencies-dai",
    "symbol": "DAI",
    "name": "Dai",
    "category": "CURRENCIES",
    "logo": {
      "src": "/quote-assets/dai.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/dai.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://sky.money/",
    "reference": {
      "network": "Dai source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://sky.money/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "currencies-pyusd",
    "symbol": "PYUSD",
    "name": "PayPal USD",
    "category": "CURRENCIES",
    "logo": {
      "src": "/quote-assets/pyusd.svg",
      "source": "https://raw.githubusercontent.com/0xa3k5/web3icons/763a55d66a03b21b603eb249f2df7c64a7522089/raw-svgs/tokens/background/PYUSD.svg",
      "license": "MIT; trademark rights remain with owners",
      "attribution": "web3icons contributors"
    },
    "issuer": null,
    "source": "https://www.paypal.com/us/digital-wallet/manage-money/crypto/pyusd",
    "reference": {
      "network": "PayPal USD source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://www.paypal.com/us/digital-wallet/manage-money/crypto/pyusd",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "currencies-usde",
    "symbol": "USDe",
    "name": "Ethena USDe",
    "category": "CURRENCIES",
    "logo": {
      "src": null,
      "source": null,
      "license": "Original text fallback; no third-party artwork",
      "attribution": "RetroPick"
    },
    "issuer": null,
    "source": "https://ethena.fi/",
    "reference": {
      "network": "Ethena USDe source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://ethena.fi/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "currencies-frax",
    "symbol": "FRAX",
    "name": "Frax",
    "category": "CURRENCIES",
    "logo": {
      "src": "/quote-assets/frax.svg",
      "source": "https://raw.githubusercontent.com/0xa3k5/web3icons/763a55d66a03b21b603eb249f2df7c64a7522089/raw-svgs/tokens/background/FRAX.svg",
      "license": "MIT; trademark rights remain with owners",
      "attribution": "web3icons contributors"
    },
    "issuer": null,
    "source": "https://frax.finance/",
    "reference": {
      "network": "Frax source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://frax.finance/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "currencies-usds",
    "symbol": "USDS",
    "name": "Sky Dollar",
    "category": "CURRENCIES",
    "logo": {
      "src": null,
      "source": null,
      "license": "Original text fallback; no third-party artwork",
      "attribution": "RetroPick"
    },
    "issuer": null,
    "source": "https://sky.money/",
    "reference": {
      "network": "Sky Dollar source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://sky.money/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "currencies-rlusd",
    "symbol": "RLUSD",
    "name": "Ripple USD",
    "category": "CURRENCIES",
    "logo": {
      "src": null,
      "source": null,
      "license": "Original text fallback; no third-party artwork",
      "attribution": "RetroPick"
    },
    "issuer": null,
    "source": "https://ripple.com/solutions/stablecoin/",
    "reference": {
      "network": "Ripple USD source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://ripple.com/solutions/stablecoin/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "currencies-gusd",
    "symbol": "GUSD",
    "name": "Gemini Dollar",
    "category": "CURRENCIES",
    "logo": {
      "src": "/quote-assets/gusd.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/gusd.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://www.gemini.com/dollar",
    "reference": {
      "network": "Gemini Dollar source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://www.gemini.com/dollar",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "commodities-paxg",
    "symbol": "PAXG",
    "name": "PAX Gold",
    "category": "COMMODITIES",
    "logo": {
      "src": "/quote-assets/paxg.svg",
      "source": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/paxg.svg",
      "license": "CC0-1.0; trademark rights excluded",
      "attribution": "cryptocurrency-icons contributors"
    },
    "issuer": null,
    "source": "https://www.paxos.com/paxgold",
    "reference": {
      "network": "PAX Gold source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://www.paxos.com/paxgold",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "commodities-xaut",
    "symbol": "XAUT",
    "name": "Tether Gold",
    "category": "COMMODITIES",
    "logo": {
      "src": "/quote-assets/xaut.svg",
      "source": "https://raw.githubusercontent.com/0xa3k5/web3icons/763a55d66a03b21b603eb249f2df7c64a7522089/raw-svgs/tokens/background/XAUT.svg",
      "license": "MIT; trademark rights remain with owners",
      "attribution": "web3icons contributors"
    },
    "issuer": null,
    "source": "https://gold.tether.to/",
    "reference": {
      "network": "Tether Gold source network",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://gold.tether.to/",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "commodities-xau",
    "symbol": "XAU",
    "name": "Gold reference",
    "category": "COMMODITIES",
    "logo": {
      "src": null,
      "source": null,
      "license": "Original text fallback; no third-party artwork",
      "attribution": "RetroPick"
    },
    "issuer": null,
    "source": "https://www.lbma.org.uk/prices-and-data/precious-metal-prices",
    "reference": {
      "network": "Offchain",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://www.lbma.org.uk/prices-and-data/precious-metal-prices",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "commodities-xag",
    "symbol": "XAG",
    "name": "Silver reference",
    "category": "COMMODITIES",
    "logo": {
      "src": null,
      "source": null,
      "license": "Original text fallback; no third-party artwork",
      "attribution": "RetroPick"
    },
    "issuer": null,
    "source": "https://www.lbma.org.uk/prices-and-data/precious-metal-prices",
    "reference": {
      "network": "Offchain",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://www.lbma.org.uk/prices-and-data/precious-metal-prices",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "commodities-wti",
    "symbol": "WTI",
    "name": "West Texas Intermediate reference",
    "category": "COMMODITIES",
    "logo": {
      "src": null,
      "source": null,
      "license": "Original text fallback; no third-party artwork",
      "attribution": "RetroPick"
    },
    "issuer": null,
    "source": "https://www.cmegroup.com/markets/energy/crude-oil/light-sweet-crude.html",
    "reference": {
      "network": "Offchain",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://www.cmegroup.com/markets/energy/crude-oil/light-sweet-crude.html",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  },
  {
    "id": "commodities-brent",
    "symbol": "BRENT",
    "name": "Brent crude reference",
    "category": "COMMODITIES",
    "logo": {
      "src": null,
      "source": null,
      "license": "Original text fallback; no third-party artwork",
      "attribution": "RetroPick"
    },
    "issuer": null,
    "source": "https://www.ice.com/products/219/Brent-Crude-Futures",
    "reference": {
      "network": "Offchain",
      "address": null
    },
    "monadTestnetAddress": null,
    "decimals": null,
    "status": "REFERENCE_ONLY",
    "venues": [],
    "oracle": null,
    "verification": {
      "checkedAt": "2026-10-13",
      "source": "https://www.ice.com/products/219/Brent-Crude-Futures",
      "scope": "Reference identity; token contract unqualified"
    },
    "unavailableReason": "Reference only: no qualified Monad Testnet contract or registry admission."
  }
] as const;
