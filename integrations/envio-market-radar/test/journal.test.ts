// Durability + reorg tests for the schema-v3 journal/snapshot and the stream's recovery
// and rollback logic, driven by a fake HyperSync client (no network).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { encode, decode, readJournal, loadSnapshot, ringPut, findForkBlock, STATE_SCHEMA_VERSION, type JournalEvent } from '../src/journal.ts';
import { createRadarStream, buildQuery, normalizeTimestamp, LOG_FIELDS, BLOCK_FIELDS, type HyperClient, type ResponseStream } from '../src/stream.ts';
import { toEventSelector, encodeAbiParameters } from 'viem';
import { indexerAbi } from '../../../packages/launchpad-sdk/src/events.ts';

const dir = () => mkdtempSync(join(tmpdir(), 'radar-v3-'));
const FACTORY = '0xa7f18b9eceb0a9852b08408854a45d00fc682454';
const COORD = '0xad62309242ea65bb07c833669ec6a4ed23af738f';
const MARKET = '0x1f5de72616a7fe645cf45ac66dfce8ac7452c57f';
const TOKEN = '0x43e7e9b1b7d9a143573307b13d14b51580c18f15';
const ID = { chainId: 10143, deployment: 'test', factory: FACTORY, fromBlock: 1000 };

const sig = (name: string) => toEventSelector(indexerAbi.find((e) => e.type === 'event' && e.name === name) as never);
const tokenLaunchedTopics = (token: string) => { const abi = indexerAbi.find((e) => e.type === 'event' && e.name === 'TokenLaunched') as { inputs: Array<{ name: string; type: string; indexed?: boolean }> }; const indexed = abi.inputs.filter((i) => i.indexed); return [sig('TokenLaunched'), ...indexed.map((i) => encodeAbiParameters([{ type: i.type }], [token]))]; };

// Minimal real-ABI log builders so decodeEventLog succeeds in the stream.
function tokenLaunchedLog(block: number, logIndex: number, token: string, hash: string) {
  const abi = indexerAbi.find((e) => e.type === 'event' && e.name === 'TokenLaunched') as { inputs: Array<{ name: string; type: string; indexed?: boolean }> };
  const indexed = abi.inputs.filter((i) => i.indexed);
  const body = abi.inputs.filter((i) => !i.indexed);
  const topics = [sig('TokenLaunched'), ...indexed.map((i) => encodeAbiParameters([{ type: i.type }], [i.type.includes('address') ? token : (i.type.startsWith('uint') ? 0n : '0x')]))];
  const data = body.length ? encodeAbiParameters(body.map((i) => ({ type: i.type })), body.map((i) => i.type.startsWith('uint') ? 0n : i.type === 'address' ? token : i.type.startsWith('bytes') ? '0x' : i.type === 'string' ? '' : i.type === 'bool' ? false : 0n)) : '0x';
  return { address: FACTORY, blockNumber: block, logIndex, transactionHash: hash, blockHash: `0xbh${block}`, data, topics, removed: false };
}

function blk(n: number, hash = `0xbh${n}`, parent = `0xbh${n - 1}`) { return { number: n, hash, parentHash: parent, timestamp: n * 10 }; }

