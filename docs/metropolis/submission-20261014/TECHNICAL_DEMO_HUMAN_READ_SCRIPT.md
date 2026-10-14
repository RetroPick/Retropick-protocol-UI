# Technical demo — editable human read script

Silent picture: 175 seconds, 1920×1080, 30 fps. No generated narration. Record at natural speed, shorten wording if needed, and keep the final export under 180 seconds.

## Scene-locked script

Only actual retropick.xyz footage and labelled historical team test receipts. The separate founder pitch remains founder-owned.

### 00:00–00:12 · Discovery

Meet RetroPick: a launchpad connecting community tokens to Kuru trading on Monad. I’ll show the deployed interface, then verify historical test transactions.

### 00:12–00:33 · Review launch terms

Start by reviewing a launch. This screen shows token identity, MON as the quote asset, and the Kuru destination. The creator reviews those terms before signing. Here, we’re inspecting the actual form without submitting a new launch.

### 00:33–00:56 · Primary price discovery

Next, open an active token. Its bonding curve handles primary price discovery. The interface shows reserves, progress, and an unsigned trade quote. Actual buys and sells require the trader’s wallet signature and enforce minimum output onchain. This active token is a separate example from the graduated market shown next.

### 00:56–01:20 · Graduation

Here’s an existing graduated launch. The Coordinator secures the curve’s graduation assets before the external venue step. A dedicated executor creates and verifies the Kuru market and vault against protocol policy. The proof panel links this token to its destination. We’re inspecting a completed historical graduation, not triggering a new one.

### 01:20–01:47 · Kuru trading

Now inspect secondary trading. The actual interface exposes limit prices, good till cancelled orders, and post-only controls. The current orderbook is empty. Separately, historical team tests show an order, a fill from a second wallet, and cancellation. That distinction matters: successful execution is evidence of integration; it doesn’t establish current liquidity or organic demand.

### 01:47–02:12 · Monad execution evidence

Let’s check the receipts. These are fresh read-only queries to Monad Testnet, chain ten thousand one hundred forty-three. The historical receipts show successful status, blocks, and contract destinations. Decoded order, trade, and cancellation events identify the expected Kuru market. We’re reading existing transactions, with no new signature or transfer.

### 02:12–02:34 · Protected initial assets

The proof also connects the token, curve, Coordinator, market, vault, and custody records. Initial LP shares and excess launch tokens have dedicated permanent custody. A trader’s withdrawable Kuru funds are separate. Protected initial assets don’t guarantee orderbook depth; spreads and available inventory still depend on market participants.

### 02:34–02:49 · Indexer boundary

This endpoint identifies Envio HyperSync and its indexed cursor. It demonstrates source and freshness only. Historical metrics are separate from executable liquidity. The dedicated Envio demonstration provides the detailed dataflow and amount checks.

### 02:49–02:55 · Close

Explore RetroPick at retropick dot xyz. Monad Testnet; unaudited.
