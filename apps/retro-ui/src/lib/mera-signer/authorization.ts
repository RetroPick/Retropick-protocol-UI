import { encodeAbiParameters, encodeFunctionData, hexToBytes, keccak256, recoverAddress, toHex, zeroAddress, type Address, type Hex } from 'viem';
import type { PreparedWrite } from '@retropick/launchpad-sdk/prepare';
import type { PreparedTransfer } from '@retropick/launchpad-sdk/transfer';
import { intentDigest, newNonce, verifyConfirmation, type ActionIntent, type EarnAction } from './protection.ts';
import { signDigestWithPasskey, signerRp, type SignerCeremonyOptions } from './signer.ts';
import { loadEnrollments, recoveryOptions, type Enrollment } from './enrollment.ts';

export type PreparedAction = PreparedWrite | PreparedTransfer;
export interface BoundIntent extends ActionIntent { to: Address; value: bigint; rpId: string }
const spent = new Set<string>();
export function transactionData(prepared: PreparedAction): Hex {
  return 'kind' in prepared ? prepared.data ?? '0x' : encodeFunctionData({ abi: prepared.abi as Parameters<typeof encodeFunctionData>[0]['abi'], functionName: prepared.functionName, args: prepared.args as never });
}
export function transactionHash(prepared: PreparedAction, rpId: string): Hex {
  return keccak256(encodeAbiParameters([{ type: 'address' }, { type: 'bytes' }, { type: 'uint256' }, { type: 'string' }], [prepared.to, transactionData(prepared), prepared.value, rpId]));
}
export function earnAction(prepared: PreparedAction): EarnAction | null {
  if ('kind' in prepared) return 'send';
  return ({ claim: 'claim-fee-native', claimToken: 'claim-fee-token', release: 'buyback-release', withdraw: 'margin-withdraw', transferCreatorFeeRecipient: 'transfer-creator-fee' } as Record<string, EarnAction>)[prepared.functionName] ?? null;
}
export function preparedIntent(prepared: PreparedAction): BoundIntent {
  const action = earnAction(prepared);
  if (!action) throw Error('This action has no Earn passkey authorization policy.');
  const transfer = 'kind' in prepared;
  const args = transfer ? [] : prepared.args;
  const rpId = signerRp().id;
  const asset = transfer ? prepared.asset : action === 'margin-withdraw' ? args[1] as Address : action === 'claim-fee-native' ? zeroAddress : typeof args[0] === 'string' ? args[0] as Address : zeroAddress;
  const destination = transfer ? prepared.recipient : action === 'transfer-creator-fee' ? args[1] as Address : prepared.account;
  const amount = transfer ? prepared.amount : action === 'margin-withdraw' && typeof args[0] === 'bigint' ? args[0] : 0n;
  return { action, chainId: 10143, account: prepared.account, asset: asset === zeroAddress ? 'native' : asset, destination: !transfer && prepared.intent ? prepared.intent.destination : destination, amount: !transfer && prepared.intent ? prepared.intent.amount : amount, to: prepared.to, value: prepared.value, rpId, calldataHash: transactionHash(prepared, rpId), nonce: newNonce(), expiresAt: Date.now() + 60000 };
}
export async function verifySignedConfirmation(intent: BoundIntent, signature: Hex, enrollment: Enrollment, now = Date.now(), used = spent): Promise<void> {
  recoveryOptions(enrollment);
  if (intent.chainId !== enrollment.chainId || intent.rpId !== enrollment.rpId) throw Error('Passkey network or domain changed.');
  const digest = intentDigest(intent);
  const recovered = await recoverAddress({ hash: digest, signature });
  if (recovered.toLowerCase() !== enrollment.address.toLowerCase()) throw Error('Passkey signature does not match the registered wallet.');
  verifyConfirmation(intent, digest, now, used);
}
export async function confirmWithPasskey(prepared: PreparedAction, enrollment: Enrollment, seam: SignerCeremonyOptions = {}): Promise<BoundIntent> {
  const intent = preparedIntent(prepared);
  const digest = intentDigest(intent);
  const proof = await signDigestWithPasskey(hexToBytes(digest), recoveryOptions(enrollment, seam));
  const signature = `${toHex(proof.compact)}${(27 + proof.recovery).toString(16)}` as Hex;
  await verifySignedConfirmation(intent, signature, enrollment);
  if (transactionHash(prepared, intent.rpId) !== intent.calldataHash) throw Error('Prepared action changed during confirmation.');
  return intent;
}
const preferenceKey = (account: Address) => `retropick:earn-confirmation:v1:10143:${signerRp().id}:${account.toLowerCase()}`;
export function selectedConfirmation(account: Address): Enrollment | null {
  const credentialId = localStorage.getItem(preferenceKey(account));
  if (!credentialId) return null;
  const entry = loadEnrollments().find(item => item.credentialId === credentialId && item.associatedCreatorWallet?.toLowerCase() === account.toLowerCase());
  if (!entry) throw Error('App-level passkey confirmation is enabled but its registration is unavailable. Recover it or explicitly disable confirmation.');
  return entry;
}
export function setAppConfirmation(account: Address, enrollment: Enrollment | null): void {
  if (enrollment && enrollment.associatedCreatorWallet?.toLowerCase() !== account.toLowerCase()) throw Error('Registration belongs to another connected account.');
  if (enrollment) { recoveryOptions(enrollment); localStorage.setItem(preferenceKey(account), enrollment.credentialId); }
  else localStorage.removeItem(preferenceKey(account));
}
export async function authorizeEarnAction(prepared: PreparedAction): Promise<void> {
  if (!earnAction(prepared)) return;
  const enrollment = selectedConfirmation(prepared.account);
  if (enrollment) await confirmWithPasskey(prepared, enrollment);
}

/** Revalidate dynamic Earn amounts and recipient authority after a ceremony. */
export async function revalidateEarnAction(chain: import('@retropick/launchpad-sdk/chain').ChainClient, prepared: PreparedAction): Promise<void> {
  if ('kind' in prepared) return; // simulateTransfer performs its own fresh validation.
  const sdk = await import('@retropick/launchpad-sdk/prepare');
  let fresh: PreparedWrite;
  switch (earnAction(prepared)) {
    case 'claim-fee-native': fresh = await sdk.prepareFeeClaim(chain, prepared.account); break;
    case 'claim-fee-token': fresh = await sdk.prepareFeeClaimToken(chain, prepared.account, prepared.args[0] as Address); break;
    case 'buyback-release': fresh = await sdk.prepareBuybackRelease(chain, prepared.args[0] as Address, prepared.account); break;
    case 'margin-withdraw': fresh = await sdk.prepareMarginWithdraw(chain, prepared.account, { amount: prepared.args[0] as bigint, token: prepared.args[1] as Address }); break;
    case 'transfer-creator-fee': fresh = await sdk.prepareTransferCreatorFeeRecipient(chain, prepared.args[0] as Address, prepared.account, prepared.args[1] as Address); break;
    default: return;
  }
  if (transactionHash(fresh, signerRp().id) !== transactionHash(prepared, signerRp().id) || fresh.intent?.amount !== prepared.intent?.amount) throw Error('Earn amount or recipient rights changed during confirmation. Refresh and review this action again.');
}
