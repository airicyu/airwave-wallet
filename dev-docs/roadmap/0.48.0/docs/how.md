# 0.48.0 — how

## Track 1 — Idle auto-lock

### Settings

Add to `Settings` and `DEFAULT_SETTINGS` in `wallet/src/shared/storage-keys.ts`:

- `idleAutoLockEnabled: boolean` — default `true`
- `idleAutoLockMinutes: number` — default `10`

`toPublicSettings` already spreads the rest of `Settings`. Both fields stay on `PublicSettings`. Do not omit them.

In `normalizeSettings` (`wallet/src/background/storage/storage-io.ts`), a missing enabled flag becomes `true`; explicit `false` stays off; any other non-boolean enabled value becomes `true`. A missing minute value, or a value that is not an integer from 1 through 1440, becomes `10` on read of old data. A **patch** whose `idleAutoLockMinutes` is not an integer in 1–1440 returns an error and does not call `writeSettings`. A patch may set `idleAutoLockEnabled` alone.

No schema-generation change.

### Settings UI

On **Wallet lock settings** (`settings-wallet-lock`), one switch bound to `idleAutoLockEnabled` and one minute field bound to `idleAutoLockMinutes`. The Settings hub lists that subpage below Default CU price. A row on that subpage opens **Wallet lock password** (`settings-password`, change-password flow). Persist through the existing `wallet.patchSettings` path. The minute field is editable while the switch is off. Failed patch: leave the stored value, show the page's existing error surface.

Catalog keys (Traditional Chinese, Simplified Chinese, English):

- Switch label: idle auto-lock
- Minute label: minutes

Do not add a sentence that explains when the timer runs.

### Permission

Add `"alarms"` to `permissions` in `wallet/manifest.config.ts`.

### Surfaces

New port name in `wallet/src/shared/shell-constants.ts`: `airwave-idle-surface`.

Connect it when each of these documents loads. If the port disconnects and that document is still open, connect again. Disconnect only when the document unloads:

- `wallet/src/popup/main.tsx`
- `wallet/src/sidepanel/main.tsx`
- `wallet/src/popout/main.tsx`

Do not connect it from a content script or the sandbox. Do not remove `SIDEBAR_SURFACE_PORT`.

The service worker keeps a count of connected `airwave-idle-surface` ports. `onConnect` increments. `onDisconnect` decrements, not below zero.

### Alarm

Module under `wallet/src/background/` (one responsibility: schedule and fire idle lock). Alarm name: `airwave.idleLock`.

A surface is open for **service-worker start** and **alarm fire** when the `airwave-idle-surface` port count is greater than zero, or when `chrome.runtime.getContexts` reports a `POPUP` context, a `SIDE_PANEL` context, or an extension page whose `documentUrl` includes `src/popout/index.html`. Match with `includes`, the same way `POPOUT_PAGE_PATH` is used. Do not require the URL to equal that path: the popout URL has a `requestId` query, and the pathname has a leading slash.

`syncIdleLockAlarm(replaceScheduled)`:

1. Read settings and `session.isUnlocked()`.
2. If the switch is off, or the session is locked: `chrome.alarms.clear("airwave.idleLock")` and return.
3. If `replaceScheduled` is false and a surface is open (port count or `getContexts`, as above): clear and return.
4. If `replaceScheduled` is false and `chrome.alarms.get("airwave.idleLock")` already returns an alarm, return. Do not create.
5. If `replaceScheduled` is false and no alarm exists, return. Do not create. Service-worker start does not start a new countdown.
6. If `replaceScheduled` is true and the port count is greater than zero, clear and return. Do not consult `getContexts` on this path.
7. If `replaceScheduled` is true and the port count is zero: clear if one exists, then `chrome.alarms.create("airwave.idleLock", { delayInMinutes: idleAutoLockMinutes })`.

`replaceScheduled` is true only for a successful write of `idleAutoLockMinutes` or `idleAutoLockEnabled` turning on, and for a surface port disconnect that leaves the port count at zero. It is false for service-worker start, unlock, a surface connect, alarm fire, and a successful write that only turns the switch off (step 2 already cleared). A rejected minute patch does not write and does not call `syncIdleLockAlarm()`.

Call sites:

- surface port connects: `syncIdleLockAlarm(false)`
- surface port disconnects and the port count is still greater than zero: `syncIdleLockAlarm(false)`
- surface port disconnects and the port count is zero: `syncIdleLockAlarm(true)`
- `wallet.patchSettings` successfully writes `idleAutoLockMinutes`, or sets `idleAutoLockEnabled` to true: `syncIdleLockAlarm(true)`
- `wallet.patchSettings` sets `idleAutoLockEnabled` to false: `syncIdleLockAlarm(false)`
- `session.lock()` finishes (manual or idle): `syncIdleLockAlarm(false)`
- unlock succeeds: `syncIdleLockAlarm(false)`
- service worker starts (after session hydrate): `syncIdleLockAlarm(false)`

`chrome.alarms.onAlarm` for this name:

1. If a surface is open (port count or `getContexts`), do not lock. Call `syncIdleLockAlarm(false)`, which clears the alarm.
2. If the switch is off or the session is locked, clear the alarm and return.
3. Otherwise `await session.lock()` and clear the alarm.

`getContexts` counts a document that is still open after the worker restarted, before its port connects again. It is not used when the last port has just disconnected. That disconnect creates the alarm from the close.

Do not write the deadline into `chrome.storage`. Do not reject pending requests in this handler.

### Track 1 checks

- Switch off: `chrome.alarms.get("airwave.idleLock")` is empty after unlock and after the popup closes.
- Switch on, minutes 1 (the minimum): close every wallet surface and wait. The wallet is locked. `session` memory is clear. Stored settings still have the switch on.
- Open the popup during that wait: the alarm is cleared. Close it: a new alarm exists.
- Patch minutes to `0` or `1441`: response is not ok; stored minutes stay.

## Track 2 — API key edit actions

In `SecretKeyField`, render the eye only when `phase === "idle"`. `loading` and `editing` render confirm and discard only when `editing` (confirm stays absent during `loading`, as in 0.46.0). Do not toggle `revealed` from an edit-row control. Idle reveal is unchanged.

Helius, Jupiter, and OpenRouter all use this component. No second field component.

### Track 2 checks

- Idle configured row: eye reveals the stored value; pencil still enters edit.
- Editing: the eye button is not in the row. The input is the draft and is not forced read-only by a reveal flag. Confirm writes. Discard does not.

## Track 3 — Network picker UI

In `NetworkScreen` (`wallet/src/popup/settings/SettingsScreens.tsx`), each cluster row shows only the Devnet or Mainnet title. Remove the `network-pick-sum` RPC line. Do not change `RpcScreen` or cluster patch behavior.

### Track 3 checks

- Open Network settings: two radio rows, labels only, no URL under either row.

## Hand test

Unpacked extension, after both tracks:

1. Settings → Wallet lock settings: switch off and minutes 10. Close the popup. Reopen. Still unlocked.
2. Turn the switch on, set minutes to 1, close the popup and the side panel. Do not open a sign popout. After about one minute the wallet is locked. Unlock with the password.
3. The switch is still on after the lock. Unlock, close the surface, reopen the popup before the minute ends. It stays unlocked. Close it and let the minute finish. It locks.
4. Open API keys. Idle row has eye and pencil. Enter edit. The eye is gone. Discard. The stored value is unchanged.
5. Open Network. Only Devnet and Mainnet; no RPC URL on that screen.
