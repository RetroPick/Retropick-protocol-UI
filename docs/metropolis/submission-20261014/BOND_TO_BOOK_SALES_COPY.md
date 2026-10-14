# Canonical paste-ready main submission copy

Captured portal source: evidence/hackathon/metropolis/submission-20261014/portal-before.json, 2026-10-13T19:30:09Z. This file owns narrative copy; root owns PORTAL_FIELDS.md, portal-fields.json, saved values and final status. Limits: one-line 200; description/GTM 8,000 each. Product links use only retropick.xyz. The founder pitch URL is human-owned and must not be fabricated.

## One-line description

RetroPick turns token launches into Kuru markets on Monad: bonding-curve price discovery, protected graduation assets, and limit-order trading.

## Description

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

## Go-to-market and user acquisition

Our first segment is Monad community operators who have run a community campaign, can invite a small group of consenting testnet participants, and lack a trading engineering team. The first trader segment is those communities' early participants plus Kuru users already comfortable with limit orders. Independent makers are prospective evaluators, not signed partners.

The current alternatives are Nad.fun's curve-to-DEX lifecycle, direct Kuru token/market deployment with supplied seed liquidity, and custom issuance plus exchange integration. Our testable reason to choose RetroPick is transparent primary discovery and a controlled, visible handoff into Kuru trading. No documented interviews currently prove willingness to switch.

The founder will recruit through existing RetroPick X, Telegram and Discord access, then seek consented introductions to Monad community operators and Kuru traders. We propose five operators, twenty deduplicated non-team traders and two prospective maker evaluators. These are targets, not recruited users or partnership claims. Each invitation will state testnet status and risks. We will not buy apparent traction, manufacture volume, promise returns or require trades merely to inspect the product.

The funnel is: invited qualified operator -> onboarding -> reviewed launch terms -> successful launch -> independent curve participation -> graduation -> first non-team Kuru order/fill -> D1/D7 return. Onboarding begins with a read-only product and proof walkthrough. Participants learn MON units, fees, curve impact, limit price, partial/unfilled orders, stale/empty books and protected-custody limits before using a wallet. We will record abandonment reasons and conduct consented follow-up interviews.

The measured adoption baseline is unknown. Historical two-wallet functional tests establish technical behavior only. Previous founder reports of waitlist and X attention remain unverified; we omit numerical traction from this answer. There are no verified interviews, committed pilots, market-maker agreements, organic volume, retained-user or revenue claims.

Proposed 30-day pilot: interview five qualified operators and aim for three of five completing a testnet launch; publish onboarding failures and initial market-quality observations. Proposed 60-day pilot: aim for two of three launched markets graduating and receiving a non-team fill, and recruit two maker evaluators. Proposed 90-day pilot: seek a repeat launch from two operators and measure D1/D7 trader return. The founder owns recruitment and review; technical maintainers own measurement and reliability. Targets are hypotheses, not guaranteed outcomes.

Report every KPI with a time window and denominator: activated creators / recruited qualified creators; graduated / launched pilot markets; independent-fill markets / graduated markets; returning traders / eligible activated traders. Separate team/test traffic from independent activity and historical filled volume from current orderbook depth. Measure two-sided MON depth within 1% and 2% of a valid mid, bid-ask spreads, book availability, first-order/fill delay and maker repeat participation.

Retention will depend on usable markets: reliable onboarding, visible orders, truthful freshness, predictable policy and access to counterparties. Maker outreach will cover inventory, risk and parameter constraints, without inventing fee rebates or committed liquidity. Distribution and referral experiments must use consented, attributable cohorts; each channel's activated creators / qualified referrals will be reported separately.

Only after pilot evidence should we expand creator onboarding and evaluate an SDK/API or embedded launch interface. Mainnet remains contingent on external security review, quote/venue qualification, issuer-specific legal and operational review and human release authorization. Our concrete ask is introductions to creator communities, independent Kuru makers and security reviewers.

## Twenty-second positioning

Monad community operators can attract buyers but still need reliable price discovery and secondary trading. RetroPick carries a token from bonding discovery into a Kuru orderbook with committed policy and protected initial graduation assets. Testnet receipts demonstrate launch, graduation, order, fill and cancellation.

## Forty-five-second positioning

RetroPick serves Monad community operators with an audience but no trading engineering team. Bond-to-Book takes their token through transparent bonding discovery and a controlled graduation into Kuru limit-order trading. The Coordinator secures assets before venue work; graduation is atomic and retryable; initial LP shares and excess tokens enter protected custody. Historical testnet receipts prove the journey, including order, fill and cancellation. Graduation and orderbooks have prior art. Our focus is reliability and continuity, while independent demand, retention and depth still need validation.

## Two-minute positioning

Use PITCH_FOUNDER_2MIN.md without creating an agent-generated founder recording.
