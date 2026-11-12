/**
 * Keeps the Unshield form across approval and remembers which privacy page to reopen.
 * Does not store keys or the transaction.
 */
import type { View } from "../types";

let fromUnshield = false;
let amountDraft = "";
let autoDraft = true;
let openDraft = false;
let selectedDraft: string[] = [];
let returnView: View | null = null;
let routed = false;

export function markUnshieldApproval(): void {
  fromUnshield = true;
  returnView = "unshield";
  routed = false;
}

export function consumeUnshieldApproval(): boolean {
  const value = fromUnshield;
  fromUnshield = false;
  return value;
}

export function privacyRejectDestination(): View | null {
  if (routed) return null;
  routed = true;
  const view = returnView ?? "token-send";
  returnView = null;
  return view;
}

export function readUnshieldDraft(): { amount: string; auto: boolean; open: boolean; selected: string[] } {
  return { amount: amountDraft, auto: autoDraft, open: openDraft, selected: selectedDraft };
}

export function writeUnshieldDraft(next: { amount?: string; auto?: boolean; open?: boolean; selected?: string[] }): void {
  if (next.amount != null) amountDraft = next.amount;
  if (next.auto != null) autoDraft = next.auto;
  if (next.open != null) openDraft = next.open;
  if (next.selected != null) selectedDraft = next.selected;
}

export function clearUnshieldDraft(): void {
  amountDraft = "";
  autoDraft = true;
  openDraft = false;
  selectedDraft = [];
}

let backView: "private-detail" | "unshield-pick" = "private-detail";

export function setUnshieldBack(view: typeof backView): void {
  backView = view;
}

export function readUnshieldBack(): typeof backView {
  return backView;
}

export function unshieldApprovalOpen(): boolean {
  return fromUnshield;
}
