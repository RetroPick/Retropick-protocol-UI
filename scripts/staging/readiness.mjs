/** Readiness requires both the authoritative projection marker and a usable list. */
export function freshIndexer(value, now = Date.now()) {
  const age = now - Date.parse(value?.indexedAt ?? '');
  return value?.chainId === 10143 && value.error == null && value.source === 'MONAD_EVENT_INDEXER' && Number.isSafeInteger(value.indexedBlock) && value.indexedBlock > 0 && Number.isSafeInteger(value.headBlock) && value.headBlock >= value.indexedBlock && value.lagBlocks === value.headBlock - value.indexedBlock && value.lagBlocks <= 64 && age >= -30000 && age <= 120000;
}
export async function stagingReady(origin, fetcher = fetch) {
  const responses = await Promise.all(['/health', '/v1/launches?limit=1'].map(path => fetcher(origin + path, { cache: 'no-store', signal: AbortSignal.timeout(10000) })));
  if (responses.some(response => !response.ok)) return false;
  const [health, launches] = await Promise.all(responses.map(response => response.json()));
  return health.ready === true && freshIndexer(health.freshness) && health.projection?.published === 2 && health.projection?.expected === 2 && Array.isArray(launches.data) && freshIndexer(launches.freshness);
}

export function reconciliationDelay(attempt, authorizationBlocked = false) {
  return authorizationBlocked ? 300000 : Math.min(60000, 3000 * 2 ** Math.min(attempt, 5));
}
