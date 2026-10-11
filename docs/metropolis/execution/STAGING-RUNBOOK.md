# Staging Runbook

## Cold start (host boot / after sleep) — ~3 minutes

```bash
cd /home/ubuntu/project/retropick/retropick-protocol

# 1. Start the backend stack + a fresh quick tunnel (prints the tunnel URL)
node scripts/staging/start-backend.mjs --origin https://retropick-metropolis-retro-ui-stagi.vercel.app

# 2. If the tunnel URL CHANGED (it will, on every restart — quick tunnels rotate):
node scripts/staging/deploy-vercel.mjs
#    (updates VITE_INDEXER_URL, re-renders the gitignored root vercel.json, redeploys)
#    NOTE: deploy-vercel.mjs sets env via upsert; if VITE_INDEXER_URL already exists it
#    prints "leaving unchanged" — in that case rotate manually:
#      vercel env rm VITE_INDEXER_URL production --yes
#      echo "$(cat .staging/tunnel-url)" | vercel env add VITE_INDEXER_URL production
#    then redeploy: vercel deploy --prod --yes

# 3. Verify
curl -s "$(cat .staging/tunnel-url)/health" | head -c 200          # indexer freshness
curl -s -o /dev/null -w '%{http_code}\n' https://retropick-metropolis-retro-ui-stagi.vercel.app/launchpad
cd apps/retro-ui && STAGING_URL=https://retropick-metropolis-retro-ui-stagi.vercel.app \
  pnpm exec playwright test --config e2e/staging.config.ts
```

## Daily checks

- Indexer lag: `curl -s "$(cat .staging/tunnel-url)/health"` — `lagBlocks` should stay
  < 64 (the client's STALE_LAG_BLOCKS); it syncs continuously.
- Referral/media rewrites: `/api/referrals/health` + `/api/media/health` on the staging
  domain → 200.
- Services alive: `.staging/*.pid` process groups (`ps -g $(cat .staging/indexer.pid)`).

## Stop everything

```bash
node scripts/staging/stop-backend.mjs   # kills process groups incl. tunnel
```

## Known operational facts

- Quick-tunnel URL is NON-DURABLE: rotates every tunnel restart; host sleep/WSL restart
  tears it down. The frontend keeps serving the old build (stale indexer banner appears
  once the tunnel dies) — run the cold start to restore.
- The pidfiles record the detached process GROUP leader; stop-backend kills `-pgid` so
  the node children die too (fixed after the orphan-process incident of 2026-10-11).
- Public RPC occasionally rejects the heavy `getL2Book` browser call → the depth panel
  shows its designed unavailable-state; order placement revalidates on-chain regardless.
- The evidenced Kuru market's resting book is currently empty (campaign orders consumed);
  the depth panel shows the designed "No resting orders" state. Placing live orders
  requires the separately-authorized wallet flow.
- WSL2 systemd is degraded — services run as detached process groups, not units; a
  named tunnel + systemd unit (or a small VPS) is the durability upgrade path.

## Redeploy frontend only (code change)

```bash
git push … # merge to main, then on the host:
vercel deploy --prod --yes    # root vercel.json must be current (tunnel) — else run deploy-vercel.mjs
```
