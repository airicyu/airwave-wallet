# 0.37.0 — 安全修復：待批不可換包、連線分頁離開 origin 不再收公鑰

- **狀態：** `shipped`
- **上游版本：** [0.36.0](../0.36.0/INDEX.md)；連線與 origin 核對接 [0.27.0](../0.27.0/INDEX.md)
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 本版安全修復，無 backlog 條目
- **秘密欄位：** 無

## 產品句

安全修復，不加薪功能。進行中的批准不能被同一個 `requestId` 換成另一筆內容。已連線網站的分頁若離開該 origin，不再收到帳戶公鑰；該 origin 的連線信任仍在。

## 文件地圖

1. 本檔
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 待批只插入 | `addPending` 在 id 已存在時回傳失敗，不改 payload、origin、tabId、frameId、`signAccountId`、`uiHost`，也不呼叫 `schedulePendingTimeout`。id 不是非空字串，或長於 80 字元，不插入。80 是為了不讓一筆超長 key 占住 map，不是密碼學長度。 |
| 換包錯誤 | 已在途：對該次請求回 `REQUEST_ID_IN_USE`。id 不合格：回 `INVALID_REQUEST_ID`。兩碼都來自 `pendingInsertError`。dApp 的 `presentDappApproval` 與 `wallet.beginSend` 都用它，不另寫死字串。不開第二扇同一 id 的 popout。該筆被取走、拒絕或逾時而從 map 刪除之後，同一 id 可以再插入，並且那一次成功插入才呼叫 `schedulePendingTimeout`。 |
| 側欄改 popout | 同一筆已插入的記錄只可用 `setPendingUiHost` 改 `uiHost`。不得藉此換 payload。 |
| 新 id | 另一個 `requestId` 仍是另一筆待批，可再開批准窗。本版不加頻率上限。 |
| 頁面仍帶 id | service worker 不改發自己的 id。頁面帶來的 id 只當 map key。 |
| 換了 http(s) origin | 分頁網址已是 http(s)，且與某一列的 origin 不同：只從那些不等於目前 origin 的列拿掉該 tabId。等於目前 origin 的列不動。origin 列留著，`accountId` 與 `connectedAt` 不變。`tabIds` 變空也不刪 origin。 |
| 離開網頁 | 網址是 `left-web`（不是 http/https，也不是未知或 `about:`）：從每一列的 `tabIds` 拿掉該 tabId。不刪 origin 列。 |
| 未知網址不刪 | 網址缺漏、解析失敗、或協定是 `about:` 時不改 `tabIds`。同分頁只改 path 或 query、origin 不變，tabId 留著。 |
| 分頁關閉 | `chrome.tabs.onRemoved`，或送出前 `chrome.tabs.get` 失敗：從所有 origin 的 `tabIds` 拿掉該 tabId。不刪 origin。 |
| 帳戶通知與斷線 | 送出 `airwave-bridge-account-changed` 與 `airwave-bridge-disconnected` 之前，對該列每個 tabId 用與 `classifyTabUrl` 相同的規則看 `chrome.tabs.get` 的網址。分類為 `http` 且 origin 等於這一列才 `sendMessage`。分類為 `left-web`、或 `http` 但 origin 不等於這一列：不送，並只從這一列拿掉該 tabId。分類為 `unknown`：不送，也不改 `tabIds`。`tabs.get` 失敗視同分頁關閉。簽名前的 `tabOriginStill` 維持 0.27.0 三態，不拿它的 `"changed"` 來刪 tabId。 |
| 不自動改掛 | 分頁從已連線的 A 導到已連線的 B 時，只從 A 的 `tabIds` 移除，不自動加入 B。切換帳戶與 align 仍不為了改綁 `accountId` 而改 `tabIds`；送出前分類為 `left-web` 或另一個 http origin 時，仍從該列拿掉 tabId。 |
| 簽章回傳 | 不改 `sendBridgeResult`。簽名前的 `tabOriginStill` 維持 0.27.0。 |
| 連線寫入鏈 | 同一 service worker 裡，剪枝、通知路徑拿掉 tabId、`rememberConnectedTab`、`removeConnectionAndNotify`、`disconnectAllConnections`、`alignConnectionsToActiveAccount`、`handleSetActiveAccount`、`handleDeleteAccount` 對 `connections` 的讀改寫排成一條 Promise 鏈。後一步讀到的是前一步寫完的 map。已經占住這一步時，內部的 `notifyAccountChanged`、`notifyAccountChangedForConnectionAccount`、`notifyDisconnected` 在同一步裡做完讀改寫與送出，不得再向同一條鏈 `await` 下一個名額。鏈的尾端只在這一步整段結束後才讓給下一步。不新增 storage 欄。 |
| 窄測不是整包指令 | 驗收裡的 esbuild＋`node --test` 只跑本版兩個測試檔。不回寫 GUIDELINES 出貨檔案表。`npm run typecheck` 仍排除 `src/**/*.test.ts`。 |
| 權限與畫面 | 不加 manifest 權限、不加命令、不加 storage 欄、不加使用者可見文案。監聽只在 service worker 註冊。 |
| 版本號 | 出貨時 `version.md`、`changelog.md`、`wallet/package.json`、`wallet/manifest.config.ts`，以及根 `README.md` 的版本句，對齊 **0.37.0**。 |

