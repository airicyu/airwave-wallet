# 0.51.0 reasoning

## What ships

Create combined looks like manage. The checkbox list and address chips leave the create page. Members are added from the same plus menu manage already uses. The main wallet is a card plus a circle on the row. Order and removal happen on that sheet before the existing create command runs.

## Why

0.47.0 redrew manage and explicitly left the create page alone. The create page still shows a native checkbox list under "Local accounts" and a paste field with chips. That is a second member UI for the same object.

## Dropped

- Editing `memberNames` during create. Manage already does that after the account exists. Adding it here would need a new command field.
- Replacing the create command. The payload is already `label`, `subPubkeys`, and `mainPubkey`.
- Keeping chips for invalid paste tokens. Manage only accepts a real public key. Invalid tokens are dropped on confirm so the sheet never shows a row that cannot be created.
- A new visual demo. The shipped manage page is the reference.
- Clearing the draft only on the Back control. The menu can leave the create flow without Back, so the draft clears on any exit from the four create views.
- Showing a blank name line for an address with no local account. The row is address-only in that case.
