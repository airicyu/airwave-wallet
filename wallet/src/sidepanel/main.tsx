import { createRoot } from "react-dom/client";
import { App } from "../popup/App";
import { keepIdleSurfacePort } from "../shared/shell";
import { SIDEBAR_SURFACE_PORT } from "../shared/shell";
import "../popout/style.css";
import "../approval/tx-ai.css";
import "../popup/style.css";

document.documentElement.classList.add("wallet-shell-surface");

function keepSidebarPresence(): void {
  const port = chrome.runtime.connect({ name: SIDEBAR_SURFACE_PORT });
  port.onDisconnect.addListener(() => {
    if (document.visibilityState === "hidden") return;
    keepSidebarPresence();
  });
}
keepSidebarPresence();
keepIdleSurfacePort();

const root = document.getElementById("root");
if (!root) throw new Error("Side panel missing #root");
createRoot(root).render(<App />);
