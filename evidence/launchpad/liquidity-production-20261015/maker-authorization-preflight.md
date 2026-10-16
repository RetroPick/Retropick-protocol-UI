# Maker smoke authorization preflight

Read-only pinned block: `71,405,056`, hash `0x9fc1208d1819ca1066cb923fd6d5d41f72f81518b719e82b92d6eee97128705a`.

Market: RetroPick demo token `0x43e7…8f15`, Kuru market `0x1f5d…c57f`. Coordinator ledger is `GRADUATED`; market is active; vault assets and combined best bid/ask are non-zero; the ordinary CLOB is empty.

Candidate public signer already visible in committed release evidence: `0xB505c…913b`. At this block it has:

- `9,236,068,993,762,673,161` wei MON in the wallet;
- `900,000,000,000,000,000` base units in Kuru margin;
- `8,010,000,000,000` wei MON in Kuru margin.

This is enough to prepare a smallest post-only sell without new funding, but it is **not broadcast authorization**. Gate M2 remains `BLOCKED_AWAITING_FUNDED_SIGNER_AUTHORIZATION` until a human explicitly approves this signer, maximum spend/exposure, maintenance-window broadcast, and cleanup/cancellation policy.

No approval, allowance increase, order placement, cancellation or withdrawal was executed in this preflight.
