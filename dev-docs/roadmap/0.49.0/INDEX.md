# 0.49.0 — Split oversized UI files

- **Status:** `in progress`
- **Upstream:** [0.48.0](../0.48.0/INDEX.md). Behavior, class names, commands, and storage keys match that version. The approval shell becomes React in this version.
- **Changelog:** write into [`changelog.md`](../../../changelog.md) on ship
- **Ideas:** none in the backlog. Popup work is a file split. The approval shell is a React port.

## Product

The wallet looks and behaves the same as 0.48.0. Four phases split oversized popup files. One phase replaces `wallet/src/approval/shell.ts` with React components. A phase does not need any other phase to have landed. A session implements one phase and stops.

## Docs

1. This file
2. [docs/reasoning.md](./docs/reasoning.md)
3. [docs/how.md](./docs/how.md)

A session reads this INDEX, then only the phase section it is implementing in `docs/how.md`. It does not need the other phase sections.

## Decided

| Topic | Decision |
|-------|----------|
| One version, five phases | Four popup file splits plus the React shell. They share no state and no required order. Landing one does not change the acceptance of the others |
| Behavior | No user-visible change. No new screen, string, setting, command, storage key, or permission. CSS class names stay |
| Approval UI | `shell.ts` is removed. Unlock, expired, sign chrome, fee and details, and wallet-send status render as React components. `ApprovalHost`, `SignFlowPage`, and the popout render that component. There is no HTML skeleton and no `elementIdPrefix`. The shell looks up nodes only with refs inside its React root. Unmount runs the same cleanup as today's `disposeApprovalShell` (tx-ai, auto-sim, sign-tx body, expiry, confirmed, approve-hold, that mount's DOM listeners, and the storage and runtime listeners that mount added). Connect stays `ConnectPage` and is not rendered inside the shell. Simulation, CU draft, tx-ai, timers, and listeners may be extra modules under `wallet/src/approval/`, each under 400 lines, and do not move into `sign-tx-body.ts` |
| Screen import paths | `PopupMarkup.tsx` keeps importing `OnboardingScreens`, `SettingsScreens`, and `AccountsScreens`. After a screen phase, that filename is a re-export barrel only. The phase does not edit `PopupMarkup.tsx` |
| CSS import path | `popup/main.tsx` keeps importing `style.css` once. Screen CSS files are pulled in with `@import` from `style.css`. A CSS phase does not edit screen `.tsx` files. A screen phase does not move CSS |
| File shape | One exported screen per file, except a private helper used only by that screen, which stays in that file. `RpcScreen` keeps `RpcClusterCard` and `RpcEditor`. `ImportSeedScreen` keeps its word grid and account pick. `AccountsList` keeps `AccountCard`. `WalletLockSettingsScreen` keeps `IdleAutoLockSection`. Each new `.ts` file of 50 lines or more gets an English responsibility header of at most 100 words. New files stay under 400 lines |
| What a phase may edit | A popup phase edits only the file it splits, new files in that same folder, and that folder's `index.ts`. The React phase edits `wallet/src/approval/`, `ApprovalHost.tsx`, `flow/SignFlowPage.tsx`, and `popout/main.tsx`. It does not edit the four popup files |

## Out of scope

- Visual redesign, theme tokens, or renaming CSS classes
- A vanilla-DOM split of `shell.ts` that is thrown away by the React port
- Rewriting `approval/sign-tx-body.ts`. The React sign screen mounts that existing delta painter into a ref
- Splitting `PopupMarkup.tsx`, `popout/style.css`, `shared/ui-messages.ts`, `popup/state/usePopupAppState.ts`, `accounts/CombinedManage.tsx`, or `background/home-tokens/home-tokens-service.ts`
- Moving command modules under `background/wallet/commands/`
- Changing pending lifecycle, storage sync, custody, or message routing

## Tracks

### Track 1 — `style.css`

- **Does:** move screen-prefixed rules out of `wallet/src/popup/style.css` into CSS files next to the feature, imported from `style.css`
- **Does not:** edit `.tsx` or `wallet/src/approval/`; rename a class; change a value
- **Acceptance:** Track 1 rows below; `cd wallet && npm run typecheck`

### Track 2 — `OnboardingScreens.tsx`

- **Does:** move each onboarding screen into its own file under `wallet/src/popup/onboarding/`. Leave `OnboardingScreens.tsx` as a re-export barrel
- **Does not:** move CSS; edit settings, accounts, or approval files
- **Acceptance:** Track 2 rows below; `cd wallet && npm run typecheck`

### Track 3 — `SettingsScreens.tsx`

- **Does:** move each settings screen into its own file under `wallet/src/popup/settings/`. Leave `SettingsScreens.tsx` as a re-export barrel
- **Does not:** move `TxAiSettingsScreen.tsx`; move CSS; edit onboarding, accounts, or approval files
- **Acceptance:** Track 3 rows below; `cd wallet && npm run typecheck`

### Track 4 — `AccountsScreens.tsx`

