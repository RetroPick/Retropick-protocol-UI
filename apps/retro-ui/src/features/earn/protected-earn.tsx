'use client';
// Protected Earn + Creator Continuity (sponsor: Mera "One Passkey, Many Keys").
//
// Truthful security interface for Earn → Available to claim. It does NOT broadcast any financial
// transaction: it derives the independent passkey-controlled fee wallet, shows the four protection
// modes with honest labels, and PREPARES (never sends) a creator-fee-recipient handoff for review.
// Real broadcast is a separate, explicitly-authorised step (operator/tx-specific approval).
import { useState } from 'react';
import { ShieldCheck, ShieldAlert, KeyRound, Lock, Fingerprint } from 'lucide-react';
import { isAddress, type Address } from 'viem';
import { ErrorState } from '@/components/trading/primitives';
import { AddressChip } from '@/components/trading/primitives';
import { useWallet } from '@/wallet/provider';
import { deriveSignerIdentity, type SignerIdentity } from '@/lib/mera-signer/signer';
import { PROTECTION_MODES, type ProtectionMode } from '@/lib/mera-signer/protection';
import { prepareTransferCreatorFeeRecipient } from '@retropick/launchpad-sdk/prepare';
import { publicClient } from '@/lib/live/public-client';
import { describeVaultError } from '@/lib/vault/strategy-vault';
import { toast } from 'sonner';

const MODE_ICON: Record<ProtectionMode, typeof ShieldCheck> = { NONE: ShieldAlert, APP_ONLY: Fingerprint, PASSKEY_SIGNER: ShieldCheck, ONCHAIN_POLICY: Lock };

export function ProtectedEarn() {
  const { account } = useWallet();
  const [signer, setSigner] = useState<SignerIdentity | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [prepared, setPrepared] = useState<{ to: Address; functionName: string; args: readonly unknown[]; label: string; checks: string[] } | null>(null);

  const deriveWallet = async () => {
    setBusy(true); setError(null);
    try { setSigner(await deriveSignerIdentity()); toast.success('Protected fee wallet derived from passkey'); }
    catch (e) { setError(describeVaultError(e)); }
    finally { setBusy(false); }
  };

  const prepareHandoff = async () => {
    setError(null); setPrepared(null);
    if (!account) { setError('Connect your wallet first.'); return; }
    if (!signer) { setError('Derive the protected fee wallet first.'); return; }
    if (!isAddress(token)) { setError('Enter a valid launch token address.'); return; }
    setBusy(true);
    try {
      const p = await prepareTransferCreatorFeeRecipient(publicClient, token as Address, account as Address, signer.address);
      setPrepared({ to: p.to, functionName: p.functionName, args: p.args, label: p.label, checks: p.checks });
      toast.success('Handoff prepared (not sent)', { description: 'Review below; broadcasting needs explicit authorisation.' });
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not prepare the handoff.'); }
    finally { setBusy(false); }
  };

  return <section className="rp-protect" data-testid="protected-earn" aria-labelledby="rp-protect-h">
    <header><h2 id="rp-protect-h"><ShieldCheck size={16} aria-hidden /> Protected Earn</h2>
      <p className="rp-note">How your creator-fee earnings are protected. Choose the level that matches how much security you actually need — the labels below are deliberately honest about what each one does and does not prevent.</p></header>

    <ul className="rp-protect-modes" data-testid="protection-modes">
      {(Object.keys(PROTECTION_MODES) as ProtectionMode[]).map((m) => {
        const info = PROTECTION_MODES[m]; const Icon = MODE_ICON[m];
        return <li key={m} className="rp-protect-mode" data-mode={m} data-bypassable={info.bypassable} data-available={info.available}>
          <div className="rp-protect-mode-head"><Icon size={15} aria-hidden /><strong>{info.title}</strong>
            {info.bypassable && <span className="rp-badge rp-badge-warn">bypassable</span>}
            {!info.available && <span className="rp-badge">not available</span>}</div>
          <p>{info.summary}</p>
          <p className="rp-protect-honesty">{info.honesty}</p>
        </li>;
      })}
    </ul>

    <div className="rp-protect-signer">
      <h3><KeyRound size={14} aria-hidden /> Independent passkey-controlled fee wallet</h3>
      <p className="rp-note">Derived from your passkey (the key is never stored or sent anywhere). Your original wallet balances stay separate. The same passkey always reproduces the same address.</p>
      <button className="rp-btn rp-btn-primary rp-btn-sm" onClick={() => void deriveWallet()} disabled={busy}>{signer ? 'Re-derive wallet' : 'Derive protected wallet'}</button>
      {signer && <div className="rp-protect-addr" data-testid="protected-wallet"><span>Protected fee wallet</span><AddressChip value={signer.address} label="protected fee wallet" /></div>}
    </div>

    <div className="rp-protect-handoff">
      <h3>Redirect future creator fees to the protected wallet</h3>
      <p className="rp-note">Prepares <code>transferCreatorFeeRecipient(token, protectedWallet)</code> — signable only by the current recipient. It redirects <strong>future</strong> fees; already-escrowed credits stay with the original wallet, and the immutable ERC-20 deployer attribution never changes. Nothing is broadcast here.</p>
      <div className="rp-protect-row">
        <input value={token} onChange={(e) => setToken(e.target.value.trim())} placeholder="Launch token address (0x…)" aria-label="Launch token address" spellCheck={false} />
        <button className="rp-btn rp-btn-ghost rp-btn-sm" onClick={() => void prepareHandoff()} disabled={busy || !signer}>Prepare handoff</button>
      </div>
      {prepared && <div className="rp-protect-prepared" data-testid="prepared-handoff">
        <strong>{prepared.label} — prepared, not sent</strong>
        <code>{prepared.functionName}({(prepared.args as unknown[]).map(String).join(', ')})</code>
        <ul>{prepared.checks.map((c) => <li key={c}>{c}</li>)}</ul>
        <p className="rp-note">Broadcasting requires explicit transaction authorisation (not performed automatically).</p>
      </div>}
    </div>

    {error && <ErrorState title="Protected Earn" text={error} />}
    <p className="rp-note rp-protect-foot">Referral payouts are not deployed (attribution only). Bank/off-ramp withdrawal is not available on Monad Testnet. No financial transaction is signed or sent from this panel.</p>
  </section>;
}
