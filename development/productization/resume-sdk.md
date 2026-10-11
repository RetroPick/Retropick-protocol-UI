# Resumed SDK financial and provider qualification

Baseline: integrated main `f643cb62`. Scope: packages/launchpad-sdk only, plus this handoff and SDK evidence. Frontend inspected read-only. No contracts, deployed ABI, deployed addresses, branch switches, commits, broadcasts or pushes performed.

Financial corrections:
- Kuru zero-address quote is a pricing simulation only. Pinned OrderBook source returns before minimum/FOK enforcement for this caller. Preparation now runs the exact margin-funded call from the connected nonzero account, with the fresh positive minimum, at the same block as quote, identity and balance reads. The execution pipeline repeats exact connected-account simulation and wallet account/network checks before signing.
- Market-buy quote amounts must divide exactly into pricePrecision grid units; finer amounts are rejected rather than silently rounded. Price grid rejects uint32 max, matching `price < type(uint32).max`. Base sizing remains exact.
- Same-chain Send execution repeats network, admitted asset, balances, gas and ERC20 true-return qualification. Descriptor recipient/calldata/value integrity is checked before execution. Inputs reject zero accounts and amounts outside uint256.

Already-correct integrated behavior retained:
- FeeEscrow uses `balanceOfToken(recipient, token)`, matching `balanceOfToken[recipient][token]` in deployed source.
- Buyback release checks both current vest recipients; payouts become token-specific FeeEscrow credit, then claimant calls claimToken. Empty credits/releases are rejected. Source does not authorize arbitrary callers.
- Coordinator receipt, packet quote/base identity, router verified-market tuple, implementation addresses and environment validation gate Kuru writes.
- Receipt decoding already exposes TokenLaunched and GraduationCompleted. No new unverified SDK receipt identity cache or synthetic economic seed was added.

Provider changes match indexer redaction policy: every response envelope is validated for matching ids, batch size and exclusive result/error before decoding; malformed responses are transient failures, and invalid chain ids never become permanent wrong-chain classifications. health shows host only; gateway bodies, URL paths/query/userinfo and nested raw errors are not retained in surfaced errors. ABI revert hex/code is retained. AUTH401/403 and wrong-chain permanently disable; rate limit429/-32005, 5xx, timeout/network and -32603 internal failure open a transient circuit and fail over. Log-range limits and contract reverts stay application errors and do not fail over. Indexer stale-head qualification is separate; SDK still reads a fresh selected-provider block and does not assert cross-provider freshness consensus.

Verification:
- `pnpm --filter @retropick/launchpad-sdk test`: 41 passed, 0 failed, 2 explicit network replays skipped (43 total).
- `pnpm --filter @retropick/launchpad-sdk typecheck`: PASS.
- `git diff --exit-code f643cb62 -- packages/launchpad-sdk/src/abis deployments/monad-testnet/abi apps/abi`: PASS, retained ABI identity.
- Pinned Kuru source fetched read-only from https://raw.githubusercontent.com/Kuru-Labs/Kuru-contracts-dex-public/2060bb2736080c175d80d568bfdb6226bb5abd04/contracts/OrderBook.sol; sha256 `6c1af0eab70bfd7c1404119539304f97ff9e5f932ca0e8ad3b8f5f946e37cb1f`; key ranges 183-208, 728-836. This establishes source semantics, not current mutable deployment equivalence.

Evidence: evidence/launchpad/productization/resume/sdk/{unit-tests.txt,typecheck.txt,source-and-abi.txt}.

Residual qualification: no new testnet transactions authorized for this resumed run. Unit/mocked-provider tests do not substitute for fresh market/claim/send receipts, recipient balance deltas, wallet interaction or live deployment environment checks. Those remain release evidence requirements, not inferred passes.

## Fair RPC benchmark follow-up

Historical development/performance/RPC_BENCHMARK.json remains unchanged. The revised script measures nine identical launch reads at pinned block 69896160. A process-wide sliding-window budget limits eth_call entries to ten per second; HTTP concurrency is three. Probes and one warmup sample are excluded. Failures fully settle before the next sample, use fixed safe classes and bounded cooloffs. Each mode targets thirty successful samples, stops after three consecutive errors or bounded attempts, and final public modes also have a two-minute sampling deadline. Metrics count actual HTTP requests, JSON-RPC calls, eth_call entries and response-body bytes. Sequential samples are descriptive; no automatic winner is selected.

The final public and server runs both include strict JSON-RPC envelope validation. A later typed-hex chain/head probe guard affects excluded bootstrap qualification. Initial public measurements are retained separately as rpc-public-initial.json and rpc-public-multicall-default.json. Final rpc-public.json records all five modes; rpc-infura.json records the configured private server endpoint with host-only identification.

| Mode | Public successes/attempts | Public errors | Public p95 ms | Server successes/attempts | Server errors | Server p95 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| parallel-http | 30/33 | 3 | 1344.29 | 30/30 | 0 | 1550.53 |
| json-rpc-batch | 30/30 | 0 | 278.52 | 30/37 | 7 | 394.53 |
| multicall3 | 30/30 | 0 | 375.03 | 0/3 | 3 | — |
| frontend-default | 26/31 | 5 | 983.12 | 0/3 | 3 | — |
| frontend-multicall-candidate | 30/30 | 0 | 257.74 | 30/32 | 2 | 3651.27 |

The public actual-default mode is PARTIAL at 26 successes after its deadline. Server Multicall and actual-default modes are PARTIAL at zero successes after repeated errors. Overall both runs are PARTIAL with winner null. These gaps block a full latency comparison and do not authorize a provider or default-transport promotion. The SDK retains HTTP batching enabled and Multicall as explicit opt-in; frontend configuration is unchanged.

Successful samples verified decoded equality at the same block. Independently qualified official Multicall runtime hash matches the fetched 3808-byte code hash d5c15df687b16f2ff992fc8d767b4216323184a2bbc6ee2f9c398c318e770891, with direct/aggregate3 equality. The revised script asserts this runtime hash. Runtime identity is separate from transport performance.

Server error classes are preserved: JSON batch six NETWORK plus one RPC_UNAVAILABLE; Multicall three RPC_UNAVAILABLE; actual default one NETWORK plus two RPC_UNAVAILABLE; combined candidate two TIMEOUT. No gateway bodies, endpoint paths/query/userinfo or credentials are recorded. Credential-exposure checks read the approved server environment internally and expose only PASS/FAIL counts.

Benchmark script typecheck passes separately because the package tsconfig excludes scripts. Evidence commands: node --experimental-strip-types packages/launchpad-sdk/scripts/benchmark-rpc.ts (public), and node --env-file=.env.local with RPC_BENCHMARK_PROVIDER=infura (server); both set RPC_BENCHMARK_BLOCK=69896160 and explicit SDK evidence output paths. No testnet writes occurred.

One bounded public actual-default-only retry is recorded separately in rpc-public-default-retry.json; it does not erase the full-run partial result.

Final bounded actual-default retry: 30 successful samples / 32 attempts, 2 errors; p50 191.69ms, p95 311ms. Overall retry remains PARTIAL under the script's strict zero-error criterion. No more retries or probes are scheduled.
