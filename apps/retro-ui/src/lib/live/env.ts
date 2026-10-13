import { chooseDataMode } from '@/lib/liquidity/registry';
import { indexerOrigin } from './indexer-origin';

/** Resolved live-mode configuration. All reads fail closed through chooseDataMode. */
export const DATA_MODE = chooseDataMode(
  import.meta.env.VITE_DATA_MODE as string | undefined,
  import.meta.env.VITE_INDEXER_URL as string | undefined,
);

export const INDEXER_URL = DATA_MODE === 'live'
  ? indexerOrigin(import.meta.env.VITE_INDEXER_URL as string, window.location.origin)
  : null;

export const PUBLIC_RPC_URL = 'https://testnet-rpc.monad.xyz';

export const RPC_URL = (import.meta.env.VITE_MONAD_RPC_URL as string | undefined) ?? PUBLIC_RPC_URL;

/** Ordered failover target for the read client; null when the primary already is the public RPC. */
export const RPC_FALLBACK_URL = (import.meta.env.VITE_MONAD_RPC_FALLBACK_URL as string | undefined)
  ?? (RPC_URL === PUBLIC_RPC_URL ? 'https://rpc.ankr.com/monad_testnet' : PUBLIC_RPC_URL);

export const CHAIN_ID = 10143;

/**
 * Envio Market Quality Radar base URL. Default same-origin (`/api/radar`), served through
 * the staging gateway only when STAGING_GATEWAY_RADAR=1 (off until the Envio token is
 * rotated). Null disables the panel entirely. Never carries the ENVIO_API_TOKEN — the
 * token lives only in the backend radar process.
 */
export const RADAR_URL = DATA_MODE === 'live'
  ? ((import.meta.env.VITE_ENVIO_RADAR_URL as string | undefined)?.replace(/\/$/, '') ?? '/api/radar')
  : null;
