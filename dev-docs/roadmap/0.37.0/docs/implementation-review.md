# Implementation review — 0.37.0 Airwave Wallet

- 日期：第 1 輪 2026-10-12；第 2 輪 2026-10-13
- 輪次：**第 2 輪複審**（同一檔累加；ID 不重編）
- 角色：實作審查（不改程式）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- **總評：** 程式審查門檻**通過**。未關閉 HIGH：無。應修 MEDIUM：無（M1 已關閉）。可否出貨：**否**。INDEX 窄測 11 項、`npm run typecheck`、`npm run build` 通過。換站、同 origin 改 path、`about:` 或讀不到、斷線這幾項手驗**沒有證據**。L1、L2 仍開，非阻擋。本輪沒有新 ID。

## Findings

關閉＝現碼符合已定案。仍開＝現碼或窄測仍未蓋住該項。非阻擋＝不擋本輪程式門檻。

### HIGH

#### H1 — 送出前的剪枝會改到其他 origin 的 tabId — **關閉**

第 1 輪：`sendToLiveTabs` 把 `left-web` 與「另一個 http origin」送進 `pruneTabId`。該函式在 `left-web` 時改每一列，在 http 時改所有 key 不等於目前 origin 的列。只通知一個 origin 時，會寫到不是這一列的 `tabIds`。

第 2 輪：`applyLiveTab` 已改道。`unknown` 回原 map。`tabs.get` 失敗（`kind: "closed"`）才 `forgetTab`，從每一列拿掉且不刪 origin 鍵。`left-web`，以及 http 但 origin 不等於這一列，走 `dropTabFromOrigin`，只改傳入的那一列。對得上的 http 在呼叫 `applyLiveTab` 之前就 `sendMessage` 並 `continue`。`onUpdated`／`onRemoved` 仍由 `pruneStoredTab` 呼叫全域 `pruneTabId`，這條沒有改。窄測不斷言 `sendMessage`；送出前的範圍以 `origin-notify.ts` 現碼為準。

### MEDIUM

| ID | 狀態 | 依據 |
|----|------|------|
| M1 | **關閉**（第 2 輪） | 第 1 輪：`connection-tabs.test.ts` 的 B 列一開始就是 `tabIds: [7]`，剪到 `https://b.example/swap` 後仍是 `[7]`，沒有斷言「B 原本沒有該 tabId 時不會被寫進去」。第 2 輪：另有「moving from A to B does not add the tab to B」。起點 A 為 `[7]`、B 為 `[]`，剪到 `https://b.example/swap` 後 A、B 都是 `[]`，B 的 origin 鍵還在。`pruneTabId` 只 `filter`，沒有 push。本輪該測通過。 |

### LOW

| ID | 狀態 | 依據 |
|----|------|------|
| L1 | **仍開**（非阻擋） | 「在途第二次插入不呼叫 `schedulePendingTimeout`，成功插入才呼叫」在 `presentDappApproval` 與 `handleBeginSend` 的程式路徑上成立：兩處都在 `addPending` 為 true 之後才排程。窄測仍只斷言 map 與錯誤碼，沒有斷言逾時計時器。 |
| L2 | **仍開**（非阻擋） | `installConnectionTabWatch` 仍以 `void pruneStoredTab(...)` 掛上監聽。`runConnectionWrite` 的鏈尾會吞掉拒絕，讓下一步前進；回傳的那份 promise 沒有被接住。寫入失敗時這一次剪枝不會進 storage。 |

## 驗收對照

