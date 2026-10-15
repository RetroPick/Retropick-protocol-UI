# Audit Arsitektur RetroPick V2: Contract, SDK, Backend, Frontend, Liquidity, dan Production Plan

## Diagnosis utama: “No resting orders” bukan berarti KuruAMMVault belum didanai

Kesimpulan paling penting dari audit ini adalah: **screenshot yang Anda kirim tidak membuktikan bahwa tidak ada deposit ke `KuruAMMVault`**. Untuk market RetroPick yang berhasil graduate ke Kuru, kontrak V2 justru mewajibkan graduation executor membuat market + vault, memasukkan initial liquidity ke vault, lalu mengunci LP shares secara permanen. `KuruGraduationExecutorV2.execute()` menghitung `baseSeed`, melakukan `vault.deposit(...)`, memverifikasi `totalAssets()`, memverifikasi balance MarginAccount, memverifikasi LP shares yang diterima, dan kemudian mengecek opening bid/ask. fileciteturn26file0L2-L2

Arsitekturnya pada graduation adalah:

```text
Bonding Curve
     │
     │ graduation
     ▼
GraduationCoordinatorV2
     │
     ▼
KuruGraduationExecutorV2
     │
     ├── deploy Kuru OrderBook
     │
     ├── deploy KuruAMMVault
     │
     ├── create KuruLiquidityLockV2
     │
     └── KuruAMMVault.deposit(
             baseSeed,
             quoteAmount,
             quoteAmount,
             receiver = permanentLiquidityLock
         )
                    │
                    ▼
             MarginAccount
                    │
                    ▼
       vault bid / ask becomes active
```

Executor bahkan gagal jika hasil deposit tidak sesuai dengan expected base/quote assets, MarginAccount tidak bertambah sesuai nilai deposit, LP shares salah, atau opening vault quote tidak sesuai policy. fileciteturn26file0L2-L2

LP shares awal itu bukan milik deployer dan bukan milik creator. LP shares dikirim ke `KuruLiquidityLockV2`, yang sengaja hanya mempunyai immutable bindings dan `protectedBalances()`; kontrak tersebut **tidak memiliki owner, approval, withdrawal, atau arbitrary-call entrypoint**. Artinya initial protocol liquidity memang dirancang permanen. fileciteturn51file0L2-L2

### Akar masalah screenshot Anda

Frontend saat ini mengambil depth menggunakan:

```ts
readKuruBook(...)
  -> market.getL2Book(20, 20)
  -> decodeBook(...)
```

Itulah tepatnya implementasi `packages/launchpad-sdk/src/kuru.ts`. fileciteturn30file0L2-L2

Masalahnya: upstream Kuru `getL2Book()` **hanya mengiterasi user CLOB price points**:

```solidity
price = TreeMath.findFirstRight(s_buyTree, ...)

while (...) {
    orderId = s_buyPricePoints[price].head;

    while (orderId != 0) {
        size += s_orders[orderId].size;
        ...
    }
}
```

Dengan kata lain, `getL2Book()` mengagregasi resting orders dari `s_buyPricePoints`, `s_sellPricePoints`, dan `s_orders`; ia tidak memasukkan liquidity milik AMM vault ke ladder tersebut. fileciteturn32file1

Tetapi **matching engine Kuru tetap mengetahui AMM vault**. `bestAsk()` dan `bestBid()` membandingkan regular order book dengan `vaultBestAsk`/`vaultBestBid`, termasuk vault size, lalu memilih harga terbaik. `bestBidAsk()` menggunakan kedua fungsi tersebut. fileciteturn32file1 fileciteturn32file0

Lebih penting lagi, market-order matching secara eksplisit mempunyai jalur:

```solidity
(bool _isVaultFill, uint256 _bestAsk) = bestAsk();

if (_isVaultFill) {
    ...
    sizeToCreditViaVault += _sizeFilled;
}
```

dan ketika fill berasal dari vault, OrderBook mendebit asset dari MarginAccount atas nama `kuruAmmVault`. Jadi **market order dapat dieksekusi terhadap KuruAMMVault walaupun `getL2Book()` mengembalikan zero ordinary resting orders**. fileciteturn32file0 fileciteturn32file4 fileciteturn32file5

Ini menjelaskan keadaan yang tampaknya kontradiktif:

```text
CLOB getL2Book()
──────────────────────
Bids: 0
Asks: 0

         ≠

Kuru executable liquidity
──────────────────────────
Vault bid: mungkin ada
Vault ask: mungkin ada
Vault base inventory: mungkin ada
Vault quote inventory: mungkin ada
Market buy simulation: mungkin berhasil
Market sell simulation: mungkin berhasil
```

Repo sendiri mencatat pada staging validation bahwa market Kuru yang diuji memang mempunyai **empty resting book karena campaign orders sudah consumed**, dan frontend sengaja menampilkan `"No resting orders"` daripada membuat fake depth. fileciteturn50file0L2-L2

Namun copy UI yang Anda screenshot saat ini adalah:

> “The book has no open depth right now. Market orders may fail until liquidity is posted.”

String itu ada langsung di `TokenTerminal`. fileciteturn36file0

Menurut saya ini adalah **P0 semantic bug**, bukan bug smart contract. Copy tersebut mencampur dua konsep berbeda:

| Konsep | Source | Yang direpresentasikan |
|---|---|---|
| Resting CLOB | `getL2Book()` | user limit orders |
| AMM vault quote | `getVaultParams()` / vault state | automatic Kuru AMM liquidity |
| Best executable market | `bestBidAsk()` | best of CLOB **dan vault** |
| Actual market-order quote | `simulateContract(placeAndExecuteMarket...)` | liquidity yang benar-benar executable |

Current SDK sendiri sudah membaca `bestBidAsk()` dalam `readKuru()`, tetapi `useKuruBook()` hanya memakai `readKuruBook()`/`getL2Book()`. Jadi informasi yang dibutuhkan sebagian sudah ada, tetapi tidak disatukan menjadi satu liquidity model. fileciteturn30file0L2-L2 fileciteturn25file0L2-L2

**Jawaban langsung terhadap pertanyaan Anda:** Anda **tidak perlu membuat UI public KuruAMMVault deposit hanya supaya graduated market bisa mempunyai liquidity awal**. Graduation V2 sudah melakukan seed itu. Tetapi Anda **memang sebaiknya membuat UI untuk professional market makers**, karena external resting CLOB liquidity sekarang bergantung pada market maker yang mendeposit trading capital ke `MarginAccount` dan memasang limit/post-only orders. Public passive-LP deposit ke `KuruAMMVault` adalah produk berbeda yang bisa ditambahkan kemudian setelah security review. fileciteturn37file1

Perbedaannya sangat penting:

```text
ACTIVE MARKET MAKER
wallet
  ↓
MarginAccount.deposit()
  ↓
OrderBook.addBuyOrder / addSellOrder
  ↓
resting CLOB liquidity

PASSIVE LP
wallet
  ↓
KuruAMMVault.deposit()
  ↓
vault LP shares
  ↓
automatic AMM bid/ask

PROTOCOL SEED LP
GraduationExecutor
  ↓
KuruAMMVault.deposit()
  ↓
LP shares
  ↓
KuruLiquidityLockV2
  ↓
permanently locked
```

## Arsitektur aktual dan hubungan contract, SDK, backend, serta frontend

Secara fundamental, arsitektur RetroPick V2 sudah jauh lebih baik daripada frontend screenshot-nya menunjukkan. Repository mencatat 27 ABI contracts dengan 517 functions, 147 events, dan 325 errors yang sudah mempunyai disposition mapping. Repo juga secara eksplisit memperingatkan bahwa **keberadaan selector di ABI tidak otomatis berarti selector tersebut boleh dijadikan user-facing action**. fileciteturn37file0

Arsitektur production yang sekarang dapat diringkas seperti ini:

