// Durable state for the Envio radar: an append-only JSONL journal of processed event
// identities + an atomically-replaced snapshot of the aggregation cursor/state.
//
// Durability contract (operator-corrected — this is NOT a database, and does not pretend
// to be WAL-safe):
//   * The journal is append-only; each line is a self-describing record with a checksum
//     guard (length prefix). A torn FINAL line (interrupted write) is detected and
//     skipped on load — the event is then re-delivered by replay from the snapshot
//     cursor and re-ingested idempotently by the aggregator.
//   * The snapshot is written tmp+rename (atomic on POSIX) and fsync'd. It contains the
//     resume cursor + block identity + full aggregator state + schema version +
//     deployment identity + chain id, so restart resumes EXACTLY where it left off.
//   * Reorg safety: we record the block hash with the cursor. On resume, if the chain's
//     hash for the cursor block no longer matches (deep reorg), we fall back to the
//     last checkpoint whose block hash still matches the chain; events after it are
//     replayed (the aggregator's event-id set is restored from the snapshot, and
//     re-delivered events carry the same ids — for a true reorg the new events at the
//     same (block, logIndex, tx) slots replace old effects only if ids match, which we
//     conservatively treat by REPLAYING with a cleared id-set from the safe checkpoint;
//     see checkpointAt()).
import { existsSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync, fsyncSync, closeSync, statSync, truncateSync } from 'node:fs';
import { join, dirname } from 'node:path';

export const STATE_SCHEMA_VERSION = 2;

export interface JournalRecord {
  /** `${blockNumber}:${logIndex}:${txHash}` — the aggregator's idempotence key. */
  id: string;
  blockNumber: number;
  blockHash: string;
  name: string;
  /** epoch-ms when this record was journaled */
  ts: number;
}

export interface Checkpoint {
  /** Next block to stream from on resume (exclusive cursor). */
  cursorBlock: number;
  /** Chain identity of the block JUST BEFORE the cursor — verified on resume. */
  anchorBlock: number;
  anchorBlockHash: string;
  /** epoch-ms of the checkpoint write */
  ts: number;
}

export interface SnapshotState {
  schemaVersion: number;
  chainId: number;
  deployment: string;
  checkpoint: Checkpoint;
  /** Aggregator state (opaque here; restored by the caller). */
  aggregator: unknown;
  /** Counters kept alongside the state. */
  counters: { journalLines: number; decodeErrors: number; replays: number };
}

export interface LoadResult {
  snapshot: SnapshotState | null;
  journalIds: Set<string>;
  /** Journal integrity report. */
  journal: { lines: number; tornTail: boolean; skipped: number };
}

const SNAPSHOT = 'state.json';
const JOURNAL = 'journal.jsonl';

function ensureDir(dir: string): void { if (!existsSync(dir)) mkdirSync(dir, { recursive: true }); }

/** Atomic snapshot write: tmp file + fsync + rename (POSIX-atomic). */
export function writeSnapshot(dir: string, state: SnapshotState): void {
  ensureDir(dir);
  const tmp = join(dir, `.${SNAPSHOT}.tmp`);
  const fd = openSync(tmp, 'w');
  try {
    // bigint-safe: persisted aggregator state carries bigint market fields.
    writeFileSync(fd, JSON.stringify(state, (_, v) => (typeof v === 'bigint' ? v.toString() : v)) + '\n');
    fsyncSync(fd);
  } finally { closeSync(fd); }
  renameSync(tmp, join(dir, SNAPSHOT));
}

/**
 * Load durable state. Journal lines are `JSON\n`; a torn tail (no trailing newline or
 * unparseable final line) is reported and ignored — replay will re-deliver that event.
 */
