---
id: LP-INTEGRATIONS
type: normative
product: launchpad
version: v2
status: active
---

# Integrations

P0 integration priority:
1. Monad network/RPC/wallet;
2. RetroPick V2 contracts;
3. Kuru destination market;
4. event indexer;
5. metadata/media storage;
6. optional provider tooling.

External integration details are mutable. Binding addresses/APIs/versions belong in machine-readable environment/source-pin configuration and development integration specs.

Metadata/media storage (priority 5) is implemented by `apps/media-service` (ADR-017, ACCEPTED 2026-10-11): launcher uploads are pinned to IPFS via Pinata (server-side `PINATA_JWT`) with a local content-addressed fallback; the onchain `logo` field stays a ≤512-byte URI. Current-source verification for the provider and public gateways is recorded in the ADR appendix.

No integration can weaken protocol accounting or become a shortcut around accepted security semantics.