| INDEX 驗收句 | 結果 | 證據 |
|--------------|------|------|
| 同一 `requestId` 再送另一筆：`REQUEST_ID_IN_USE`，第一筆 payload 與 origin 不變，不為該 id 再開 popout | 通過 | 窄測「a second insert…」。`presentDappApproval` 在 `addPending` 失敗時立刻回 `pendingInsertRefusal`，不會走到 `openPopout`。content script 把 `res.error` 轉給頁面。不開第二扇 popout 沒有手驗。 |
| 空的、長於 80 字元、或不是字串的 id：`INVALID_REQUEST_ID`，不插入 | 通過 | 窄測空字串、非字串、81 字元。恰好 80 字元可插入，窄測沒有蓋到；已定案禁止的是長於 80。 |
| 取走、拒絕或逾時後同一 id 可再插入；在途第二次不呼叫 `schedulePendingTimeout`，成功的新插入才呼叫 | 通過 | 窄測在 `removePending` 之後可再插入。`takePending`／`rejectOrdinaryDappPending`／逾時都刪 map。`schedulePendingTimeout` 只寫在兩處插入成功之後（L1）。 |
| `wallet.beginSend` 插入失敗的錯誤碼來自 `pendingInsertError` | 通過 | `send-command.ts` 在 `addPending` 為 false 時呼叫 `pendingInsertError`。無窄測。 |
| 側欄通知失敗改開 popout：只改 `uiHost`，payload 不變 | 通過 | 窄測 `setPendingUiHost`。`presentDappApproval` 在側欄通知失敗時 `setPendingUiHost(id, "popout")` 再 `openPopout`。 |
| 另一個 `requestId` 仍可成為另一筆待批 | 通過 | `addPending` 只拒絕同一個已在途或不合格的 id。無頻率上限。無窄測。 |
| 手驗：已連線分頁導到另一個 https origin 後切換帳戶：新頁面收不到公鑰；舊 origin 仍在，其 `tabIds` 不含該分頁；新 origin 不因此加入該分頁 | 未驗 | 沒有證據。本環境不能載入未解包擴充。窄測不斷言 `sendMessage`。純函數有「A 導到 B 不寫進 B」。 |
| 手驗：同一 origin 只改 path：tabId 仍在，帳戶變更仍送到該分頁 | 未驗 | 沒有證據。純函數窄測有「同 origin 留著」。送出沒有手驗。 |
| 手驗：網址仍是 `about:` 或讀不到時切換帳戶：不送公鑰，該 tabId 仍留在原 origin | 未驗 | 沒有證據。純函數窄測有 `about:blank`、空字串、缺網址不改 tabId。送出沒有手驗。 |
| 分頁關閉，或網址變成 `left-web`：每個 origin 都拿掉該 tabId，origin 列還在 | 通過 | 窄測 `chrome://newtab/` 與 `forgetTab`：各列去掉 id，空的 `tabIds` 仍留著 origin 鍵。`onRemoved` 以 `left-web` 呼叫 `pruneStoredTab`。storage 寫回沒有手驗。 |
| 手驗：斷線通知不送到已離開該 origin 的分頁 | 未驗 | 沒有證據。程式在 origin 對不上時不 `sendMessage`；剪枝範圍見 H1（第 2 輪已關閉）。 |
| 在 `wallet/` 執行 esbuild ＋ `node --test`；跑完刪除兩個 `.mjs`，不進 git | 通過 | 第 2 輪已跑，11 項通過，exit 0。兩個 `.mjs` 已刪，工作區沒有這兩個檔。 |
| `connection-tabs` 測試斷言：換 http origin 只拿掉不相等的列；`about:` 與缺網址不動；`left-web` 與 `forgetTab` 從每一列拿掉且 origin 鍵還在；同 origin 留著；A 導到 B 不把 tabId 寫進 B | 通過 | 第 2 輪六個 connection-tabs 測都通過。A 導到 B 的起點是 B 的 `tabIds: []`，剪完仍是 `[]`（M1）。 |
| `cd wallet` 後 `npm run typecheck` 與 `npm run build` | 通過 | 兩者 exit 0。`tsconfig.json` 仍排除 `src/**/*.test.ts`。 |
| 出貨時 `version.md`、`changelog.md`、`wallet/package.json`、`wallet/manifest.config.ts` 對齊 0.37.0 | 未做 | 狀態仍是 `in progress`。`version.md`、`package.json`、`manifest.config.ts` 目前為 0.36.0。`changelog.md` 最新條是 0.36.0。這是出貨步驟，本輪不另開 finding。 |

## 測試結果

cwd：`wallet/`。PowerShell 用分號串接，並以 `$LASTEXITCODE` 判斷。

```text
npx esbuild src/background/pending/pending.test.ts --bundle --platform=node --format=esm --outfile=pending.test.mjs
npx esbuild src/background/messaging/connection-tabs.test.ts --bundle --platform=node --format=esm --outfile=connection-tabs.test.mjs
node --test pending.test.mjs connection-tabs.test.mjs
```

第 2 輪結果：11 tests，11 pass，0 fail。exit 0。跑完已刪除 `pending.test.mjs` 與 `connection-tabs.test.mjs`。

接著 `npm run typecheck`（`tsc --noEmit`）exit 0；`npm run build`（`tsc --noEmit` ＋ vite build）exit 0。

