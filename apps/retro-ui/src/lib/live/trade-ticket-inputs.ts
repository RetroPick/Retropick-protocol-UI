import type { LiveLaunch } from '@retropick/launchpad-sdk/model';
import type { KuruState } from '@retropick/launchpad-sdk/kuru';

export type TicketLaunch = Pick<LiveLaunch, 'token' | 'symbol' | 'ledger' | 'packet' | 'receipt' | 'remaining' | 'fee' | 'tax' | 'balance' | 'quoteBalance'> & {
  reserveQuoteRaw: bigint;
  reserveTokenRaw: bigint;
};
export type TicketKuru = Pick<KuruState, 'quoteBalance' | 'baseBalance'>;

// React 19.2's development Performance Tracks stringify primitive arrays in
// component props. Supply only the ticket's inputs, with exact named reserves;
// preserve the SDK's ABI tuples for reads and transaction preparation.
export function ticketLaunch(launch: LiveLaunch | null): TicketLaunch | null {
  if (!launch) return null;
  const { token, symbol, ledger, packet, receipt, remaining, fee, tax, balance, quoteBalance } = launch;
  return { token, symbol, ledger, packet, receipt, remaining, fee, tax, balance, quoteBalance,
    reserveQuoteRaw: launch.reserves[0], reserveTokenRaw: launch.reserves[1] };
}
export function ticketKuru(kuru: KuruState | null): TicketKuru | null {
  return kuru ? { quoteBalance: kuru.quoteBalance, baseBalance: kuru.baseBalance } : null;
}
