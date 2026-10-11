#!/usr/bin/env node
// Non-destructive restore verification for the Wave 0 baseline (FEAT-001, decision B2).
// Rebuilds BASE_HEAD_SHA + staged.patch + unstaged.patch + untracked.tar.gz in a private scratch dir under /tmp,
// compares every baseline path byte-for-byte (sha256) with the live workspace, then deletes the scratch dir.
// It never writes to the live workspace, its index, or its refs. It never prints file contents.
// Usage: node verify-restore.mjs <snapshot-dir> <repo-root>
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync, rmSync, lstatSync, readlinkSync, copyFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const [snap, repo] = process.argv.slice(2);
if (!snap || !repo) { console.error('usage: verify-restore.mjs <snapshot-dir> <repo-root>'); process.exit(2); }
process.umask(0o077);
const manifest = JSON.parse(readFileSync(join(snap, 'manifest.json'), 'utf8'));
const TS = manifest.TS;
const BASE = manifest.BASE_HEAD_SHA;
const scratch = `/tmp/retropick-restore-verify-${TS}`;
const tree = join(scratch, 'tree');
const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_CEILING_DIRECTORIES: '/tmp' };
delete env.GIT_DIR; delete env.GIT_WORK_TREE; delete env.GIT_INDEX_FILE;

const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const hashAt = (root, rel) => {
  const abs = join(root, rel);
  let st; try { st = lstatSync(abs); } catch { return { h: 'DELETED', x: null }; }
  if (st.isSymbolicLink()) return { h: 'symlink:' + sha256(readlinkSync(abs)), x: null };
  if (st.isDirectory()) return { h: 'DIRECTORY', x: null };
  return { h: sha256(readFileSync(abs)), x: (st.mode & 0o100) !== 0 };
};
const log = [];
const out = (s) => { log.push(s); console.log(s); };
let failed = false;

// 1. Artifact integrity against manifest.
let integrityOk = 0; const integrityBad = [];
for (const [f, info] of Object.entries(manifest.artifacts)) {
  const h = sha256(readFileSync(join(snap, f)));
  if (h === info.sha256) integrityOk++; else integrityBad.push(f);
}
out(`artifact integrity: ${integrityOk} of ${Object.keys(manifest.artifacts).length} artifacts match manifest sha256` + (integrityBad.length ? ` MISMATCH: ${integrityBad.join(', ')}` : ''));
if (integrityBad.length) failed = true;