手驗：沒有載入未解包擴充，沒有證據。沒有用 `bun test`。

## 現碼抽樣

| 錨點 | 與已定案 |
|------|----------|
| `pending/pending.ts` | `addPending` 只在 id 為非空字串、長度 ≤ 80、且 map 沒有該 id 時 `set` 並呼叫 hook。失敗不改既有記錄、不呼叫 hook。`pendingInsertError` 分 `INVALID_REQUEST_ID`／`REQUEST_ID_IN_USE`。`setPendingUiHost` 只改已存在記錄的 `uiHost`。pending 仍是記憶體 `Map`，沒有寫進 `chrome.storage`。 |
| `handlers/dapp-handlers.ts` | `presentDappApproval` 在任何 `await` 之前 `addPending`。失敗回上述錯誤碼。成功才 `schedulePendingTimeout`。側欄成功維持 sidebar；通知失敗改回 popout 再開一扇。connect／signMessage／signTransaction／signAndSendTransaction 都走這一條。 |
| `wallet/commands/send-command.ts` | `wallet.beginSend` 插入失敗使用 `pendingInsertError`，成功才排逾時。 |
| `messaging/open-popout.ts` | popout URL 仍只帶 `requestId`。 |
| `messaging/connection-tabs.ts` | 不碰 `chrome`。分類與 HOW 的表一致。`pruneTabId` 不突變呼叫者的陣列；空的 `tabIds` 仍留 origin 鍵。`forgetTab` 等於對 `left-web` 做 `pruneTabId`。`dropTabFromOrigin` 只從指名的那一列拿掉 tabId，不寫進其他列。 |
| `messaging/connection-write.ts` | 一條 Promise 鏈。前一步的拒絕不會卡住尾端。 |
| `messaging/origin-notify.ts` | 剪枝、`rememberConnectedTab`、`removeConnectionAndNotify`、`disconnectAllConnections`、`alignConnectionsToActiveAccount`、`rebindConnectionsToAccount`（`handleSetActiveAccount`）、`disconnectOriginsForAccount`（`handleDeleteAccount`）以及兩個 notify 都進這條鏈。已占住鏈的步驟改呼叫 `deliverAccountChanged`／`deliverDisconnected`，沒有再 `await` 下一個名額；送出前拿掉 tabId 在同一步裡 `writeConnections`。切換帳戶與 align 改 `accountId` 時不直接改 `tabIds`。`sendBridgeResult` 與 `tabOriginStill` 的三態還在，刪 tabId 不看 `"changed"`。送出前剪枝見 H1（已關閉）。 |
| `background/index.ts` | `installConnectionTabWatch` 只在 `bootServiceWorker`，且該函式只在 service worker realm 執行。`onUpdated` 在 `changeInfo.url` 有值或 `status === "complete"` 時，用 `changeInfo.url ?? tab.url` 分類。`onRemoved` 走 `left-web`。 |
| `manifest.config.ts` | 本版沒有為這項修復加權限。版本欄仍是 0.36.0。 |
| 畫面文案 | 沒有新增 `ui-messages` 鍵。dApp 錯誤訊息是回應裡的英文字串，不是錢包畫面文案。 |

架構禁區抽樣：pending 不進持久 store；帳戶變更與斷線是對單一 tab 的 `sendMessage`，不是全 tab 廣播；沒有硬編碼密碼；監聽不在擴充頁註冊。

## 修復追蹤

| ID | 級 | 狀態 | 關閉位置 |
|----|----|------|----------|
| H1 | HIGH | 關閉（第 2 輪） | `origin-notify.ts` 的 `applyLiveTab` → `dropTabFromOrigin`；`tabs.get` 失敗仍 `forgetTab` |
| M1 | MEDIUM | 關閉（第 2 輪） | `connection-tabs.test.ts`「moving from A to B does not add the tab to B」 |
| L1 | LOW | 仍開 | — |
| L2 | LOW | 仍開 | — |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 第 1 輪 | 2026-10-12 | 門檻不通過。未關閉 H1。窄測 9 項、typecheck、build 通過。手驗沒有證據。M1 應修。L1、L2 非阻擋。 |
| 第 2 輪 | 2026-10-13 | 程式審查門檻通過。H1、M1 關閉。無未關閉 HIGH，無應修 MEDIUM。窄測 11 項、typecheck、build 通過。手驗沒有證據，尚不可出貨。L1、L2 仍開，非阻擋。無新 ID。 |
