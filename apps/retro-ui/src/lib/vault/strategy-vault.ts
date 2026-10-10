// RetroPick Private Strategy Vault — passkey-protected local storage for non-financial
// strategy data (theses, draft markets, watchlists, risk budgets).
//
// Cryptography is entirely @category-labs/mera (WebAuthn PRF → HKDF → AES-256-GCM).
// This module owns only: the versioned plaintext schema, size bounds, localStorage
// persistence with tamper detection at read, and friendly error mapping. No custom
// crypto. A vault NEVER grants spending authority — it is data-at-rest protection only.
import { parseSecretVault, type PasskeyRelyingParty, type PasskeySecretVault } from '@category-labs/mera';

export const VAULT_STORAGE_KEY = 'retropick.strategy-vault.v1';
export const VAULT_SCHEMA_VERSION = 1;

export const ENTRY_KINDS = ['thesis', 'draft-market', 'watchlist', 'risk-budget', 'agent-config'] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

export interface StrategyEntry {
  id: string;
  kind: EntryKind;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

const MAX_TITLE = 120;
const MAX_BODY = 8000;
const MAX_ENTRIES = 64;
const ID_PATTERN = /^[0-9a-z-]{1,40}$/;

/** Stable relying-party identity: the current host. Passkeys are scoped to this domain. */
export function rpFromLocation(): PasskeyRelyingParty {
  let host = 'localhost';
  try { host = window.location.hostname || 'localhost'; } catch { /* non-browser */ }
  return { id: host, name: 'RetroPick' };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateEntry(value: unknown): StrategyEntry | null {
  if (!isRecord(value)) return null;
  const { id, kind, title, body, createdAt, updatedAt } = value;
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) return null;
  if (typeof kind !== 'string' || !(ENTRY_KINDS as readonly string[]).includes(kind)) return null;
  if (typeof title !== 'string' || !title.length || title.length > MAX_TITLE) return null;
  if (typeof body !== 'string' || body.length > MAX_BODY) return null;
  if (typeof createdAt !== 'number' || !Number.isSafeInteger(createdAt) || createdAt <= 0) return null;
  if (typeof updatedAt !== 'number' || !Number.isSafeInteger(updatedAt) || updatedAt < createdAt) return null;
  return { id, kind: kind as EntryKind, title, body, createdAt, updatedAt };
}

/** Serialize entries to the bytes that get encrypted into a vault. */
export function encodeEntries(entries: StrategyEntry[]): Uint8Array {
  const payload = JSON.stringify({ v: VAULT_SCHEMA_VERSION, entries });
  return new TextEncoder().encode(payload);
}

/** Parse and validate decrypted vault plaintext. Returns null on any malformed input. */
export function decodeEntries(bytes: Uint8Array): StrategyEntry[] | null {
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder().decode(bytes)); } catch { return null; }
  if (!isRecord(parsed) || parsed.v !== VAULT_SCHEMA_VERSION || !Array.isArray(parsed.entries)) return null;
  if (parsed.entries.length > MAX_ENTRIES) return null;
  const out: StrategyEntry[] = [];
  const seen = new Set<string>();
  for (const raw of parsed.entries) {
    const entry = validateEntry(raw);
    if (!entry || seen.has(entry.id)) return null;
    seen.add(entry.id);
    out.push(entry);
  }
  return out;
}

export function newEntryId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Read the stored vault. `null` = none. Throws on tampered/invalid stored data. */
export function loadStoredVault(storage: Storage = localStorage): PasskeySecretVault | null {
  const raw = storage.getItem(VAULT_STORAGE_KEY);
  if (raw === null) return null;
  return parseSecretVault(raw); // throws MeraError(VAULT_FORMAT_INVALID) on tampering
}

export function saveStoredVault(vault: PasskeySecretVault, storage: Storage = localStorage): void {
  storage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
}

export function clearStoredVault(storage: Storage = localStorage): void {
  storage.removeItem(VAULT_STORAGE_KEY);
}

const MESSAGES: Record<string, string> = {
  PRF_UNAVAILABLE: 'This browser or authenticator does not support the passkey PRF extension. The vault needs a PRF-capable passkey (e.g. a platform authenticator on a recent OS, or a synced passkey).',
  DECRYPT_FAILED: 'Decryption failed — the vault was not encrypted with this passkey, or the stored data was modified.',
  VAULT_FORMAT_INVALID: 'The stored vault is malformed. It may have been edited or corrupted. If you have an exported copy, import it to recover.',
  PASSKEY_OPERATION_FAILED: 'The passkey ceremony failed, was cancelled, or is unavailable in this context.',
  CRYPTO_UNAVAILABLE: 'Secure crypto APIs are unavailable in this browser.',
  INPUT_INVALID: 'Invalid vault input.',
};

/** Map a MeraError (or unknown error) to user-facing text. */
export function describeVaultError(error: unknown): string {
  const code = (error && typeof error === 'object' && 'code' in error && typeof (error as { code: unknown }).code === 'string')
    ? (error as { code: string }).code : null;
  if (code && MESSAGES[code]) return MESSAGES[code];
  return error instanceof Error ? error.message : 'Unexpected vault error.';
}

/** Wipe a decrypted secret buffer best-effort (matches the SDK's own hygiene). */
export function zeroBytes(bytes: Uint8Array | null | undefined): void {
  bytes?.fill(0);
}
