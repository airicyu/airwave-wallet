/**
 * Popup entry. It mounts App on #root and keeps the idle-surface port open.
 * That port lets the service worker tell this window from the sidebar.
 * The first screen is chosen by App, not here. Popup, popout, and approval styles load in this file.
 */
import { createRoot } from "react-dom/client";
import { keepIdleSurfacePort } from "../shared/shell";
import { App } from "./App";
import "../popout/style.css";
import "../approval/tx-ai.css";
import "./style.css";

keepIdleSurfacePort();

const root = document.getElementById("root");
if (!root) throw new Error("Popup missing #root");
createRoot(root).render(<App />);
