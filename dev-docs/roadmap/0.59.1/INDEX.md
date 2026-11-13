# 0.59.1 — Private amount decimals

- **Status:** `shipped`
- **Parent:** [0.59.0](../0.59.0/INDEX.md). Patch only. No new feature
- **Changelog:** [`changelog.md`](../../../changelog.md) under `0.59.1`

## Product

Private balances format each mint with that mint's decimals. Native SOL stays 9. An SPL mint uses the Jupiter token record, then the mint account. The same decimals format the private list, each UTXO, the Unshield picker, and the Unshield and private-Send amount. Send, Shield, Unshield, and private Send show the balance line at the smaller size so the label and the amount stay on one line.

## Decided

| Topic | Decision |
|-------|----------|
| Display | `amount` is a UI decimal string. `amountRaw` stays the base-unit integer. JavaScript `number` is not used for the amount |
| Decimals | SOL is 9. Other mints use Jupiter `decimals` when the cluster is Mainnet, then `getAccountInfo` on the mint with `jsonParsed` |
| Spend | Unshield and private Send parse the typed amount with those decimals. A missing home-token row falls back to the same lookup |
| Balance line | `.token-send-balance` is `1.05rem` and does not wrap. The amount uses one line and ellipsizes if it still does not fit |

## Out of scope

- A new private-balance feature
- Changing public token rows
- Custom Rings

## Acceptance

1. A private USDC balance of 401756 base units shows `0.401756 USDC` on the private list, the Unshield picker, and the Unshield form, including the selected UTXO.
2. Max on that form fills `0.401756`, and the form does not report insufficient balance for that full amount.
3. SOL private amounts still use 9 decimals.
4. The balance line on Send, Shield, Unshield, and private Send is the smaller size and stays on one line.

The user walked these screens on 2026-11-13 and said they passed.
