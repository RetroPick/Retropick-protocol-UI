#!/usr/bin/env node
// Deploy (or redeploy) the retro-ui Vercel STAGING project. Safe to re-run.
//
//   node scripts/staging/deploy-vercel.mjs
//
// Steps:
//   1. read .staging/tunnel-url (set by start-backend.mjs; rotates on tunnel restart)
//   2. render the gitignored root vercel.json from vercel.template.json
//   3. ensure the project exists + link this repo root to it (NEW project only —
//      never the legacy retropick-metropolis app)
//   4. upsert public VITE_* env vars (values are browser-public by design)
//   5. vercel deploy --prod, capture URL + deployment id into .staging/staging-url
//   6. print the follow-up: restart backends with --origin <staging-url>
//
// No secrets are involved: every value here is public-by-design (VITE_* / public RPC).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const runDir = resolve(repo, '.staging');
const PROJECT = process.env.STAGING_PROJECT ?? 'retropick-metropolis-retro-ui-staging';

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
}

async function main() {
  if (!existsSync(resolve(runDir, 'tunnel-url'))) { console.error('missing .staging/tunnel-url — run start-backend.mjs first'); process.exit(1); }
  const tunnelUrl = readFileSync(resolve(runDir, 'tunnel-url'), 'utf8').trim().replace(/\/$/, '');
  console.log(`tunnel: ${tunnelUrl}`);

  const template = readFileSync(resolve(here, 'vercel.template.json'), 'utf8').replaceAll('TUNNEL_URL', tunnelUrl);
  writeFileSync(resolve(repo, 'vercel.json'), template);
  console.log('rendered root vercel.json (gitignored)');

  try { sh('vercel', ['project', 'add', PROJECT]); console.log(`project created: ${PROJECT}`); }
  catch { console.log(`project exists (or link already present): ${PROJECT}`); }
  sh('vercel', ['link', '--yes', '--project', PROJECT]);
  console.log('linked repo root → staging project');

  const env = [
    ['VITE_DATA_MODE', 'live'],
    ['VITE_INDEXER_URL', tunnelUrl],
    ['VITE_MONAD_RPC_FALLBACK_URL', 'https://testnet-rpc.monad.xyz'],
  ];
  for (const [key, value] of env) {
    for (const target of ['production', 'preview']) {
      try { sh('vercel', ['env', 'add', key, target], { input: value + '\n' }); console.log(`env ${key} (${target}) set`); }
      catch { console.log(`env ${key} (${target}) already set — leaving unchanged`); }
    }
  }

  console.log('deploying (prod of the staging project — its own *.vercel.app domain)…');
  const url = sh('vercel', ['deploy', '--prod', '--yes']);
  writeFileSync(resolve(runDir, 'staging-url'), url + '\n');
  console.log(`\nstaging URL: ${url}`);
  console.log(`\nnext: node scripts/staging/start-backend.mjs --origin ${url}  (restart backends with the real origin)`);
}

await main();
