# Portal fields and current owner-confirmed state

Current saved selection: Kuru Consumer and Chainlink CRE only. Root confirmed Envio and Mera removals saved at 2026-10-13 19:58 UTC under the existing conditional authorization. Aurora and Kuru New Assets were removed and saved at 19:36 UTC. Envio correction is tested locally but not deployed; the allowed remote deployment route was unavailable. Genuine Mera cross-device/namespace proof remains unverified. Removed-bounty responses are archived evidence, not current required fields.

Root confirmed main copy, four Kuru answers, CRE narrative and judge-access save at19:46 UTC. Exact prepared values are captured in evidence/hackathon/metropolis/submission-20261014/prepared-portal-values.json. Independent authenticated reload artifacts remain root-owned. Required labels outrank native required=false. No placeholder video URL is supplied. Founder pitch is FOUNDER_OWNED / PENDING_EXTERNAL_INPUT.

Current field count: 17; required by visible label: 14. Three required media inputs remain owner/external inputs until actual URLs are verified.

## name

Exact prompt: Project name *
(required)

Required: True; limit: 120; UTF-16 characters: 9; state: READY_COPY_NOT_SAVED.

Current DOM ID: submission-name

RetroPick

## oneLiner

Exact prompt: One-line description *
(required)

Required: True; limit: 200; UTF-16 characters: 143; state: ROOT_REPORTED_SAVED_EXACT_PREPARED_COPY.

Current DOM ID: submission-oneLiner

RetroPick turns token launches into Kuru markets on Monad: bonding-curve price discovery, protected graduation assets, and limit-order trading.

## description

Exact prompt: Description *
(required)

Required: True; limit: 8000; UTF-16 characters: 4424; state: ROOT_REPORTED_SAVED_EXACT_PREPARED_COPY.

Current DOM ID: submission-description

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

## goToMarket

Exact prompt: Please describe the go-to-market and user acquisition strategy for your product. *
(required)

Required: True; limit: 8000; UTF-16 characters: 3985; state: ROOT_REPORTED_SAVED_EXACT_PREPARED_COPY.

Current DOM ID: submission-goToMarket

Our first segment is Monad community operators who have run a community campaign, can invite a small group of consenting testnet participants, and lack a trading engineering team. The first trader segment is those communities' early participants plus Kuru users already comfortable with limit orders. Independent makers are prospective evaluators, not signed partners.

The current alternatives are Nad.fun's curve-to-DEX lifecycle, direct Kuru token/market deployment with supplied seed liquidity, and custom issuance plus exchange integration. Our testable reason to choose RetroPick is transparent primary discovery and a controlled, visible handoff into Kuru trading. No documented interviews currently prove willingness to switch.

The founder will recruit through existing RetroPick X, Telegram and Discord access, then seek consented introductions to Monad community operators and Kuru traders. We propose five operators, twenty deduplicated non-team traders and two prospective maker evaluators. These are targets, not recruited users or partnership claims. Each invitation will state testnet status and risks. We will not buy apparent traction, manufacture volume, promise returns or require trades merely to inspect the product.

The funnel is: invited qualified operator -> onboarding -> reviewed launch terms -> successful launch -> independent curve participation -> graduation -> first non-team Kuru order/fill -> D1/D7 return. Onboarding begins with a read-only product and proof walkthrough. Participants learn MON units, fees, curve impact, limit price, partial/unfilled orders, stale/empty books and protected-custody limits before using a wallet. We will record abandonment reasons and conduct consented follow-up interviews.

The measured adoption baseline is unknown. Historical two-wallet functional tests establish technical behavior only. Previous founder reports of waitlist and X attention remain unverified; we omit numerical traction from this answer. There are no verified interviews, committed pilots, market-maker agreements, organic volume, retained-user or revenue claims.

Proposed 30-day pilot: interview five qualified operators and aim for three of five completing a testnet launch; publish onboarding failures and initial market-quality observations. Proposed 60-day pilot: aim for two of three launched markets graduating and receiving a non-team fill, and recruit two maker evaluators. Proposed 90-day pilot: seek a repeat launch from two operators and measure D1/D7 trader return. The founder owns recruitment and review; technical maintainers own measurement and reliability. Targets are hypotheses, not guaranteed outcomes.

