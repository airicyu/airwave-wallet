import { isCombinedAccount } from "../../shared/accounts";
import { sendExtensionRequest } from "../../shared/ext-api";
import { accountKind } from "../../shared/storage-keys";
import { NATIVE_SOL_ID, shortMint, type HomeTokenRow } from "./home-tokens";
import { el, elTokenDetailRoot } from "../lib";
import { shortAddr } from "../lib";
import { navigateTo, session } from "../lib";
import { findTokenRowById } from "../send";
import type { State } from "../types";

export function renderTokenCards(rows: HomeTokenRow[], activeIsCombined: boolean): void {
  el.homeTokens.innerHTML = "";
  for (const row of rows) {
    const li = document.createElement("li");
    li.className = "token-card";
    const canExpand =
      activeIsCombined && row.members != null && row.members.length >= 1;
    const expanded = canExpand && session.expandedTokenRowIds.has(row.id);

    const iconEl = document.createElement("div");
    iconEl.className = "token-icon";
    iconEl.setAttribute("aria-hidden", "true");
    if (row.iconUrl) {
      const img = document.createElement("img");
      img.src = row.iconUrl;
      img.alt = "";
      img.addEventListener("error", () => {
        iconEl.textContent = row.iconLetter;
      });
      iconEl.append(img);
    } else {
      iconEl.textContent = row.iconLetter;
    }
    const main = document.createElement("div");
    main.className = "token-main";
    const nameRow = document.createElement("div");
    nameRow.className = "token-name-row";
    const nameEl = document.createElement("div");
    nameEl.className = "token-sym";
    nameEl.textContent = row.name || row.symbol;
    nameRow.append(nameEl);
    if (row.isVerified) {
      const tick = document.createElement("span");
      tick.className = "token-verified";
      tick.title = "Jupiter verified";
      tick.setAttribute("aria-label", "verified");
      tick.textContent = "✓";
      nameRow.append(tick);
    }
    if (row.organicScore != null && Number.isFinite(row.organicScore)) {
      const score = document.createElement("span");
      score.className = "token-score";
      const n = Math.round(row.organicScore);
      score.textContent = String(n);
      score.title = row.organicScoreLabel
        ? `organic ${n} (${row.organicScoreLabel})`
        : `organic ${n}`;
      nameRow.append(score);
    }
    const qtyEl = document.createElement("div");
    qtyEl.className = "token-qty";
    qtyEl.textContent = `${row.uiAmountLabel} ${row.symbol}`;
    main.append(nameRow, qtyEl);

    const rightCol = document.createElement("div");
    rightCol.className = "token-right";
    const usd = document.createElement("div");
    usd.className = "token-usd";
    usd.textContent = row.usdLabel;
    rightCol.append(usd);

    if (canExpand) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "token-expand-btn";
      toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
      toggle.setAttribute("aria-label", expanded ? "收合成員" : "展開成員");
      toggle.textContent = expanded ? "▾" : "▸";
      toggle.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (session.expandedTokenRowIds.has(row.id)) session.expandedTokenRowIds.delete(row.id);
        else session.expandedTokenRowIds.add(row.id);
        renderTokenCards(session.lastSuccessfulTokenRows, activeIsCombined);
      });
      rightCol.append(toggle);
    }

    li.tabIndex = 0;
    li.setAttribute("role", "button");
    li.addEventListener("click", () => openTokenDetail(row.id));
    li.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        openTokenDetail(row.id);
      }
    });

    li.append(iconEl, main, rightCol);
    el.homeTokens.append(li);

    if (canExpand && expanded && row.members) {
      const detailLi = document.createElement("li");
      detailLi.className = "token-members";
      const ul = document.createElement("ul");
      for (const m of row.members) {
        const mli = document.createElement("li");
        mli.className = "token-member-row";
        const pct = Math.round(m.percent);
        mli.textContent = `${shortAddr(m.pubkey)} · ${m.uiAmountLabel} ${row.symbol} · ${pct}%`;
        ul.append(mli);
      }
      detailLi.append(ul);
      el.homeTokens.append(detailLi);
    }
  }
}

export function openTokenDetail(tokenId: string): void {
  if (!session.lastState?.unlocked) return;
  session.detailTokenId = tokenId;
  navigateTo("token-detail");
}

