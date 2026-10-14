# Exact saved portal fields

Snapshot: 2026-10-14T02:21:17.267518+00:00. Source: evidence/hackathon/metropolis/submission-20261014/portal-final-required-media-saved.json. Save progress → Save anyway → reload passed; **DRAFT / NOT_SUBMITTED**. All nine selected bounties remain. These are exact captured values. Portal Complete badges check field presence, not sponsor qualification.

Founder pitch is **MY RESPONSIBILITY / FOUNDER_OWNED / PENDING_EXTERNAL_INPUT**. MetaMask required public skill and video URLs are saved; its read-only demonstration does not establish wallet-mediated financial execution.

## Project name

Field: `submission-name` · 9/120 UTF-16 units.

```text
RetroPick
```

## One-line description

Field: `submission-oneLiner` · 143/200 UTF-16 units.

```text
RetroPick turns token launches into Kuru markets on Monad: bonding-curve price discovery, protected graduation assets, and limit-order trading.
```

## Description

Field: `submission-description` · 4424/8000 UTF-16 units.

```text
RetroPick is market origination infrastructure for Monad. Our working product, Bond-to-Book, carries a token from launch and primary price discovery into a tradable Kuru market.

Our initial customer hypothesis is a Monad-native community operator who can recruit interested participants but has no trading engineering team. Their counterparties are community traders who want transparent early pricing and later explicit limit-price control. Existing alternatives include Nad.fun's launch lifecycle and Kuru's direct token-and-market deployer. We must still validate why a specific operator would switch.

The demonstrated Monad Testnet journey is: creator sets token and launch terms; users buy and sell through onchain bonding discovery; a Graduation Coordinator secures the launch assets; a Kuru executor creates the market and vault; initial LP shares and excess launch tokens enter protected custody; traders use the Kuru orderbook. Historical functional-test receipts demonstrate issuance, curve trading, graduation and a two-wallet order, fill and cancellation. These are test trades, not organic volume.

The engineering focus is lifecycle reliability. Launch policy and the venue are committed before primary trading; one Coordinator owns the secured-assets ledger; Kuru graduation executes atomically and remains retryable after failure; the initial LP/excess lock has no owner withdrawal or arbitrary-call path. The deployed-source record is f0363249f4b74e58dde37d1241742ca5a92bcfe3, distinct from the current frontend/reproducibility source. Source verification establishes correspondence with deployed bytecode, not an audit.

Bonding curves, graduation, locks and orderbooks each have prior art. We do not claim a globally first combination, a new asset class, or exclusive market creation. Our hypothesis is that their controlled lifecycle and coherent creator-to-trader experience are valuable together. We build market origination; Kuru provides secondary execution; Monad is the settlement infrastructure.

The app is designed to make quote units, fees, launch state and order intent visible. Wallets sign normal user economic actions directly to chain; the backend and indexer are read infrastructure, not economic authority. Historical order/fill/cancel proof remains inspectable when an orderbook is empty. Indexed data must expose freshness and cannot substitute for contract state. The Envio HyperSync Market Radar derives graduation and first-trade signals from onchain logs; its current health and availability are checked separately in the submission evidence.

Monad is a plausible fit for repeated primary trades, graduation and secondary order updates, with Kuru providing the execution venue. We have not measured a cross-chain latency advantage and do not claim one.

This is an unaudited Monad Testnet candidate, chain 10143. Locked initial assets do not guarantee current depth, a tight spread, stable prices, issuer honesty or investment returns. Limit orders may remain unfilled or partially fill. Kuru remains an external dependency. Circle-USDC live qualification is funding-blocked; the demonstrated economic journey uses MON. Standard creator/community ERC20 launches are current scope. Prediction/PRISM and other asset classes remain independently gated research.

Pre-existing foundations include V1/shared Solidity dependencies and the visual frontend prototype. V2 delivery added Coordinator extraction, policy snapshots, completion liveness, Kuru graduation/protected custody and deployment/smoke tooling. The release connects the canonical frontend and judge evidence. Public commit history governs build-window attribution; we do not claim the entire repository originated during Metropolis. AI tools assisted engineering, testing and documentation. Original project source is MIT; third-party licenses and notices remain applicable.

Founder-reported early audience interest is not independently verified adoption. Organic trading, retained users and revenue remain unmeasured, with no confirmed pilots or market-maker agreements claimed. We propose a small operator/trader/maker pilot to measure activation, graduation, independent fills, executable depth, spreads and return activity before expanding distribution or pursuing a security-qualified production release.

Product: https://retropick.xyz/launchpad
Source and proof: https://github.com/RetroPick/retropick-protocol
```

