# Twelve skeptical judge questions

Every answer distinguishes current testnet proof, source facts and proposed work. Current proof should be refreshed by the proof/QA owners before portal filing.

1. **Is this pump.fun on Monad?** Bonding curves, graduation and liquidity locks have prior art. RetroPick's current case is a coherent primary-to-Kuru lifecycle with committed venue policy, one secured-assets ledger, retryable atomic graduation and protected initial LP/excess custody. We do not claim global first or a novel asset class.

2. **Why not use Nad.fun or Kuru's deployer?** Both are real alternatives. Nad.fun documents curve-to-DEX graduation; Kuru already creates a token, market and liquidity together. Our hypothesis is that lifecycle controls and creator-to-orderbook continuity matter to a specific operator cohort. We have not yet validated willingness to switch through documented interviews.

3. **Who is the first user and their counterparty?** A Monad community operator with an audience and no trading engineering staff; community traders seeking early discovery and later limit-price control are counterparties. We propose five operators and twenty independent testers. No named committed first customer has been verified; the founder must supply a consenting pilot contact before making that claim.

4. **Does limit-order trading mean zero slippage?** No. Limit orders bound acceptable execution price but can remain unfilled or partially fill. Spreads, depth, volatility, fees and tick/size rules still matter. Show actual bid/ask and stale/empty state instead of promises.

5. **What do locked liquidity assets guarantee?** The inspected lock has no owner, approval, withdrawal or arbitrary-call entrypoint for the initial LP shares and excess tokens. This is a custody property. It does not guarantee two-sided executable depth, returns, issuer honesty or immunity to external Kuru changes.

6. **What happens when graduation fails?** The lifecycle secures assets in the Coordinator before external venue work; the Kuru step is atomic and safely retryable. A failed external attempt must not create partial ownership or consume assets. Current tests and receipts need the proof owner's deployment-equivalence check; no fallback venue or emergency withdrawal is invented.

7. **How do prices, policy and units stay trustworthy?** Onchain integer values are exact, and quotes/fees/progress derive from contract reads or explicitly labelled indexed views. Launch policy and destination parameters are committed rather than arbitrary creator trading input. Exact displayed fee and precision values must match the selected live launch.

8. **What traction do you actually have?** Functional testnet trades. The founder previously reported 30+ waitlist signups and about 300K X engagements, but dated analytics and deduplication are pending. These are neither active traders nor organic volume. We have no verified retained-user, revenue, partnership or maker-commitment claim.

9. **What new asset class is deployed?** Standard creator/community ERC20 launch tokens. Prediction/PRISM are separately gated research; no RWA, stock, compute or structured outcome asset is claimed shipped. Kuru New Assets was recommended for removal because ordinary token launches do not prove its hard requirement.

10. **Why Monad rather than generic cheap-chain marketing?** The journey involves repeated primary trades, graduation and secondary order changes. Monad is a plausible settlement fit for these interactive workflows, and Kuru is its execution venue. We have not measured a cross-chain latency advantage and will not invent one.

11. **Is this audited, compliant and ready for mainnet?** No audit or unrestricted mainnet readiness is claimed. It is an unaudited testnet candidate. Security review, external dependency qualification, asset/issuer-specific legal and operational review and human authorization are prerequisites. Source verification is source/bytecode correspondence, not an audit.

12. **What will you do after the hackathon, and why can this become a company?** Validate operators' willingness to switch, graduation reliability, independent fills, spread/depth and returning activity through a small pilot. Only then expand creator onboarding and evaluate SDK/embedded distribution. The business hypothesis is origination reliability plus distribution; fees/revenue and partnerships are not fabricated. Our concrete ask is creator, maker and security-review introductions.

## Proof references

- Public product: https://retropick.xyz/launchpad.
- Deployment/source: deployments/monad-testnet/v2.json; evidence/hackathon/metropolis/SOURCE_VERIFICATION.md.
- Functional trading: evidence/hackathon/metropolis/frontend-e2e-trading.json; current proof-owner refreshed results.
- Demand boundary: docs/hackathon/DEMAND_EVIDENCE.md.
- Prior art: https://pump.fun/docs/bonding-curve; https://docs.raydium.io/user-flows/launchlab-overview; https://nad.fun/skill.md; https://docs.kuru.io/sdk/deploy-market.
