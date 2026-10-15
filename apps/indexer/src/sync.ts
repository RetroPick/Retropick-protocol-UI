import { createPublicClient, decodeEventLog, zeroAddress, type Address, type Hex } from 'viem';
import { addresses, monad, release, type ChainClient } from '@retropick/launchpad-sdk/chain';
import { coordinatorAbi, tokenAbi, curveAbi, registryAbi, kuruAbi } from '@retropick/launchpad-sdk/abi';
import { retroPickFeeEscrowV2Abi } from '@retropick/launchpad-sdk/abis/retroPickFeeEscrowV2Abi';
import { retroPickBuybackVaultV2Abi } from '@retropick/launchpad-sdk/abis/retroPickBuybackVaultV2Abi';
import { readKuruLiquidity } from '@retropick/launchpad-sdk/liquidity';
import { kuruVaultAbi } from '@retropick/launchpad-sdk/abis/kuruVaultAbi';
import { indexerAbi } from '@retropick/launchpad-sdk/events';
import type { IndexedLaunch, IndexedAssetMetadata, IndexedMarketParameters, IndexedLiquidityPool } from '@retropick/launchpad-sdk/read-model';
import { Store, type JournalEvent } from './store.ts';
import { createProviderPool, classifyFailure, safeErrorMessage, type ProviderPool } from './providers.ts';
import { project, marketCapQuoteRaw, executionPriceX18, PROJECTION_VERSION, type LaunchSeed, type Snapshot } from './project.ts';
export const START_BLOCK: number = release.deploymentBlock ?? 69509526;
const rootNames = new Set(['TokenLaunched', 'LaunchCommitted', 'GraduationSecured', 'GraduationCompleted']);
const auxiliaryAbi = [...indexerAbi, ...retroPickFeeEscrowV2Abi, ...retroPickBuybackVaultV2Abi].filter(e => e.type === 'event');
type TokenIdentity = { eventId: string; name: string; symbol: string; description: string; logo: string; socials: IndexedLaunch['socials']; originalSupply: string };
export class Indexer {
  store: Store; client: ChainClient; confirmations: number; head = 0; syncing = false; error: string | null = null;
  headers = new Map<number, { hash: Hex; timestamp: number }>();
  backfillRunning = false;
  pool: ProviderPool | null = null;
  /** Max blocks scanned before a consistent snapshot is published; long catch-ups publish progressively. */
  maxBlocksPerPass: number;
  progress = { passes: 0, passStartedAt: null as string | null, passTarget: null as number | null, headTarget: null as number | null, lastSyncedAt: null as string | null, lastPassMs: null as number | null, lastPassBlocks: null as number | null, blocksPerSecond: null as number | null, lastError: null as string | null, catchingUp: false };
  constructor(store: Store, url: string | string[], confirmations = 8, maxBlocksPerPass = 20_000) {
    this.maxBlocksPerPass = maxBlocksPerPass;
    this.store = store; this.confirmations = confirmations;
    let due = 0;
    const fetchFn: typeof fetch = async (input, init) => { const wait = Math.max(0, due - Date.now()); due = Math.max(due, Date.now()) + 130; if (wait) await new Promise(r => setTimeout(r, wait)); return fetch(input, init); };
    const urls = Array.isArray(url) ? url : [url];
    this.pool = createProviderPool(urls, { chainId: monad.id, fetchFn });
    const transport = this.pool.transport;
    this.client = createPublicClient({ chain: monad, batch: { multicall: { batchSize: 4096, wait: 25 } }, transport }) as unknown as ChainClient;
  }
  async header(block: number, fresh = false) {
    if (!fresh && this.headers.has(block)) return this.headers.get(block)!;
    const value = await this.client.getBlock({ blockNumber: BigInt(block) }); if (!value.hash) throw Error('Missing block hash');
    const result = { hash: value.hash, timestamp: Number(value.timestamp) }; if (!fresh) this.headers.set(block, result); return result;
  }
  async reconcile(stage: string) {
    const checkpoints = this.store.checkpoints(stage);
    if (!checkpoints.length || (await this.header(checkpoints[0].block, true)).hash.toLowerCase() === checkpoints[0].hash.toLowerCase()) return;
    let common = START_BLOCK - 1;
    for (const c of checkpoints.slice(1)) if ((await this.header(c.block, true)).hash.toLowerCase() === c.hash.toLowerCase()) { common = c.block; break; }
    this.store.rollback(common); this.headers.clear(); console.log('Reorg rollback:', common);
  }
  /** Range limits vary by provider; bisect only RANGE failures, retaining complete-batch publication. */
  async logsWithSplit(request: Parameters<ChainClient['getLogs']>[0]): Promise<Awaited<ReturnType<ChainClient['getLogs']>>> {
    try { return await this.client.getLogs(request); }
    catch (error) {
      const from = request?.fromBlock, to = request?.toBlock;
      if (classifyFailure(error) !== 'RANGE' || typeof from !== 'bigint' || typeof to !== 'bigint' || from >= to) throw error;
      const mid = (from + to) / 2n;
      const left = await this.logsWithSplit({ ...request, toBlock: mid, blockHash: undefined } as Parameters<ChainClient['getLogs']>[0]);
      const right = await this.logsWithSplit({ ...request, fromBlock: mid + 1n, blockHash: undefined } as Parameters<ChainClient['getLogs']>[0]);
      return [...left, ...right];
    }
  }
  async scan(stage: string, target: number, contracts: Address[], start = START_BLOCK) {
    if (!contracts.length) return;
    const sourceAbi = stage.startsWith('vault:') ? kuruVaultAbi.filter(e => e.type === 'event') : stage === 'beneficiary' ? auxiliaryAbi : indexerAbi;
    const eventsAbi = sourceAbi.filter(e => stage === 'root' ? rootNames.has(e.name) : !rootNames.has(e.name));
    let from = Math.max(start, this.store.cursor(stage, start) + 1);
    const revision = this.store.get<number>('reorgRevision') ?? 0;
    // A verified descendant commits its ancestors: existing canonical checkpoints
    // avoid another header RPC for empty historical beneficiary ranges.
    const checkpointHashes = new Map(this.store.checkpoints('root').map(c => [c.block, c.hash]));
    while (from <= target) {
      const ranges = Array.from({ length: Math.min(8, Math.ceil((target - from + 1) / 100)) }, (_, i) => ({ from: from + i * 100, to: Math.min(from + i * 100 + 99, target) }));
      const batches = await Promise.all(ranges.map(async range => {
        const logs = await this.logsWithSplit({ address: contracts, events: eventsAbi, fromBlock: BigInt(range.from), toBlock: BigInt(range.to) } as Parameters<ChainClient['getLogs']>[0]);
        const events: JournalEvent[] = [];
        for (const log of logs) {
          if (log.removed || !log.blockHash || !log.transactionHash || log.blockNumber === null || log.logIndex === null || log.transactionIndex === null) throw Error('Incomplete event');
          if (!contracts.some(a => a.toLowerCase() === log.address.toLowerCase())) throw Error('Unexpected log emitter');
          const decoded = decodeEventLog({ abi: sourceAbi, data: log.data, topics: log.topics });
          const header = await this.header(Number(log.blockNumber)); if (header.hash.toLowerCase() !== log.blockHash.toLowerCase()) throw Error('Log block mismatch');
          events.push({ id: `10143:${log.blockHash}:${log.transactionHash}:${log.logIndex}`, chainId: 10143, address: log.address.toLowerCase(), name: decoded.eventName, args: { ...(decoded.args as Record<string, unknown>), ...(decoded.eventName === 'Transfer' ? { value: (decoded.args as { value?: bigint; amount?: bigint }).value ?? (decoded.args as { amount?: bigint }).amount } : {}) }, block: Number(log.blockNumber), blockHash: log.blockHash, transactionHash: log.transactionHash, transactionIndex: log.transactionIndex, logIndex: log.logIndex, timestamp: header.timestamp });
        }
        const hash = stage === 'beneficiary' && checkpointHashes.has(range.to) ? checkpointHashes.get(range.to)! : (await this.header(range.to)).hash;
        return { ...range, hash, events };
      }));
      if ((this.store.get<number>('reorgRevision') ?? 0) !== revision) throw Error('REORG_DURING_SCAN');
      for (const batch of batches) {
        this.store.commit(stage, batch.to, batch.hash, batch.events);
        if (batch.events.length || batch.to === target || (batch.to - START_BLOCK) % 5000 < 100) console.log('Indexed', stage, batch.to, '/', target, 'events', batch.events.length);
      }
      from = ranges.at(-1)!.to + 1;
    }
  }
  async backfill(target: number) {
    if (this.backfillRunning) return;
    this.backfillRunning = true;
    try { await this.scan('beneficiary', target, [addresses.factory, addresses.feeEscrow, addresses.buybackVault, release.kuruEnvironment.marginAccount as Address]); }
    catch { console.error('Beneficiary history remains pending: RPC_OR_CHAIN_SYNC_FAILED'); }
    finally { this.backfillRunning = false; }
    if (!this.syncing) void this.sync();
  }

