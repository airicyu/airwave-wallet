# 0.37.0 HANDOFF

**狀態：** 已出貨（0.37.0）。設計審查第 3 輪通過。實作審查第 2 輪通過（H1、M1 已關；L1、L2 非阻擋）。換站、同 origin 改 path、`about:`、斷線這四條手驗沒有瀏覽器證據；2026-10-13 使用者指示出貨。

只認檔案。先讀 `AGENTS.md`、`dev-docs/roadmap/GUIDELINES.md`、本版 `INDEX.md`、`docs/how.md`、`docs/reasoning.md`。

**核心：** 安全修復。`addPending` 不覆寫在途 id。連線 `tabIds` 在分頁離開該 origin 時拿掉。帳戶變更與斷線改看 `classifyTabUrl`：`unknown`（含 `about:`）不送也不刪 tabId；`left-web` 或另一個 http(s) origin 不送並刪 tabId。`tabs.get` 失敗視同關閉。不刪 origin 信任，不加畫面文案。`connections` 的讀改寫走同一條 Promise 鏈，含切換帳戶與刪帳戶。已占住鏈的步驟，內部通知在同一步做完，不得再 await 鏈的下一個名額。

**Track：** 1 待批只插入 → 2 網址分類與通知前再查。

**禁區：** pending 不進 storage；結果不廣播到所有 tab；不加 manifest 權限；不做非目標裡的上鎖、密碼、RPC 審批改版。

**錨點：** `pending.ts`、`dapp-handlers.ts`、`send-command.ts`、`origin-notify.ts`、`connection-tabs.ts`（`dropTabFromOrigin` 只動通知那一列）、`connection-write.ts`、`background/index.ts`。

**完成檢查：** INDEX 驗收的 esbuild＋`node --test`、`npm run typecheck`、`npm run build`。換站收不到公鑰需未封裝擴充手驗；做不到就在實作審查寫明。

## Paste-ready

```text
實作 Airwave 0.37.0。只認 dev-docs/roadmap/0.37.0/INDEX.md、docs/how.md、docs/reasoning.md 與 HANDOFF.md。
Track 1：addPending 只插入；在途回 REQUEST_ID_IN_USE；不合格 id 回 INVALID_REQUEST_ID；setPendingUiHost 只改 uiHost。
Track 2：connection-tabs.ts 的 classifyTabUrl／pruneTabId／forgetTab；service worker 的 tabs.onUpdated 與 onRemoved；送出前用 classifyTabUrl，unknown 不刪 tabId；connections 讀改寫一條 Promise 鏈，含 handleSetActiveAccount 與 handleDeleteAccount。已占住鏈的步驟，內部通知在同一步做完，不得再 await 鏈的下一個名額。
不要刪 origin 連線，不要在 about: 或未知網址時清 tabId，不要拿 tabOriginStill 的 changed 來刪 tabId，不要加使用者可見文案。
驗收：在 wallet/ 執行 INDEX 裡的 esbuild 與 node --test 整段，跑完刪除兩個 mjs；cd wallet && npm run typecheck && npm run build。
```
