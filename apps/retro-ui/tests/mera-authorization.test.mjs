import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAbi, hexToBytes, toHex, zeroAddress } from 'viem';
import { enrollSigner, recoveryOptions, validateEnrollment } from '../src/lib/mera-signer/enrollment.ts';
import { deriveSignerIdentity, signDigestWithPasskey } from '../src/lib/mera-signer/signer.ts';
import { preparedIntent, transactionHash, verifySignedConfirmation, confirmWithPasskey } from '../src/lib/mera-signer/authorization.ts';
import { intentDigest } from '../src/lib/mera-signer/protection.ts';
const rp = { id: 'localhost', name: 'RetroPick' };
const account = '0x1111111111111111111111111111111111111111';
const client = {
  async createCredential() { return { credentialId: new Uint8Array([1,2,3]), prfEnabled: true, prfOutput: new Uint8Array(32).fill(7) }; },
  async getCredential() { return { credentialId: new Uint8Array([1,2,3]), prfOutput: new Uint8Array(32).fill(7) }; },
};
const options = { rp, webAuthnClient: client };
const prepare = () => ({ to: '0x2222222222222222222222222222222222222222', abi: parseAbi(['function claim()']), functionName: 'claim', args: [], value: 0n, account, approvals: [], checks: [], label: 'Claim', intent: { asset: zeroAddress, amount: 17n, destination: account } });

test('enrollment and explicit recovery preserve the address without persisted key material', async () => {
  const enrollment = await enrollSigner('create', account, options);
  assert.ok(validateEnrollment(enrollment));
  assert.deepEqual(Object.keys(enrollment).sort(), ['address','associatedCreatorWallet','chainId','credentialId','derivationVersion','enrolledAt','rpId','saltVersion'].sort());
  const recovered = await deriveSignerIdentity(recoveryOptions(enrollment, options));
  assert.equal(enrollment.address, recovered.address);
  assert.throws(() => recoveryOptions({ ...enrollment, rpId: 'other.example' }), /domain/);
  assert.throws(() => recoveryOptions({ ...enrollment, saltVersion: 2 }), /version/);
  await assert.rejects(deriveSignerIdentity({ ...options, credentialId: 'BAUG' }), /different credential/);
  await assert.rejects(deriveSignerIdentity({ ...options, expectedAddress: account }), /different address/);
});

test('no PRF support and canceled authenticator cannot enroll or authorize', async () => {
  const missing = { ...client, async createCredential() { return { credentialId: new Uint8Array([1]), prfEnabled: false }; } };
  await assert.rejects(enrollSigner('create', account, { rp, webAuthnClient: missing }), /PRF/);
  const canceled = { ...client, async getCredential() { throw Error('cancelled'); } };
  await assert.rejects(enrollSigner('reuse', account, { rp, webAuthnClient: canceled }), /assertion failed/);
});

test('fresh signature binds exact ABI calldata, value, account, amount and RP and rejects replay', async () => {
  const registration = await enrollSigner('reuse', account, options);
  const p = prepare(), intent = preparedIntent(p);
  assert.equal(intent.amount, 17n);
  assert.notEqual(transactionHash({ ...p, value: 1n }, rp.id), intent.calldataHash);
  assert.notEqual(transactionHash(p, 'another.example'), intent.calldataHash);
  const proof = await signDigestWithPasskey(hexToBytes(intentDigest(intent)), recoveryOptions(registration, options));
  const signature = `${toHex(proof.compact)}${(27 + proof.recovery).toString(16)}`;
  const used = new Set();
  await verifySignedConfirmation(intent, signature, registration, Date.now(), used);
  await assert.rejects(verifySignedConfirmation(intent, signature, registration, Date.now(), used), /already used/);
  await assert.rejects(verifySignedConfirmation({ ...intent, amount: 18n }, signature, registration, Date.now(), new Set()), /signature/);
  await assert.rejects(verifySignedConfirmation(intent, signature, registration, intent.expiresAt + 1, new Set()), /expired/);
  await assert.rejects(verifySignedConfirmation({ ...intent, rpId: 'another.example' }, signature, registration), /domain/);
  await confirmWithPasskey(prepare(), registration, options);
});

test('margin withdrawal binds ABI argument order (amount, asset)', () => {
  const p = { ...prepare(), abi: parseAbi(['function withdraw(uint256 amount,address token)']), functionName: 'withdraw', args: [13n, account], intent: undefined };
  const intent = preparedIntent(p);
  assert.equal(intent.amount, 13n); assert.equal(intent.asset, account);
});

test('signing sessions end on success and callback failure', async () => {
  const { withSigner } = await import('../src/lib/mera-signer/signer.ts');
  let session;
  await assert.rejects(withSigner(options, async opened => { session = opened; throw Error('simulation failed'); }), /simulation failed/);
  await assert.rejects(session.signDigest(new Uint8Array(32)), /ended/i);
  await withSigner(options, async opened => { session = opened; return true; });
  await assert.rejects(session.signDigest(new Uint8Array(32)), /ended/i);
});

test('NONE never asks for a passkey; changing native claim credit invalidates a prepared amount', async () => {
  const { authorizeEarnAction, revalidateEarnAction } = await import('../src/lib/mera-signer/authorization.ts');
  globalThis.localStorage = { getItem: () => null };
  await authorizeEarnAction(prepare());
  const { prepareFeeClaim } = await import('@retropick/launchpad-sdk/prepare');
  let credit=17n;
  const chain={readContract:async()=>credit};
  const p=await prepareFeeClaim(chain,account);
  await revalidateEarnAction(chain,p);
  credit=18n;await assert.rejects(revalidateEarnAction(chain,p),/changed during confirmation/);
  delete globalThis.localStorage;
});
