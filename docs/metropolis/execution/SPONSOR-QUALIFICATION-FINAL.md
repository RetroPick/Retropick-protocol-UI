# Sponsor Qualification — Final Ledger (2026-10-12)

Gates: **A** official SDK/network/source · **B** builds + unit tests · **C** threat model + negative
cases · **D** real integration / receipt · **E** sponsor-specific product + eligibility. `QUALIFIED_A_E`
only when ALL five hold with real evidence. Main SHA `b5a124f`. Staging deploy SHA `98608fa`.
Network Monad Testnet 10143. `apps/web` zero-write across the whole campaign (0 commits since `a58f772`).

| Sponsor | A | B | C | D | E | Verdict | Evidence / blocker |
|---|---|---|---|---|---|---|---|
| **Kuru Consumer** | ✅ | ✅ | ✅ | ✅ | ✅ | **QUALIFIED_A_E** | Live graduated terminal on public staging: Kuru venue, honest empty book, real trade tx `0x93e0…5415` (Monad Explorer). SDK 43/43, terminal 14/14, staging 12/12. `sponsors/kuru/20261012/` |
| **Chainlink CRE** | ✅ | ✅ | ✅ | ✅(sim) | ✅ | **SIMULATED (official PASS)** | `cre workflow simulate` PASS @ block 70100439, CLI v1.38.0 authed, Sourcify v2 exact_match, 3 negatives + determinism. No DON deployment claimed. `sponsors/chainlink-cre/` |
| **Envio** | ✅ | ✅ | ✅ | ✅ | ✅ | **QUALIFIED_A_E (public live)** | Operator-authorized dev token. Public `/api/radar/*` live: authenticated HyperSync 1.4.1 stream, lag 0, 0 decode errors, lifecycle counts exact-match indexer, receipts reconciled, durable reorg replay (25/25); frontend panel renders live metrics + tx proof. `sponsors/envio/20261012/` |
| **Mera** | ✅ | ✅ | ✅ | ✅(local sig) | ⏳ | **TESTED_LOCAL** | passkey→secp256k1→EVM address proven (6/6): deterministic address + local ECDSA recovery + viem sign. Protected Earn 4 honest modes (5/5). `transferCreatorFeeRecipient` prepare-only. Real browser ceremony + broadcast = operator. `20261012-mera-signer.md` |
| **MetaMask Agent** | ✅ | ✅ | ✅ | ⛔ | ⏳ | **TESTED_LOCAL (install BLOCKED_EXTERNAL)** | policy 10/10, signer-ownership fail-closed, live verification; manifest + wallet-submit cap parse on consent screen. CLI 6.2.1 BLOCKER-005 (local path/tarball → github.com// → E404). Needs npm publish / git URL + provision (operator packet). `20261012-metamask-agent.md` |
| **Aurora Intents** | ⛔ | — | — | — | — | **BLOCKED_EXTERNAL** | No source→Monad Testnet route (mainnet only, out of scope). No mock. `sponsors/aurora/` |
| **Nansen** | ⛔ | — | — | — | — | **BLOCKED_EXTERNAL** | No API entitlement / no testnet coverage. Own labelled local signals only; no fabricated data. `sponsors/nansen/` |
| **Kuru New Assets (P0)** | ✅ | ✅(local) | ✅ | ⛔ | — | **DEFERRED_AUTHORIZATION** | kernels locally qualified; deployment/liquidity needs funded-wallet operator go (HARD GATE). `execution/stages/P0_*.md` |
| Pinata (infra) | ✅ | ✅ | ✅ | ✅ | — | **ACTIVATED (staging)** | operator-authorized dev JWT; isolated auth+pin+gateway match; media svc pinata mode (403 wrong-origin / 415 non-image); existing local images preserved; public origin mode=pinata. `sponsors/pinata/20261012/` |

Legend: ✅ met · ⏳ gated on an operator action (not a code gap) · ⛔ externally blocked.

## What a judge can independently verify right now
- Public staging launchpad with **real Monad Testnet data**: https://retropick-metropolis-retro-ui-stagi.vercel.app
- Live graduated token terminal with a real Kuru trade linking to Monad Explorer.
- Honest unavailable/empty states (no fabricated liquidity, no demo data in live mode).
- CRE official-simulation evidence (deterministic, reproducible).

## Honest limitations
- Mera on-chain signing + MetaMask live order await operator provisioning / a per-tx approval (all
  code + local proof complete). Mera browser passkey ceremony evidence is an operator capture.
- Aurora/Nansen have no supported Monad Testnet capability.
- Staging rides a Cloudflare quick tunnel (auto-recovers on rotation ~40 s); durable ingress is the
  Contabo proposal (inventory complete, deployment gated on an operator change scope).

## 2026-10-12 operator-unblock update
- **Envio** → QUALIFIED_A_E (public): dev token authorized, `/api/radar/*` live end-to-end.
- **Pinata** → ACTIVATED on staging: dev JWT authorized, media in pinata mode, backward-compatible.
- **Contabo** inventory complete with real figures; deployment remains a HARD GATE (change scope in
  OPERATOR-ACTIONS item 3).


## 2026-10-13 P0 recovery checkpoint

Code `695ae7764f72cb0fb5cfee5af205fc2975bcd32f` implements RPC budgeting/fallback and trading gates, one shared wallet picker, resilient launch terms/media, paginated creator discovery, and Mera Protected Earn enrollment/action signing. Local verification: SDK 46 pass / 2 intentional network skips; indexer 43 pass; dedicated recovery browsers 20 pass; full fixture campaign 266 pass / 40 intentional skips. Public deployment, rotation and sustained monitoring are tracked in [the incident report](../integration/stages/20261013-indexer-502-kuru-trading-incident.md).

Mera is now implemented and locally tested; actual secure-origin hardware PRF recovery, fee-recipient handoff and protected financial receipts remain operator pending. APP_ONLY is bypassable outside RetroPick. No sponsor A–E gate is promoted by these results; prior evidence and outstanding qualifications stand. Quick-tunnel staging remains non-durable. Freeze begins October 14, 2026 02:59 WIB; submission 10:59 WIB remains subject to portal verification.

## 2026-10-13 permanent Contabo staging

The temporary WSL quick-tunnel arrangement above is superseded. Runtime source
`84e954bdcff5651a5f808882eff6226fd6419f6a` now serves the unchanged public Vercel frontend through
`https://api-staging.retropick.xyz`, with Namecheap DNS, Caddy HTTPS and isolated boot-enabled
Contabo system services. SQLite history, media and radar state were preserved. Kernel-backed
writer guards repair reboot/PID reuse; referral multi-page cursor sync is repaired.

Public desktop/mobile checks pass 14/14 with retries disabled after isolated crash recovery.
No Yubie service, contract, financial write or sponsor A–E qualification changed. Whole-host
reboot was not performed; system boot dependencies and process recovery are verified.
See [the current incident and monitoring report](../integration/stages/20261013-vps-recovery.md).
