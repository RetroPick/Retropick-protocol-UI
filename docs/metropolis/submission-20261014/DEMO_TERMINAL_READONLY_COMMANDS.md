# Recorded read-only command boundary

Read chain state only. Existing credentials remain in configured environment and off camera. Record a dedicated clean terminal without shell history, username, infrastructure IPs or authenticators.

```sh
cast chain-id --rpc-url "$MONAD_TESTNET_RPC_URL"
cast receipt 0x5cc1d0469ee7b811139055a81f2ba85a49a3de5b8ea54e158426693a556271f3 --rpc-url "$MONAD_TESTNET_RPC_URL" --json
cast receipt 0x70d0cb480e7824ca9af62eaa5cb8d246a352efc6f2ba3585119c8bc64fa63fde --rpc-url "$MONAD_TESTNET_RPC_URL" --json
cast receipt 0xabd44f6922c652f0043658bf86f7d72e5cc550d4755a001cfd8d1c519ae515b7 --rpc-url "$MONAD_TESTNET_RPC_URL" --json
cast receipt 0x93e056ca41c8f55022c2030f4ecaade5775187fc443e8b98f7ddac7a65855415 --rpc-url "$MONAD_TESTNET_RPC_URL" --json
cast receipt 0x471faeb38c8598fc7207cb97c18a550db989e6d43bf0ce23b3539ea7920ac920 --rpc-url "$MONAD_TESTNET_RPC_URL" --json
```

Fresh 2026-10-13 checks returned chain 10143 and status 0x1 for all five receipts. Order/fill/cancel destinations match Kuru market 0x1f5de72616a7fe645cf45ac66dfce8ac7452c57f. Show decoded event names only after matching event logs. Evidence is historical team testing, not current liquidity or organic adoption.

```sh
cd integrations/chainlink-cre
cre workflow simulate graduation-safety --target monad-testnet-settings --non-interactive --trigger-index 0
cre workflow simulate cre-neg-wrongmarket --target monad-testnet-settings --non-interactive --trigger-index 0
cre workflow simulate cre-neg-notgraduated --target monad-testnet-settings --non-interactive --trigger-index 0
cre workflow simulate cre-neg-sourcify --target monad-testnet-settings --non-interactive --trigger-index 0
```

Fresh official simulations returned PASS, FAIL, FAIL and INCOMPLETE_EXTERNAL respectively; CLI exit 0 means simulation completed, not every scenario passed. Label SIMULATED, not live DON. Suppress default/private-key notices before writing logs or recording.
