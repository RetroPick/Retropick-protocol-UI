# Full offline vault-history qualification

## Source protection

- Source: original checkout's projection-2 `monad-testnet.sqlite`, block `70,648,102`, hash `0xed179222ef239b3bb185ff4c5293765df52ba4df7522772106693d88d9fceb8d`.
- Copy method: SQLite backup API to `/home/ubuntu/project/retropick/v2-liquidity-qualification/monad-testnet-full-catchup.sqlite`.
- Backup verification: `PRAGMA integrity_check` returned `ok`; SHA-256 `97d9398c10ebfc6a3bfb0ce96bb8125b5af3edda59da27d0cf91a20d5031d90b`.
- The source service was stopped and the source WAL was empty. No source database file or checkpoint was modified.

## Replay result

Command:

```text
node --experimental-strip-types apps/indexer/scripts/liquidity-full-catchup.mjs \
  --db /home/ubuntu/project/retropick/v2-liquidity-qualification/monad-testnet-full-catchup.sqlite \
  --output /home/ubuntu/project/retropick/v2-liquidity-qualification/catchup-69723600.json \
  --target 69723600 --max-blocks 2000000
```

Final exit code: `0`. Target block `69,723,600`, hash `0x0be41e345109e5840847aa345ff8ce7f789ca5a74ba81c27b1fad0507190dcd5`. Root history was first scanned to the explicit target; four launches were enumerated, three qualified Kuru vaults were discovered, and every per-vault cursor reached or passed the target.

| Token | Vault | Graduation | Events | Observed supply | Reconstructed supply | Result |
|---|---|---:|---:|---:|---:|---|
| `0x43e7…8f15` | `0xc88d…2ce7` | 69,510,121 | 5 | 15,811,388,300,841,896,683 | 15,811,388,300,841,896,683 | PASS |
| `0x9bae…ccf5` | `0x884e…87df` | 69,554,538 | 5 | 15,811,388,300,841,896,683 | 15,811,388,300,841,896,683 | PASS |
| `0x30cc…d1cf` | `0x023e…4d29` | 69,723,575 | 5 | 15,811,388,300,841,896,683 | 15,811,388,300,841,896,683 | PASS |

Each reconstructed ownership ledger contained exactly the pool's permanent lock balance (`15,811,388,300,841,895,683` atomic shares) and the pinned MarginAccount bootstrap balance (`1000` atomic shares). No user LP positions existed. Deposit/withdraw events supplied history without changing share ownership.

The projection-2 snapshot remained preserved throughout offline qualification. No projection-3 snapshot was published by the operator. This is complete representative historical accounting, not a live production migration or a claim that catch-up to the source snapshot block has executed.
