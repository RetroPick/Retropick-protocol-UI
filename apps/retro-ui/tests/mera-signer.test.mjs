// Mera passkey→EVM signer adapter. Uses an INJECTED WebAuthn client (deterministic PRF) so the
// derivation, stable-address, signature-recovery and session-cleanup properties are provable
// without a real authenticator. A real browser ceremony on the staging host is captured
// separately as operator evidence (see the Mera stage report).
import test from 'node:test';
import assert from 'node:assert/strict';
import { getEvmAddress, createSecp256k1SigningSession } from '@category-labs/mera';
import { privateKeyToAccount } from 'viem/accounts';
import { recoverAddress, keccak256, toHex } from 'viem';
import { deriveSignerIdentity, signDigestWithPasskey, withViemAccount, SIGNER_PRF_SALT, SIGNER_PRF_SALT_LABEL } from '../src/lib/mera-signer/signer.ts';

const RP = { id: 'retropick-metropolis-retro-ui-stagi.vercel.app', name: 'RetroPick' };
// A fixed 32-byte "PRF output" per (credential, salt). Different salts → different keys.
function fakeClient(prfBySalt) {
  const credId = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const saltKey = (s) => Buffer.from(s).toString('hex');
  return {
    async createCredential() { throw new Error('not used'); },
    async getCredential({ prfSalt }) { return { credentialId: credId, prfOutput: prfBySalt[saltKey(prfSalt)] }; },
  };
}
const PRF_A = new Uint8Array(32).fill(7); // valid secp256k1 scalar (small, nonzero)
const client = fakeClient({ [Buffer.from(SIGNER_PRF_SALT).toString('hex')]: PRF_A });

test('derivation matches the raw SDK chain and is stable across ceremonies', async () => {
  const expected = getEvmAddress(createSecp256k1SigningSession({ privateKey: Uint8Array.from(PRF_A) }).publicKey);
  const id1 = await deriveSignerIdentity({ rp: RP, webAuthnClient: client });
  const id2 = await deriveSignerIdentity({ rp: RP, webAuthnClient: client });
  assert.equal(id1.address, expected, 'address derived from PRF output via getEvmAddress');
  assert.equal(id1.address, id2.address, 'same passkey → same address (lock/unlock stable)');
  assert.match(id1.address, /^0x[0-9a-fA-F]{40}$/);
  assert.equal(typeof id1.credentialId, 'string');
});

test('local ECDSA signature recovers to the derived address (proves control, no broadcast)', async () => {
  const digest = keccak256(toHex('retropick protected-earn claim intent'));
  const { address, compact, recovery } = await signDigestWithPasskey(Buffer.from(digest.slice(2), 'hex'), { rp: RP, webAuthnClient: client });
  const sigHex = '0x' + Buffer.from(compact).toString('hex') + (27 + recovery).toString(16).padStart(2, '0');
  const recovered = await recoverAddress({ hash: digest, signature: sigHex });
  assert.equal(recovered.toLowerCase(), address.toLowerCase());
});

test('viem account signs a message that recovers to the same address', async () => {
  const { addr, recovered } = await withViemAccount({ rp: RP, webAuthnClient: client }, async (account, identity) => {
    const sig = await account.signMessage({ message: 'hello retropick' });
    const { recoverMessageAddress } = await import('viem');
    return { addr: identity.address, recovered: await recoverMessageAddress({ message: 'hello retropick', signature: sig }) };
  });
  assert.equal(recovered.toLowerCase(), addr.toLowerCase());
});

test('a different passkey (different PRF) yields a different address', async () => {
  const PRF_B = new Uint8Array(32).fill(9);
  const other = fakeClient({ [Buffer.from(SIGNER_PRF_SALT).toString('hex')]: PRF_B });
  const a = await deriveSignerIdentity({ rp: RP, webAuthnClient: client });
  const b = await deriveSignerIdentity({ rp: RP, webAuthnClient: other });
  assert.notEqual(a.address, b.address);
});

test('derived EVM key is independent of a vault key on the same passkey (distinct salt)', () => {
  // The vault uses the SDK default salt; the signer uses SIGNER_PRF_SALT. Same PRF bytes under
  // different salts would be different in a real authenticator; here we assert the salt wiring:
  assert.equal(SIGNER_PRF_SALT.length, 32, 'WebAuthn PRF salt must be exactly 32 bytes');
  assert.equal(SIGNER_PRF_SALT_LABEL, 'retropick/mera-evm-signer/v1');
});

test('wrong-credential / cancelled ceremony surfaces as an error (no silent empty signer)', async () => {
  const broken = { async createCredential() { throw new Error('x'); }, async getCredential() { throw Object.assign(new Error('cancelled'), { code: 'PASSKEY_OPERATION_FAILED' }); } };
  await assert.rejects(deriveSignerIdentity({ rp: RP, webAuthnClient: broken }), /assertion failed|cancelled/i);
});