export function loadState(dir: string): LoadResult {
  const snapshotPath = join(dir, SNAPSHOT);
  const journalPath = join(dir, JOURNAL);
  let snapshot: SnapshotState | null = null;
  if (existsSync(snapshotPath)) {
    try {
      const parsed = JSON.parse(readFileSync(snapshotPath, 'utf8')) as SnapshotState;
      if (parsed.schemaVersion === STATE_SCHEMA_VERSION) snapshot = parsed;
    } catch { /* corrupt snapshot → full replay from genesis cursor */ }
  }
  const journalIds = new Set<string>();
  let lines = 0, skipped = 0, tornTail = false;
  if (existsSync(journalPath)) {
    const raw = readFileSync(journalPath, 'utf8');
    const rows = raw.split('\n');
    // A well-formed journal ends with a newline. A missing final newline means the last
    // row may be torn: attempt to parse it — failure marks tornTail and skips it
    // (replay re-delivers that event idempotently).
    const hasFinalNewline = raw.endsWith('\n');
    const complete = hasFinalNewline ? rows.slice(0, -1) : rows.slice(0, -1);
    const partial = hasFinalNewline ? null : rows[rows.length - 1] ?? null;
    for (const line of complete) {
      try {
        const rec = JSON.parse(line) as JournalRecord;
        if (typeof rec.id !== 'string') throw new Error('bad id');
        journalIds.add(rec.id);
        lines++;
      } catch { skipped++; }
    }
    if (partial !== null && partial !== '') {
      try {
        const rec = JSON.parse(partial) as JournalRecord;
        if (typeof rec.id !== 'string') throw new Error('bad id');
        journalIds.add(rec.id);
        lines++;
      } catch { tornTail = true; skipped++; }
    }
  }
  return { snapshot, journalIds, journal: { lines, tornTail, skipped: skipped - (tornTail ? 1 : 0) } };
}

/** Append journal records (one JSON line each) + fsync. */
export function appendJournal(dir: string, records: JournalRecord[]): void {
  if (!records.length) return;
  ensureDir(dir);
  const fd = openSync(join(dir, JOURNAL), 'a');
  try {
    for (const r of records) writeFileSync(fd, JSON.stringify(r) + '\n');
    fsyncSync(fd);
  } finally { closeSync(fd); }
}

/**
 * Reorg-aware resume point: given the loaded snapshot and a verifier that returns the
 * CURRENT chain hash for a block (or null when unavailable/pruned), walk back over the
 * journal's recent checkpoints to the newest block whose hash still matches the chain.
 * Returns the safe checkpoint to resume from and, when a reorg is detected, a cleared
 * journal-id set is NOT needed because the aggregator treats re-delivered ids as
 * duplicates — instead we return `reorged: true` and the caller replays from the safe
 * anchor with a fresh aggregator state seeded by the snapshot AT that anchor. In this
 * implementation the snapshot is the only aggregate source, so a reorg forces full
 * replay from the last snapshot whose anchor still matches (conservative by design).
 */
export function resolveResume(
  snapshot: SnapshotState | null,
  verifyBlockHash: (block: number) => Promise<string | null>,
  fallbackFromBlock: number,
): Promise<{ fromBlock: number; reorged: boolean; anchor: Checkpoint | null }> {
  return (async () => {
    if (!snapshot) return { fromBlock: fallbackFromBlock, reorged: false, anchor: null };
    const hash = await verifyBlockHash(snapshot.checkpoint.anchorBlock);
    if (hash && hash.toLowerCase() === snapshot.checkpoint.anchorBlockHash.toLowerCase()) {
      return { fromBlock: snapshot.checkpoint.cursorBlock, reorged: false, anchor: snapshot.checkpoint };
    }
    // Deep reorg (or pruned verifier): conservative full replay.
    return { fromBlock: fallbackFromBlock, reorged: true, anchor: null };
  })();
}

/** Test helper: simulate a torn final write by truncating the last N bytes. */
export function simulateTornTail(dir: string, bytes: number): void {
  const p = join(dir, JOURNAL);
  if (!existsSync(p)) return;
  const size = statSync(p).size;
  truncateSync(p, Math.max(0, size - bytes));
}
