# Code design principles

How `wallet/src` is written, split, and grouped. An INDEX overrides this file when it says so. Screen layout and copy live in [ui-design-principles.md](./ui-design-principles.md). Standing architecture bans (pending, storage, custody, messages) live in [roadmap/GUIDELINES.md](./roadmap/GUIDELINES.md).

How `shared/` is grouped is [roadmap/0.50.0/INDEX.md](./roadmap/0.50.0/INDEX.md). The reasoning for that cut is [roadmap/0.50.0/docs/reasoning.md](./roadmap/0.50.0/docs/reasoning.md). This file is the rule for new code.

## 1. One responsibility

A file does one thing a reader can name in a sentence. The neighboring step (the caller, the I/O, the next screen) is a different file.

- Do not grow a file so that one comment has to say "and". If the comment needs a second responsibility, split.
- Do not paper over a second responsibility with `related logic`, `etc.`, or `and so on`.
- Do not split one responsibility into one file per function, or one file per `handle*`, unless that handler is the whole responsibility.
- A pure data table file only holds that table.
- Tests sit next to the module they exercise.

## 2. Source-file responsibility comments

For `.ts` files under `wallet/src`:

- Every `.ts` file has an English block comment at the top of what the file is responsible for. Length does not make the header optional.
- If you edit a file that has no header (including an import-only edit), add the header in the same change.

Write **complete sentences** a person can read aloud. Length follows the file, not a sentence quota. A thin module is one or two sentences. A boundary file (a command, a service, a protocol adapter, the password box) may be a short paragraph: why the file exists, what it owns, and which neighboring step does the rest. Do not pad a thin file into a paragraph. Do not write a spec, a method catalog, or a changelog. At most **150 words**. If you need more, the file is doing two jobs: split it.

Do not use headline fragments, colon lists, or "X vs Y" as the whole comment.

- If the comment needs a second different responsibility, split the file. Do not lengthen the comment.
- Do not paper over a second responsibility with `related logic`, `etc.`, or `and so on`.
- `index.ts` says, in the same prose, that it re-exports this folder's public surface (it may name subfolders).
- A pure data table only says which table it is.

## 3. When to split

Count **code lines** only: physical lines that have code. **Blank lines do not count.** Comment lines do not count: a full-line `//` comment, and every line of a `/* */` block (including the file header). A line that mixes code and an end-of-line `//` comment still counts as one code line. The same count is the 150-line command rule and the 400-line split rule. The file header in section 2 is required at any length.

- If one change touches a `.ts`, `.tsx`, or `.css` file over **400** code lines, review whether to split it. New files from that split stay under 400 code lines.
- Command files under `background/wallet/`: under **150** code lines stay one file. At 150 code lines or more, move the group into that command's folder and keep functions that change together in the same module. The 150-line rule does not recurse. A module inside the folder may exceed 150 code lines if the comment is still one responsibility and the file stays under 400 code lines.
- A split does not change behavior, exported names, CSS class names, commands, or storage keys unless the INDEX says so.
- Do not split a large file in the same change that moves it to another folder. A path change and a responsibility change are different diffs.

Opening a version reminds the user of files that miss these sizes or headers. The reminder does not itself schedule a split. The thresholds are in the version-delivery skill.

## 4. Folder structure

A folder is a module boundary, not a label.

**Top level is the Chrome surface.** `background`, `popup`, `popout`, `sidepanel`, `approval`, `flow`, `inject`, `content`, `sandbox`, `offscreen`, and `agent-harness` are separate processes or entries. Do not create `src/features/<name>` that holds both the service worker and the React view. The same product name may exist under more than one surface. That repeat is the process boundary.

**Inside a surface, group by what changes together.** `background/send` and `popup/send` are the shape. Do not add a `components/`, `hooks/`, `utils/`, or `types/` drawer as the primary cut. A type lives with the module that owns the value. A helper used by one feature lives in that feature.

**`shared/` is domain code both surfaces need**, not a junk drawer for "imported twice."

- A surface may import `shared/`. `shared/` does not import a surface and does not call `chrome.*`.
- Group `shared/` by domain (`tx-ai`, `close-empty`, `rpc`), one more directory, not a deeper tree, until that domain itself is too wide to scan (about 8–12 files).
- The surface folder holds I/O: RPC, `chrome.storage`, pending maps, React state. The matching `shared/` folder holds types and pure decisions both sides must agree on.
- A `shared/` file that only one surface imports belongs in that surface.
- Key material (derive, key bytes, the password box) does not live in a folder whose name sounds like a UI model.
- Do not add `shared/index.ts` that re-exports every domain. That recreates the flat directory as an import. Each domain folder's `index.ts` is that domain's public surface. Callers outside the folder use it, not a deep path into a sibling, once the folder exists.
- `protocol` (command envelopes, storage key names) may depend on a domain's payload types. Domains may depend on the envelope. They do not reach back through a barrel that exports everything. If a move needs a behavior change to break a cycle, stop. The cycle is a finding.

**Names stay greppable.** Do not rename `account-label.ts` to `label.ts` just because the parent folder is `accounts`. A rename of the `shared` layer itself is a separate change from creating subfolders.

**CSS and copy are the exception to “group by what changes together.”** They are catalogs you search. Do not move them back beside each feature folder.

- Message keys stay in `shared/i18n/ui-messages.ts`. Prefix comments mark sections. Do not split the catalog into one file per prefix.
- Popup CSS lives in `popup/styles/`, imported in order from `popup/style.css`. Popout CSS lives in `popout/styles/`, imported from `popout/style.css`.
- A CSS file sits next to a component only when those classes belong to that component alone. `approval/tx-ai.css` is that case. Shared controls stay in the catalog.

## 5. What a change may mix

A single change is one of these, not several:

- A behavior change the INDEX describes.
- A file split (same folder, same names, smaller files).
- A folder move (same files, new paths, imports updated).

Custody, pending, and storage rules in GUIDELINES still apply. A layout change does not relax them.
