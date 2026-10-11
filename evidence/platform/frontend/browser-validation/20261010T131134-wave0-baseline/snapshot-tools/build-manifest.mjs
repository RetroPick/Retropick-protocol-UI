#!/usr/bin/env node
// Builds baseline-fingerprint.txt, secrets-inventory.txt, entries.tsv and manifest.json for the Wave 0 baseline.
// Never prints file contents. Usage: node build-manifest.mjs <snapshot-dir> <repo-root>
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, lstatSync, readlinkSync, existsSync, statSync, readdirSync, chmodSync } from 'node:fs';
import { join, basename } from 'node:path';

const [snap, repo] = process.argv.slice(2);
if (!snap || !repo) { console.error('usage: build-manifest.mjs <snapshot-dir> <repo-root>'); process.exit(2); }
const CAMPAIGN_PREFIX = '.agents/tasks/task-retro-ui-trading-redesign/';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const hashPath = (rel) => {
  const abs = join(repo, rel);
  let st; try { st = lstatSync(abs); } catch { return 'DELETED'; }
  if (st.isSymbolicLink()) return 'symlink:' + sha256(readlinkSync(abs));
  if (st.isDirectory()) return 'DIRECTORY';
  return sha256(readFileSync(abs));
};

// Parse porcelain v2 -z (types 1, 2, u, ?).
function parseStatusZ(buf) {
  const parts = buf.toString('utf8').split('\0');
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const rec = parts[i];
    if (!rec || rec.startsWith('#')) continue;
    const t = rec[0];
    if (t === '1') { const f = rec.split(' '); out.push({ type: '1', xy: f[1], path: f.slice(8).join(' ') }); }
    else if (t === '2') { const f = rec.split(' '); out.push({ type: '2', xy: f[1], path: f.slice(9).join(' '), orig: parts[++i] }); }
    else if (t === 'u') { const f = rec.split(' '); out.push({ type: 'u', xy: f[1], path: f.slice(10).join(' ') }); }
    else if (t === '?') out.push({ type: '?', xy: '??', path: rec.slice(2) });
    else if (t === '!') out.push({ type: '!', xy: '!!', path: rec.slice(2) });
  }
  return out;
}

const status = parseStatusZ(readFileSync(join(snap, 'status-porcelain-v2.z')));
const preexisting = status.filter((e) => !e.path.startsWith(CAMPAIGN_PREFIX));
const campaign = status.filter((e) => e.path.startsWith(CAMPAIGN_PREFIX));

