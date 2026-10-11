// RetroPick Graduation Safety Workflow — Chainlink Runtime Environment (CRE).
//
// Independently verifies that a graduated RetroPick launch reached the correct Kuru market
// and that custody and market records agree, around the primary→secondary transition:
//   1. chain anchor      — block header at execution time
//   2. graduation ledger — coordinator ledger.phase === 2 (graduated)
//   3. market identity   — coordinator receipt.market === expected Kuru market
//   4. custody agreement — ledger.protectedLPAmount === receipt.protectedLPAmount > 0,
//                          receivers non-zero (protected-LP custody records agree)
//   5. external evidence — Sourcify verification status for the launch factory (real
//                          off-chain input through the HTTP capability)
// Deterministic rules only; output is a bounded JSON report. Cron re-runs re-evaluate
// fresh state at a new block — reports are idempotent by construction (same chain state
// ⇒ same verdict), which is the duplicate-trigger handling.
//
// READ-ONLY: this workflow never writes onchain and uses no secrets.
import {
  cre,
  CronCapability,
  EVMClient,
  HTTPClient,
  Runner,
  consensusIdenticalAggregation,
  encodeCallMsg,
  protoBigIntToBigint,
  LATEST_BLOCK_NUMBER,
  type CronPayload,
  type Runtime,
} from '@chainlink/cre-sdk';
import { encodeFunctionData, decodeFunctionResult, toHex, type Address, type Hex } from 'viem';
import { coordinatorAbi } from '../../../packages/launchpad-sdk/src/abis/coordinatorAbi.ts';

interface Config {
  chainId: number;
  chainName: string;
  token: Address;
  coordinator: Address;
  factory: Address;
  expectedMarket: Address;
  sourcifyCheckUrl: string;
}

/** Serializable-safe tri-state: CRE results cannot carry nulls. */
type ExternalCheck = 'verified' | 'mismatch' | 'unavailable';

interface SafetyReport {
  workflow: 'retropick-graduation-safety';
  version: 1;
  chain: { id: number; name: string };
  token: string;
  anchorBlock: string;
  anchorTimestamp: string;
  checks: {
    graduated: boolean;
    marketIdentity: boolean;
    custodyAgreement: boolean;
    externalFactoryVerified: ExternalCheck;
  };
  observed: {
    ledgerPhase: number;
    receiptMarket: string;
    protectedLpAmount: string;
    protectedExcessAmount: string;
    sourcifyStatus: string;
  };
  verdict: 'PASS' | 'FAIL' | 'INCOMPLETE_EXTERNAL';
  generatedAt: string;
}

// Chain selector from the SDK's own generated table (monad-testnet = 2183018362218727504n).
const evm = new EVMClient(EVMClient.SUPPORTED_CHAIN_SELECTORS['monad-testnet']);
const http = new HTTPClient();
const cron = new CronCapability();
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

function bytesToText(body: Uint8Array | string | undefined): string {
  if (body === undefined) return '';
  if (typeof body === 'string') return body;
  return new TextDecoder().decode(body);
}

function callRaw(runtime: Runtime<Config>, address: Address, data: Hex): Hex {
  const reply = evm.callContract(runtime, {
    // from is required by eth_call and irrelevant for static views; zero address is standard.
    call: encodeCallMsg({ from: ZERO_ADDRESS, to: address, data }),
    blockNumber: LATEST_BLOCK_NUMBER,
  }).result();
  return toHex(reply.data ?? new Uint8Array());
}

