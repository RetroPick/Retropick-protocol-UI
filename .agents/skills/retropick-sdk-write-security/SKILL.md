---
name: retropick-sdk-write-security
description: Review RetroPick SDK transaction preparation or wallet execution against deployed identity and the approved financial write boundary.
---

Read AGENT_GUIDE.md and the routed authority, then development/fullstack-integration/write-allowlist.md and relevant amendments including packages/launchpad-sdk/SEND_WRITE_ALLOWLIST.md.

Trace each target from the frozen release or Coordinator packet/receipt. Requalify chain, market identity, account, exact amounts, approval spender/value, simulation and receipt before claiming safe execution. Cached display qualification is insufficient for signing.

Use existing preparers and transaction pipeline. ABI presence does not authorize selectors. Preserve exclusions for passive vault LP, advanced MM, privileged/internal operations and generic calldata. Distinguish positive zero-address size quotes from funded account/FOK simulation. Record reviewed selectors, source pins, test commands and unresolved authority gaps.
