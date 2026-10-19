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