async function graduationSafety(runtime: Runtime<Config>, _trigger: CronPayload): Promise<SafetyReport> {
  const cfg = runtime.config;

  // 1. Chain anchor
  const header = evm.headerByNumber(runtime, {}).result();
  const anchorBlock = header.header?.blockNumber ? protoBigIntToBigint(header.header.blockNumber).toString() : '0';
  const anchorTimestamp = header.header?.timestamp !== undefined && header.header.timestamp !== null ? header.header.timestamp.toString() : '0';

  // 2–4. On-chain graduation ledger, receipt, custody agreement
  const ledger = decodeFunctionResult({
    abi: coordinatorAbi,
    functionName: 'ledger',
    data: callRaw(runtime, cfg.coordinator, encodeFunctionData({ abi: coordinatorAbi, functionName: 'ledger', args: [cfg.token] })),
  }) as { phase: number; protectedLPReceiver: Address; protectedLPAmount: bigint; protectedExcessAmount: bigint };
  const receipt = decodeFunctionResult({
    abi: coordinatorAbi,
    functionName: 'receipt',
    data: callRaw(runtime, cfg.coordinator, encodeFunctionData({ abi: coordinatorAbi, functionName: 'receipt', args: [cfg.token] })),
  }) as { market: Address; protectedLPReceiver: Address; protectedLPAmount: bigint; protectedExcessAmount: bigint };

  const graduated = Number(ledger.phase) === 2;
  const marketIdentity = graduated && receipt.market.toLowerCase() === cfg.expectedMarket.toLowerCase();
  const custodyAgreement =
    graduated &&
    ledger.protectedLPAmount > 0n &&
    ledger.protectedLPReceiver !== ZERO_ADDRESS &&
    ledger.protectedLPAmount === receipt.protectedLPAmount &&
    ledger.protectedExcessAmount === receipt.protectedExcessAmount;

  // 5. Real external input: Sourcify verification status of the launch factory.
  // HTTP sends execute in node mode; DON consensus aggregates the single deterministic result.
  // Transport failures (DNS, timeout, refused) must surface as the designed
  // INCOMPLETE_EXTERNAL verdict — never crash the workflow.
  let external: { statusCode: number; body: string } = { statusCode: 0, body: '' };
  let sourcifyStatus = 'unavailable';
  try {
    external = runtime.runInNodeMode(
      (nodeRuntime) => {
        const response = http.sendRequest(nodeRuntime, { url: cfg.sourcifyCheckUrl, method: 'GET' }).result();
        return { statusCode: response.statusCode ?? 0, body: bytesToText(response.body) };
      },
      consensusIdenticalAggregation<{ statusCode: number; body: string }>(),
    )().result();
    if (external.statusCode === 200) {
      const parsed = JSON.parse(external.body) as { runtimeMatch?: string };
      sourcifyStatus = parsed.runtimeMatch ?? 'unknown';
    }
  } catch {
    sourcifyStatus = 'unavailable';
  }
  const externalFactoryVerified: ExternalCheck =
    sourcifyStatus === 'exact_match' ? 'verified' : sourcifyStatus === 'partial_match' ? 'mismatch' : 'unavailable';

  const coreChecksPass = graduated && marketIdentity && custodyAgreement;
  const verdict: SafetyReport['verdict'] = !coreChecksPass
    ? 'FAIL'
    : externalFactoryVerified === 'unavailable'
      ? 'INCOMPLETE_EXTERNAL'
      : externalFactoryVerified === 'verified'
        ? 'PASS'
        : 'FAIL';

  runtime.log(`graduation-safety: verdict=${verdict} block=${anchorBlock}`);

  return {
    workflow: 'retropick-graduation-safety',
    version: 1,
    chain: { id: cfg.chainId, name: cfg.chainName },
    token: cfg.token,
    anchorBlock,
    anchorTimestamp,
    checks: { graduated, marketIdentity, custodyAgreement, externalFactoryVerified },
    observed: {
      ledgerPhase: Number(ledger.phase),
      receiptMarket: receipt.market,
      protectedLpAmount: ledger.protectedLPAmount.toString(),
      protectedExcessAmount: ledger.protectedExcessAmount.toString(),
      sourcifyStatus,
    },
    verdict,
    generatedAt: runtime.now().toISOString(),
  };
}

// Hourly cadence; the simulator fires cron triggers immediately on run.
const initWorkflow = () => [
  cre.handler(cron.trigger({ schedule: '0 * * * *' }), graduationSafety),
];

// Canonical CRE entrypoint (javy requires exported functions without parameters).
export async function main() {
  const runner = await Runner.newRunner<Config>({
    configParser: (raw) => JSON.parse(new TextDecoder().decode(raw)) as Config,
  });
  await runner.run(initWorkflow);
}
