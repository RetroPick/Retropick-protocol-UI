import { createServer } from 'node:http';
import { mkdirSync, existsSync, statSync, readFileSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { jsonExact } from '@retropick/launchpad-sdk/events';
import type { IndexFreshness } from '@retropick/launchpad-sdk/read-model';
import { Store } from './store.ts';
import { Indexer } from './sync.ts';
import { PROJECTION_VERSION, type Snapshot } from './project.ts';
import { query, QueryError } from './query.ts';
export function createReadServer(source: { snapshot(): Snapshot | undefined; freshness(): IndexFreshness; diagnostics?(): Record<string, unknown> }) {
  return createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Accept, If-None-Match'); res.setHeader('Access-Control-Expose-Headers', 'ETag, Cache-Control');
    const send = (status: number, value: unknown) => { res.statusCode = status; res.end(jsonExact(value)); };
    if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
    if (req.method !== 'GET') { send(405, { error: 'READ_ONLY_API' }); return; }
    const url = new URL(req.url ?? '/', 'http://localhost'); const freshness = source.freshness(); const snapshot = source.snapshot();
    if (url.pathname === '/health') { send(200, { freshness, ready: snapshot?.projectionVersion === PROJECTION_VERSION, projection: { expected: PROJECTION_VERSION, published: snapshot?.projectionVersion ?? null }, ...(source.diagnostics?.() ?? {}) }); return; }
    if (!snapshot || snapshot.projectionVersion !== PROJECTION_VERSION) { send(503, { error: snapshot ? 'INDEX_SCHEMA_UPGRADING' : 'INDEX_NOT_READY', freshness }); return; }
    if (url.pathname.startsWith('/v1/wallets/') && snapshot.beneficiaryIndexedBlock < snapshot.indexedBlock) { send(503, { error: 'BENEFICIARY_HISTORY_SYNCING', freshness }); return; }
    try {
      const result = query(snapshot, url, freshness); const body = jsonExact(result);
      const walletSpecific = url.pathname.startsWith('/v1/wallets/') || url.searchParams.has('owner');
      if (!walletSpecific) {
        res.setHeader('Cache-Control', 'public, max-age=1, stale-while-revalidate=10');
        const etag = `"${createHash('sha256').update(body).digest('hex')}"`; res.setHeader('ETag', etag);
        if (req.headers['if-none-match'] === etag) { res.statusCode = 304; res.end(); return; }
      }
      res.statusCode = 200; res.end(body);
    } catch (error) { send(error instanceof QueryError ? error.status : 500, { error: error instanceof QueryError ? error.code : 'QUERY_FAILED', freshness }); }
  });
}
/** Kernel-backed writer exclusion. Never unlink the guard: its inode owns the lock. */
export function acquireDbLock(file: string): () => void {
  const guard = new DatabaseSync(`${file}.writer-lock.sqlite`);
  try {
    guard.exec('PRAGMA busy_timeout=0; BEGIN EXCLUSIVE');
    // Upgrade only after an old writer exits. A legacy PID can be reused as a
    // process OR thread after reboot; kill(pid, 0) alone is not ownership proof.
    const legacy = `${file}.lock`;
    if (existsSync(legacy)) {
      const previous = statSync(legacy);
      const owner = Number(readFileSync(legacy, 'utf8'));
      let bootMs = 0;
      try { bootMs = Number(readFileSync('/proc/stat', 'utf8').match(/^btime (\d+)$/m)?.[1] ?? 0) * 1000; } catch { /* non-Linux: fail closed for a live legacy owner */ }
      let alive = false;
      try { if (Number.isSafeInteger(owner) && owner > 0) { process.kill(owner, 0); alive = true; } } catch (error) { alive = (error as NodeJS.ErrnoException).code !== 'ESRCH'; }
      if (alive && previous.mtimeMs >= bootMs) throw Error(`Legacy indexer writer ${owner} is still active; stop it before upgrading.`);
      if (!Number.isSafeInteger(owner) || owner <= 0) throw Error('Unrecognized legacy writer lock; inspect it before upgrading.');
      const current = statSync(legacy);
      if (current.ino !== previous.ino || current.mtimeMs !== previous.mtimeMs) throw Error('Legacy writer lock changed during upgrade.');
      rmSync(legacy);
    }
  } catch (cause) {
    guard.close();
    throw Error(`INDEXER_DB_LOCKED: cannot acquire writer for ${file}`, { cause });
  }
  let released = false;
  return () => { if (!released) { released = true; guard.close(); } };
}
/** Ordered, provider-neutral endpoint list: MONAD_TESTNET_RPC_URLS (comma separated) or primary + fallback. */
export function rpcEndpoints(env: NodeJS.ProcessEnv): string[] {
  const list = (env.MONAD_TESTNET_RPC_URLS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const urls = list.length ? list : [env.MONAD_TESTNET_RPC_URL, env.MONAD_TESTNET_RPC_FALLBACK_URL].map(s => s?.trim()).filter((s): s is string => !!s);
  if (!urls.length) throw Error('MONAD_TESTNET_RPC_URLS or MONAD_TESTNET_RPC_URL is required');
  return [...new Set(urls)];
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const urls = rpcEndpoints(process.env);
  const file = resolve(process.env.INDEXER_DB ?? '.data/monad-testnet.sqlite');
  mkdirSync(dirname(file), { recursive: true }); const release = acquireDbLock(file);
  const store = new Store(file);
  // Always go through the provider pool (even for one URL) so failures are classified and observable.
  const indexer = new Indexer(store, urls.length === 1 ? [urls[0], urls[0]] : urls, 8, Number(process.env.INDEXER_MAX_BLOCKS_PER_PASS ?? 20_000));
  void indexer.pool?.probe().then(h => console.log('RPC providers', JSON.stringify(h.map(p => ({ endpoint: p.endpoint, state: p.state, chainId: p.chainId, failure: p.lastFailure, latencyMs: p.latencyMs })))));
  const server = createReadServer({ snapshot: () => store.get<Snapshot>('snapshot'), freshness: () => indexer.freshness(), diagnostics: () => ({ progress: { ...indexer.progress, cursors: { root: store.cursor('root', 0), dynamic: store.cursor('dynamic', 0), beneficiary: store.cursor('beneficiary', 0) } }, providers: indexer.pool?.health() ?? [] }) });
  const port = Number(process.env.INDEXER_PORT ?? 8787); server.listen(port, '127.0.0.1', () => console.log('Testnet read-only indexer listening on', port, 'db', file, 'pid', process.pid));
  // While catching up, passes run back-to-back; at the head the regular 15 s cadence applies.
  let stopped = false, looping = false;
  const loop = async () => { if (looping) return; looping = true; try { while (!stopped) { await indexer.sync(); if (!indexer.progress.catchingUp || indexer.error) break; } } finally { looping = false; } };
  void loop(); const timer = setInterval(() => void loop(), 15000);
  const stop = () => { stopped = true; clearInterval(timer); server.close(() => { store.close(); release(); process.exit(0); }); }; process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
