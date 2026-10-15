import { useQuery } from '@tanstack/react-query';
import type { Address } from 'viem';
import { readKuruLiquidity } from '@retropick/launchpad-sdk/liquidity';
import { publicClient } from '@/lib/live/public-client';
import { launchKeys } from '@/lib/live/queries';

/** One qualified, block-pinned snapshot. Errors never become zero balances. */
export function useKuruLiquidity(token: string, account?: Address | null, enabled = true) {
  return useQuery({
    queryKey: launchKeys.resource(token, 'qualified-liquidity', { account: account?.toLowerCase() ?? 'public' }),
    enabled: enabled && /^0x[\da-f]{40}$/i.test(token),
    queryFn: () => readKuruLiquidity(publicClient, token as Address, { account: account ?? undefined, includeBook: true }),
    refetchInterval: 10_000,
    staleTime: 5_000,
    structuralSharing: false,
  });
}