## 非目標

- 閒置自動上鎖、拉高密碼下限、http 來源警告、審批改以本機指令為主畫面、API 金鑰加密、密碼欄改回 `type=password`
- 限制不同 `requestId` 可開的批准窗數量
- 由 service worker 改發 `requestId`
- 分頁離開後刪掉整個 origin 連線（那會強迫下次再審批）
- 對已離開的分頁送斷線或帳戶變更
- 改簽署 bytes、CU、交易 AI、模擬

## 實作軌道

### Track 1 — 待批不可換包

**做什麼：** `addPending` 只插入；失敗時 dApp 與 `wallet.beginSend` 得到上表錯誤碼；側欄改宿主走 `setPendingUiHost`。

**不要做什麼：** 不要改 popout URL 仍只帶 `requestId` 的契約；不要把 pending 寫進 `chrome.storage`。

**驗收：** 下方單元測試裡「同一 id 第二次插入保留第一筆 payload」通過。

### Track 2 — 連線分頁跟 origin

**做什麼：** 純函數分類網址並從連線 map 拿掉 tabId；service worker 在 `tabs.onUpdated`／`tabs.onRemoved` 呼叫它；帳戶變更與斷線送出前用 `classifyTabUrl`（`unknown` 不刪 tabId）。`connections` 的讀改寫走同一條 Promise 鏈。

**不要做什麼：** 不要在未知網址或 `about:` 時清 tabId；不要刪 origin 列。

**驗收：** 純函數測試覆蓋「換 origin 只拿掉 tabId」「`about:` 不動」「離開網頁與分頁關閉從所有列拿掉」「同 origin 留著」。

## 驗收

- [x] 進行中的 dApp 請求再用同一 `requestId` 送另一筆：回應 `REQUEST_ID_IN_USE`，map 裡第一筆 payload 與 origin 不變，不為該 id 再開 popout
- [x] 空的 `requestId`，以及長於 80 字元或不是字串的 id：回應 `INVALID_REQUEST_ID`，不插入
- [x] 該筆被取走、拒絕或逾時後，同一 id 可以再插入；在途的第二次插入不呼叫 `schedulePendingTimeout`，成功的新插入才呼叫
- [x] `wallet.beginSend` 插入失敗時，錯誤碼來自 `pendingInsertError`，與 dApp 相同
- [x] 側欄通知失敗改開 popout：只改 `uiHost`，payload 不變
- [x] 另一個 `requestId` 仍可成為另一筆待批
- [ ] 手驗：已連線分頁導到另一個 https origin 後切換帳戶：新頁面收不到公鑰；舊 origin 仍在 `connections`，其 `tabIds` 不含該分頁；新 origin 的 `tabIds` 不因此加入該分頁。窄測不斷言 `sendMessage`
- [ ] 手驗：同一 origin 只改 path：tabId 仍在，帳戶變更仍送到該分頁。窄測不斷言 `sendMessage`
- [ ] 手驗：網址仍是 `about:` 或讀不到時切換帳戶：不送公鑰，該 tabId 仍留在原 origin
- [x] 分頁關閉，或網址變成 `left-web`：每個 origin 都拿掉該 tabId，origin 列還在
- [ ] 手驗：斷線通知不送到已離開該 origin 的分頁
- [x] 在 `wallet/` 執行下面整段；兩個 `.mjs` 跑完刪除，不進 git

```text
npx esbuild src/background/pending/pending.test.ts --bundle --platform=node --format=esm --outfile=pending.test.mjs
npx esbuild src/background/messaging/connection-tabs.test.ts --bundle --platform=node --format=esm --outfile=connection-tabs.test.mjs
node --test pending.test.mjs connection-tabs.test.mjs
```

- [x] 上述 `connection-tabs` 測試斷言：換 http origin 只拿掉不相等的列；`about:` 與缺網址不動；`left-web` 與 `forgetTab` 從每一列拿掉且 origin 鍵還在；同 origin 留著；A 導到 B 不把 tabId 寫進 B
- [x] `cd wallet && npm run typecheck && npm run build`

2026-10-13 使用者指示出貨。上面未勾的四條是瀏覽器手驗，本環境沒有載入未封裝擴充，沒有證據。

## 錨點

| 路徑 | 用途 |
|------|------|
| `wallet/src/background/pending/pending.ts` | 只插入、`setPendingUiHost` |
| `wallet/src/background/handlers/dapp-handlers.ts` | dApp 待批與拒絕換包 |
| `wallet/src/background/wallet/commands/send-command.ts` | 錢包送出待批同樣只插入 |
| `wallet/src/background/messaging/origin-notify.ts` | 帳戶變更與斷線只送到仍在該 origin 的 tab |
| `wallet/src/background/messaging/connection-tabs.ts` | 網址分類與從連線 map 移除 tabId（本版新增） |
| `wallet/src/background/index.ts` | 只在 service worker 註冊分頁監聽 |
