# 0.59.1 direction

`formatPrivacyAmount` takes a base-unit `bigint` and a decimals count and uses `formatRawToAmountUi`. `decimalsByMint` resolves SOL as 9, then Jupiter, then the mint account. `presentRows` formats totals, member shares, and UTXO amounts before the UI reads them. Each private row carries `decimals`. Unshield and private Send parse the field with that count. `beginUnshield` and `beginPrivateSend` use the home-token decimals when the public row exists, otherwise the same lookup.

`.token-send-balance` is `1.05rem` with `flex-wrap: nowrap`. The amount span uses `token-send-balance-value`.
