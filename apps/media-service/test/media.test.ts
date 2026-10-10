import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMediaApp } from '../src/app.ts';
import { MediaStore } from '../src/store.ts';
import { sniffImage } from '../src/model.ts';

const origin = 'http://127.0.0.1:3000';
const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const filler = (length: number, byte: number) => new Array(length).fill(byte);
const pngBytes = new Uint8Array([...pngSignature, ...filler(64, 7)]);
const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...filler(32, 1)]);
const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, ...filler(16, 3)]);
const webpBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x10, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, ...filler(16, 2)]);
const textBytes = new TextEncoder().encode('definitely not an image');
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

async function start(overrides: Partial<Parameters<typeof createMediaApp>[0]> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'retropick-media-'));
  const server = createMediaApp({ store: new MediaStore(dir), origins: [origin], pinataJwt: null, publicBase: 'http://media.local', ...overrides });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const upload = (bytes: Uint8Array, name = 'logo.png', type = 'image/png', headers: Record<string, string> = {}) => {
    const form = new FormData(); form.append('file', new Blob([bytes as BlobPart], { type }), name);
    return fetch(`${base}/api/media/upload`, { method: 'POST', headers: { Origin: origin, ...headers }, body: form });
  };
  return { base, upload, stop: async () => { await new Promise<void>((resolve) => server.close(() => resolve())); await rm(dir, { recursive: true, force: true }); } };
}

test('sniffImage types content by magic bytes only', () => {
  assert.equal(sniffImage(pngBytes).mime, 'image/png');
  assert.equal(sniffImage(jpegBytes).mime, 'image/jpeg');
  assert.equal(sniffImage(gifBytes).mime, 'image/gif');
  assert.equal(sniffImage(webpBytes).mime, 'image/webp');
  assert.throws(() => sniffImage(textBytes), /UNSUPPORTED_MEDIA_TYPE/);
});

