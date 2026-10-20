# 0.50.0 phase 1 — why the folders should change

Opinion only. Counts below are from `wallet/src` as of this draft: 284 `.ts` / `.tsx` / `.css` files. 84 sit directly inside a top-level folder. 183 sit one level down. `shared/` is 51 files in one directory.

0.14.0 and 0.24.0 already split some responsibilities inside `background/`. 0.49.0 split popup screens. This phase does not repeat that. It says where a file should live.

## Method

1. **Keep the Chrome surface as the top folder.** `background`, `popup`, `popout`, `sidepanel`, `approval`, `flow`, `inject`, `content`, `sandbox`, `offscreen`, and `agent-harness` are entry points. Vite and the manifest address them. Do not merge a feature across those roots.
2. **Group the next level by what changes together**, not by file kind. `components/`, `utils/`, and `lib/` become drawers. `background/simulate`, `background/send`, and `background/close-empty` are the shape to copy.
3. **A folder is a dependency cut.** Surfaces import domain code. Domain code does not import a surface and does not touch `chrome.*`.
4. **About 8–12 loose files in one directory is enough.** Fifty-one files in `shared/` is the failure this phase names.
5. **When a move is later scheduled:** one cluster, paths only, exported names unchanged, behavior unchanged.

`background/` (99 files) is already feature folders. Leave it. `popup/` (87) is already feature folders except `popup/components/` (14 files), which is a kind drawer. Leave that for a later phase. `flow/` (10 files) is still small. Leave it.

## `shared/` target

Keep the directory name `shared` so the cut is folders, not a rename of the layer. Suggested children:

| Folder | Files that belong there |
|--------|-------------------------|
| `i18n` | `ui-messages.ts`, `ui-i18n.ts` |
| `protocol` | `commands.ts`, `bridge.ts`, `storage-keys.ts`, `ext-api.ts` |
| `accounts` | `accounts.ts`, `account-label.ts`, `account-display.ts`, `seed-derive.ts`, `keypair-bytes.ts`, `crypto-vault.ts` |
| `rpc` | `solana-rpc.ts`, `rpc-ws-url.ts`, `rpc-rate-limit.ts`, `helius-api-target.ts` |
| `tx` | `tx-wire.ts`, `compiled-message.ts`, `sign-message-tx.ts`, `simulate-pending-tx-types.ts` |
| `send` | `wallet-send-eligibility.ts`, `wallet-send-amount.ts`, and their tests |
| `close-empty` | `close-empty-fees.ts`, `close-empty-owners.ts`, `close-empty-types.ts`, `close-empty-compute-units.ts`, `close-empty-pack.ts` |
| `tx-ai` | `tx-ai.ts`, `tx-ai-prompt.ts`, `tx-ai-protocol.ts`, `tx-ai-markdown.ts`, `tx-ai.test.ts` |
| `home` | `home-tokens.ts`, `home-activity.ts`, `parsed-token-accounts.ts`, `organic-score-label.ts`, `sanitize-symbol.ts`, and the organic-score test |
| `shell` | `shell-constants.ts`, `window-chrome.ts`, `idle-surface-port.ts` |
| `marks` | `copy-pk-feedback.ts`, `row-expand-chevron.ts`, `brand-icon.ts`, `send-status-mark.ts`, `account-kind-visual.ts` |
| `format` | `format-lamports.ts`, `friendly-error-message.ts`, `uuid.ts` |

`dapp-approval-notice.ts` can sit in `protocol` or `shell`. Either is fine; pick one when a move is scheduled. It is imported from both `background/messaging` and `popup/state`.

`marks` stays under `shared/` because approval and popup both import those modules. Moving them into `popup/` would point approval at popup.

The widest clusters are `protocol` and `accounts`. The narrowest, and the least tangled if a later session wants a first physical move, are `close-empty` and `tx-ai`. That order is a suggestion, not a track in this draft.

## Other loose files, not this phase

`approval/` still has `ApprovalShell.tsx`, `sign-tx-body.ts`, `tx-ai-widget.ts`, `tx-ai.css`, and `format.ts` beside `shell/`, `dom/`, `components/`, and `cards/`. A later phase could put the sign-transaction body and the tx-ai widget next to the shell pieces they serve. This phase only notes that. It does not schedule the move.