```text
                         ┌───────────────────────────┐
                         │       apps/retro-ui       │
                         │ React / Vite / wallet UI  │
                         └─────────────┬─────────────┘
                                       │
                    ┌──────────────────┼───────────────────┐
                    │                  │                   │
                    ▼                  ▼                   ▼
          launchpad-sdk          event indexer       off-chain services
       prepare/read/math        read-only API        media/referral
                    │                  │
                    │                  │
                    └─────────┬────────┘
                              ▼
                       Monad Testnet
                              │
        ┌─────────────────────┼────────────────────────┐
        │                     │                        │
        ▼                     ▼                        ▼
      Factory            Bonding Curve         GraduationCoordinator
        │                                              │
        │                                              ▼
        │                                  Graduation Executor
        │                                      Kuru / V4
        │                                              │
        │                              ┌───────────────┴─────────────┐
        │                              ▼                             ▼
        │                        Kuru OrderBook                KuruAMMVault
        │                              │                             │
        │                              └──────────┬──────────────────┘
        │                                         ▼
        │                                  MarginAccount
        │
        ├──────────────► FeeEscrow
        └──────────────► BuybackVault
```

Economic transactions secara desain tidak ditandatangani backend: frontend menyiapkan write melalui SDK dan wallet menandatangani langsung ke chain. `apps/indexer` adalah GET-only event indexer, sedangkan media/referral adalah layanan off-chain terpisah. Ini merupakan boundary yang sehat: backend tidak menjadi custodian private key atau economic signing authority. fileciteturn52file0L2-L2

Lifecycle utama juga sudah cukup matang:

```text
CREATE
  │
  ▼
Factory.launchToken
  │
  ▼
Bonding Curve
  ├── buy
  ├── sell
  ├── fees
  └── graduation readiness
           │
           ▼
Factory.graduate
           │
           ▼
Coordinator secure
           │
           ▼
Factory.createGraduatedPool /
Coordinator.complete
           │
           ▼
Kuru executor
           │
           ├── market
           ├── vault
           ├── initial liquidity
           └── permanent LP lock
                     │
                     ▼
              Kuru trading
            ┌────────┴─────────┐
            ▼                  ▼
       user CLOB orders    AMM vault quotes
```

Kontrak capability map repository mengonfirmasi bahwa Kuru OrderBook + MarginAccount + KuruAMMVault memang merupakan tiga komponen berbeda: user margin funds membiayai user orders; vault quotes bersama order book; cancellation mengembalikan locked funds ke MarginAccount. fileciteturn37file1

Frontend live saat ini sudah memiliki lebih banyak capability daripada yang terlihat dari sidebar. `KuruTicket` sudah menangani:

- Margin balance.
- Automatic margin funding shortfall.
- Market order.
- Limit order.
- Post-only.
- Slippage.
- Kuru identity verification.
- Fresh simulated market quote.
- Deposit → order two-transaction state machine.
- Manual deposit/withdraw melalui advanced controls.

Semua itu menggunakan `assertKuruMarketIdentity`, `prepareMarginDeposit`, `prepareMarginWithdraw`, `prepareKuruLimitOrder`, dan `prepareKuruMarketOrder`. fileciteturn49file0L2-L2

SDK juga sudah memproteksi maker/taker flow cukup kuat. Limit order memvalidasi tick grid, min/max size, market identity, dan free MarginAccount balance. Market order memperoleh fresh execution quote melalui simulation, menghitung minimum output berdasarkan slippage, lalu mensimulasikan lagi transaksi funded dari connected account sebelum menghasilkan `PreparedWrite`. fileciteturn19file0L2-L2

Cancel pun sudah memverifikasi order ownership dan menggunakan `batchCancelOrdersNoRevert`; batch margin withdrawal juga sudah tersedia. fileciteturn19file0L2-L2

Masalahnya lebih banyak berada di **product exposure dan read model** daripada di write capability.

Frontend routing saat ini belum mempunyai `/liquidity`. Canonical live token terminal berada di `/launchpad/token/:id`; `/earn` adalah finance hub; `/portfolio` bahkan redirect ke `/earn` pada live mode. fileciteturn21file0L2-L2

Desktop sidebar hanya mempunyai `Home` dan `Earn`, plus Launch CTA, wallet, theme, dan Docs. fileciteturn22file0L2-L2 Mobile nav juga hanya Home, Earn, dan Launch. fileciteturn23file0L2-L2

Jadi kontrak dan SDK sudah cukup dekat dengan exchange product, tetapi information architecture frontend masih terasa seperti launchpad.

Backend juga mempunyai asymmetry penting. Indexer saat ini dynamically scans:

```ts
token
curve
market
```

tetapi **tidak memasukkan `vault` ke dynamic addresses yang discan**. fileciteturn44file0

Itu bermasalah karena capability inventory justru mengklasifikasikan `KuruVaultDeposit` dan `KuruVaultWithdraw` sebagai events yang seharusnya dikonsumsi indexer. fileciteturn40file1

Current projection mempunyai launches, trades, holders, orders, wallet assets, claims, buybacks, dan activity, tetapi tidak mempunyai LP-position atau liquidity-vault projection. fileciteturn42file0L2-L2

API query juga hanya mengekspos launch/trade/holder/candle/order/wallet asset/order/claim/buyback surfaces; belum ada pool, vault, LP position, atau liquidity-history endpoint. fileciteturn53file0L2-L2

Lebih spesifik lagi, indexer mengisi graduated launch dengan:

```text
liquidityRaw = null
liquiditySource = UNAVAILABLE
```

meskipun graduated Kuru launch mempunyai vault yang dapat dibaca on-chain. Itu membuat discovery, ranking, dan terminal tidak dapat memberi liquidity metric yang bermakna setelah graduation. fileciteturn44file0L2-L2

Inilah salah satu gap contract ↔ backend terbesar sekarang.

## Gap audit yang perlu diselesaikan

Berikut gap yang menurut saya paling penting berdasarkan source saat ini, bukan berdasarkan old roadmap saja.

| Priority | Gap | Contract/SDK reality | Current frontend/backend | Yang harus diperbaiki |
|---|---|---|---|---|
| **P0** | Empty CLOB dianggap hampir sama dengan no liquidity | Vault ikut `bestBidAsk` dan execution matching | Depth berasal hanya dari `getL2Book` | Pisahkan CLOB depth vs AMM vault liquidity |
| **P0** | Graduated liquidity tidak mempunyai canonical metric | Vault exposes `totalAssets`, bid/ask, share state | indexer `liquidityRaw=null` setelah graduation | Tambah `KURU_VAULT` liquidity source |
| **P0** | Vault events hilang dari backend | ABI mempunyai `KuruVaultDeposit/Withdraw` | dynamic indexer tidak scan vault | Tambah vault ke dynamic address scan |
| **P0** | UI copy misleading | Market order dapat fill dari vault | “Market orders may fail until liquidity is posted” ketika L2 kosong | Quote execution state secara terpisah |
| **P0** | No liquidity diagnostics | `getVaultParams`, `bestBidAsk`, totalAssets tersedia | user hanya melihat ladder CLOB | Tambah liquidity health panel |
| **P1** | Tidak ada dedicated Liquidity IA | Contract mempunyai protocol LP + maker capability | sidebar Home/Earn saja | Tambah `/liquidity` + sidebar |
| **P1** | Maker capability tersembunyi | Margin + limit/post-only/cancel sudah supported | terfragmentasi di token ticket/orders tab | Dedicated MM workspace |
| **P1** | Tidak ada cross-market margin dashboard | MarginAccount bersifat shared Kuru balance hub | hanya per-ticket / Earn summary | Trading Capital panel |
| **P1** | Tidak ada market health | market state, tick, fee, spread, vault bid/ask dapat dibaca | tidak diringkas | Market readiness card |
| **P1** | No liquidity event history | Vault emits deposits/withdrawals | indexer tidak menyimpan | Index event + history endpoint |
| **P2** | Passive external LP belum productized | upstream vault mempunyai deposit/mint/withdraw | security allowlist sengaja mengecualikannya | security campaign + new SDK preparers |
| **P2** | LP share portfolio tidak ada | vault adalah ERC20 share token | tidak ada read model | LP position + underlying preview |
| **P2** | Tidak ada LP PnL accounting | total assets/shares dapat dihitung | tidak ada historical snapshots | indexer snapshot/history |
| **P2** | Pro-MM primitives tidak exposed | flip/paired/batch functions tersedia upstream | sengaja excluded | separate audited Pro MM release |
| **P2** | No inventory/risk UX | open orders + margin + wallet balances tersedia | tersebar | maker inventory + exposure |
| **P2** | No cross-market maker management | MarginAccount dapat mendukung beberapa markets | UI market-centric | `/liquidity/market-making` |
| **P3** | Canonical app tooling masih ambigu | `apps/retro-ui` adalah canonical product | root scripts masih `@retropick/web` | root scripts harus target retro-ui |
| **P3** | Naming collision “Vault” | Kuru liquidity vault adalah financial contract | Earn sudah mempunyai “Private Strategy Vault” | gunakan “LP Pools” / “Private Vault” distinct naming |

