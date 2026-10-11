# Sponsor Capability Matrix — 2026-10-11 baseline

Statuses: `NOT_INSPECTED | ALREADY_INTEGRATED | PARTIALLY_INTEGRATED | MISSING | IMPLEMENTING |
TESTED_LOCAL | TESTED_ONCHAIN | TESTED_E2E | QUALIFIED | BLOCKED_EXTERNAL | BLOCKED_SECURITY | DEFERRED`.
Every status beyond `MISSING` requires evidence.

| # | Sponsor / bounty | Status @ baseline | Evidence / note |
|---|------------------|------------------|-----------------|
| 1a | Kuru — Next Consumer Trading App | `TESTED_E2E` (2026-10-11: depth + post-only gaps closed) | `sponsors/kuru/` full package; fixture e2e 244/0 incl. new specs; onchain read-only revalidation PASS; QUALIFIED pending BLOCKER-001 deployment |
| 1b | Kuru — Bring New Assets and Markets | `TESTED_LOCAL` (kernels), onchain `BLOCKED_EXTERNAL` | P0 kernels qualified @ `4f3c70b` (`research/reports/hackathon-p0-gates.yaml`); KURU-H2..H7 need funded signer; graduation of new asset class evidenced (`frontend-e2e-launch.json`) |
| 2 | P0 qualification gate (internal) | `TESTED_LOCAL` → `P0_CONDITIONAL` (2026-10-11: zero drift confirmed, gate docs issued) | `execution/stages/P0_*.md` |
| 3 | Envio — Best Use of Envio | `BLOCKED_EXTERNAL` (token-gated endpoint) + `TESTED_LOCAL` core (2026-10-11) | `sponsors/envio/capability-check.json`; integrations/envio-market-radar (8/8 tests) |
| 4 | Mera — One Passkey, Many Keys | `TESTED_LOCAL` + `BROWSER_E2E` failure-states (2026-10-11) | `sponsors/mera/`; SDK 0.2.0; full PRF path needs real authenticator (manual) |

| 5 | MetaMask Agent Wallet | `MISSING` | `mm` CLI not installed; node 22.23 satisfies ≥22.18 |
| 6 | Aurora — Any-Chain Liquidity to Monad | `NOT_INSPECTED` | route capability check pending |
| 8 | Chainlink — Best Workflow with CRE | `TESTED_LOCAL` (typechecked, SDK-verified API); sim `BLOCKED_EXTERNAL` (cre login) | `sponsors/chainlink-cre/capability-check.json`; integrations/chainlink-cre |
| 9 | Nansen — Best Use of Nansen | `NOT_INSPECTED` | no API entitlement known |

Cross-cutting infrastructure already in place: Monad RPC failover SDK, indexer
(event journal + GET read model), referral service, media service, Playwright fixture/live/
research E2E with evidence conventions.
