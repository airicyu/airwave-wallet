# 0.50.0 — Folder layout, phase 1

- **Status:** `shipped`
- **Upstream:** [0.49.0](../0.49.0/INDEX.md) is shipped. This version moves `wallet/src/shared` into domain folders. Behavior, exported symbol names, commands, and storage keys stay as in 0.49.0.
- **Changelog:** [changelog.md](../../../changelog.md) heading `0.50.0`
- **Ideas:** none in the backlog. This is a structure change, not a feature.

## Product

`shared/` stays the domain layer. Files that used to sit in that one directory now live in a domain folder and are imported through that folder's `index.ts`. Chrome surfaces stay the top of `wallet/src`. Five source files that were over 400 lines are split in place. The message catalog stays one file, with prefix comments. Popup and popout CSS sheets live in `styles/` folders; the entry `style.css` files only import them.

## Docs

1. This file
2. [docs/reasoning.md](./docs/reasoning.md)

The user asked to skip the design-review gate and then asked to apply the moves.

## Decided

| Topic | Decision |
|-------|----------|
| What grouping means | A folder is a module boundary. The top level stays Chrome surfaces. `shared/` is grouped by domain |
| Large files | Split the five source files named in Track 2. Keep `ui-messages.ts` as the only message catalog. Gather CSS into `popup/styles/` and `popout/styles/`. Exported names and class names stay |
| Dependency | Surfaces may import domain modules. Domain modules do not import `popup/`, `background/`, `approval/`, or `chrome.*` |
| Public surface | A domain folder exports through its `index.ts`. Callers outside the folder import that folder, not a deep path |
| Move discipline | Paths and import sites change. Exported symbol names do not. Behavior does not |
| UI helpers | `copy-pk-feedback`, `row-expand-chevron`, `brand-icon`, `send-status-mark`, and `account-kind-visual` live in `shared/marks` |
| Accounts and vault | Records and labels are `shared/accounts`. Seed derive, key bytes, and the password box are `shared/vault` |
| No `format/` | `friendly-error-message` lives in `shared/i18n` because it formats catalog text. `uuid` lives in `background/close-empty` (its only caller). `format-lamports` lives in `popup/close-empty` (its only caller) |
| `dapp-approval-notice` | Lives in `shared/protocol` |
| Domains | `i18n`, `protocol`, `accounts`, `vault`, `rpc`, `tx`, `send`, `close-empty`, `tx-ai`, `home`, `shell`, `marks` |

## Out of scope

- Splitting `shared/i18n/ui-messages.ts` into more than one catalog
- Collapsing Chrome surfaces into feature packages
- Regrouping `popup/components/` or rewriting `background/` feature folders
- Loose files at the `approval/` root
- New screens, strings, commands, storage keys, or permissions

## Tracks

1. Move the flat `shared/` files into the domain folders above, move the two single-caller files onto their surfaces, and point imports at each domain `index.ts`.
2. Split the five source files named above. `PopupMarkup` keeps the shell and delegates screen groups. Home tokens split Jupiter fetch and row merge from the cache. Sign-tx paint moves to `sign-tx-deltas.ts` and is re-exported. Popup state splits navigation and close-empty. Combined add-member screens move to `combined-member-screens.tsx`.
3. Move popup and popout CSS into `styles/` and import them, in the previous order, from each `style.css`. Prefix comments in `ui-messages.ts` mark catalog sections. `approval/tx-ai.css` stays next to the widget.

## Acceptance

- [x] `wallet/src/shared` has no loose `.ts` files; each domain folder has an `index.ts`
- [x] `npm run typecheck --prefix wallet` passes
- [x] No exported function or type was renamed in the move