P0 pertama sangat konkret. Current terminal membuat `useKuruBook()` dari `getL2Book`, sedangkan market-order quote di `KuruTicket` melakukan simulation terhadap `placeAndExecuteMarketBuy/Sell`. Jadi dua panel sebenarnya menggunakan dua definisi liquidity yang berbeda tanpa menjelaskan perbedaannya kepada user. fileciteturn25file0L2-L2 fileciteturn49file0L2-L2

Ada pula inconsistency kecil tetapi nyata di current token view model. Untuk graduated market, `liquidityNote` masih mengatakan:

```text
Kuru book depth is not aggregated
```

padahal current UI sudah memiliki `useKuruBook()` dan `buildDepthLadder()`. Yang sebenarnya belum ada bukan “book aggregation”, melainkan **unified CLOB + vault liquidity aggregation**. fileciteturn24file0L2-L2 fileciteturn25file0L2-L2

Backend gap-nya bahkan lebih jelas. Capability disposition mengatakan vault deposit/withdraw events adalah indexer-relevant, tetapi actual dynamic scanner tidak memasukkan vault address. fileciteturn40file1 fileciteturn44file0

Ada juga minor code/document drift lain: `EarnPage` masih memiliki comment yang mengatakan indexer tidak mempunyai creator filter, sedangkan current query layer sudah mendukung `?creator=` dan `useCreatedLaunches()` benar-benar menggunakannya. Ini bukan production blocker, tetapi menunjukkan documentation/comment drift yang harus masuk cleanup pass. fileciteturn45file0L2-L2 fileciteturn53file0L2-L2 fileciteturn59file0L2-L2

Root package juga masih mempunyai convenience scripts seperti:

```json
"dev:web": "pnpm --filter @retropick/web dev",
"build:web": "pnpm --filter @retropick/web build"
```

padahal canonical application sekarang adalah `apps/retro-ui`. Ini sebaiknya dirapikan supaya release engineer tidak secara tidak sengaja membangun legacy app. fileciteturn58file0L2-L2

### Temuan security paling penting

**Jangan langsung menambahkan tombol “Deposit LP” hanya karena ABI `KuruAMMVault.deposit()` tersedia.**

Current V2 application capability map dengan sengaja menyatakan KuruAMMVault sebagai read-only supporting surface untuk v1: `totalAssets`, market params, token balances, dan sejenisnya dapat dibaca; `deposit/mint` tetap executor-driven dan protected LP tidak exposed untuk withdrawal. fileciteturn37file2

Security-approved write surface yang telah live-tested mencakup Factory launch/graduation, curve buy/sell, coordinator completion, MarginAccount deposit/withdraw, OrderBook limit/market/cancel, FeeEscrow claims dan Buyback release. Direct KuruAMMVault public LP writes tidak termasuk approved surface itu. fileciteturn38file0L2-L2

Karena itu capability baru seperti:

```text
KuruAMMVault.deposit
KuruAMMVault.mint
KuruAMMVault.withdraw
KuruAMMVault.permit
```

harus dianggap sebagai **new security boundary**, bukan sekadar frontend work.

Hal yang sama berlaku untuk advanced Kuru market-making functions. Contract map mencatat:

```text
addFlipBuyOrder
addFlipSellOrder
addPairedLiquidity
batchAddPairedLiquidity
batchProvisionLiquidity
batchUpdate
batchCancelFlipOrders
collectFees
```

tetapi mereka sengaja tidak surfaced pada current v1 application. fileciteturn37file0

Artinya roadmap harus memisahkan **“capability exists in ABI”** dari **“capability approved for RetroPick users.”**

## Peta capability V2 dan UI yang seharusnya tersedia

Raw ABI inventory mempunyai 517 functions, tetapi menampilkan 517 fungsi di UI adalah arsitektur yang salah. Sebagian adalah admin, internal protocol, proxy upgrade, external infrastructure, atau dangerous generic surfaces. Repository sendiri mempunyai disposition model `USER_WRITE`, `LIFECYCLE_WRITE`, `READ`, `ADMIN_ONLY`, `PROTOCOL_INTERNAL`, dan `NOT_SURFACED_WRITE`. fileciteturn37file0

Untuk product UI, inilah capability map yang menurut saya harus menjadi source of truth.

| Product capability | Contract / system | Status sekarang | UI destination |
|---|---|---:|---|
| Discover launches | Factory + indexer | Ada | Home |
| Token metadata/socials | LauncherToken | Ada | Token detail |
| Quote asset/venue availability | Quote Registry | Ada | Launch |
| Launch economics preview | Factory/Coordinator | Ada | Launch review |
| Create token | Factory | Ada | Launch |
| Curve quote | Curve | Ada | Trade |
| Curve buy | Curve | Ada | Trade |
| Curve sell | Curve | Ada | Trade |
| Graduation readiness | Curve/Coordinator | Ada | Trade/Protocol |
| Trigger graduation | Factory | Ada | Trade |
| Retry graduation completion | Coordinator | Ada | Trade |
| Graduation receipt | Coordinator | Ada | Protocol/Liquidity |
| Kuru identity/environment validation | Router/KuruEnvironment | Ada SDK | hidden safety layer |
| Market parameters | OrderBook | Ada | Trade/Liquidity |
| Market state | OrderBook | Bisa dibaca | Liquidity health |
| Resting CLOB depth | OrderBook `getL2Book` | Ada | Trade |
| Best executable bid/ask | OrderBook `bestBidAsk` | SDK sebagian | Trade + Liquidity |
| Vault bid/ask state | `getVaultParams` | Dibaca saat qualification | Liquidity |
| Vault total assets | KuruAMMVault | Contract ada, UI tidak | Liquidity |
| Protected launch LP | KuruLiquidityLock | Contract ada | Liquidity/Protocol |
| Maker margin deposit | MarginAccount | Ada | Trade + Market Making |
| Maker margin withdraw | MarginAccount | Ada | Portfolio + Market Making |
| Batch withdraw margin | MarginAccount | SDK ada | Portfolio |
| Market buy/sell | OrderBook | Ada | Trade |
| Limit buy/sell | OrderBook | Ada | Trade/MM |
| Post-only maker order | OrderBook | Ada | Trade/MM |
| Open order tracking | OrderBook + indexer | Ada | Orders/MM |
| Cancel orders | OrderBook | Ada | Orders/MM |
| Passive LP deposit | KuruAMMVault | **Not approved** | Future Liquidity |
| Passive LP withdrawal | KuruAMMVault | **Not approved** | Future My Positions |
| LP share balance | KuruAMMVault ERC20 | Readable | Future My Positions |
| LP underlying preview | KuruAMMVault | Readable | Future My Positions |
| Flip orders | OrderBook | **Not surfaced** | Future Pro MM |
| Paired two-sided liquidity | OrderBook | **Not surfaced** | Future Pro MM |
| Batch liquidity provisioning | OrderBook | **Not surfaced** | Future Pro MM |
| Maker inventory | Margin + orders | Data exists | Market Making |
| Creator native fee claim | FeeEscrow | Ada | Earn |
| Creator ERC20/token claim | FeeEscrow | Ada | Earn |
| Buyback vesting status | BuybackVault | Ada | Earn |
| Buyback release | BuybackVault | Ada | Earn |
| Transfer future creator fee rights | Factory | Ada SDK/UI | Earn/Protection |
| Wallet holdings | ERC20 + indexer | Ada | Portfolio |
| Referral attribution | off-chain service | Ada | Earn |
| Media upload | media service | Ada | Launch |
| Admin config | Factory/etc. | Intentionally hidden | Operator tooling only |
| Executor direct execution | Graduation executors | Protocol-only | Never user UI |
| V4 PoolManager/Permit2 internals | External infra | Protocol-only | Never generic UI |
| Upgrade/ownership functions | protocol/Kuru proxies | Admin | Never public UI |

