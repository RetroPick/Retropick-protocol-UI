#!/usr/bin/env bash
# Wave 0 preservation baseline capture (campaign task-retro-ui-trading-redesign, FEAT-001, decision B2).
# Read-only with respect to the working tree, the index content and stash@{0}.
# Never prints file contents. Never runs reset/clean/stash push/checkout.
set -euo pipefail
umask 077

TS="${TS:?TS required}"
REPO="${REPO:-/home/ubuntu/project/retropick/retropick-protocol}"
SNAP="${SNAP:-/home/ubuntu/project/retropick/.retropick-campaign-baselines/$TS}"
CAMPAIGN_PREFIX=".agents/tasks/task-retro-ui-trading-redesign/"
export GIT_OPTIONAL_LOCKS=0   # do not opportunistically rewrite .git/index during read commands

cd "$REPO"
mkdir -p "$SNAP"

GIT_DIR_ABS="$(git rev-parse --absolute-git-dir)"
sha256sum "$GIT_DIR_ABS/index" | awk '{print $1}' > "$SNAP/live-index.sha256.before"

# 1. Index first (read-only copy of the real index, staged state).
cp --preserve=timestamps "$GIT_DIR_ABS/index" "$SNAP/index.copy"

# 2. Git metadata.
git rev-parse HEAD > "$SNAP/head.txt"
git branch --show-current > "$SNAP/branch.txt"
git status --porcelain=v2 --branch --untracked-files=all -z > "$SNAP/status-porcelain-v2.z"
git status --porcelain=v2 --branch --untracked-files=all > "$SNAP/status-porcelain-v2.txt"
git worktree list --porcelain > "$SNAP/worktrees.txt"
git stash list > "$SNAP/stash-list.txt"
git stash list --format='%gd %H %gs' > "$SNAP/stash-list-sha.txt"
git for-each-ref --format='%(refname) %(objectname)' > "$SNAP/refs.txt"
{ git config --get core.hooksPath || echo "(unset)"; } > "$SNAP/core-hooksPath.txt"
git submodule status > "$SNAP/submodule-status.txt" 2>&1 || true

# 3. Tracked changes (no index or worktree mutation).
DIFF_FLAGS=(--binary --no-ext-diff --no-textconv --no-color --no-renames --no-relative --src-prefix=a/ --dst-prefix=b/ --submodule=short)
git diff "${DIFF_FLAGS[@]}" > "$SNAP/unstaged.patch"
git diff --cached "${DIFF_FLAGS[@]}" > "$SNAP/staged.patch"
git diff --name-status --no-renames > "$SNAP/unstaged-name-status.txt"
git diff --cached --name-status --no-renames > "$SNAP/staged-name-status.txt"

# 4. Untracked files: pre-existing set (excludes the campaign task dir) and campaign set.
git ls-files --others --exclude-standard -z > "$SNAP/untracked-all.list.z"
node -e '
const fs=require("fs");const [src,pre,camp,prefix]=process.argv.slice(1);
const all=fs.readFileSync(src,"utf8").split("\0").filter(Boolean).sort();
const p=all.filter(x=>!x.startsWith(prefix)), c=all.filter(x=>x.startsWith(prefix));
fs.writeFileSync(pre,p.map(x=>x+"\0").join(""));fs.writeFileSync(camp,c.map(x=>x+"\0").join(""));
' "$SNAP/untracked-all.list.z" "$SNAP/untracked-preexisting.list.z" "$SNAP/untracked-campaign.list.z" "$CAMPAIGN_PREFIX"
tr '\0' '\n' < "$SNAP/untracked-preexisting.list.z" > "$SNAP/untracked-preexisting.list.txt"
tr '\0' '\n' < "$SNAP/untracked-campaign.list.z" > "$SNAP/untracked-campaign.list.txt"
tar --null -T "$SNAP/untracked-preexisting.list.z" -czf "$SNAP/untracked.tar.gz"
tar -tzf "$SNAP/untracked.tar.gz" | sort > "$SNAP/untracked-tar-listing.txt"

# 5. Ignored-but-present files: metadata only (paths), never archived.
git ls-files --others --ignored --exclude-standard --directory > "$SNAP/ignored-present.txt"

# 6. Extra in-repo object reference for tracked changes (does not touch worktree, index content or refs/stash).
STASH_SHA="$(git stash create "campaign-baseline $TS tracked changes (FEAT-001)" || true)"
echo "${STASH_SHA:-(none)}" > "$SNAP/stash-create-sha.txt"
if [ -n "$STASH_SHA" ]; then git update-ref "refs/campaign-baselines/$TS/tracked" "$STASH_SHA"; fi

git stash list --format='%gd %H %gs' > "$SNAP/stash-list-sha.after.txt"
sha256sum "$GIT_DIR_ABS/index" | awk '{print $1}' > "$SNAP/live-index.sha256.after"
git ls-files -s | sha256sum | awk '{print $1}' > "$SNAP/live-index-stage-listing.sha256"
GIT_INDEX_FILE="$SNAP/index.copy" git ls-files -s | sha256sum | awk '{print $1}' > "$SNAP/index-copy-stage-listing.sha256"

chmod 600 "$SNAP"/*
echo "capture complete: $SNAP"
