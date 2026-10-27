'use client';
// Private Strategy Vault — Mera "One Passkey, Many Keys" sponsor feature.
// WebAuthn-PRF-derived encryption (via @category-labs/mera) protects private strategy
// data at rest in this browser. Every ceremony is a real browser passkey prompt; nothing
// is mocked. The vault NEVER grants spending authority and is independent of the trading
// wallet. Works in demo and live modes (local passkey + storage, no chain, no network).
import { useEffect, useMemo, useRef, useState } from 'react';
import { type PasskeySecretVault } from '@category-labs/mera';
import { createSecretVaultWithExistingPasskey, createSecretVaultWithNewPasskey, decryptSecretVaultWithPasskey } from '@category-labs/mera';
import { FiLock, FiUnlock, FiPlus, FiTrash2 } from 'react-icons/fi';
import { RiShieldCheckLine } from 'react-icons/ri';
import { DemoBadge } from '@/components/trading/primitives';
import { DATA_MODE } from '@/lib/live/env';
import {
  clearStoredVault, decodeEntries, describeVaultError, encodeEntries, ENTRY_KINDS, loadStoredVault,
  newEntryId, rpFromLocation, saveStoredVault, VAULT_SCHEMA_VERSION, zeroBytes,
  type EntryKind, type StrategyEntry,
} from '@/lib/vault/strategy-vault';

const KIND_LABEL: Record<EntryKind, string> = {
  thesis: 'Trading thesis', 'draft-market': 'Draft prediction market', watchlist: 'Watchlist',
  'risk-budget': 'Agent risk budget', 'agent-config': 'Market-making config',
};

function shortCredential(credentialId: string): string {
  return credentialId.length > 16 ? `${credentialId.slice(0, 10)}…${credentialId.slice(-4)}` : credentialId;
}

