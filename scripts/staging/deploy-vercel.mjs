#!/usr/bin/env node
// Deploy (or redeploy) the retro-ui Vercel STAGING project. Safe to re-run.
//
//   node scripts/staging/deploy-vercel.mjs [--sha <git-sha>] [--dry-run]
//
// Same-origin design (2026-10-12 live-data recovery): the browser bundle reads the indexer
// from the CANONICAL STAGING ORIGIN (`VITE_INDEXER_URL=<origin>` → fetch `<origin>/v1/*`).
// Vercel rewrites `/v1/*`, `/health`, `/api/referrals/*`, `/api/media/*` to the current
// quick-tunnel URL. A tunnel rotation therefore only changes the rendered rewrites — the
// compiled bundle never contains a trycloudflare hostname. (A rotation still needs a
// redeploy because rewrites ship with the deployment; the quick tunnel is NOT durable.)
//
// Steps:
//   1. read .staging/tunnel-url (written by the tunnel unit / start-backend.mjs)
//   2. create a CLEAN detached worktree at --sha (default: origin/main) under /tmp — never
//      deploy a dirty checkout — and render vercel.json there from vercel.template.json
//   3. link that worktree to the staging project (never the legacy retropick-metropolis app)
//   4. upsert public VITE_* env vars ONLY when their value changed (state in .staging/vercel-env.json)
//   5. vercel deploy --prod (the staging project's own *.vercel.app domain)
//   6. record deployment URL + source SHA in .staging/staging-deploy.json
//
// No secrets are involved: every value here is public-by-design (VITE_* / public RPC).
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const runDir = resolve(repo, '.staging');
const PROJECT = process.env.STAGING_PROJECT ?? 'retropick-metropolis-retro-ui-staging';
const ORIGIN = (process.env.STAGING_ORIGIN ?? 'https://retropick-metropolis-retro-ui-stagi.vercel.app').replace(/\/$/, '');
const LEGACY = 'retropick-metropolis';
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1]; };
const DRY = args.includes('--dry-run');