Current creator-side implementation is actually fairly advanced. `Earn` already combines Claims, Portfolio, Created launches, Referrals, Fund & Send, private Strategy Vault, dan Protection. fileciteturn45file0L2-L2

Creator fee handoff juga sudah ada dalam SDK: `prepareTransferCreatorFeeRecipient()` memastikan connected wallet adalah current recipient, memastikan destination non-zero, dan hanya memindahkan **future creator fee rights**; existing escrow credit tidak dipindahkan. Frontend Protected Earn sudah menggunakan preparer tersebut. fileciteturn18file0L2-L2 fileciteturn55file4

Jadi area yang paling tertinggal bukan creator system. **Area yang paling tertinggal adalah liquidity/productization dari graduated Kuru market.**

### Capability yang jangan di-surface ke public UI

Untuk “serve full capability” saya tidak mengartikan “buat tombol untuk setiap ABI”. Hal berikut harus tetap operator/internal-only:

| Surface | Kenapa tidak public |
|---|---|
| Factory/admin config | protocol governance authority |
| Coordinator registration/configuration | protocol lifecycle authority |
| Executor `execute()` | coordinator-only |
| Executor verification internals | protocol integrity |
| Router deployment/upgrade | infrastructure |
| OrderBook ownership/pause/upgrade | admin |
| Margin credit/debit internals | market authority |
| Kuru vault ownership/upgrade | router/admin |
| V4 PoolManager generic actions | powerful external infra |
| PositionManager generic actions | external periphery |
| Permit2 arbitrary usage | unnecessary approval surface |
| Donation/rescue paths | protocol recovery |
| Liquidity lock withdrawal | intentionally impossible |

Ini sesuai contract graph: Uniswap V4 stack adalah infrastructure dan application tidak seharusnya memanggil generic PoolManager/PositionManager/Permit2 surfaces secara langsung. fileciteturn37file1

## Arsitektur UI yang saya rekomendasikan

Saya tetap sangat kuat merekomendasikan **dedicated Liquidity section di sidebar**, bukan menaruh seluruh LP/MM feature di trading ticket.

Namun saya akan sedikit mengubah rekomendasi awal: **jangan membuat top-level `Trade` route baru dulu.** Current canonical deep link `/launchpad/token/:token` sudah menjadi trading terminal. Memindahkannya sekarang akan menambah routing churn tanpa memberi capability baru. fileciteturn21file0L2-L2

Navigasi desktop yang saya rekomendasikan:

```text
RETROPICK

Home
Discover launches & markets

Liquidity
Pools, protocol liquidity & market making

Earn
Portfolio, creator fees, claims

Launch
Create token / market
```

Trading tetap contextual:

```text
Home
  ↓
select token
  ↓
/launchpad/token/:token
  ↓
full trading terminal
```

Sedangkan capital management berada di:

```text
/liquidity
```

### Bentuk `/liquidity`

Saya akan menggunakan empat internal views, tetapi tiga tab visual utama cukup:

```text
Liquidity
├── Pools
├── My Positions
└── Market Making
```

`Pools` harus menjadi **read-only first** pada release awal.

Contoh:

```text
LIQUIDITY

Search pools...

CIS / MON
Graduated · Kuru

Protocol AMM
Base assets       124.56 CIS
Quote assets       88.21 MON
Vault spread       1.00%
Best vault bid     0.697 MON
Best vault ask     0.704 MON
LP shares locked   100%

CLOB
Resting bids       0
Resting asks       0

Execution
Best bid           0.697 MON
Best ask           0.704 MON
Buy quote          Available
Sell quote         Available

[Trade] [Market Make] [Pool details]
```

Ini akan menghilangkan kebingungan screenshot Anda.

Kalau ordinary book kosong, status seharusnya:

```text
Resting CLOB
No user maker orders

Protocol AMM
Active
88.21 MON + 124.56 CIS available in vault

Best executable
0.697 / 0.704 MON

Market orders
Executable — quote before signing
```

Bukan:

```text
No resting orders
Market orders may fail until liquidity is posted
```

Apabila CLOB dan vault benar-benar sama-sama tidak dapat mengeksekusi order:

```text
No executable liquidity

There are currently no resting CLOB orders and
the protocol AMM cannot quote this size.

Try a limit order or return later.
```

Itulah truthful UX.

### Trading terminal

Trading interface tetap membutuhkan compact liquidity panel:

```text
ORDERBOOK

CLOB DEPTH
Bids                         0
Asks                         0
Status             No resting CLOB

AMM VAULT
Status                   Active
Vault bid              0.697 MON
Vault ask              0.704 MON
Spread                     1.0%

EXECUTION
Best buy quote          Available
Best sell quote         Available

[View Liquidity]
```

Dengan demikian user trader tidak perlu memahami internal contract architecture.

### Market Making

Ini seharusnya **bukan passive LP page**.

Market maker workspace menggunakan current-approved surface:

```text
/liquidity/market-making

Market
CIS / MON

TRADING CAPITAL
Wallet MON       100
Margin MON        25
Wallet CIS       500
Margin CIS       100

[Deposit] [Withdraw]

QUOTES
Bid
Price          0.694
Size            25 CIS
Post only       ✓

Ask
Price          0.707
Size            25 CIS
Post only       ✓

Estimated spread       1.85%
Inventory after fill   ...

[Place bid]
[Place ask]

OPEN ORDERS
...
[Cancel selected]
[Cancel all]
```

Margin funding flow ini bukan speculative architecture; MarginAccount deposit/withdraw dan limit/post-only orders sudah implemented dan tested through current SDK/frontend. fileciteturn49file0L2-L2 fileciteturn38file0L2-L2

Untuk first release, jangan sebut dua order tersebut “atomic paired liquidity.” Apabila Anda menempatkan bid kemudian ask dengan existing allowlisted functions, itu adalah **dua transaksi terpisah**. Atomic paired liquidity baru boleh diberi label demikian setelah `addPairedLiquidity` atau batch primitive melewati security review.

### Passive LP

`My Positions` awalnya dapat menampilkan read-only:

```text
MY LIQUIDITY

Protocol liquidity
CIS / MON
Permanent protocol seed
You cannot withdraw this position
Owner: RetroPick liquidity lock

Your LP positions
Public LP deposits are not enabled yet.
```

Setelah direct vault LP write diaudit:

```text
My LP Position

Shares             3.821 LP
Share of vault       2.4%

Underlying
CIS                12.45
MON                 8.81

Estimated value
...

[Add liquidity]
[Withdraw]
```

Public LP flow harus menjelaskan bahwa passive LP berbeda dari maker margin.

```text
Provide AMM liquidity
────────────────────────────────

You provide:
12.00 CIS
8.60 MON

Expected vault shares:
3.72 LP

Minimum quote consumed:
8.50 MON

This capital participates in Kuru's automated
market-making vault.

[Approve CIS]
[Approve MON if ERC20]
[Deposit]
```