## Go-to-market and user acquisition

Field: `submission-goToMarket` · 3985/8000 UTF-16 units.

```text
Our first segment is Monad community operators who have run a community campaign, can invite a small group of consenting testnet participants, and lack a trading engineering team. The first trader segment is those communities' early participants plus Kuru users already comfortable with limit orders. Independent makers are prospective evaluators, not signed partners.

The current alternatives are Nad.fun's curve-to-DEX lifecycle, direct Kuru token/market deployment with supplied seed liquidity, and custom issuance plus exchange integration. Our testable reason to choose RetroPick is transparent primary discovery and a controlled, visible handoff into Kuru trading. No documented interviews currently prove willingness to switch.

The founder will recruit through existing RetroPick X, Telegram and Discord access, then seek consented introductions to Monad community operators and Kuru traders. We propose five operators, twenty deduplicated non-team traders and two prospective maker evaluators. These are targets, not recruited users or partnership claims. Each invitation will state testnet status and risks. We will not buy apparent traction, manufacture volume, promise returns or require trades merely to inspect the product.

The funnel is: invited qualified operator -> onboarding -> reviewed launch terms -> successful launch -> independent curve participation -> graduation -> first non-team Kuru order/fill -> D1/D7 return. Onboarding begins with a read-only product and proof walkthrough. Participants learn MON units, fees, curve impact, limit price, partial/unfilled orders, stale/empty books and protected-custody limits before using a wallet. We will record abandonment reasons and conduct consented follow-up interviews.

The measured adoption baseline is unknown. Historical two-wallet functional tests establish technical behavior only. Previous founder reports of waitlist and X attention remain unverified; we omit numerical traction from this answer. There are no verified interviews, committed pilots, market-maker agreements, organic volume, retained-user or revenue claims.

Proposed 30-day pilot: interview five qualified operators and aim for three of five completing a testnet launch; publish onboarding failures and initial market-quality observations. Proposed 60-day pilot: aim for two of three launched markets graduating and receiving a non-team fill, and recruit two maker evaluators. Proposed 90-day pilot: seek a repeat launch from two operators and measure D1/D7 trader return. The founder owns recruitment and review; technical maintainers own measurement and reliability. Targets are hypotheses, not guaranteed outcomes.

Report every KPI with a time window and denominator: activated creators / recruited qualified creators; graduated / launched pilot markets; independent-fill markets / graduated markets; returning traders / eligible activated traders. Separate team/test traffic from independent activity and historical filled volume from current orderbook depth. Measure two-sided MON depth within 1% and 2% of a valid mid, bid-ask spreads, book availability, first-order/fill delay and maker repeat participation.

Retention will depend on usable markets: reliable onboarding, visible orders, truthful freshness, predictable policy and access to counterparties. Maker outreach will cover inventory, risk and parameter constraints, without inventing fee rebates or committed liquidity. Distribution and referral experiments must use consented, attributable cohorts; each channel's activated creators / qualified referrals will be reported separately.

Only after pilot evidence should we expand creator onboarding and evaluate an SDK/API or embedded launch interface. Mainnet remains contingent on external security review, quote/venue qualification, issuer-specific legal and operational review and human release authorization. Our concrete ask is introductions to creator communities, independent Kuru makers and security reviewers.
```

## GitHub repository

Field: `submission-repositoryUrl` · 47/2000 UTF-16 units.

```text
https://github.com/RetroPick/retropick-protocol
```

## Live application

Field: `submission-demoUrl` · 31/2000 UTF-16 units.

```text
https://retropick.xyz/launchpad
```

## Technical demo URL

Field: `submission-demoVideoUrl` · 28/2000 UTF-16 units.

```text
https://youtu.be/P7rQYCbECZU
```

## Founder pitch URL — MY RESPONSIBILITY

Field: `submission-pitchVideoUrl` · 0/2000 UTF-16 units.

**Saved value: empty.**

