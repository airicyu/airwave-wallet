import { createRoot } from "react-dom/client";
import { App } from "../popup/App";
import "../popout/style.css";
import "../popup/style.css";

document.documentElement.classList.add("wallet-shell-surface");

const root = document.getElementById("root");
if (!root) throw new Error("Side panel missing #root");
createRoot(root).render(<App />);