Pinned upstream `KuruAMMVault` memang memiliki `previewDeposit`, `previewMint`, `previewWithdraw`, `totalAssets`, `deposit`, `mint`, dan `withdraw`. Deposit menambahkan assets ke MarginAccount atas nama vault dan mengubah vault order sizes; withdrawal membakar shares, memperbarui vault order sizes, lalu mengeluarkan underlying assets. fileciteturn29file0L2-L2

Tetapi implementasinya harus ditunda sampai security boundary resmi diperluas.

### Sidebar dan mobile

Desktop:

```text
Home
Liquidity   ← NEW
Earn
Launch
```

Current source hanya memiliki Home/Earn. fileciteturn22file0L2-L2

Untuk mobile, jangan menambah lima atau enam fixed bottom buttons. Current bottom nav hanya Home/Earn/Launch. fileciteturn23file0L2-L2

Saya akan menggunakan:

```text
Home      Liquidity      Earn      Launch
```

atau mempertahankan tiga buttons lalu Liquidity di “More”, tergantung viewport minimum yang ingin Anda dukung.

Satu UX warning lain: `Earn` sudah mempunyai feature bernama **Private Strategy Vault**, yang sebenarnya local passkey-encrypted private data storage dan **bukan financial Kuru vault**. Source bahkan menjelaskan bahwa Strategy Vault tidak memberikan spending authority dan independen dari trading wallet. fileciteturn46file0L2-L2

Jadi jangan beri menu baru nama generik “Vault”.

Gunakan:

```text
Liquidity
  Pools
  My LP Positions
  Market Making

Earn
  Private Strategy Vault
```

supaya user tidak menyamakan keduanya.

## Production implementation plan

Saya akan membangun ini bertahap. Jangan mulai dengan passive LP writes. Mulai dengan membuat liquidity model benar.

### Pekerjaan pertama: perbaiki definisi liquidity

Buat SDK type baru kira-kira seperti:

```ts
export type KuruLiquidityState = {
  blockNumber: bigint;

  market: {
    state: 'ACTIVE' | 'SOFT_PAUSED' | 'HARD_PAUSED';
    bestBid: bigint | null;
    bestAsk: bigint | null;
  };

  clob: {
    bids: L2Level[];
    asks: L2Level[];
    bestBid: bigint | null;
    bestAsk: bigint | null;
    restingBidLevels: number;
    restingAskLevels: number;
  };

  vault: {
    address: Address;
    baseAssets: bigint;
    quoteAssets: bigint;
    totalShares: bigint;
    bestBid: bigint | null;
    bestAsk: bigint | null;
    bidSize: bigint;
    askSize: bigint;
    spreadBps: bigint;
    protectedShares: bigint | null;
  };

  execution: {
    buyExecutable: boolean;
    sellExecutable: boolean;
  };
};
```

Jangan mengubah `readKuruBook()` menjadi synthetic book yang diam-diam memasukkan vault. Itu akan mengaburkan provenance.

Pertahankan:

```text
readKuruBook()       = actual CLOB L2
readKuruVault()      = actual vault
readKuruLiquidity()  = composed view
```

Dengan demikian UI dapat jujur mengatakan dari mana liquidity berasal.

`readKuru()` saat ini sudah melakukan market identity qualification, membaca `getVaultParams`, router implementation addresses, `verifiedMarket`, dan `bestBidAsk`; jadi bangun extension di atas trust boundary ini, jangan duplicate unqualified RPC reads. fileciteturn30file0L2-L2

### Perluas backend liquidity model

Current dynamic scanner:

```text
token
curve
market
```

harus menjadi:

```text
token
curve
market
vault
```

untuk graduated Kuru launches. fileciteturn44file0

Tambahkan projection domain:

```ts
IndexedLiquidityPool
IndexedVaultEvent
IndexedLpPosition
```

Minimum:

```ts
type IndexedLiquidityPool = {
  token: Address;
  market: Address;
  vault: Address;
  quoteAsset: Address;

  protocolLpLock: Address;
  protectedLpShares: string;

  lastDepositBlock: number | null;
  lastWithdrawBlock: number | null;

  depositCount: number;
  withdrawCount: number;
};
```

Event projection:

```text
KuruVaultDeposit
KuruVaultWithdraw
Transfer(vault LP shares)
```

Capability map sendiri sudah mengkategorikan vault deposit/withdraw events sebagai indexer data, sehingga perubahan ini menyelaraskan backend dengan existing contract disposition. fileciteturn40file1

API yang saya rekomendasikan:

```text
GET /v1/liquidity/pools
GET /v1/liquidity/pools/:token
GET /v1/liquidity/pools/:token/events

GET /v1/wallets/:address/lp-positions

GET /v1/wallets/:address/orders
GET /v1/wallets/:address/assets
```

Current API sudah mempunyai wallet assets/orders dan launch orders, jadi liquidity endpoints harus mengikuti freshness envelope/cursor/reorg model yang sama, bukan menciptakan service kedua. fileciteturn53file0L2-L2

Current indexer memiliki reorg-aware checkpointing dan deterministic projection model; pertahankan pola tersebut untuk vault events. fileciteturn52file0L2-L2

### Buat `/liquidity` read-only dahulu

Route:

```text
/liquidity
/liquidity/pools/:token
/liquidity/market-making
```

Jangan expose `/liquidity/positions` sebagai actionable LP deposit pada fase pertama.

Phase pertama cukup:

```text
Pools
Protocol liquidity
CLOB health
AMM vault health
market state
best executable bid/ask
freshness
market-making CTA
```

Tambahkan:

```tsx
const Liquidity = lazy(
  () => import('@/features/liquidity/liquidity')
);
```

ke route switch, lalu update `Sidebar` dan `MobileNav`.

### Pindahkan maker management ke Liquidity tanpa menghapus trading ticket

`KuruTicket` tetap berada di trading terminal untuk user biasa.

Extract reusable components:

```text
KuruMarginBalances
KuruMarginDeposit
KuruMarginWithdraw

KuruLimitOrderForm
KuruMarketOrderForm

KuruOpenOrders
KuruCancelOrders

KuruMarketHealth
```

Kemudian compose:

```text
Trade page
  KuruMarketOrderForm
  KuruLimitOrderForm
  compact margin
  compact liquidity health

Market Making page
  full margin dashboard
  maker-only limit form
  post-only default
  open orders
  inventory
  exposure
  market health
```

Jangan membuat dua implementations dari transaction logic. Both screens harus menggunakan SDK + `executePreparedWrite`.

### Tambahkan two-sided maker UX menggunakan approved primitives

Sebelum advanced Kuru functions disetujui, Anda sudah bisa membuat useful maker workflow:

```text
Desired reference price  0.700

Bid offset               -75 bps
Ask offset               +75 bps

Bid                      0.69475
Ask                      0.70525

Bid inventory            25 CIS equivalent
Ask inventory            25 CIS

[Preview]
```

Kemudian frontend menyiapkan:

```text
prepareKuruLimitOrder(... buy, postOnly=true)
prepareKuruLimitOrder(... sell, postOnly=true)
```

dan meminta dua wallet confirmations.

Harus sangat jelas:

```text
Two separate orders
Not atomic
If the second transaction fails,
the first order remains active.
```

Untuk atomic paired quoting, tunggu audit `addPairedLiquidity`/batch primitives. Contract map mengategorikan functions tersebut sebagai MM primitives yang sengaja belum surfaced. fileciteturn37file0

### Security campaign terpisah untuk passive LP

Sebelum `KuruAMMVault.deposit()` masuk UI, lakukan capability review baru.

Required checks minimal:

```text
vault address == Coordinator receipt.vault
market == Coordinator receipt.market
token1 == launch token
token2 == quote asset
vault.market == verified market
vault.marginAccount == pinned MarginAccount
vault.owner == pinned Router
router.verifiedMarket(market) == market params
KuruEnvironment.validate() passes
marketState acceptable
```

Lalu deposit preparation harus memverifikasi:

```text
baseDeposit > 0
quoteDeposit > 0

previewDeposit succeeds
expected shares > 0

minQuoteConsumed set from explicit user slippage
not zero by default

native msg.value exact/bounded correctly
ERC20 allowance only to qualified vault

receiver == connected wallet
unless explicit reviewed recipient support exists

fresh simulation using connected account
```