## Judge access instructions

Field: `submission-accessInstructions` · 1500/8000 UTF-16 units.

```text
Open https://retropick.xyz/launchpad on Monad Testnet (chain 10143). Read-only inspection needs no wallet or login. Product walkthrough (2:04): https://youtu.be/M5nCBgfZu04 . Technical demo (2:55): https://youtu.be/P7rQYCbECZU . Kuru walkthrough (1:50): https://youtu.be/fF6K2h31vVI . Envio live dataflow (1:55): https://youtu.be/2yn3fzz-AeE . CRE official CLI simulation (1:30): https://youtu.be/IrDQP5Y98-A . All are silent caption-led videos with editable human scripts. Inspect an active curve and graduated RPV2M at https://retropick.xyz/launchpad/token/0x43e7e9b1b7d9a143573307b13d14b51580c18f15 . Historical team test receipts demonstrate launch, buy, graduation, order, fill and cancellation; they are not organic volume or current book depth. Market Quality Radar uses real Envio HyperSync logs, exposes cursor freshness and first-trade/graduation explorer links. Do not sign merely to review. Source: https://github.com/RetroPick/retropick-protocol . Current Radar source: https://github.com/RetroPick/retropick-protocol/tree/codex/metropolis-envio-v4-20261014/integrations/envio-market-radar . CRE is a successful official CLI simulation, not a DON deployment. Mera requires a genuine compatible authenticator; unverified sponsor hard gates are disclosed in their answers. Current exact prepared answers, scripts, readiness and supporting evidence: https://github.com/RetroPick/retropick-protocol/tree/codex/metropolis-submission-deliverables-20261014/docs/metropolis/submission-20261014 .
```

## Describe how your project integrates at least one Aurora Intents product *

Field: `submission-bounties-0-responses-b363c400-b5f9-4d20-bc23-45d8b8255c47` · 1352/8000 UTF-16 units.

```text
Aurora Intents is selected and under active qualification, but we cannot claim a completed live cross-chain integration. The deployed RetroPick economic journey uses native MON on Monad Testnet, chain 10143. A qualifying flow must deliver usable funds on that same network, reconcile the destination receipt and balance, then demonstrate an actual in-app use through the normal wallet-to-chain path.

Current read-only route research confirms that Aurora documentation lists Monad among supported chains, but this does not establish Monad Testnet support. The live 1Click token catalog currently exposes Monad asset identifiers with chain 143 for MON, USDC and USDT0; it contains no exact chain-10143 asset identifier. We have not verified a supported 10143 quote, source transaction, destination receipt, refund or in-app use. We do not substitute Monad mainnet funding, a mock deposit or a UI callback for that proof.

The integration therefore remains BLOCKED_EXTERNAL / NOT_DEMONSTRATED. Next qualification requires an official supported native-MON testnet route, followed by separately authorized source and destination economic activity and receipt reconciliation. No mainnet bridge or financial transaction has been initiated for this submission. Product: https://retropick.xyz/launchpad. Source: https://github.com/RetroPick/retropick-protocol.
```

## Submit an optional demo video (up to 2 mins) showing a live, working cross-chain flow showing funds arriving from another chain and being used within the app (optional)

Field: `submission-bounties-0-responses-26d3f6be-51f5-40f4-874e-d6470cd5e3b0` · 0/2000 UTF-16 units.

**Saved value: empty.**

## Describe how your project meaningfully uses Envio's HyperIndex, HyperSync or HyperRPC to power real on-chain data in your app — not just installed, but actually driving a feature. * (required)

Field: `submission-bounties-1-responses-77e422d7-f94c-425a-8448-d690b7bdce9e` · 2546/8000 UTF-16 units.

