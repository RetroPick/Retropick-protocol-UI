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
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, renameSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stagingReady } from './readiness.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const runDir = resolve(repo, '.staging');
const PROJECT = process.env.STAGING_PROJECT ?? 'retropick-metropolis-retro-ui-staging';
const ORIGIN = (process.env.STAGING_ORIGIN ?? 'https://retropick-metropolis-retro-ui-stagi.vercel.app').replace(/\/$/, '');
const LEGACY = 'retropick-metropolis';
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1]; };
const DRY = args.includes('--dry-run');
const CANDIDATE = args.includes('--candidate');

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
    ['VITE_INDEXER_URL', 'same-origin'],
    ['VITE_MONAD_RPC_FALLBACK_URL', 'https://rpc.ankr.com/monad_testnet'],
  ];
}

export function deploymentUrl(output) {
  let value;
  try { value = JSON.parse(output); } catch { value = null; }
  const candidate = value?.deployment?.url ?? output.trim();
  if (!/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(candidate)) throw Error('Vercel did not return a valid deployment URL.');
  return candidate;
}

/** Stable VPS origins take precedence over the rotating workstation tunnel. */
export function backendOrigin(requested, pinned, quick) {
  const value = (requested ?? pinned ?? quick)?.trim().replace(/\/$/, '');
  if (!value || !/^https:\/\/[a-z0-9.-]+$/i.test(value)) throw Error('Expected a public HTTPS backend origin without credentials, port, path, or query.');
  return value;
}

async function upsertEnv(cwd, key, value, target) {
  const ls = () => sh('vercel', ['env', 'ls', target, '--scope', process.env.STAGING_VERCEL_SCOPE ?? 'asyams-projects'], { cwd });
  // Single idempotent write (CLI ≥ 62: --value/--force/--non-interactive). The earlier
  // rm→add(stdin) sequence hung or silently dropped values on CLI 62.1 (observed 2026-10-12).
  try { sh('vercel', ['env', 'add', key, target, '--value', value, '--no-sensitive', '--yes', '--force', '--non-interactive', '--scope', process.env.STAGING_VERCEL_SCOPE ?? 'asyams-projects'], { cwd, timeout: 60_000 }); }
  catch (error) { throw Error(/not authorized|unauthorized|forbidden/i.test(String(error.stderr ?? error.message)) ? 'Staging environment authorization blocked.' : `Public environment write failed for ${key}.`); }
  // Vercel env writes propagate asynchronously — verify presence with bounded retries.
  for (let wait = 0; wait < 6; wait++) {
    let after = ''; try { after = ls(); } catch { /* retry */ }
    if (after.split('\n').some((line) => line.trim().startsWith(key + ' '))) { console.log(`env ${key} (${target}): set + verified present`); return; }
    await new Promise((r) => setTimeout(r, 2000 * (wait + 1)));
  }
  throw Error(`Public environment presence verification failed for ${key}.`);
}