Current upstream deposit menerima:

```solidity
deposit(
    uint256 baseDeposit,
    uint256 quoteDeposit,
    uint256 minQuoteConsumed,
    address receiver
)
```

dan mungkin menggunakan quote amount lebih kecil dari maximum supplied sesuai vault ratio, sehingga `minQuoteConsumed` adalah meaningful slippage/protection field dan tidak boleh di-hardcode secara sembrono. fileciteturn29file0L2-L2

Withdrawal preparation harus melakukan:

```text
shares <= vault.balanceOf(account)
previewWithdraw(shares)
receiver == account
owner == account
fresh simulate
```

dan UI harus memahami bahwa actual vault state dapat berubah antara preview dan signing.

Recommended SDK surface:

```ts
assertKuruVaultIdentity()

readKuruVaultState()

prepareKuruVaultDeposit()

prepareKuruVaultMint()

prepareKuruVaultWithdraw()
```

Tidak boleh ada generic:

```ts
prepareContractWrite(address, function, args)
```

karena itu akan menghancurkan safety boundary SDK.

### Pro Market Maker sebagai fase berikutnya

Setelah passive LP selesai, baru audit:

```text
addFlipBuyOrder
addFlipSellOrder
addPairedLiquidity
batchAddPairedLiquidity
batchProvisionLiquidity
batchUpdate
batchCancelFlipOrders
```

Contract source menunjukkan ordinary limit orders, flip orders, paired liquidity dan vault liquidity mempunyai semantics berbeda, sehingga UI juga harus berbeda. fileciteturn32file0L2-L2

Ideal Pro workspace:

```text
Market Making

Strategy
  Manual
  Two-sided
  Ladder
  Flip

Reference
  best bid / ask
  vault bid / ask
  last trade

Inventory
  base
  quote
  target %

Risk
  max order
  max inventory
  max spread
  post-only
  cancel-on-disconnect       ← UI/agent feature, not contract claim

Orders
  active
  partial
  filled
  cancelled

PnL
  realized
  unrealized
  fees
```

Jangan menampilkan APY/ROI palsu hanya dari spot vault values. PnL membutuhkan historical accounting yang deterministic.

### Rapikan production tooling

Root scripts harus mencerminkan canonical app:

```json
{
  "dev:ui": "pnpm --filter @retropick/retro-ui dev",
  "build:ui": "pnpm --filter @retropick/retro-ui build",
  "typecheck:ui": "...",
  "test:ui": "...",
  "e2e:ui": "..."
}
```

Legacy web scripts dapat dipertahankan dengan nama eksplisit:

```text
dev:legacy-web
build:legacy-web
```

daripada `dev:web`, karena current package.json masih mengarahkan generic `web` scripts ke legacy package. fileciteturn58file0L2-L2

### Urutan delivery yang saya rekomendasikan

| Release | Scope | Contract changes |
|---|---|---|
| **Liquidity R0** | fix depth semantics, AMM health reads, copy | Tidak |
| **Liquidity R1** | `/liquidity`, Pools, market diagnostics | Tidak |
| **Maker R1** | dedicated MarginAccount + limit/post-only workspace | Tidak |
| **Indexer R1** | vault event scanning + pool projection | Tidak |
| **Portfolio R1** | richer maker inventory/orders | Tidak |
| **LP R1** | passive Kuru vault LP deposit/withdraw | Tidak harus, tetapi security allowlist berubah |
| **Pro MM R1** | flip/paired/batch liquidity | Tidak harus, tetapi major security review |
| **Production hardening** | monitoring, deployment, CI, evidence gates | Tidak |

Ini penting: **sebagian besar missing product tidak membutuhkan smart-contract V3**. Existing contract V2 sudah menyediakan fondasi kuat. Yang kurang adalah correct read model, approved capability exposure, dan frontend information architecture.

## Validation gates dan master goal prompt

Sebelum menganggap Liquidity feature selesai, saya akan mensyaratkan validation matrix berikut.

| Scenario | CLOB | Vault | Expected UI |
|---|---:|---:|---|
| ordinary orders + vault | yes | yes | keduanya terlihat |
| ordinary orders only | yes | no executable quote | CLOB active |
| **empty CLOB + vault active** | **no** | **yes** | **tidak boleh mengatakan market illiquid** |
| empty CLOB + vault unavailable | no | unknown | unavailable, bukan zero |
| empty CLOB + vault dry | no | no | no executable liquidity |
| L2 RPC fails + quote works | unknown | yes | quote may trade, depth unavailable |
| quote simulation zero | any | any | market-order CTA disabled |
| stale depth | stale | current quote | stale indication |
| market soft paused | any | any | correct trade restrictions |
| market hard paused | any | any | trading disabled |
| wrong market/vault | — | — | fail closed |
| Kuru environment drift | — | — | fail closed |
| insufficient margin | — | — | deposit flow |
| partial order fill | yes | — | remaining size accurate |
| cancelled order | — | — | removed/open status accurate |
| LP deposit after approval | — | yes | shares exactly verified |
| LP withdrawal | — | yes | underlying verified |
| indexer behind | — | — | chain trading remains authoritative |

Kasus **empty CLOB + vault active** harus menjadi mandatory regression test karena itu persis blind spot yang menghasilkan screenshot Anda.

Current staging suite sudah menguji honest empty-book state dan RPC failure state; perlu diperluas supaya empty CLOB tidak otomatis diasosiasikan dengan zero AMM executable liquidity. fileciteturn50file0L2-L2

Fullstack campaign sebelumnya membuktikan real testnet flows untuk create, curve buy, curve sell, graduation, Kuru margin deposit, limit order, cancel dan margin withdrawal. Jadi regression suite baru harus mempertahankan seluruh kemampuan tersebut sembari menambahkan liquidity semantics; jangan menggantikan working flows dengan rewrite. fileciteturn38file0L2-L2

Berikut master goal prompt yang saya akan gunakan untuk senior coding agent yang benar-benar mengerjakan repo ini:

