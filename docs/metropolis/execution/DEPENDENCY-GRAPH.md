# Dependency Graph — execution scope

## Runtime (live product)

```
User wallet (EIP-6963 picker, chain 10143 enforcement)
  └─ apps/retro-ui (canonical frontend; all writes wallet -> chain via tx-pipeline)
       ├─ packages/launchpad-sdk  (chain + RPC failover, read*, prepare* writes, kuru wrappers)
       │    └─ apps/abi           (frozen deployed V2 + Kuru + V4 ABIs, manifest)
       ├─ apps/indexer            (Monad event journal -> GET read model; envelope-validated)
       ├─ apps/referral-service   (off-chain referral attribution; no keys)
       └─ apps/media-service      (token-logo upload; Pinata when configured)

Deployed V2 (immutable for this campaign): LaunchFactory, BondingCurve,
GraduationCoordinator, KuruGraduationExecutor, Kuru orderbook/vault/router,
protected-LP custody — deployments/monad-testnet/v2.json
```

## Sponsor adapters (this campaign; each fail-closed, independently disableable)

```
apps/retro-ui
  ├─ Mera vault (client-side @category-labs/mera; WebAuthn PRF; no server plaintext)
  ├─ Envio radar panel (VITE_ENVIO_URL -> HyperIndex GraphQL; falls back to indexer)
  ├─ Nansen intelligence (server-side adapter only, key never in browser; flag-gated)
  └─ (Aurora: only if a verified route exists — capability-gated)
integrations/
  ├─ metamask-agent-retropick (oclif plugin for MetaMask Agent Wallet CLI)
  └─ chainlink-cre (CRE workflow project, Monad testnet simulation)
research/contract-kernels (P0 kernels -> Stage 7 outcome markets, authorization-gated)
```

## Test dependency matrix

| Suite | Depends on |
|-------|------------|
| retro-ui unit/terminal/media | sdk, abi (workspace) |
| e2e:fixture | offline mock mode, port 4317 |
| e2e:live (read-only) | Monad RPC + indexer origin (.env.local) |
| live-signing campaigns | funded authorized wallet (BLOCKER-002) |
| forge kernels | foundry only |
| Envio stage | envio CLI + docker + HyperSync endpoint (PROBE-001) |
| CRE stage | CRE CLI + network |
| MetaMask stage | mm CLI + node ≥22.18 (satisfied: 22.23.2) |
