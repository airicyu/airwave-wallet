import { createRoot } from "react-dom/client";
import { App } from "../popup/App";
import { SIDEBAR_SURFACE_PORT } from "../shared/shell-constants";
import "../popout/style.css";
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

const root = document.getElementById("root");
if (!root) throw new Error("Side panel missing #root");
createRoot(root).render(<App />);
