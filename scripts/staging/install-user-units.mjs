#!/usr/bin/env node
// Install the RetroPick staging backend as systemd --user units so it survives the agent /
// terminal session that started it (2026-10-12: three SIGTERM waves killed pidfile-managed
// processes when the agent session ended). Requires user lingering (loginctl Linger=yes).
//
//   node scripts/staging/install-user-units.mjs [--dry-run] [--uninstall] [--origin <url>]
//
// Units (all loopback-bound, Restart=always, logs appended to .staging/<name>.log):
//   retropick-indexer   :8787   retropick-referral :8788   retropick-media :8790
//   retropick-gateway   :8799   retropick-tunnel   (cloudflared quick tunnel + rotation redeploy)
// grouped by retropick-staging.target. No sudo, no system units, no secrets in unit files.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const UNINSTALL = args.includes('--uninstall');
const oi = args.indexOf('--origin');
const ORIGIN = (oi !== -1 ? args[oi + 1] : 'https://retropick-metropolis-retro-ui-stagi.vercel.app').replace(/\/$/, '');
const PUBLIC_RPC = 'https://testnet-rpc.monad.xyz';
const NODE = process.execPath;
const PATH = [dirname(NODE), resolve(homedir(), '.local/bin'), '/usr/local/bin', '/usr/bin', '/bin'].join(':');
const unitDir = resolve(homedir(), '.config/systemd/user');
const logs = resolve(repo, '.staging');

const svc = (name, { desc, cwd, exec, env = {}, after = [], extra = '' }) => [`retropick-${name}.service`, `[Unit]
Description=RetroPick staging ${desc}
PartOf=retropick-staging.target
After=network-online.target ${after.map((a) => `retropick-${a}.service`).join(' ')}
StartLimitIntervalSec=300
StartLimitBurst=20

[Service]
Type=simple
WorkingDirectory=${cwd}
Environment=PATH=${PATH}
Environment=NODE_ENV=production
${Object.entries(env).map(([k, v]) => `Environment=${k}=${v}`).join('\n')}
ExecStart=${exec}
Restart=always
RestartSec=3
KillMode=control-group
TimeoutStopSec=15
StandardOutput=append:${logs}/${name}.log
StandardError=append:${logs}/${name}.log
${extra}
[Install]
WantedBy=retropick-staging.target
`];

export function units() {
  const ts = `${NODE} --experimental-strip-types src/server.ts`;
  return [
    svc('indexer', { desc: 'read-only indexer :8787', cwd: `${repo}/apps/indexer`, exec: ts, env: { MONAD_TESTNET_RPC_URLS: PUBLIC_RPC, INDEXER_PORT: '8787' } }),
    svc('referral', { desc: 'referral service :8788', cwd: `${repo}/apps/referral-service`, exec: ts, after: ['indexer'], env: { REFERRAL_PORT: '8788', REFERRAL_INDEXER_URL: 'http://127.0.0.1:8787', REFERRAL_RPC_URL: PUBLIC_RPC, REFERRAL_ORIGIN: ORIGIN } }),
    // Same-origin media base: new uploads mint ORIGIN/api/media/<sha256>.<ext>, which survives tunnel rotation.
    svc('media', { desc: 'media service :8790 (local mode)', cwd: `${repo}/apps/media-service`, exec: ts, env: { MEDIA_PORT: '8790', MEDIA_ORIGIN: ORIGIN, MEDIA_PUBLIC_BASE: ORIGIN } }),
    svc('gateway', { desc: 'allowlist gateway :8799', cwd: repo, exec: `${NODE} scripts/staging/gateway.mjs`, after: ['indexer', 'referral', 'media'] }),
    svc('tunnel', { desc: 'cloudflared quick tunnel (non-durable hostname)', cwd: repo, exec: `${NODE} scripts/staging/tunnel-runner.mjs`, after: ['gateway'], env: { STAGING_AUTO_REDEPLOY: '1', STAGING_ORIGIN: ORIGIN }, extra: 'RestartSec=10\n' }),
    ['retropick-staging.target', `[Unit]
Description=RetroPick staging backend (indexer, referral, media, gateway, tunnel)
Wants=retropick-indexer.service retropick-referral.service retropick-media.service retropick-gateway.service retropick-tunnel.service

[Install]
WantedBy=default.target
`],
  ];
}

function sc(...a) { return execFileSync('systemctl', ['--user', ...a], { encoding: 'utf8' }); }

if (import.meta.url === `file://${process.argv[1]}`) {
  const all = units();
  if (UNINSTALL) {
    if (!DRY) { try { sc('disable', '--now', 'retropick-staging.target', ...all.map(([n]) => n).filter((n) => n.endsWith('.service'))); } catch { /* not installed */ } }
    for (const [name] of all) { const p = resolve(unitDir, name); console.log(`remove ${p}`); if (!DRY) rmSync(p, { force: true }); }
    if (!DRY) sc('daemon-reload');
    process.exit(0);
  }
  const linger = execFileSync('loginctl', ['show-user', process.env.USER ?? '', '-p', 'Linger'], { encoding: 'utf8' }).trim();
  if (linger !== 'Linger=yes') { console.error(`user lingering is not enabled (${linger}); units would stop with the session. Ask the operator to run: loginctl enable-linger ${process.env.USER}`); process.exit(2); }
  mkdirSync(unitDir, { recursive: true });
  mkdirSync(logs, { recursive: true });
  for (const [name, body] of all) {
    const p = resolve(unitDir, name);
    if (DRY) { console.log(`--- ${p}\n${body}`); continue; }
    writeFileSync(p, body);
    console.log(`wrote ${p}`);
  }
  if (!DRY) {
    sc('daemon-reload');
    sc('enable', 'retropick-staging.target', ...all.map(([n]) => n).filter((n) => n.endsWith('.service')));
    console.log('enabled. start with: systemctl --user start retropick-staging.target');
  }
}
