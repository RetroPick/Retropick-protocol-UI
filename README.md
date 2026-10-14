# RetroPick

**The market creation layer for Monad.**

RetroPick carries community tokens through onchain bonding discovery and protected graduation into Kuru orderbook trading. Current scope is an unaudited Monad Testnet candidate; market depth and demand remain market-dependent.

**Launch → Bonding Curve → Graduation Coordinator → Kuru Market → Protected Liquidity → Orderbook Trading**

## Live on Monad Testnet

The canonical deployed candidate demonstrates:

- ✅ Token issuance and bonding-curve buy/sell
- ✅ Safe graduation and real Kuru market creation
- ✅ Permanent custody for graduation LP shares and excess tokens
- ✅ Permissionless completion/retry
- ✅ Live testnet limit order, fill and cancel

[Open the canonical live frontend](https://retropick.xyz/launchpad). Historical team functional-test receipts demonstrate launch, curve trading, Kuru graduation and two-wallet order/fill/cancel; they are not organic volume or present orderbook depth. Fresh desktop/mobile checks and the current video status are recorded in the [submission readiness report](docs/metropolis/submission-20261014/READINESS_REPORT.md). The founder-recorded pitch remains founder-owned. Canonical Circle-USDC live smoke: **BLOCKED_FUNDING**.

[Judge overview](HACKATHON.md) · [Evidence map](docs/hackathon/EVIDENCE_MAP.md) · [Full deployment manifest](deployments/monad-testnet/v2.json) · [Metropolis requirements](docs/hackathon/METROPOLIS_REQUIREMENTS.md)

## Why Monad?

RetroPick produces two active phases: rapid bonding-curve transactions and post-graduation orderbook trading. Low-cost execution, fast settlement and responsive market state matter when many primary markets and secondary orderbooks operate simultaneously. This connects asset primitives, market infrastructure and settlement to Metropolis's Onchain Finance & Trading track.

## Why Kuru?

RetroPick specializes in issuance, creator distribution, primary discovery and graduation safety. Kuru supplies the secondary orderbook, limit orders and market-making workflows. Our demo created an actual Kuru market, seeded its vault and executed an order, fill and cancel. Depth, spreads and execution quality remain market-dependent; neither integration nor permanent custody guarantees trading outcomes.

## Deployed proof

| Component | Monad Testnet address |
| --- | --- |
| Factory | [0xa7f18b9eceb0A9852b08408854A45D00fc682454](https://testnet.monadexplorer.com/address/0xa7f18b9eceb0A9852b08408854A45D00fc682454) |
| Coordinator | [0xaD62309242EA65BB07C833669EC6a4ED23AF738F](https://testnet.monadexplorer.com/address/0xaD62309242EA65BB07C833669EC6a4ED23AF738F) |
| Demo token | [0x43e7e9b1b7d9A143573307b13D14B51580c18f15](https://testnet.monadexplorer.com/address/0x43e7e9b1b7d9A143573307b13D14B51580c18f15) |
| Bonding curve | [0x454A3A449d4e65CA5203d331905d167BA218E276](https://testnet.monadexplorer.com/address/0x454A3A449d4e65CA5203d331905d167BA218E276) |
| Kuru market | [0x1F5dE72616a7fe645Cf45aC66dfce8Ac7452C57F](https://testnet.monadexplorer.com/address/0x1F5dE72616a7fe645Cf45aC66dfce8Ac7452C57F) |
| Kuru vault | [0xc88DED06eB0081430Ff02d124C22b532e122CbE7](https://testnet.monadexplorer.com/address/0xc88DED06eB0081430Ff02d124C22b532e122CbE7) |
| Permanent LP/excess lock | [0x72ced84b20Bb8467c5547e3EbF85E62321B6a425](https://testnet.monadexplorer.com/address/0x72ced84b20Bb8467c5547e3EbF85E62321B6a425) |

Six concise proof transactions: [launch](https://testnet.monadexplorer.com/tx/0x5cc1d0469ee7b811139055a81f2ba85a49a3de5b8ea54e158426693a556271f3), [bonding buy](https://testnet.monadexplorer.com/tx/0x41627a9090bd0fbdac03126457de8b3bc60a29486c70efffd18f71997596a926), [graduation](https://testnet.monadexplorer.com/tx/0x70d0cb480e7824ca9af62eaa5cb8d246a352efc6f2ba3585119c8bc64fa63fde), [order](https://testnet.monadexplorer.com/tx/0xabd44f6922c652f0043658bf86f7d72e5cc550d4755a001cfd8d1c519ae515b7), [fill](https://testnet.monadexplorer.com/tx/0x93e056ca41c8f55022c2030f4ecaade5775187fc443e8b98f7ddac7a65855415), [cancel](https://testnet.monadexplorer.com/tx/0x471faeb38c8598fc7207cb97c18a550db989e6d43bf0ce23b3539ea7920ac920). These are functional testnet transactions, not organic adoption.

[Verified contract sources — seven exact runtime matches](evidence/hackathon/metropolis/SOURCE_VERIFICATION.md).

## Engineering depth

Factory → single-ledger Coordinator → venue executor keeps lifecycle authority separate from venue work. Architectural extraction reduced Factory runtime from approximately 24,565 to **23,423 bytes**. Exact integer terminal-quote constraints preserve completion liveness across valid trade histories; graduation LP/excess assets enter a permanent bound lock. Native/Circle Uniswap v4 compatibility remains in the release campaign.

Historical predeployment campaign: **145 passed / 0 failed / 0 skipped**, fresh qualification fork **69,507,986**. [Release artifacts](evidence/launchpad/v2-monad-testnet/README.md). Deployed bytecode source: `f0363249f4b74e58dde37d1241742ca5a92bcfe3`; main integration baseline: `84861f50494a79772cf6f97a5e710bcc24973d5e`. Current repository release verification is recorded separately; source SHA is not a live readiness claim.

## Run the web app

Node ≥22.13 and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
cp apps/retro-ui/.env.example apps/retro-ui/.env.local
pnpm --filter @retropick/retro-ui dev
```

The canonical frontend is `apps/retro-ui`. Configure its documented live data mode and public read infrastructure; never put credentials or signing keys in a browser environment. Wallets sign normal economic writes directly to chain. `apps/web` is legacy and excluded from this submission's demo and implementation work.

```sh
pnpm --filter @retropick/retro-ui typecheck
pnpm --filter @retropick/retro-ui build
```

Contracts require Foundry, recursive submodules, the separately built v4/Permit2 dependencies and a funded RPC endpoint for mandatory fork tests. See [contract setup](contracts/README.md) and [release evidence](evidence/launchpad/v2-monad-testnet/README.md). Never commit signing keys.

## Hackathon scope and attribution

Pre-existing foundations include V1/shared Solidity dependencies and the visual frontend prototype. V2 delivery introduced Coordinator extraction, policy snapshots, completion liveness, Kuru graduation/protected custody, V4 migration and deployment/smoke tooling. This submission release connects the live frontend and judge evidence. Build-window claims must be assessed from public commit history; this repository is not entirely new hackathon code.

AI-assisted tools were used for engineering, testing and documentation; maintainers remain responsible for review and claims. Third-party notices: [contracts](contracts/THIRD_PARTY_NOTICES.md), dependency licenses and frontend package/vendor notices. Original project source uses the [MIT license](LICENSE); [third-party licenses](THIRD_PARTY_NOTICES.md) remain applicable.

[Submission copy](docs/hackathon/SUBMISSION_COPY.md) · [Demo](docs/hackathon/DEMO_SCRIPT.md) · [Pitch](docs/hackathon/PITCH_SCRIPT.md) · [Q&A](docs/hackathon/JUDGE_QA.md) · [Partnership plan](docs/hackathon/MONAD_PARTNERSHIP.md) · [Growth](docs/hackathon/GROWTH_PLAN.md)