if (existsSync(scratch)) { console.error(`scratch dir already exists: ${scratch} (refusing to reuse)`); process.exit(3); }
try {
  mkdirSync(tree, { recursive: true, mode: 0o700 });
  // 2. Base tree from the object database (read-only on the live repo).
  const arch = spawnSync('bash', ['-c', 'set -o pipefail; git -C "$REPO" archive --format=tar "$BASE" | tar -x -C "$TREE"'],
    { env: { ...env, REPO: repo, BASE, TREE: tree }, stdio: ['ignore', 'pipe', 'pipe'] });
  if (arch.status !== 0) throw new Error('git archive failed: ' + arch.stderr.toString());
  const inRepo = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: tree, env });
  if (inRepo.status === 0) throw new Error('scratch tree is unexpectedly inside a git repository; refusing to apply');
  out(`scratch: ${scratch} (git archive ${BASE})`);

  // 3. Apply staged then unstaged patches, then extract untracked files.
  for (const p of ['staged.patch', 'unstaged.patch']) {
    const abs = join(snap, p);
    if (statSync(abs).size === 0) { out(`apply ${p}: empty patch (no changes of this kind), skipped`); continue; }
    execFileSync('git', ['apply', '--binary', '--whitespace=nowarn', abs], { cwd: tree, env, stdio: ['ignore', 'pipe', 'pipe'] });
    out(`apply ${p}: OK`);
  }
  execFileSync('tar', ['-xzf', join(snap, 'untracked.tar.gz'), '-C', tree], { stdio: ['ignore', 'pipe', 'pipe'] });
  out('extract untracked.tar.gz: OK');

  // 4. Compare every baseline path: scratch vs live vs recorded fingerprint.
  const fp = readFileSync(join(snap, 'baseline-fingerprint.txt'), 'utf8').split('\n').filter(Boolean)
    .map((l) => { const i = l.lastIndexOf(' '); return { path: l.slice(0, i), h: l.slice(i + 1) }; });
  let matched = 0; const mismatches = [];
  for (const { path, h } of fp) {
    const s = hashAt(tree, path), l = hashAt(repo, path);
    if (s.h === l.h && s.h === h && s.x === l.x) matched++;
    else mismatches.push(`${path} scratch=${s.h.slice(0, 12)} live=${l.h.slice(0, 12)} baseline=${h.slice(0, 12)} xbit=${s.x}/${l.x}`);
  }
  out(`baseline paths (dirty tracked + untracked): matched ${matched} of ${fp.length}`);
  for (const m of mismatches) out(`  MISMATCH ${m}`);
  if (mismatches.length) failed = true;

  // 5. Whole tracked tree (excluding submodule gitlinks): scratch vs live.
  const ls = execFileSync('git', ['-C', repo, 'ls-files', '-s', '-z'], { env }).toString('utf8').split('\0').filter(Boolean);
  let tMatched = 0, tTotal = 0; const tMis = [];
  for (const rec of ls) {
    const [meta, path] = rec.split('\t');
    if (meta.startsWith('160000')) continue;
    tTotal++;
    const s = hashAt(tree, path), l = hashAt(repo, path);
    if (s.h === l.h && s.x === l.x) tMatched++; else tMis.push(path);
  }
  out(`full tracked tree (non-gitlink): matched ${tMatched} of ${tTotal}`);
  for (const m of tMis) out(`  TRACKED MISMATCH ${m}`);
  if (tMis.length) failed = true;

  // 6. Index copy: same stage listing as the live index, and reproduces staged.patch.
  const idx = join(scratch, 'index.copy');
  copyFileSync(join(snap, 'index.copy'), idx);
  const liveLs = sha256(execFileSync('git', ['-C', repo, 'ls-files', '-s'], { env }));
  const copyLs = sha256(execFileSync('git', ['-C', repo, 'ls-files', '-s'], { env: { ...env, GIT_INDEX_FILE: idx } }));
  out(`index.copy stage listing == live index stage listing: ${liveLs === copyLs}`);
  const DIFF = ['--binary', '--no-ext-diff', '--no-textconv', '--no-color', '--no-renames', '--no-relative', '--src-prefix=a/', '--dst-prefix=b/', '--submodule=short'];
  const stagedFromCopy = execFileSync('git', ['-C', repo, 'diff', '--cached', ...DIFF], { env: { ...env, GIT_INDEX_FILE: idx } });
  const stagedOk = sha256(stagedFromCopy) === sha256(readFileSync(join(snap, 'staged.patch')));
  out(`index.copy reproduces staged.patch: ${stagedOk}`);
  if (liveLs !== copyLs || !stagedOk) failed = true;

  // 7. Extra object reference from `git stash create` (tracked changes only).
  if (manifest.stash_create_sha && manifest.stash_create_sha !== '(none)') {
    const fromStash = execFileSync('git', ['-C', repo, 'diff', ...DIFF, `${manifest.stash_create_sha}^1`, manifest.stash_create_sha], { env });
    const live = execFileSync('git', ['-C', repo, 'diff', ...DIFF, 'HEAD'], { env });
    const ok = sha256(fromStash) === sha256(live) && sha256(fromStash) === sha256(readFileSync(join(snap, 'unstaged.patch')));
    out(`stash-create object ${manifest.stash_create_sha.slice(0, 12)} reproduces tracked delta: ${ok}`);
    if (!ok) failed = true;
  }
} catch (e) {
  failed = true;
  out('ERROR: ' + e.message);
} finally {
  rmSync(scratch, { recursive: true, force: true });
  out(`scratch removed: ${!existsSync(scratch)}`);
}
out(failed ? 'RESTORE VERIFICATION: FAIL' : 'RESTORE VERIFICATION: PASS');
process.exit(failed ? 1 : 0);
