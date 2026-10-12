'use client';

import type { Abi, Address, Hex, TransactionReceipt } from 'viem';
import { encodeFunctionData, parseAbi } from 'viem';
import type { ChainClient } from '@retropick/launchpad-sdk/chain';
import { authorizeEarnAction, revalidateEarnAction, transactionData, type PreparedAction } from '@/lib/mera-signer/authorization';
import { classifyError, decodeEvents, type DecodedEvent } from '@retropick/launchpad-sdk/decode';
import { missingApprovals, type PreparedWrite } from '@retropick/launchpad-sdk/prepare';
import { markStage, measureStage } from '@/lib/live/performance';
import { queryClient, launchKeys } from '@/lib/live/queries';
import { simulateTransfer, type PreparedTransfer } from '@retropick/launchpad-sdk/transfer';

export type TxPhase =
  | { kind: 'preparing' }
  | { kind: 'approving'; token: Address; amount: bigint }
  | { kind: 'simulating' }
  | { kind: 'awaiting-signature' }
  | { kind: 'broadcasting'; hash: Hex }
  | { kind: 'confirming'; hash: Hex }
  | { kind: 'success'; hash: Hex; receipt: TransactionReceipt; events: DecodedEvent[] }
  | { kind: 'failed'; reason: string; failure: 'rejected' | 'revert' | 'rpc' | 'unknown' };

export type TxPhaseListener = (phase: TxPhase) => void;

export interface ExecutionWallet {
  getChainId(): Promise<number>;
  getAddresses(): Promise<readonly Address[]>;
  writeContract(parameters: { address: Address; abi: Abi; functionName: string; args?: readonly unknown[] }): Promise<Hex>;
  sendTransaction(parameters: { to: Address; data?: Hex; value?: bigint }): Promise<Hex>;
}
export interface ExecuteOptions {
  contextValid?: () => boolean;
  beforeSign?: (prepared: PreparedAction) => Promise<void>;
  /** Used by a contained passkey signer; never changes the connected EOA. */
  protectedSigner?: boolean;
  confirmations?: number;
  onPhase?: TxPhaseListener;
}

const approveAbi = parseAbi(['function approve(address spender, uint256 amount) returns (bool)']);

/**
 * The single sanctioned execution path for live economic writes:
 * ALLOWANCES (execute missing approvals first) → SIMULATE → SIGN →
 * BROADCAST → CONFIRMED RECEIPT → DECODE EVENTS. Preconditions, exact bigint
 * amounts and fresh reads are established by the SDK prepare* layer before
 * this runs; every failure mode maps to a classified reason.
 */
