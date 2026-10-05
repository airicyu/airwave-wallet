import type { View } from "./types";

export function shortAddr(pk: string): string {
  if (pk.length <= 8) return pk;
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

export function avatarLetter(label: string): string {
  const t = label.trim();
  if (!t) return "?";
  return t.slice(0, 1).toUpperCase();
}

export function isHomeView(view: View): boolean {
  return view === "home-token" || view === "home-activity";
}

export function renderLegalDoc(root: HTMLElement, markdown: string): void {
  root.replaceChildren();
  const blocks = markdown.replace(/\r\n/g, "\n").trim().split(/\n\n+/);
  for (const block of blocks) {
    const line = block.trim();
    if (!line || line.startsWith("# ")) continue;
    if (line.startsWith("## ")) {
      const heading = document.createElement("h3");
      heading.textContent = line.slice(3).trim();
      root.append(heading);
      continue;
    }
    const p = document.createElement("p");
    p.textContent = line.replace(/\n/g, " ");
    root.append(p);
  }
}
