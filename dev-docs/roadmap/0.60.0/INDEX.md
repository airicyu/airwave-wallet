# 0.60.0 — Token-2022 Scaled UI Amount display

- **Status:** `shipped`
- **Parent:** [0.59.2](../0.59.2/INDEX.md)
- **Changelog:** [`changelog.md`](../../../changelog.md) under `0.60.0`

## Product

For SPL Token-2022 mints that use the **Scaled UI Amount** extension (for example xStocks after splits or reinvested dividends), the wallet **displays** balances and amounts in **scaled** units so they align with Jupiter-style UIs. On-chain transfers and simulations still use **raw** smallest units; the wallet converts user-entered scaled amounts to raw before building transactions.

## Decided

| Topic | Decision |
|-------|----------|
| Display | Home holdings, Home Activity (Helius enhanced), in-wallet Send labels, and sign-approval SPL simulate deltas show `raw × currentMultiplier ÷ 10^decimals`, truncated toward zero, per mint `scaledUiAmountConfig` and effective timestamp |
| Multiplier source | `getAccountInfo` `jsonParsed` on each Token-2022 mint that appears in the page batch |
| Send | User types scaled UI; `parseSendAmountUiToRaw` floors to raw. Balance limits use stored `balanceRaw` when present |
| USD | Jupiter `usdPrice` is per scaled unit; multiply by scaled `uiAmount` |
| Non-scaled mints | Unchanged (`raw ÷ 10^decimals`) |
| Out of scope | Privacy shield balances; signature-only activity rows without enhanced parsing |

## Acceptance

1. Mainnet SNDKx (or any mint with multiplier ≠ 1): Home quantity matches Jupiter wallet balance within formatting; USD total is not understated by the multiplier factor.
2. Wallet Send: balance, 50%, Max, and successful send use scaled labels; chain transfer uses raw.
3. Sign approval: SPL expected-change rows show scaled amounts when the mint has the extension.
4. Home Activity swap/send lines from enhanced Helius history show scaled token amounts for those mints.
5. `npm run typecheck` in `wallet/` passes.

## Out of scope

- Showing raw and scaled side by side
- Historical multiplier at past block time for old activity rows
- dApp swap UIs inside the extension