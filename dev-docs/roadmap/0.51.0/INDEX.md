# 0.51.0 — Create combined matches manage

- **Status:** `shipped`
- **Upstream:** [0.50.0](../0.50.0/INDEX.md). Combined storage and `wallet.createCombinedAccount` stay as in [0.5.0](../0.5.0/INDEX.md). The manage page this screen copies is [0.47.0](../0.47.0/INDEX.md). 0.47.0 left the create page out of scope.
- **Changelog:** write into [`changelog.md`](../../../changelog.md) on ship
- **Ideas:** none in the backlog. The reference screen is the shipped manage page, not a new demo.

## Product

The create-combined page uses the same main-wallet card and member sheet as manage. The user adds members from a plus button (paste or local accounts), picks the main wallet on a row, and reorders or removes members before confirming. The only extra block is the optional name field. Creating still sends the existing `wallet.createCombinedAccount` command.

## Docs

1. This file
2. [docs/reasoning.md](./docs/reasoning.md)
3. [docs/how.md](./docs/how.md)

## Decided

| Topic | Decision |
|-------|----------|
| What changes | The create-combined screens. Manage, account list, address book, and the create command stay. Two existing files that were already 50 lines or more get an English responsibility header: `wallet/src/approval/shell/cu.ts` and `wallet/src/shared/tx/simulate-pending-tx-types.ts`. No behavior change in those files. |
| Page shape | `add-combined` shows, top to bottom: optional name field, main-wallet block, members sheet. The main-wallet block uses the manage classes (`main-wallet`, `main-wallet-card`). It is omitted while the draft has no valid member. The members sheet uses `member-sheet` / `member-line`. The heading is `accounts.members`. The plus button is the same icon button as manage and sits on the heading's right. |
| Name | Label `common.name`. Placeholder `common.optional`. The input uses `maxLength={ACCOUNT_LABEL_MAX}`, so a longer name cannot be typed. There is no counter and no hint. Empty or whitespace is omitted from the command. If the command fails, stay on `add-combined`, keep the draft, and show the error in the existing one-line `#combined-err` on that page. |
| Member row | Same order as manage: grip, circular main pick, fixed kind slot, text, copy, trash. The kind slot shows the copper signing mark only when the address matches a local signing account; otherwise the slot stays empty and keeps its width. When the address matches a local signing or watch account, the first line is that account's `label`. When it does not, the first line is not rendered. The address line is the short address plus copy of the full key. There is no pencil and no member name field. |
| Main wallet | The highlighted circle is the draft main. Tapping the row (not the grip, copy, or trash) or the circle sets that member as main. The card above shows the same name and short address as that row, with copy. The first valid member added becomes main when the current main is empty or no longer in the draft. |
| Add | Plus opens `add-combined-add`, two rows, same as manage: `common.address` then `common.localAccounts`. Address opens `add-combined-paste`. Local accounts opens `add-combined-local`. |
| Paste | One field. Placeholder stays `onboarding.pasteMulti`. Confirm is the dock, label `common.confirm`. It splits on whitespace and commas, keeps tokens that parse as a public key, skips blanks and duplicates already in the draft, and appends them in paste order. The dock stays disabled when that set would be empty. Success returns to `add-combined`. Invalid tokens are dropped, not shown as chips. |
| Local list | One row per signing or watch account, label and short address. A row whose address is already in the draft is disabled and appends `accounts.alreadyIn`. Tapping an enabled row appends that public key and stays on this page. Back returns to the add choice. |
| Remove | Trash removes that member from the draft. The last member may be removed. At zero members the main card hides and the dock Create button is disabled. |
| Order | Dragging the grip reorders the draft only. No command runs. Create sends `subPubkeys` in that order and `mainPubkey` as the highlighted member. |
| Draft lifetime | The draft (name, ordered members, main) lives in a module next to the create screens, not in `chrome.storage`. It survives only while the current view is one of `add-combined`, `add-combined-add`, `add-combined-paste`, or `add-combined-local`. Any navigation to a view outside those four clears it, including Back to `add-account` and a menu jump to another page. Create success clears it too. Entering `add-combined` from outside those four therefore starts empty. |
| Dock | `add-combined` keeps the existing dock label `accounts.combinedCreate`. Disabled when there is no valid member. Paste uses `common.confirm`. Add choice and local list have no dock. |
| Command | Still `wallet.createCombinedAccount` with `{ label?, subPubkeys, mainPubkey }`. No `memberNames`. No new command, storage key, or permission. |
| After create | Same as today: refresh, then `viewAfterAccountCreated`. |

## Out of scope

- Member names on create (`memberNames`, pencil, `wallet.setCombinedMemberName`)
- Changing manage, account list, or address book
- Changing `wallet.createCombinedAccount` or combined storage
- Dragging members on the manage page (already shipped)

## Tracks

### Track 1 — Create page

- **Does:** replace the chip list and checkbox list with the manage layout; add the three subviews; keep one draft across them; send the same create command
- **Does not:** the out-of-scope list
- **Acceptance:** rows below; `cd wallet && npm run typecheck`

## Acceptance

- [x] `add-combined` shows the name field, and with at least one member shows the main-wallet card and member rows in the manage layout (circle, kind slot, copy, trash, grip)
- [x] Plus opens address or local accounts. Pasting several keys adds only the valid new ones and returns to the create page. A local row adds that account and shows already-in if tapped again
- [x] The circle sets the main card. Trash can clear the last member and then disables Create. Grip order is the `subPubkeys` order on create
- [x] Back from `add-combined` to the add chooser drops the draft. Back from paste or local keeps it. Opening the menu and leaving the four create views also drops it, so the next visit starts empty
- [x] Create still calls `wallet.createCombinedAccount` and does not write `memberNames`
- [x] `cd wallet && npm run typecheck`
- [x] Unpacked extension: open New combined, add one pasted address and one local account, set the main wallet, reorder, create, then open Manage and see the same main and order

## Anchors

| Path | Role |
|------|------|
| `wallet/src/popup/accounts/combined-create-screen.tsx` | Create page |
| `wallet/src/popup/accounts/CombinedManage.tsx` | Visual reference |
| `wallet/src/popup/accounts/combined-member-screens.tsx` | Add-choice pattern to copy |
| `wallet/src/popup/accounts/combined-logic.ts` | Draft helpers |
| `wallet/src/popup/styles/accounts.css` | Manage and create styles |
| `wallet/src/popup/runtime.ts` | Back parents |
| `wallet/src/popup/types.ts` | View ids |

## Still to decide

(none)
