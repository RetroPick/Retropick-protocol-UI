# Paste-ready sponsor answers

All nine restored bounties remain selected under the latest explicit no-removal instruction: Aurora, Envio, Kuru Consumer, Kuru New Assets, CRE, Nansen, Mera UX, Mera non-account and MetaMask. Selection is distinct from qualification. ALL_SELECTED_BOUNTY_ANSWERS.md contains the full current nine-selection prompt map. Earlier removals are historical and superseded.

Envio v4 backend and frontend release3728ce5 are promoted; apex desktop/mobile/API verification passed. Its115-second silent film is published at https://youtu.be/2yn3fzz-AeE, with local full-decode/seven-image QA PASS; anonymous desktop/mobile playback QA passed at115.021 seconds. Root save/reload verification confirms all16 prepared nonempty bounty fields, Envio/CRE URLs, technical URL, Shotcraft advertisement URL and product judge-access link. Genuine Mera ceremony/recovery and other selected sponsor gates remain unresolved.

Response limits remain8000 characters and video URL limits2000. Match the current DOM’s exact UUID/label instead of assuming old indices survive selection changes.

## Kuru Consumer — target user segments

RetroPick's first customer hypothesis is a Monad community operator with an existing audience but no trading engineering team. They need explicit issuance terms, early price discovery, a reliable graduation destination and a coherent secondary trading interface. Their actual economic counterparties would be community participants buying or selling on the curve and Kuru traders seeking explicit limit-price control after graduation.

We propose an initial testnet cohort of five operators who have run a community campaign, twenty deduplicated non-team traders and two prospective maker evaluators. These counts are recruitment targets, not current users or agreements. Traders are prioritized as ten participants from pilot communities and ten users familiar with Kuru limit orders. Makers must evaluate stable market identity, tick/size constraints, inventory and external-venue risk. No committed maker is claimed.

The app carries token launch -> bonding discovery -> secured graduation -> Kuru market/vault -> order/fill/cancel. Existing alternatives are Nad.fun's launch lifecycle, Kuru's direct token-and-market deployer and custom infrastructure. The pilot must establish whether controlled lifecycle continuity is enough to justify switching. Product: https://retropick.xyz/launchpad. Network: Monad Testnet, 10143.

## Kuru Consumer — case studies and research showing demand

Our evidence is technical feasibility plus a customer hypothesis, not verified commercial demand. Historical functional-test receipts demonstrate token launch, curve trading, Kuru graduation and two-wallet order/fill/cancel. Those transactions are test traffic and do not establish organic volume or retention.