```text
RetroPick uses Envio HyperSync through @envio-dev/hypersync-client to derive historical market-quality insight from Monad Testnet 10143 logs. This is a HyperSync integration, not a claim of HyperIndex or HyperRPC usage. Factory, Coordinator and tracked Kuru events feed a durable decoded event journal, exact aggregation and read-only /api/radar/health and /api/radar/radar endpoints consumed by the token terminal.

The feature helps community operators identify lifecycle and graduation bottlenecks, and helps traders distinguish a graduated market from one with a recorded first Kuru execution. It exposes graduation latency, first-trade timing and transaction provenance, historical fill/quote amounts, order churn and cursor freshness. Historical activity is explicitly separate from executable orderbook depth; economic authority remains chain state and normal wallet signing.

The version-four correction qualifies each Kuru market's token identity, native quote semantics and precision before displaying amounts. Filled grid size is normalized with verified size precision and base decimals; gross historical quote amount uses the emitted trade price. Unqualified amounts stay unavailable. Journal replay and rollback address restart/reorg recovery and duplicate cancellation events. The local correction passed 35 Radar checks, 14 frontend terminal checks and source type checking in the dated evidence.

Version four is deployed on the existing Contabo RetroPick Radar service and consumed by the canonical retropick.xyz frontend. Read-only validation verified source hashes, saved upgrade PASS evidence, all RetroPick service states and unchanged healthy Yubie containers. Two recoverable upstream retries are retained in the evidence; subsequent cursor progress, zero decode errors, verified canonical anchor and null current error passed recovery checks. Fresh anonymous desktop/mobile apex checks passed after frontend release 3728ce516df74954fc829211921632f7c830f36d.

For RPV2M, the matched historical fill is 0.1 base token and 0.000398019 MON gross consideration; cancellation events are deduplicated to two. These are team functional-test transactions, not organic demand. The public token panel exposes first-trade and graduation explorer links and explicitly distinguishes historical insight from executable Kuru depth.

Product: https://retropick.xyz/launchpad. Public implementation, tests and README: https://github.com/RetroPick/retropick-protocol/tree/codex/metropolis-envio-v4-20261014/integrations/envio-market-radar .
```

## Submit an optional demo video (up to 2 mins) showing the data flowing end to end through Envio's HyperIndex, HyperSync or HyperRPC. (optional)

Field: `submission-bounties-1-responses-cbc0baaf-34ac-464b-bf5e-382d593095cb` · 28/2000 UTF-16 units.

```text
https://youtu.be/2yn3fzz-AeE
```

## Clearly describe your target user segments * (required)

Field: `submission-bounties-2-responses-74c5b068-7e21-4891-9e74-e0b85a4ab7e0` · 1391/8000 UTF-16 units.

```text
RetroPick's first customer hypothesis is a Monad community operator with an existing audience but no trading engineering team. They need explicit issuance terms, early price discovery, a reliable graduation destination and a coherent secondary trading interface. Their actual economic counterparties would be community participants buying or selling on the curve and Kuru traders seeking explicit limit-price control after graduation.

We propose an initial testnet cohort of five operators who have run a community campaign, twenty deduplicated non-team traders and two prospective maker evaluators. These counts are recruitment targets, not current users or agreements. Traders are prioritized as ten participants from pilot communities and ten users familiar with Kuru limit orders. Makers must evaluate stable market identity, tick/size constraints, inventory and external-venue risk. No committed maker is claimed.

The app carries token launch -> bonding discovery -> secured graduation -> Kuru market/vault -> order/fill/cancel. Existing alternatives are Nad.fun's launch lifecycle, Kuru's direct token-and-market deployer and custom infrastructure. The pilot must establish whether controlled lifecycle continuity is enough to justify switching. Product: https://retropick.xyz/launchpad. Network: Monad Testnet, 10143.

Working Kuru demonstration (1:50): https://youtu.be/fF6K2h31vVI
```

## Clearly describe case studies and/or research that shows evidence of demand. * (required)

Field: `submission-bounties-2-responses-2025b46e-ba50-47f9-8d6f-491912a85296` · 1671/8000 UTF-16 units.