Report every KPI with a time window and denominator: activated creators / recruited qualified creators; graduated / launched pilot markets; independent-fill markets / graduated markets; returning traders / eligible activated traders. Separate team/test traffic from independent activity and historical filled volume from current orderbook depth. Measure two-sided MON depth within 1% and 2% of a valid mid, bid-ask spreads, book availability, first-order/fill delay and maker repeat participation.

Retention will depend on usable markets: reliable onboarding, visible orders, truthful freshness, predictable policy and access to counterparties. Maker outreach will cover inventory, risk and parameter constraints, without inventing fee rebates or committed liquidity. Distribution and referral experiments must use consented, attributable cohorts; each channel's activated creators / qualified referrals will be reported separately.

Only after pilot evidence should we expand creator onboarding and evaluate an SDK/API or embedded launch interface. Mainnet remains contingent on external security review, quote/venue qualification, issuer-specific legal and operational review and human release authorization. Our concrete ask is introductions to creator communities, independent Kuru makers and security reviewers.

## repositoryUrl

Exact prompt: GitHub repository *
(required)

Required: True; limit: 2000; UTF-16 characters: 47; state: READY_COPY_NOT_SAVED.

Current DOM ID: submission-repositoryUrl

https://github.com/RetroPick/retropick-protocol

## demoUrl

Exact prompt: Live product *
(required)

Required: True; limit: 2000; UTF-16 characters: 31; state: READY_COPY_NOT_SAVED.

Current DOM ID: submission-demoUrl

https://retropick.xyz/launchpad

## demoVideoUrl

Exact prompt: Technical demo video *
(required)

Required: True; limit: 2000; UTF-16 characters: 0; state: PENDING_VERIFIED_PUBLIC_URL.

Current DOM ID: submission-demoVideoUrl

EMPTY — actual verified public URL pending.

## pitchVideoUrl

Exact prompt: Pitch video *
(required)

Required: True; limit: 2000; UTF-16 characters: 0; state: FOUNDER_OWNED_PENDING_EXTERNAL_INPUT.

Current DOM ID: submission-pitchVideoUrl

FOUNDER_OWNED / PENDING_EXTERNAL_INPUT

## accessInstructions

Exact prompt: Judge access instructions (optional)

Required: False; limit: 8000; UTF-16 characters: 549; state: ROOT_REPORTED_SAVED_EXACT_PREPARED_COPY.

Current DOM ID: submission-accessInstructions

Open https://retropick.xyz/launchpad on Monad Testnet (chain 10143). Read-only inspection needs no wallet. Inspect an active curve and the graduated RPV2M token at /launchpad/token/0x43e7e9b1b7d9a143573307b13d14b51580c18f15. Historical team test receipts demonstrate launch, buy, graduation, order, fill and cancellation; they are not organic volume or current book depth. Do not sign a transaction merely to review. Source and proof: https://github.com/RetroPick/retropick-protocol. CRE evidence is an official CLI simulation, not a DON deployment.

## kuru_consumer_segments

Exact prompt: Clearly describe your target user segments * (required)

Required: True; limit: 8000; UTF-16 characters: 1326; state: ROOT_REPORTED_SAVED_EXACT_PREPARED_COPY.

Current DOM ID: dynamic; match exact response UUID 74c5b068-7e21-4891-9e74-e0b85a4ab7e0

RetroPick's first customer hypothesis is a Monad community operator with an existing audience but no trading engineering team. They need explicit issuance terms, early price discovery, a reliable graduation destination and a coherent secondary trading interface. Their actual economic counterparties would be community participants buying or selling on the curve and Kuru traders seeking explicit limit-price control after graduation.

We propose an initial testnet cohort of five operators who have run a community campaign, twenty deduplicated non-team traders and two prospective maker evaluators. These counts are recruitment targets, not current users or agreements. Traders are prioritized as ten participants from pilot communities and ten users familiar with Kuru limit orders. Makers must evaluate stable market identity, tick/size constraints, inventory and external-venue risk. No committed maker is claimed.

