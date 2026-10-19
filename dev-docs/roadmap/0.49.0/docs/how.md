# 0.49.0 how

Read the phase you are implementing. Do not implement a second phase in the same session. Phase N is Track N in `INDEX.md`.

Shared rules for every phase:

- Move code. Do not change behavior, copy, class names, command names, or storage keys.
- A new `.ts` file of 50 lines or more starts with an English responsibility comment of at most 100 words.
- Keep each new file under 400 lines.
- Finish with `cd wallet && npm run typecheck`.

## Phase 1 — `style.css`

**Edit:** `wallet/src/popup/style.css`, plus new `*.css` files under the feature folders below.

**Do not edit:** any `.tsx`, `.ts`, or `wallet/src/approval/shell.ts`.

Leave these rules in `style.css`:

- `:root`, element reset, `html` / `body` / `#root` sizing
- `.shell`, `.flow-*`, `.top-bar`, `.screen-body`, `.shell-dock`, `.menu-*`
- `.primary-btn`, `.icon-btn`, `.kind-btn`, `.field`, `.mono-input`, `.fmt`, `.toast-*`, `.error`

Move rules by class prefix into a new file, then `@import` that file from `style.css` using a relative path. Declaration text stays byte-for-byte the same, including order inside each rule. Only the file that holds the rule changes.

If one selector's prefixes belong to two different new files, the whole rule stays in `style.css`. If every prefix on that selector belongs to the same new file, the whole rule moves with that file. `.unlock-screen, .rpc-guide` and `.flow-page .approval-root` stay in `style.css`. `.main-wallet-card .account-name` moves to `accounts.css`.

Phase 1 moves rules only inside `popup/style.css`. It does not edit `popout/style.css` and does not add a popup stylesheet import to the popout entry.

| New file | Prefixes |
|----------|----------|
| `wallet/src/popup/onboarding/onboarding.css` | `.first-run-*`, `.unlock-*`, `.word-*`, `.seed-*`, `.dice-btn`, `.generate-*`, `.count-pill` |
| `wallet/src/popup/accounts/accounts.css` | `.account-card*`, `.account-*` list chrome, `.combined-*`, `.member-*`, `.main-wallet*`, `.main-pick` |
| `wallet/src/popup/settings/settings.css` | `.settings-*`, `.rpc-*`, `.idle-lock-*`, `.keys-*`, `.tx-ai-*`, `.network-pick-*`, `.now-*` |
| `wallet/src/popup/home/home.css` | `.token-list`, `.token-card`, `.token-detail*`, `.token-icon`, `.token-trust*`, `.activity-*` |
| `wallet/src/popup/send/send.css` | `.token-send-*`, `.send-*` |
| `wallet/src/popup/address-cards/address-cards.css` | `.address-card*`, `.addr-chip`, `.addr-row`, `.addr-tag`, `.chip-list` |
| `wallet/src/popup/close-empty/close-empty.css` | `.close-empty-*` |
| `wallet/src/popup/approval-shared.css` | `.connect-*`, `.approval-*` |

`popup/main.tsx` already imports `style.css`. Do not add a second import there. `approval-shared.css` stays under `popup/` because the popup and the approval shell share those classes, and `style.css` imports the sheet. The popout keeps `popout/style.css`. Phase 1 does not edit the popout to load this sheet.

## Phase 2 — `OnboardingScreens.tsx`

**Edit:** `wallet/src/popup/onboarding/`. The folder `index.ts` may re-export the barrel as it does today.

**Do not edit:** `style.css`, `PopupMarkup.tsx`, settings, accounts, approval.

Replace the screen implementations with one file each. `OnboardingScreens.tsx` becomes:

```ts
export { AddAccountChooser, AddImportChooser } from "./add-chooser";
export { ImportSecretScreen } from "./import-secret-screen";
export { ImportSeedScreen } from "./import-seed-screen";
export { GenerateSeedScreen } from "./generate-seed-screen";
export { GenerateBurnerScreen } from "./generate-burner-screen";
export { WatchAccountScreen } from "./watch-account-screen";
export { AboutHub } from "./about-hub";
export { SetupScreen } from "./setup-screen";
export { LockedScreen } from "./locked-screen";
```

`ImportSeedWords` and `ImportSeedPick` stay in `import-seed-screen.tsx`. They are not exported. `AddAccountChooser` and `AddImportChooser` share `add-chooser.tsx`.

Existing flow modules stay: `import-seed-flow.ts`, `import-secret.ts`, `generate-seed-flow.ts`, `generate-burner-flow.ts`, `SetupFlow.tsx`, `RpcGuideScreen.tsx`. Do not fold those into the new screen files and do not move their functions.

Export names stay the same strings `PopupMarkup.tsx` already imports.