```text
Our evidence is technical feasibility plus a customer hypothesis, not verified commercial demand. Historical functional-test receipts demonstrate token launch, curve trading, Kuru graduation and two-wallet order/fill/cancel. Those transactions are test traffic and do not establish organic volume or retention.

Primary-source research confirms existing market workflows: Nad.fun serves Monad creators/communities with curve-to-DEX graduation (https://nad.fun/skill.md); Kuru already supplies token/market/liquidity deployment and warns that inappropriate market precision can prevent limit orders (https://docs.kuru.io/sdk/deploy-market). Kuru's maker guide describes orderbook feeds, inventory-aware quoting, atomic order refresh and fill/cancellation monitoring (https://docs.kuru.io/sdk/py-sdk-market-making). These sources establish available alternatives and operational requirements, not demand for RetroPick.

The founder has reported early audience interest and access to relevant X/Telegram/Discord communities, but dated analytics, deduplication and conversion evidence are pending. We omit unverified numerical traction. We have no formally documented interviews, confirmed pilots, maker commitments, revenue or retained-trader claims.

Our next research is five consented operator interviews and observed non-team onboarding/trading sessions, recording why they choose or reject RetroPick relative to Nad.fun and Kuru. We will publish activation, abandonment, independent fills and retention with denominators and test-traffic exclusions. Product: https://retropick.xyz/launchpad; source and historical proof: https://github.com/RetroPick/retropick-protocol.
```

## Clearly describe your roadmap for the product beyond the hackathon. * (required)

Field: `submission-bounties-2-responses-1a15d39c-8bee-4c1d-9100-9904187e144a` · 1361/8000 UTF-16 units.

```text
In the first 30 days, harden the existing testnet journey, interview five qualified operators and aim for three of five completing a launch. Establish measured baselines for graduation, independent order/fill delay, spreads and executable depth. Publish onboarding failures and reliability issues.

By 60 days, aim for two of three pilot launches graduating and receiving a first non-team fill, and recruit two independent maker evaluators. Test inventory and order-parameter constraints, indexer/RPC failure visibility and restart/retry reliability. These are proposed milestones, not guarantees.

By 90 days, seek repeat launches from two operators and measure D1/D7 trader retention. Evaluate an SDK/API or embedded launch interface only after willingness-to-use evidence. Mainnet expansion remains contingent on external security review, exact quote/venue qualification, issuer-specific legal/operational review and explicit human authorization.

Track activated creators / recruited creators, graduated / launched markets, independent-fill markets / graduated markets, D1/D7 returning / eligible activated traders, two-sided 1%/2% MON depth, spreads and maker repeat participation. All organic measurements exclude team functional tests. Additional asset classes and Prediction/PRISM remain research; we do not rush a new financial product into production.
```

## Clearly describe your strategy for onboarding and retaining traders * (required)

Field: `submission-bounties-2-responses-06e4fd8f-0de9-491a-af15-f018a49e1347` · 1539/8000 UTF-16 units.

```text
Acquisition starts with founder-led operator recruitment through existing RetroPick channels and consented introductions to Kuru traders. The proposed cohort is twenty deduplicated independent testers, split between pilot-community participants and people already familiar with Kuru limit orders. They are targets, not current retained users.

Begin with a read-only walkthrough at https://retropick.xyz/launchpad and public historical receipts, so a judge or prospective user does not need a funded wallet to understand the product. Before signing, explain Monad Testnet 10143, MON quote units, fees and curve impact, then limit price, partial/unfilled orders, book depth and stale/empty state. Normal economic actions are wallet -> chain.

The retention hypothesis is a predictable creator-to-secondary-market journey with understandable policy and visible order status. Locked initial LP custody is not a depth or return guarantee. Observe first Kuru order/fill delay, independent fills, execution spreads/depth and D1/D7 return; record abandonment reasons and consented feedback.

Prospective makers will evaluate inventory, quoting, settlement and risk needs. No market-maker agreement, guaranteed liquidity, undisclosed wash volume, new rebate or referral entitlement is invented. Channel conversion is activated users / qualified referred participants with a defined observation window, excluding team traffic. If counterparties or depth fail to appear, publish that result and repair the market-formation hypothesis before scaling.
```

## Clearly describe the new asset class or classes that your project brings to Kuru * (required)

Field: `submission-bounties-3-responses-dc18427f-dacc-4a21-be3e-a33282b26580` · 1130/8000 UTF-16 units.

```text
RetroPick currently brings standard creator/community ERC20 token markets through onchain bonding discovery into Kuru secondary trading on Monad Testnet. This is demonstrated market origination and execution, but we do not claim that standard ERC20 launches constitute a new asset class previously unavailable onchain.

Our current proof covers token issuance, primary curve trading, secured graduation, Kuru market/vault creation and historical two-wallet order, fill and cancellation. It does not establish a new RWA, cashflow, loyalty, compute-right or state-contingent derivative class with qualified issuance, redemption and settlement. Prediction/PRISM are separately gated research, and their research status is not promoted by the launchpad demonstration.

The new-assets bounty therefore remains a material sponsor-fit risk / NOT_QUALIFIED for its hard asset-class requirement, while the selection is retained. We present this limitation explicitly rather than relabel ordinary tokens as novel assets. Source and historical proof: https://github.com/RetroPick/retropick-protocol. Product: https://retropick.xyz/launchpad.
```

