/**
 * Maps a wallet-account row to the three on-screen kind marks (signing, read-only, combined).
 * Does not render SVG or persist new account fields.
 */
import { isCombinedAccount } from "./accounts";
import { accountKind, type AccountMeta } from "./storage-keys";

export type AccountVisualKind = "signing" | "readOnly" | "combined";

export function accountVisualKind(account: AccountMeta): AccountVisualKind {
  if (isCombinedAccount(account)) return "combined";
  if (accountKind(account) === "readOnly") return "readOnly";
  return "signing";
}

export const ACCOUNT_KIND_COLOR: Record<AccountVisualKind, string> = {
  signing: "#4ecb8d",
  readOnly: "#e8b84a",
  combined: "#c084fc",
};

const SVG_INNER: Record<AccountVisualKind, string> = {
  signing:
    '<circle cx="9" cy="15" r="4"/><path d="M12 13l7-7"/><path d="M16 6h3v3"/>',
  readOnly:
    '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  combined:
    '<rect x="5" y="8" width="12" height="10" rx="2"/><rect x="8" y="5" width="12" height="10" rx="2"/>',
};

/** Paints the kind mark into a chrome avatar node (approval / popout). */
export function paintAccountKindMark(el: HTMLElement, kind: AccountVisualKind): void {
  el.classList.add("kind-mark");
  el.setAttribute("data-kind", kind);
  el.style.color = ACCOUNT_KIND_COLOR[kind];
  el.style.background = "var(--fill)";
  el.replaceChildren();
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = SVG_INNER[kind];
  el.appendChild(svg);
}
