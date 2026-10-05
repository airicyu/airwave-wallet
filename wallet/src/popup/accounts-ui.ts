import {
  getExposedPublicKey,
  isCombinedAccount,
  isSigningOrWatch,
  parsePublicKeyBase58,
} from "../shared/accounts";
import { sendExtensionRequest } from "../shared/ext-api";
import { accountKind, type AccountMeta } from "../shared/storage-keys";
import { el } from "./dom";
import { avatarLetter, shortAddr } from "./format";
import { SVG_PLUS, SVG_TRASH } from "./icons";
import { clearError, navigateTo, refresh, session, showError } from "./session";
import type { State } from "./types";

export function renderConnections(state: State): void {
  el.connectedList.innerHTML = "";
  for (const c of state.connections) {
    const li = document.createElement("li");
    li.className = "connected-row";
    const span = document.createElement("span");
    span.textContent = c.origin;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "icon-btn";
    btn.title = "Disconnect";
    btn.setAttribute("aria-label", "Disconnect");
    btn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    btn.addEventListener("click", async () => {
      clearError();
      const res = await sendExtensionRequest("wallet.disconnectOrigin", {
        origin: c.origin,
      });
      if (!res.ok) showError(res.error?.message ?? "斷開失敗");
      else await refresh();
    });
    li.append(span, btn);
    el.connectedList.append(li);
  }
}

export function renderAccountsList(state: State): void {
  el.accountsList.innerHTML = "";
  for (const a of state.accounts) {
    const card = document.createElement("div");
    card.className = "account-card";
    if (a.id === state.activeAccountId) card.classList.add("active");

    const main = document.createElement("div");
    main.className = "account-card-main";
    main.addEventListener("click", async () => {
      clearError();
      const res = await sendExtensionRequest("wallet.setActiveAccount", { accountId: a.id });
      if (!res.ok) showError(res.error?.message ?? "切換失敗");
      else {
        await refresh();
        navigateTo("home-token");
      }
    });

    const titleRow = document.createElement("div");
    titleRow.className = "account-title-row";
    const nameSpan = document.createElement("span");
    nameSpan.className = "account-name";
    nameSpan.textContent = a.label;

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "icon-btn ghost-inline";
    renameBtn.title = "Rename account";
    renameBtn.setAttribute("aria-label", "Rename account");
    renameBtn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';
    renameBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      navigateTo("account-rename", a.id);
      el.renameLabel.value = a.label;
      el.renameAddrHint.textContent = shortAddr(getExposedPublicKey(a));
    });

    titleRow.append(nameSpan, renameBtn);
    if (a.id === state.activeAccountId) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.style.borderColor = "var(--accent)";
      badge.style.color = "var(--accent)";
      badge.textContent = "Active";
      titleRow.append(badge);
    }
    if (isCombinedAccount(a)) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "Combined";
      titleRow.append(badge);
    }
    if (accountKind(a) === "readOnly") {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "Read-only";
      titleRow.append(badge);
    }

    const addrRow = document.createElement("div");
    addrRow.className = "account-addr-row";
    const addr = document.createElement("span");
    addr.className = "addr";
    addr.textContent = shortAddr(getExposedPublicKey(a));
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "icon-btn ghost-inline";
    copyBtn.title = "Copy address";
    copyBtn.setAttribute("aria-label", "Copy address");
    copyBtn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    copyBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      void navigator.clipboard.writeText(getExposedPublicKey(a));
    });
    addrRow.append(addr, copyBtn);
    main.append(titleRow, addrRow);

    const kebab = document.createElement("button");
    kebab.type = "button";
    kebab.className = "icon-btn";
    kebab.title = "Manage account";
    kebab.setAttribute("aria-label", "Manage account");
    kebab.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
    kebab.addEventListener("click", () => {
      navigateTo("account-manage", a.id);
      renderManageScreen(state);
    });

    card.append(main, kebab);
    el.accountsList.append(card);
  }
}