## Clearly describe your plan for bringing the asset onchain legally and operationally, including a strategy for liquidity and initial market formation * (required)

Field: `submission-bounties-3-responses-c042f80a-d363-424b-a699-c7b7eefd30e5` · 1322/8000 UTF-16 units.

```text
For the current standard-token testnet journey, creators disclose token identity, supply, MON quote, fees and fixed graduation destination before participants commit. The Coordinator secures graduation assets, the executor creates a Kuru market and vault, and protected custody keeps initial LP/excess assets separate from withdrawable trader funds. These are testnet mechanism controls, not legal approval or a liquidity guarantee.

An eligible additional asset class would require issuer-specific rights, transfer and eligibility constraints, truthful operational disclosures, legally reviewed distribution, funding/redemption/settlement semantics and an authorized release. No jurisdictional approval, fiat redemption, licensed issuance or legal opinion is claimed. We will not rush a financially unqualified derivative into deployment for a bounty.

Initial market formation is a proposed consented operator/trader pilot plus independent maker evaluation of inventory, order precision, spreads and depth. No maker commitment or organic volume is claimed. Measure non-team first fills, two-sided depth at 1%/2%, spreads and return activity, excluding historical team tests. Locked initial assets do not guarantee counterparties or tight markets. A qualifying new asset and its legal/operational path remain future work.
```

## Clearly describe your roadmap for the product beyond the hackathon. * (required)

Field: `submission-bounties-3-responses-867b07f6-612b-4b01-8b09-ca2784c7e70a` · 1022/8000 UTF-16 units.

```text
First, validate demand and market quality for the demonstrated standard-token product with the proposed 30/60/90-day operator, trader and maker pilot described in our main-track roadmap. Publish activation, graduation, independent fills, depth, spreads and retention with denominators and test-traffic exclusions.

Additional asset classes follow separate research, financial-invariant qualification, issuer-specific legal/operational review, audited implementation and explicit deployment authorization. We will select an asset only after its actual users, economic counterparties, enforceable rights and settlement model are established. Prediction/PRISM remain research; no novel derivative release date is promised.

The intended reusable product direction is a market-origination SDK/API after pilot willingness-to-use evidence. Mainnet and any new asset issuance remain contingent on external security review and human approval. This roadmap does not convert an unshipped asset class into current bounty eligibility.
```

## Describe how your project meaningfully utilizes Chainlink CRE as an orchestration layer * (required)

Field: `submission-bounties-4-responses-b28c4aba-4154-405d-a742-b4587a9b5db4` · 1441/8000 UTF-16 units.

```text
RetroPick's Graduation Safety workflow uses Chainlink CRE as a read-only orchestration layer combining Monad Testnet contract state with external source-verification data. The workflow checks graduation status, the expected Kuru market identity and custody agreement, then requests Sourcify v2 runtimeMatch for the deployed Factory. It returns a deterministic safety assessment with evidence rather than signing trades or becoming financial authority.

The official CRE CLI simulation has historical positive PASS evidence using real Monad RPC reads and a real Sourcify HTTP response. Negative cases cover a wrong expected market, a non-graduated token and external source-verification unavailability. Wrong-state/identity cases return FAIL; external failure returns INCOMPLETE_EXTERNAL instead of silently asserting safety. Source: integrations/chainlink-cre/graduation-safety/main.ts; evidence: evidence/hackathon/metropolis/sponsors/chainlink-cre/simulation.

This is an OFFICIAL CLI SIMULATION, not a live DON deployment, oracle price feed or automated withdrawal gate. It illustrates meaningful chain-plus-external-data orchestration for a creator/trader proof workflow. Source verification is bytecode/source correspondence, not an audit. The required sponsor video must show the successful official simulation and disclose this status. Product: https://retropick.xyz/launchpad; source: https://github.com/RetroPick/retropick-protocol.
```

