# 0.48.0 — Idle lock and API key edit actions

- **Status:** `shipped`
- **Upstream:** [0.47.1](../0.47.1/INDEX.md). Lock still means [session.lock](../../../wallet/src/background/session/session.ts): drop in-memory unlock material and remove `SESSION_UNLOCKED`. Secret rows are the 0.46.0 `SecretKeyField`.
- **Changelog:** write into [`changelog.md`](../../../changelog.md) on ship
- **Ideas:** [Idle lock](../backlog/idle-lock.md), [API key edit actions](../backlog/api-key-edit-actions.md). This INDEX wins.

## Product

Two settings control idle auto-lock. The switch defaults to on. The minute count defaults to 10 and is used only while the switch is on. The timer runs only while the switch is on, the wallet is unlocked, and no wallet surface is open. Any open wallet surface is in use, including Settings. Opening a surface resets the count to the full minute setting. When the count finishes, the wallet locks the same way as a manual lock.

On the Helius, Jupiter, and OpenRouter secret rows, idle still shows the eye and the pencil. Edit shows confirm and discard only.

The Network settings screen lists only Devnet and Mainnet to choose. It does not show an RPC URL under either row. RPC endpoints stay on the RPC settings screen.

## Docs

1. This file
2. [docs/reasoning.md](./docs/reasoning.md)
3. [docs/how.md](./docs/how.md)

## Decided

| Topic | Decision |
|-------|----------|
| Settings | `idleAutoLockEnabled` (boolean, default `true`) and `idleAutoLockMinutes` (integer, default `10`). Both are on `Settings` and on `PublicSettings`. They are not vault secrets. Missing keys on older stored settings read as those defaults. Do not bump schema generation |
| Minute range | A whole number from **1** through **1440**. A patch outside that range is rejected and storage is unchanged. The field stays editable while the switch is off |
| Where it is shown | Settings hub row **Wallet lock settings** (below Default CU price). That subpage has one **idle auto-lock** panel (switch and **Lock after (minutes)** on the same card), then a row **Wallet lock password** for change password. Strings go in the three locale catalogs |
| When the timer runs | Switch on, `session.isUnlocked()` true, and zero wallet surfaces. Already locked: no timer |
| Wallet surface | An open toolbar popup, side panel, or approval popout. A page inside one of those (Home, Settings, a sign screen hosted in the shell) is the same surface. The timer does not care which page is showing |
| Clock | `chrome.alarms` in the service worker, alarm name `airwave.idleLock`. One alarm. `delayInMinutes` is the stored minute setting. Create a new alarm in only two cases: the last `airwave-idle-surface` port disconnects and the port count is zero while the timer is allowed, or a successful minute write or an enable-on happens while no surface is open. That last-disconnect create does not look at `getContexts`. A context that has not left the list yet is the document that just closed. Other still-open popup, side panel, or popout ports still clear and do not create. A service-worker start never creates an alarm. If `airwave.idleLock` is already scheduled, that time stays. If none is scheduled, start does not add one. Clear the alarm when any surface is open, when the switch turns off, or when the wallet locks. A rejected minute patch does not write storage and does not clear or replace the alarm |
| Reset | Opening a surface clears the alarm. The next countdown, after the last surface closes, uses the full stored minutes. Elapsed time is not stored |
| Lock | The alarm handler calls `session.lock()` and then clears the alarm. It does not add a second lock path and it does not reject pending requests. If a surface is open when the alarm fires, it does not lock |
| Surfaces across worker restarts | Popup, side panel, and popout each connect a port named `airwave-idle-surface` while that document is open, and connect again if that port drops while the document is still open. The side panel keeps its existing `airwave-sidebar-surface` port for the 0.39.0 close-rejects-sign behavior. On service-worker start and on alarm fire, an open surface is a live `airwave-idle-surface` port **or** `chrome.runtime.getContexts` reporting a popup, a side panel, or a document URL that includes `src/popout/index.html` (the popout URL may include a `requestId` query). Any of those clears the alarm, does not create one, and does not lock. The last-port-disconnect create in the Clock row does not use this `getContexts` check |
| API key rows | `SecretKeyField` idle: eye and pencil. `editing`: confirm and discard, no eye. `loading` (plaintext not in the draft yet): no confirm, no discard, no eye. Reveal on the idle row is unchanged |
| Network picker | `NetworkScreen`: radio rows for Devnet and Mainnet only. No RPC URL or unset-RPC subtext on that screen |

## Out of scope

- Locking because the machine sleeps, the screen locks, or Chrome quits
- A PIN or a second password
- Changing vault encryption
- Rejecting or dismissing a pending request because the idle lock fired
- OS idle or `chrome.idle`
- Preset minute chips
- Reveal, storage, or read-path changes for the three secret fields
- Schema-generation bump

## Tracks

### Track 1 — Idle auto-lock

- **Does:** settings fields, Settings controls, `alarms` permission, surface ports, alarm create / clear / fire, `session.lock()` on fire
- **Does not:** the secret-row action change; out of scope
- **Acceptance:** the idle-lock rows below; `cd wallet && npm run typecheck`

### Track 2 — API key edit actions

- **Does:** hide the eye in `loading` and `editing` on all three `SecretKeyField` rows
- **Does not:** idle-lock; reveal on the idle row
- **Acceptance:** the API key rows below; `cd wallet && npm run typecheck`

### Track 3 — Network picker UI

- **Does:** remove RPC URL subtext from `NetworkScreen` in `SettingsScreens.tsx`
- **Does not:** RPC screen behavior; cluster patch behavior
- **Acceptance:** the Network picker row below; `cd wallet && npm run typecheck`

The tracks do not share state. Any may land first.

## Acceptance

- [x] New install and an existing settings blob with neither key: switch off, minutes 10. The timer does not run
- [x] Turning the switch on, then closing the last popup, side panel, and popout, locks the wallet after the stored minutes. Unlock still asks for the password. The vault blob is unchanged
- [x] With the switch on and the wallet unlocked, an open popup or side panel (including Settings) does not start the timer. Closing it starts a full countdown
- [x] Opening a popup, side panel, or sign popout during a countdown clears it. Closing the last surface starts a full countdown again
- [x] A visible sign-transaction or sign-message screen (in the shell or the popout) does not let the timer run
- [x] Already locked: no alarm is left scheduled
- [x] Minutes outside 1–1440 do not change storage. Turning the switch off clears a running alarm
- [x] Idle secret row: eye and pencil. Edit: confirm and discard, no eye. Confirm still writes; discard still does not
- [x] Network settings: only Devnet and Mainnet labels; no RPC URL under either option
- [x] `cd wallet && npm run typecheck`
- [x] Unpacked extension: settings switch and minutes; one idle lock after the popup is closed; one secret row edited with no eye

## Anchors

| Path | Role |
|------|------|
| `wallet/src/shared/storage-keys.ts` | `Settings`, defaults, `toPublicSettings` |
| `wallet/src/background/storage/storage-io.ts` | Read missing keys as defaults |
| `wallet/src/background/wallet/commands/settings-command.ts` | `wallet.patchSettings` |
| `wallet/src/background/session/session.ts` | `lock()` |
| `wallet/src/popup/main.tsx` | Popup surface port |
| `wallet/src/sidepanel/main.tsx` | Side panel surface port |
| `wallet/src/popout/main.tsx` | Popout surface port |
| `wallet/src/popup/settings/SecretKeyField.tsx` | Eye only while idle |
| `wallet/manifest.config.ts` | `alarms` permission |
| `wallet/src/shared/ui-messages.ts` | Locale strings |

## Still to decide before implementation

(none)
