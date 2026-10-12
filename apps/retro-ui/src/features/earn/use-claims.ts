'use client';
// Shared earn-wallet state + claim/release execution for the Earn hub.
// One wallet-state query powers the hero, claim rows and the claim sheet (LiveEarn and LivePortfolio
// already share this query key, so all views stay in sync). Actions go through the existing SDK
// prepare functions only — no new contract calls, and "claim all" is a sequential per-asset batch.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Address } from 'viem';
import { publicClient } from '@/lib/live/public-client';
import { launchKeys } from '@/lib/live/queries';
import { useWallet } from '@/wallet/provider';
import { executePreparedWrite, type TxPhase } from '@/services/tx-pipeline';
import { fetchWalletState } from '@/services/wallet-state';
import { prepareFeeClaim, prepareFeeClaimToken, prepareBuybackRelease } from '@retropick/launchpad-sdk/prepare';
import { toast } from 'sonner';
import { exactAmount } from '@/lib/live/format';

export type Prepared = Parameters<typeof executePreparedWrite>[2];
export type RowPhase =
  | { kind: Exclude<TxPhase['kind'], 'failed'> | 'idle' }
  | { kind: 'failed'; reason: string };

export interface ClaimRow {
  key: string;
  kind: 'fee-native' | 'fee-token' | 'buyback-release';
  /** Primary asset label (symbol). */
  symbol: string;
  glyph: string;
  color: string;
  amountLabel: string;
  source: 'Creator fee credit' | 'Buyback releasable share';
  actionLabel: 'Claim' | 'Release';
  ready: boolean;
  token: Address | null;
}

const IDLE: RowPhase = { kind: 'idle' };