```text
ROLE

You are the senior production engineer, senior frontend engineer,
senior smart-contract integration engineer, security engineer and QA
owner for RetroPick.

Repository:
RetroPick/retropick-protocol

Work from current main.

Do not redesign RetroPick.
Extend the existing product language, transaction pipeline, SDK
boundaries, React Query architecture, indexer projection architecture,
wallet integration and security model.

PRIMARY GOAL

Complete the missing Kuru liquidity/product layer across:

1. contracts semantics
2. launchpad SDK
3. indexer/read backend
4. retro-ui
5. tests
6. deployment/production validation

The finished product must distinguish:

A. resting CLOB liquidity
B. Kuru AMM vault liquidity
C. executable market-order liquidity
D. user MarginAccount trading capital
E. protocol-seeded permanently locked LP
F. future user-owned passive LP positions

Never treat those concepts as interchangeable.

CRITICAL BUG TO FIX

The current terminal reads orderbook depth from:

OrderBook.getL2Book(20,20)

Upstream Kuru getL2Book enumerates ordinary resting order
price points and does NOT represent KuruAMMVault liquidity.

Kuru matching, bestBidAsk(), and market execution can include
the KuruAMMVault.

Therefore:

"No resting orders"

MUST NOT imply:

"No executable liquidity"

or:

"KuruAMMVault is empty."

The existing empty-state copy must be corrected.

NON-NEGOTIABLE SECURITY RULES

- Keep financial arithmetic bigint/exact-integer end-to-end.
- Never use JS floating-point for contract amounts.
- Every write must go through the launchpad SDK prepare boundary.
- Every prepared write must use the existing transaction pipeline:
  prepare -> approvals -> simulate -> wallet confirmation ->
  broadcast -> receipt -> decode -> invalidate.
- Never introduce a generic arbitrary contract-write helper.
- Keep economic signing client-side.
- Backend must remain read-only for economic actions.
- Validate Kuru environment/market identity before Kuru writes.
- Do not expose admin, ownership, upgrade, router deployment,
  PoolManager, Permit2, PositionManager, executor-internal or
  protocol-internal functions.
- Do not expose KuruAMMVault deposit/mint/withdraw in the first
  phase.
- Do not expose flip/paired/batch Kuru market-maker primitives
  until a dedicated security disposition approves them.
- Existing protected protocol LP remains non-withdrawable.
- No fabricated depth, liquidity, PnL, APY or volume.
- Unknown data must be rendered unknown, not zero.
- Stale data must be visibly marked stale.
- Chain state is authoritative for writes.

PHASE A — AUDIT AND BASELINE

Inspect and document current implementations before editing:

contracts/src/v2/**
packages/launchpad-sdk/**
apps/indexer/**
apps/retro-ui/**
apps/abi/**
deployments/monad-testnet/**
development/fullstack-integration/**
docs/contracts/**
docs/frontend/**

Produce a current capability matrix:

capability
contract
read/write
SDK support
indexer support
frontend support
security status
required work

Do not rely blindly on historical docs.
Where docs disagree with current code, current code wins and the
documentation must be corrected.

PHASE B — KURU LIQUIDITY READ MODEL

Preserve readKuruBook() semantics as ordinary CLOB L2.

Do not inject synthetic AMM levels into getL2Book results.

Add qualified reads for:

OrderBook.marketState()
OrderBook.bestBidAsk()
OrderBook.getVaultParams()

KuruAMMVault.totalAssets()
KuruAMMVault.totalSupply()
KuruAMMVault.balanceOf(lpLock)

KuruLiquidityLockV2.protectedBalances()

Use the Coordinator receipt as the authoritative market/vault/lock
binding.

Create explicit view models:

KuruClobState
KuruVaultState
KuruExecutionState
KuruLiquidityState

Every returned field must carry sufficient provenance that the
frontend can distinguish:

CLOB
AMM_VAULT
BEST_EXECUTABLE
PROTOCOL_LOCK

All reads must use the existing qualified public-client path.

PHASE C — TERMINAL SEMANTICS FIX

Replace the existing ambiguous empty orderbook experience.

When getL2Book is empty:

render:
"No resting CLOB orders"

Then independently render AMM status.

Possible states:

CLOB empty + vault active:
  "No user maker orders"
  "Protocol AMM active"
  show vault best bid/ask
  market order may remain available based on simulation

CLOB empty + vault dry:
  "No executable liquidity"

CLOB RPC unavailable:
  "Resting depth unavailable"
  do NOT report zero depth

Vault RPC unavailable:
  "AMM status unavailable"
  do NOT report zero vault liquidity

Market-order simulation is the final authority for whether the
requested market order can execute.

Remove stale copy that equates empty L2 with missing total liquidity.

Correct any stale "Kuru book depth is not aggregated" language:
ordinary CLOB depth is aggregated; unified CLOB + vault liquidity
is a separate concept.

PHASE D — LIQUIDITY PAGE

Add canonical route:

/liquidity

Optional child routes:

/liquidity/pools/:token
/liquidity/market-making

Add "Liquidity" to desktop sidebar.

Add an appropriate mobile navigation destination without causing
horizontal overflow.

Do not create a new global Trade route unless required.
Keep the existing canonical token trading route:

/launchpad/token/:token

Liquidity landing page must have:

Pools
My Positions
Market Making

Initial My Positions can be read-only / future LP capability.

POOLS VIEW

For each graduated Kuru launch show:

token / quote
market state
market address
vault address
protocol liquidity lock
CLOB resting bid/ask level count
vault base assets
vault quote assets
vault bid
vault ask
vault bid size
vault ask size
vault spread
best executable bid
best executable ask
freshness
last confirmed trade
open maker orders if applicable

Do not collapse all of these into one "Liquidity" number unless the
unit and methodology are mathematically valid.

Provide:

Trade
Market Make
Pool Details

actions.

PHASE E — COMPACT TERMINAL LIQUIDITY PANEL

Inside /launchpad/token/:token keep a compact liquidity panel:

Resting CLOB
AMM Vault
Best Executable
Market Order Quote

Add:

"View liquidity"

link to the matching pool.

Do not move full LP management into the trade ticket.

PHASE F — MARKET-MAKING WORKSPACE

Build /liquidity/market-making using ONLY the currently approved
surface first:

MarginAccount.deposit
MarginAccount.withdraw
MarginAccount.batchWithdrawMaxTokens

OrderBook.addBuyOrder
OrderBook.addSellOrder
OrderBook.placeAndExecuteMarketBuy
OrderBook.placeAndExecuteMarketSell
OrderBook.batchCancelOrdersNoRevert

Reuse existing SDK preparers.

Expose:

wallet balances
margin balances
margin deposit
margin withdrawal
limit buy
limit sell
post-only toggle
open orders
partially-filled orders
cancel selected
cancel all visible orders
market parameters
maker fee
taker fee
tick size
min size
max size
market state

Add a two-sided quote builder that can prepare a post-only bid and
a post-only ask using the existing individual limit-order functions.

Clearly disclose:

"Two separate transactions — not atomic."

Handle:
first succeeds / second fails
first rejected
second rejected
wallet disconnect
chain change
stale market params
order immediately non-resting
partial fills

Do not call this atomic paired liquidity.

PHASE G — INDEXER LIQUIDITY SUPPORT

Current dynamic indexer scanning includes token, curve and market.

Extend graduated Kuru dynamic scanning to include the vault.

Index at minimum:

KuruVaultDeposit
KuruVaultWithdraw
vault LP Transfer where needed

Create projections for:

liquidity pools
vault history
wallet LP positions / discovery hints

Add API endpoints or equivalent typed query surfaces for:

GET /v1/liquidity/pools
GET /v1/liquidity/pools/:token
GET /v1/liquidity/pools/:token/events
GET /v1/wallets/:wallet/lp-positions

Maintain:

confirmation buffer
reorg rollback
projection versioning
cursor integrity
freshness envelope
read-only HTTP policy

Increment projection version when schema changes.

Add replay/reorg tests.

Do not make the indexer the authority for transaction preconditions.

PHASE H — GRADUATED LIQUIDITY METRIC

Do not leave graduated Kuru launches permanently as:

liquidityRaw = null
liquiditySource = UNAVAILABLE

when a qualified Kuru vault exists.

Define a truthful representation.

If a single scalar liquidity value is not dimensionally safe because
the vault owns two assets, expose structured base/quote reserves
instead of inventing a combined number.

Any converted quote-value metric must document:

valuation price
block
decimals
rounding
source

PHASE I — PASSIVE LP SECURITY CAMPAIGN

Do NOT enable this phase automatically.

First produce a written security review for:

KuruAMMVault.previewDeposit
KuruAMMVault.previewMint
KuruAMMVault.previewWithdraw
KuruAMMVault.deposit
KuruAMMVault.mint
KuruAMMVault.withdraw
LP ERC20 allowance/permit surfaces

Threat model:

malicious user-supplied vault
wrong market binding
wrong quote/base assets
wrong receiver
approval theft
native msg.value mismatch
quote-consumption slippage
front-running between preview and deposit
vault state movement
partial fills during withdrawal
share dilution
rounding
zero-share mint
stale preview
market pause
Kuru implementation drift
proxy upgrade drift

Only after PASS:

add:

assertKuruVaultIdentity()
readKuruVaultState()
prepareKuruVaultDeposit()
prepareKuruVaultMint()
prepareKuruVaultWithdraw()

Require receiver/owner policy to be explicit and documented.

Use fresh simulation before signing.

Update the formal write allowlist.

PHASE J — PASSIVE LP UI

Only after Phase I passes.

My Positions:

share balance
share %
base underlying
quote underlying
preview withdrawal
deposit history
withdraw history
current vault state
risk disclosure

Pool deposit:

base amount
quote maximum
actual required ratio
expected LP shares
minimum quote consumed
wallet balances
allowances
transaction preview

Never display guaranteed yield or guaranteed APY.

PHASE K — PRO MARKET-MAKING SECURITY CAMPAIGN

Review separately:

addFlipBuyOrder
addFlipSellOrder
addPairedLiquidity
batchAddPairedLiquidity
batchProvisionLiquidity
batchUpdate
batchCancelFlipOrders
collectFees

Do not enable them merely because the ABI contains them.

For every function establish:

caller authority
asset debit source
margin requirements
atomicity
failure semantics
event semantics
cancel semantics
front-running behavior
market-state behavior
price/size grid
slippage/provision guarantees

Only approved functions can enter SDK prepare functions.

PHASE L — INFORMATION ARCHITECTURE

Desktop sidebar:

Home
Liquidity
Earn
Launch

Keep existing brand language.

Liquidity means financial market liquidity.

Earn "Private Strategy Vault" must remain clearly distinct from
Kuru AMM vault terminology.

Recommended route ownership:

/launchpad
  discovery

/launchpad/token/:token
  trading terminal

/liquidity
  pool discovery

/liquidity/pools/:token
  pool health/details

/liquidity/market-making
  professional maker workspace

/earn
  claims
  portfolio
  created
  referrals
  funding
  private strategy vault
  protection

/launchpad/create
  launch

PHASE M — PRODUCTION TOOLING CLEANUP

Audit root scripts.

The canonical frontend is apps/retro-ui.

Rename or replace generic root commands that still target the legacy
@retropick/web package.

Provide unambiguous:

dev:ui
build:ui
typecheck:ui
test:ui
e2e:ui

If legacy web stays:

dev:legacy-web
build:legacy-web

Document exactly which package production deploys.

PHASE N — REQUIRED TEST MATRIX

Unit tests:

- CLOB decode
- vault read normalization
- best bid/ask normalization
- base/quote decimals
- native quote
- ERC20 quote
- identity mismatch
- market-state mismatch
- stale reads
- exact bigint conversions

Indexer:

- vault discovered at graduation
- vault deposit indexed
- vault withdrawal indexed
- LP Transfer indexed where required
- replay deterministic
- duplicate log idempotency
- reorg rollback
- projection migration
- pagination
- freshness

Frontend component tests:

- CLOB empty / vault active
- CLOB active / vault active
- CLOB active / vault unavailable
- CLOB unavailable / vault active
- both empty
- both unavailable
- stale CLOB
- stale vault
- market paused

Trading tests:

- market quote > 0 with empty getL2Book
- market quote == 0
- margin shortfall
- deposit + order
- deposit succeeds / order fails
- limit post-only
- partial fill
- cancel
- batch cancel
- withdrawal

Responsive:

1440 desktop
1280 desktop
768 tablet
390 mobile
320 minimum supported width if applicable

No horizontal overflow.

PHASE O — REAL TESTNET VALIDATION

On Monad Testnet verify a real graduated Kuru market.

At one pinned block capture:

Coordinator.ledger(token)
Coordinator.receipt(token)

OrderBook.getMarketParams()
OrderBook.marketState()
OrderBook.getL2Book(20,20)
OrderBook.getVaultParams()
OrderBook.bestBidAsk()

KuruAMMVault.totalAssets()
KuruAMMVault.totalSupply()

KuruLiquidityLockV2.protectedBalances()

MarginAccount.getBalance(vault,base)
MarginAccount.getBalance(vault,quote)

Then demonstrate the critical invariant:

It is valid for:

getL2Book == empty

while:

vault assets > 0
and/or
bestBidAsk includes vault quotes
and/or
market-order simulation returns executable output.

Record block number and raw values as evidence.

Then validate via UI:

maker margin deposit
post-only order
order visible
partial/full fill where possible
cancel
margin withdrawal

For passive LP release, additionally validate:

external LP deposit
LP shares minted
vault assets changed
withdraw preview
withdraw
underlying received

Use authorized test accounts only.

PHASE P — ACCEPTANCE CRITERIA

Do not mark complete until:

[ ] "No resting orders" no longer means "no total liquidity"
[ ] vault and CLOB provenance are displayed separately
[ ] AMM state is visible
[ ] executable market quote is independently represented
[ ] /liquidity exists
[ ] sidebar contains Liquidity
[ ] mobile navigation remains usable
[ ] market-making workspace uses existing safe SDK writes
[ ] vault is dynamically indexed
[ ] liquidity backend has freshness/reorg semantics
[ ] no fake financial data exists in live mode
[ ] no generic write escape hatch exists
[ ] all amounts remain exact integers
[ ] all old launch/trade/graduation/earn flows remain green
[ ] root production commands target the canonical UI
[ ] TypeScript passes
[ ] SDK tests pass
[ ] indexer tests pass
[ ] retro-ui unit tests pass
[ ] Playwright passes
[ ] production build passes
[ ] testnet evidence is recorded

Passive LP is complete ONLY IF:

[ ] dedicated security review passed
[ ] write allowlist updated
[ ] vault identity validation implemented
[ ] SDK preparers added
[ ] preview/slippage handling proven
[ ] real testnet deposit and withdraw proven

Pro MM is complete ONLY IF:

[ ] each advanced Kuru primitive received an explicit disposition
[ ] approved operations have safe SDK preparers
[ ] atomicity/failure semantics are represented truthfully in UI

DELIVERABLES

Return:

1. Architecture report
2. Current-vs-target capability matrix
3. Files changed
4. Security disposition changes
5. SDK API additions
6. Indexer schema/API additions
7. Frontend routes/components
8. Tests added
9. Exact commands executed
10. Build/typecheck/test results
11. Real-chain evidence with block/tx hashes
12. Remaining blockers
13. Explicit PASS/BLOCKED verdict for:
    - liquidity reads
    - market-making
    - passive LP
    - pro MM
    - production deployment

Never report a blocked external validation as PASS.
Never fabricate successful on-chain evidence.
Never infer AMM liquidity from empty/non-empty getL2Book.
```

