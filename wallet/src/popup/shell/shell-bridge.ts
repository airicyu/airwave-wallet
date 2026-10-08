import { sendExtensionRequest } from "../../shared/ext-api";
import { SHELL_LAST_NORMAL_WINDOW_MSG } from "../../shared/shell-constants";

let lastNormalWindowId: number | null = null;

export function getLastNormalWindowId(): number | null {
  return lastNormalWindowId;
}

export async function hydrateLastNormalWindowId(): Promise<void> {
  const res = await sendExtensionRequest("shell.getLastNormalWindowId");
  if (res.ok && res.result && typeof res.result === "object") {
    const wid = (res.result as { windowId?: number | null }).windowId;
    lastNormalWindowId = typeof wid === "number" ? wid : null;
  }
}

/** 錢包視窗重新聚焦時再問 SW（避免切回視窗後 id 未推送）。 */
export function bindWalletShellFocusHydrate(): () => void {
  const onFocus = () => {
    void hydrateLastNormalWindowId();
  };
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") onFocus();
  });
  return () => {
    window.removeEventListener("focus", onFocus);
  };
}

export function bindLastNormalWindowPush(): () => void {
  const onMessage = (
    msg: unknown,
  ): void => {
    if (!msg || typeof msg !== "object") return;
    const m = msg as { kind?: string; windowId?: number | null };
    if (m.kind !== SHELL_LAST_NORMAL_WINDOW_MSG) return;
    lastNormalWindowId = typeof m.windowId === "number" ? m.windowId : null;
  };
  chrome.runtime.onMessage.addListener(onMessage);
  return () => chrome.runtime.onMessage.removeListener(onMessage);
}