export function StrategyVault() {
  const demo = DATA_MODE !== 'live';
  const [stored, setStored] = useState<PasskeySecretVault | null | 'error'>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [entries, setEntries] = useState<StrategyEntry[] | null>(null);
  const [importText, setImportText] = useState('');
  const plaintext = useRef<Uint8Array | null>(null);

  useEffect(() => {
    try { setStored(loadStoredVault()); } catch { setStored('error'); }
  }, []);

  const lock = () => { setEntries(null); zeroBytes(plaintext.current); plaintext.current = null; setImportText(''); setError(''); setBusy(''); };

  const run = async (label: string, fn: () => Promise<void>) => {
    if (busy) return;
    setError(''); setBusy(label);
    try { await fn(); } catch (cause) { setError(describeVaultError(cause)); } finally { setBusy(''); }
  };

  const createVault = () => run('create', async () => {
    const secret = encodeEntries([]);
    const vault = await createSecretVaultWithNewPasskey({ rp: rpFromLocation(), user: { name: 'RetroPick strategy vault', displayName: 'RetroPick strategy vault' }, secret });
    zeroBytes(secret);
    saveStoredVault(vault); setStored(vault); setEntries([]);
  });

  const importVault = () => run('import', async () => {
    if (!importText.trim()) throw Error('Paste an exported vault JSON first.');
    // parseSecretVault inside the save path validates structure; tampered input throws here.
    const parsed = JSON.parse(importText.trim());
    saveStoredVault(parsed); setStored(loadStoredVault()!); setEntries(null); setImportText('');
  });

  const unlock = () => run('unlock', async () => {
    if (!stored || stored === 'error') return;
    const secret = await decryptSecretVaultWithPasskey({ rpId: rpFromLocation().id, vault: stored });
    const decoded = decodeEntries(secret);
    if (decoded === null) throw Error('Vault contents failed schema validation (expected a RetroPick strategy vault).');
    plaintext.current = secret; setEntries(decoded);
  });

  /** Every save re-encrypts through a fresh passkey assertion (fresh PRF salt) — public SDK path only. */
  const persist = (next: StrategyEntry[]) => run('save', async () => {
    if (!stored || stored === 'error') return;
    const secret = encodeEntries(next);
    const vault = await createSecretVaultWithExistingPasskey({ rpId: rpFromLocation().id, credential: stored.credential, secret });
    zeroBytes(secret);
    saveStoredVault(vault); setStored(vault); setEntries(next);
  });

  const exportVault = () => {
    if (!stored || stored === 'error') return;
    const blob = new Blob([JSON.stringify(stored)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `retropick-strategy-vault-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const credential = stored && stored !== 'error' ? stored.credential : null;
  const state = stored === 'error' ? 'corrupt' : !stored ? 'none' : entries ? 'unlocked' : 'locked';

  return <section className="rp-hub-section" aria-label="Private strategy vault" data-testid="strategy-vault" data-state={state}>
    <div className="rp-hub-card">
      <div className="rp-hub-card-head">
        <span className="rp-card-icon"><RiShieldCheckLine size={15} aria-hidden /></span>
        <h3>Private Strategy Vault</h3>
        <span className="rp-chip">Mera · passkey PRF</span>
        {demo && <DemoBadge />}
      </div>
      <p className="rp-card-sub">
        Protect trading theses, draft prediction markets and agent risk budgets with browser passkey encryption.
      </p>

      {state === 'none' && <>
        <div className="rp-vault-actions">
          <button type="button" className="rp-btn rp-btn-primary" data-testid="vault-create" disabled={!!busy} onClick={() => void createVault()}>
            {busy === 'create' ? 'Waiting for passkey…' : 'Create vault with a passkey'}
          </button>
        </div>
        <details className="rp-advanced">
          <summary>Import an exported vault</summary>
          <p className="rp-note">For cross-device use: restore access using your exported JSON vault file.</p>
          <textarea data-testid="vault-import" rows={4} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder='{"version":1,"credential":{…},"prfSalt":…}' aria-label="Vault JSON"/>
          <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" data-testid="vault-import-go" disabled={!!busy || !importText.trim()} onClick={() => void importVault()}>Import vault</button>
        </details>
      </>}

      {state === 'corrupt' && <div className="rp-tx rp-tx-fail" role="alert" data-testid="vault-corrupt">
        The stored vault is malformed. {!entries && 'Create a new vault, or import an exported copy to recover.'}
        <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" onClick={() => { clearStoredVault(); setStored(null); }}>Delete stored vault</button>
      </div>}

      {credential && <p className="rp-note" data-testid="vault-credential">Passkey credential <code>{shortCredential(credential.credentialId)}</code> · format v{VAULT_SCHEMA_VERSION}</p>}

      {state === 'locked' && <div className="rp-vault-actions">
        <button type="button" className="rp-btn rp-btn-primary" data-testid="vault-unlock" disabled={!!busy} onClick={() => void unlock()}>
          <FiUnlock size={14} aria-hidden/> {busy === 'unlock' ? 'Waiting for passkey…' : 'Unlock with passkey'}
        </button>
        <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" onClick={exportVault}>Export backup</button>
        <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" onClick={() => { clearStoredVault(); setStored(null); }}>Delete vault</button>
      </div>}

      {state === 'unlocked' && entries !== null && <>
        <VaultEntries entries={entries} busy={!!busy} onSave={(next) => void persist(next)} onLock={lock} onExport={exportVault} busyLabel={busy}/>
      </>}

      {error && <div className="rp-tx rp-tx-fail" role="alert" data-testid="vault-error">{error}</div>}
      {busy && busy !== 'create' && busy !== 'unlock' && <div className="rp-tx" role="status">Vault operation in progress — your passkey may be requested to re-encrypt…</div>}
    </div>
  </section>;
}

function VaultEntries({ entries, busy, onSave, onLock, onExport, busyLabel }: {
  entries: StrategyEntry[]; busy: boolean; busyLabel: string;
  onSave: (next: StrategyEntry[]) => void; onLock: () => void; onExport: () => void;
}) {
  const [draft, setDraft] = useState<{ id?: string; title: string; kind: EntryKind; body: string } | null>(null);
  const saving = busyLabel === 'save';
  const sorted = useMemo(() => [...entries].sort((a, b) => b.updatedAt - a.updatedAt), [entries]);

  const add = () => setDraft({ title: '', kind: 'thesis', body: '' });
  const commit = () => {
    if (!draft || !draft.title.trim()) return;
    const now = Math.floor(Date.now() / 1000);
    const next = draft.id
      ? entries.map((e) => (e.id === draft.id ? { ...e, title: draft.title.trim(), kind: draft.kind, body: draft.body, updatedAt: now } : e))
      : [...entries, { id: newEntryId(), kind: draft.kind, title: draft.title.trim(), body: draft.body, createdAt: now, updatedAt: now }];
    onSave(next); setDraft(null);
  };

  return <>
    <div className="rp-hub-row">
      <h4 className="rp-section-title"><FiLock size={13} aria-hidden/> Unlocked · {entries.length} {entries.length === 1 ? 'entry' : 'entries'}</h4>
      <div className="rp-vault-actions">
        <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" onClick={onExport}>Export</button>
        <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" data-testid="vault-lock" onClick={onLock}><FiLock size={13} aria-hidden/> Lock now</button>
      </div>
    </div>
    {sorted.length === 0 && !draft && <div className="rp-empty-panel" data-testid="vault-empty">
      <strong>No entries yet</strong>
      <p>Save your first private thesis, draft market or risk budget. Each save re-encrypts the vault behind your passkey.</p>
    </div>}
    <ul className="rp-vault-list" data-testid="vault-list">
      {sorted.map((entry) => <li key={entry.id} className="rp-vault-entry" data-entry={entry.id}>
        <div className="rp-vault-entry-head">
          <span className="rp-badge rp-role">{KIND_LABEL[entry.kind]}</span>
          <strong>{entry.title}</strong>
          <span className="rp-muted">{new Date(entry.updatedAt * 1000).toLocaleDateString()}</span>
          <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" aria-label={`Edit ${entry.title}`} disabled={busy} onClick={() => setDraft({ id: entry.id, title: entry.title, kind: entry.kind, body: entry.body })}>Edit</button>
          <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" aria-label={`Delete ${entry.title}`} disabled={busy} onClick={() => onSave(entries.filter((e) => e.id !== entry.id))}><FiTrash2 size={13} aria-hidden/></button>
        </div>
        {entry.body && <p className="rp-vault-body">{entry.body}</p>}
      </li>)}
    </ul>
    {draft ? <div className="rp-vault-draft" data-testid="vault-draft">
      <label className="rp-field">Title<input value={draft.title} maxLength={120} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. MON perp backwardation thesis"/></label>
      <label className="rp-field">Kind<select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as EntryKind })}>{ENTRY_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></label>
      <label className="rp-field">Content (stays encrypted at rest)<textarea rows={5} maxLength={8000} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="Private notes — max 8,000 characters."/></label>
      <div className="rp-vault-actions">
        <button type="button" className="rp-btn rp-btn-primary rp-btn-sm" data-testid="vault-save" disabled={busy || !draft.title.trim()} onClick={commit}>
          <FiPlus size={13} aria-hidden/> {saving ? 'Waiting for passkey…' : 'Save (re-encrypts with passkey)'}
        </button>
        <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" disabled={busy} onClick={() => setDraft(null)}>Cancel</button>
      </div>
    </div> : <button type="button" className="rp-btn rp-btn-primary rp-btn-sm" data-testid="vault-add" disabled={busy} onClick={add}><FiPlus size={13} aria-hidden/> Add private entry</button>}
  </>;
}
