#!/usr/bin/env node
// Stop the staging stack (gateway, services, tunnel). Idempotent.
import { readFileSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const runDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '.staging');
for (const name of ['tunnel', 'gateway', 'media', 'referral', 'indexer']) {
  const pidFile = resolve(runDir, `${name}.pid`);
  if (!existsSync(pidFile)) continue;
  try {
    const pid = Number(readFileSync(pidFile, 'utf8').trim());
    if (Number.isInteger(pid)) {
      // The pidfile records the detached pnpm wrapper — kill its whole process GROUP so
      // the actual node child dies too (the wrapper exits early; the child survives it).
      try { process.kill(-pid, 'SIGTERM'); } catch { try { process.kill(pid, 'SIGTERM'); } catch { /* dead */ } }
    }
    console.log(`${name}: stopped (pid ${pid})`);
  } catch { console.log(`${name}: pid file stale, removed`); }
  rmSync(pidFile, { force: true });
}
console.log('staging stack down (tunnel-url file kept for reference)');
