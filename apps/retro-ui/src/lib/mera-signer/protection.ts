// Protected Earn — truthful security model for Earn → Available to claim (sponsor: Mera).
//
// Four honest modes. The crucial honesty rule: ONLY ONCHAIN_POLICY (not deployed) can actually
// prevent a thief holding the EOA key from moving funds. APP_ONLY is UI friction; PASSKEY_SIGNER
// means the FeeEscrow beneficiary / signing identity IS an independent passkey-controlled wallet.
import { keccak256, encodeAbiParameters, type Address, type Hex } from 'viem';

export type ProtectionMode = 'NONE' | 'APP_ONLY' | 'PASSKEY_SIGNER' | 'ONCHAIN_POLICY';

export interface ProtectionModeInfo {
  mode: ProtectionMode;
  title: string;
  /** One-line truthful description. */
  summary: string;
  /** Explicit statement of what it does and does NOT protect. */
  honesty: string;
  bypassable: boolean;
  available: boolean;
}

export const PROTECTION_MODES: Record<ProtectionMode, ProtectionModeInfo> = {
  NONE: {
    mode: 'NONE', title: 'No extra confirmation', bypassable: true, available: true,
    summary: 'Earn actions are authorised by your connected wallet only.',
    honesty: 'Standard wallet signing. Anyone who controls your wallet key controls these funds.',
  },
  APP_ONLY: {
    mode: 'APP_ONLY', title: 'App-level passkey confirmation', bypassable: true, available: true,
    summary: 'RetroPick asks for a passkey confirmation in this app before signing an Earn action.',
    honesty: 'Passkey confirmation in RetroPick only — NOT an onchain lock. It is bypassable by anyone holding your wallet key through any other app or a direct contract call. It adds friction, not custody.',
  },
  PASSKEY_SIGNER: {
    mode: 'PASSKEY_SIGNER', title: 'Independent passkey-controlled fee wallet', bypassable: false, available: true,
    summary: 'The creator-fee beneficiary and signing address is an independent passkey-derived wallet, separate from your main EOA.',
    honesty: 'Strongest available today: the protected wallet is a distinct address whose key is derived from your passkey (never stored). Your original wallet balances stay separate. Redirecting FUTURE fees to it requires the current recipient to sign transferCreatorFeeRecipient; already-escrowed credits stay with the original recipient.',
  },
  ONCHAIN_POLICY: {
    mode: 'ONCHAIN_POLICY', title: 'Onchain policy module', bypassable: false, available: false,
    summary: 'An audited smart-account module that enforces dual-factor withdrawal onchain.',
    honesty: 'NOT DEPLOYED. Only an audited onchain policy (e.g. a smart account with a removal cooldown) can make a withdrawal lock truly unbypassable. Shown for honesty; it is not available on testnet.',
  },
};

export type EarnAction = 'claim-fee-native' | 'claim-fee-token' | 'buyback-release' | 'margin-withdraw' | 'send' | 'transfer-creator-fee';

/** All parameters an app-level confirmation is bound to. A confirmation authorises exactly one. */
export interface ActionIntent {
  action: EarnAction;
  chainId: number;
  account: Address;        // the acting wallet
  asset: Address | 'native';
  destination: Address;    // where value/ownership goes (self for claims)
  amount: bigint;          // 0 when not value-bearing (e.g. recipient transfer)
  /** keccak256 of the prepared calldata (to+function+args), binding the exact tx shape. */
  calldataHash: Hex;
  nonce: Hex;              // single-use, random
  expiresAt: number;       // epoch ms
}

/** Deterministic 32-byte digest binding every intent field. Single-use via `nonce`. */
export function intentDigest(intent: ActionIntent): Hex {
  return keccak256(encodeAbiParameters(
    [
      { type: 'string' }, { type: 'uint256' }, { type: 'address' },
      { type: 'string' }, { type: 'address' }, { type: 'uint256' },
      { type: 'bytes32' }, { type: 'bytes32' }, { type: 'uint256' },
    ],
    [
      intent.action, BigInt(intent.chainId), intent.account,
      intent.asset === 'native' ? 'native' : intent.asset, intent.destination, intent.amount,
      intent.calldataHash, intent.nonce, BigInt(intent.expiresAt),
    ],
  ));
}

export function newNonce(): Hex {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return ('0x' + [...b].map((x) => x.toString(16).padStart(2, '0')).join('')) as Hex;
}

export class ConfirmationError extends Error {}

/**
 * Check digest integrity and replay AFTER cryptographic signature verification.
 * This helper alone is not passkey authentication. See verifySignedConfirmation.
 * Verify an app-level confirmation: the digest must match the intent, the nonce must be unused,
 * and it must not be expired. This is deliberately in-app (bypassable) — see APP_ONLY.honesty.
 * Returns the digest to record as spent.
 */
export function verifyConfirmation(intent: ActionIntent, presentedDigest: Hex, now: number, spent: Set<string>): Hex {
  if (now > intent.expiresAt) throw new ConfirmationError('Confirmation expired — start the action again.');
  const expected = intentDigest(intent);
  if (expected.toLowerCase() !== presentedDigest.toLowerCase()) throw new ConfirmationError('Confirmation does not match this action (chain/account/amount/destination/calldata).');
  if (spent.has(expected.toLowerCase())) throw new ConfirmationError('Confirmation already used (single-use).');
  spent.add(expected.toLowerCase());
  return expected;
}

/** Compact keccak of a prepared write's shape, for binding into the intent. */
export function calldataShapeHash(to: Address, functionName: string, args: readonly unknown[]): Hex {
  return keccak256(encodeAbiParameters([{ type: 'address' }, { type: 'string' }, { type: 'string' }], [to, functionName, JSON.stringify(args, (_, v) => (typeof v === 'bigint' ? v.toString() : v))]));
}
