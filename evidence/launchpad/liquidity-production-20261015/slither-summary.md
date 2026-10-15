# Slither V2 baseline summary

Command:

```text
FOUNDRY_PROFILE=test slither . --exclude-dependencies --json /tmp/retropick-v2-liquidity-slither.json
```

Result: analysis succeeded for 135 contracts with 102 detectors and produced 174 findings. Slither returned `255` by design because findings exist; this is not a compiler or runner failure. The raw JSON remains outside the repository because it is about 13 MB.

Impact counts:

- High: 26
- Medium: 48
- Low: 50
- Informational: 45
- Optimization: 2

The recurring V2 findings are concentrated in frozen external-transfer and graduation paths: arbitrary native/ERC20 transfer heuristics, balance-before-external-call patterns, reentrancy observations around Coordinator/executor/Kuru vault calls, strict-equality state checks, and low-level calls. These are pre-existing frozen-contract findings, not regressions introduced by this fullstack change. Dedicated Foundry qualification and the deployed source/allowlist reviews remain the controlling evidence; this scan does not clear those findings.

Coverage limits: this campaign did not modify Solidity, run Echidna/Manticore, or perform a new third-party audit. V1, Doorway, interface style findings, and dependency warnings are outside this campaign. `function-summary` and `vars-and-auth` printers completed successfully for the project; their raw output is developer evidence under `/tmp` and intentionally not committed.
