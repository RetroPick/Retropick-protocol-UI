# Staging Rollback

The staging release is isolated by construction: its own Vercel project, its own domain,
its own host processes. The legacy `retropick-metropolis` deployment (apps/web) is never
touched, so "rollback" here never affects the existing public hackathon URL.

## Frontend (Vercel project `retropick-metropolis-retro-ui-staging`)

- **Bad build:** `vercel rollout undo` (instant alias rollback to the previous
  deployment) or `vercel deploy` a known-good commit; deployments are immutable and
  listed via `vercel ls --prod`.
- **Retire staging entirely:** `vercel project rm retropick-metropolis-retro-ui-staging`
  (operator) — leaves the legacy project untouched.

## Backend stack (host)

- `node scripts/staging/stop-backend.mjs` — kills all process groups (services +
  gateway + tunnel). No external system depends on them beyond the staging frontend.
- Corrupt indexer DB (unexpected): stop, move `apps/indexer/.data/monad-testnet.sqlite*
  aside, restart — the journal re-syncs from block 69,509,526 (hours; only if needed).
- Referral DB: same pattern (`.data/referral-attribution.sqlite`); attribution history
  would be lost — acceptable for staging, disclosed.

## Tunnel

- Quick tunnel dies with its process; nothing to clean up externally. If the URL
  leaked anywhere sensitive (it cannot — it is public-by-design), rotate by restarting.

## Production cutover (NOT performed — approval checkpoint)

If the operator later points `retropick-metropolis.vercel.app` (or a custom domain) at a
retro-ui deployment, the rollback plan MUST accompany the request, per RELEASE-GATES:
exact SHA, new/previous URLs, build config, env readiness, health status, Playwright
results, known limitations, and the one-command rollback (`vercel rollout undo` /
re-point the domain at the previous deployment). Until then the legacy deployment stands.
