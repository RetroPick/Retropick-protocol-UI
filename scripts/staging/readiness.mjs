/** Readiness requires both the authoritative projection marker and a usable list. */
export async function stagingReady(origin, fetcher = fetch) {
  const responses = await Promise.all(['/health', '/v1/launches?limit=1'].map(path => fetcher(origin + path, { cache: 'no-store', signal: AbortSignal.timeout(10000) })));
  if (responses.some(response => !response.ok)) return false;
  const [health, launches] = await Promise.all(responses.map(response => response.json()));
  return health.ready === true && health.freshness?.chainId === 10143 && health.freshness?.error == null && health.freshness?.source === 'MONAD_EVENT_INDEXER' && Number.isFinite(health.freshness?.lagBlocks) && health.freshness.lagBlocks <= 64 && health.projection?.published === 2 && health.projection?.expected === 2 && Array.isArray(launches.data) && launches.freshness?.chainId === 10143 && launches.freshness?.source === 'MONAD_EVENT_INDEXER';
}

export function reconciliationDelay(attempt, authorizationBlocked = false) {
  return authorizationBlocked ? 300000 : Math.min(60000, 3000 * 2 ** Math.min(attempt, 5));
}