## Phase 3 — `SettingsScreens.tsx`

**Edit:** `wallet/src/popup/settings/`.

**Do not edit:** `TxAiSettingsScreen.tsx`, `style.css`, `PopupMarkup.tsx`, onboarding, accounts, approval. `useSettingsIo` stays in `settings-logic.ts`. If a screen file needs it, import it from there. Do not copy it.

`SettingsScreens.tsx` becomes a barrel:

```ts
export { SettingsHub } from "./settings-hub";
export { LocaleScreen } from "./locale-screen";
export { NetworkScreen } from "./network-screen";
export { RpcScreen } from "./rpc-screen";
export { KeysScreen } from "./keys-screen";
export { CuPriceScreen } from "./cu-price-screen";
export { ChangePasswordScreen } from "./change-password-screen";
export { WalletLockSettingsScreen } from "./wallet-lock-screen";
```

`RpcClusterCard` and `RpcEditor` stay unexported in `rpc-screen.tsx`. `IdleAutoLockSection` stays unexported in `wallet-lock-screen.tsx`.

## Phase 4 — `AccountsScreens.tsx`

**Edit:** `wallet/src/popup/accounts/`.

**Do not edit:** `CombinedManage.tsx`, `style.css`, `PopupMarkup.tsx`, onboarding, settings, approval.

`AccountsScreens.tsx` becomes a barrel:

```ts
export { AccountsList } from "./accounts-list";
export { RenameScreen } from "./rename-screen";
export { ManageScreen } from "./manage-screen";
export { RevealScreen } from "./reveal-screen";
export { ConnectedSites } from "./connected-sites";
export { CombinedCreateScreen } from "./combined-create-screen";
```

`AccountCard` stays unexported in `accounts-list.tsx`. Combined member manage, switch, paste, local pick, and member rename stay in `CombinedManage.tsx`.

## Phase 5 — Approval shell as React

**Edit:** `wallet/src/approval/`, `wallet/src/popup/components/ApprovalHost.tsx`, `wallet/src/flow/SignFlowPage.tsx`, `wallet/src/popout/main.tsx`.

**Do not edit:** `style.css`, the three popup screen modules, `sign-tx-body.ts` except for a call site that already exists. Do not add a dependency.

Delete `shell.ts` and `buildApprovalRootHtml`. Hosts render one component, `ApprovalShell`, with the same inputs the mount config carries today: `requestId`, `host` (`"popout"` | `"sidebar"` | `"window"`), and the close / wallet-send reject / wallet-send success callbacks.

`ApprovalHost` and `SignFlowPage` drop `dangerouslySetInnerHTML` and the `appr-` id prefix. The approval shell queries nodes only through refs inside that React root. It does not call `document.getElementById` for an id that has no prefix.

Unmounting the component does the same cleanup as today's `disposeApprovalShell`: stop tx-ai, auto-sim, the sign-tx body, and the expiry, confirmed, and approve-hold timers; abort that mount's DOM listeners; remove the storage and runtime listeners that mount added. It does not add a command or change a payload. `abortWalletSendOnPopupUnload` stays in `ApprovalHost.tsx`.

Do not port the legacy connect block from `buildApprovalRootHtml`. Connect does not render inside `ApprovalShell`.

Popout boot is unchanged up through the connect branch: `kind === "connect"` still renders `ConnectPage`. Every other pending kind renders `ApprovalShell` into the existing `#root` via `createRoot`. A missing `requestId` still replaces the body with the existing error string.

Split the component by screen, each file under 400 lines. Simulation, the CU draft, tx-ai, timers, and listeners may live in further non-screen modules under `wallet/src/approval/`. Each new `.ts` file has one responsibility, an English header when it is 50 lines or more, and stays under 400 lines. Do not put that logic into `sign-tx-body.ts`.

| File | Renders |
|------|---------|
| `ApprovalShell.tsx` | Loads the pending record, picks unlock, expired, sign, or wallet-send status. Owns approve and reject |
| `ApprovalUnlock.tsx` | Password unlock |
| `ApprovalExpired.tsx` | Gone / expired |
| `ApprovalSign.tsx` | Account row, site row, title, error, reject and approve |
| `ApprovalFeeDetails.tsx` | Fee card, transaction details, CU draft, apply CU |
| `ApprovalSendStatus.tsx` | Confirming, failed, confirmed |

`ApprovalSign` renders an empty element and calls the existing `sign-tx-body.ts` mount for the expected-delta card. Do not reimplement delta rows in React in this phase.

Pending records still come from `ui.getPending` on the service worker. This phase does not read pending payloads from `chrome.storage`. Approve, reject, simulate, and abort keep the current command names and payloads. Class names on the elements stay the ones in `style.css` today.
