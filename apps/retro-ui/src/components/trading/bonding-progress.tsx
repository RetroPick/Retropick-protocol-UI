import { formatUnits } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { bondingProgressBps, readGraduationGoal } from '@retropick/launchpad-sdk/graduation';
import { publicClient } from '@/lib/live/public-client';
import type { DiscoveryRow } from '@/lib/view-models/discovery';
import './bonding-progress.css';
export function BondingProgress({ progressBps, goalRaw, decimals, symbol, graduated = false, loading = false }: { progressBps: number | null; goalRaw?: string | null; decimals: number; symbol: string; graduated?: boolean; loading?: boolean }) {
  const bps = graduated ? 10000 : progressBps === null ? null : Math.max(0, Math.min(10000, progressBps));
  const percent = bps === null ? null : formatUnits(BigInt(Math.trunc(bps)), 2);
  return <div className="rp-bonding" data-testid="bonding-progress"><div className="rp-bonding-label"><span>{graduated ? 'Bonding complete' : 'Bonding progress'}</span><strong>{percent === null ? '—' : `${percent}%`}</strong></div><div className="rp-bonding-track" role="progressbar" aria-label={`Bonding progress in ${symbol}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={bps === null ? undefined : bps / 100} aria-valuetext={percent === null ? 'Progress unavailable' : `${percent}% toward graduation`}><span style={{ width: `${bps === null ? 0 : bps / 100}%` }}/></div><small>Graduation goal · {goalRaw ? `${formatUnits(BigInt(goalRaw), decimals)} ${symbol}` : loading ? 'Loading committed goal…' : 'Unavailable'}</small></div>;
}
export function DiscoveryBondingProgress({ row }: { row: DiscoveryRow }) {
  const goal = useQuery({ queryKey: ['launchpad', 10143, 'graduation-goal', row.id], enabled: row.dataMode === 'live' && !!row.quote.address, queryFn: () => readGraduationGoal(publicClient, row.id as `0x${string}`, row.quote.address as `0x${string}`), staleTime: Infinity, retry: 1 });
  return <BondingProgress progressBps={row.dataMode === 'live' ? goal.data && row.quoteReserveRaw ? bondingProgressBps(BigInt(row.quoteReserveRaw), goal.data) : null : row.bondingProgressBps} goalRaw={goal.data?.toString()} decimals={row.quote.decimals} symbol={row.quote.symbol} graduated={row.lifecycle === 'GRADUATED'} loading={row.dataMode === 'live' && goal.isPending}/>;
}
