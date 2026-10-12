import { createWalletClient, custom } from 'viem';
import { monad, type ChainClient } from '@retropick/launchpad-sdk/chain';
import { withViemAccount } from '@/lib/mera-signer/signer';
import { recoveryOptions, type Enrollment } from '@/lib/mera-signer/enrollment';
import { earnAction, transactionData, type PreparedAction } from '@/lib/mera-signer/authorization';
import { executePreparedWrite, type ExecuteOptions, type ExecutionWallet } from './tx-pipeline';

/** One action, one fresh ceremony, one contained session; no EOA provider replacement. */
export async function executeProtectedAction(chain: ChainClient, enrollment: Enrollment, prepared: PreparedAction, options: ExecuteOptions = {}) {
  if (prepared.account.toLowerCase() !== enrollment.address.toLowerCase() || !earnAction(prepared)) throw Error('Protected action does not belong to this fee wallet.');
  return withViemAccount(recoveryOptions(enrollment), async account => {
    const signer = createWalletClient({ chain: monad, account, transport: custom({ request: parameters => chain.request(parameters as never) }) });
    const wallet: ExecutionWallet = {
      getChainId: async () => chain.getChainId(),
      getAddresses: async () => [account.address],
      writeContract: async () => { throw Error('Protected Earn does not authorize approvals.'); },
      sendTransaction: parameters => {
        if (options.contextValid?.() === false || parameters.to.toLowerCase() !== prepared.to.toLowerCase() || (parameters.data ?? '0x') !== transactionData(prepared) || (parameters.value ?? 0n) !== prepared.value) throw Error('Protected transaction context changed.');
        return signer.sendTransaction(parameters);
      },
    };
    return executePreparedWrite(chain, wallet, prepared, { ...options, protectedSigner: true });
  });
}
