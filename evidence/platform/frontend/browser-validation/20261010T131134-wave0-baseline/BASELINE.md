# Wave 0 Preservation Baseline (FEAT-001, campaign Task T0, decision B2)

Campaign: task-retro-ui-trading-redesign (RetroPick retro-ui Trading Product Redesign).
TS: `20261010T131134` (UTC, 2026-10-10T13:11:34Z; host local time is +07:00, so this is 20:11:34 local).
Note: the earlier evidence dirs (`20261010T172514-smoke` and siblings) appear to be named in local +07:00 time, so they sort after this UTC-named dir although they are older.

No secrets are recorded in this file. Contents of likely-secret files were never read into logs.

## 1. Governance confirmed

| Item | Source | Value |
|---|---|---|
| launchpad_core.state | .agent/STATE.json `modules.launchpad_core.state` | `HACKATHON_FREEZE` |
| canonical_frontend | .agent/STATE.json `modules.launchpad_core.current_runtime.canonical_frontend` | `apps/retro-ui` |
| Read | AGENT_GUIDE.md, AGENTS.md, .agent/STATE.json, .agent/CURRENT_GOAL.md, .agent/ROUTING.md, .agent/HANDOFFS.md, .agent/steering/{engineering,security,testing}.md, campaign-spec.md (A, B, C, E) | |

## 2. Baseline identity

| Field | Value |
|---|---|
| BASE_HEAD_SHA | `c41d35d3a57de05fc26f78476554e352d9b08b56` (unchanged since plan time) |
| Branch before | `codex/v2-productization-performance` |
| Branch after | `codex/v2-productization-performance` (not switched, see section 9) |
| BASELINE_DIRTY_DELTA | 153 pre-existing porcelain entries (below) |
| Working-tree fingerprint | `82bc95e36c51acb4ed12ef64e59d920651a981bab9e9c185987d59d7b8b12b39` (sha256 of baseline-fingerprint.txt) |
| Fingerprint algorithm | sha256 over sorted, newline-terminated lines `<path> <sha256-of-raw-file-bytes>` for every dirty tracked and untracked pre-existing path |

### Entry counts (`git status --porcelain=v2 --untracked-files=all`)

| Count | Value |
|---|---|
| Total entries at capture | 172 = 153 pre-existing + 19 campaign task-state files |
| Campaign files at capture (excluded from baseline) | 19, all under `.agents/tasks/task-retro-ui-trading-redesign/` (written by the planner) |
| Pre-existing type `1` (ordinary changed) | 37 |
| Pre-existing type `2` (renamed/copied) | 0 |
| Pre-existing type `u` (unmerged) | 0 |
| Pre-existing type `?` (untracked) | 116 |
| XY `.M` (unstaged modification, nothing staged) | 37 |
| Staged (X != `.`) | 0 (staged.patch is empty) |
| Unstaged (Y != `.`) | 37 |
| Deleted / renamed / conflicted | 0 / 0 / 0 |
| skip-worktree / assume-unchanged | 0 (`git ls-files -v` shows only `H`) |
| Ignored-but-present entries (metadata only, not archived) | 33 (`git ls-files --others --ignored --exclude-standard --directory`) |
| Submodules | `contracts/lib/forge-std` at bf647bd (v1.16.2), `contracts/lib/v4-deployment-periphery` not initialised; neither dirty |
| core.hooksPath | unset |
| .git/index.lock | absent |
| stash@{0} | `eb0481a75215aa63518b7994e15ce33f582f867f` "On codex/kuru-freeze-smart-contract-spec: preserve original local overrides before main sync 2026-10-09", unchanged before and after |

## 3. Classification of the 153 pre-existing entries

Every entry is PRE-EXISTING (not campaign-attributed). The full per-path list with type, XY, group and attribution is in `baseline-entries.tsv` (this dir).

