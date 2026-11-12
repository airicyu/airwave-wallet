# 0.58.0 — Combined create confirm and manage menu

- **Status:** `shipped`
- **Upstream:** [0.57.0](../0.57.0/INDEX.md) shipped. Absorbs the batch that was in [unversioned.md](../unversioned.md).
- **Backlog:** none. This INDEX wins.

## Product

Creating a combined wallet account stages local wallets until Confirm. The combined account kebab opens the same Manage page as other wallet accounts. That page opens the existing member screen or removes the combined wallet account with no confirmation.

## Docs

1. This file
2. [docs/reasoning.md](./docs/reasoning.md)
3. [docs/how.md](./docs/how.md)

## Decided

| Topic | Decision |
|-------|----------|
| Local pick | On `add-combined-local`, tapping a local wallet that is not already a member toggles it. The row uses the accent border while selected. Rows already in the draft stay disabled and show `accounts.alreadyIn`. The dock button is `common.confirm` and stays disabled until at least one row is selected. Confirm appends the selected addresses to the in-memory draft and navigates to `add-combined`. Back, or any leave that does not press Confirm, does not change the draft. |
| Paste | `add-combined-paste` still confirms into the draft and returns to `add-combined`. |
| Existing combined local add | `account-manage-local` still adds a member on tap. It does not use this staging confirm. |
| Combined kebab | The kebab on a combined card navigates to `account-manage`, the same Manage page other wallet accounts use. It does not open a dropdown. |
| Manage page | For a combined account the page shows the account name and the exposed main-wallet address. It does not show Reveal private key. The rows are `accounts.manageCombined` then `accounts.removeCombined`. |
| Member screen | `accounts.manageCombined` navigates to `account-combined-manage`, which is the existing member sheet (main wallet, reorder, add, rename, member trash). Back returns to `account-manage`. Add-member and member-rename return to `account-combined-manage`. |
| Remove account | `accounts.removeCombined` calls `wallet.deleteAccount` for that combined row and returns to the account list. It does not call `confirm`. Member addresses stay on their own wallet accounts. |
| Member trash | Removing one member on `account-combined-manage` still calls `confirm(accounts.removeMemberConfirm)`. The last member stays disabled. |
| Other accounts | A non-combined Manage page still confirms with `accounts.removeConfirm` before `wallet.deleteAccount`. |

## Out of scope

- Staging confirm on `account-manage-local`.
- A confirmation dialog before removing a combined wallet account.
- Removing the last member, or dissolving the combined account from the member trash.
- Changing create-combined paste, reorder, or `wallet.createCombinedAccount`.
- Splitting `wallet/src/shared/i18n/ui-messages.ts`.

## Acceptance

- [ ] On New combined, open Local accounts, tap two wallets that are not already members, and leave with Back. Those wallets are not on the member sheet.
- [ ] Tap the same two again and press Confirm. Both appear on New combined, and the previous main wallet stays main when it was already set.
- [ ] A row already on the sheet stays disabled and shows Already added. Confirm stays disabled when nothing new is selected.
- [ ] On the account list, the combined kebab opens Manage with the name, the main address, Manage combined wallet account, and Remove combined wallet account. It does not open a dropdown.
- [ ] Manage combined wallet account opens the member sheet. Back returns to Manage. Member trash still asks before removing a member, and the last member cannot be removed.
- [ ] Remove combined wallet account deletes that row with no dialog and returns to the account list. A signing wallet that shared an address is still listed.
- [ ] A non-combined kebab still opens Manage, and Remove wallet account still asks first.

## Anchors

| Path | Role |
|------|------|
| `wallet/src/popup/accounts/combined-create-add.tsx` | Local pick staging and Confirm |
| `wallet/src/popup/accounts/combined-logic.ts` | In-memory draft |
| `wallet/src/popup/accounts/manage-screen.tsx` | Combined Manage rows and delete without confirm |
| `wallet/src/popup/accounts/CombinedManage.tsx` | Member sheet on `account-combined-manage` |
| `wallet/src/popup/accounts/accounts-list.tsx` | Kebab navigates to Manage |
| `wallet/src/popup/runtime.ts` | Back parents |
| `wallet/src/shared/i18n/ui-messages.ts` | `accounts.manageCombined`, `accounts.removeCombined` |

## Still to decide

(none)
