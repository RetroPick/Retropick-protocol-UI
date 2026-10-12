// RetroPick Mera passkey-derived EVM signer (sponsor: Mera "One Passkey, Many Keys").
//
// Chain (verified against installed @category-labs/mera 0.2.0 typings):
//   getPasskeyPrfOutput({ rpId, prfSalt })        → { credentialId, prfOutput: 32 bytes }
//   createSecp256k1SigningSession({ privateKey })  → session { publicKey(65b), signDigest, end() }
//   getEvmAddress(session.publicKey)               → 0x… checksum address
//   toViemAccount(session)   (from "@category-labs/mera/viem") → viem LocalAccount for tx signing
//
// Security contract:
//  * The 32-byte PRF output IS the secp256k1 scalar; it is NEVER persisted, logged, or sent to a
//    backend. We hold it only long enough to open the signing session, then zero our copy.
//  * The signer uses a DISTINCT PRF salt from the strategy vault, so the signing key is independent
//    of the vault's encryption key even on the same passkey.
//  * Every session is closed in a finally block (session.end() zeroes the SDK's key copy).
//  * Only the public address + credentialId are returned/stored — never key material.
//  * A frontend passkey gate is UI friction, NOT an onchain spending lock (see Protected Earn UI).
import {
  getPasskeyPrfOutput, createSecp256k1SigningSession, getEvmAddress,
  type Secp256k1SigningSession, type PasskeyRelyingParty,
} from '@category-labs/mera';

/**
 * Stable relying-party identity: the current host (same rule the strategy vault uses, so a
 * passkey created for the vault domain is reusable). Passkeys are scoped to this domain —
 * the signer address is only portable where the SAME synced passkey is available.
 */
export function signerRp(): PasskeyRelyingParty {
  let host = 'localhost';
  try { host = window.location.hostname || 'localhost'; } catch { /* non-browser */ }
  return { id: host, name: 'RetroPick' };
}

export const SIGNER_PRF_SALT_LABEL = 'retropick/mera-evm-signer/v1';
/**
 * Distinct from the vault's default PRF salt so the EVM key ≠ the vault encryption key.
 * WebAuthn PRF salts must be exactly 32 bytes: use the SHA-256 of a stable domain-separation label.
 */
export const SIGNER_PRF_SALT = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(SIGNER_PRF_SALT_LABEL)));

export interface SignerIdentity {
  /** Checksummed EVM address derived from the passkey PRF output. Stable per (passkey, rpId, salt). */
  address: `0x${string}`;
  /** WebAuthn credential id (base64url). Safe to store; identifies which passkey. */
  credentialId: string;
}

export type WebAuthnClient = Parameters<typeof getPasskeyPrfOutput>[0]['webAuthnClient'];

export interface SignerCeremonyOptions {
  rp?: PasskeyRelyingParty;
  credentialId?: string;
  timeout?: number;
  expectedAddress?: `0x${string}`;
  /** Test seam: inject a WebAuthn client so unit tests run without a real authenticator. */
  webAuthnClient?: WebAuthnClient;
}

/**
 * Run a passkey ceremony and open an ephemeral secp256k1 signing session. The caller MUST
 * `session.end()` when done (use withSigner / deriveSignerIdentity which do it for you).
 */
async function openSession(options: SignerCeremonyOptions): Promise<{ session: Secp256k1SigningSession; identity: SignerIdentity }> {
  const rp = options.rp ?? signerRp();
  const prf = await getPasskeyPrfOutput({
    rpId: rp.id,
    credential: options.credentialId ? { credentialId: options.credentialId } : undefined,
    prfSalt: SIGNER_PRF_SALT,
    timeout: options.timeout ?? 60000,
    webAuthnClient: options.webAuthnClient,
  });
  // prf.prfOutput is the 32-byte scalar. Open the session, then zero our copy immediately.
  let session: Secp256k1SigningSession;
  try {
    if (options.credentialId && prf.credentialId !== options.credentialId) throw Error('Authenticator returned a different credential. Signing stopped.');
    session = createSecp256k1SigningSession({ privateKey: prf.prfOutput });
  }
  finally { prf.prfOutput.fill(0); }
  try {
    const address = getEvmAddress(session.publicKey) as `0x${string}`;
    if (options.expectedAddress && address.toLowerCase() !== options.expectedAddress.toLowerCase()) throw Error('Passkey recovered a different address. Signing stopped.');
    return { session, identity: { address, credentialId: prf.credentialId } };
  } catch (error) { session.end(); throw error; }
}

/** Derive the signer's public identity (address + credentialId) WITHOUT keeping a session. */
export async function deriveSignerIdentity(options: SignerCeremonyOptions = {}): Promise<SignerIdentity> {
  const { session, identity } = await openSession(options);
  session.end();
  return identity;
}

/**
 * Run `fn` with a live signing session, guaranteeing the session is ended afterwards (success or
 * throw). The session never escapes this scope — do not return it.
 */
export async function withSigner<T>(options: SignerCeremonyOptions, fn: (session: Secp256k1SigningSession, identity: SignerIdentity) => Promise<T>): Promise<T> {
  const { session, identity } = await openSession(options);
  try { return await fn(session, identity); }
  finally { session.end(); }
}

/**
 * Sign a 32-byte digest with the passkey-derived key and return it with the recovered address so the
 * caller can prove the signer identity locally (no broadcast). One ceremony, one session, auto-closed.
 */
export async function signDigestWithPasskey(digest32: Uint8Array, options: SignerCeremonyOptions = {}): Promise<{ address: `0x${string}`; compact: Uint8Array; recovery: 0 | 1 }> {
  if (digest32.length !== 32) throw new Error('digest must be exactly 32 bytes');
  return withSigner(options, async (session, identity) => {
    const sig = await session.signDigest(digest32);
    return { address: identity.address, compact: sig.compact, recovery: sig.recovery };
  });
}

/**
 * A viem LocalAccount backed by the passkey signing session, for preparing/signing EVM
 * transactions and messages. Broadcasting is a SEPARATE, explicitly-authorized step — this only
 * produces signatures. The account is valid only inside `fn`; the session is ended afterwards.
 */
export async function withViemAccount<T>(options: SignerCeremonyOptions, fn: (account: import('viem').LocalAccount, identity: SignerIdentity) => Promise<T>): Promise<T> {
  const { toViemAccount } = await import('@category-labs/mera/viem');
  return withSigner(options, async (session, identity) => fn(toViemAccount(session), identity));
}
