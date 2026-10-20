/**
 * Schedules and fires idle auto-lock via chrome.alarms when settings allow and no wallet surface is open.
 * Does not patch settings or reject pending dApp requests.
 */
import {
  IDLE_SURFACE_PORT,
  isPopoutApprovalUrl,
  isWalletShellWindowUrl,
  isWalletSidePanelUrl,
} from "../../shared/shell";
import * as session from "../session";
import { readSettings } from "../storage";

export const IDLE_LOCK_ALARM = "airwave.idleLock";

let idleSurfacePortCount = 0;

export function getIdleSurfacePortCount(): number {
  return idleSurfacePortCount;
}

async function isWalletSurfaceOpenViaContexts(): Promise<boolean> {
  if (typeof chrome.runtime.getContexts !== "function") return false;
  try {
    const ctxs = await chrome.runtime.getContexts({});
    for (const c of ctxs) {
      const url = c.documentUrl ?? "";
      if (isPopoutApprovalUrl(url)) return true;
      if (isWalletSidePanelUrl(url)) return true;
      if (isWalletShellWindowUrl(url)) return true;
    }
  } catch {
    /* API missing or denied */
  }
  return false;
}

async function isSurfaceOpenForGuard(): Promise<boolean> {
  if (idleSurfacePortCount > 0) return true;
  return isWalletSurfaceOpenViaContexts();
}

export async function syncIdleLockAlarm(replaceScheduled: boolean): Promise<void> {
  const settings = await readSettings();
  if (!settings.idleAutoLockEnabled || !session.isUnlocked()) {
    await chrome.alarms.clear(IDLE_LOCK_ALARM);
    return;
  }

  if (replaceScheduled) {
    if (idleSurfacePortCount > 0) {
      await chrome.alarms.clear(IDLE_LOCK_ALARM);
      return;
    }
    await chrome.alarms.clear(IDLE_LOCK_ALARM);
    await chrome.alarms.create(IDLE_LOCK_ALARM, {
      delayInMinutes: settings.idleAutoLockMinutes,
    });
    return;
  }

  if (await isSurfaceOpenForGuard()) {
    await chrome.alarms.clear(IDLE_LOCK_ALARM);
    return;
  }

  const existing = await chrome.alarms.get(IDLE_LOCK_ALARM);
  if (existing) return;
}

async function onIdleLockAlarm(): Promise<void> {
  if (await isSurfaceOpenForGuard()) {
    await syncIdleLockAlarm(false);
    return;
  }
  const settings = await readSettings();
  if (!settings.idleAutoLockEnabled || !session.isUnlocked()) {
    await chrome.alarms.clear(IDLE_LOCK_ALARM);
    return;
  }
  await session.lock();
  await chrome.alarms.clear(IDLE_LOCK_ALARM);
}

export function registerIdleLockListeners(): void {
  session.setLockFinishedListener(() => {
    void syncIdleLockAlarm(false);
  });

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== IDLE_SURFACE_PORT) return;
    idleSurfacePortCount += 1;
    void syncIdleLockAlarm(false);
    port.onDisconnect.addListener(() => {
      idleSurfacePortCount = Math.max(0, idleSurfacePortCount - 1);
      void syncIdleLockAlarm(idleSurfacePortCount === 0);
    });
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== IDLE_LOCK_ALARM) return;
    void onIdleLockAlarm();
  });

  void (async () => {
    await session.ensureHydrated();
    await syncIdleLockAlarm(false);
  })();
}