export function renderTokenDetailScreen(state: State): void {
  elTokenDetailRoot.innerHTML = "";
  const row = session.detailTokenId ? findTokenRowById(session.detailTokenId) : undefined;
  if (!row) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "找不到此代幣，請返回重試。";
    elTokenDetailRoot.append(p);
    return;
  }

  const hero = document.createElement("div");
  hero.className = "token-detail-hero";
  const icon = document.createElement("div");
  icon.className = "token-detail-icon";
  if (row.iconUrl) {
    const img = document.createElement("img");
    img.src = row.iconUrl;
    img.alt = "";
    img.addEventListener("error", () => {
      icon.textContent = row.iconLetter;
    });
    icon.append(img);
  } else {
    icon.textContent = row.iconLetter;
  }
  const name = document.createElement("h3");
  name.className = "token-detail-name";
  name.textContent = row.name || row.symbol;
  hero.append(icon, name);

  const active = state.accounts.find((a) => a.id === state.activeAccountId);
  const canSend =
    state.unlocked && active != null && accountKind(active) === "signing";
  if (canSend) {
    const sendBtn = document.createElement("button");
    sendBtn.type = "button";
    sendBtn.className = "token-detail-send-btn";
    sendBtn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9z"/></svg>送出';
    sendBtn.addEventListener("click", () => navigateTo("token-send"));
    hero.append(sendBtn);
  }

  const meta = document.createElement("div");
  meta.className = "token-detail-meta";

  const qtyRow = document.createElement("div");
  qtyRow.className = "token-detail-row";
  qtyRow.innerHTML = `<span class="label">數量</span><span>${row.uiAmountLabel} ${row.symbol}</span>`;
  meta.append(qtyRow);

  const mintRow = document.createElement("div");
  mintRow.className = "token-detail-row";
  const mintLabel = document.createElement("span");
  mintLabel.className = "label";
  mintLabel.textContent = "Mint";
  const mintVal = document.createElement("span");
  mintVal.className = "token-detail-mint";
  if (row.id === NATIVE_SOL_ID) {
    mintVal.textContent = "原生";
  } else {
    mintVal.textContent = shortMint(row.id);
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "icon-btn ghost-inline";
    copyBtn.title = "複製 mint";
    copyBtn.setAttribute("aria-label", "複製 mint");
    copyBtn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    copyBtn.addEventListener("click", () => void navigator.clipboard.writeText(row.id));
    mintVal.append(copyBtn);
  }
  mintRow.append(mintLabel, mintVal);
  meta.append(mintRow);

  const verRow = document.createElement("div");
  verRow.className = "token-detail-row";
  verRow.innerHTML = `<span class="label">Verified</span><span>${row.isVerified ? "✓" : "—"}</span>`;
  meta.append(verRow);

  const scoreRow = document.createElement("div");
  scoreRow.className = "token-detail-row";
  const scoreText =
    row.organicScore != null && Number.isFinite(row.organicScore)
      ? String(Math.round(row.organicScore))
      : "—";
  scoreRow.innerHTML = `<span class="label">Jupiter score</span><span>${scoreText}</span>`;
  meta.append(scoreRow);

  elTokenDetailRoot.append(hero, meta);
  el.subpageTitle.textContent = row.name || row.symbol;
}

export function scheduleRefreshHomeAssets(state: State, force = false): void {
  if (session.homeAssetsRefreshTimer) clearTimeout(session.homeAssetsRefreshTimer);
  session.homeAssetsRefreshTimer = setTimeout(() => {
    session.homeAssetsRefreshTimer = null;
    void refreshHomeAssets(state, force);
  }, 300);
}

export async function refreshHomeAssets(state: State, force = false): Promise<void> {
  const gen = ++session.homeAssetsRequestGen;
  el.homeAssetsError.hidden = true;
  el.homeAssetsError.textContent = "";

  const active = state.accounts.find((a) => a.id === state.activeAccountId);
  if (!active || session.currentView !== "home-token") return;

  const hadRows = session.lastSuccessfulTokenRows.length > 0;
  if (!hadRows) {
    el.homeTokens.innerHTML = "";
    const loadingLi = document.createElement("li");
    loadingLi.className = "muted";
    loadingLi.textContent = "載入中…";
    el.homeTokens.append(loadingLi);
  }

  try {
    const res = await sendExtensionRequest("wallet.getHomeTokens", force ? { force: true } : {});
    if (gen !== session.homeAssetsRequestGen || session.currentView !== "home-token") return;
    if (!res.ok) {
      if (hadRows) {
        el.homeAssetsError.hidden = false;
        el.homeAssetsError.textContent = res.error?.message ?? "無法載入持倉";
        return;
      }
      el.homeTokens.innerHTML = "";
      el.homeAssetsError.hidden = false;
      el.homeAssetsError.textContent = res.error?.message ?? "無法載入持倉";
      return;
    }
    const payload = res.result as {
      rows?: HomeTokenRow[];
      error?: string;
      fromCache?: boolean;
    };
    const rows = payload.rows ?? [];
    session.lastSuccessfulTokenRows = rows;
    const nextActive = state.accounts.find((a) => a.id === state.activeAccountId);
    renderTokenCards(rows, nextActive != null && isCombinedAccount(nextActive));
    if (payload.error) {
      el.homeAssetsError.hidden = false;
      el.homeAssetsError.textContent = payload.error;
    }
  } catch (e) {
    if (gen !== session.homeAssetsRequestGen || session.currentView !== "home-token") return;
    if (hadRows) {
      el.homeAssetsError.hidden = false;
      el.homeAssetsError.textContent =
        e instanceof Error ? e.message : "無法載入持倉";
      return;
    }
    el.homeTokens.innerHTML = "";
    el.homeAssetsError.hidden = false;
    el.homeAssetsError.textContent =
      e instanceof Error ? e.message : "無法載入持倉";
  }
}
