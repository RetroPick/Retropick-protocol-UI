# Branding and token image live release — 2026-10-13

Status: PASS. User authorized merge to main and redeployment of the live frontend.

- PR: https://github.com/RetroPick/retropick-protocol/pull/32 (merged).
- Main and published source: `e7188395db7ce84ab1fcae29df017b74f6582f9e`.
- Public app: https://retropick.xyz/launchpad
- Staging alias: https://retropick-metropolis-retro-ui-stagi.vercel.app
- Deployment: `dpl_87KN562TwXxRh87dBPe4Y1AS15h6`.
- Sidebar/favicon PNG byte-for-byte matches the user's supplied image.
- Token logo fix is live; actual RETRO logo decodes at 1024×1024 on dashboard,
  hard reload, grid and token detail on desktop1440/mobile390.
- Main now tracks the stable Vercel config using api-staging.retropick.xyz. The
  expired tunnel config was an ignored local generated file, not tracked source.
- Existing production-used recovery and launch-economics fixes were retained.
  Unrelated original workspace deletions and document edits were not committed.

Verification: TypeScript/build PASS, media5/5, terminal14/14, SDK suite PASS,
indexer45/45, referral18/18, deployment/readiness6/6. Gitleaks found only public
40-hex Ethereum contract addresses; the release range passed with an explicit
allowlist for those public identifiers. Browser on the actual apex: staging16/16,
branding/images2/2, launch economics/draft-preservation2/2; no retries or financial
writes. Both apex and staging aliases report the exact source SHA and same
READY deployment; same-origin health and media routes return200.

Deployment used the repository's SHA-pinned candidate helper with the stable API,
validated source/readiness and the image hash, then promoted that production
candidate. Local deployment records now reference the new SHA so a future helper
redeploy cannot revert to the old release accidentally. No backend service,
contract, DNS record or financial transaction was changed.

Artifacts: deployment.json, branding-images-live.json, staging-results.json,
browser-after.json, dashboard-{1440,390}.png, token-{1440,390}.png and
launch-form after-{1440,390}.png. This is actual public-origin evidence,
not intercepted media or mocked indexer data.
