#!/usr/bin/env node
// Start the RetroPick staging backend stack on this host (loopback only):
//   indexer (8787) · referral-service (8788) · media-service (8790) · staging-gateway (8799)
// plus a cloudflared QUICK TUNNEL fronting the gateway. The tunnel URL is written to
// .staging/tunnel-url — it is NON-DURABLE and rotates whenever the tunnel restarts;
// re-run scripts/staging/deploy-vercel.mjs afterwards to re-render and redeploy.
//
// Usage:
//   node scripts/staging/start-backend.mjs [--origin https://<staging-url>]
//     --origin sets REFERRAL_ORIGIN/MEDIA_ORIGIN to the exact public frontend origin
//     (strict same-origin cookie design). Omit for local-dev defaults; re-run with the
//     real staging origin after the first deploy (idempotent: restarts everything).
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const runDir = resolve(repo, '.staging');
mkdirSync(runDir, { recursive: true });

const args = process.argv.slice(2);
const originIdx = args.indexOf('--origin');
const ORIGIN = originIdx !== -1 ? args[originIdx + 1] : null;
const PUBLIC_RPC = 'https://testnet-rpc.monad.xyz';
const TUNNEL_PORT = 8799;

const services = [
  {
    name: 'indexer', cwd: 'apps/indexer', port: 8787, health: '/health', cmd: ['pnpm', 'start'],
    env: { MONAD_TESTNET_RPC_URLS: PUBLIC_RPC, INDEXER_PORT: '8787' },
  },
  {
    name: 'referral', cwd: 'apps/referral-service', port: 8788, health: '/api/referrals/health', cmd: ['pnpm', 'start'],
    env: { REFERRAL_PORT: '8788', REFERRAL_INDEXER_URL: 'http://127.0.0.1:8787', REFERRAL_RPC_URL: PUBLIC_RPC, ...(ORIGIN ? { REFERRAL_ORIGIN: ORIGIN } : {}) },
  },
  {
    name: 'media', cwd: 'apps/media-service', port: 8790, health: '/api/media/health', cmd: ['pnpm', 'start'],
    // MEDIA_PUBLIC_BASE is written after the tunnel is up (pass 2) — see below.
    env: { MEDIA_PORT: '8790', ...(ORIGIN ? { MEDIA_ORIGIN: ORIGIN } : {}) },
  },
  { name: 'gateway', cwd: '.', port: TUNNEL_PORT, health: '/health', cmd: ['node', 'scripts/staging/gateway.mjs'], env: {} },
];

function pidFile(name) { return resolve(runDir, `${name}.pid`); }
function logFile(name) { return resolve(runDir, `${name}.log`); }

function stopOne(name) {
  const pidPath = pidFile(name);
  if (!existsSync(pidPath)) return;
  try {
    const pid = Number(readFileSync(pidPath, 'utf8').trim());
    if (Number.isInteger(pid)) process.kill(pid, 'SIGTERM');
  } catch { /* already dead */ }
  rmSync(pidPath, { force: true });
}

async function waitHealthy(port, path, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}${path}`, { signal: AbortSignal.timeout(2000) });
      if (res.ok || res.status === 401) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 750));
  }
  return false;
}

async function main() {
  console.log(`staging stack: stopping any previous instances…`);
  ['tunnel', ...services.map((s) => s.name)].forEach(stopOne);

  for (const svc of services) {
    const log = logFile(svc.name);
    const out = (await import('node:fs')).openSync(log, 'a');
    const child = spawn(svc.cmd[0], svc.cmd.slice(1), {
      cwd: resolve(repo, svc.cwd),
      env: { ...process.env, ...svc.env },
      stdio: ['ignore', out, out],
      detached: true,
    });
    child.unref();
    writeFileSync(pidFile(svc.name), String(child.pid));
    const healthy = await waitHealthy(svc.port, svc.health, svc.name === 'indexer' ? 90_000 : 20_000);
    console.log(`${svc.name}: pid ${child.pid} ${healthy ? `healthy on :${svc.port}` : `FAILED HEALTH on :${svc.port} — see ${log}`}`);
    if (!healthy) { console.error(`aborting: ${svc.name} did not become healthy`); process.exit(1); }
  }

  console.log('starting cloudflared quick tunnel (no account; URL rotates on restart)…');
  // Truncate the previous log so the URL capture below can never match a stale run.
  const tunnelLog = (await import('node:fs')).openSync(logFile('tunnel'), 'w');
  const tunnel = spawn('cloudflared', ['tunnel', '--url', `http://127.0.0.1:${TUNNEL_PORT}`, '--no-autoupdate'], {
    cwd: runDir, stdio: ['ignore', tunnelLog, tunnelLog], detached: true,
  });
  tunnel.unref();
  writeFileSync(pidFile('tunnel'), String(tunnel.pid));

  // The trycloudflare URL appears in cloudflared's output within a few seconds.
  let tunnelUrl = null;
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline && !tunnelUrl) {
    try {
      const text = readFileSync(logFile('tunnel'), 'utf8');
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (match) tunnelUrl = match[0];
    } catch { /* not written yet */ }
    if (!tunnelUrl) await new Promise((r) => setTimeout(r, 1000));
  }
  if (!tunnelUrl) { console.error('tunnel URL not captured — inspect .staging/tunnel.log'); process.exit(1); }
  writeFileSync(resolve(runDir, 'tunnel-url'), tunnelUrl + '\n');
  console.log(`tunnel: ${tunnelUrl} (non-durable)`);

  // Verify the tunnel path end-to-end before declaring success.
  const healthOk = await (async () => {
    // cloudflared needs a few seconds to register the edge route; retry for up to 60s.
    const end = Date.now() + 60_000;
    while (Date.now() < end) {
      try { const r = await fetch(`${tunnelUrl}/health`, { signal: AbortSignal.timeout(10_000) }); if (r.ok) return true; } catch { /* warming up */ }
      await new Promise((r) => setTimeout(r, 2500));
    }
    return false;
  })();
  console.log(`tunnel /health via gateway → indexer: ${healthOk ? 'OK' : 'FAILED'}`);

  // Pass 2: restart ONLY the media service with MEDIA_PUBLIC_BASE = tunnel (its local-mode
  // image URIs must be publicly fetchable over HTTPS).
  stopOne('media');
  const mediaOut = (await import('node:fs')).openSync(logFile('media'), 'a');
  const media = spawn('pnpm', ['start'], {
    cwd: resolve(repo, 'apps/media-service'),
    env: { ...process.env, ...services[2].env, MEDIA_PUBLIC_BASE: tunnelUrl },
    stdio: ['ignore', mediaOut, mediaOut], detached: true,
  });
  media.unref();
  writeFileSync(pidFile('media'), String(media.pid));
  const mediaOk = await waitHealthy(8790, '/api/media/health', 20_000);
  console.log(`media restarted with MEDIA_PUBLIC_BASE=tunnel: ${mediaOk ? 'OK' : 'FAILED'}`);
  if (!healthOk || !mediaOk) process.exit(1);
  console.log('staging stack UP. tunnel-url file: .staging/tunnel-url');
}

await main();