const group = (p) => {
  if (/^\.(cursor|v2c|video_agent|zcode)\//.test(p)) return 'agent-tooling';
  if (p.startsWith('apps/retro-ui/')) return 'retro-ui-frontend';
  if (p.startsWith('packages/launchpad-sdk/')) return 'launchpad-sdk';
  if (p.startsWith('apps/indexer/')) return 'indexer';
  if (p.startsWith('apps/referral-service/')) return 'referral-service';
  if (p.startsWith('apps/web/')) return 'apps-web (forbidden prefix)';
  if (p.startsWith('evidence/')) return 'evidence';
  if (p.startsWith('scripts/')) return 'scripts';
  if (p.startsWith('docs/') || p.startsWith('development/')) return 'docs-development';
  return 'other-root';
};

// Fingerprint: sorted "<path> <sha256>" for every pre-existing dirty tracked and untracked path.
const fpLines = preexisting.map((e) => `${e.path} ${hashPath(e.path)}`).sort();
const fpText = fpLines.join('\n') + '\n';
writeFileSync(join(snap, 'baseline-fingerprint.txt'), fpText, { mode: 0o600 });
const fingerprint = sha256(fpText);
writeFileSync(join(snap, 'baseline-fingerprint.sha256'), fingerprint + '\n', { mode: 0o600 });

// Entries table (type, XY, group, path) without content.
writeFileSync(join(snap, 'entries.tsv'),
  ['type\txy\tgroup\tpath', ...preexisting.map((e) => `${e.type}\t${e.xy}\t${group(e.path)}\t${e.path}`)].join('\n') + '\n', { mode: 0o600 });

// Campaign files present at baseline (hashes only; they are expected to change).
const campaignLines = campaign.map((e) => `${e.path} ${hashPath(e.path)}`).sort();
writeFileSync(join(snap, 'campaign-files-at-baseline.txt'), campaignLines.join('\n') + '\n', { mode: 0o600 });

// Secrets inventory: path + sha256 only, never contents.
const secretRe = /(^|\/)(\.env[^/]*|[^/]*key[^/]*|[^/]*secret[^/]*|[^/]*credential[^/]*|[^/]*\.pem|mcp\.json[^/]*)$/i;
const ignored = readFileSync(join(snap, 'ignored-present.txt'), 'utf8').split('\n').filter(Boolean);
const candidates = new Set(preexisting.map((e) => e.path).filter((p) => secretRe.test(p)));
const skipDirs = /(^|\/)(node_modules|dist|\.next|\.vinext|\.wrangler|out|cache|__pycache__|\.data)\/$/;
const walk = (rel, depth) => {
  if (depth > 4) return;
  let ents; try { ents = readdirSync(join(repo, rel), { withFileTypes: true }); } catch { return; }
  for (const d of ents) {
    const r = rel + d.name + (d.isDirectory() ? '/' : '');
    if (d.isDirectory()) { if (!skipDirs.test(r)) walk(r, depth + 1); }
    else if (secretRe.test(r)) candidates.add(r);
  }
};
for (const p of ignored) {
  if (p.endsWith('/')) { if (!skipDirs.test(p)) walk(p, 0); }
  else if (secretRe.test(p)) candidates.add(p);
}
const secretLines = [...candidates].sort().map((p) => {
  const tracked = preexisting.some((e) => e.path === p) ? 'untracked-preexisting(archived-in-untracked.tar.gz)' : 'ignored(not-archived)';
  return `${p} ${hashPath(p)} ${tracked}`;
});
writeFileSync(join(snap, 'secrets-inventory.txt'),
  '# Likely-secret paths: path, sha256 of content, disposition. Contents never read into logs.\n' + secretLines.join('\n') + '\n', { mode: 0o600 });

// Manifest.
const artifacts = readdirSync(snap).filter((f) => statSync(join(snap, f)).isFile() && f !== 'manifest.json').sort();
const artifactInfo = Object.fromEntries(artifacts.map((f) => {
  const b = readFileSync(join(snap, f));
  return [f, { sha256: sha256(b), bytes: b.length }];
}));
const count = (pred) => preexisting.filter(pred).length;
const groups = {};
for (const e of preexisting) { const g = group(e.path); groups[g] = groups[g] || { tracked: 0, untracked: 0 }; groups[g][e.type === '?' ? 'untracked' : 'tracked']++; }
const read = (f) => readFileSync(join(snap, f), 'utf8').trim();
const manifest = {
  campaign: 'task-retro-ui-trading-redesign', feature: 'FEAT-001', decision: 'B2',
  TS: basename(snap), snapshot_dir: snap, repo_root: repo,
  BASE_HEAD_SHA: read('head.txt'), branch: read('branch.txt'),
  campaign_prefix_excluded_from_baseline: CAMPAIGN_PREFIX,
  counts: {
    porcelain_entries_total_at_capture: status.length,
    preexisting_entries: preexisting.length,
    campaign_entries_at_capture: campaign.length,
    by_type: { '1': count((e) => e.type === '1'), '2': count((e) => e.type === '2'), u: count((e) => e.type === 'u'), '?': count((e) => e.type === '?') },
    tracked_staged: count((e) => e.type !== '?' && e.xy[0] !== '.'),
    tracked_unstaged: count((e) => e.type !== '?' && e.xy[1] !== '.'),
    by_xy: preexisting.reduce((a, e) => ((a[e.xy] = (a[e.xy] || 0) + 1), a), {}),
    groups,
  },
  stash_create_sha: read('stash-create-sha.txt'),
  stash_create_ref: `refs/campaign-baselines/${basename(snap)}/tracked`,
  stash_list_sha_at_capture: read('stash-list-sha.txt'),
  live_index_sha256: read('live-index.sha256.before'),
  untracked_preexisting_list_sha256: artifactInfo['untracked-preexisting.list.z'].sha256,
  baseline_fingerprint_sha256: fingerprint,
  fingerprint_algorithm: 'sha256 over sorted lines "<path> <sha256-of-raw-file-bytes>" (DELETED / symlink:<sha256(target)> for special cases), newline-terminated',
  artifacts: artifactInfo,
};
writeFileSync(join(snap, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
for (const f of readdirSync(snap)) chmodSync(join(snap, f), 0o600);
console.log(JSON.stringify({ fingerprint, preexisting: preexisting.length, campaign: campaign.length, secrets: secretLines.length, groups }, null, 1));