Primary-source research confirms existing market workflows: Nad.fun serves Monad creators/communities with curve-to-DEX graduation (https://nad.fun/skill.md); Kuru already supplies token/market/liquidity deployment and warns that inappropriate market precision can prevent limit orders (https://docs.kuru.io/sdk/deploy-market). Kuru's maker guide describes orderbook feeds, inventory-aware quoting, atomic order refresh and fill/cancellation monitoring (https://docs.kuru.io/sdk/py-sdk-market-making). These sources establish available alternatives and operational requirements, not demand for RetroPick.

The founder has reported early audience interest and access to relevant X/Telegram/Discord communities, but dated analytics, deduplication and conversion evidence are pending. We omit unverified numerical traction. We have no formally documented interviews, confirmed pilots, maker commitments, revenue or retained-trader claims.

Our next research is five consented operator interviews and observed non-team onboarding/trading sessions, recording why they choose or reject RetroPick relative to Nad.fun and Kuru. We will publish activation, abandonment, independent fills and retention with denominators and test-traffic exclusions. Product: https://retropick.xyz/launchpad; source and historical proof: https://github.com/RetroPick/retropick-protocol.

## Kuru Consumer — roadmap beyond the hackathon

In the first 30 days, harden the existing testnet journey, interview five qualified operators and aim for three of five completing a launch. Establish measured baselines for graduation, independent order/fill delay, spreads and executable depth. Publish onboarding failures and reliability issues.

By 60 days, aim for two of three pilot launches graduating and receiving a first non-team fill, and recruit two independent maker evaluators. Test inventory and order-parameter constraints, indexer/RPC failure visibility and restart/retry reliability. These are proposed milestones, not guarantees.

By 90 days, seek repeat launches from two operators and measure D1/D7 trader retention. Evaluate an SDK/API or embedded launch interface only after willingness-to-use evidence. Mainnet expansion remains contingent on external security review, exact quote/venue qualification, issuer-specific legal/operational review and explicit human authorization.

Track activated creators / recruited creators, graduated / launched markets, independent-fill markets / graduated markets, D1/D7 returning / eligible activated traders, two-sided 1%/2% MON depth, spreads and maker repeat participation. All organic measurements exclude team functional tests. Additional asset classes and Prediction/PRISM remain research; we do not rush a new financial product into production.

## Kuru Consumer — onboarding and retaining traders

Acquisition starts with founder-led operator recruitment through existing RetroPick channels and consented introductions to Kuru traders. The proposed cohort is twenty deduplicated independent testers, split between pilot-community participants and people already familiar with Kuru limit orders. They are targets, not current retained users.

Begin with a read-only walkthrough at https://retropick.xyz/launchpad and public historical receipts, so a judge or prospective user does not need a funded wallet to understand the product. Before signing, explain Monad Testnet 10143, MON quote units, fees and curve impact, then limit price, partial/unfilled orders, book depth and stale/empty state. Normal economic actions are wallet -> chain.

The retention hypothesis is a predictable creator-to-secondary-market journey with understandable policy and visible order status. Locked initial LP custody is not a depth or return guarantee. Observe first Kuru order/fill delay, independent fills, execution spreads/depth and D1/D7 return; record abandonment reasons and consented feedback.

Prospective makers will evaluate inventory, quoting, settlement and risk needs. No market-maker agreement, guaranteed liquidity, undisclosed wash volume, new rebate or referral entitlement is invented. Channel conversion is activated users / qualified referred participants with a defined observation window, excluding team traffic. If counterparties or depth fail to appear, publish that result and repair the market-formation hypothesis before scaling.

## Envio — meaningful use of HyperIndex, HyperSync or HyperRPC

RetroPick uses Envio HyperSync, specifically @envio-dev/hypersync-client, to drive a Market Quality Radar from Monad Testnet 10143 logs. We do not describe this pipeline as HyperIndex or HyperRPC. Logs from the launch lifecycle and tracked Kuru markets are decoded into a durable event journal; exact aggregates feed read-only /api/radar endpoints and the token terminal's Radar panel.

The feature helps an operator/trader inspect graduation latency, time to the first Kuru trade, historical fills and quote volume, order creation/cancellation and proof transaction links. Historical filled volume is labelled separately from current executable depth. The panel exposes ready, empty, stale and unavailable states; indexed data is never economic authority.

The journal preserves replayable decoded events and the snapshot is a cache. Restart recovery and reorg rollback rebuild aggregates from canonical events, rather than keeping orphaned trades. Historical live evidence reconciles a first-trade hash with its successful chain receipt and validates restart durability. Source: integrations/envio-market-radar; consumer: apps/retro-ui/src/features/launchpad/terminal/market-radar.tsx; repository: https://github.com/RetroPick/retropick-protocol.

The corrected version-four backend is deployed on Contabo and its final validation passed with two documented recovered upstream retries. Frontend release3728ce5 is promoted at retropick.xyz; fresh same-origin API, canonical-anchor/receipt-unit checks and desktop/mobile Radar views passed. Historical amounts remain separate from executable orderbook depth. Supporting proof: evidence/hackathon/metropolis/submission-20261014/radar-correction/contabo-upgrade-final-validation.json and radar-correction/apex-v4/verification.json. Product: https://retropick.xyz/launchpad.

## Envio — optional video

Prepared URL: https://youtu.be/2yn3fzz-AeE. Completed115-second silent FFmpeg edit of native Ultrademo captures; local decode/seven-image review PASS. Studio publication/oEmbed200 confirmed; anonymous desktop/mobile playback QA passed115.021s. Portal save/reload verification passed.

## Chainlink CRE — meaningful orchestration

RetroPick's Graduation Safety workflow uses Chainlink CRE as a read-only orchestration layer combining Monad Testnet contract state with external source-verification data. The workflow checks graduation status, the expected Kuru market identity and custody agreement, then requests Sourcify v2 runtimeMatch for the deployed Factory. It returns a deterministic safety assessment with evidence rather than signing trades or becoming financial authority.

The official CRE CLI simulation has historical positive PASS evidence using real Monad RPC reads and a real Sourcify HTTP response. Negative cases cover a wrong expected market, a non-graduated token and external source-verification unavailability. Wrong-state/identity cases return FAIL; external failure returns INCOMPLETE_EXTERNAL instead of silently asserting safety. Source: integrations/chainlink-cre/graduation-safety/main.ts; evidence: evidence/hackathon/metropolis/sponsors/chainlink-cre/simulation.

This is an OFFICIAL CLI SIMULATION, not a live DON deployment, oracle price feed or automated withdrawal gate. It illustrates meaningful chain-plus-external-data orchestration for a creator/trader proof workflow. Source verification is bytecode/source correspondence, not an audit. The required sponsor video must show the successful official simulation and disclose this status. Product: https://retropick.xyz/launchpad; source: https://github.com/RetroPick/retropick-protocol.

## Chainlink CRE — required video

https://youtu.be/IrDQP5Y98-A —90-second silent official CLI simulation; anonymous desktop/mobile playback passed and required sponsor URL was saved previously. Preserve the simulation disclosure.

## Mera non-account — meaningful non-account work

RetroPick's Private Strategy Vault uses @category-labs/mera secret-vault APIs for non-account data protection: strategy theses, draft markets, watchlists, risk budgets and agent configuration. This is separate from wallet signing and grants no spending authority.

A passkey WebAuthn PRF is used through the SDK's key derivation and authenticated encryption. The app persists an encrypted vault, supports encrypted export/import and reconstructs plaintext locally after a passkey assertion. Saving re-encrypts through a fresh assertion; lock clears the displayed plaintext and wipes the retained byte buffer on a best-effort basis. The relying-party identity is the current product host. The localStorage key is an application storage key, not proof of a separate PRF namespace.

Source: apps/retro-ui/src/features/earn/strategy-vault.tsx and apps/retro-ui/src/lib/vault/strategy-vault.ts; source repository: https://github.com/RetroPick/retropick-protocol. Product: https://retropick.xyz/earn.

Qualification remains conditional: real compatible passkey/PRF operation, the SDK's non-account derivation namespace and fresh-browser/device reconstruction with the encrypted vault must be evidenced. A same-browser reload or injected test is insufficient. No PRF secret or authenticator material may be recorded. The latest instruction retains this selection; missing genuine ceremony/recovery evidence remains an unresolved qualification gate and must be disclosed, never replaced with fabricated success.

## Mera non-account — optional video

Only provide a <=2-minute video after genuine passkey and fresh-browser/device reconstruction proof. VIDEO_BLOCKED_HARDWARE_OR_UNVERIFIED until proof is captured. Optional URL can remain empty; lack of a qualifying ceremony still blocks the integration claim.

## All-nine selection authority

All selected bounties remain retained. See ALL_SELECTED_BOUNTY_ANSWERS.md for Aurora, New Assets, Nansen, Mera UX and MetaMask fields and unresolved requirements. Do not treat their continued selection as qualification. No final submission is authorized.

Final saved-field evidence: evidence/hackathon/metropolis/submission-20261014/portal-final-required-media-saved.json, verified 2026-10-14T02:21:17.267518+00:00. All nine selected bounty headings report Complete for field presence; MetaMask description, public skill and read-only demonstration URL are saved and reload-verified. All non-founder required media fields are filled. Founder pitch remains **MY RESPONSIBILITY / FOUNDER_OWNED / PENDING_EXTERNAL_INPUT**. Field presence does not establish sponsor eligibility. No final application submission or authorization is claimed. Exact current values: PORTAL_FIELDS_FINAL.md.

## MetaMask Agent Wallet — exact saved response

RetroPick ships a working installable read-only MetaMask Agent Wallet plugin for Monad Testnet market intelligence. The public Git distribution exposes three mm commands: retropick markets, retropick market inspect, and retropick market risk. Actual public Git installation on Agent Wallet 6.2.1 passed, and all three commands returned successful real Monad chain reads. The public-read commands use the officially supported requiresAuth:false and requiresInit:false settings; they provision no wallet, handle no signing key and request no wallet capabilities. They do not relax signing or MFA controls for economic writes.

Discovery resolves the committed token lifecycle and Kuru destination; inspection exposes exact quoted bid/ask units and a read head; risk reports spread with explicit uncertainty. Kuru bestBidAsk may include indicative vault/AMM quotes and does not establish standing order depth. Trade history was not queried and staleness is unknown. An object-versus-tuple parser defect was fixed against the deployed Coordinator ABI before recording; failed intermediate outputs are excluded from successful proof.

The 1:30 demo shows the actual retropick.xyz interface and literal recorded outputs from the Git-installed CLI commands, clearly labelled recorded public reads. No wallet provisioning, transaction signing, broadcasting, order or cancellation occurs. This distribution does not expose order placement or cancellation; those financial write implementations remain incomplete. We do not claim successful Agent Wallet trading, wallet-submit execution, or an MFA signing flow. Sponsor eligibility remains conditional and is for the sponsor to assess.

Demo: https://youtu.be/ei_4HMb_RBc . Public skill/source: https://github.com/RetroPick/retropick-protocol/blob/metropolis-metamask-readonly-20261014/skills/retropick-agent-wallet/SKILL.md . Product: https://retropick.xyz/launchpad .

Public skill: https://github.com/RetroPick/retropick-protocol/blob/metropolis-metamask-readonly-20261014/skills/retropick-agent-wallet/SKILL.md

Saved demo: https://youtu.be/ei_4HMb_RBc

Additional anything2explainer audio technical film: **IN_PROGRESS_SCRIPT_APPROVAL_PENDING**, maximum180 seconds, English Kokoro Liam selected. This additional film does not replace the saved primary175-second technical walkthrough. No completion or public URL is claimed yet.
