/**
 * In-memory draft for the create-combined flow.
 * Does not write chrome.storage or call wallet commands.
 */
import { useSyncExternalStore } from "react";
import { parsePublicKeyBase58 } from "../../shared/accounts";
import type { View } from "../types";

export type CombinedCreateDraft = {
  label: string;
  members: string[];
  main: string;
};

const CREATE_VIEWS = new Set<View>([
  "add-combined",
  "add-combined-add",
  "add-combined-paste",
  "add-combined-local",
]);

let draft: CombinedCreateDraft = { label: "", members: [], main: "" };
const listeners = new Set<() => void>();

function commit(next: CombinedCreateDraft): void {
  draft = next;
  for (const listener of listeners) listener();
}

export function getCombinedDraft(): CombinedCreateDraft {
  return draft;
}

export function subscribeCombinedDraft(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCombinedDraft(): CombinedCreateDraft {
  return useSyncExternalStore(subscribeCombinedDraft, getCombinedDraft, getCombinedDraft);
}

export function clearCombinedDraft(): void {
  commit({ label: "", members: [], main: "" });
}

export function noteCombinedCreateNavigation(current: View, next: View): void {
  if (current === next) return;
  if (CREATE_VIEWS.has(current) && !CREATE_VIEWS.has(next)) clearCombinedDraft();
}

export function setCombinedLabel(label: string): void {
  if (label === draft.label) return;
  commit({ ...draft, label });
}

export function keysFromPaste(text: string, existing: readonly string[]): string[] {
  const out: string[] = [];
  for (const part of text.split(/[\s,]+/)) {
    const pk = parsePublicKeyBase58(part.trim());
    if (!pk || existing.includes(pk) || out.includes(pk)) continue;
    out.push(pk);
  }
  return out;
}

export function appendCombinedMembers(text: string): number {
  const adding = keysFromPaste(text, draft.members);
  if (adding.length === 0) return 0;
  const members = [...draft.members, ...adding];
  const main = draft.main && members.includes(draft.main) ? draft.main : (members[0] ?? "");
  commit({ ...draft, members, main });
  return adding.length;
}

export function removeCombinedMember(pk: string): void {
  const members = draft.members.filter((item) => item !== pk);
  const main = members.includes(draft.main) ? draft.main : (members[0] ?? "");
  commit({ ...draft, members, main });
}

export function setCombinedMain(pk: string): void {
  if (!draft.members.includes(pk) || pk === draft.main) return;
  commit({ ...draft, main: pk });
}

export function reorderCombinedMembers(members: string[]): void {
  const main = members.includes(draft.main) ? draft.main : (members[0] ?? "");
  commit({ ...draft, members, main });
}
