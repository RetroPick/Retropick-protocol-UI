// Protected Earn: app-level confirmation binding (sponsor: Mera). Proves the confirmation is
// bound to every action parameter, single-use, and expiry-checked — and that modes are labelled
// truthfully (APP_ONLY bypassable, ONCHAIN_POLICY unavailable).
import test from 'node:test';
import assert from 'node:assert/strict';
import { intentDigest, verifyConfirmation, newNonce, calldataShapeHash, ConfirmationError, PROTECTION_MODES } from '../src/lib/mera-signer/protection.ts';

const base = () => ({
  action: 'claim-fee-native', chainId: 10143,
  account: '0x1111111111111111111111111111111111111111',
  asset: 'native', destination: '0x1111111111111111111111111111111111111111',
  amount: 1000000000000000000n,
  calldataHash: calldataShapeHash('0x2222222222222222222222222222222222222222', 'claim', []),
  nonce: newNonce(), expiresAt: Date.now() + 60_000,
});

test('digest changes when ANY bound field changes', () => {
  const i = base();
  const d = intentDigest(i);
  for (const mut of [
    { chainId: 1 }, { account: '0x3333333333333333333333333333333333333333' },
    { destination: '0x4444444444444444444444444444444444444444' }, { amount: 2000000000000000000n },
    { action: 'send' }, { calldataHash: calldataShapeHash('0x2222222222222222222222222222222222222222', 'claimToken', []) },
  ]) assert.notEqual(intentDigest({ ...i, ...mut }), d, `field ${Object.keys(mut)[0]} must bind`);
});

test('valid confirmation verifies once; replay rejected', () => {
  const i = base();
  const spent = new Set();
  const d = intentDigest(i);
  assert.equal(verifyConfirmation(i, d, Date.now(), spent), d);
  assert.throws(() => verifyConfirmation(i, d, Date.now(), spent), ConfirmationError, 'single-use');
});

test('wrong digest and expiry are rejected', () => {
  const i = base();
  assert.throws(() => verifyConfirmation(i, intentDigest({ ...i, amount: 5n }), Date.now(), new Set()), /does not match/);
  assert.throws(() => verifyConfirmation(i, intentDigest(i), i.expiresAt + 1, new Set()), /expired/);
});

test('mode labels are honest: APP_ONLY bypassable, PASSKEY_SIGNER not, ONCHAIN_POLICY unavailable', () => {
  assert.equal(PROTECTION_MODES.APP_ONLY.bypassable, true);
  assert.match(PROTECTION_MODES.APP_ONLY.honesty, /NOT an onchain lock/);
  assert.equal(PROTECTION_MODES.PASSKEY_SIGNER.bypassable, false);
  assert.equal(PROTECTION_MODES.ONCHAIN_POLICY.available, false);
  assert.match(PROTECTION_MODES.ONCHAIN_POLICY.honesty, /NOT DEPLOYED/);
});

test('nonce is random 32-byte hex', () => {
  assert.match(newNonce(), /^0x[0-9a-f]{64}$/);
  assert.notEqual(newNonce(), newNonce());
});
