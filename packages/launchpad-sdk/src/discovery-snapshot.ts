import { quoteAssetByAddress, type AssetCategory } from './quote-assets.ts';
import type { IndexEnvelope, IndexFreshness, IndexedLaunch } from './read-model.ts';
export function snapshotIdentity(f: IndexFreshness): string { return [f.chainId, f.indexedBlock, f.indexedBlockHash ?? '', f.reorgRevision ?? 0, f.projectionVersion ?? 0].join(':'); }
export class IncompleteDiscoveryError extends Error { constructor() { super('A complete, consistent indexed launch snapshot is unavailable. Retry to load accurate counts.'); } }
/** Never publish a partial page set. A changing index snapshot is retried once. */
export async function readDiscoverySnapshot(fetchPage: (cursor?: string) => Promise<IndexEnvelope<IndexedLaunch[]>>, maxPages = 100): Promise<IndexEnvelope<IndexedLaunch[]>> {
  for (let attempt = 0; attempt < 2; attempt++) {
    let cursor: string | undefined; let first: IndexEnvelope<IndexedLaunch[]> | undefined;
    const all: IndexedLaunch[] = []; const tokens = new Set<string>(); const cursors = new Set<string>();
    try {
      for (let page = 0; page < maxPages; page++) {
        const result = await fetchPage(cursor);
        if (result.freshness.chainId !== 10143 || result.freshness.source !== 'MONAD_EVENT_INDEXER' || !Array.isArray(result.data)) throw new IncompleteDiscoveryError();
        first ??= result;
        if (snapshotIdentity(result.freshness) !== snapshotIdentity(first.freshness)) throw new IncompleteDiscoveryError();
        for (const launch of result.data) { const id = launch.token.toLowerCase(); if (tokens.has(id)) throw new IncompleteDiscoveryError(); tokens.add(id); all.push(launch); }
        if (!result.nextCursor) return { ...first, data: all, nextCursor: null };
        if (cursors.has(result.nextCursor)) throw new IncompleteDiscoveryError();
        cursors.add(result.nextCursor); cursor = result.nextCursor;
      }
      throw new IncompleteDiscoveryError();
    } catch (error) {
      if (attempt === 0 && (error instanceof IncompleteDiscoveryError || (error as { status?: number })?.status === 409)) continue;
      throw error;
    }
  }
  throw new IncompleteDiscoveryError();
}
export function launchQuoteCategory(launch: IndexedLaunch): AssetCategory { return quoteAssetByAddress(10143, launch.quoteAsset)?.category ?? 'CUSTOM'; }
export function filterIndexedLaunches(launches: readonly IndexedLaunch[], options: { category?: string; quote?: string; q?: string; filter?: string }): IndexedLaunch[] {
  const q = options.q?.trim().toLowerCase();
  return launches.filter(l => (!options.category || launchQuoteCategory(l) === options.category) && (!options.quote || l.quoteAsset.toLowerCase() === options.quote.toLowerCase()) && (!q || [l.name, l.symbol, l.token, l.creator, l.quoteSymbol].some(s => s.toLowerCase().includes(q))) && (options.filter === 'active' ? l.phase === 'ACTIVE' : options.filter === 'near-graduation' ? ['ACTIVE', 'GRADUATION_READY'].includes(l.phase) && l.bondingProgressBps >= 8000 : options.filter === 'graduated' ? l.phase === 'GRADUATED' : true)).sort((a,b) => {
    if (options.filter !== 'new') {
      const denomination = a.quoteAsset.toLowerCase().localeCompare(b.quoteAsset.toLowerCase()); if (denomination) return denomination;
      const av = BigInt(a.marketCapRaw ?? '-1'), bv = BigInt(b.marketCapRaw ?? '-1'); if (av !== bv) return av > bv ? -1 : 1;
    }
    return b.createdBlock - a.createdBlock || a.token.localeCompare(b.token);
  });
}
