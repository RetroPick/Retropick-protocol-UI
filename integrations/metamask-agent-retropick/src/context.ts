// Shared RetroPick context for plugin commands (NOT a command file).
// Reads are plain viem against Monad Testnet; commands never hold keys.
//
// ABI entries below are exact copies of the canonical deployed-ABI entries from
// packages/launchpad-sdk/src/abis/{coordinatorAbi,kuruAbi,marginAbi}.ts (subset needed
// by this plugin, kept inlined so the plugin builds standalone with the oclif toolchain).
import { createPublicClient, http, type PublicClient } from 'viem';
import { DEFAULT_POLICY, RETROPICK_CHAIN_ID, type AgentPolicy } from './policy.ts';

const COORDINATOR_ABI = [
  { type: 'function', name: 'ledger', inputs: [{ name: 'token', type: 'address' }], outputs: [{ name: '', type: 'tuple', internalType: 'struct GraduationLedger', components: [
    { name: 'phase', type: 'uint8', internalType: 'enum GraduationState' }, { name: 'securedQuote', type: 'uint256' }, { name: 'securedLaunchTokens', type: 'uint256' },
    { name: 'consumedQuote', type: 'uint256' }, { name: 'consumedLaunchTokens', type: 'uint256' }, { name: 'destinationIdentity', type: 'bytes32' }, { name: 'receiptHash', type: 'bytes32' },
    { name: 'protectedLPReceiver', type: 'address' }, { name: 'protectedLPAmount', type: 'uint256' }, { name: 'protectedExcessReceiver', type: 'address' }, { name: 'protectedExcessAmount', type: 'uint256' },
    { name: 'securedAt', type: 'uint256' },
  ] }] } as const,
  { type: 'function', name: 'receipt', inputs: [{ name: 'token', type: 'address' }], outputs: [{ name: '', type: 'tuple', internalType: 'struct GraduationReceipt', components: [
    { name: 'packetHash', type: 'bytes32' }, { name: 'destinationIdentity', type: 'bytes32' }, { name: 'market', type: 'address' }, { name: 'vault', type: 'address' }, { name: 'lpAsset', type: 'address' },
    { name: 'positionId', type: 'uint256' }, { name: 'seededQuote', type: 'uint256' }, { name: 'seededLaunchTokens', type: 'uint256' }, { name: 'quoteResidual', type: 'uint256' },
    { name: 'quoteResidualReceiver', type: 'address' }, { name: 'protectedLPReceiver', type: 'address' }, { name: 'protectedLPAmount', type: 'uint256' },
    { name: 'protectedExcessReceiver', type: 'address' }, { name: 'protectedExcessAmount', type: 'uint256' },
  ] }] } as const,
];

const KURU_ABI = [
  { type: 'function', name: 'bestBidAsk', inputs: [], outputs: [{ name: '', type: 'uint256' }, { name: '', type: 'uint256' }], stateMutability: 'view' } as const,
  { type: 'function', name: 'getMarketParams', inputs: [], outputs: [
    { name: '', type: 'uint32' }, { name: '', type: 'uint96' }, { name: '', type: 'address' }, { name: '', type: 'uint256' }, { name: '', type: 'address' }, { name: '', type: 'address' },
    { name: '', type: 'uint256' }, { name: '', type: 'uint32' }, { name: '', type: 'uint96' }, { name: '', type: 'uint96' }, { name: '', type: 'uint256' }, { name: '', type: 'uint256' },
  ], stateMutability: 'view' } as const,
];

const MARGIN_ABI = [
  { type: 'function', name: 'getBalance', inputs: [{ name: 'user', type: 'address' }, { name: 'asset', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' } as const,
];

export const RETROPICK = {
  chainId: RETROPICK_CHAIN_ID,
  coordinator: '0xaD62309242EA65BB07C833669EC6a4ED23AF738F',
  factory: '0xa7f18b9eceb0A9852b08408854A45D00fc682454',
  router: '0x7EFbE105Ca7415dE98F96622173458ac1c054630',
  marginAccount: '0xd029C2D98ff85D8F64799017fE00a59B1159CE02',
  /** Evidenced launch token → its graduated Kuru market. */
  tokens: [{ token: '0x43e7e9b1b7d9A143573307b13D14B51580c18f15', market: '0x1F5dE72616a7fe645Cf45aC66dfce8Ac7452C57F', vault: '0xc88DED06eB0081430Ff02d124C22b532e122CbE7' }],
} as const;

export const abis = { coordinator: COORDINATOR_ABI, kuru: KURU_ABI, margin: MARGIN_ABI };

export function monadClient(): PublicClient {
  return createPublicClient({ transport: http('https://testnet-rpc.monad.xyz') }) as unknown as PublicClient;
}

export function policyOf(): AgentPolicy {
  return { ...DEFAULT_POLICY, verifiedMarkets: RETROPICK.tokens.map((t) => t.market.toLowerCase()) };
}
