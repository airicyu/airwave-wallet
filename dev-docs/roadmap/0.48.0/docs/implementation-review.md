# 0.48.0 — implementation-review

- Date: 2026-10-19 (Asia/Hong_Kong)
- Round: **1** (latest). Do not renumber IDs in later rounds; append new rounds below.
- Role: Implementation review. No code changes, no INDEX/HOW edits, no commit.
- Baseline: [`../INDEX.md`](../INDEX.md) decided + acceptance; [`how.md`](./how.md) paths and call sites; architecture bans in [`../../GUIDELINES.md`](../../GUIDELINES.md).
- Scope: Working tree + untracked `wallet/src/background/idle-lock/`, `wallet/src/shared/idle-surface-port.ts`, `dev-docs/roadmap/0.48.0/`.

## Round 1 (2026-10-19)

**Summary:** Track 1 (idle auto-lock) and Track 2 (`SecretKeyField` eye only in `idle`) match INDEX and HOW in static review. Architecture bans (pending in SW memory, settings via `patchSettings`, `session.lock()` only on alarm, no pending reject on idle lock, no storage deadline) are respected. **`cd wallet && npm run typecheck` exit code 0.** No closed HIGH findings. Browser hand-test rows are not evidenced in-repo; ship gate still needs a human on unpacked extension per INDEX.

### Findings

| ID | Sev | Status | Notes |
|----|-----|--------|-------|
| 048-M01 | MEDIUM | Open (ship gate) | INDEX acceptance checkboxes are still unchecked. This round did not load an unpacked extension. INDEX requires human verification: settings switch/minutes, one idle lock after closing popup, one secret-row edit without eye. |
| 048-L01 | LOW | Open (expected) | Shipped version strings remain `0.47.1` (`wallet/manifest.config.ts`, `wallet/package.json`). Consistent with INDEX `in progress`; align on user ship. |
| 048-L02 | LOW | Open (informational) | No bundled automated test command for 0.48.0 beyond `npm run typecheck`. Do not assume `bun test`. |

**Open HIGH:** none.

### Contract spot-check

| Check | Result |
|-------|--------|
| `idleAutoLockEnabled` / `idleAutoLockMinutes` on `Settings`, `DEFAULT_SETTINGS`, `normalizeSettings`, `toPublicSettings` spread | Pass |
| Patch rejects non-integer or out-of-range minutes; no `syncIdleLockAlarm` on reject | Pass (`settings-command.ts`, `isPatchIdleAutoLockMinutesValid`) |
| `alarms` permission | Pass (`manifest.config.ts`) |
| `IDLE_SURFACE_PORT` + `keepIdleSurfacePort()` on popup, side panel, popout; `SIDEBAR_SURFACE_PORT` unchanged | Pass |
| `syncIdleLockAlarm` steps 1–7 and call sites vs HOW | Pass (`idle-lock.ts`, settings patch, unlock, `session.lock` dynamic import) |
| Last port disconnect: `replaceScheduled` true, no `getContexts` on create path | Pass (port count only when `replaceScheduled`) |
| SW start / unlock: `syncIdleLockAlarm(false)`; existing alarm kept, none created if missing | Pass |
| Alarm handler: surface guard, then lock; no pending reject | Pass |
| `SecretKeyField`: eye only `phase === "idle"`; `loading` has no confirm/discard/eye; `editing` confirm/discard only | Pass |
| Locale keys `settings.idleAutoLock.enable` / `.minutes` in three catalogs | Pass (`ui-messages.ts`) |
| New third-party dependency | Pass (no `package.json` diff) |
| File headers on new/edited ≥50-line `.ts` under `wallet/src` | Pass (sampled `idle-lock.ts`, `SecretKeyField.tsx`, `settings-command.ts`) |

### INDEX acceptance

| Acceptance line | Result | Evidence |
|-----------------|--------|----------|
| New install / missing keys: switch off, minutes 10; timer does not run | Static pass | `DEFAULT_SETTINGS`, `normalizeIdleAutoLockEnabled` / `normalizeIdleAutoLockMinutes` |
| Switch on, close all surfaces → lock after minutes; unlock needs password; vault unchanged | Not run | Requires unpacked extension + wait |
| Switch on, open popup/side panel (incl. Settings) → no timer; close → full countdown | Not run | Logic matches ports + `syncIdleLockAlarm(false)` on connect |
| Open surface during countdown clears; close last → full countdown again | Not run | Connect clears alarm per code |
| Sign tx/msg screen (shell or popout) does not run timer | Static pass | `popout/main.tsx` calls `keepIdleSurfacePort`; popout URL in `getContexts` guard |
| Already locked: no alarm scheduled | Static pass | `!session.isUnlocked()` clears alarm in `syncIdleLockAlarm` |
| Minutes outside 1–1440 do not change storage; switch off clears alarm | Static pass | Patch guard + `idleAutoLockEnabled === false` → `sync(false)` |
| Idle row eye+pencil; edit confirm/discard, no eye | Static pass | `SecretKeyField.tsx` |
| `cd wallet && npm run typecheck` | Pass | Exit code 0 (2026-10-19) |
| Unpacked: settings + one idle lock + one secret edit | Not run | No in-repo evidence |

**Note:** No full-package test script beyond typecheck for this version.

### Test results

Working directory `wallet/`. Executed this round.

| Command | Exit code |
|---------|-----------|
| `npm run typecheck` (`tsc --noEmit`) | 0 |

### Fix / follow-up tracking

| ID | Status | Tracking |
|----|--------|----------|
| 048-M01 | Open | Complete INDEX hand-test on unpacked build; tick INDEX acceptance when done. |
| 048-L01 | Open | Bump version files on user ship. |
| 048-L02 | Open | Informational only. |
