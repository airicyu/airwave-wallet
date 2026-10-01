# 0.4.0／現行 popup 待修清單（給實作 agent）

對使用者：繁體中文。**Do not commit unless asked。**勿改 `../solibra-wallet`。勿把真實 Helius URL／Jupiter key 寫進 repo。

契約：[`../INDEX.md`](../INDEX.md)、[token-data-how.md](./token-data-how.md)、[0.3.0 popup-shell-how](../../0.3.0/docs/popup-shell-how.md)（鎖定只見 `#locked`）。

實作審查已關項（**不要重做**）：M1–M5、L1–L5。見 [implementation-review.md](./implementation-review.md)。

---

## P0 — 鎖定畫面與方案 A 殼疊在一起（手測已見）

**現象：** 開啟 popup 在鎖定態時，上方是「錢包已鎖定」＋密碼＋解鎖，下方仍有 mini wallet、複製、Lock、hamburger；Menu 出現兩個「Wallet accounts」；左側還有 Back。

**契約：** 0.3.0／0.4.0 鎖定時 **只**顯示 `#locked`，不顯示 `#shell`（無 widget／Menu／Token／Back）。

**根因：** `style.css` 裡 `.shell`、`.bar-home`、`.bar-subpage`、`.menu-dropdown` 設了 `display: flex`，蓋過 HTML `hidden`，導致 `el.shell.hidden = true` 無效。兩個頂欄同時畫出，且 `setMenuOpen(true)` 曾把兩個 dropdown 一起打開。

**應做：**

1. 全域 `[hidden] { display: none !important; }`（若 `wallet/src/popup/style.css` 已有，確認 **rebuild 後的 `wallet/dist` 有這段**）。
2. `setMenuOpen(true)` 只打開**目前未 hidden** 的那一條頂欄裡的 `.menu-dropdown`。
3. `cd wallet && npm run build`；Chrome 重新載入未封裝擴充。
4. 手驗：鎖定 → 只有解鎖屏；解鎖 → 只有 Home 或子頁其中一套頂欄；Menu 三項、無重複、無 Back 與 widget 同列。

**不做：** 重做導航、改回 0.2.0「鎖定可看餘額」。

---

## P1 — 確認 Jupiter 計價不再解析顯示字串

審查 M5 標已關：`HomeTokenRow.uiAmount` + `applyJupiterPrices` 用數值。Agent 抽樣確認 **沒有** `Number(uiAmountLabel.replace(...))`。勿從 `uiAmountLabel` 回推。

---

## P2 — 可選拋光（非 INDEX 硬門檻）

- 頂欄帳戶名過長變 `Acco...`：可用 CSS 省略或加 `title` 顯示全名，不要加寬 popup 超過約 384px。
- 鎖定時若 `#error` toast 仍露出，一併藏在 `#locked` 之下或鎖定時清／藏。

---

## 禁止

- 改 Wallet Standard 能力表、content 白名單加 `wallet.getHomeTokens`
- 餘額寫入 `chrome.storage`
- 引入 Helius／Jupiter SDK
- 把 combined／0.5.0 做進來

## 驗收

- [ ] 鎖定：只見解鎖表單
- [ ] Menu：三項各一、外側可關
- [ ] `npm run build` 通過
- [ ] 無真實 API key 進 git