export async function executePreparedWrite(
  chain: ChainClient,
  wallet: ExecutionWallet,
  prepared: PreparedWrite | PreparedTransfer,
  options: ExecuteOptions = {},
): Promise<Extract<TxPhase, { kind: 'success' | 'failed' }>> {
  const emit = (phase: TxPhase) => options.onPhase?.(phase);
  const fail = (reason: string, failure: 'rejected' | 'revert' | 'rpc' | 'unknown') => {
    const phase: Extract<TxPhase, { kind: 'failed' }> = { kind: 'failed', reason, failure };
    emit(phase);
    return phase;
  };

  const timingId = `retropick:tx:${Date.now()}`;
  const mark = (stage: string) => { performance.mark(`${timingId}:${stage}`); markStage(`transaction.${stage}`); };
  const completed = measureStage('transaction.total');
  mark('preflight');
  emit({ kind: 'preparing' });
  let stage: 'approval' | 'simulate' | 'sign' | 'receipt' = 'simulate';
  try {
    // 1. Allowance freshness: approvals missing at execution time go first.
    if (await wallet.getChainId() !== 10143 || (await wallet.getAddresses())[0]?.toLowerCase() !== prepared.account.toLowerCase()) return fail('Wallet account or network changed. Prepare this action again.', 'unknown');
    const transfer = 'kind' in prepared && prepared.kind === 'transfer';
    const pending = transfer ? [] : await missingApprovals(chain, prepared as PreparedWrite);
    if (options.protectedSigner && pending.length) throw Error('Protected Earn actions cannot authorize token approvals.');
    for (const approval of pending) {
      stage = 'approval';
      emit({ kind: 'approving', token: approval.token, amount: approval.amount });
      const approvalHash = await wallet.writeContract({
        address: approval.token,
        abi: approveAbi,
        functionName: 'approve',
        args: [approval.spender, approval.amount],
      });
      const approvalReceipt = await chain.waitForTransactionReceipt({ hash: approvalHash });
      if (approvalReceipt.status !== 'success') return fail('Token approval transaction reverted.', 'revert');
    }

    // 2. Simulate the exact call before asking for a signature.
    stage = 'simulate';
    emit({ kind: 'simulating' });
    mark('simulation');
    await revalidateEarnAction(chain, prepared);
    if (transfer) await simulateTransfer(chain, prepared as PreparedTransfer);
    else await chain.simulateContract({
      address: prepared.to,
      abi: (prepared as PreparedWrite).abi as unknown as Parameters<typeof chain.simulateContract>[0]['abi'],
      functionName: (prepared as PreparedWrite).functionName,
      args: (prepared as PreparedWrite).args as unknown as Parameters<typeof chain.simulateContract>[0]['args'],
      ...(prepared.value ? { value: prepared.value } : {}),
      account: prepared.account,
    } as Parameters<typeof chain.simulateContract>[0]);

    // 3. Sign + broadcast through the wallet (EIP-1193 eth_sendTransaction).
    stage = 'sign';
    if (await wallet.getChainId() !== 10143 || (await wallet.getAddresses())[0]?.toLowerCase() !== prepared.account.toLowerCase()) return fail('Wallet account or network changed before signing.', 'unknown');
    if (!options.protectedSigner) await authorizeEarnAction(prepared);
    await options.beforeSign?.(prepared);
    if (await wallet.getChainId() !== 10143 || (await wallet.getAddresses())[0]?.toLowerCase() !== prepared.account.toLowerCase()) return fail('Wallet account or network changed during confirmation.', 'unknown');
    await revalidateEarnAction(chain, prepared);
    if (transfer) await simulateTransfer(chain, prepared as PreparedTransfer);
    else await chain.simulateContract({ address: prepared.to, abi: (prepared as PreparedWrite).abi as Abi, functionName: (prepared as PreparedWrite).functionName, args: (prepared as PreparedWrite).args, account: prepared.account, value: prepared.value });
    const [gas, fees, balance] = await Promise.all([chain.estimateGas({ to: prepared.to, data: transactionData(prepared), value: prepared.value, account: prepared.account }), chain.estimateFeesPerGas(), chain.getBalance({ address: prepared.account })]);
    if (balance < prepared.value + gas * fees.maxFeePerGas) throw Error('This signing account needs MON for network gas. Fund it separately before signing.');
    if (options.contextValid?.() === false || await wallet.getChainId() !== 10143 || (await wallet.getAddresses())[0]?.toLowerCase() !== prepared.account.toLowerCase()) return fail('Wallet or action changed before signing. Review again.', 'unknown');
    mark('wallet-prompt');
    emit({ kind: 'awaiting-signature' });
    const hash = await wallet.sendTransaction({
      to: prepared.to,
      data: transfer ? (prepared as PreparedTransfer).data : encodeFunctionData({ abi: (prepared as PreparedWrite).abi as unknown as Parameters<typeof encodeFunctionData>[0]['abi'], functionName: (prepared as PreparedWrite).functionName, args: (prepared as PreparedWrite).args as unknown as never[] }),
      ...(prepared.value ? { value: prepared.value } : {}),
    });

    mark('broadcast');
    stage = 'receipt';
    emit({ kind: 'broadcasting', hash });
    emit({ kind: 'confirming', hash });
    const receipt = await chain.waitForTransactionReceipt({ hash, confirmations: options.confirmations ?? 1 });
    if (receipt.status !== 'success') return fail('The transaction reverted on chain.', 'revert');
    mark('receipt');
    performance.measure('retropick:tx:wallet-to-receipt', `${timingId}:wallet-prompt`, `${timingId}:receipt`);
    const events = decodeEvents(receipt.logs);
    mark('reconciliation');
    void queryClient.invalidateQueries({queryKey:launchKeys.all});
    completed();
    const success = { kind: 'success', hash, receipt, events } as const;
    emit(success);
    return success;
  } catch (error) {
    const classification = classifyError(error);
    const prefix = stage === 'approval' ? 'Approval failed: ' : stage === 'simulate' ? 'Simulation failed: ' : '';
    if (classification.kind === 'user-rejected') return fail('Request rejected in wallet.', 'rejected');
    const failure = classification.kind === 'revert' ? 'revert' : classification.kind === 'rpc' ? 'rpc' : 'unknown';
    return fail(`${prefix}${classification.message}`, failure);
  }
}
