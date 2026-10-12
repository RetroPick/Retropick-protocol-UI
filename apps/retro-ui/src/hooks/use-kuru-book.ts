// Live aggregated orderbook depth for a graduated Kuru market.
// Reads the on-chain L2 book via the SDK (same publicClient failover path as every other
// live read) and maps it to the terminal's TerminalDepth view model. Demo mode never
// mounts this hook — the fixture supplies its own simulated book.
import { useQuery } from '@tanstack/react-query';
import { zeroAddress, type Address } from 'viem';
import { readKuruBook } from '@retropick/launchpad-sdk/kuru';
import { publicClient } from '@/lib/live/public-client';
import { launchKeys } from '@/lib/live/queries';
import { buildDepthLadder, type TerminalDepth } from '@/lib/view-models/token-terminal';

export function useKuruBook(token: string | null, market: string | null, enabled: boolean): TerminalDepth | null {
  const usable = enabled && !!market && market !== zeroAddress && /^0x[\da-fA-F]{40}$/.test(market);
  const query = useQuery({
    queryKey: launchKeys.resource((token ?? '').toLowerCase(), 'kuru-book', { market: market?.toLowerCase() ?? '' }),
    enabled: usable,
    queryFn: () => readKuruBook(publicClient, market as Address),
    staleTime: 5000,
    refetchInterval: 10000,
    structuralSharing: false,
  });
  if (!usable) return null;
  if (query.isError && !query.data) return { status: 'error', ladder: null, block: null, observedAt: null };
  if (!query.data) return { status: 'loading', ladder: null, block: null, observedAt: null };
  return {
    status: query.isError || Date.now() - query.dataUpdatedAt >= 20000 ? 'stale' : 'ready',
    ladder: buildDepthLadder(query.data),
    block: query.data.block.toString(),
    observedAt: query.dataUpdatedAt,
  };
}