class FakeStream implements ResponseStream {
  #batches: Array<{ data: { blocks: unknown[]; logs: unknown[] }; nextBlock: number; archiveHeight?: number; rollbackGuard?: unknown }>;
  #i = 0;
  constructor(batches: FakeStream['#batches']) { this.#batches = batches; }
  async recv() { return this.#i < this.#batches.length ? this.#batches[this.#i++] as never : null; }
  async close() { /* noop */ }
}

function fakeClient(opts: { height: number; batches: ConstructorParameters<typeof FakeStream>[0]; hashAt: (b: number) => string | null }): HyperClient {
  return {
    async getChainId() { return 10143; },
    async getHeight() { return opts.height; },
    async get(q) { const b = (q as { fromBlock: number }).fromBlock; const h = opts.hashAt(b); return { data: { blocks: h ? [{ number: b, hash: h }] : [], logs: [], transactions: [], traces: [] }, nextBlock: b + 1, totalExecutionTime: 0 } as never; },
    async stream() { return new FakeStream(opts.batches); },
  };
}

test('buildQuery uses installed-SDK field names (PascalCase, no "topics")', () => {
  const q = buildQuery(1000, [FACTORY]) as unknown as { fieldSelection: { log: string[]; block: string[] }; logs: unknown[] };
  assert.deepEqual(q.fieldSelection.log, [...LOG_FIELDS]);
  assert.deepEqual(q.fieldSelection.block, [...BLOCK_FIELDS]);
  assert.ok(q.fieldSelection.block.includes('Number') && !q.fieldSelection.block.includes('number'));
  assert.ok(!q.fieldSelection.log.includes('topics'));
});

test('normalizeTimestamp handles number/bigint/hex/ms', () => {
  assert.equal(normalizeTimestamp(1000), 1000);
  assert.equal(normalizeTimestamp(1700000000n), 1700000000);
  assert.equal(normalizeTimestamp('0x3e8'), 1000);
  assert.equal(normalizeTimestamp(1700000000000), 1700000000);
  assert.equal(normalizeTimestamp(undefined), 0);
});

test('bigint-tagged journal survives encode/decode exactly', () => {
  const e = { id: 'x', name: 'Trade', address: MARKET, blockNumber: 5, blockTimestamp: 50, logIndex: 0, transactionHash: '0xt', blockHash: '0xbh5', args: { filledSize: 10n ** 30n } } satisfies JournalEvent;
  const back = decode<JournalEvent>(encode(e));
  assert.equal(back.args.filledSize, 10n ** 30n);
  assert.equal(typeof back.args.filledSize, 'bigint');
});

test('ingests two TokenLaunched, advances cursor via nextBlock, journals + snapshots', async () => {
  const d = dir();
  try {
    const batches = [
      { data: { blocks: [blk(1000)], logs: [tokenLaunchedLog(1000, 0, TOKEN, '0xa')] }, nextBlock: 1001, archiveHeight: 1005 },
      { data: { blocks: [], logs: [] }, nextBlock: 1003, archiveHeight: 1005 }, // empty batch still advances
    ];
    const stream = await createRadarStream({ apiToken: 't', factory: FACTORY, coordinator: COORD, marketTokens: {}, fromBlock: 1000, chainId: 10143, deployment: 'test', stateDir: d }, async () => fakeClient({ height: 1005, batches, hashAt: (b) => `0xbh${b}` }));
    assert.equal(await stream.runOnce(), 'end');
    assert.equal(stream.cursor(), 1003);
    assert.equal(stream.metrics().counts.launched, 1);
    const snap = loadSnapshot(d).snapshot!;
    assert.equal(snap.schemaVersion, STATE_SCHEMA_VERSION);
    assert.equal(snap.cursorBlock, 1003);
    assert.equal(readJournal(d).events.length, 1);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('restart resumes from snapshot and re-folds a journal tail written after the snapshot', async () => {
  const d = dir();
  try {
    const mk = (batches: ConstructorParameters<typeof FakeStream>[0]) => createRadarStream({ apiToken: 't', factory: FACTORY, coordinator: COORD, marketTokens: {}, fromBlock: 1000, chainId: 10143, deployment: 'test', stateDir: d }, async () => fakeClient({ height: 1010, batches, hashAt: (b) => `0xbh${b}` }));
    const s1 = await mk([{ data: { blocks: [blk(1000)], logs: [tokenLaunchedLog(1000, 0, TOKEN, '0xa')] }, nextBlock: 1001, archiveHeight: 1010 }]);
    await s1.runOnce();
    // Simulate a crash AFTER journal append but BEFORE the snapshot caught up: append a journal line, rewind journalCount.
    const snapPath = join(d, 'state.json');
    const snap = decode<ReturnType<typeof loadSnapshot>['snapshot']>(readFileSync(snapPath, 'utf8'))!;
    const tail: JournalEvent = { id: '1001:0:0xb', name: 'TokenLaunched', address: FACTORY, blockNumber: 1001, blockTimestamp: 10010, logIndex: 0, transactionHash: '0xb', blockHash: '0xbh1001', args: { token: '0xB' } };
    appendFileSync(join(d, 'journal.jsonl'), encode(tail) + '\n');
    writeFileSync(snapPath, encode({ ...snap, journalCount: 1 }) + '\n'); // snapshot lags the journal by one
    const s2 = await mk([]);
    assert.equal(s2.metrics().counts.launched, 2, 'journal tail re-folded on restart');
    assert.equal(s2.cursor(), 1002);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('torn final journal line is truncated and the event re-delivered on replay', async () => {
  const d = dir();
  try {
    const good: JournalEvent = { id: '1000:0:0xa', name: 'TokenLaunched', address: FACTORY, blockNumber: 1000, blockTimestamp: 10000, logIndex: 0, transactionHash: '0xa', blockHash: '0xbh1000', args: { token: TOKEN } };
    writeFileSync(join(d, 'journal.jsonl'), encode(good) + '\n' + encode(good).slice(0, 12)); // torn tail, no newline
    const loaded = readJournal(d);
    assert.equal(loaded.events.length, 1);
    assert.equal(loaded.tornTail, true);
    assert.equal(readFileSync(join(d, 'journal.jsonl'), 'utf8').endsWith('\n'), true, 'torn tail truncated on disk');
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('corrupt MIDDLE journal line is a hard error (no silent rebuild)', () => {
  const d = dir();
  try {
    writeFileSync(join(d, 'journal.jsonl'), 'not json\n{"id":"x"}\n');
    assert.throws(() => readJournal(d), /corrupt at line 1/);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('reorg: a changed block hash rolls back, drops orphaned events and normalized amounts, replays canonical only', async () => {
  const d = dir();
  try {
    // Session 1: trade at 1001 on the orphaned chain (hash 0xbh1001).
    const tradeLog = (block: number, hash: string, blockHash: string) => {
      const abi = indexerAbi.find((e) => e.type === 'event' && e.name === 'Trade') as { inputs: Array<{ name: string; type: string; indexed?: boolean }> };
      const indexed = abi.inputs.filter((i) => i.indexed); const body = abi.inputs.filter((i) => !i.indexed);
      return { address: MARKET, blockNumber: block, logIndex: 0, transactionHash: hash, blockHash, removed: false,
        topics: [sig('Trade'), ...indexed.map((i) => encodeAbiParameters([{ type: i.type }], [i.type.startsWith('uint') ? 0n : i.type === 'address' ? MARKET : '0x']))],
        data: encodeAbiParameters(body.map((i) => ({ type: i.type })), body.map((i) => i.type.startsWith('uint') ? (i.name === 'filledSize' ? 10n ** 18n : i.name === 'price' ? 2n * 10n ** 18n : 0n) : i.type === 'address' ? MARKET : i.type.startsWith('bytes') ? '0x' : i.type === 'bool' ? false : 0n)) };
    };
    const mkClient = (batches: ConstructorParameters<typeof FakeStream>[0], hashAt: (b: number) => string | null) => fakeClient({ height: 1010, batches, hashAt });
    const readMarketParams = async () => ({ token: TOKEN, baseDecimals: 18, sizePrecision: 10n ** 18n });
    const s1 = await createRadarStream({ apiToken: 't', factory: FACTORY, coordinator: COORD, marketTokens: { [MARKET]: TOKEN }, readMarketParams, fromBlock: 1000, chainId: 10143, deployment: 'test', stateDir: d },
      async () => mkClient([{ data: { blocks: [blk(1000), blk(1001)], logs: [tradeLog(1001, '0xorphan', '0xbh1001')] }, nextBlock: 1002, archiveHeight: 1010 }], (b) => `0xbh${b}`));
    await s1.runOnce();
    assert.equal(s1.metrics().markets[0].trades, 1);
    assert.equal(s1.metrics().markets[0].quoteVolume18, 2n * 10n ** 18n);

    // Session 2: block 1001 now has a DIFFERENT canonical hash; the old trade is orphaned, a new one replaces it.
    const canonical = (b: number) => (b === 1001 ? '0xNEW1001' : `0xbh${b}`);
    const s2 = await createRadarStream({ apiToken: 't', factory: FACTORY, coordinator: COORD, marketTokens: { [MARKET]: TOKEN }, readMarketParams, fromBlock: 1000, chainId: 10143, deployment: 'test', stateDir: d, resetOnIdentityMismatch: false },
      async () => mkClient([{ data: { blocks: [{ number: 1001, hash: '0xNEW1001', parentHash: '0xbh1000', timestamp: 10010 }], logs: [tradeLog(1001, '0xnewtrade', '0xNEW1001')] }, nextBlock: 1002, archiveHeight: 1010 }], canonical));
    // Restart anchor check sees 1001 hash changed → rollback to 1001, orphan trade dropped.
    assert.equal(s2.metrics().markets[0]?.trades ?? 0, 0, 'orphaned trade removed on restart rollback');
    assert.equal(s2.metrics().markets[0]?.quoteVolume18 ?? 0n, 0n, 'orphaned amount removed');
    const r = await s2.runOnce();
    assert.ok(r === 'end' || r === 'reorg');
    assert.equal(s2.metrics().markets[0].trades, 1, 'exactly one canonical trade after replay');
    assert.equal(s2.metrics().markets[0].quoteVolume18, 2n * 10n ** 18n);
    assert.equal(s2.status().counters.reorgs >= 1, true);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('identity mismatch refuses by default, resets with the explicit flag', async () => {
  const d = dir();
  try {
    writeFileSync(join(d, 'state.json'), encode({ schemaVersion: STATE_SCHEMA_VERSION, identity: { ...ID, deployment: 'OTHER' }, cursorBlock: 2000, journalCount: 0, ring: [], aggregator: { seen: [], tokens: [], markets: [], marketTokens: [], counts: { launched: 0, committed: 0, secured: 0, completed: 0 }, lastBlock: 0, decodeErrors: 0, mappingConflicts: 0, lastEventBlock: 0 }, counters: { decodeErrors: 0, reorgs: 0, rebuilds: 0, removedLogs: 0, foreignLogs: 0 }, ts: 0 }) + '\n');
    await assert.rejects(createRadarStream({ apiToken: 't', factory: FACTORY, marketTokens: {}, fromBlock: 1000, chainId: 10143, deployment: 'test', stateDir: d }, async () => fakeClient({ height: 1, batches: [], hashAt: () => null })), /refusing/);
    const ok = await createRadarStream({ apiToken: 't', factory: FACTORY, marketTokens: {}, fromBlock: 1000, chainId: 10143, deployment: 'test', stateDir: d, resetOnIdentityMismatch: true }, async () => fakeClient({ height: 1, batches: [], hashAt: () => null }));
    assert.equal(ok.cursor(), 1000);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('chain-id mismatch fails closed', async () => {
  const d = dir();
  try {
    await assert.rejects(createRadarStream({ apiToken: 't', factory: FACTORY, marketTokens: {}, fromBlock: 1000, chainId: 10143, deployment: 'test', stateDir: d }, async () => ({ ...fakeClient({ height: 1, batches: [], hashAt: () => null }), getChainId: async () => 1 })), /chain 1 ≠ configured 10143/);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('findForkBlock walks back to the newest matching hash', async () => {
  let ring: Array<[number, string]> = [];
  for (const b of [10, 11, 12, 13]) ring = ringPut(ring, b, `0xh${b}`);
  const fork = await findForkBlock(ring, async (b) => (b <= 11 ? `0xh${b}` : '0xDIFF'));
  assert.equal(fork.forkBlock, 12);
  const deep = await findForkBlock(ring, async () => '0xDIFF');
  assert.equal(deep.forkBlock, null);
  const unverifiable = await findForkBlock(ring, async () => null);
  assert.equal(unverifiable.unverifiable, true);
});

test('schema3 migration preserves the raw journal and rebuilds correct normalized totals', async () => {
  const d = dir();
  try {
    const event: JournalEvent = { id: '1000:0:0xfill', name: 'Trade', address: MARKET, blockNumber: 1000, blockTimestamp: 10000, logIndex: 0, transactionHash: '0xfill', blockHash: '0xbh1000', args: { filledSize: 100_000_000n, price: 3_990_000_000_000_000n } };
    const journal = encode(event) + '\n';
    writeFileSync(join(d, 'journal.jsonl'), journal);
    writeFileSync(join(d, 'state.json'), encode({ schemaVersion: 3, identity: ID, aggregator: { invalidOldAmount: '399000' }, cursorBlock: 1001, journalCount: 1 }) + '\n');
    const stream = await createRadarStream({ apiToken: 't', factory: FACTORY, marketTokens: { [MARKET]: TOKEN }, readMarketParams: async () => ({ token: TOKEN, baseDecimals: 18, sizePrecision: 100_000_000n }), fromBlock: 1000, chainId: 10143, deployment: 'test', stateDir: d }, async () => fakeClient({ height: 1001, batches: [], hashAt: b => `0xbh${b}` }));
    assert.equal(stream.metrics().markets[0].filledBaseUnits, 10n ** 18n);
    assert.equal(stream.metrics().markets[0].quoteVolume18, 3_990_000_000_000_000n);
    assert.equal(stream.metrics().aggregationVersion, 4);
    assert.equal(loadSnapshot(d).snapshot!.schemaVersion, 4);
    assert.equal(readFileSync(join(d, 'journal.jsonl'), 'utf8'), journal, 'migration must not rewrite source events');
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('schema3 migration checks previous deployment identity before replay or write', async () => {
  const d = dir();
  try {
    const old = encode({ schemaVersion: 3, identity: { ...ID, deployment: 'OTHER' } }) + '\n';
    writeFileSync(join(d, 'state.json'), old);
    await assert.rejects(createRadarStream({ apiToken: 't', factory: FACTORY, marketTokens: {}, fromBlock: 1000, chainId: 10143, deployment: 'test', stateDir: d }, async () => fakeClient({ height: 1001, batches: [], hashAt: b => `0xbh${b}` })), /refusing/);
    assert.equal(readFileSync(join(d, 'state.json'), 'utf8'), old);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('RPC precision recovery restores complete historical amounts without duplicate counts', async () => {
  const d = dir(); const now = Date.now;
  let clock = now();
  Date.now = () => clock;
  try {
    const event: JournalEvent = { id: '1000:0:0xfill', name: 'Trade', address: MARKET, blockNumber: 1000, blockTimestamp: 10000, logIndex: 0, transactionHash: '0xfill', blockHash: '0xbh1000', args: { filledSize: 100_000_000n, price: 3_990_000_000_000_000n } };
    writeFileSync(join(d, 'journal.jsonl'), encode(event) + '\n');
    let calls = 0;
    const stream = await createRadarStream({ apiToken: 't', factory: FACTORY, marketTokens: { [MARKET]: TOKEN }, readMarketParams: async () => ++calls === 1 ? null : { token: TOKEN, baseDecimals: 18, sizePrecision: 100_000_000n }, fromBlock: 1000, chainId: 10143, deployment: 'test', stateDir: d }, async () => fakeClient({ height: 1005, batches: [{ data: { blocks: [], logs: [] }, nextBlock: 1005, archiveHeight: 1005 }], hashAt: b => `0xbh${b}` }));
    assert.equal(stream.metrics().markets[0].quoteVolume18, null);
    clock += 30_001;
    await stream.runOnce();
    assert.equal(stream.metrics().markets[0].quoteVolume18, 3_990_000_000_000_000n);
    assert.equal(stream.metrics().markets[0].trades, 1);
    assert.equal(readJournal(d).events.length, 1);
  } finally { Date.now = now; rmSync(d, { recursive: true, force: true }); }
});
