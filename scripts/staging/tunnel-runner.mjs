#!/usr/bin/env node
// Supervised cloudflared QUICK tunnel for staging (run by systemd --user unit retropick-tunnel).
//  * spawns `cloudflared tunnel --url http://127.0.0.1:8799` as a child
//  * captures the rotating https://<name>.trycloudflare.com URL → .staging/tunnel-url
//  * waits until <tunnel>/health answers through the edge, then — if the URL differs from the
//    one the current Vercel staging deployment rewrites to — runs deploy-vercel.mjs (same
//    source SHA, rewrites-only change; env vars unchanged) when STAGING_AUTO_REDEPLOY=1
//  * exits non-zero when cloudflared exits so systemd restarts the whole unit
// The quick tunnel has NO uptime guarantee and its hostname rotates on every start.
import { spawn, execFile } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { stagingReady, reconciliationDelay } from './readiness.mjs';
const deploy = promisify(execFile);

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const runDir = resolve(repo, '.staging');
const log = resolve(runDir, 'tunnel.log');
const say = (m) => { const line = `${new Date().toISOString()} [tunnel-runner] ${m}\n`; process.stdout.write(line); };

const child = spawn(process.env.CLOUDFLARED ?? 'cloudflared', ['tunnel', '--url', `http://127.0.0.1:${process.env.STAGING_GATEWAY_PORT ?? 8799}`, '--no-autoupdate'], { stdio: ['ignore', 'pipe', 'pipe'] });
let url = null;
let announcementBuffer = '';
const onData = (buf) => {
  const text = buf.toString();
  appendFileSync(log, text);
  if (!url) {
    announcementBuffer = (announcementBuffer + text).slice(-4096);
    const m = announcementBuffer.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (m) { url = m[0]; writeFileSync(resolve(runDir, 'tunnel-url.tmp'), url + '\n'); renameSync(resolve(runDir, 'tunnel-url.tmp'), resolve(runDir, 'tunnel-url')); say(`tunnel url ${url}`); void afterUrl(url); }
  }
};
child.stdout.on('data', onData);
child.stderr.on('data', onData);
child.on('exit', (code, signal) => { say(`cloudflared exited code=${code} signal=${signal}`); process.exit(code === 0 && !signal ? 1 : (code ?? 1)); });
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { child.kill('SIGTERM'); });

async function afterUrl(u) {
  let attempt = 0;
  while (!child.killed && child.exitCode === null) {
    let state = 'edge-not-ready';
    let authorizationBlocked = false;
    try {
      if (await stagingReady(u)) {
        const lastPath = resolve(runDir, 'staging-deploy.json');
        const last = existsSync(lastPath) ? JSON.parse(readFileSync(lastPath, 'utf8')) : null;
        if (!last) state = 'first-deployment-required';
        else if (last.tunnelUrl === u && await stagingReady(last.origin)) { state = 'ready'; attempt = 0; }
        else if (process.env.STAGING_AUTO_REDEPLOY !== '1') state = 'manual-redeploy-required';
        else {
          state = 'redeploying';
          say(state);
          await deploy(process.execPath, [resolve(here, 'deploy-vercel.mjs'), '--sha', last.sourceSha], { cwd: repo, timeout: 600000, maxBuffer: 1024 * 1024 });
          state = 'ready'; attempt = 0;
        }
      }
    } catch (error) {
      // Store a classified state; never copy CLI output (which may contain credentials).
      authorizationBlocked = /not authorized|unauthorized|forbidden|authentication/i.test(String(error.stderr ?? error.message));
      state = authorizationBlocked ? 'authorization-blocked' : 'retry-pending';
      attempt++;
    }
    if (state === 'edge-not-ready') attempt++;
    writeFileSync(resolve(runDir, 'reconciliation.json.tmp'), JSON.stringify({ tunnelUrl: u, state, attempt, checkedAt: new Date().toISOString() }) + '\n');
    renameSync(resolve(runDir, 'reconciliation.json.tmp'), resolve(runDir, 'reconciliation.json'));
    say(state);
    await new Promise(resolve => setTimeout(resolve, state === 'ready' ? 30000 : reconciliationDelay(attempt, authorizationBlocked)));
  }
}
