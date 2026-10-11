# Sponsor Qualification — Final Matrix (2026-10-11, staging era)

Judged against actual sponsor requirements; `QUALIFIED` requires sponsor-specific proof.

| Sponsor | Integration | Staging | Security | E2E | Verdict | Ref | Remaining blocker |
|---|---|---|---|---|---|---|---|
| Kuru Consumer | live in product | **live on staging URL** | identity-qualified reads; bigint; policy fail-closed | 12/12 public-URL green + onchain read-only revalidation | **QUALIFIED** (staging-backed) | PR #10 | none for staging; judge demo benefits from reseeded book liquidity |
| Kuru New Assets | kernels qualified, not deployed | n/a | P0 gates PASS, zero drift | forge 210/0/1 | **DEFERRED** | PR #11 | operator authorization + funded wallet |
| Mera | vault live (Earn→Vault) | mounts on staging; encrypted-at-rest proven | SDK-only crypto; no plaintext at rest; no spending authority | failure-states + tamper e2e; **full PRF ceremony needs a real passkey** | **CONDITIONAL** | PR #12 | operator's ~2-min manual PRF run on the staging domain |
| Envio | radar core + service | not in staging (fail-closed) | server-only token (absent); bigint core | 8/8 unit | **BLOCKED_EXTERNAL** | PR #13 | ENVIO_API_TOKEN |
| Chainlink CRE | workflow complete + typechecked | n/a (CLI-side) | read-only workflow, no secrets | typecheck only | **BLOCKED_EXTERNAL** | PR #14 | `cre login` → simulate |
| MetaMask Agent | plugin + policy core | n/a (CLI-side) | fail-closed place/cancel; ownership checks; no key export | policy 8/8; manifest parsed by mm | **BLOCKED_EXTERNAL** | PR #15 | npm publish → install → wallet-signed order |
| Aurora | capability check only | n/a | n/a | n/a | **BLOCKED_EXTERNAL (closed)** | PR #16 | no testnet route (mainnet out of scope) |
| Nansen | local-signal risk factors only | risk info live via terminal | no Nansen-derived data displayed | n/a | **BLOCKED_EXTERNAL (closed)** | PR #16 | no API key + no testnet coverage |

Primary-track posture: RetroPick bond-to-book trading is publicly demonstrable on
Monad Testnet with real indexed data, on-chain-qualified orderbook access and honest
market states; the originality lane (event-backed outcome assets) stays research-gated
pending the Stage-7 authorization.
