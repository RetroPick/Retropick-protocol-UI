# Sponsor Capability Matrix — 2026-10-11 baseline

Statuses: `NOT_INSPECTED | ALREADY_INTEGRATED | PARTIALLY_INTEGRATED | MISSING | IMPLEMENTING |
TESTED_LOCAL | TESTED_ONCHAIN | TESTED_E2E | QUALIFIED | BLOCKED_EXTERNAL | BLOCKED_SECURITY | DEFERRED`.
Every status beyond `MISSING` requires evidence.

| # | Sponsor / bounty | Status @ baseline | Evidence / note |
|---|------------------|------------------|-----------------|
| 1a | Kuru — Next Consumer Trading App | `TESTED_E2E` (2026-10-11: depth + post-only gaps closed) | `sponsors/kuru/` full package; fixture e2e 244/0 incl. new specs; onchain read-only revalidation PASS; QUALIFIED pending BLOCKER-001 deployment |
| 1b | Kuru — Bring New Assets and Markets | `TESTED_LOCAL` (kernels), onchain `BLOCKED_EXTERNAL` | P0 kernels qualified @ `4f3c70b` (`research/reports/hackathon-p0-gates.yaml`); KURU-H2..H7 need funded signer; graduation of new asset class evidenced (`frontend-e2e-launch.json`) |
| 2 | P0 qualification gate (internal) | `TESTED_LOCAL` | 210/0/1 forge green on 1.8.4 (this campaign, see `00-BASELINE-AUDIT.md`); drift check pending Stage 2 |
| 3 | Envio — Best Use of Envio | `MISSING` | no SDK, no config; HyperSync 10143 endpoint returns 401 on bare GET (token policy?) |
| 4 | Mera — One Passkey, Many Keys | `MISSING` | `@category-labs/mera` not installed |
| 5 | MetaMask Agent Wallet | `MISSING` | `mm` CLI not installed; node 22.23 satisfies ≥22.18 |
| 6 | Aurora — Any-Chain Liquidity to Monad | `NOT_INSPECTED` | route capability check pending |
| 8 | Chainlink — Best Workflow with CRE | `MISSING` | no CRE project; simulation support ≥ CLI v1.30.0 |
| 9 | Nansen — Best Use of Nansen | `NOT_INSPECTED` | no API entitlement known |

Cross-cutting infrastructure already in place: Monad RPC failover SDK, indexer
(event journal + GET read model), referral service, media service, Playwright fixture/live/
research E2E with evidence conventions.
