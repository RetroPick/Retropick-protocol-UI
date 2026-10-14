// Durable state for the Envio radar (schema v4; raw journal format unchanged).
//
//   journal.jsonl  append-only, one FULL replayable decoded event per line (bigints tagged),
//                  fsync'd before the aggregate is advanced. It is the source of truth.
//   state.json     snapshot written tmp+fsync+rename AFTER the journal append. It is a cache:
//                  {cursor, journalCount (events folded into the aggregate), canonical block-hash
//                  ring, aggregator state, identity}. Losing/corrupting it only costs a rebuild.
//
// Invariant: the aggregate = fold(journal[0 .. journalCount)), and every journaled event belongs
// to a block whose hash is recorded in the ring (or older than the ring and previously verified).
// On a reorg at fork block F the journal is atomically rewritten to events with block < F and the
// aggregate is REBUILT from it — the previous snapshot aggregate is never reused across a fork.
import { existsSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync, fsyncSync, closeSync, truncateSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { RadarEvent } from './radar.ts';

export const STATE_SCHEMA_VERSION = 4;
export const HASH_RING_SIZE = 512;

export interface JournalEvent extends RadarEvent { id: string; blockHash: string }

export interface Identity { chainId: number; deployment: string; factory: string; fromBlock: number }

export interface SnapshotState {
  schemaVersion: number;
  identity: Identity;
  /** Next block to stream from (HyperSync nextBlock). */
  cursorBlock: number;
  /** Number of journal lines folded into `aggregator`. */
  journalCount: number;
  /** Recent canonical [block, hash] pairs, ascending by block. */
  ring: Array<[number, string]>;
  aggregator: unknown;
  counters: { decodeErrors: number; reorgs: number; rebuilds: number; removedLogs: number; foreignLogs: number };
  ts: number;
}

const SNAPSHOT = 'state.json';
const JOURNAL = 'journal.jsonl';

function ensureDir(dir: string): void { if (!existsSync(dir)) mkdirSync(dir, { recursive: true }); }

/** bigint-preserving JSON: bigints are tagged so replay restores exact integers. */
export const encode = (v: unknown) => JSON.stringify(v, (_, x) => (typeof x === 'bigint' ? { $bigint: x.toString() } : x));
export const decode = <T>(s: string): T => JSON.parse(s, (_, x) => (x && typeof x === 'object' && typeof x.$bigint === 'string' && Object.keys(x).length === 1 ? BigInt(x.$bigint) : x)) as T;

function atomicWrite(path: string, text: string): void {
  const tmp = `${path}.tmp`;
  const fd = openSync(tmp, 'w');
  try { writeFileSync(fd, text); fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(tmp, path);
}

export function writeSnapshot(dir: string, state: SnapshotState): void {
  ensureDir(dir);
  atomicWrite(join(dir, SNAPSHOT), encode(state) + '\n');
}

export type SnapshotLoad = { snapshot: SnapshotState | null; previousIdentity?: Identity; reason: 'ok' | 'missing' | 'corrupt' | 'schema' };
export function loadSnapshot(dir: string): SnapshotLoad {
  const p = join(dir, SNAPSHOT);
  if (!existsSync(p)) return { snapshot: null, reason: 'missing' };
  try {
    const s = decode<SnapshotState>(readFileSync(p, 'utf8'));
    if (s.schemaVersion !== STATE_SCHEMA_VERSION) return { snapshot: null, previousIdentity: s.identity, reason: 'schema' };
    return { snapshot: s, reason: 'ok' };
  } catch { return { snapshot: null, reason: 'corrupt' }; }
}

export interface JournalLoad { events: JournalEvent[]; tornTail: boolean; corruptLines: number }

/**
 * Read the journal. A torn FINAL line (crash mid-append) is truncated away on disk; a corrupt
 * line in the MIDDLE is a hard error (the journal is no longer a trustworthy source of truth).
 */
export function readJournal(dir: string, repair = true): JournalLoad {
  const p = join(dir, JOURNAL);
  if (!existsSync(p)) return { events: [], tornTail: false, corruptLines: 0 };
  const raw = readFileSync(p, 'utf8');
  const lines = raw.split('\n');
  const events: JournalEvent[] = [];
  let good = 0, tornTail = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const last = i === lines.length - 1;
    if (last && line === '') break;
    try {
      const e = decode<JournalEvent>(line);
      if (typeof e.id !== 'string' || typeof e.blockNumber !== 'number') throw new Error('shape');
      if (last) throw new Error('unterminated'); // a complete record always ends with \n
      events.push(e); good += Buffer.byteLength(line) + 1;
    } catch {
      if (last) { tornTail = true; break; }
      throw new Error(`radar journal corrupt at line ${i + 1}; refusing to rebuild from it (move ${p} aside to force a full replay)`);
    }
  }
  if (tornTail && repair) truncateSync(p, good);
  return { events, tornTail, corruptLines: 0 };
}

export function appendJournal(dir: string, events: JournalEvent[]): void {
  if (!events.length) return;
  ensureDir(dir);
  const fd = openSync(join(dir, JOURNAL), 'a');
  try { writeFileSync(fd, events.map((e) => encode(e) + '\n').join('')); fsyncSync(fd); } finally { closeSync(fd); }
}

/** Atomically replace the journal (reorg truncation). */
export function rewriteJournal(dir: string, events: JournalEvent[]): void {
  ensureDir(dir);
  atomicWrite(join(dir, JOURNAL), events.map((e) => encode(e) + '\n').join(''));
}

export function resetState(dir: string): void {
  for (const f of [SNAPSHOT, JOURNAL]) rmSync(join(dir, f), { force: true });
}

/** Ring helpers: ascending, bounded, last-write-wins per block. */
export function ringPut(ring: Array<[number, string]>, block: number, hash: string): Array<[number, string]> {
  const next = ring.filter(([b]) => b !== block);
  next.push([block, hash.toLowerCase()]);
  next.sort((a, b) => a[0] - b[0]);
  return next.slice(-HASH_RING_SIZE);
}
export const ringGet = (ring: Array<[number, string]>, block: number) => ring.find(([b]) => b === block)?.[1] ?? null;

/**
 * Find the fork point: the newest ring entry whose hash still matches the canonical chain.
 * Returns the first block that must be re-read (matchedBlock + 1), or null when no ring entry
 * matches (fork deeper than the ring → caller must rebuild from the deployment block).
 * `verify` returns the canonical hash, or null when unavailable (treated as "cannot confirm").
 */
export async function findForkBlock(ring: Array<[number, string]>, verify: (block: number) => Promise<string | null>): Promise<{ forkBlock: number | null; checked: number; unverifiable: boolean }> {
  let checked = 0;
  for (let i = ring.length - 1; i >= 0; i--) {
    const [block, hash] = ring[i];
    const canonical = await verify(block);
    checked++;
    if (canonical === null) return { forkBlock: null, checked, unverifiable: true };
    if (canonical.toLowerCase() === hash) return { forkBlock: block + 1, checked, unverifiable: false };
  }
  return { forkBlock: null, checked, unverifiable: false };
}

export function sameIdentity(a: Identity, b: Identity): boolean {
  return a.chainId === b.chainId && a.deployment === b.deployment && a.factory.toLowerCase() === b.factory.toLowerCase() && a.fromBlock === b.fromBlock;
}