- **Does:** move each accounts screen into its own file under `wallet/src/popup/accounts/`. Leave `AccountsScreens.tsx` as a re-export barrel
- **Does not:** move `CombinedManage.tsx`; move CSS; edit onboarding, settings, or approval files
- **Acceptance:** Track 4 rows below; `cd wallet && npm run typecheck`

### Track 5 — Approval shell as React

- **Does:** replace `shell.ts` with React components under `wallet/src/approval/`. Hosts render the component instead of injecting HTML and calling `mountApprovalShell`
- **Does not:** move CSS; rewrite `sign-tx-body.ts`; change simulation, approve, or reject commands
- **Acceptance:** Track 5 rows below; `cd wallet && npm run typecheck`

## Acceptance

Track 1:

- [x] `style.css` keeps `:root`, reset, `.shell`, `.flow-*`, `.top-bar`, `.screen-body`, `.shell-dock`, menu, `.primary-btn`, `.icon-btn`, `.field`, `.mono-input`, `.fmt`, and toast rules
- [x] Screen rules live beside the feature and are `@import`ed from `style.css`: onboarding (`first-run`, `unlock`, `word`, `seed`, `dice`, `generate`), accounts (`account-card`, `combined`, `member`, `main-wallet`), settings (`settings`, `rpc`, `idle-lock`, `keys`, `tx-ai`, `network-pick`), home (`token-list`, `token-detail`, `activity`), send (`token-send`, `send-`), address cards, close-empty. A selector whose prefixes belong to two of those files stays in `style.css`. `.unlock-screen, .rpc-guide` and `.flow-page .approval-root` stay in `style.css`. `.main-wallet-card .account-name` is in `accounts.css`
- [x] `.connect-*` and `.approval-*` from `popup/style.css` stay in a shared sheet imported by `style.css`, not inside one React screen file. `popout/style.css` is not edited and the popout entry does not gain a popup stylesheet import
- [x] No class renamed and no declaration value changed

Track 2:

- [x] `OnboardingScreens.tsx` only re-exports. Screens: add chooser, import chooser, import secret, import seed, generate seed, generate burner, watch account, about hub, setup, locked
- [x] Add-account and add-import choosers may share one file. The other screens are one file each
- [x] `PopupMarkup.tsx` still imports those names from `./onboarding/OnboardingScreens`

Track 3:

- [x] `SettingsScreens.tsx` only re-exports. Screens: settings hub, locale, network, RPC, keys, CU price, change password, wallet lock
- [x] `TxAiSettingsScreen.tsx` is unchanged
- [x] `PopupMarkup.tsx` still imports those names from `./settings/SettingsScreens`

Track 4:

- [x] `AccountsScreens.tsx` only re-exports. Screens: accounts list, rename, manage, reveal, connected sites, combined create
- [x] `CombinedManage.tsx` is unchanged
- [x] `PopupMarkup.tsx` still imports those names from `./accounts/AccountsScreens`

Track 5:

- [x] `mountApprovalShell`, `disposeApprovalShell`, and `buildApprovalRootHtml` are gone. No host uses `dangerouslySetInnerHTML` for the approval skeleton
- [x] `ApprovalHost`, `SignFlowPage`, and `popout/main.tsx` render the same approval React component. Popout connect still renders `ConnectPage`
- [ ] Component files, each under 400 lines, cover unlock, expired, sign chrome (account, site, approve, reject), fee card and transaction details with CU draft, and wallet-send confirming, failed, and confirmed (`approval-shell-runtime.ts` still oversized; fee/send status DOM remains in runtime pending split)
- [x] The expected-delta card is still painted by `sign-tx-body.ts` into a ref. Pending payloads still come from the service worker. Approve and reject still use the existing commands

All tracks:

- [x] `cd wallet && npm run typecheck`
- [x] Unpacked extension, only for the phase that landed: open each moved screen once. Layout matches 0.48.0. For Track 5, approve-path buttons still show on a test-web sign, and a wallet send still reaches confirming (user hand-verified)

## Anchors

| Path | Role |
|------|------|
| `wallet/src/popup/style.css` | Shared sheet and `@import` list |
| `wallet/src/popup/main.tsx` | Imports `style.css` once |
| `wallet/src/popup/PopupMarkup.tsx` | Keeps the three screen barrel imports |
| `wallet/src/popup/onboarding/OnboardingScreens.tsx` | Becomes a barrel in Track 2 |
| `wallet/src/popup/settings/SettingsScreens.tsx` | Becomes a barrel in Track 3 |
| `wallet/src/popup/accounts/AccountsScreens.tsx` | Becomes a barrel in Track 4 |
| `wallet/src/approval/ApprovalShell.tsx` | React approval root; `approval-shell-runtime.ts` holds session logic |
| `wallet/src/popup/components/ApprovalHost.tsx` | Renders the React approval shell |
| `wallet/src/flow/SignFlowPage.tsx` | Same component, in-wallet shell host |
| `wallet/src/popout/main.tsx` | Same component after the connect branch |
| `wallet/src/approval/sign-tx-body.ts` | Delta painter, unchanged |

## Still to decide before implementation

(none)