| Group | Tracked (.M) | Untracked (??) | Content |
|---|---|---|---|
| retro-ui frontend work | 19 | 16 | apps/retro-ui package.json, vite.config.ts, src (token-detail, kuru-ticket, discovery, earn, live-earn, create-launch, live-portfolio, routes, main, shell, safe-link, next-compat, tx-pipeline, use-launch-detail, use-live-launches, format, indexer-client) plus new live-search, fund-wallet, referrals, send-to-wallet, chart-data, demo-discovery, demo-token-detail, live-trading-ticket, trading-chart, lib/live/{create-validation,fiat-provider,performance,queries,referral-client}, services/wallet-state, tests/product-data.test.mjs |
| launchpad-sdk work (forbidden prefix) | 10 | 19 | packages/launchpad-sdk/src/{abi,chain,decode,events,kuru,math,model,prepare,read-model,registry}.ts plus src/abis/*Abi.ts (14), orders.ts, transfer.ts, SEND_WRITE_ALLOWLIST.md, scripts/benchmark-rpc.ts, test/productization.test.ts |
| indexer work (forbidden prefix) | 5 | 5 | apps/indexer/src/{project,server,store,sync}.ts, test/store.test.ts plus src/query.ts, test/{fixtures,project.test,query.test,sync.test}.ts |
| referral-service | 0 | 13 | apps/referral-service/ (README, package.json, tsconfig, .gitignore, .env.example, src/{app,auth,model,server,store,sync}.ts, test/{frontend-gates,referrals}.test.ts) |
| agent tooling dirs | 0 | 6 | .cursor/hooks/state/continual-learning.json, .v2c/plugin_root, .video_agent/plugin_root, .zcode/plans/plan-sess_*.md (3) |
| apps/web (forbidden prefix) | 0 | 1 | apps/web/package-lock.json |
| evidence | 0 | 48 | evidence/launchpad/productization/* (3), evidence/platform/frontend/browser-validation/{20261010T172514-smoke, 20261010T172557-pons, 20261010T172919-retro-local, 20261010T173310-retro-probe}/* (45) |
| scripts | 1 | 2 | scripts/launchpad/export_deployed_abis.py; scripts/e2e/product-navigation.mjs, scripts/performance/browser.mjs |
| docs / development | 0 | 3 | development/performance/RPC_BENCHMARK.json, development/productization/PLAN.md, docs/product/REFERRAL_SYSTEM.md |
| other (repo root) | 2 | 3 | THIRD_PARTY_NOTICES.md, pnpm-lock.yaml; token-detail-desktop.png, token-detail-mobile.png, valkey-mcp-server.log |
| Total | 37 | 116 | 153 |

## 4. Private snapshot (outside every git worktree)

Location: `/home/ubuntu/project/retropick/.retropick-campaign-baselines/20261010T131134/`
Permissions: parent dir and snapshot dir `0700`, every file `0600`, created under `umask 077`. `/home/ubuntu/project/retropick` is not a git repository, so the snapshot can never be committed.

| Artifact | sha256 | Bytes |
|---|---|---|
| staged.patch (`git diff --cached --binary`, HEAD vs index) | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (empty) | 0 |
| unstaged.patch (`git diff --binary`, index vs worktree) | `403f2487009fe81fac28061b7aaf08ae0bdf3d431297869587a0d0d41f15ea37` | 419648 |
| index.copy (read-only copy of .git/index) | `89d024f894d9a51b1812ba84ec4c3f06ea2251031cba0137764689d457784c18` | 214789 |
| untracked.tar.gz (116 pre-existing untracked files) | `fa5e55aba8f7b1356fe5ec903ac82a3a54cefc764aaf415af8b1a9f71f7f04f3` | 6952831 |
| baseline-fingerprint.txt | `82bc95e36c51acb4ed12ef64e59d920651a981bab9e9c185987d59d7b8b12b39` | 18469 |
| status-porcelain-v2.z (raw `-z`) | `509641406b6e604c56aa0115a7984a057e91912b846ae8d7e001fbb3ffdb22f7` | 14333 |
| status-porcelain-v2.txt | `32fb9722976770f0a0f445780f165c7a1dad62ea76477af35dc5f9359ae3fb76` | 14333 |
| manifest.json (sha256 and size of all 36 other artifacts, counts, groups) | `49497c8f8903e97895cbaede30692b48cc68a0072988643e0aec35b2b505a000` | 7522 |
| secrets-inventory.txt (paths and sha256 only) | `c2f6eb752f71021adada45bca64c847bc0c49289bf8f93193ff10f27e23176b9` | 813 |
| verify-restore.mjs (added after the manifest; hash in post-manifest-tools.sha256) | `e09a25915f25b0b919788661096f2f33b442062feda05fe98c47a906610158e4` | 7166 |

Other metadata files in the snapshot: head.txt, branch.txt, worktrees.txt, stash-list.txt, stash-list-sha.txt (+ .after), refs.txt (`refname objectname` only), core-hooksPath.txt, submodule-status.txt, staged/unstaged-name-status.txt, untracked-{all,preexisting,campaign}.list.{z,txt}, untracked-tar-listing.txt, ignored-present.txt, entries.tsv, campaign-files-at-baseline.txt, live-index.sha256.{before,after} (identical: the live index was not rewritten), live-index-stage-listing.sha256 and index-copy-stage-listing.sha256 (identical), stash-create-sha.txt, capture-baseline.sh, build-manifest.mjs.

Extra in-repo object reference: `git stash create` produced `8f54243776f04d7a531b81e348d5fc20cb7cb9b9` (tracked changes only, B2 notes this alone is insufficient), anchored at `refs/campaign-baselines/20261010T131134/tracked` so it is not garbage-collected. This is the only ref the campaign added; refs/stash and stash@{0} were not touched. It can be removed later with `git update-ref -d refs/campaign-baselines/20261010T131134/tracked` if the user wants.

Likely-secret paths (paths only; sha256 recorded only in the 0600 secrets-inventory.txt):
- Ignored, not archived: `.env.local`, `apps/retro-ui/.env.local`, `contracts/.env.local`, `contracts/.env.local.bak`.
- Untracked pre-existing, archived inside the 0600 untracked.tar.gz because they are part of the dirty delta: `apps/referral-service/.env.example`, `valkey-mcp-server.log` (name match on "key").
- Global `~/.kiro/settings/*.json` and `~/.kiro/agents/*.json` were not read or copied.

The capture and verification tools are copied (no secrets) to `snapshot-tools/` in this dir: capture-baseline.sh, build-manifest.mjs, verify-restore.mjs.

## 5. Restore procedure and its non-destructive verification

Never run these against the live workspace. Restore into a new location only, and only on explicit user instruction.

```bash
SNAP=/home/ubuntu/project/retropick/.retropick-campaign-baselines/20261010T131134
REPO=/home/ubuntu/project/retropick/retropick-protocol
BASE=c41d35d3a57de05fc26f78476554e352d9b08b56
TARGET=/path/to/new/empty/dir            # never the live worktree

# 0. Integrity check of the snapshot plus a full scratch rebuild (non-destructive, deletes its scratch dir)
node "$SNAP/verify-restore.mjs" "$SNAP" "$REPO"

# 1. Base tree at BASE_HEAD_SHA in a new location (either form)
git -C "$REPO" archive --format=tar "$BASE" | tar -x -C "$TARGET"
#   or, for a git-tracked restore: git -C "$REPO" worktree add --detach "$TARGET" "$BASE"

# 2. Staged changes (empty at this baseline), then unstaged changes
cd "$TARGET"
[ -s "$SNAP/staged.patch" ] && git apply --binary "$SNAP/staged.patch"   # use --index inside a git worktree
git apply --binary "$SNAP/unstaged.patch"

# 3. Untracked files
tar -xzf "$SNAP/untracked.tar.gz" -C "$TARGET"

# 4. Staged state: staged.patch is empty, so a fresh index at BASE already matches.
#    index.copy is the byte copy of the live .git/index for disaster recovery of this same worktree only.

# 5. Prove the result
node "$REPO/apps/retro-ui/e2e/tools/attribute-changes.mjs" "$SNAP"   # inside a git worktree restore
```

Verification executed (`restore-verification.log`, scratch `/tmp/retropick-restore-verify-20261010T131134`, mode 0700, deleted afterwards):

| Check | Result |
|---|---|
| Snapshot artifact integrity vs manifest | 36 of 36 match |
| git archive BASE, apply staged (empty, skipped) and unstaged patches, extract untracked tarball | OK |
| Baseline paths (37 dirty tracked + 116 untracked), sha256 and owner-exec bit, scratch vs live vs fingerprint | matched 153 of 153 |
| Whole tracked tree (non-gitlink), scratch vs live | matched 1761 of 1761 |
| index.copy stage listing equals live index stage listing | true |
| index.copy reproduces staged.patch | true |
| stash-create object 8f54243 reproduces the tracked delta (equals unstaged.patch and live `git diff HEAD`) | true |
| Scratch dir removed | true |
| Overall | PASS |

## 6. Other worktrees (read-only inspection)

| Worktree | Branch | HEAD (commit date) | Porcelain entries | index.lock | Newest file (excl. node_modules, .git) | Files changed in last 60 min | Processes with cwd inside | Classification |
|---|---|---|---|---|---|---|---|---|
| ../retropick-protocol-main-merge | codex/merge-v2-to-main | 84861f50494a (2026-10-09T17:37:30+07:00) | 0 | none | 2026-10-09T21:43:41+07:00 .gstack/browse-daemon.log | 0 | none | idle |
| ../retropick-protocol-metropolis | codex/metropolis-market-creation | 8a5fc1fbf9bd (2026-10-09T22:23:09+07:00) | 0 | none | 2026-10-09T22:22:27+07:00 evidence/hackathon/metropolis/permit2.log | 0 | none | idle |
| ../retropick-protocol-v2-monad-testnet-e2e | codex/v2-monad-testnet-e2e | a8a81f544311 (2026-10-09T17:07:04+07:00) | 0 | none | 2026-10-10T00:39:05+07:00 contracts/cache/solidity-files-cache.json | 0 | none | idle |

## 7. Concurrent activity in this worktree

| PID | Age at check | cwd | Process | Writes observed | Assessment |
|---|---|---|---|---|---|
| 204585 (+ app-server 207540) | ~40 min | repo root | `codex` interactive agent session (zodex build, codex 0.162.1), launched from a separate login shell | none to tracked/untracked files in the last 60 min | live agent session attached to this worktree; potential concurrent writer |
| 137818 | ~9 h | repo root | `node scripts/e2e/wallet-bridge.mjs`, listening on 127.0.0.1:8789, started by a zcode agent session | none | SIGNING BRIDGE: must never be used by any campaign QA gate |
| 153008 | ~7.7 h | apps/indexer | `node --experimental-strip-types src/server.ts` (indexer, 127.0.0.1:8787) | only ignored `apps/indexer/.data/monad-testnet.sqlite*` | server, not a source writer |
| 119895 | ~12.8 h | apps/retro-ui | `vite --port=3000 --host=0.0.0.0` (pnpm dev) | none | dev server on 0.0.0.0:3000 |
| 190447 | ~2.9 h | apps/retro-ui | second `vite --port=3000` (npm run dev), fell back to 0.0.0.0:3001 | none | dev server on 3001 |
| 88485 | ~14.6 h | apps/retro-ui | `vite preview --port 4173 --strictPort` serving apps/retro-ui/dist | none | preview server; dist was not rebuilt in place (section 10) |
| 169977 | ~3.3 h | repo root | kiro-cli autonomous (this campaign's orchestrator) | campaign paths only | campaign |

Newest file under apps/retro-ui/src: 2026-10-10 17:38:46 +07:00 (create-launch.tsx), about 2.5 h before capture; no apps/retro-ui/src file changed in the last 60 min. No `.git/index.lock`. The other worktrees' existence alone is not a conflict.

## 8. Tools and environment

| Tool | Version |
|---|---|
| OS | Linux 6.18.40.1-microsoft-standard-WSL2 x86_64 |
| node | v22.23.2 |
| pnpm | 11.25.0 |
| @playwright/test CLI (apps/retro-ui/node_modules/.bin/playwright) | 1.62.1 |
| vite | 8.3.4 |
| tsc | 5.9.3 |
| kiro-cli | 2.21.2 |
| git | 2.43.0 |
| GNU tar | 1.35 |
| Chromium (Playwright) | ~/.cache/ms-playwright/chromium-1234 and chromium_headless_shell-1234, both `INSTALLATION_COMPLETE` and `DEPENDENCIES_VALIDATED`, Google Chrome for Testing 151.0.7922.34 |

| Port | Status | Owner |
|---|---|---|
| 3000 | in use, 0.0.0.0 | vite dev pid 119895 (apps/retro-ui) |
| 3001 | in use, 0.0.0.0 | vite dev pid 190447 (apps/retro-ui, fallback from 3000) |
| 4173 | in use, 127.0.0.1 | vite preview pid 88485 |
| 4317 | FREE | reserved for the ui-fixture Playwright project (strictPort) |
| 5173 | free | |
| 8787 | in use, 127.0.0.1 | indexer pid 153008 |
| 8788 | free | vite proxy target for /api/referrals; referral service not running |
| 8789 | in use, 127.0.0.1 | wallet-bridge.mjs pid 137818 (signing bridge) |

Environment finding for FEAT-002: `apps/retro-ui/.env.local` (ignored) defines the keys `VITE_DATA_MODE`, `VITE_INDEXER_URL`, `VITE_MONAD_RPC_URL`, `VITE_MONAD_RPC_FALLBACK_URL`, `VITE_WALLET_BRIDGE_URL` (key names only; values not read). Vite loads `.env.local` in every mode, so the ui-fixture server on 4317 must neutralise these explicitly and the test must verify that DATA_MODE is `mock`, that no request goes to the indexer and that the session bridge is not active. Otherwise a "mock" run would use live data and could reach the signing bridge on 8789.

## 9. Branch decision

Not switched. Restore verification matched 100 percent, but a live interactive codex agent session (pid 204585) is attached to this worktree. Switching to `kimi/retro-ui-trading-product-redesign` would change the branch that session sees and would redirect any commit it makes. No file writes from it were observed, but it cannot be proven idle, so the conservative choice was taken. The branch can be created later, without file changes, with `git switch -c kimi/retro-ui-trading-product-redesign` once the user confirms that session is idle or closed; then re-run the guard and attribution tools to confirm the entry count and fingerprint are unchanged. No `kimi/*` branch exists.

## 10. Baseline gates (apps/retro-ui, BASE c41d35d plus the 153-entry delta)

| Gate | Command | Result | Log |
|---|---|---|---|
| typecheck | `pnpm --dir apps/retro-ui typecheck` (tsc --noEmit) | PASS, exit 0, 13.1 s | gate-typecheck.log |
| test | `pnpm --dir apps/retro-ui test` | PASS, 17 tests, 17 pass, 0 fail | gate-test.log |
| test:product | `pnpm --dir apps/retro-ui test:product` | PASS, 3 tests, 3 pass, 0 fail | gate-test-product.log |
| build | `pnpm --dir apps/retro-ui build --outDir /tmp/retropick-wave0-build-20261010T131134 --emptyOutDir` | PASS, exit 0, 2904 modules, vite "built in 721ms", 2.1 s wall | gate-build.log |

Build deviation: the real `build` script (`vite build`) was run with `--outDir` pointing outside the repo, because the running vite preview (pid 88485, :4173) serves `apps/retro-ui/dist`. The existing dist was left untouched (file list and sizes hash `f6bb7826...` identical before and after). The temporary outDir was deleted after measuring. The build read `apps/retro-ui/.env.local` like any normal build, so later "after" measurements must use the same environment to be comparable.

"Before" bundle baseline (`bundle-sizes-before.json`, raw bytes and zlib gzip level 9 per emitted file):

| Scope | Files | Raw bytes | Gzip bytes |
|---|---|---|---|
| All emitted files | 65 | 1754645 | 535590 |
| JavaScript | 60 | 1624974 | 483947 |
| CSS | 2 | 91085 | 18003 |
| index.html | 1 | 3476 | 1020 |
| Entry JS assets/index-Y8ZPlWt5.js | 1 | 203378 | 63955 |
| Entry CSS assets/index-Cd7UjCuY.css | 1 | 88475 | 17124 |

Largest chunks (raw / gzip): detail (Prediction, recharts) 366093 / 105614; queries 216516 / 54271; index 203378 / 63955; trading-chart (lightweight-charts) 179937 / 57543; localBatchGatewayRequest 108791 / 30601.

## 11. Forbidden-path guard and attribution

- `node apps/retro-ui/e2e/tools/guard-forbidden-paths.mjs <snapshot-dir>` (or `CAMPAIGN_BASELINE_DIR`): PASS, exit 0. 40 pre-existing forbidden-prefix entries (apps/indexer 10, packages/launchpad-sdk 29, apps/web 1), all byte-identical to the baseline (`guard-forbidden-paths.log`). Forbidden set: apps/web/, contracts/, packages/launchpad-sdk/, apps/indexer/, apps/abi/, deployments/, development/fullstack-integration/write-allowlist.md. It compares against BASE (not HEAD), so commits made after the baseline are caught too.
- Guard self-test on synthetic baseline copies in a private /tmp dir (`guard-selftest.log`): modified entry, new entry, reverted entry each FAIL with exit 1; tampered fingerprint and missing snapshot argument exit 2.
- `node apps/retro-ui/e2e/tools/attribute-changes.mjs <snapshot-dir>` classifies paths as CAMPAIGN_NEW, CAMPAIGN_MODIFIED_PREEXISTING, PREEXISTING_REVERTED, PREEXISTING_UNCHANGED (`attribute-changes.log`). The tools cannot tell a campaign edit from a concurrent non-campaign writer (for example the codex session in section 7); investigate before attributing.

## 12. Operations performed and not performed

- Not executed: git reset, git clean, git stash push/save, git checkout (any form), git switch, git commit, push, merge, PR creation, pnpm install, any signing or broadcasting, any scripts/e2e/live-*.mjs or wallet-bridge.mjs run.
- Repository writes besides new campaign files: one object set from `git stash create` and the ref `refs/campaign-baselines/20261010T131134/tracked`. The live .git/index sha256 was identical before and after capture.
- No pre-existing dirty path changed (attribution: CAMPAIGN_MODIFIED_PREEXISTING 0, PREEXISTING_REVERTED 0, PREEXISTING_UNCHANGED 153).