The app carries token launch -> bonding discovery -> secured graduation -> Kuru market/vault -> order/fill/cancel. Existing alternatives are Nad.fun's launch lifecycle, Kuru's direct token-and-market deployer and custom infrastructure. The pilot must establish whether controlled lifecycle continuity is enough to justify switching. Product: https://retropick.xyz/launchpad. Network: Monad Testnet, 10143.

## kuru_consumer_demand

Exact prompt: Clearly describe case studies and/or research that shows evidence of demand. * (required)

Required: True; limit: 8000; UTF-16 characters: 1671; state: ROOT_REPORTED_SAVED_EXACT_PREPARED_COPY.

Current DOM ID: dynamic; match exact response UUID 2025b46e-ba50-47f9-8d6f-491912a85296

Our evidence is technical feasibility plus a customer hypothesis, not verified commercial demand. Historical functional-test receipts demonstrate token launch, curve trading, Kuru graduation and two-wallet order/fill/cancel. Those transactions are test traffic and do not establish organic volume or retention.

Primary-source research confirms existing market workflows: Nad.fun serves Monad creators/communities with curve-to-DEX graduation (https://nad.fun/skill.md); Kuru already supplies token/market/liquidity deployment and warns that inappropriate market precision can prevent limit orders (https://docs.kuru.io/sdk/deploy-market). Kuru's maker guide describes orderbook feeds, inventory-aware quoting, atomic order refresh and fill/cancellation monitoring (https://docs.kuru.io/sdk/py-sdk-market-making). These sources establish available alternatives and operational requirements, not demand for RetroPick.

The founder has reported early audience interest and access to relevant X/Telegram/Discord communities, but dated analytics, deduplication and conversion evidence are pending. We omit unverified numerical traction. We have no formally documented interviews, confirmed pilots, maker commitments, revenue or retained-trader claims.

Our next research is five consented operator interviews and observed non-team onboarding/trading sessions, recording why they choose or reject RetroPick relative to Nad.fun and Kuru. We will publish activation, abandonment, independent fills and retention with denominators and test-traffic exclusions. Product: https://retropick.xyz/launchpad; source and historical proof: https://github.com/RetroPick/retropick-protocol.

## kuru_consumer_roadmap

Exact prompt: Clearly describe your roadmap for the product beyond the hackathon. * (required)

Required: True; limit: 8000; UTF-16 characters: 1361; state: ROOT_REPORTED_SAVED_EXACT_PREPARED_COPY.

Current DOM ID: dynamic; match exact response UUID 1a15d39c-8bee-4c1d-9100-9904187e144a

In the first 30 days, harden the existing testnet journey, interview five qualified operators and aim for three of five completing a launch. Establish measured baselines for graduation, independent order/fill delay, spreads and executable depth. Publish onboarding failures and reliability issues.

By 60 days, aim for two of three pilot launches graduating and receiving a first non-team fill, and recruit two independent maker evaluators. Test inventory and order-parameter constraints, indexer/RPC failure visibility and restart/retry reliability. These are proposed milestones, not guarantees.

By 90 days, seek repeat launches from two operators and measure D1/D7 trader retention. Evaluate an SDK/API or embedded launch interface only after willingness-to-use evidence. Mainnet expansion remains contingent on external security review, exact quote/venue qualification, issuer-specific legal/operational review and explicit human authorization.

Track activated creators / recruited creators, graduated / launched markets, independent-fill markets / graduated markets, D1/D7 returning / eligible activated traders, two-sided 1%/2% MON depth, spreads and maker repeat participation. All organic measurements exclude team functional tests. Additional asset classes and Prediction/PRISM remain research; we do not rush a new financial product into production.

## kuru_consumer_retention

Exact prompt: Clearly describe your strategy for onboarding and retaining traders * (required)

Required: True; limit: 8000; UTF-16 characters: 1539; state: ROOT_REPORTED_SAVED_EXACT_PREPARED_COPY.

Current DOM ID: dynamic; match exact response UUID 06e4fd8f-0de9-491a-af15-f018a49e1347

Acquisition starts with founder-led operator recruitment through existing RetroPick channels and consented introductions to Kuru traders. The proposed cohort is twenty deduplicated independent testers, split between pilot-community participants and people already familiar with Kuru limit orders. They are targets, not current retained users.

Begin with a read-only walkthrough at https://retropick.xyz/launchpad and public historical receipts, so a judge or prospective user does not need a funded wallet to understand the product. Before signing, explain Monad Testnet 10143, MON quote units, fees and curve impact, then limit price, partial/unfilled orders, book depth and stale/empty state. Normal economic actions are wallet -> chain.

The retention hypothesis is a predictable creator-to-secondary-market journey with understandable policy and visible order status. Locked initial LP custody is not a depth or return guarantee. Observe first Kuru order/fill delay, independent fills, execution spreads/depth and D1/D7 return; record abandonment reasons and consented feedback.

Prospective makers will evaluate inventory, quoting, settlement and risk needs. No market-maker agreement, guaranteed liquidity, undisclosed wash volume, new rebate or referral entitlement is invented. Channel conversion is activated users / qualified referred participants with a defined observation window, excluding team traffic. If counterparties or depth fail to appear, publish that result and repair the market-formation hypothesis before scaling.

## cre_orchestration

Exact prompt: Describe how your project meaningfully utilizes Chainlink CRE as an orchestration layer * (required)

Required: True; limit: 8000; UTF-16 characters: 1441; state: ROOT_REPORTED_SAVED_EXACT_PREPARED_COPY.

Current DOM ID: dynamic; match exact response UUID b28c4aba-4154-405d-a742-b4587a9b5db4

RetroPick's Graduation Safety workflow uses Chainlink CRE as a read-only orchestration layer combining Monad Testnet contract state with external source-verification data. The workflow checks graduation status, the expected Kuru market identity and custody agreement, then requests Sourcify v2 runtimeMatch for the deployed Factory. It returns a deterministic safety assessment with evidence rather than signing trades or becoming financial authority.

The official CRE CLI simulation has historical positive PASS evidence using real Monad RPC reads and a real Sourcify HTTP response. Negative cases cover a wrong expected market, a non-graduated token and external source-verification unavailability. Wrong-state/identity cases return FAIL; external failure returns INCOMPLETE_EXTERNAL instead of silently asserting safety. Source: integrations/chainlink-cre/graduation-safety/main.ts; evidence: evidence/hackathon/metropolis/sponsors/chainlink-cre/simulation.

This is an OFFICIAL CLI SIMULATION, not a live DON deployment, oracle price feed or automated withdrawal gate. It illustrates meaningful chain-plus-external-data orchestration for a creator/trader proof workflow. Source verification is bytecode/source correspondence, not an audit. The required sponsor video must show the successful official simulation and disclose this status. Product: https://retropick.xyz/launchpad; source: https://github.com/RetroPick/retropick-protocol.

## bounties-4-responses-bbf88241-9cb9-45ba-b707-d433e79ae5f2

Exact prompt: Submit a demo video (up to 2 mins) showing a successful simulation (via the CRE CLI) or a live deployment on the CRE network. * (required)

Required: True; limit: 2000; UTF-16 characters: 0; state: PENDING_VERIFIED_PUBLIC_URL.

Current DOM ID: dynamic; match exact response UUID bbf88241-9cb9-45ba-b707-d433e79ae5f2

EMPTY — actual verified public URL pending.

## advertisementUrl

Exact prompt: Product advertisement (optional)

Required: False; limit: 2000; UTF-16 characters: 0; state: OPTIONAL_EMPTY_ALLOWED.

Current DOM ID: submission-advertisementUrl

EMPTY — optional.

## xProfileUrl

Exact prompt: X profile link for your project (optional)

Required: False; limit: 2000; UTF-16 characters: 29; state: READY_COPY_NOT_SAVED.

Current DOM ID: submission-xProfileUrl

https://x.com/RetroPickMarket

Separate completed product-demo URL must be appended to judge access when verified. The technical video has its own required field; CRE has its own required <=2m simulation clip. No separate product-demo URL is invented. Final submission requires explicit approval and observed success.
