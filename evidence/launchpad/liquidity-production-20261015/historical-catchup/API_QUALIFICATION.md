# Liquidity API qualification

Deterministic HTTP tests cover readiness, cache policy and migration compatibility:

- projection-2 base routes continue serving while new liquidity routes are unavailable;
- completed pool history is paginated with snapshot-bound cursors;
- history and wallet LP routes reject reuse across wallets, queries, revisions and snapshots;
- wallet LP responses use `Cache-Control: no-store` and do not emit ETags;
- public liquidity routes retain the existing public-cache envelope;
- exact amounts remain JSON decimal strings.

The full operator result supplies the completed history state required by those handlers. Live gateway rate/load testing and production cutover remain separate operational qualification and are not claimed here.
