# Hackathon Release Candidate — staging era (2026-10-11)

**RC state: staging-qualified, production-cutover pending approval.**

- Product: https://retropick-metropolis-retro-ui-stagi.vercel.app (retro-ui @ `02aeba2`,
  live Monad Testnet mode; legacy apps/web deployment untouched and still on the old URL).
- Validation: 14-POST-MERGE-BASELINE + STAGING-VALIDATION (curl matrix, strict-origin
  proof, 12/12 read-only e2e on the public URL) — all recorded under
  `evidence/hackathon/metropolis/staging/`.
- Sponsor verdicts: SPONSOR-QUALIFICATION-FINAL.md (1 QUALIFIED staging-backed,
  1 CONDITIONAL, 2 closed-blocked, 3 credential-blocked, 1 authorization-deferred).
- Release rules honored: no apps/web writes (guard verified per commit), no secrets in
  the bundle (audited env), no mainnet, no V2 contract changes, no live signing in this
  run, honest empty/unavailable market states instead of fabricated data.
- Before submission: operator queue in OPERATOR-ACTIONS.md (durability upgrade,
  cutover decision, credential unblocks, Mera manual run, Stage-7 decision, videos,
  founder approvals per docs/hackathon/SUBMISSION_CHECKLIST.md).
