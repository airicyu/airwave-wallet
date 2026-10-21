# 0.51.0 how

## Views

Add three view ids next to `add-combined`:

- `add-combined-add` — title `common.add`. Parent `add-combined`.
- `add-combined-paste` — title `common.address`. Parent `add-combined-add`.
- `add-combined-local` — title `common.localAccounts`. Parent `add-combined-add`.

Register them in `wallet/src/popup/types.ts` (`View`, `SUBPAGE_TITLE_KEYS`) and `wallet/src/popup/runtime.ts` (`BACK_PARENT`). Render them from `wallet/src/popup/AccountViews.tsx` the same way manage's add screens render.

Navigating among `add-combined`, `add-combined-add`, `add-combined-paste`, and `add-combined-local` does not clear the draft. Any navigation to a view outside those four clears it. Create success clears it. The clear runs in the same place that changes `currentView`, so a menu jump is covered, not only Back.

## Draft module

Replace the split chip set and picked-key set with one ordered list.

```ts
type CombinedCreateDraft = {
  label: string;
  members: string[];
  main: string;
};
```

Keep it in `wallet/src/popup/accounts/combined-logic.ts` (or a sibling file if that file would pass 400 lines). Export a read (`getCombinedDraft`), `clearCombinedDraft`, and the mutations `setCombinedLabel`, `appendCombinedMembers`, `removeCombinedMember`, `setCombinedMain`, and `reorderCombinedMembers`. `members` stores normalized public keys only. `main` is one of `members` or empty.

`validCombinedMembers` becomes "return `members`". Adding a key normalizes with `parsePublicKeyBase58`, skips failures and duplicates, and if `main` is empty sets `main` to the first added key. Removing the current main sets `main` to `members[0]` or empty.

## Create page

`combined-create-screen.tsx` renders the name field and, when `members.length > 0`, the main card copied from `CombinedManagePanel`. The member rows copy that panel's row structure without the pencil. Trash calls the draft remove. The circle and row click set `main`. Grip drag reorders `members` with the same pointer threshold the manage sheet uses (`DRAG_PX` of 6). Do not call `wallet.reorderCombinedSubs`.

The name input keeps `maxLength={ACCOUNT_LABEL_MAX}`. The dock primary still calls `wallet.createCombinedAccount` with `label` omitted when trim is empty, `subPubkeys` equal to `members`, and `mainPubkey` equal to `main`. On success, clear the draft, then `refresh` and `viewAfterAccountCreated` as today. On failure, stay on `add-combined`, keep the draft, and set the existing `#combined-err` line. Do not use `showError`.

A member row omits the name line when no local signing or watch account matches. Do not render an empty `.account-name` for that case. The main card does the same: omit the name line when that member has no local label.

## Subpages

`add-combined-add` copies `CombinedAddChoice` with the two new view ids.

`add-combined-paste` is one text input. Confirm splits on `/[\s,]+/`, normalizes, and appends. Disabled when no new valid key would be added. On success `navigateTo("add-combined")`.

`add-combined-local` lists `isSigningOrWatch` accounts. Disabled rows whose normalized key is already in `members` show `accounts.alreadyIn`. An enabled tap appends and stays.

## Styles

Reuse the manage rules in `wallet/src/popup/styles/accounts.css`. Do not add a second member-row skin. The name field keeps the existing `.field` input. Remove the create page's use of `.chip-list`, `.add-line`, and `.combined-pick-list`. Leave those classes if address book or another screen still uses them.

## Checks

`cd wallet && npm run typecheck`

Hand-test is the last acceptance row in `INDEX.md`. No `test-web` step: this screen does not talk to a dApp.
