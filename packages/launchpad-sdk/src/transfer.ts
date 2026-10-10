import { encodeFunctionData, isAddress, parseAbi, zeroAddress, type Address, type Hex } from 'viem';
import { addresses, monad, type ChainClient } from './chain.ts';
import { factoryAbi } from './abis/factoryAbi.ts';
import { registryAbi } from './abis/registryAbi.ts';
const transferAbi = parseAbi(['function transfer(address recipient,uint256 amount) returns (bool)', 'function balanceOf(address) view returns (uint256)']);
export type PreparedTransfer = { kind: 'transfer'; to: Address; account: Address; asset: Address; recipient: Address; amount: bigint; value: bigint; data?: Hex; label: string; checks: string[] };
/** Same-chain wallet transfer only. No approval, custody, bridge or exchange routing. */
export async function prepareTransfer(chain: ChainClient, account: Address, input: { recipient: Address; asset: Address; amount: bigint }): Promise<PreparedTransfer> {
  if (!isAddress(input.recipient) || input.recipient === zeroAddress) throw Error('Enter a valid nonzero EVM recipient address.');
  if (!isAddress(account) || account === zeroAddress || !isAddress(input.asset) || input.amount <= 0n || input.amount >= 2n ** 256n) throw Error('Enter a valid account, asset and positive exact uint256 amount.');
  if (await chain.getChainId() !== monad.id) throw Error('Transfers require Monad Testnet.');
  const native = input.asset === zeroAddress;
  const blockNumber = await chain.getBlockNumber({ cacheTime: 0 });
  const nativeBalance = await chain.getBalance({ address: account, blockNumber });
  let data: Hex | undefined;
  if (!native) {
    const [launch, quote] = await Promise.all([chain.readContract({address:addresses.factory,abi:factoryAbi,functionName:'getLaunchedToken',args:[input.asset],blockNumber}),chain.readContract({address:addresses.quoteRegistry,abi:registryAbi,functionName:'getConfig',args:[input.asset],blockNumber}).catch(()=>undefined)]);
    if (!launch.exists && !quote?.enabled) throw Error('This ERC20 is not a verified RetroPick launch or admitted quote asset.');
    const balance = await chain.readContract({ address: input.asset, abi: transferAbi, functionName: 'balanceOf', args: [account], blockNumber });
    if (balance < input.amount) throw Error('Amount exceeds the wallet token balance.');
    const simulation = await chain.simulateContract({ address: input.asset, abi: transferAbi, functionName: 'transfer', args: [input.recipient, input.amount], account, blockNumber });
    if (simulation.result !== true) throw Error('This ERC20 transfer did not return success.');
    data = encodeFunctionData({ abi: transferAbi, functionName: 'transfer', args: [input.recipient, input.amount] });
  }
  const to = native ? input.recipient : input.asset;
  const value = native ? input.amount : 0n;
  const [gas, fees] = await Promise.all([chain.estimateGas({ to, value, data, account }), chain.estimateFeesPerGas()]);
  const fee = gas * fees.maxFeePerGas;
  if (nativeBalance < value + fee) throw Error('Insufficient MON for this transfer and network gas.');
  return { kind: 'transfer', to, account, asset: input.asset, recipient: input.recipient, amount: input.amount, value, data, label: 'Send to wallet', checks: ['Network Monad Testnet 10143', 'recipient and exact amount validated', 'current balance covers transfer and estimated gas'] };
}
export async function simulateTransfer(chain: ChainClient, transfer: PreparedTransfer) {
  // Recheck current network, membership, balances and gas rather than reusing
  // the review-time qualification after the wallet waits for a signature.
  const fresh = await prepareTransfer(chain, transfer.account, { asset: transfer.asset, recipient: transfer.recipient, amount: transfer.amount });
  if (fresh.to.toLowerCase() !== transfer.to.toLowerCase() || fresh.value !== transfer.value || fresh.data !== transfer.data) throw Error('Transfer descriptor changed. Prepare this transfer again.');
  if (transfer.asset === zeroAddress) { await chain.call({ to: transfer.to, value: transfer.value, account: transfer.account }); return; }
}
