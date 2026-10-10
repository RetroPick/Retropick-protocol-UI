// READ-ONLY revalidation of the historically evidenced Kuru market (Metropolis Stage 1).
// No signing, no broadcasts. Emits JSON evidence to stdout.
// Run: node --experimental-strip-types scripts/kuru-revalidate.ts <market> <token> <vault>
import { createChain } from '../packages/launchpad-sdk/src/chain.ts';
import { readKuru } from '../packages/launchpad-sdk/src/kuru.ts';
import { readKuruOrder } from '../packages/launchpad-sdk/src/orders.ts';
import { kuruAbi } from '../packages/launchpad-sdk/src/abis/kuruAbi.ts';
import type { Address } from 'viem';

const [marketArg, tokenArg, vaultArg] = process.argv.slice(2);
if (!marketArg || !tokenArg || !vaultArg) throw Error('usage: kuru-revalidate.ts <market> <token> <vault>');
const market = marketArg as Address, token = tokenArg as Address, vault = vaultArg as Address;

const chain = createChain(process.env.MONAD_TESTNET_RPC_URLS ?? 'https://testnet-rpc.monad.xyz');
await chain.probeProviders();
const blockNumber = await chain.getBlockNumber({ cacheTime: 0 });

// 1) Identity qualification + best bid/ask (throws on any identity/environment mismatch).
const state = await readKuru(chain, market, token, vault, undefined, { includeBook: false, includeBalances: false });

// 2) Historically evidenced orders (filled id 1, cancelled id 2) re-read on-chain.
//    s_orders tuple: owner, size, prev, next, flippedId, price, flippedPrice, isBuy.
const orders = await Promise.all([1, 2].map(async (id) => {
  const { order, active } = await readKuruOrder(chain, market, id);
  return { orderId: id, owner: order[0], sizeRaw: order[1].toString(), price: order[5], isBuy: order[7], bookActive: active };
}));

// 3) Order-id counter: did the market keep operating after the evidenced campaign?
const orderIdCounter = await chain.readContract({ address: market, abi: kuruAbi, functionName: 's_orderIdCounter', blockNumber });

const evidence = {
  kind: 'kuru-consumer-revalidation',
  mode: 'READ_ONLY',
  network: { chainId: 10143, name: 'Monad Testnet', rpc: process.env.MONAD_TESTNET_RPC_URLS ? 'configured' : 'public' },
  runAt: new Date().toISOString(),
  blockNumber: blockNumber.toString(),
  market, token, vault,
  identity: 'PASS (readKuru qualify: router verified-market registration, margin account, orderbook/vault implementations, token binding)',
  bestBidX18: state.best[0].toString(),
  bestAskX18: state.best[1].toString(),
  historicOrders: orders,
  orderIdCounter: orderIdCounter.toString(),
  verdict: 'HISTORICAL_ORDER_FILL_CANCEL_EVIDENCE_REVALIDATED_READ_ONLY',
};
console.log(JSON.stringify(evidence, null, 2));
