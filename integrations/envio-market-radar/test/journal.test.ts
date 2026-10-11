// Durability tests for the Envio radar journal/snapshot (operator-corrected contract):
// restart resume, duplicate delivery, interrupted (torn) writes, reorg fallback,
// replay consistency, decode-error counting, and separated freshness metrics.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RadarAggregator, type RadarEvent } from '../src/radar.ts';
import { appendJournal, loadState, resolveResume, writeSnapshot, simulateTornTail, STATE_SCHEMA_VERSION, type SnapshotState } from '../src/journal.ts';

const ev = (name: string, block: number, logIndex: number, over: Partial<RadarEvent> = {}): RadarEvent => ({
  name, args: name === 'Trade' ? { filledSize: 10n ** 18n, price: 4n * 10n ** 18n } : { token: '0xabc' },
  address: '0x1f5de72616a7fe645cf45ac66dfce8ac7452c57f', blockNumber: block, blockTimestamp: block * 12, logIndex, transactionHash: `0xtx${block}${logIndex}`, ...over,
});

function freshDir() { return mkdtempSync(join(tmpdir(), 'radar-journal-')); }

test('snapshot roundtrip: state restores with exact aggregations and counters', () => {
  const dir = freshDir();
  try {
    const agg = new RadarAggregator({ '0x1f5de72616a7fe645cf45ac66dfce8ac7452c57f': '0x43e7' });
    agg.ingest([ev('TokenLaunched', 100, 0), ev('Trade', 101, 0), ev('Trade', 101, 1)]);
    agg.recordDecodeError();
    agg.observeHead(150);
    const persisted = JSON.parse(JSON.stringify(agg.persist(), (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
    writeSnapshot(dir, { schemaVersion: STATE_SCHEMA_VERSION, chainId: 10143, deployment: 'test', checkpoint: { cursorBlock: 102, anchorBlock: 101, anchorBlockHash: '0xhash101', ts: Date.now() }, aggregator: persisted, counters: { journalLines: 3, decodeErrors: 1, replays: 0 } } satisfies SnapshotState);
    const { snapshot } = loadState(dir);
    assert.equal(snapshot?.checkpoint.cursorBlock, 102);
    // revive bigints like stream.ts does
    const revived = snapshot!.aggregator as ReturnType<typeof JSON.parse>;
    for (const entry of revived.markets) { const m = entry[2] ?? entry[1]; for (const k of ['filledBaseUnits', 'quoteVolume18']) if (typeof m[k] === 'string') m[k] = BigInt(m[k]); }
    const restored = RadarAggregator.restore(revived as never, { '0x1f5de72616a7fe645cf45ac66dfce8ac7452c57f': '0x43e7' });
    const snap = restored.snapshot();
    assert.equal(snap.counts.launched, 1);
    assert.equal(snap.markets[0].trades, 2);
    assert.equal(snap.markets[0].quoteVolume18, 8n * 10n ** 18n);
    assert.equal(snap.decodeErrors, 1);
    assert.equal(snap.freshness.lastEventBlock, 101);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('duplicate delivery after restart is idempotent via journal ids + seen set', () => {
  const dir = freshDir();
  try {
    const agg = new RadarAggregator();
    agg.ingest([ev('Trade', 100, 0)]);
    appendJournal(dir, [{ id: '100:0:0xtx1000', blockNumber: 100, blockHash: '0xa', name: 'Trade', ts: Date.now() }]);
    const { journalIds } = loadState(dir);
    assert.equal(journalIds.size, 1);
    // replay of the same event: aggregator idempotence (restored seen set contains the id)
    const persisted = JSON.parse(JSON.stringify(agg.persist(), (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
    const restored = RadarAggregator.restore(persisted as never);
    const result = restored.ingest([ev('Trade', 100, 0)]);
    assert.equal(result.accepted, 0);
    assert.equal(result.duplicates, 1);
    assert.equal(restored.snapshot().markets[0].trades, 1, 'no double-counted volume');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('torn final journal line is detected and skipped, not parsed', () => {
  const dir = freshDir();
  try {
    appendJournal(dir, [
      { id: '100:0:0xtx1000', blockNumber: 100, blockHash: '0xa', name: 'Trade', ts: Date.now() },
      { id: '101:0:0xtx1010', blockNumber: 101, blockHash: '0xb', name: 'Trade', ts: Date.now() },
    ]);
    simulateTornTail(dir, 15); // cut into the last line
    const { journal, journalIds } = loadState(dir);
    assert.equal(journal.tornTail, true);
    assert.equal(journalIds.size, 1, 'torn line skipped — replay re-delivers it');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('reorg: anchor hash mismatch forces conservative full replay from genesis cursor', async () => {
  const dir = freshDir();
  try {
    const agg = new RadarAggregator();
    agg.ingest([ev('Trade', 200, 0)]);
    writeSnapshot(dir, { schemaVersion: STATE_SCHEMA_VERSION, chainId: 10143, deployment: 'test', checkpoint: { cursorBlock: 201, anchorBlock: 200, anchorBlockHash: '0xOLD', ts: Date.now() }, aggregator: agg.persist(), counters: { journalLines: 1, decodeErrors: 0, replays: 0 } });
    const { snapshot } = loadState(dir);
    const resume = await resolveResume(snapshot!, async (block) => (block === 200 ? '0xNEW' : null), 69_509_526);
    assert.equal(resume.reorged, true);
    assert.equal(resume.fromBlock, 69_509_526, 'deep reorg → full replay');
    // matching hash → exact resume
    const resume2 = await resolveResume(snapshot!, async () => '0xold', 69_509_526);
    assert.equal(resume2.reorged, false);
    assert.equal(resume2.fromBlock, 201);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('event reordering across restarts is tolerated (aggregator takes max block)', () => {
  const agg = new RadarAggregator();
  agg.ingest([ev('Trade', 300, 0)]);
  agg.ingest([ev('Trade', 250, 0)]); // late-arriving older event
  const snap = agg.snapshot();
  assert.equal(snap.freshness.lastEventBlock, 300);
  assert.equal(snap.markets[0].trades, 2);
});

test('decode errors are counted, never silent', () => {
  const agg = new RadarAggregator();
  agg.recordDecodeError(); agg.recordDecodeError();
  assert.equal(agg.snapshot().decodeErrors, 2);
});

test('freshness metrics stay separated (head ≠ lastEvent ≠ cursor)', () => {
  const agg = new RadarAggregator();
  agg.observeHead(1000);
  agg.ingest([ev('Trade', 900, 0)]);
  const f = agg.snapshot().freshness;
  assert.equal(f.headHeight, 1000);
  assert.equal(f.lastEventBlock, 900);
  assert.equal(f.headMinusEvent, 100);
  assert.notEqual(f.cursorBlock, f.headHeight, 'cursor filled by stream layer');
});
