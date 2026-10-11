# Staging Validation — 2026-10-11

Staging URL: **https://retropick-metropolis-retro-ui-stagi.vercel.app**
Deployment: `retropick-metropolis-retro-ui-staging` (Vercel, personal scope), Vite build
of `apps/retro-ui` @ `02aeba2`, `VITE_DATA_MODE=live`. Full record:
`evidence/hackathon/metropolis/staging/deployment.json`.

## Infrastructure

| Check | Result |
|---|---|
| HTTPS staging URL `/` | 200, production Vite assets (`assets/index-*.js`) |
| SPA deep link `/launchpad`, `/launchpad/token/0x…` | 200 (fallback rewrite works — history-API routing) |
| `/api/referrals/health` via same-origin rewrite | 200, `{"chainId":10143,…}` |
| `/api/media/health` via same-origin rewrite | 200, `{"chainId":10143,"mediaOnly":true,"mode":"local"}` |
| Referral challenge, correct `Origin` | 200 — SIWE-style challenge naming the staging domain |
| Referral challenge, wrong `Origin` | **403 INVALID_ORIGIN** (strict-origin enforced end-to-end through Vercel → tunnel → gateway → service) |
| Indexer freshness (through tunnel) | caught up live: lag 8 blocks (< 64 stale threshold), envelope `chainId 10143 / MONAD_EVENT_INDEXER` |
| Browser RPC | public `testnet-rpc.monad.xyz`; bundle contains live tunnel URL (verified in shipped JS) |
| Cookie path | HttpOnly `SameSite=Strict; Secure` works because the rewrite keeps requests same-origin |

## Application (read-only Playwright against the public URL — desktop-1440 + mobile-390)

`e2e/staging/staging.spec.ts` (config `e2e/staging.config.ts`), no wallet, no signing:

**Result: 12/12 green** (11 passed + 1 flaky-passed on retry: the mobile depth state
races between two honest states depending on public-RPC mood).

- Discovery renders **real indexed launches** — zero DEMO/SIMULATED leakage, live mode asserted.
- Graduated token terminal renders (`data-lifecycle=GRADUATED`, live provenance) with the
  Stage-1 **depth panel** and enabled **Orders** tab.
- Earn hub live + **Mera Vault tab** mounts with the spending-authority disclosure.
- No uncaught console errors; no horizontal overflow on either viewport.
- Connect-wallet flows surface the EIP-6963 picker; nothing signs.

## Honest market findings (recorded, not hidden)

1. The evidenced Kuru market's resting book is **currently empty** (campaign orders were
   consumed). The depth panel correctly shows "No resting orders" — the validated
   empty-state path, never fabricated depth.
2. The public RPC intermittently rejects the heavy `getL2Book` browser call → the
   designed "depth is unavailable" state appears; order placement revalidates on-chain
   at execution time regardless. (An operator-approved browser-safe RPC would harden
   this; note the build guard rejects credential-bearing URLs by design.)

## Fail-closed verification

- Live mode without indexer (tunnel down) → client shows the stale/unavailable banner
  (envelope validation + STALE_LAG_BLOCKS semantics), trading reads current on-chain
  state — by design, verified in code and in the fixture suite; no mock fallback exists.
- No `VITE_WALLET_BRIDGE_URL` in staging (e2e-only bridge cannot activate in prod builds).

## Not performed (unchanged gates)

Live signing (no authorized wallet in this run), production-domain cutover (approval
pending), Envio/CRE/MetaMask runtime qualification (credentials — see OPERATOR-ACTIONS).
