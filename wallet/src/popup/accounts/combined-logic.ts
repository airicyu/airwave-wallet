import { isSigningOrWatch, parsePublicKeyBase58 } from "../../shared/accounts";
import { bumpUi, session } from "../lib/session";

export function resetCombinedCreate(): void {
  session.combinedCreate = { draftChips: [], pickedPks: new Set(), currentMain: "" };
  session.combinedDraft = "";
  session.combinedLabel = "";
  session.combinedErr = "";
}

export function combinedMemberPubkeys(): string[] {
  const fromPick: string[] = [];
  if (session.lastState) {
    for (const a of session.lastState.accounts) {
      if (!isSigningOrWatch(a)) continue;
      if (session.combinedCreate.pickedPks.has(a.publicKeyBase58)) fromPick.push(a.publicKeyBase58);
    }
  }
  const ordered: string[] = [];
  for (const x of [...session.combinedCreate.draftChips, ...fromPick]) {
    if (!ordered.includes(x)) ordered.push(x);
  }
  return ordered;
}

export function validCombinedMembers(): string[] {
  return combinedMemberPubkeys().filter((pk) => parsePublicKeyBase58(pk) != null);
}

export function addCombinedDraftParts(text: string): void {
  const parts = text
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const p of parts) {
    if (!session.combinedCreate.draftChips.includes(p)) session.combinedCreate.draftChips.push(p);
  }
  session.combinedDraft = "";
  session.combinedErr = "";
  bumpUi();
}
