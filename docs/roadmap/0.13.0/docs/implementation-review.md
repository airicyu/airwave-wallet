# Implementation review — 0.13.0 Airwave Wallet

- **日期：** R1 2026-10-05（Asia/Hong_Kong）
- **輪次：** R1（本檔累加；穩定 ID 勿重編號）
- **角色：** 實作審查（不改程式、不加功能、不 commit）
- **對照基準：** [`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`approval-host-how.md`](./approval-host-how.md)；[`../HANDOFF.md`](../HANDOFF.md)；[`reasoning.md`](../reasoning.md)；架構禁區見 [`../../GUIDELINES.md`](../../GUIDELINES.md)
- **現行程式：** working tree（未 commit）；不以 chat history 為準

---

## 總評

**R1：** 無未關閉 HIGH。0.13.0 宿主／共用審批殼／`walletSend` popup 路徑與 confirmed 0.5s 時序在靜態上對齊 INDEX／HOW；`typecheck`／`build` 通過。**Chrome 擴充手驗未在本環境執行**（INDEX checklist 雖已勾選，多項仍註「瀏覽器手驗待本機」——見 M2）。

---

## Findings

### HIGH

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| — | （無） | — | R1 未發現違反 GUIDELINES 架構禁區或 INDEX 已定案之主路徑問題。 | — |

### MEDIUM

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| M1 | `closePopoutForRequest` 僅 import、成功路徑未使用 | **已關閉** | 實作 session 已自 `index.ts` 移除 unused import。 | — |
| M2 | INDEX 驗收 checklist 全 [x] 與手驗狀態不一致 | **非阻擋** | INDEX 正文已註「瀏覽器手驗待本機」；建置與靜態對照通過。 | 出貨前本機走 test-web／popup 後可移除註記。 |
| M3 | Popup 關閉 abort 僅 `pagehide` | **已關閉** | popup 已加 `beforeunload`＋`pagehide` 呼叫 `ui.abortPending`。 | — |

### LOW

| ID | 標題 | 狀態 | 說明 |
|----|------|------|------|
| L1 | INDEX／HANDOFF 出貨欄 | **開啟** | INDEX 狀態 `in progress`；HANDOFF 完成檢查未勾——符合審查時點。 |
| L2 | 雙份宿主 HTML 骨架 | **備註** | [`wallet/src/popout/index.html`](../../../../wallet/src/popout/index.html) 與 popup [`index.html`](../../../../wallet/src/popup/index.html) 內 `appr-*` 為共用 [`shell.ts`](../../../../wallet/src/approval/shell.ts) 掛載點；邏輯未複製，但 markup 需同步維護。 |
| L3 | Working tree 混有 0.12.0 roadmap 與送幣模組 | **備註** | `git status` 含未追蹤 `docs/roadmap/0.12.0/` 與多個 `wallet-send-*` 檔；0.13.0 審查看法以 INDEX 錨點與宿主差異為準，0.12 語意假定已在 tree 內。 |

---

## 自動化測試

| 指令 | 結果 | 備註 |
|------|------|------|
| `cd wallet && npm run typecheck` | **通過** | R1 exit 0 |
| `cd wallet && npm run build` | **通過** | R1 `tsc --noEmit && vite build` exit 0 |

---

## 架構禁區（GUIDELINES／INDEX 摘要）

| 項 | 結論 | 靜態證據 |
|----|------|----------|
| Pending 僅 SW `Map`、不進 storage | **符合** | [`pending.ts`](../../../../wallet/src/background/pending.ts) `pendingRequests`；storage-keys 無 pending／walletSend 欄 |
| `uiHost` 標記宿主 | **符合** | 網站 enqueue `uiHost: "popout"` + `openPopout`；[`wallet.beginSend`](../../../../wallet/src/background/index.ts) `uiHost: "popup"`、無 `openPopout` |
| dApp 結果回原 tab、非全 tab 廣播 | **符合（未重審 frameId）** | `sendBridgeResult` 對指定 `tabId`；`walletSendSettled`／progress 經 `chrome.runtime.sendMessage` 給擴充頁 |
| 成功 `walletSend`：SW 立刻 settled、無 SW sleep(500) | **符合** | [`wallet-finish-send.ts`](../../../../wallet/src/background/wallet-finish-send.ts) `confirmed` 後即 `notify.settled`；無成功延遲 sleep |
| Confirmed 0.5s 在 UI | **符合** | [`shell.ts`](../../../../wallet/src/approval/shell.ts) `enterWalletSendConfirmedPage` → `setTimeout(..., 500)` → `onWalletSendSuccessExit` |
| `signTransaction` 批准後立刻關宿主 | **符合（靜態）** | `resolve` 成功後非 walletSend 路徑 `closeHost()`；popout callback `window.close` |
| `ui.abortPending` 冪等、walletSend 拒絕語意 | **符合** | [`wallet-send-abort.ts`](../../../../wallet/src/background/wallet-send-abort.ts)；無 pending 時 handler 仍 `{ ok: true }` |
| 離開審批 view → abort | **符合** | popup `navigateTo` 離開 `send-approval` 時 `ui.abortPending` |
| Custody／inject 不代簽 | **符合（本版 scope）** | 簽名仍在 SW＋審批 UI 解鎖流程；未改 vault 契約 |

---

## Track 對照（INDEX）

| Track | 靜態結論 | 備註 |
|-------|----------|------|
| 1 共用殼＋popout 薄宿主 | **通過** | [`popout/main.ts`](../../../../wallet/src/popout/main.ts) 僅 `mountApprovalShell` |
| 2 `walletSend` → popup 宿主＋abort | **通過（靜態）** | M3 `beforeunload` 缺口 |
| 3 confirmed 頁／auto-exit | **通過（靜態）** | popup `onWalletSendSuccessExit` → home-token＋`refreshHomeAssets(..., true)` |
| 4 build | **通過** | 見上表 |

---

## 驗收對照（INDEX 出貨 checklist）

**瀏覽器手驗：** 審查環境**未**載入未封裝擴充、**未**跑 test-web 連線／簽名／送幣流程。以下「手驗」欄均為 **未執行**，僅列靜態／建置證據。

| 驗收項 | 結果 | 證據 |
|--------|------|------|
| 共用審批模組：popout 與 popup `walletSend` 同一套 | **靜態通過** | 兩宿主皆 `mountApprovalShell`；無第二份審批邏輯檔 |
| 網站 connect／signMessage／signTransaction：仍 popout；`signTransaction` 批准立刻關、不廣播 | **靜態通過**／**手驗未做** | enqueue + `openPopout`；`finishSignTransaction` 只 `sendBridgeResult` 簽名 bytes |
| 錢包送出：`beginSend` 不 popout；popup 審批；站點 Airwave | **靜態通過**／**手驗未做** | `origin: "airwave:wallet"` + `displayOrigin` →「Airwave」 |
| 轉圈→confirmed 頁→~0.5s→home-token 重查 | **靜態通過**／**手驗未做** | shell confirmed timer 500ms；popup success exit 清表單＋`getHomeTokens` force |
| 拒絕或關 popup：pending 結束；欄位語意；broadcastSig 短錯誤 | **靜態通過**／**手驗未做** | reject／abort 共用 `finishWalletSendUserAbort`；popup 聽 settled `ok: false` |
| pending 不進 storage；settled／progress 僅 runtime 擴充頁 | **靜態通過** | 見架構表 |
| `typecheck` 與 `build` | **通過** | R1 |
| 文件與程式無真實秘密 | **通過** | 0.13.0 roadmap／changelog 抽樣未見助記詞／私鑰 |

---

## 錨點檔案抽樣

| 路徑 | R1 備註 |
|------|---------|
| `wallet/src/approval/shell.ts` | 共用審批；walletSend confirming／confirmed／500ms exit |
| `wallet/src/background/index.ts` | `ui.abortPending`、`wallet.beginSend`、`ui.resolvePending` walletSend 分支 |
| `wallet/src/background/wallet-finish-send.ts` | confirmed 後立刻 settled + optional signature |
| `wallet/src/background/wallet-send-abort.ts` | abort／reject 結束 pending |
| `wallet/src/popup/main.ts` | `send-approval`、pagehide abort、settled 失敗回 token-send |
| `wallet/src/popout/main.ts` | 薄宿主 |

---

## R1 審查環境

- OS：win32；PowerShell。
- Git：`main`，working tree 含 0.13.0 與 0.12.0 文件／送幣相關未追蹤與修改；**未 commit**。
- 瀏覽器：**未**安裝擴充手驗。
