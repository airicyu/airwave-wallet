import { isSigningOrWatch, parsePublicKeyBase58 } from "../../shared/accounts";
import type { CombinedCreateState, State } from "../types";

export function emptyCombinedCreate(): CombinedCreateState {
  return { draftChips: [], pickedPks: new Set(), currentMain: "" };
}

export function combinedMemberPubkeys(
  create: CombinedCreateState,
  wallet: State | null,
): string[] {
  const fromPick: string[] = [];
  if (wallet) {
    for (const a of wallet.accounts) {
      if (!isSigningOrWatch(a)) continue;
      if (create.pickedPks.has(a.publicKeyBase58)) fromPick.push(a.publicKeyBase58);
    }
  }
  const ordered: string[] = [];
  for (const x of [...create.draftChips, ...fromPick]) {
    if (!ordered.includes(x)) ordered.push(x);
  }
  return ordered;
}

export function validCombinedMembers(create: CombinedCreateState, wallet: State | null): string[] {
  return combinedMemberPubkeys(create, wallet).filter((pk) => parsePublicKeyBase58(pk) != null);
}

export function addCombinedDraftParts(create: CombinedCreateState, text: string): CombinedCreateState {
  const parts = text
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const draftChips = [...create.draftChips];
  for (const p of parts) {
    if (!draftChips.includes(p)) draftChips.push(p);
  }
  return { ...create, draftChips };
}
