/**
 * This file holds open the idle-lock port from a wallet shell document so the service worker knows a surface is still open. If the port drops while the page is visible, it connects again. It does not decide the lock timeout.
 */
import { IDLE_SURFACE_PORT } from "./shell-constants";

let pageUnloading = false;

if (typeof window !== "undefined") {
  window.addEventListener(
    "pagehide",
    () => {
      pageUnloading = true;
    },
    { capture: true },
  );
}

/** Keeps an idle-lock surface port alive until the document unloads. */
export function keepIdleSurfacePort(): void {
  const port = chrome.runtime.connect({ name: IDLE_SURFACE_PORT });
  port.onDisconnect.addListener(() => {
    if (pageUnloading) return;
    if (document.visibilityState === "hidden") return;
    keepIdleSurfacePort();
  });
}
