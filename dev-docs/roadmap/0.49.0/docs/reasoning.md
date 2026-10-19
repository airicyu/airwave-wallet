# 0.49.0 reasoning

## What ships

Four popup file splits, plus a React port of the approval shell. The product on screen is unchanged from 0.48.0.

The popup files are too large for one editing session, and they do not share a change. The approval shell is a separate phase because it changes the mount contract in `ApprovalHost`, `SignFlowPage`, and the popout together.

## Why phases inside one version

A single version keeps one ship note and one status row. Separate phases keep each session inside one folder. A session that splits settings does not load the approval shell, and a session that splits the shell does not load onboarding screens.

Phases are not ordered. `style.css` pulls feature sheets with `@import`, so the CSS phase never edits a screen component. Screen phases leave `style.css` alone and leave `PopupMarkup.tsx` on the old import path by turning the old file into a barrel.

The React phase deletes `shell.ts` instead of splitting it. A vanilla split would draw module edges around shared element lookups. React edges are components. Those vanilla modules would be rewritten immediately, so this version does not create them. `sign-tx-body.ts` stays the delta painter, mounted from a ref, so this phase does not also rewrite expected-change rendering.

## Dropped

- Splitting `shell.ts` into vanilla modules and keeping `mountApprovalShell`.
- Splitting every other file over 400 lines. Those files are out of scope so a session cannot wander.
- Renaming classes or moving rules by visual redesign. The CSS split follows the prefixes already in the sheet.