  async asset(token: Address, blockNumber: bigint): Promise<IndexedAssetMetadata> {
    if (token.toLowerCase() === zeroAddress) return { token: zeroAddress, name: 'Monad', symbol: 'MON', decimals: 18 };
    const key = `asset:${PROJECTION_VERSION}:${token.toLowerCase()}`; const cached = this.store.get<IndexedAssetMetadata>(key); if (cached) return cached;
    const [name, symbol, decimals] = await Promise.all([
      this.client.readContract({ address: token, abi: tokenAbi, functionName: 'name', blockNumber }).catch(() => token),
      this.client.readContract({ address: token, abi: tokenAbi, functionName: 'symbol', blockNumber }).catch(() => token),
      this.client.readContract({ address: token, abi: tokenAbi, functionName: 'decimals', blockNumber }).catch(() => null),
    ]);
    const result = { token: token.toLowerCase(), name: String(name), symbol: String(symbol), decimals: decimals === null ? null : Number(decimals) };
    if (result.decimals !== null) this.store.set(key, result); return result;
  }
  async tokenIdentity(event: JournalEvent, token: Address, blockNumber: bigint): Promise<TokenIdentity> {
    const key = `identity:${PROJECTION_VERSION}:${token.toLowerCase()}`; const cached = this.store.get<TokenIdentity>(key); if (cached?.eventId === event.id) return cached;
    const [name, symbol, info, originalSupply] = await Promise.all([
      this.client.readContract({ address: token, abi: tokenAbi, functionName: 'name', blockNumber }),
      this.client.readContract({ address: token, abi: tokenAbi, functionName: 'symbol', blockNumber }),
      this.client.readContract({ address: token, abi: tokenAbi, functionName: 'getTokenInfo', blockNumber }),
      this.client.readContract({ address: token, abi: tokenAbi, functionName: 'totalSupply', blockNumber: BigInt(event.block) }),
    ]);
    const metadata = info as unknown as readonly [Address, string, string, IndexedLaunch['socials']];
    if (metadata[0].toLowerCase() !== String(event.args.deployer).toLowerCase()) throw Error('Token creator mismatch');
    const identity: TokenIdentity = { eventId: event.id, name, symbol, logo: metadata[1], description: metadata[2], socials: metadata[3], originalSupply: originalSupply.toString() }; this.store.set(key, identity); return identity;
  }
  async marketParameters(market: Address, token: Address, quote: Address, blockNumber: bigint): Promise<IndexedMarketParameters> {
    const key = `market:${PROJECTION_VERSION}:${market.toLowerCase()}`; const cached = this.store.get<IndexedMarketParameters>(key);
    if (cached) { if (cached.baseAsset !== token.toLowerCase() || cached.quoteAsset !== quote.toLowerCase()) throw Error('Kuru market asset mismatch'); return cached; }
    const p = await this.client.readContract({ address: market, abi: kuruAbi, functionName: 'getMarketParams', blockNumber });
    if (p[2].toLowerCase() !== token.toLowerCase() || p[4].toLowerCase() !== quote.toLowerCase() || p[0] <= 0 || p[1] <= 0n) throw Error('Kuru market asset/precision mismatch');
    const params = { pricePrecision: p[0].toString(), sizePrecision: p[1].toString(), baseAsset: p[2].toLowerCase(), baseDecimals: Number(p[3]), quoteAsset: p[4].toLowerCase(), quoteDecimals: Number(p[5]) }; this.store.set(key, params); return params;
  }
  async discover(target: number) {
    const events = this.store.events('root'); const seeds: LaunchSeed[] = []; const blockNumber = BigInt(target);
    // Small bounded batches retain provider limits while removing the per-launch waterfall.
    const launched = events.filter(e => e.name === 'TokenLaunched');
    for (let start = 0; start < launched.length; start += 8) {
      const rows = await Promise.all(launched.slice(start, start + 8).map(async event => {
        const token = String(event.args.token) as Address; const curve = String(event.args.curve) as Address;
        const [packet, ledger, receipt, identity, supply, remaining, reserved, quote, reserves] = await Promise.all([
          this.client.readContract({ address: addresses.coordinator, abi: coordinatorAbi, functionName: 'packet', args: [token], blockNumber }),
          this.client.readContract({ address: addresses.coordinator, abi: coordinatorAbi, functionName: 'ledger', args: [token], blockNumber }),
          this.client.readContract({ address: addresses.coordinator, abi: coordinatorAbi, functionName: 'receipt', args: [token], blockNumber }),
          this.tokenIdentity(event, token, blockNumber),
          this.client.readContract({ address: token, abi: tokenAbi, functionName: 'totalSupply', blockNumber }),
          this.client.readContract({ address: curve, abi: curveAbi, functionName: 'sellableTokens', blockNumber }),
          this.client.readContract({ address: curve, abi: curveAbi, functionName: 'reservedTokens', blockNumber }),
          this.client.readContract({ address: curve, abi: curveAbi, functionName: 'realQuoteReserve', blockNumber }),
          this.client.readContract({ address: curve, abi: curveAbi, functionName: 'getReserves', blockNumber }),
        ]);
        const [config, quoteMetadata] = await Promise.all([
          this.client.readContract({ address: addresses.quoteRegistry, abi: registryAbi, functionName: 'getConfig', args: [packet.quoteAsset], blockNumber }),
          this.asset(packet.quoteAsset, blockNumber),
        ]);
        if (packet.token.toLowerCase() !== token.toLowerCase() || packet.curve.toLowerCase() !== curve.toLowerCase() || quoteMetadata.decimals !== config.decimals) throw Error('Launch identity mismatch');
        const phase: IndexedLaunch['phase'] = ledger.phase === 2 ? 'GRADUATED' : ledger.phase === 1 ? 'GRADUATING' : remaining === 0n ? 'GRADUATION_READY' : 'ACTIVE';
        const completed = events.find(e => e.name === 'GraduationCompleted' && String(e.args.token).toLowerCase() === token.toLowerCase());
        if ((ledger.phase === 2) !== !!completed) throw Error('Coordinator event/state mismatch');
        const allocation = BigInt(identity.originalSupply) - reserved;
        const price = ledger.phase === 2 ? null : reserves[1] > 0n ? executionPriceX18(reserves[0], reserves[1], 18, config.decimals) : null;
        const market = ledger.phase === 2 && receipt.market !== zeroAddress ? receipt.market.toLowerCase() : null;
        const marketParams = market && packet.venue === 1 ? await this.marketParameters(market as Address, token, packet.quoteAsset, blockNumber) : undefined;
        return { launch: { token: token.toLowerCase(), curve: curve.toLowerCase(), creator: String(event.args.deployer).toLowerCase(), quoteAsset: packet.quoteAsset.toLowerCase(), quoteSymbol: quoteMetadata.symbol, quoteDecimals: config.decimals, baseDecimals: 18, name: identity.name, symbol: identity.symbol, description: identity.description, logo: identity.logo, socials: identity.socials, supplyRaw: supply.toString(), launchSupplyRaw: identity.originalSupply, createdBlock: event.block, createdAt: new Date(event.timestamp * 1000).toISOString(), phase, venue: packet.venue === 1 ? 'KURU' as const : 'UNISWAP_V4' as const, market, vault: ledger.phase === 2 && receipt.vault !== zeroAddress ? receipt.vault.toLowerCase() : null, lpLock: ledger.phase === 2 ? ledger.protectedLPReceiver.toLowerCase() : null, policyVersion: packet.quotePolicyVersion, quoteReserveRaw: (ledger.phase === 2 ? receipt.seededQuote : quote).toString(), liquidityRaw: ledger.phase === 2 ? null : quote.toString(), liquiditySource: ledger.phase === 2 ? 'UNAVAILABLE' as const : 'CURVE_RESERVE' as const, priceRaw: price?.toString() ?? null, priceX18: price?.toString() ?? null, priceSource: price === null ? 'UNAVAILABLE' as const : 'CURVE_SPOT' as const, marketCapRaw: price === null ? null : marketCapQuoteRaw(price, supply, 18, config.decimals).toString(), bondingProgressBps: ledger.phase > 0 ? 10000 : allocation > 0n ? Math.max(0, Math.min(10000, Number((allocation - remaining) * 10000n / allocation))) : 0, marketParams, launchTransactionHash: event.transactionHash, ...(completed ? { graduationBlock: completed.block, graduationTimestamp: completed.timestamp, graduationTransactionHash: completed.transactionHash } : {}) } } satisfies LaunchSeed;
      }));
      seeds.push(...rows);
    }
    return seeds;
  }
  vaultStage(vault: string) { return `vault:${PROJECTION_VERSION}:${vault.toLowerCase()}`; }
  /** Each qualified vault owns an inclusive historical cursor, independent of dynamic logs. */
  async liquidity(seeds: LaunchSeed[], target: number): Promise<IndexedLiquidityPool[]> {
    const pools: IndexedLiquidityPool[] = [];
    const anchor = await this.header(target);
    for (const { launch: l } of seeds) {
      if (l.phase !== 'GRADUATED' || l.venue !== 'KURU' || !l.market || !l.vault || l.graduationBlock === undefined) continue;
      const vault = l.vault as Address, blockNumber = BigInt(target), stage = this.vaultStage(vault);
      const pool: IndexedLiquidityPool = { token: l.token, market: l.market, vault, lpLock: l.lpLock, baseAsset: l.token, quoteAsset: l.quoteAsset, baseDecimals: l.baseDecimals ?? 18, quoteDecimals: l.quoteDecimals, baseSymbol: l.symbol, quoteSymbol: l.quoteSymbol, baseAssetsRaw: null, quoteAssetsRaw: null, totalSharesRaw: null, protectedSharesRaw: null, infrastructureSharesRaw: null, historyComplete: false, historyIndexedBlock: this.store.cursor(stage, l.graduationBlock), graduationBlock: l.graduationBlock, status: 'UNAVAILABLE' };
      // Receipt + ledger establish discovery; the vault must independently agree on identity.
      try {
        const state = await readKuruLiquidity(this.client, l.token as Address, { blockNumber, includeBook: false });
        if (state.blockHash.toLowerCase() !== anchor.hash.toLowerCase()) throw Error('Liquidity snapshot reorg');
        if (state.identity.vault.toLowerCase() !== vault || state.identity.market.toLowerCase() !== l.market || state.identity.lpLock.toLowerCase() !== l.lpLock) throw Error('Vault discovery mismatch');
        if (state.vault.status === 'available') {
          pool.baseAssetsRaw = state.vault.data.baseAssetsRaw.toString(); pool.quoteAssetsRaw = state.vault.data.quoteAssetsRaw.toString(); pool.totalSharesRaw = state.vault.data.totalSharesRaw.toString(); pool.status = 'READY';
        }
        if (state.custody.status === 'available') { pool.protectedSharesRaw = state.custody.data.lockedSharesRaw.toString(); pool.infrastructureSharesRaw = state.custody.data.infrastructureSharesRaw.toString(); }
        const passTarget = Math.min(target, Math.max(l.graduationBlock - 1, this.store.cursor(stage, l.graduationBlock)) + this.maxBlocksPerPass);
        await this.scan(stage, passTarget, [vault], l.graduationBlock);
        pool.historyIndexedBlock = this.store.cursor(stage, l.graduationBlock); pool.historyComplete = pool.historyIndexedBlock >= target;
      } catch { /* A failed vault cannot manufacture an empty pool or complete history. */ }
      pools.push(pool);
    }
    return pools;
  }
  async sync() {
    if (this.syncing) return; this.syncing = true; this.error = null;
    try {
      if (await this.client.getChainId() !== 10143) throw Error('Wrong chain');
      this.head = Number(await this.client.getBlockNumber({ cacheTime: 0 })); const headTarget = this.head - this.confirmations;
      if (headTarget < START_BLOCK) throw Error('Before deployment');
      // Bound the pass by the root cursor. Within the pass, root and dynamic logs are both scanned up to `target`
      // before publication, and discovery reads + the header hash use the same block, so every published snapshot is
      // internally consistent at `target`. (The dynamic cursor is not used: with no launches it never advances.)
      const from = this.store.cursor('root', START_BLOCK);
      const target = Math.min(headTarget, Math.max(from, START_BLOCK) + this.maxBlocksPerPass);
      const passStart = Date.now(); this.progress.passStartedAt = new Date(passStart).toISOString(); this.progress.passTarget = target; this.progress.headTarget = headTarget; this.progress.catchingUp = target < headTarget;
      for (const stage of [...new Set(['root', 'dynamic', 'beneficiary', ...this.store.stages()])]) await this.reconcile(stage);
      await this.scan('root', target, [addresses.factory, addresses.coordinator]);
      const revision = this.store.get<number>('reorgRevision') ?? 0;
      // Pin before all financial reads, including at-head passes with no new logs.
      await this.header(target);
      const seeds = await this.discover(target);
      const dynamic = [...new Set(seeds.flatMap(s => [s.launch.token, s.launch.curve, ...(s.launch.market ? [s.launch.market] : [])]))] as Address[];
      if (dynamic.length) await this.scan('dynamic', target, dynamic, Math.min(...seeds.map(s => s.launch.createdBlock)));
      if (!this.backfillRunning && this.store.cursor('beneficiary', START_BLOCK) >= target - 800) await this.scan('beneficiary', target, [addresses.factory, addresses.feeEscrow, addresses.buybackVault, release.kuruEnvironment.marginAccount as Address]);
      const liquidityPools = await this.liquidity(seeds, target);
      const events = this.store.events().filter(e => e.block <= target);
      const assetTokens = [...new Set(events.filter(e => ['TokenCredited', 'TokenClaimed', 'Deposit', 'Withdrawal'].includes(e.name)).map(e => String(e.args.token).toLowerCase()))] as Address[];
      const assets: Record<string, IndexedAssetMetadata> = {};
      for (let i = 0; i < assetTokens.length; i += 8) for (const a of await Promise.all(assetTokens.slice(i, i + 8).map(token => this.asset(token, BigInt(target))))) assets[a.token] = a;
      const headHeader = await this.header(target, true); if (headHeader.hash !== (await this.header(target)).hash) throw Error('Snapshot reorg');
      const data = project(events, seeds, headHeader.timestamp, { assets, liquidityPools, custody: { [addresses.coordinator.toLowerCase()]: 'COORDINATOR', [addresses.feeEscrow.toLowerCase()]: 'FEE_ESCROW', [addresses.buybackVault.toLowerCase()]: 'BUYBACK_VAULT', [release.kuruEnvironment.marginAccount.toLowerCase()]: 'KURU_INFRASTRUCTURE' } });
      if ((this.store.get<number>('reorgRevision') ?? 0) !== revision) throw Error('REORG_DURING_SNAPSHOT');
      const snapshot: Snapshot = { ...data, indexedBlock: target, indexedBlockHash: headHeader.hash, indexedTimestamp: headHeader.timestamp, indexedAt: new Date().toISOString(), projectionVersion: PROJECTION_VERSION, reorgRevision: this.store.get<number>('reorgRevision') ?? 0, beneficiaryIndexedBlock: this.store.cursor('beneficiary', START_BLOCK) }; this.store.set('snapshot', snapshot);
      const ms = Date.now() - passStart, blocks = Math.max(0, target - from);
      Object.assign(this.progress, { passes: this.progress.passes + 1, lastSyncedAt: new Date().toISOString(), lastPassMs: ms, lastPassBlocks: blocks, blocksPerSecond: ms ? Math.round(blocks * 1000 / ms) : null, lastError: null, catchingUp: target < headTarget });
      console.log('Synced', target, '/', headTarget, 'launches', data.launches.length, 'trades', data.trades.length, `${blocks} blocks in ${ms}ms`, target < headTarget ? '(catching up)' : '');
      if (snapshot.beneficiaryIndexedBlock < target && !this.backfillRunning) void this.backfill(target);
    } catch (error) {
      this.error = 'RPC_OR_CHAIN_SYNC_FAILED';
      this.progress.lastError = safeErrorMessage(error);
      console.error('Indexer sync failed; last complete snapshot retained: RPC_OR_CHAIN_SYNC_FAILED', this.progress.lastError, this.pool ? JSON.stringify(this.pool.health().map(h => [h.endpoint, h.state, h.lastFailure])) : '');
    }
    finally { this.syncing = false; }
  }
  freshness() {
    const snapshot = this.store.get<Snapshot>('snapshot'); const indexedBlock = snapshot?.indexedBlock ?? START_BLOCK - 1;
    return { chainId: 10143 as const, indexedBlock, indexedBlockHash: snapshot?.indexedBlockHash, headBlock: this.head, confirmations: this.confirmations, lagBlocks: Math.max(0, this.head - indexedBlock), indexedAt: snapshot?.indexedAt ?? null, syncing: this.syncing, error: this.error, source: 'MONAD_EVENT_INDEXER' as const, projectionVersion: snapshot?.projectionVersion ?? PROJECTION_VERSION, reorgRevision: this.store.get<number>('reorgRevision') ?? 0, beneficiaryIndexedBlock: this.store.cursor('beneficiary', START_BLOCK) };
  }
}
