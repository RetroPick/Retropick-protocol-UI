# PRICE & HISTORICAL DATA — diagnosis (MetaMask symptoms 2 and 3)

Symptoms under test: MetaMask shows "We could not fetch any historical data." and `$0.00`
for CIS on Monad Testnet, while the balance is correct.

## Findings

1. **MetaMask's token metadata/price service has no chain-10143 coverage.**
   - `GET https://token.api.cx.metamask.io/tokens/10143` → HTTP 400
     `{"message":["Unsupported chain: 10143"],"error":"Bad Request"}`
   - Contrast: `/tokens/1` returns the full mainnet list with `iconUrl`s.
   - `GET /token/10143?address=<CIS>` → same explicit rejection.
   - The endpoints were read out of the extension bundle itself
     (`token.api.cx.metamask.io/tokens/…` in MetaMask v12.23.1 background scripts), so these are
     the wallet's actual services.
   - Consequence: no price feed (→ `$0.00`) and no wallet-side price/activity history
     (→ "could not fetch any historical data") can exist for ANY custom token on this network,
     regardless of RetroPick.
2. **The on-chain and RetroPick-side history exists and is served.**
   - `eth_getLogs` over CIS `Transfer` (launch → head, 100-block pages): **3 events** (mint to
     the curve + curve trades). Indexable, standard ERC-20 history.
   - Public indexer serves real executed trades and candles for CIS:
     `/v1/launches/<CIS>/trades` → real CURVE buy rows; `/candles?resolution=1h&range=24h` →
     2 candles (honest sparse data for a young launch).
   - No legitimate USD price exists for a testnet launch token; fabricating one is out of scope
     by policy (and MetaMask would not consume it anyway).

## Classification

| Symptom | Cause class | Fixable by RetroPick? |
|---|---|---|
| Generic icon (see ROOT_CAUSE_MATRIX) | wallet metadata coverage + supplied-image path | partially — done here |
| `$0.00` fiat value | wallet price-provider coverage (chain unsupported) | No |
| "Could not fetch any historical data" | wallet history/activity service coverage | No |

## Controllable fallback (already in place — verified, unchanged)

RetroPick's token-detail page is the authoritative rich view: real artwork (original GIF),
on-chain identity (name/symbol/decimals/creator), bonding-curve price in MON with source label,
verified trade history + candles from indexed executed trades, wallet balance (connected),
explorer links, and honest empty/stale states. No external price API introduced; no interface
redesign. Verified rendering against production during the PR #36 post-deploy suite and covered
by the fixture/live e2e suites in this branch's gates.