export function useEarnWallet() {
  const wallet = useWallet();
  const account = wallet.account;
  const state = useQuery({
    queryKey: launchKeys.wallet(account ?? 'disconnected', 'state'),
    enabled: !!account,
    queryFn: ({ signal }) => fetchWalletState(account!, signal),
    refetchInterval: 10_000,
    structuralSharing: false,
  });
  const [rowPhase, setRowPhase] = useState<Record<string, RowPhase>>({});
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const batchKey = useRef<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => { batchKey.current = null; setBatch(null); setRowPhase({}); return () => { for (const timer of Object.values(timers.current)) clearTimeout(timer); }; }, [account, wallet.chainId]);

  const setPhase = useCallback((key: string, phase: RowPhase) => {
    setRowPhase((current) => ({ ...current, [key]: phase }));
    if (timers.current[key]) clearTimeout(timers.current[key]);
    if (phase.kind === 'success' || phase.kind === 'failed') {
      timers.current[key] = setTimeout(() => {
        setRowPhase((current) => ({ ...current, [key]: IDLE }));
        delete timers.current[key];
      }, 2200);
    }
  }, []);

  const runRow = useCallback(async (key: string, prepare: () => Promise<Prepared>): Promise<boolean> => {
    if (!wallet.wallet || !account) return false;
    setPhase(key, { kind: 'preparing' });
    try {
      const prepared = await prepare();
      const result = await executePreparedWrite(publicClient, wallet.wallet, prepared, {
        onPhase: (phase) => setPhase(key, phase.kind === 'failed' ? { kind: 'failed', reason: phase.reason } : { kind: phase.kind }),
      });
      if (result.kind === 'failed') {
        setPhase(key, { kind: 'failed', reason: result.reason });
        toast.error(`${prepared.label} failed`, { description: result.reason });
        return false;
      }
      setPhase(key, { kind: 'success' });
      toast.success(`${prepared.label} confirmed`, { description: result.hash });
      void state.refetch();
      return true;
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : 'Transaction failed.';
      setPhase(key, { kind: 'failed', reason });
      toast.error('Transaction failed', { description: reason });
      return false;
    }
  }, [wallet.wallet, account, setPhase, state]);

  const claimRows = useMemo<ClaimRow[]>(() => {
    const data = state.data;
    if (!data) return [];
    const rows: ClaimRow[] = [];
    if (data.nativeCreditRaw > 0n) rows.push({
      key: 'fee:native', kind: 'fee-native', symbol: 'MON', glyph: 'M', color: '#836ef9',
      amountLabel: exactAmount(data.nativeCreditRaw, 18, 6), source: 'Creator fee credit', actionLabel: 'Claim', ready: true, token: null,
    });
    for (const asset of data.assets) {
      if (asset.creditRaw <= 0n) continue;
      rows.push({
        key: `fee:${asset.token.toLowerCase()}`, kind: 'fee-token',
        symbol: asset.symbol ?? 'TOKEN', glyph: (asset.symbol?.[0] ?? 'T').toUpperCase(), color: '#5feddf',
        amountLabel: asset.decimals === null ? `${asset.creditRaw} atomic units` : exactAmount(asset.creditRaw, asset.decimals, 6),
        source: 'Creator fee credit', actionLabel: 'Claim', ready: true, token: asset.token as Address,
      });
    }
    return rows;
  }, [state.data]);

  const buybackRows = useMemo<ClaimRow[]>(() => {
    const data = state.data;
    if (!data) return [];
    return data.buybacks.filter((row) => row.beneficiaryRaw > 0n).map((row) => ({
      key: `buyback:${row.token.toLowerCase()}`, kind: 'buyback-release' as const,
      symbol: row.symbol ?? 'TOKEN', glyph: (row.symbol?.[0] ?? 'B').toUpperCase(), color: '#b09cfa',
      amountLabel: row.decimals === null ? `${row.beneficiaryRaw} atomic units` : exactAmount(row.beneficiaryRaw, row.decimals, 6),
      source: 'Buyback releasable share' as const, actionLabel: 'Release' as const, ready: true, token: row.token as Address,
    }));
  }, [state.data]);

  const claimAll = useCallback(async () => {
    const rows = claimRows.filter((row) => row.ready);
    if (!rows.length || !wallet.wallet || !account || batchKey.current) return;
    const batchId = `${account.toLowerCase()}:${Date.now()}`;
    batchKey.current = batchId;
    setBatch({ done: 0, total: rows.length });
    let confirmed = 0;
    for (const [index, row] of rows.entries()) {
      if (batchKey.current !== batchId) break;
      setBatch({ done: index, total: rows.length });
      const prepare = row.kind === 'fee-native'
        ? () => prepareFeeClaim(publicClient, account)
        : () => prepareFeeClaimToken(publicClient, account, row.token!);
      if (await runRow(row.key, prepare)) confirmed += 1;
      else break;
    }
    if (batchKey.current === batchId) { setBatch(null); batchKey.current = null; }
    if (confirmed === rows.length) toast.success(`Claim all complete — ${confirmed} claim${confirmed === 1 ? '' : 's'} confirmed`);
    else toast.warning(`Claimed ${confirmed} of ${rows.length}`, { description: 'Some claims did not confirm. Retry them individually from the list.' });
  }, [claimRows, wallet.wallet, account, runRow]);

  const releaseBuyback = useCallback((row: ClaimRow) => runRow(row.key, () => prepareBuybackRelease(publicClient, row.token!, account!)), [runRow]);

  const claimRow = useCallback((row: ClaimRow) => runRow(row.key, () => row.kind === 'fee-native'
    ? prepareFeeClaim(publicClient, account!)
    : prepareFeeClaimToken(publicClient, account!, row.token!)), [runRow]);

  const phaseOf = useCallback((key: string) => rowPhase[key] ?? IDLE, [rowPhase]);
  const claimableMon = state.data ? state.data.nativeCreditRaw : 0n;
  const tokenCreditCount = claimRows.filter((row) => row.kind === 'fee-token').length;
  const claims = state.data?.claims ?? [];

  return { wallet, account, state, claimRows, buybackRows, claimableMon, tokenCreditCount, claims, phaseOf, claimRow, releaseBuyback, claimAll, batch };
}