## Submit a demo video (up to 2 mins) showing a successful simulation (via the CRE CLI) or a live deployment on the CRE network. * (required)

Field: `submission-bounties-4-responses-bbf88241-9cb9-45ba-b707-d433e79ae5f2` · 28/2000 UTF-16 units.

```text
https://youtu.be/IrDQP5Y98-A
```

## Describe how your project meaningfully integrates Nansen API endpoint, MCP tool, and/or the Nansen CLI * (required)

Field: `submission-bounties-5-responses-cf069905-3ffb-4c0c-a796-2eaf6a3070fe` · 1230/8000 UTF-16 units.

```text
Nansen AI is selected and remains under active qualification. We have not demonstrated a live Nansen API, MCP or CLI feature in the public RetroPick product, and the Envio Market Quality Radar must not be described as Nansen.

Current official Nansen documentation lists the monad chain and coverage for token-holder/flow and profiling endpoints. That is network-level documentation, not proof of coverage for our Monad Testnet 10143 tokens. No Nansen callable tool, Nansen CLI or usable entitlement was available in the inspected process and configured MCP paths; no paid or signing-based API request was executed.

A meaningful proposed feature is an explainable holder-concentration and flow review supporting a trader's decision, with exact endpoint, chain/token identity, as-of time, metric calculation, attribution and coverage/confidence. This remains proposed, not shipped. Qualification needs existing authorized API/MCP access, confirmation of exact asset/network coverage and redistribution rights, a real response, a public actionable feature and a matching demo. Unrelated mainnet data cannot be presented as live testnet-token intelligence. We do not claim Nansen usage or Smart Money adoption without that evidence.
```

## Submit an optional demo video (up to 2 mins) showing how Nansen API endpoint, MCP tool, and/or the Nansen CLI are meaningfully integrated in your app. (optional)

Field: `submission-bounties-5-responses-8557aa4e-2e70-4b09-a373-36a131346328` · 0/2000 UTF-16 units.

**Saved value: empty.**

## Describe how your project meaningfully integrates Mera as the entire account layer * (required)

Field: `submission-bounties-6-responses-81e6c2bf-3e1a-4357-afeb-6475e94dca39` · 1211/8000 UTF-16 units.

```text
RetroPick currently has Mera-backed passkey features, including a private strategy-data vault and a separate Protected Earn passkey-wallet path. We do not claim that these additions replace the entire account layer. The main economic trading journey still uses normal connected-wallet signing, and optional passkey functionality is not proof of Mera-only onboarding or prompt-free scoped trading.

The Mera-powered UX bounty's entire-account requirement remains NOT_DEMONSTRATED. Qualification would require genuine passkey onboarding, reconstructed account identity in a fresh browser/device, scoped signing behavior and a real authorized Monad transaction through that layer, with no signer bypass. Source presence and local tests alone do not establish those end-to-end properties.

The selected bounty is retained while these hard gates are pursued. The actual public non-account vault can be inspected at https://retropick.xyz/earn#vault; it grants no economic spending authority. No successful financial passkey ceremony, stateless reconstruction or whole-account migration is asserted. Source: apps/retro-ui/src/features/earn and packages/launchpad-sdk in https://github.com/RetroPick/retropick-protocol.
```

## Submit an optional demo video (up to 2 mins) showing how Mera is integrated into your app, focusing on UX elements (optional)

Field: `submission-bounties-6-responses-c8340b9a-550d-447f-b521-fbdbc59950e0` · 0/2000 UTF-16 units.

**Saved value: empty.**

## Describe how your project meaningfully utilizes Mera in non-account work. * (required)

Field: `submission-bounties-7-responses-474c9ce6-bb26-42b3-aae0-62318448a28c` · 1580/8000 UTF-16 units.