test('health reports mode and stays read-open', async () => {
  const s = await start();
  try {
    const response = await fetch(`${s.base}/api/media/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { chainId: 10143, mediaOnly: true, mode: 'local' });
    assert.equal((await fetch(`${s.base}/api/media/health?x=1`)).status, 400); // Query strings are rejected everywhere.
  } finally { await s.stop(); }
});

test('local mode stores content-addressed files and serves them immutably', async () => {
  const s = await start();
  try {
    // Lying filename and part content-type must not matter; only sniffed bytes do.
    const uploaded = await s.upload(pngBytes, 'innocent.txt', 'text/plain');
    assert.equal(uploaded.status, 200);
    const result = await uploaded.json() as { uri: string; https: string | null; hash: string; bytes: number; mime: string; mode: string };
    assert.equal(result.mode, 'local'); assert.equal(result.mime, 'image/png'); assert.equal(result.bytes, pngBytes.length);
    assert.equal(result.hash, sha256(pngBytes)); assert.equal(result.https, null);
    const path = result.uri.replace('http://media.local', '');
    assert.match(path, /^\/api\/media\/[0-9a-f]{64}\.png$/);
    const fetched = await fetch(`${s.base}${path}`);
    assert.equal(fetched.status, 200);
    assert.equal(fetched.headers.get('content-type'), 'image/png');
    assert.equal(fetched.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    assert.equal(fetched.headers.get('x-content-type-options'), 'nosniff');
    assert.match(fetched.headers.get('content-security-policy') ?? '', /sandbox/);
    assert.deepEqual(new Uint8Array(await fetched.arrayBuffer()), pngBytes);
    const again = await s.upload(pngBytes);
    assert.equal((await again.json() as { hash: string }).hash, result.hash); // Content addressing keeps re-uploads idempotent.
  } finally { await s.stop(); }
});

test('upload boundaries: origin, method, body kind, size, type and unknown routes fail closed', async () => {
  const s = await start({ maxBytes: 1024 });
  try {
    const form = new FormData(); form.append('file', new Blob([pngBytes as BlobPart]));
    assert.equal((await fetch(`${s.base}/api/media/upload`, { method: 'POST', body: form })).status, 403); // Missing Origin.
    const forged = new FormData(); forged.append('file', new Blob([pngBytes as BlobPart]));
    assert.equal((await fetch(`${s.base}/api/media/upload`, { method: 'POST', headers: { Origin: 'https://evil.example' }, body: forged })).status, 403);
    assert.equal((await fetch(`${s.base}/api/media/upload`, { headers: { Origin: origin } })).status, 405);
    assert.equal((await fetch(`${s.base}/api/media/upload`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}' })).status, 415);
    assert.equal((await s.upload(textBytes)).status, 415); // Non-image content declared as image/png.
    const big = new Uint8Array(2048); big.set(pngSignature);
    assert.equal((await s.upload(big)).status, 413);
    const noFile = new FormData(); noFile.append('other', 'x');
    assert.equal((await fetch(`${s.base}/api/media/upload`, { method: 'POST', headers: { Origin: origin }, body: noFile })).status, 400);
    assert.equal((await fetch(`${s.base}/api/media/nope`)).status, 404);
    assert.equal((await fetch(`${s.base}/api/media/${encodeURIComponent('../../etc/passwd')}`)).status, 404);
  } finally { await s.stop(); }
});

test('uploads are rate limited per peer per minute', async () => {
  let now = 1700000000000;
  const s = await start({ clock: () => now });
  try {
    for (let index = 0; index < 12; index++) assert.equal((await s.upload(pngBytes)).status, 200);
    assert.equal((await s.upload(pngBytes)).status, 429);
    now += 61000;
    assert.equal((await s.upload(pngBytes)).status, 200);
  } finally { await s.stop(); }
});

test('pinata mode pins sniffed bytes and returns an ipfs:// uri', async () => {
  const cid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
  const seen: { url: string; auth: string; file: File; options: string }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const body = init?.body as FormData;
    seen.push({ url: String(input), auth: String((init?.headers as Record<string, string>)?.Authorization ?? ''), file: body.get('file') as File, options: String(body.get('pinataOptions') ?? '') });
    return Response.json({ IpfsHash: cid });
  };
  const s = await start({ pinataJwt: 'jwt-secret', fetchImpl });
  try {
    const response = await s.upload(pngBytes);
    assert.equal(response.status, 200);
    const result = await response.json() as { uri: string; https: string; mode: string; mime: string };
    assert.equal(result.uri, `ipfs://${cid}`);
    assert.equal(result.https, `https://ipfs.io/ipfs/${cid}`);
    assert.equal(result.mode, 'pinata'); assert.equal(result.mime, 'image/png');
    assert.equal(seen.length, 1);
    assert.equal(seen[0].url, 'https://api.pinata.cloud/pinning/pinFileToIPFS');
    assert.equal(seen[0].auth, 'Bearer jwt-secret'); // The JWT stays server-side.
    assert.ok(seen[0].options.includes('"cidVersion":0'));
    assert.deepEqual(new Uint8Array(await seen[0].file.arrayBuffer()), pngBytes);
    assert.equal(seen[0].file.name, `retropick-${sha256(pngBytes).slice(0, 8)}.png`);
  } finally { await s.stop(); }
});

test('pinata failures map to bounded upstream errors', async () => {
  const scenarios: { respond: () => Response; code: string }[] = [
    { respond: () => Response.json({ IpfsHash: 'not-a-cid' }), code: 'PIN_INVALID_CID' },
    { respond: () => Response.json({}, { status: 401 }), code: 'PIN_REJECTED' },
    { respond: () => { throw new TypeError('network down'); }, code: 'PIN_UNREACHABLE' },
  ];
  for (const scenario of scenarios) {
    const fetchImpl: typeof fetch = async () => scenario.respond();
    const s = await start({ pinataJwt: 'jwt-secret', fetchImpl });
    try {
      const response = await s.upload(pngBytes);
      assert.equal(response.status, 502);
      assert.equal((await response.json() as { error: string }).error, scenario.code);
    } finally { await s.stop(); }
  }
});
