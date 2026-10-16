/** Read-only testnet snapshot and size/account simulations. No wallet or signer is constructed. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { isAddress, zeroAddress, type Address } from 'viem';
import { createChain, release } from '../src/chain.ts';
import { readKuruLiquidity } from '../src/liquidity.ts';
import { kuruAbi } from '../src/abis/kuruAbi.ts';

const args = process.argv.slice(2);
const option = (name: string) => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
const output = option('--output');
if (!output) throw Error('--output is required; use a fresh evidence filename.');
const token = option('--token') ?? release.demo.token;
const account = option('--account');
if (!isAddress(token) || account && !isAddress(account)) throw Error('Invalid evidence address.');
const block = option('--block');
const rpc = (process.env.MONAD_TESTNET_RPC_URLS ?? process.env.MONAD_TESTNET_RPC_URL ?? 'https://testnet-rpc.monad.xyz').split(',').map(value => value.trim()).filter(Boolean);
const chain = createChain(rpc, { timeoutMs: 7000, maxConcurrent: 3, requestsPerSecond: 8 });
const snapshot = await readKuruLiquidity(chain, token as Address, { blockNumber: block ? BigInt(block) : undefined, account: account as Address | undefined });
type Simulation = { side: 'buy' | 'sell'; kind: 'size-quote' | 'funded-account'; inputRaw: bigint; expectedRaw?: bigint; minimumRaw?: bigint; resultRaw?: bigint; status: 'success' | 'failed'; error?: string };
const simulations: Simulation[] = [];
for (const side of ['buy', 'sell'] as const) {
  const raw = option(side === 'buy' ? '--buy-raw' : '--sell-raw');
  if (!raw) continue;
  const inputRaw = BigInt(raw);
  if (inputRaw <= 0n) throw Error('Simulation amount must be positive.');
  const i = snapshot.identity;
  const numerator = inputRaw * (side === 'buy' ? i.pricePrecision : i.sizePrecision);
  const denominator = 10n ** BigInt(side === 'buy' ? i.quoteDecimals : i.baseDecimals);
  if (numerator % denominator !== 0n) throw Error('Simulation amount is finer than market grid.');
  const units = numerator / denominator;
  const functionName = side === 'buy' ? 'placeAndExecuteMarketBuy' : 'placeAndExecuteMarketSell';
  const safeError = (error: unknown) => {
    const e = error as { shortMessage?: string; message?: string };
    const text = e.shortMessage ?? e.message ?? '';
    const selector = text.match(/0x[0-9a-fA-F]{8}\b/)?.[0];
    return selector ? `REVERT_SELECTOR_${selector}` : /RPC_RATE_LIMIT/.test(text) ? 'RPC_RATE_LIMIT' : 'SIMULATION_FAILED';
  };
  try {
    const quote = await chain.simulateContract({ address: i.market, abi: kuruAbi, functionName, args: [units, 0n, true, true], account: zeroAddress, value: 0n, blockNumber: snapshot.blockNumber });
    const expectedRaw = BigInt(quote.result);
    const minimumRaw = expectedRaw * 9950n / 10000n;
    simulations.push({ side, kind: 'size-quote', inputRaw, expectedRaw, minimumRaw, status: 'success' });
    if (account && minimumRaw > 0n) {
      try {
        const funded = await chain.simulateContract({ address: i.market, abi: kuruAbi, functionName, args: [units, minimumRaw, true, true], account: account as Address, value: 0n, blockNumber: snapshot.blockNumber });
        simulations.push({ side, kind: 'funded-account', inputRaw, minimumRaw, resultRaw: BigInt(funded.result), status: 'success' });
      } catch (error) { simulations.push({ side, kind: 'funded-account', inputRaw, minimumRaw, status: 'failed', error: safeError(error) }); }
    }
  } catch (error) { simulations.push({ side, kind: 'size-quote', inputRaw, status: 'failed', error: safeError(error) }); }
}
const header = await chain.getBlock({ blockNumber: snapshot.blockNumber });
if (header.hash !== snapshot.blockHash) throw Error('Evidence block reorged during simulations.');
const record = { recordedAt: new Date().toISOString(), broadcast: false, snapshot, simulations, coverage: 'Pinned chain reads and eth_call only; no transaction receipt is created.' };
const file = resolve(output);
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, JSON.stringify(record, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2) + '\n', { flag: 'wx' });
console.log(`Read-only liquidity evidence written to ${file}`);
