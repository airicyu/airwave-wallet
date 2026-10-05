import { isSigningOrWatch, parsePublicKeyBase58 } from "../../shared/accounts";
import { shortAddr } from "../lib";
import { SVG_PLUS } from "../lib";
import { session, syncShellDock } from "../lib";
import type { State } from "../types";

export function resetCombinedCreate(): void {
  session.combinedCreate = { draftChips: [], pickedPks: new Set(), currentMain: "" };
  const draft = document.getElementById("combined-draft") as HTMLInputElement | null;
  const label = document.getElementById("combined-label") as HTMLInputElement | null;
  if (draft) draft.value = "";
  if (label) label.value = "";
  const err = document.getElementById("combined-err");
  if (err) err.textContent = "";
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

export function renderCombinedCreateScreen(state: State): void {
  const valid = validCombinedMembers();
  if (!session.combinedCreate.currentMain || !valid.includes(session.combinedCreate.currentMain)) {
    session.combinedCreate.currentMain = valid[0] ?? "";
  }

  const chipList = document.getElementById("combined-chip-list")!;
  chipList.innerHTML = "";
  session.combinedCreate.draftChips.forEach((pk, i) => {
    const chip = document.createElement("span");
    chip.className = `addr-chip${pk === session.combinedCreate.currentMain ? " main" : ""}`;
    const pick = document.createElement("button");
    pick.type = "button";
    pick.className = "chip-pick";
    pick.title = pk;
    pick.textContent = shortAddr(pk);
    pick.addEventListener("click", () => {
      if (parsePublicKeyBase58(pk)) session.combinedCreate.currentMain = pk;
      renderCombinedCreateScreen(state);
      syncShellDock();
    });
    chip.append(pick);
    if (pk === session.combinedCreate.currentMain) {
      const tag = document.createElement("span");
      tag.className = "addr-tag";
      tag.textContent = "目前";
      chip.append(tag);
    }
    const del = document.createElement("button");
    del.type = "button";
    del.className = "icon-btn sm-inline ghost-inline";
    del.title = "刪除";
    del.setAttribute("aria-label", "刪除");
    del.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 7l10 10M17 7 7 17"/></svg>`;
    del.addEventListener("click", () => {
      session.combinedCreate.draftChips.splice(i, 1);
      renderCombinedCreateScreen(state);
      syncShellDock();
    });
    chip.append(del);
    chipList.append(chip);
  });

  const pickList = document.getElementById("combined-pick-list")!;
  pickList.innerHTML = "";
  for (const a of state.accounts) {
    if (!isSigningOrWatch(a)) continue;
    const row = document.createElement("label");
    row.className = "combined-pick-row";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = session.combinedCreate.pickedPks.has(a.publicKeyBase58);
    cb.addEventListener("change", () => {
      if (cb.checked) session.combinedCreate.pickedPks.add(a.publicKeyBase58);
      else session.combinedCreate.pickedPks.delete(a.publicKeyBase58);
      renderCombinedCreateScreen(state);
      syncShellDock();
    });
    const mid = document.createElement("span");
    mid.className = "pick-name";
    mid.textContent = a.label;
    const end = document.createElement("span");
    end.className = "pick-addr";
    end.textContent = shortAddr(a.publicKeyBase58);
    row.append(cb, mid, end);
    pickList.append(row);
  }

  const rowsEl = document.getElementById("combined-member-rows")!;
  rowsEl.innerHTML = "";
  for (const pk of valid) {
    const row = document.createElement("div");
    row.className = "combined-member-row";
    const mono = document.createElement("span");
    mono.className = "mono";
    mono.textContent = shortAddr(pk);
    row.append(mono);
    if (pk === session.combinedCreate.currentMain) {
      const tag = document.createElement("span");
      tag.className = "addr-tag";
      tag.textContent = "目前錢包";
      row.append(tag);
    }
    rowsEl.append(row);
  }

  syncShellDock();
}

export function addCombinedDraftParts(text: string): void {
  const parts = text.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  for (const p of parts) {
    if (!session.combinedCreate.draftChips.includes(p)) session.combinedCreate.draftChips.push(p);
  }
  const draft = document.getElementById("combined-draft") as HTMLInputElement;
  draft.value = "";
  const err = document.getElementById("combined-err");
  if (err) err.textContent = "";
  if (session.lastState) renderCombinedCreateScreen(session.lastState);
}

export function bindCombinedCreateEvents(): void {
  const btnCombinedAddChip = document.getElementById("btn-combined-add-chip")!;
  btnCombinedAddChip.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${SVG_PLUS}</svg>`;
  btnCombinedAddChip.addEventListener("click", () => {
    const draft = document.getElementById("combined-draft") as HTMLInputElement;
    addCombinedDraftParts(draft.value);
  });

  const combinedDraftInput = document.getElementById("combined-draft") as HTMLInputElement;
  combinedDraftInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCombinedDraftParts(combinedDraftInput.value);
    }
  });
  combinedDraftInput.addEventListener("paste", (e) => {
    const text = e.clipboardData?.getData("text") ?? "";
    if (/[\n,]/.test(text)) {
      e.preventDefault();
      addCombinedDraftParts(text);
    }
  });
}
