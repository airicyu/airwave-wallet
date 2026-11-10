# 0.58.0 how

No new command, storage key, or vault field. `wallet.deleteAccount` already deletes a combined row. The draft stays the in-memory module in `wallet/src/popup/accounts/combined-logic.ts`.

## Views

| View | Parent | What it shows |
|------|--------|----------------|
| `add-combined-local` | `add-combined-add` | Local signing and watch rows. Selected rows are staged in component state. Confirm calls `appendCombinedMembers` and goes to `add-combined`. |
| `account-manage` | `accounts` | For a combined account: name, exposed main address, Manage combined wallet account, Remove combined wallet account. |
| `account-combined-manage` | `account-manage` | The member sheet that used to render on `account-manage` for a combined account. |
| `account-manage-add` | `account-combined-manage` | Unchanged add choice. |
| `account-member-rename` | `account-combined-manage` | Unchanged rename. |

`accounts.manageCombined` is "Manage combined wallet account" / 「管理聚合錢包帳戶」 / 「管理聚合钱包账户」.

`accounts.removeCombined` is "Remove combined wallet account" / 「移除聚合錢包帳戶」 / 「移除聚合钱包账户」.

## Checks

Hand-test the INDEX acceptance list in an unpacked extension. `cd wallet && npm run typecheck` must pass. No test-web change.