function sh(cmd, argv, opts = {}) {
  return execFileSync(cmd, argv, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
}

/** Pure: render the deployment's vercel.json for a tunnel URL. Exported for tests. */
export function renderVercelJson(template, tunnelUrl) {
  if (!/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$|^https:\/\/[a-z0-9.-]+$/i.test(tunnelUrl)) throw new Error(`refusing to render: bad tunnel URL ${tunnelUrl}`);
  const rendered = JSON.parse(template.replaceAll('TUNNEL_URL', tunnelUrl));
  const sources = rendered.rewrites.map((r) => r.source);
  if (sources.at(-1) !== '/(.*)') throw new Error('SPA catch-all must be the LAST rewrite');
  for (const required of ['/v1/:path*', '/health', '/api/referrals/:path*', '/api/media/:path*']) if (!sources.includes(required)) throw new Error(`missing rewrite ${required}`);
  return JSON.stringify(rendered, null, 2) + '\n';
}

/** Pure: public build env for the bundle. The indexer base is the canonical origin, never the tunnel. */
export function publicEnv(origin) {
  if (!/^https:\/\/[^/]+$/.test(origin)) throw new Error(`STAGING_ORIGIN must be an absolute https origin without path: ${origin}`);
  return [
    ['VITE_DATA_MODE', 'live'],
    ['VITE_INDEXER_URL', origin],
    ['VITE_MONAD_RPC_FALLBACK_URL', 'https://testnet-rpc.monad.xyz'],
  ];
}

async function upsertEnv(cwd, key, value, target) {
  const ls = () => sh('vercel', ['env', 'ls', target], { cwd });
  let existing = '';
  try { existing = ls(); } catch (error) { console.error(`env ${key} (${target}): 'vercel env ls' FAILED — aborting: ${String(error).slice(0, 160)}`); process.exit(1); }
  if (existing.split('\n').some((line) => line.trim().startsWith(key + ' '))) {
    sh('vercel', ['env', 'rm', key, target, '--yes'], { cwd });
    console.log(`env ${key} (${target}): removed stale value`);
  }
  // Vercel env writes propagate asynchronously — verify with bounded retries.
  for (let attempt = 1; attempt <= 5; attempt++) {
    try { sh('vercel', ['env', 'add', key, target], { cwd, input: value + '\n' }); }
    catch (error) { if (!/already exists|ENVIRONMENT_VARIABLE_ALREADY_EXISTS/i.test(String(error))) { console.error(`env ${key} (${target}): add FAILED: ${String(error).slice(0, 160)}`); process.exit(1); } }
    for (let wait = 0; wait < 4; wait++) {
      await new Promise((r) => setTimeout(r, 1500 * (wait + 1)));
      let after = ''; try { after = ls(); } catch { /* retry */ }
      if (after.split('\n').some((line) => line.trim().startsWith(key + ' '))) { console.log(`env ${key} (${target}): set + verified`); return; }
    }
    console.log(`env ${key} (${target}): attempt ${attempt} not visible yet — retrying`);
  }
  console.error(`env ${key} (${target}): verification FAILED after retries`); process.exit(1);
}

async function main() {
  if (PROJECT === LEGACY) { console.error('refusing: legacy production project'); process.exit(1); }
  const tunnelPath = resolve(runDir, 'tunnel-url');
  if (!existsSync(tunnelPath)) { console.error('missing .staging/tunnel-url — start the tunnel first'); process.exit(1); }
  const tunnelUrl = readFileSync(tunnelPath, 'utf8').trim().replace(/\/$/, '');
  const vercelJson = renderVercelJson(readFileSync(resolve(here, 'vercel.template.json'), 'utf8'), tunnelUrl);
  // Source SHA: explicit --sha, else the SHA of the last staging deploy (tunnel-rotation
  // redeploys must not silently ship new code), else origin/main.
  const lastPath = resolve(runDir, 'staging-deploy.json');
  const last = existsSync(lastPath) ? JSON.parse(readFileSync(lastPath, 'utf8')) : null;
  const sha = sh('git', ['rev-parse', flag('--sha') ?? last?.sourceSha ?? 'origin/main']);
  console.log(`tunnel: ${tunnelUrl}\norigin: ${ORIGIN}\nsource sha: ${sha}`);
  if (DRY) { console.log(vercelJson); return; }

  // Clean, SHA-pinned worktree (never the dirty dev checkout).
  const dir = `/tmp/retro-staging-release-${sha.slice(0, 12)}`;
  if (!existsSync(dir)) sh('git', ['worktree', 'add', '--detach', dir, sha]);
  if (sh('git', ['status', '--porcelain=v1', '--untracked-files=no'], { cwd: dir })) { console.error(`worktree ${dir} is dirty — refusing`); process.exit(1); }
  mkdirSync(resolve(dir, '.vercel'), { recursive: true });
  copyFileSync(resolve(repo, '.vercel/project.json'), resolve(dir, '.vercel/project.json'));
  const linked = JSON.parse(readFileSync(resolve(dir, '.vercel/project.json'), 'utf8'));
  if (linked.projectName !== PROJECT) { console.error(`linked project is ${linked.projectName}, expected ${PROJECT} — refusing`); process.exit(1); }
  writeFileSync(resolve(dir, 'vercel.json'), vercelJson);

  // Env: only rotate when the public value actually changed.
  const statePath = resolve(runDir, 'vercel-env.json');
  const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : {};
  for (const [key, value] of publicEnv(ORIGIN)) {
    for (const target of ['production', 'preview']) {
      const id = `${key}:${target}`;
      if (state[id] === value) { console.log(`env ${key} (${target}): unchanged`); continue; }
      await upsertEnv(dir, key, value, target);
      state[id] = value;
      writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');
    }
  }

  console.log('deploying (prod target of the STAGING project — its own *.vercel.app domain)…');
  const url = sh('vercel', ['deploy', '--prod', '--yes'], { cwd: dir });
  const record = { url, origin: ORIGIN, sourceSha: sha, tunnelUrl, deployedAt: new Date().toISOString() };
  writeFileSync(resolve(runDir, 'staging-deploy.json'), JSON.stringify(record, null, 2) + '\n');
  writeFileSync(resolve(runDir, 'staging-url'), ORIGIN + '\n');
  console.log(`\ndeployment: ${url}\nalias: ${ORIGIN}`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
