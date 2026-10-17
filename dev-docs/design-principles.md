# Design principles

Popup and approval UI. An INDEX overrides this file when it says so. Informal demos live in [design-demos/](design-demos/).

## 1. Icon buttons

A button whose only content is an icon has no border, background, or fill. Do not use a gray square or a bordered box.

- Default: transparent background, no border, no shadow. The icon uses `--muted`.
- Hover: icon `--text` only. Do not lighten the button background.
- `:active`: `transform: scale(0.94)`.
- `:disabled`: opacity about 0.35, `cursor: not-allowed`, no hover or press.
- Hit target at least 34×34px (padding around the icon). Do not shrink the control to the icon's pixels.
- `title` is the accessible name (for example Copy address). Do not put visible text next to the icon.
- Do not reuse `.icon-btn` for a control that also has a label. That class is icon-only.

## 2. Long strings

A control width is content or a cap, not "whatever is left in the row."

- Single-line label (origin, address, txid): `ellipsis`; the cap is the column or popup content width.
- Do not stretch a button or card to 100% unless it is a primary action.
- Code, addresses, and hashes: `min-width: 0` on the flex child, plus `overflow: hidden`.

## 3. Naming accounts

The **rename screen** is one field. The **account list card** is a rename button.

- **Rename screen:** label `Name` and the field on one row. No hint and no counter. Placeholder is the short public key (`Ab3…x9K2`). Submitting empty or whitespace saves the short public key. Confirm label is `Save`.
- **Account list:** the card's main line is the non-empty `label`, otherwise the short public key. A failed save restores the card. There is no inline field.

## 4. Account list

One card is one account.

- **Main line:** display name (the non-empty `label`, otherwise the short public key).
- **Second line:** short public key (about 4 + … + 4). The copy control sits after the address on the same line.
- **Kind:** a small mark on the card (signing, watch-only, or combined). The mark is an icon, not a sentence.
- **Rename:** a rename control on the card navigates to the rename screen. The card itself is not a field.
- **Delete:** a delete control on the card. Confirm, then `wallet.deleteAccount`.
- **Combined:** the card navigates to **manage the combined account**. Do not expand the member list on Home.
- **Add:** a list-level button navigates to the add screen. Not a new card.

## 5. Popup shell

- **Width** 384px (Chrome popup usable width). Height follows content up to the browser cap. A short view does not stretch to 600px. The shell background matches the page (no empty band showing the browser default).
- **Top bar:** one account chip (round letter avatar, display name, copy). The menu is a separate icon button (icon-only, 34px). Do not put the short public key in the bar.
- **Menu:** a layer over the current view (not a route). Entries in order: **Wallet accounts**, **Address book**, **Network**, **Settings**, **Connected sites**, **About this app**, **Lock wallet**. Network is a Devnet / Mainnet radio, the same as before. Connected sites, Settings, and About are full pages.
- **Connected sites:** rows of granted origins. Disconnect uses an icon-only button (`title` Disconnect). Do not use "Disconnect all." An empty list is one short line, not a table.
- **Home:** two segments, **Tokens** and **Activity**. Tokens is the default. The list area scrolls inside the shell (`overflow-y: auto`, `min-height: 0`). Activity may be empty in this version. Empty copy is one short line.
- **Token rows:** amount and symbol. USD fiat is not in this version.
- **Primary actions:** full-width at the bottom (Create account, Save). Follow the [extension-page skill](../.agents/skills/extension-page/SKILL.md).

## 6. Do not

- A popup that is a long settings form or a dashboard.
- Visible button text that repeats the icon meaning ("Copy" next to a copy icon).
- A second copy control in the top bar.
- A full-screen route for the menu overlay.

## 7. Readability

Body text and form labels at least 12px. Button labels and amounts at least 13px. Hints and secondary text at least 11px. Weights 400 or 500. Do not use 600 or bold for body. Color is not the only separator: amount and name go on separate lines, or use a tabular figure.

## 8. Visual

- One accent (links, the current segment, primary buttons). Secondary numbers and labels use `--muted`.
- Spacing scale: 4 / 8 / 12 / 16 / 24. Cards and rows share one padding (12 or 16).
- Corners: inputs and buttons 8px. Cards 12px.
- Shorten with ellipsis or a short public key. Do not shrink the font to fit a long string.

## 9. Motion

Keep CSS transitions at 120–160ms, opacity or color only. A segment change does not slide the whole page. Respect `prefers-reduced-motion`: no transform animation.

## 10. Copy

Errors and empty states are one short sentence (one line when possible). Buttons are verbs (Save, Cancel, Lock wallet). Do not use "please" or feature essays. Traditional Chinese, Simplified Chinese, and English share one catalog and the same line breaks.
