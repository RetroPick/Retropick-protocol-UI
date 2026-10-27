import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { IndexedLiquidityPool, IndexedLPPosition, IndexFreshness } from '@retropick/launchpad-sdk/read-model';
import type { Address } from 'viem';
import {
  CardStackIcon,
  MagnifyingGlassIcon,
  MagicWandIcon,
  InfoCircledIcon,
} from '@radix-ui/react-icons';
import { CheckCircle2 } from 'lucide-react';
import Link from '@/components/product/safe-link';
import { usePathname, useSearchParams, navigate } from '@/lib/next-compat';
import { DATA_MODE, INDEXER_URL } from '@/lib/live/env';
import { launchKeys } from '@/lib/live/queries';
import { isStale } from '@/lib/live/indexer-client';
import { useWallet } from '@/wallet/provider';
import { useKuruLiquidity } from '@/hooks/use-kuru-liquidity';
import { AddressChip, DataTable, DemoBadge, EmptyState, ErrorState, FreshnessIndicator } from '@/components/trading/primitives';
import { formatRaw } from '@/lib/view-models/token-terminal';
import { demoLiquidityView, liquidityView } from '@/lib/view-models/liquidity';
import { LiveMarketLiquidity, MarketLiquidity, StateValue } from './market-liquidity';
import { demoPool, demoPoolEvents, fetchLPPositions, fetchPool, fetchPoolEvents, fetchPools } from './liquidity-data';
import { MarketMaking } from './market-making';
import {
  KURU_POOLS,
  KURU_VAULTS,
  INITIAL_USER_POSITIONS,
  KuruPoolMarket,
  KuruVault,
  KuruPosition,
  formatUsd,
} from './kuru-data';
import { AddLiquidityModal, VaultDetailModal } from './liquidity-modals';
import './liquidity.css';

const live = DATA_MODE === 'live';
const addressValid = (token: string) => /^0x[\da-f]{40}$/i.test(token);

export function LiquidityFreshness({ freshness }: { freshness?: IndexFreshness }) {
  return <FreshnessIndicator freshness={freshness ? { indexedBlock: String(freshness.indexedBlock), lagBlocks: freshness.lagBlocks, stale: isStale(freshness) } : null}/>;
}

function PageLinks({ cursor, next, onCursor }: { cursor?: string; next?: string | null; onCursor: (cursor?: string) => void }) {
  return <div className="rp-pager"><span className="rp-muted">{next ? 'More results available; this page is not the complete list.' : 'End of list'}</span>{cursor && <button className="rp-btn rp-btn-ghost rp-btn-sm" onClick={() => onCursor(undefined)}>First page</button>}{next && <button className="rp-btn rp-btn-ghost rp-btn-sm" onClick={() => onCursor(next)}>Next page</button>}</div>;
}

export default function Liquidity({ token, maker = false }: { token?: string; maker?: boolean }) {
  const pathname = usePathname(), params = useSearchParams();
  const positionsTab = !maker && !token && params.get('tab') === 'positions';

  return (
    <div className="rp-liquidity" data-testid="liquidity-page" data-data-mode={live ? 'live' : 'demo'}>
      <header className="rp-liquidity-top-header">
        <div>
          <h1 className="flex items-center gap-2.5">
            <CardStackIcon className="w-6 h-6 text-[#836ef9]" aria-hidden />
            <span>Liquidity</span>
          </h1>
          <p className="rp-note">Explore automated vaults, concentrated liquidity pools and market making on Monad Testnet.</p>
        </div>
        {!live && <DemoBadge />}
      </header>

      <nav className="rp-liquidity-tabs" aria-label="Liquidity sections">
        <Link href="/liquidity" aria-current={!positionsTab && !maker && !token ? 'page' : undefined}>
          Pools
        </Link>
        <Link href="/liquidity?tab=positions" aria-current={positionsTab ? 'page' : undefined}>
          My Positions
        </Link>
        <Link href="/liquidity/market-making" aria-current={pathname.includes('/market-making') || maker ? 'page' : undefined}>
          Market Making
        </Link>
      </nav>

      {maker ? (
        <MarketMaking />
      ) : token ? (
        <PoolDetails key={token} token={token} />
      ) : (
        <KuruLiquidityOverview initialTab={positionsTab ? 'positions' : 'explore'} />
      )}
    </div>
  );
}

