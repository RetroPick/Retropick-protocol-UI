import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { describeIndexerError, fetchLaunches, isStale, type QueryParams } from '@/lib/live/indexer-client';
import { indexedLaunchToInstrument } from '@/lib/live/live-launch-adapter';
import { INDEXER_URL } from '@/lib/live/env';
import { launchKeys } from '@/lib/live/queries';
import { markStage } from '@/lib/live/performance';

/**
 * Live launch feed. `status`:
 *  - 'loading'      first fetch in flight
 *  - 'ready'        query succeeded (rows may genuinely be empty)
 *  - 'stale'        data present but indexer lagging/erroring, or the latest refresh failed
 *  - 'unavailable'  no data and the query failed — NEVER rendered as an empty result
 */
export function useLiveLaunches(enabled: boolean, params: QueryParams = {}) {
  const query = useQuery({ queryKey: launchKeys.feed(params), enabled: enabled && !!INDEXER_URL, queryFn: ({ signal }) => fetchLaunches(INDEXER_URL!, params, signal), staleTime: 3000, refetchInterval: 10000 });
  const launches = query.data?.data ?? [];
  const freshness = query.data?.freshness ?? null;
  useEffect(() => { if (query.data) markStage('discovery:table'); }, [query.data]);
  const status: 'loading' | 'ready' | 'stale' | 'unavailable' = query.data
    ? ((freshness && isStale(freshness)) || query.isError ? 'stale' : 'ready')
    : query.isError ? 'unavailable' : 'loading';
  const failure = query.isError ? describeIndexerError(query.error) : null;
  return { launches, instruments: launches.map(indexedLaunchToInstrument), freshness, status, failure, error: query.error instanceof Error ? query.error.message : null, nextCursor: query.data?.nextCursor ?? null, reload: () => { void query.refetch(); } };
}
