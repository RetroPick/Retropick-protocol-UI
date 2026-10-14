# Technical judging strategy — proof first

Make Bond-to-Book's working Monad Testnet lifecycle the central demonstration. The hypothesis is reliable market origination, with Kuru providing secondary execution. Avoid claims of novel financial primitives or guaranteed liquidity.

| Judge question | Technical case | Reviewable evidence |
| --- | --- | --- |
| Does it work? | Historical launch, curve buy, graduation and two-actor order/fill/cancel; current deployed controls | 2:55 technical video, RPV2M explorer receipts in PRODUCT_MECHANISM_VERIFIED.md |
| What required engineering? | Policy snapshots, a single graduation ledger, secured assets, retryable atomic venue completion and destination receipt validation | Coordinator and Kuru executor source; deployed-source SHA f0363249f4b74e58dde37d1241742ca5a92bcfe3 |
| What is protected? | Permanently bound initial LP shares and excess launch tokens, separate from trader funds | Per-launch custody source and recorded protected balances; no depth or return guarantee |
| Why these sponsors? | Kuru is the actual secondary venue; CRE combines real chain reads with external source correspondence | Kuru receipts; official CRE simulation PASS, wrong-market FAIL, external INCOMPLETE_EXTERNAL |
| Can the evidence be reproduced? | Read-only commands, exact chain/token/market identity and raw logs | DEMO_TERMINAL_READONLY_COMMANDS.md, source and proof paths |
| Are limitations understood? | Empty current book, test traffic, unaudited testnet, simulation status, independent read-model qualification | Explicit labels in film, scripts and submission copy |

The technical script should explain cause and effect: launch terms commit the destination policy; the curve provides primary discovery; the Coordinator secures assets; the executor binds the Kuru destination; receipts demonstrate execution; custody limits issuer control over initial assets. Explain each concept while its supporting screen is visible.

Use the recorded 2:55 timing as the edit constraint. The film is silent by user request; the human script can be shortened naturally before recording. Do not stretch it past three minutes or imply new transactions were performed during capture. A distinct active curve and graduated campaign are deliberately labelled as separate examples.

Technical depth can improve confidence in implementation. The official rubric also scores team, design, traction and originality, so it cannot establish winning odds. Keep traction unmeasured unless independent evidence is supplied. The founder-owned pitch remains external input; final filing still requires explicit approval.