export function renderManageScreen(state: State): void {
  const acc = state.accounts.find((a) => a.id === session.focusAccountId);
  if (!acc) return;
  el.manageName.textContent = acc.label;
  const combined = isCombinedAccount(acc);
  const manageCombinedPanel = document.getElementById("manage-combined-panel")!;
  const manageCombinedBadge = document.getElementById("manage-combined-badge")!;
  manageCombinedPanel.hidden = !combined;
  manageCombinedBadge.hidden = !combined;
  if (combined) {
    el.manageAddr.textContent = `${acc.subPubkeys.length} 個成員地址`;
    el.manageReadonlyBadge.hidden = true;
    el.btnGoReveal.hidden = true;
    renderCombinedManageSubs(acc, state);
    return;
  }
  el.manageAddr.textContent = isSigningOrWatch(acc) ? acc.publicKeyBase58 : "";
  const ro = accountKind(acc) === "readOnly";
  el.manageReadonlyBadge.hidden = !ro;
  el.btnGoReveal.hidden = ro || !state.unlocked;
}

function renderCombinedManageSubs(
  acc: AccountMeta & { kind: "combined"; subPubkeys: string[]; mainPubkey: string },
  state: State,
): void {
  const mainEl = document.getElementById("manage-combined-main")!;
  const listEl = document.getElementById("manage-combined-subs")!;
  const pickList = document.getElementById("manage-combined-pick-list")!;
  mainEl.textContent = shortAddr(acc.mainPubkey);
  listEl.innerHTML = "";
  for (const pk of acc.subPubkeys) {
    const li = document.createElement("li");
    li.className = "combined-sub-row";
    const isMain = pk === acc.mainPubkey;
    li.textContent = `${shortAddr(pk)}${isMain ? " · 目前錢包" : ""}`;
    const actions = document.createElement("div");
    actions.className = "combined-sub-actions";
    if (!isMain) {
      const setMainBtn = document.createElement("button");
      setMainBtn.type = "button";
      setMainBtn.className = "link-btn";
      setMainBtn.textContent = "設為目前錢包";
      setMainBtn.addEventListener("click", async () => {
        clearError();
        const res = await sendExtensionRequest("wallet.setCombinedMain", {
          combinedId: acc.id,
          mainPubkey: pk,
        });
        if (!res.ok) showError(res.error?.message ?? "切換失敗");
        else await refresh();
      });
      actions.append(setMainBtn);
    }
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "icon-btn sm-inline ghost-inline";
    removeBtn.title = "刪除";
    removeBtn.setAttribute("aria-label", "刪除");
    removeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${SVG_TRASH}</svg>`;
    removeBtn.disabled = acc.subPubkeys.length <= 1;
    removeBtn.addEventListener("click", async () => {
      clearError();
      const res = await sendExtensionRequest("wallet.removeCombinedSub", {
        combinedId: acc.id,
        publicKeyBase58: pk,
      });
      if (!res.ok) showError(res.error?.message ?? "移除失敗");
      else await refresh();
    });
    actions.append(removeBtn);
    li.append(actions);
    listEl.append(li);
  }

  pickList.innerHTML = "";
  const inCombined = new Set(
    acc.subPubkeys.map((pk) => parsePublicKeyBase58(pk) ?? pk),
  );
  for (const a of state.accounts) {
    if (!isSigningOrWatch(a)) continue;
    const pk = parsePublicKeyBase58(a.publicKeyBase58) ?? a.publicKeyBase58;
    const already = inCombined.has(pk);
    const row = document.createElement("label");
    row.className = "combined-pick-row";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = already;
    cb.disabled = already && acc.subPubkeys.length <= 1;
    cb.addEventListener("change", async () => {
      cb.disabled = true;
      clearError();
      const res = cb.checked
        ? await sendExtensionRequest("wallet.addCombinedSub", {
            combinedId: acc.id,
            publicKeyBase58: a.publicKeyBase58,
          })
        : await sendExtensionRequest("wallet.removeCombinedSub", {
            combinedId: acc.id,
            publicKeyBase58: a.publicKeyBase58,
          });
      if (!res.ok) {
        cb.checked = already;
        cb.disabled = already && acc.subPubkeys.length <= 1;
        showError(res.error?.message ?? (cb.checked ? "加入失敗" : "移除失敗"));
        return;
      }
      await refresh();
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
}

export function clearRevealSecret(): void {
  session.revealedSecretInMemory = null;
  el.revealPassword.value = "";
  el.revealSecretText.textContent = "";
  el.revealMaskBlock.hidden = false;
  el.revealSecretBlock.hidden = true;
}

export function renderRevealScreen(state: State): void {
  const acc = state.accounts.find((a) => a.id === session.focusAccountId);
  if (!acc) {
    navigateTo("accounts");
    return;
  }
  if (accountKind(acc) !== "signing" || !state.unlocked) {
    navigateTo("account-manage");
    return;
  }
  el.revealHint.textContent = `${acc.label} · ${shortAddr(isSigningOrWatch(acc) ? acc.publicKeyBase58 : "")}`;
  if (!session.revealedSecretInMemory) {
    clearRevealSecret();
  }
}

export function renderWidget(state: State): void {
  const active = state.accounts.find((a) => a.id === state.activeAccountId);
  if (!active) {
    el.widgetLabel.textContent = "—";
    el.widgetAddr.textContent = "";
    el.widgetAvatar.textContent = "?";
    return;
  }
  el.widgetLabel.textContent = active.label;
  el.widgetAddr.textContent = shortAddr(getExposedPublicKey(active));
  el.widgetAvatar.textContent = avatarLetter(active.label);
  document.getElementById("btn-widget-accounts")?.setAttribute(
    "title",
    `${active.label} · ${getExposedPublicKey(active)}`,
  );
}

async function submitManageCombinedPaste(): Promise<void> {
  clearError();
  if (!session.focusAccountId) return;
  const input = document.getElementById("manage-add-sub-pk") as HTMLInputElement;
  const publicKeyBase58 = input.value.trim();
  if (!publicKeyBase58) return;
  const res = await sendExtensionRequest("wallet.addCombinedSub", {
    combinedId: session.focusAccountId,
    publicKeyBase58,
  });
  if (!res.ok) showError(res.error?.message ?? "加入失敗");
  else {
    input.value = "";
    await refresh();
  }
}

export function bindAccountsEvents(): void {
  const btnCombinedAddSub = document.getElementById("btn-combined-add-sub")!;
  btnCombinedAddSub.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${SVG_PLUS}</svg>`;
  btnCombinedAddSub.addEventListener("click", () => {
    void submitManageCombinedPaste();
  });
  const manageAddSubPk = document.getElementById("manage-add-sub-pk") as HTMLInputElement;
  manageAddSubPk.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void submitManageCombinedPaste();
    }
  });

  document.getElementById("btn-rename")!.addEventListener("click", async () => {
    clearError();
    if (!session.focusAccountId) return;
    const label = el.renameLabel.value;
    const res = await sendExtensionRequest("wallet.renameAccount", {
      accountId: session.focusAccountId,
      label,
    });
    if (!res.ok) showError(res.error?.message ?? "重新命名失敗");
    else {
      await refresh();
      navigateTo("accounts");
    }
  });

  document.getElementById("btn-delete")!.addEventListener("click", async () => {
    clearError();
    if (!session.focusAccountId) return;
    if (!confirm("確定移除此錢包帳戶？")) return;
    const res = await sendExtensionRequest("wallet.deleteAccount", { accountId: session.focusAccountId });
    if (!res.ok) showError(res.error?.message ?? "刪除失敗");
    else {
      session.focusAccountId = null;
      await refresh();
      navigateTo("accounts");
    }
  });

  el.btnGoReveal.addEventListener("click", () => {
    navigateTo("account-reveal-key");
  });

  document.getElementById("btn-reveal-submit")!.addEventListener("click", async () => {
    clearError();
    if (!session.focusAccountId) return;
    const password = el.revealPassword.value;
    const res = await sendExtensionRequest("wallet.exportAccountSecret", {
      accountId: session.focusAccountId,
      password,
    });
    if (!res.ok) {
      showError(res.error?.message ?? "無法匯出");
      return;
    }
    const { secretBase58 } = res.result as { secretBase58: string };
    session.revealedSecretInMemory = secretBase58;
    el.revealSecretText.textContent = secretBase58;
    el.revealMaskBlock.hidden = true;
    el.revealSecretBlock.hidden = false;
    el.revealPassword.value = "";
  });

  document.getElementById("btn-copy-secret")!.addEventListener("click", async () => {
    if (session.revealedSecretInMemory) {
      await navigator.clipboard.writeText(session.revealedSecretInMemory);
    }
  });

  document.getElementById("btn-disconnect-all")!.addEventListener("click", async () => {
    clearError();
    const res = await sendExtensionRequest("wallet.disconnectAllOrigins");
    if (!res.ok) showError(res.error?.message ?? "斷開失敗");
    else await refresh();
  });
}