function KuruLiquidityOverview({ initialTab = 'explore' }: { initialTab?: 'explore' | 'positions' }) {
  const [activeTab, setActiveTab] = useState<'explore' | 'positions'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [positions, setPositions] = useState<KuruPosition[]>(INITIAL_USER_POSITIONS);

  const [selectedPoolForAdd, setSelectedPoolForAdd] = useState<KuruPoolMarket | null>(null);
  const [selectedVault, setSelectedVault] = useState<KuruVault | null>(null);

  // Live indexer query if live mode is active
  const q = useQuery({
    queryKey: launchKeys.resource('all', 'liquidity-pools'),
    enabled: live && !!INDEXER_URL,
    queryFn: ({ signal }) => fetchPools(INDEXER_URL!, undefined, signal),
    refetchInterval: 15_000,
  });

  const filteredPools = KURU_POOLS.filter(
    (p) =>
      p.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.baseToken.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePositionCreated = (newPos: KuruPosition) => {
    setPositions((prev) => [newPos, ...prev]);
    setActiveTab('positions');
  };

  const handleWithdraw = (posId: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== posId));
  };

  return (
    <div className="rp-kuru-liquidity">
      {/* SECTION 1: Explore Vaults */}
      <section className="rp-vaults-section">
        <h2 className="rp-section-title">Explore vaults</h2>
        <div className="rp-vaults-grid">
          {KURU_VAULTS.map((vault) => (
            <div
              key={vault.id}
              onClick={() => setSelectedVault(vault)}
              className="rp-vault-card group"
              role="button"
              tabIndex={0}
            >
              {/* Header: Pair + APR */}
              <div className="rp-vault-card-header">
                <div className="rp-pair-identity">
                  <div className="rp-pair-icons">
                    <span
                      className="rp-token-dot"
                      style={{ backgroundColor: vault.baseToken.iconBg }}
                    >
                      {vault.baseToken.iconText || vault.baseToken.symbol[0]}
                    </span>
                    <span
                      className="rp-token-dot"
                      style={{ backgroundColor: vault.quoteToken.iconBg }}
                    >
                      {vault.quoteToken.iconText || vault.quoteToken.symbol[0]}
                    </span>
                  </div>
                  <span className="rp-pair-symbol">{vault.symbol}</span>
                </div>

                <div className="rp-apr-badge-wrap">
                  <span className="rp-apr-text">APR {vault.apr.toFixed(1)}%</span>
                  {vault.isBoosted ? (
                    <span className="rp-apr-sparkle-pill" title="Boosted Vault">
                      <MagicWandIcon className="w-3.5 h-3.5 text-[#eab308]" />
                    </span>
                  ) : (
                    <span className="rp-apr-info-pill" title="Standard Vault">
                      <InfoCircledIcon className="w-3.5 h-3.5 text-[var(--text-dim)]" />
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom stats: TVL & 24h Vol */}
              <div className="rp-vault-card-footer">
                <div className="rp-metric-item">
                  <span className="rp-metric-label">TVL</span>
                  <span className="rp-metric-value">{formatUsd(vault.tvl)}</span>
                </div>
                <div className="rp-metric-item">
                  <span className="rp-metric-label">24h Vol.</span>
                  <span className="rp-metric-value">{formatUsd(vault.volume24h)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: Explore pools / Your positions */}
      <section className="rp-pools-section">
        <div className="rp-pools-header-row">
          <div className="rp-subtabs-wrap">
            <button
              onClick={() => setActiveTab('explore')}
              className={`rp-subtab-btn ${activeTab === 'explore' ? 'active' : ''}`}
            >
              Explore pools
              {activeTab === 'explore' && <span className="rp-subtab-indicator" />}
            </button>
            <button
              onClick={() => setActiveTab('positions')}
              className={`rp-subtab-btn ${activeTab === 'positions' ? 'active' : ''}`}
            >
              Your positions
              {positions.length > 0 && (
                <span className="rp-positions-counter">{positions.length}</span>
              )}
              {activeTab === 'positions' && <span className="rp-subtab-indicator" />}
            </button>
          </div>

          {activeTab === 'explore' && (
            <div className="rp-search-wrap">
              <MagnifyingGlassIcon className="rp-search-icon w-3.5 h-3.5 text-[var(--text-dim)]" />
              <input
                type="text"
                placeholder="Search pools"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rp-search-input"
              />
            </div>
          )}
        </div>

        {/* Tab 1: Explore pools table */}
        {activeTab === 'explore' && (
          <div className="rp-pools-table-card">
            <div className="rp-table-responsive">
              <table className="rp-kuru-table">
                <thead>
                  <tr>
                    <th className="th-market">Market</th>
                    <th className="th-num">TVL</th>
                    <th className="th-num">Volume (24h)</th>
                    <th className="th-num">Fees (24h)</th>
                    <th className="th-num">Pool APR</th>
                    <th className="th-action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPools.map((pool) => (
                    <tr key={pool.id} className="rp-pool-row">
                      {/* Market */}
                      <td className="td-market">
                        <div className="rp-market-cell">
                          <div className="rp-pair-icons">
                            <span
                              className="rp-token-dot"
                              style={{ backgroundColor: pool.baseToken.iconBg }}
                            >
                              {pool.baseToken.iconText || pool.baseToken.symbol[0]}
                            </span>
                            <span
                              className="rp-token-dot"
                              style={{ backgroundColor: pool.quoteToken.iconBg }}
                            >
                              {pool.quoteToken.iconText || pool.quoteToken.symbol[0]}
                            </span>
                          </div>
                          <div>
                            <div className="rp-market-name-wrap">
                              <span className="rp-market-name">{pool.symbol}</span>
                              {pool.verified && (
                                <CheckCircle2 size={13} className="text-pos rp-verified-icon" />
                              )}
                            </div>
                            <span className="rp-market-id">{pool.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* TVL */}
                      <td className="td-num">
                        <span className="font-mono">{formatUsd(pool.tvl)}</span>
                      </td>

                      {/* 24h Vol */}
                      <td className="td-num">
                        <span className="font-mono">{formatUsd(pool.volume24h)}</span>
                      </td>

                      {/* 24h Fees */}
                      <td className="td-num">
                        <span className="font-mono">{formatUsd(pool.fees24h)}</span>
                      </td>

                      {/* Pool APR */}
                      <td className="td-num">
                        <span className="font-mono">
                          {pool.poolApr > 0 ? `${pool.poolApr.toFixed(1)}%` : '0%'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="td-action">
                        <div className="rp-row-actions">
                          {pool.id === '#00101' ? (
                            <>
                              <Link
                                href={`/liquidity/pools/demo-graduated`}
                                className="rp-action-link"
                              >
                                View
                              </Link>
                              <Link
                                href={`/launchpad/token/demo-graduated`}
                                className="rp-action-link"
                              >
                                Trade
                              </Link>
                              <button
                                className="rp-btn-add-liquidity"
                                onClick={() => setSelectedPoolForAdd(pool)}
                              >
                                Add liquidity
                              </button>
                            </>
                          ) : (
                            <button
                              className="rp-btn-add-liquidity"
                              onClick={() => setSelectedPoolForAdd(pool)}
                            >
                              Add liquidity
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredPools.length === 0 && (
              <div className="rp-empty-pools">
                <p>No pools matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Your positions */}
        {activeTab === 'positions' && (
          <div className="rp-positions-container">
            {positions.length === 0 ? (
              <div className="rp-positions-empty">
                <p className="rp-empty-title">No Active LP Positions</p>
                <p className="rp-note">
                  You do not have any open liquidity positions on Monad Testnet yet.
                </p>
                <button
                  className="rp-btn rp-btn-primary"
                  onClick={() => setActiveTab('explore')}
                >
                  Explore Pools to Deposit
                </button>
              </div>
            ) : (
              <div className="rp-positions-list">
                {positions.map((pos) => (
                  <div key={pos.id} className="rp-position-card">
                    <div className="rp-pos-header">
                      <div className="rp-pos-title-wrap">
                        <h3>{pos.marketSymbol}</h3>
                        <span className="rp-pos-type-tag">
                          {pos.type === 'vault' ? 'Automated Vault' : 'CLOB Liquidity'}
                        </span>
                        <span className="rp-pos-status-badge in-range">
                          <span className="dot" /> In Range
                        </span>
                      </div>
                      <div className="rp-pos-actions">
                        <button
                          className="rp-btn-withdraw"
                          onClick={() => handleWithdraw(pos.id)}
                        >
                          Withdraw
                        </button>
                      </div>
                    </div>

                    <div className="rp-pos-stats-grid">
                      <div>
                        <span className="rp-dim">Total Value</span>
                        <strong className="text-pos">${formatUsd(pos.totalValueUsd)}</strong>
                      </div>
                      <div>
                        <span className="rp-dim">Earned Fees</span>
                        <strong className="text-accent">${formatUsd(pos.earnedFeesUsd)}</strong>
                      </div>
                      <div>
                        <span className="rp-dim">Deposited Assets</span>
                        <span className="font-mono">
                          {pos.baseDeposited} {pos.baseTokenSymbol} + {pos.quoteDeposited}{' '}
                          {pos.quoteTokenSymbol}
                        </span>
                      </div>
                      {pos.minPrice && pos.maxPrice && (
                        <div>
                          <span className="rp-dim">Price Range</span>
                          <span className="font-mono">
                            ${pos.minPrice.toFixed(2)} - ${pos.maxPrice.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Modals */}
      {selectedPoolForAdd && (
        <AddLiquidityModal
          pool={selectedPoolForAdd}
          isOpen={!!selectedPoolForAdd}
          onClose={() => setSelectedPoolForAdd(null)}
          onSuccess={handlePositionCreated}
        />
      )}

      {selectedVault && (
        <VaultDetailModal
          vault={selectedVault}
          isOpen={!!selectedVault}
          onClose={() => setSelectedVault(null)}
          onSuccess={handlePositionCreated}
        />
      )}
    </div>
  );
}

function PoolDetails({ token }: { token: string }) {
  const params = useSearchParams();
  const valid = live ? addressValid(token) : token === demoPool.token;
  const q = useQuery({ queryKey: launchKeys.resource(token, 'liquidity-pool'), enabled: live && valid && !!INDEXER_URL, queryFn: ({ signal }) => fetchPool(INDEXER_URL!, token, signal), refetchInterval: 15_000 });
  if (!valid) return <ErrorState title="Invalid pool" text={live ? 'A pool route must identify a RetroPick token address.' : 'This pool is not part of the demo fixture.'}/>;
  const pool = live ? q.data?.data : demoPool;
  return <><Link href="/liquidity" className="rp-back">← All pools</Link>
    {live && q.isError && <ErrorState title="Indexed pool details unavailable" text={q.error.message} onRetry={() => void q.refetch()}/>}
    {live ? <LiveMarketLiquidity token={token} baseSymbol={pool?.baseSymbol ?? 'BASE'} quoteSymbol={pool?.quoteSymbol ?? 'QUOTE'}/> : <MarketLiquidity view={demoLiquidityView(token, params.get('scenario') ?? '')} baseSymbol={demoPool.baseSymbol} quoteSymbol={demoPool.quoteSymbol}/>}
    <p className="rp-note">Graduation LP shares are permanently protected. This page provides read-only LP information. Public LP deposits, minting and withdrawals are not enabled.</p>
    <PoolHistory token={token} pool={pool}/>
  </>;
}

function PoolHistory({ token, pool }: { token: string; pool?: IndexedLiquidityPool }) {
  const [cursor, setCursor] = useState<string>();
  const q = useQuery({ queryKey: launchKeys.resource(token, 'liquidity-events', { cursor }), enabled: live && !!INDEXER_URL, queryFn: ({ signal }) => fetchPoolEvents(INDEXER_URL!, token, cursor, signal), refetchInterval: cursor ? false : 15_000 });
  const rows = live ? q.data?.data ?? [] : demoPoolEvents;
  return <section className="rp-liquidity-card" aria-label="Vault history"><div className="rp-liquidity-header"><h2>Vault history</h2>{live && <LiquidityFreshness freshness={q.data?.freshness}/>}</div>
    {pool && !pool.historyComplete && <p className="rp-note" role="status">Vault history backfill is pending. An empty page cannot establish a zero position.</p>}
    {live && q.isError ? <ErrorState title="Vault history unavailable" text="The indexer may still be backfilling this vault. Current chain liquidity is read independently." onRetry={() => void q.refetch()}/> : <DataTable caption="Vault deposit withdrawal and share transfer history" rows={rows} rowKey={row => row.id} empty={<EmptyState title={live && q.isPending ? 'Loading vault history…' : 'No vault events on this page'}/>} columns={[
      { key: 'kind', header: 'Event', cell: row => row.kind.toLowerCase() },
      { key: 'shares', header: 'Shares (atomic units)', align: 'right', cell: row => row.sharesRaw },
      { key: 'base', header: 'Base assets', align: 'right', cell: row => row.baseRaw !== undefined && pool ? `${formatRaw(row.baseRaw, pool.baseDecimals)} ${pool.baseSymbol}` : '—' },
      { key: 'quote', header: 'Quote assets', align: 'right', cell: row => row.quoteRaw !== undefined && pool ? `${formatRaw(row.quoteRaw, pool.quoteDecimals)} ${pool.quoteSymbol}` : '—' },
      { key: 'receipt', header: 'Receipt', cell: row => <AddressChip value={row.transactionHash} kind="tx" label="vault event transaction"/> },
    ]}/>}
    {live && !q.isError && q.data && <PageLinks cursor={cursor} next={q.data.nextCursor} onCursor={setCursor}/>}
  </section>;
}