`popup/components/` mixes home lists, password fields, brand marks, and icons. A later phase could put each next to the screen that owns it. This phase leaves them.

## What this opinion refuses

Do not introduce a top-level `features/send` that contains both the service worker and the popup. The extension's load units are the surfaces. Domain code that both sides need goes through `shared/<domain>`, which has no `chrome.*`.

## The questions this layout is answering

A folder tree is a claim about dependency and about what a person is allowed to open together. The table above is the claim. These are the questions that produced it.

**What is the compile unit?** In this extension the unit is a Chrome surface: the service worker, the popup, the side panel, the popout, the inject script, the content script, the sandbox, the offscreen document. Those processes do not share a heap. A folder that mixes `chrome.runtime` with React, or the vault with the sandbox, lies about that. So the top of `wallet/src` stays a list of surfaces even when a feature (send, close-empty, tx-ai) exists on more than one of them. The repeated name is the cost of an honest process boundary.

**What may import what?** Three layers, and only downward:

1. A surface (`background/send`, `popup/close-empty`, `approval/shell`) may import another module in the same surface and may import `shared/`.
2. `shared/<domain>` may import another `shared/` domain only when the dependency is a type or a pure function that domain already owns. It may not import a surface. It may not call `chrome.*`.
3. Nothing imports the service worker to "reuse" a command. The command's pure part, if two surfaces need it, already has to live in `shared/` or be duplicated on purpose.

Today `shared/` is one directory, so that rule is invisible. A file next to `crypto-vault.ts` looks as free to import as `format-lamports.ts`. Subfolders do not enforce the rule. They make a violation obvious in the import path. That is the whole point of the move. A lint or a project-reference boundary could come later. This phase does not add one.

**What changes together?** The test I used is the filename prefix and the existing `background/<feature>` twin, not a measured churn log. `close-empty-*` already has `background/close-empty` and `popup/close-empty`. `tx-ai*` already has `background/tx-ai` and approval widgets. Those are domains. `uuid.ts` beside `crypto-vault.ts` is not a domain. It is leftover from "put it in shared because two files imported it."

**Who is the reader?** An agent opening `wallet/src` should be able to ignore four fifths of the tree. `shared/tx-ai` is a place to stop. `shared/tx-ai-prompt.ts` sitting among fifty siblings is not. The 8–12 file cap is for that scan, not an aesthetic grid.

## The questions I considered and rejected as the top cut

**Group by type** (`components`, `hooks`, `utils`, `types`). This is how `shared/` and `popup/components/` already fail. Types of a command belong with the command. A util used by one feature belongs with that feature. A global `utils/` folder has no dependency rule, so every feature eventually imports it and it imports a feature back.

**Group by feature at the repository root** (`src/features/send/{background,ui,shared}`). This matches how a product person names the work, and it keeps a send change in one directory. I rejected it as the top cut because the bundler and the manifest do not load "send". They load a surface. A feature root also invites the service-worker file and the React file to import each other through a local `index.ts`, which hides the process boundary. The same idea is still right one level down: inside `background/` and inside `popup/`, features are already the folders. Phase 1 copies that idea into `shared/` only.

**Rename `shared` to `domain` or `kernel`.** The name `shared` is weak. It records a historical accident ("imported from two places") rather than a role. I still keep the name in this phase. A rename touches every import in the extension and teaches nothing that subfolders do not already teach. If a later phase renames the layer, do it in one change with no other moves.

**One file per concept, deeper trees.** `shared/accounts/label.ts` instead of `shared/accounts/account-label.ts` feels tidy and throws away the string you grep for. Depth beyond `shared/<domain>/<file>` is not earned until a domain itself exceeds the file cap. `accounts` might, later. Nothing else in the table does.

**Split the large files in the same effort.** A 2,000-line `ui-messages.ts` inside `shared/i18n/` is still one responsibility sitting in one file. Moving it does not make the catalog reviewable. Mixing the split into the move makes both diffs unreadable. The layout opinion and the file-size opinion are different changes.

## Where the same name already exists twice

This is the structural fact the flat `shared/` hides.

