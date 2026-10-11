# HOW — 0.13.0 審批宿主

INDEX 衝突以 INDEX 為準。`walletSend` 組交易／廣播／`broadcastSig`／模擬 CU 以 [0.12.0 send-token-how](../../0.12.0/docs/send-token-how.md) 與 [0.11.0](../../0.11.0/INDEX.md) 為準；本檔只寫 **宿主** 與 **離開呈現** 差異。

## 不改

- dApp `signTransaction`：批准只簽、回原 tab、**不** send、**立刻**關 popout
- pending 只在 SW `Map`；UI 只持 `requestId`
- 不宣告 Wallet Standard 新方法（含 `signAndSendTransaction`）
- 網站＋popup mode → 仍 `openPopout`（即使 popup 已開）

## 宿主矩陣（本版實作列）

| 發起 | 殼模式 | 宿主 | 本版 |
|------|--------|------|------|
| 網站 connect／signMessage／signTransaction | popup | popout | **做**（維持） |
| 網站同上 | sidebar | sidebar 殼內 | **不做**（契約預留） |
| 錢包內 `walletSend` | popup | popup 殼內 | **做** |
| 錢包內操作 | sidebar | sidebar 殼內 | **不做**（預留） |

## `uiHost`

`addPending` 時寫入記憶體欄 `uiHost: "popout" | "popup"`：

- 網站三類 enqueue → `"popout"` 後 `openPopout(requestId)`（同現況 bind windowId）
- `wallet.beginSend` 成功 enqueue → `"popup"`，**禁止** `openPopout`；回 `{ requestId }` 給 popup

日後 sidebar 出貨再加 `"sidebar"`。

## 共用審批殼

單一模組負責：

- 依 `ui.getPending` 的 `kind` 畫 connect／signMessage／signTransaction／walletSend
- `ui.simulatePendingTx`、交易費／CU、明細、鎖定解鎖、拒絕／批准
- `walletSend`：批准後立刻 **pending confirm 全頁轉圈**；聽 `ui.walletSendProgress`；收到 `settled` `ok: true` → **同一畫面 confirmed** → 0.5s → 呼叫宿主 `onSuccessExit`

`popout/main.ts` 與 popup 審批 view **只**負責：讀 `requestId`、掛模組、實作 `onSuccessExit`／`onRejectExit`（關窗或 navigate）。

模組目錄名實作時定，寫進 HANDOFF 錨點；禁止在 popup 複製第二套審批 DOM／邏輯。

## Popup：`walletSend` 流程

1. token-send 確認 → `wallet.beginSend`（組交易同 0.12.0）。
2. 成功得 `requestId` → 導向審批 view，記憶體存 `requestId`。
3. 掛共用模組；站點「Airwave」。
4. **拒絕按鈕**：與 0.12.0 拒絕同；`settled` `ok: false`；回到 **token-send**（欄位保留）。
5. **關閉 popup**（`pagehide`／`beforeunload`）：`ui.abortPending` `{ requestId }`。
6. **導離審批 view**（Back／其他 navigate）且未 settled：同樣 `ui.abortPending`。
7. **批准**：立刻 `{ accepted: true }`；UI **立刻**進入 pending confirm 全頁（轉圈；審批內容與底欄收掉）；SW 背景簽＋送＋等 confirmed（≤60s；`broadcastSig` 規則同 0.12.0）。
8. **成功：** 見下節時序。

## 成功時序（權威）

鏈上 `confirmed` 之後（SW）：

1. 結束 pending（`removePending`／同等）。
2. `chrome.runtime.sendMessage` `ui.walletSendSettled` `{ ok: true, requestId, signature?: string }`（`signature`＝`broadcastSig` 若有）。
3. **禁止** `sleep(500)` 再 settled。
4. **禁止**對 `uiHost === "popup"` 呼叫 `closePopout`。對 `uiHost === "popout"` 過渡路徑：**也不**由 SW 在 settled 前／後立刻 `closePopout`；改等 UI。

共用殼（pending confirm → confirmed，**同一畫面**）：

1. `{ accepted: true }` 後：**禁止**把「確認中」只寫在批准鈕上。須收掉審批內容與拒絕／批准底欄，全頁轉圈＋「確認中」。
2. 收到上述 `settled` `ok: true` → **同一張狀態卡**變成 **confirmed**（「已確認」＋勾示意＋可選 signature 前 4…後 4）。
3. **禁止**此刻立刻 `navigateTo("home-token")`。
4. 再等 **0.5s** → 宿主 `onSuccessExit`：popup → home-token＋清表單＋`getHomeTokens`；popout → `window.close`。

確認失敗：不發成功 settled；`ui.walletSendProgress` 短錯誤；可再批准。

## Popout：網站路徑

- 網站三類：`openPopout`、bind windowId、`windows.onRemoved`＝拒絕（可另呼 abort 冪等）。
- `signTransaction` 批准成功：立刻 `window.close`（無 confirmed 頁）。

## Confirmed 頁

- 僅錢包側已 `confirmed` 後；與 pending confirm **同一畫面轉換**，不是另開一頁再閃走。
- 無主按鈕；0.5s auto-exit。
- 頁殼遵守 design-principles（勿 fixed 冒充）。

## 命令

| 命令 | 變化 |
|------|------|
| `wallet.beginSend` | 成功後 **不** `openPopout`；pending `uiHost: "popup"`；回 `{ requestId }` |
| `ui.abortPending` | **新增**。payload `{ requestId: string }` → `{ ok: true }`。見 INDEX。與拒絕共用結束路徑；有 `broadcastSig` 時 `settled` message「已送出、確認未知」 |
| `ui.walletSendSettled` | 成功時可多可選 `signature`；**成功路徑由 SW 在 confirmed 後立刻發**，不再附帶 SW 500ms delay |
| `ui.walletSendProgress` | 不變；僅擴充頁 |
| 網站 enqueue | 仍 `openPopout`；`uiHost: "popout"` |

### `ui.abortPending` 細節

- 無 pending／錯 `requestId`／已結束：回 `{ ok: true }`，不報錯打擾。
- 進行中的 confirm wait：取消；不撤回鏈上。
- 清 `broadcastSig`／working 記憶體隨 takePending。

## Finish 與 `closePopout`

改寫 `wallet-finish-send`（或同等）：成功分支刪除「先 sleep 再 closePopout 再 settled」。改為立刻 settled；`closePopout` **不**在 popup 宿主成功路徑呼叫。過渡 popout 宿主成功亦由 UI 關窗。

## 通知與禁區

- 禁止 `sendBridgeResult`／內容 tab 廣播處理 `walletSend`
- pending／`uiHost`／未簽 bytes 不進 chrome.storage
