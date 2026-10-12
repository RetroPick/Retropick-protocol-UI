# Hackathon Release Candidate — RetroPick Metropolis (2026-10-12)

Primary track: Onchain Finance & Trading. Deadline Oct 14 2026 10:59 WIB (verify on the portal).

## Repository
- Main SHA: `b5a124f` (== origin/main). PRs this session merged: #23 (staging recovery), #24 (Envio
  live), #25 (Mera signer + Protected Earn), #26 (MetaMask diagnostics), #27 (Kuru/CRE regression +
  staging worktree fix), #28 (VPS proposal + closures).
- `apps/web` zero-write: 0 commits touch `apps/web` since baseline `a58f772`.
- Secret scan: no disclosed Envio/Pinata credential appears anywhere in the tracked tree.

## Runtime
- Public staging: https://retropick-metropolis-retro-ui-stagi.vercel.app (Vercel project
  `retropick-metropolis-retro-ui-staging`; legacy `retropick-metropolis` untouched).
- Deployed frontend SHA `98608fa`. Backend: systemd --user units (indexer/referral/media/gateway/
  tunnel) with user lingering; same-origin `/v1/*` + `/api/{referrals,media}/*` rewrites; tunnel
  rotation auto-redeploys (now idempotent across cleared /tmp).
- Live launch discovery: 9 launches, 3 graduated, indexer lag ~8, chainId 10143. RPC healthy.
- Freshness/empty/unavailable states are honest and distinct.

## Verification run (this session, all green)
retro-ui domain 17 · mera-signer 6 · protection 5 · media 4 · vault 7 · indexed-record 6 ·
public-rpc-env 2 · terminal 14 · SDK 43 · indexer 42 · Envio radar 22 · MetaMask policy 10 ·
staging/gateway/deploy 5 · staging Playwright 12 · radar panel Playwright 3 · discovery-failure 8 ·
Protected Earn Playwright 2. Typecheck clean. No apps/web diff. Secret scan clean.

## Judge demonstration path
1. Open the staging URL → Launchpad shows real indexed launches (freshness badge, lag).
2. Open a graduated token (e.g. RPV2M) → Kuru venue, real trade in Trades tab → Monad Explorer.
3. Kill the backend tunnel to show the honest "Indexer unreachable · Retry" state (not a fake empty).
4. Earn → Protection → the four honest protection modes + derive the passkey fee wallet (operator
   does the real ceremony).
5. CRE evidence: `evidence/hackathon/metropolis/sponsors/chainlink-cre/` (official simulation).

## Recordings to capture (operator, during the freeze)
- ≤3 min technical: launch → graduate → Kuru terminal → real trade receipt → one sponsor feature.
- ≤2 min founder pitch.
- Sponsor clips: Kuru (orderbook/trade), Mera (passkey fee wallet), Envio (stream→metric, after
  rotation), CRE (simulation), MetaMask (install+policy, after publish).

## Release / cutover
- Do NOT cut the production domain or submit the portal without founder authorization.
- Production cutover proposal, if approved: deploy the reviewed main SHA (not an untested rebuild),
  record previous vs new deployment URLs, env readiness, Playwright results, rollback = `vercel
  promote <previous>`.

## Operator queue (value order)
See `OPERATOR-ACTIONS.md`: 1) Envio token rotation · 2) Mera passkey ceremony · 3) ssh-agent unlock
for Contabo inventory · 4) MetaMask publish+provision · 5) per-tx financial approvals.


## 2026-10-13 P0 recovery checkpoint

Code `695ae7764f72cb0fb5cfee5af205fc2975bcd32f` implements RPC budgeting/fallback and trading gates, one shared wallet picker, resilient launch terms/media, paginated creator discovery, and Mera Protected Earn enrollment/action signing. Local verification: SDK 46 pass / 2 intentional network skips; indexer 43 pass; dedicated recovery browsers 20 pass; full fixture campaign 266 pass / 40 intentional skips. Public deployment, rotation and sustained monitoring are tracked in [the incident report](../integration/stages/20261013-indexer-502-kuru-trading-incident.md).

Mera is now implemented and locally tested; actual secure-origin hardware PRF recovery, fee-recipient handoff and protected financial receipts remain operator pending. APP_ONLY is bypassable outside RetroPick. No sponsor A–E gate is promoted by these results; prior evidence and outstanding qualifications stand. Quick-tunnel staging remains non-durable. Freeze begins October 14, 2026 02:59 WIB; submission 10:59 WIB remains subject to portal verification.
