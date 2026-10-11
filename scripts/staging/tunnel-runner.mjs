#!/usr/bin/env node
// Supervised cloudflared QUICK tunnel for staging (run by systemd --user unit retropick-tunnel).
//  * spawns `cloudflared tunnel --url http://127.0.0.1:8799` as a child
//  * captures the rotating https://<name>.trycloudflare.com URL → .staging/tunnel-url
//  * waits until <tunnel>/health answers through the edge, then — if the URL differs from the
//    one the current Vercel staging deployment rewrites to — runs deploy-vercel.mjs (same
//    source SHA, rewrites-only change; env vars unchanged) when STAGING_AUTO_REDEPLOY=1
//  * exits non-zero when cloudflared exits so systemd restarts the whole unit
// The quick tunnel has NO uptime guarantee and its hostname rotates on every start.
import { spawn, execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const runDir = resolve(repo, '.staging');
const log = resolve(runDir, 'tunnel.log');
const say = (m) => { const line = `${new Date().toISOString()} [tunnel-runner] ${m}\n`; process.stdout.write(line); };

const child = spawn(process.env.CLOUDFLARED ?? 'cloudflared', ['tunnel', '--url', `http://127.0.0.1:${process.env.STAGING_GATEWAY_PORT ?? 8799}`, '--no-autoupdate'], { stdio: ['ignore', 'pipe', 'pipe'] });
let url = null;
const onData = (buf) => {
  const text = buf.toString();
  appendFileSync(log, text);
  if (!url) {
    const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (m) { url = m[0]; writeFileSync(resolve(runDir, 'tunnel-url'), url + '\n'); say(`tunnel url ${url}`); void afterUrl(url); }
  }
};
child.stdout.on('data', onData);
child.stderr.on('data', onData);
child.on('exit', (code, signal) => { say(`cloudflared exited code=${code} signal=${signal}`); process.exit(code === 0 && !signal ? 1 : (code ?? 1)); });
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { child.kill('SIGTERM'); });

async function afterUrl(u) {
  const end = Date.now() + 120_000;
  let ok = false;
  while (Date.now() < end && !ok) {
    try { ok = (await fetch(`${u}/health`, { signal: AbortSignal.timeout(10_000) })).ok; } catch { /* edge warming */ }
    if (!ok) await new Promise((r) => setTimeout(r, 3000));
  }
  say(`edge /health ${ok ? 'OK' : 'NOT REACHABLE after 120s'}`);
  if (!ok) return;
  const lastPath = resolve(runDir, 'staging-deploy.json');
  if (!existsSync(lastPath)) { say('no .staging/staging-deploy.json yet → first deploy is manual: node scripts/staging/deploy-vercel.mjs --sha <sha>'); return; }
  const deployedTunnel = JSON.parse(readFileSync(lastPath, 'utf8')).tunnelUrl;
  if (deployedTunnel === u) { say('vercel rewrites already target this tunnel'); return; }
  if (process.env.STAGING_AUTO_REDEPLOY !== '1') { say('tunnel rotated; STAGING_AUTO_REDEPLOY!=1 → run node scripts/staging/deploy-vercel.mjs manually'); return; }
  say('tunnel rotated → redeploying staging rewrites (same source SHA)');
  try {
    const out = execFileSync(process.execPath, [resolve(here, 'deploy-vercel.mjs')], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 600_000 });
    say(`redeploy done: ${out.trim().split('\n').slice(-2).join(' | ')}`);
  } catch (error) { say(`redeploy FAILED: ${String(error.stderr ?? error).slice(0, 300)}`); }
}
