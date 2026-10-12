import { createPasskeyWithPrfOutput, createSecp256k1SigningSession, getEvmAddress } from '@category-labs/mera';
import { isAddress, type Address } from 'viem';
import { deriveSignerIdentity, signerRp, SIGNER_PRF_SALT, type SignerCeremonyOptions } from './signer.ts';

export interface Enrollment {
  credentialId: string;
  address: Address;
  rpId: string;
  chainId: 10143;
  derivationVersion: 1;
  saltVersion: 1;
  enrolledAt: string;
  associatedCreatorWallet: Address | null;
}
const KEY = 'retropick:mera-enrollments:v1';
export function validateEnrollment(value: unknown, rpId = signerRp().id): value is Enrollment {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Enrollment;
  return typeof entry.credentialId === 'string' && entry.credentialId.length > 0 && entry.credentialId.length <= 2048 && isAddress(entry.address) && entry.rpId === rpId && entry.chainId === 10143 && entry.derivationVersion === 1 && entry.saltVersion === 1 && Number.isFinite(Date.parse(entry.enrolledAt)) && (entry.associatedCreatorWallet === null || isAddress(entry.associatedCreatorWallet));
}
export function loadEnrollments(): Enrollment[] {
  try { const entries: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(entries) ? entries.filter(entry => validateEnrollment(entry)) : []; } catch { return []; }
}
export function persistEnrollment(entry: Enrollment): void {
  if (!validateEnrollment(entry)) throw Error('Unsupported passkey registration or relying party.');
  const previous = loadEnrollments().filter(item => item.credentialId !== entry.credentialId);
  localStorage.setItem(KEY, JSON.stringify([...previous, entry]));
}
export function recoveryOptions(entry: Enrollment, seam: SignerCeremonyOptions = {}): SignerCeremonyOptions {
  if (!validateEnrollment(entry, (seam.rp ?? signerRp()).id)) throw Error('Registration domain or derivation version changed.');
  return { ...seam, rp: { id: entry.rpId, name: 'RetroPick' }, credentialId: entry.credentialId, expectedAddress: entry.address };
}
/** Enrollment never stores the PRF output or a signing session. Persistence requires UI consent. */
export async function enrollSigner(kind: 'create' | 'reuse', associatedCreatorWallet: Address | null, options: SignerCeremonyOptions = {}): Promise<Enrollment> {
  const rp = options.rp ?? signerRp();
  let identity;
  if (kind === 'reuse') identity = await deriveSignerIdentity(options);
  else {
    const result = await createPasskeyWithPrfOutput({ rp, user: { name: 'RetroPick protected fee wallet', displayName: 'RetroPick' }, prfSalt: SIGNER_PRF_SALT, timeout: options.timeout, webAuthnClient: options.webAuthnClient });
    let session;
    try {
      session = createSecp256k1SigningSession({ privateKey: result.prfOutput });
      identity = { credentialId: result.credentialId, address: getEvmAddress(session.publicKey) as Address };
    } finally { result.prfOutput.fill(0); session?.end(); }
  }
  return { ...identity, rpId: rp.id, chainId: 10143, derivationVersion: 1, saltVersion: 1, enrolledAt: new Date().toISOString(), associatedCreatorWallet };
}
