import { type Address } from 'viem';
import { addresses, type ChainClient } from './chain.ts';
import { coordinatorAbi } from './abis/coordinatorAbi.ts';
/** A launch's immutable committed goal, not today's mutable quote-registry threshold. */
export async function readGraduationGoal(chain: ChainClient, token: Address, quote: Address, blockNumber?: bigint): Promise<bigint> {
  const packet = await chain.readContract({ address: addresses.coordinator, abi: coordinatorAbi, functionName: 'packet', args: [token], blockNumber });
  if (packet.token.toLowerCase() !== token.toLowerCase() || packet.quoteAsset.toLowerCase() !== quote.toLowerCase() || packet.graduationThreshold <= 0n) throw new Error('Graduation goal identity mismatch.');
  return packet.graduationThreshold;
}
export function bondingProgressBps(reserve: bigint, goal: bigint): number { if (goal <= 0n) throw new Error('Invalid graduation goal.'); return Number((reserve < 0n ? 0n : reserve >= goal ? goal : reserve) * 10000n / goal); }
