import { createRoot } from "react-dom/client";
import { App } from "./App";
import "../popout/style.css";
import "./style.css";

const root = document.getElementById("root");
if (!root) throw new Error("Popup missing #root");
createRoot(root).render(<App />);
