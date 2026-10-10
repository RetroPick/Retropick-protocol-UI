// Private Strategy Vault unit tests — pure schema/persistence logic + tamper detection
// through the real @category-labs/mera parser. Run: node --test tests/vault.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSecretVault } from '@category-labs/mera';
import {
  VAULT_SCHEMA_VERSION, encodeEntries, decodeEntries, validateEntry, newEntryId,
  loadStoredVault, saveStoredVault, clearStoredVault, VAULT_STORAGE_KEY, describeVaultError,
} from '../src/lib/vault/strategy-vault.ts';

const entry = (over = {}) => ({ id: 'abc123', kind: 'thesis', title: 'MON perp backwardation', body: 'private notes', createdAt: 1_700_000_000, updatedAt: 1_700_000_100, ...over });

test('encode/decode roundtrip preserves entries exactly', () => {
  const entries = [entry(), entry({ id: 'def456', kind: 'watchlist', body: '' })];
  assert.deepEqual(decodeEntries(encodeEntries(entries)), entries);
});

test('decode rejects malformed payloads fail-closed', () => {
  assert.equal(decodeEntries(new TextEncoder().encode('not json')), null);
  assert.equal(decodeEntries(new TextEncoder().encode(JSON.stringify({ v: 99, entries: [] }))), null, 'future schema version');
  assert.equal(decodeEntries(new TextEncoder().encode(JSON.stringify({ v: VAULT_SCHEMA_VERSION, entries: [entry({ id: 'UPPER' })] }))), null, 'invalid id');
  assert.equal(decodeEntries(new TextEncoder().encode(JSON.stringify({ v: VAULT_SCHEMA_VERSION, entries: [entry({ kind: 'unknown' })] }))), null, 'unknown kind');
  assert.equal(decodeEntries(new TextEncoder().encode(JSON.stringify({ v: VAULT_SCHEMA_VERSION, entries: [entry({ title: '' })] }))), null, 'empty title');
  assert.equal(decodeEntries(new TextEncoder().encode(JSON.stringify({ v: VAULT_SCHEMA_VERSION, entries: [entry({ title: 'x'.repeat(121) })] }))), null, 'title bound');
  assert.equal(decodeEntries(new TextEncoder().encode(JSON.stringify({ v: VAULT_SCHEMA_VERSION, entries: [entry({ body: 'x'.repeat(8001) })] }))), null, 'body bound');
  assert.equal(decodeEntries(new TextEncoder().encode(JSON.stringify({ v: VAULT_SCHEMA_VERSION, entries: [entry(), entry()] }))), null, 'duplicate ids');
  assert.equal(decodeEntries(new TextEncoder().encode(JSON.stringify({ v: VAULT_SCHEMA_VERSION, entries: [entry({ updatedAt: 1 })] }))), null, 'updatedAt before createdAt');
  const many = Array.from({ length: 65 }, (_, i) => entry({ id: `e${i}` }));
  assert.equal(decodeEntries(new TextEncoder().encode(JSON.stringify({ v: VAULT_SCHEMA_VERSION, entries: many }))), null, 'entry count bound');
});

test('validateEntry accepts boundary values', () => {
  assert.ok(validateEntry(entry({ title: 'x'.repeat(120), body: 'y'.repeat(8000) })));
  assert.equal(validateEntry(entry({ createdAt: 0 })), null);
  assert.equal(validateEntry(entry({ createdAt: 1.5 })), null);
  assert.equal(validateEntry(null), null);
});

test('newEntryId matches the id pattern and is unique', () => {
  const ids = new Set(Array.from({ length: 32 }, () => newEntryId()));
  assert.equal(ids.size, 32);
  for (const id of ids) assert.match(id, /^[0-9a-f]{16}$/);
});

const b64 = (bytes) => Buffer.alloc(bytes).toString('base64url');

function stubStorage() {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k), clear: () => map.clear() };
}

test('storage roundtrip: save then load returns the same vault; clear removes it', () => {
  const storage = stubStorage();
  // Synthetic but structurally valid v1 vault (base64url fields decoding to the right byte lengths).
  const vault = { version: 1, credential: { credentialId: b64(16), transports: ['internal'] }, prfSalt: b64(32), nonce: b64(12), ciphertext: b64(48) };
  saveStoredVault(vault, storage);
  const loaded = loadStoredVault(storage);
  assert.equal(loaded.credential.credentialId, vault.credential.credentialId);
  assert.equal(storage.getItem(VAULT_STORAGE_KEY), JSON.stringify(vault));
  clearStoredVault(storage);
  assert.equal(loadStoredVault(storage), null);
});

test('tampered stored vault is detected at read (mera parser)', () => {
  const storage = stubStorage();
  const vault = { version: 1, credential: { credentialId: b64(16) }, prfSalt: b64(32), nonce: b64(12), ciphertext: b64(48) };
  saveStoredVault(vault, storage);
  storage.setItem(VAULT_STORAGE_KEY, storage.getItem(VAULT_STORAGE_KEY).replace('"version":1', '"version":2'));
  assert.throws(() => loadStoredVault(storage), (e) => e && e.code === 'VAULT_FORMAT_INVALID');
  // Tampered ciphertext (valid base64url but wrong length) also rejected.
  storage.setItem(VAULT_STORAGE_KEY, JSON.stringify({ ...vault, ciphertext: b64(4) }));
  assert.throws(() => loadStoredVault(storage), (e) => e && e.code === 'VAULT_FORMAT_INVALID');
});

test('describeVaultError maps mera codes to actionable text', () => {
  assert.match(describeVaultError({ code: 'PRF_UNAVAILABLE' }), /PRF/i);
  assert.match(describeVaultError({ code: 'DECRYPT_FAILED' }), /Decryption failed/);
  assert.match(describeVaultError(new Error('boom')), /boom/);
  assert.match(describeVaultError('weird'), /Unexpected/);
});