Arsitektur target akhirnya seharusnya menjadi:

```text
                         RETROPICK
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
      HOME              LIQUIDITY              EARN
        │                   │                   │
   Discover             Pools              Claims
   Launches             Positions          Portfolio
        │               Market Making      Creator
        ▼                   │                   │
  TOKEN TERMINAL            │                   │
        │                   │                   │
        ├── Curve trade     │                   │
        │                   │                   │
        └── Kuru trade ◄────┘                   │
              │                                 │
      ┌───────┼────────┐                        │
      ▼       ▼        ▼                        │
    CLOB    AMM     Margin                      │
   Orders   Vault    Account                    │
      │       │        │                        │
      └───────┴────────┘                        │
              │                                 │
              ▼                                 ▼
          Kuru Market                    FeeEscrow/
                                         BuybackVault
```

Secara engineering, **smart contract V2 bukan bottleneck utama untuk next release**. V2 sudah mempunyai automatic Kuru liquidity seed, permanently protected LP, MarginAccount funding, market/limit/post-only orders, cancel, market execution, creator claims, buyback vesting dan lifecycle recovery. Repository juga telah memvalidasi banyak dari flow tersebut melalui real Monad testnet transactions. fileciteturn26file0L2-L2 fileciteturn38file0L2-L2

Bottleneck utamanya sekarang adalah bahwa frontend dan backend belum mempunyai **first-class concept of liquidity**. UI hanya melihat ordinary L2 book dan kemudian mencoba menyimpulkan market health dari sana, sementara Kuru secara desain mempunyai dua liquidity engines sekaligus: **resting CLOB orders dan AMM vault**. Upstream OrderBook matching membuktikan keduanya ikut execution path. fileciteturn32file1 fileciteturn32file4

Jadi keputusan produk yang paling tepat adalah: **tambahkan Liquidity sebagai section terpisah di sidebar, pertahankan compact liquidity/execution status di trading terminal, bangun professional market-making terlebih dahulu menggunakan MarginAccount + existing post-only limit orders, dan baru kemudian buka public KuruAMMVault LP deposit/withdraw setelah security campaign khusus.**