#!/usr/bin/env node
import { stagingReady } from './readiness.mjs';
const origin = process.argv[2] ?? 'https://retropick-metropolis-retro-ui-stagi.vercel.app';
const minutes = Number(process.argv[3] ?? '30');
if (!Number.isFinite(minutes) || minutes < 1 || minutes > 120) throw Error('Expected 1–120 monitoring minutes.');
const expectedSha = process.argv[4];
const started = Date.now();
let failed = 0;
do {
  let ready = false, health = null, release = null;
  try {
    [ready, health, release] = await Promise.all([stagingReady(origin), fetch(origin + '/health', { cache: 'no-store', signal: AbortSignal.timeout(10000) }).then(response => response.json()), fetch(origin + '/release.json', { cache: 'no-store', signal: AbortSignal.timeout(10000) }).then(response => response.json())]);
    if (expectedSha && release.sourceSha !== expectedSha) ready = false;
  } catch { ready = false; }
  if (!ready) failed++;
  console.log(JSON.stringify({ at: new Date().toISOString(), elapsedMs: Date.now() - started, origin, ready, sourceSha: release?.sourceSha, chainId: health?.freshness?.chainId, indexedBlock: health?.freshness?.indexedBlock, headBlock: health?.freshness?.headBlock, lagBlocks: health?.freshness?.lagBlocks, syncing: health?.freshness?.syncing, projection: health?.projection }));
  if (Date.now() - started >= minutes * 60000) break;
  await new Promise(resolve => setTimeout(resolve, 30000));
} while (true);
console.log(JSON.stringify({ result: failed ? 'failed' : 'passed', failed, durationMs: Date.now() - started }));
process.exitCode = failed ? 1 : 0;