| Name | Surface today | Pure part today |
|------|----------------|-----------------|
| close-empty | `background/close-empty`, `popup/close-empty` | six `shared/close-empty-*` files |
| tx-ai | `background/tx-ai`, `approval/tx-ai-*` | five `shared/tx-ai*` files |
| send | `background/send`, `popup/send` | `shared/wallet-send-*` |
| home tokens / activity | `background/home-tokens`, `background/home-activity` | `shared/home-tokens.ts`, `shared/home-activity.ts` |
| session / vault | `background/session`, `background/wallet/commands/session` | `shared/crypto-vault.ts`, `shared/keypair-bytes.ts`, `shared/seed-derive.ts` |

The surface folder should hold I/O: RPC, `chrome.storage`, pending maps, React state. The `shared/` folder of the same name should hold the types and the pure decisions both sides must agree on (what is closable, what the command payload is, how a lamport string becomes a label). If a later move finds a `shared/` file that only one surface imports, that file is in the wrong tree. It goes back to that surface. I did not run that check across all 51 files. I only checked the mark helpers, and those are genuinely cross-surface.

`accounts` in the table is the awkward one. It mixes three roles: the stored account record (`accounts.ts`, labels), key material (`crypto-vault.ts`, `seed-derive.ts`, `keypair-bytes.ts`), and pixels (`account-kind-visual.ts`, which I put in `marks` instead). Custody and the account list change for different reasons. Putting the vault next to the label is a convenience because both are "about accounts," and it is the grouping I am least sure of. A stricter cut is `shared/accounts` for records and labels, and `shared/vault` for derive, key bytes, and the password box. I would split them if the move happens. I would not leave key material in a folder whose name sounds like a UI model.

`home` has a similar softness. Token rows and activity rows share icons and mints, and they are still different screens. `organic-score-label` and `sanitize-symbol` are display helpers that approval deltas also use. They might belong in `marks` or next to `tx`. I parked them in `home` because that is where the types they format are declared. That parking is reversible.

`format` is the drawer I am willing to delete. `uuid`, lamports, and friendly errors do not change together. If each has a single caller domain, each should move there, and `format/` should not be created. I listed it so the leftovers have a name. It is the first folder I would drop.

## What folders will not fix

- **Cycles.** `protocol` (commands, storage keys) will be imported by almost every other shared folder, and it will be tempted to import them back for payload types. The rule is: `protocol` owns the message envelope and the storage key names. Payload types live in the domain (`shared/tx`, `shared/send`). `protocol` may depend on those types. Those domains may depend on the envelope. They may not depend on each other through a barrel that re-exports everything. A single `shared/index.ts` that exports the world would recreate the flat directory as an import. Do not add that barrel.
- **The service worker as a grab bag.** `background/handlers` and `background/wallet/commands` are the other flat-ish areas. Phase 1 leaves them. Grouping `shared/` does not make command files smaller or give them a home. That is a later cut, and the 150-line command rule already describes it.
- **Approval as both a surface and a feature.** `approval/` is an entry (the shell) and a product area (sign, connect is in `flow/`). Loose files at its root are unfinished placement, not a missing top-level concept. I would not invent `src/approval-feature/` beside it.
- **Discoverability by search.** Anyone who greps an exported function name finds the file wherever it sits. Folders help the person who does not yet know the name. They do not replace a responsibility header, and they do not justify a move that breaks that grep for a release without a path-only diff.

## Order, if this opinion is ever applied

Apply the dependency rule before applying the aesthetic. Suggested physical order, still not a track:

1. `close-empty` and `tx-ai`, because the surface twins already exist and the file set is prefix-closed.
2. `tx`, `send`, `rpc`, `shell`, `marks`, which are small and rarely imported by each other.
3. `i18n`, as a move of two files, explicitly without splitting `ui-messages.ts`.
4. `accounts` versus `vault`, decided at that moment, not by the table alone.
5. Leftovers (`uuid`, friendly errors, `dapp-approval-notice`). Each goes to its real caller or to `protocol`. No `format/` unless three unrelated files are still homeless.

After each step the extension typechecks and the import arrows still point from surfaces into `shared/`, never back. If a step needs a behavior change to break a cycle, stop. The cycle is a finding. It is not something this layout is allowed to paper over.