async function main() {
  if (PROJECT === LEGACY || PROJECT !== 'retropick-metropolis-retro-ui-staging') throw Error('Refusing: not the authorized staging project.');
  const tunnelPath = resolve(runDir, 'tunnel-url');
  const pinnedPath = resolve(runDir, 'backend-origin');
  const requestedBackend = flag('--backend-origin') ?? process.env.STAGING_BACKEND_ORIGIN;
  const pinnedBackend = existsSync(pinnedPath) ? readFileSync(pinnedPath, 'utf8') : null;
  const tunnelUrl = backendOrigin(requestedBackend, pinnedBackend, existsSync(tunnelPath) ? readFileSync(tunnelPath, 'utf8') : null);
  const backendMode = requestedBackend || pinnedBackend ? 'stable' : 'quick-tunnel';
  const vercelJson = renderVercelJson(readFileSync(resolve(here, 'vercel.template.json'), 'utf8'), tunnelUrl);
  // Source SHA: explicit --sha, else the SHA of the last staging deploy (tunnel-rotation
  // redeploys must not silently ship new code), else origin/main.
  const lastPath = resolve(runDir, 'staging-deploy.json');
  const last = existsSync(lastPath) ? JSON.parse(readFileSync(lastPath, 'utf8')) : null;
  const sha = sh('git', ['rev-parse', flag('--sha') ?? last?.sourceSha ?? 'origin/main']);
  console.log(`tunnel: ${tunnelUrl}\norigin: ${ORIGIN}\nsource sha: ${sha}`);
  if (DRY) { console.log(vercelJson); return; }
  if (!await stagingReady(tunnelUrl)) throw Error('Backend not ready: verify public HTTPS, current chain head and published indexer projection before deploying.');

  // Clean, SHA-pinned worktree (never the dirty dev checkout). /tmp can be cleared between
  // runs while git still has the worktree registered — prune stale registrations first and
  // force re-add so tunnel-rotation redeploys never crash on a vanished worktree dir.
  const dir = `/tmp/retro-staging-release-${sha.slice(0, 12)}`;
  try { sh('git', ['worktree', 'prune']); } catch { /* best effort */ }
  if (existsSync(resolve(dir, '.git')) && sh('git', ['status', '--porcelain=v1', '--untracked-files=no'], { cwd: dir })) throw Error('Release worktree contains tracked edits; preserve it and use another path.');
  if (!existsSync(resolve(dir, '.git'))) {
    sh('git', ['worktree', 'add', '--detach', dir, sha]);
  }
  if (sh('git', ['status', '--porcelain=v1', '--untracked-files=no'], { cwd: dir })) throw Error('Release worktree contains tracked changes.');
  mkdirSync(resolve(dir, '.vercel'), { recursive: true });
  copyFileSync(resolve(repo, '.vercel/project.json'), resolve(dir, '.vercel/project.json'));
  const linked = JSON.parse(readFileSync(resolve(dir, '.vercel/project.json'), 'utf8'));
  if (linked.projectName !== PROJECT || linked.projectId !== 'prj_dKwt5xQUlhZg6shbOWyFvZbZXSIO' || linked.orgId !== 'team_wDDjfSztM78LKthTsosnF3qw') throw Error('Linked staging project identity mismatch.');
  writeFileSync(resolve(dir, 'vercel.json'), vercelJson);
  mkdirSync(resolve(dir, 'apps/retro-ui/public'), { recursive: true });
  writeFileSync(resolve(dir, 'apps/retro-ui/public/release.json'), JSON.stringify({ sourceSha: sha, chainId: 10143 }) + '\n');

  if (CANDIDATE) {
    // Build production artifacts without moving ANY existing domain or changing
    // project environment values. This is the reviewable pre-cutover release.
    const scope = process.env.STAGING_VERCEL_SCOPE ?? 'asyams-projects';
    const inspect = target => JSON.parse(sh('vercel', ['inspect', target, '--scope', scope, '--json'], { cwd: dir, timeout: 30000 }));
    const previous = inspect(ORIGIN);
    const buildEnv = publicEnv(ORIGIN).flatMap(([key, value]) => ['--build-env', `${key}=${value}`]);
    const url = deploymentUrl(sh('vercel', ['deploy', '--prod', '--skip-domain', '--yes', '--scope', scope, ...buildEnv], { cwd: dir, timeout: 600000 }));
    // Unique production candidates can be protected even when the public alias
    // is open. Use the authenticated CLI; never disable deployment protection.
    const candidateFetch = async target => new Response(sh('vercel', ['curl', new URL(target).pathname + new URL(target).search, '--deployment', url, '--scope', scope, '--', '--fail', '--silent', '--show-error', '--max-time', '15'], { cwd: dir, timeout: 30000 }), { status: 200 });
    const release = await candidateFetch(url + '/release.json').then(response => response.json());
    const deployment = inspect(url);
    if (release.sourceSha !== sha || deployment.name !== PROJECT || deployment.readyState !== 'READY' || !await stagingReady(url, candidateFetch)) throw Error('Candidate deployment verification failed.');
    if (inspect(ORIGIN).id !== previous.id) throw Error('Canonical staging alias changed while validating candidate; inspect before proceeding.');
    const record = { url, sourceSha: sha, backendOrigin: tunnelUrl, candidate: true, promoted: false, canonicalDeploymentId: previous.id, deployedAt: new Date().toISOString() };
    writeFileSync(resolve(runDir, 'candidate-deploy.json'), JSON.stringify(record, null, 2) + '\n');
    console.log(`candidate: ${url}\nsource sha: ${sha}\nexisting domains retained`);
    return;
  }

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
  const scope = process.env.STAGING_VERCEL_SCOPE ?? 'asyams-projects';
  const url = deploymentUrl(sh('vercel', ['deploy', '--prod', '--yes', '--scope', scope], { cwd: dir, timeout: 600_000 }));
  // Do not publish local success state until the public alias serves this exact
  // release and both projection endpoints are ready through its rewrites.
  let verified = false;
  for (let attempt = 0; attempt < 12 && !verified; attempt++) {
    try {
      const [releaseResponse, ready] = await Promise.all([fetch(ORIGIN + '/release.json', { cache: 'no-store', signal: AbortSignal.timeout(10000) }), stagingReady(ORIGIN)]);
      if (!releaseResponse.ok || !ready) throw Error('Alias not ready');
      const release = await releaseResponse.json();
      const deployment = JSON.parse(sh('vercel', ['inspect', url, '--scope', scope, '--json'], { cwd: dir, timeout: 30000 }));
      const alias = JSON.parse(sh('vercel', ['inspect', ORIGIN, '--scope', scope, '--json'], { cwd: dir, timeout: 30000 }));
      verified = release.sourceSha === sha && release.chainId === 10143 && deployment.id === alias.id && alias.name === PROJECT && alias.readyState === 'READY';
    } catch { /* bounded propagation retry */ }
    if (!verified) await new Promise(resolve => setTimeout(resolve, 5000));
  }
  if (!verified) throw Error('Deployment submitted, but public alias verification failed; success record retained unchanged.');
  const record = { url, origin: ORIGIN, sourceSha: sha, tunnelUrl, backendMode, deployedAt: new Date().toISOString() };
  if (backendMode === 'stable') {
    writeFileSync(pinnedPath + '.tmp', tunnelUrl + '\n');
    renameSync(pinnedPath + '.tmp', pinnedPath);
  }
  const recordPath = resolve(runDir, 'staging-deploy.json');
  writeFileSync(recordPath + '.tmp', JSON.stringify(record, null, 2) + '\n');
  renameSync(recordPath + '.tmp', recordPath);
  writeFileSync(resolve(runDir, 'staging-url'), ORIGIN + '\n');
  console.log(`\ndeployment: ${url}\nalias: ${ORIGIN}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let lock;
  try {
    if (!DRY) { mkdirSync(runDir, { recursive: true }); lock = openSync(resolve(runDir, 'deploy.lock'), 'wx'); writeFileSync(lock, String(process.pid)); }
    await main();
  } catch (error) {
    const text = String(error.stderr ?? error.message);
    console.error(/not authorized|unauthorized|forbidden|authentication/i.test(text) ? 'Staging deployment authorization blocked.' : error.code === 'EEXIST' ? 'Another staging deployment holds deploy.lock; retry after it completes.' : 'Staging deployment failed; success record was not replaced.');
    process.exitCode = 1;
  } finally { if (lock !== undefined) { closeSync(lock); unlinkSync(resolve(runDir, 'deploy.lock')); } }
}
