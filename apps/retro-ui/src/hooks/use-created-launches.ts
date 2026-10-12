import { useInfiniteQuery } from '@tanstack/react-query';
import type { Address } from 'viem';
import { INDEXER_URL } from '@/lib/live/env';
import { launchKeys } from '@/lib/live/queries';
import { fetchLaunches } from '@/lib/live/indexer-client';

/** Creator discovery is an indexer hint; recipient rights are verified onchain separately. */
export function useCreatedLaunches(account: Address | null) {
  return useInfiniteQuery({
    queryKey: [...launchKeys.all, 'created', account?.toLowerCase() ?? ''],
    enabled: !!INDEXER_URL && !!account,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ signal, pageParam }) => fetchLaunches(INDEXER_URL!, { creator: account!, sort: 'new', limit: 25, cursor: pageParam }, signal),
    getNextPageParam: page => page.nextCursor ?? undefined,
    staleTime: 10000,
    retry: false,
  });
}