```text
RetroPick's Private Strategy Vault uses @category-labs/mera for non-account protection of trading theses, watchlists, draft markets, risk budgets and agent configuration. The actual public interface is https://retropick.xyz/earn#vault. Read-only apex inspection confirmed the Vault tab, creation/import controls and disclosure that unlocking never grants spending authority.

The pinned installed Mera SDK 0.2.0 derives a non-extractable AES-256-GCM key through HKDF-SHA-256 with the non-account info namespace mera.v1.encrypt.secret. Secret-vault creation and subsequent saves evaluate fresh random 32-byte PRF salts; encrypted vault JSON persists and can be exported/imported. The browser storage key retropick.strategy-vault.v1 and relying-party domain retropick.xyz are separate concepts, not substitutes for this SDK namespace evidence.

The app validates a versioned bounded plaintext schema, maps PRF/decryption failures, re-encrypts on save and clears visible plaintext and retained buffers on lock on a best-effort basis. These are data-at-rest controls, not wallet authorization.

A genuine compatible authenticator ceremony and reconstruction of the same exported ciphertext using the same passkey in a fresh profile/second device remain unverified. A reload, virtual authenticator or injected PRF result would not satisfy this gate. The bounty remains CONDITIONAL / HARDWARE_EVIDENCE_PENDING while selected. Source: apps/retro-ui/src/features/earn/strategy-vault.tsx and apps/retro-ui/src/lib/vault/strategy-vault.ts in https://github.com/RetroPick/retropick-protocol.
```

## Submit an optional demo video (up to 2 mins) showing how Mera is used where at least one PRF namespace does non-account work (optional)

Field: `submission-bounties-7-responses-e0a41230-b211-49fd-94b9-20041358e689` · 0/2000 UTF-16 units.

**Saved value: empty.**

## Describe the trader-focused capabilities of your Metamask Agent wallet plugin * (required)

Field: `submission-bounties-8-responses-c1503179-6fd7-40fd-8258-787fdff8fd81` · 1909/8000 UTF-16 units.

```text
RetroPick ships a working installable read-only MetaMask Agent Wallet plugin for Monad Testnet market intelligence. The public Git distribution exposes three mm commands: retropick markets, retropick market inspect, and retropick market risk. Actual public Git installation on Agent Wallet 6.2.1 passed, and all three commands returned successful real Monad chain reads. The public-read commands use the officially supported requiresAuth:false and requiresInit:false settings; they provision no wallet, handle no signing key and request no wallet capabilities. They do not relax signing or MFA controls for economic writes.

Discovery resolves the committed token lifecycle and Kuru destination; inspection exposes exact quoted bid/ask units and a read head; risk reports spread with explicit uncertainty. Kuru bestBidAsk may include indicative vault/AMM quotes and does not establish standing order depth. Trade history was not queried and staleness is unknown. An object-versus-tuple parser defect was fixed against the deployed Coordinator ABI before recording; failed intermediate outputs are excluded from successful proof.

The 1:30 demo shows the actual retropick.xyz interface and literal recorded outputs from the Git-installed CLI commands, clearly labelled recorded public reads. No wallet provisioning, transaction signing, broadcasting, order or cancellation occurs. This distribution does not expose order placement or cancellation; those financial write implementations remain incomplete. We do not claim successful Agent Wallet trading, wallet-submit execution, or an MFA signing flow. Sponsor eligibility remains conditional and is for the sponsor to assess.

Demo: https://youtu.be/ei_4HMb_RBc . Public skill/source: https://github.com/RetroPick/retropick-protocol/blob/metropolis-metamask-readonly-20261014/skills/retropick-agent-wallet/SKILL.md . Product: https://retropick.xyz/launchpad .
```

## Provide a link to your skills/<name>/SKILL.md file that provides instructions for an agent to use the plugin. * (required)

Field: `submission-bounties-8-responses-de69c89e-9d2a-4ef2-a973-9614b7aaaa8f` · 129/2000 UTF-16 units.

```text
https://github.com/RetroPick/retropick-protocol/blob/metropolis-metamask-readonly-20261014/skills/retropick-agent-wallet/SKILL.md
```

## Submit a demo video (up to 5 mins) showing real flows in your plugin. * (required)

Field: `submission-bounties-8-responses-3c76cec0-44e8-4f61-9e45-fb59fa39bae9` · 28/8000 UTF-16 units.

```text
https://youtu.be/ei_4HMb_RBc
```

## Advertisement URL — Shotcraft

Field: `submission-advertisementUrl` · 28/2000 UTF-16 units.

```text
https://youtu.be/DXUkWP1rM_s
```

## X profile

Field: `submission-xProfileUrl` · 29/2000 UTF-16 units.

```text
https://x.com/RetroPickMarket
```
