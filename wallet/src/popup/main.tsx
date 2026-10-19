import { createRoot } from "react-dom/client";
import { keepIdleSurfacePort } from "../shared/idle-surface-port";
import { App } from "./App";
import "../popout/style.css";
import "../approval/tx-ai.css";
import "./style.css";

keepIdleSurfacePort();

const root = document.getElementById("root");
if (!root) throw new Error("Popup missing #root");
createRoot(root).render(<App />);
