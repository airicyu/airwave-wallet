# 0.37.0 — 怎麼做

契約見 [INDEX](../INDEX.md)。本檔只寫已定案的做法。

## 待批 id

`addPending(id, record)`：

1. `id` 不是非空字串，或 `id.length > 80` → 回傳 `false`，不寫 map。
2. `pendingRequests` 已有該 id → 回傳 `false`，不改既有記錄、不呼叫 pending-added hook、不重設逾時。
3. 否則 `set` 並呼叫既有 hook，回傳 `true`。

失敗原因由 `pendingInsertError(id)` 區分：不合格 → `INVALID_REQUEST_ID`；否則 → `REQUEST_ID_IN_USE`。dApp 的 `presentDappApproval` 與 `wallet.beginSend` 都把這個 code 放進該次 `ExtensionResponse.error`。不新增 `ui-messages` 鍵。

`presentDappApproval` 在任何 `await` 之前呼叫 `addPending`。側欄開著時，插入成功後才 `setPendingUiHost(id, "sidebar")`；側欄通知失敗則 `setPendingUiHost(id, "popout")` 再 `openPopout`。`setPendingUiHost` 只改已存在記錄的 `uiHost`。

逾時仍用插入成功後的那一次 `schedulePendingTimeout`。拒絕插入時不呼叫它。

## 網址分類

`connection-tabs.ts` 不碰 `chrome`。

`classifyTabUrl(url)`：

| 輸入 | 結果 |
|------|------|
| `undefined`、空字串、`URL` 解析失敗、協定 `about:` | `unknown` |
| `http:` 或 `https:` | `{ kind: "http", origin }`（`URL.origin`） |
| 其他協定（含 `chrome:`、`file:`、`data:`、`blob:`） | `left-web` |

`pruneTabId(connections, tabId, class)` 回新的 map 與是否有改動。不突變呼叫者持有的陣列；改的是複本。

| class | 結果 |
|-------|------|
| `unknown` | map 不變 |
| `left-web` | 每個 origin 的 `tabIds` 去掉該 tabId；origin 鍵保留 |
| `http` | 只從 **key 不等於該 origin** 的列去掉該 tabId；等於該 origin 的列不動 |

`forgetTab(connections, tabId)` 等於對 `left-web` 做 `pruneTabId`，給分頁關閉用。

## 何時寫回 storage

`chrome.tabs.onUpdated`：`changeInfo.url` 有值，或 `changeInfo.status === "complete"` 時，用 `changeInfo.url ?? tab.url` 分類並剪枝。其他 onUpdated 忽略。

`chrome.tabs.onRemoved`：`forgetTab`。

兩條監聽在 `bootServiceWorker` 註冊，不在擴充頁註冊。

同一 service worker 裡，下列對 `connections` 的讀改寫共用一條 Promise 鏈：剪枝、通知路徑拿掉 tabId、`rememberConnectedTab`、`removeConnectionAndNotify`、`disconnectAllConnections`、`alignConnectionsToActiveAccount`、`handleSetActiveAccount`、`handleDeleteAccount`。鏈上的一步先 `await` 前一步，再 `readConnections`，改完才 `writeConnections`。沒有改動不寫。不新增 storage 欄。

已經占住這一步時，內部再呼叫 `notifyAccountChanged`、`notifyAccountChangedForConnectionAccount` 或 `notifyDisconnected`，要在同一步裡直接做完讀改寫與送出，不得再向同一條鏈 `await` 下一個名額。鏈的尾端只在這一步整段結束後才讓給下一步。`alignConnectionsToActiveAccount`、`removeConnectionAndNotify`、`disconnectAllConnections`、`handleSetActiveAccount`、`handleDeleteAccount` 都適用。切換帳戶與 align 改 `accountId` 時不順便改 `tabIds`；送出前的分類仍可拿掉已離開的 tabId。

## 送出前再查

不要用 `tabOriginStill` 的 `"changed"` 決定是否刪 tabId。對 `chrome.tabs.get` 的網址呼叫 `classifyTabUrl`：

| 分類 | 動作 |
|------|------|
| `http` 且 origin 等於這一列 | `chrome.tabs.sendMessage`（訊息形狀不變） |
| `left-web`，或 `http` 但 origin 不等於這一列 | 不送。只從這一列的 `tabIds` 拿掉該 tabId |
| `unknown` | 不送，也不改 `tabIds` |
| `tabs.get` 失敗 | 不送。從所有 origin 的 `tabIds` 拿掉該 tabId，不刪 origin 列 |

`sendBridgeResult` 不在本版加這層過濾。簽名前仍用 `tabOriginStill` 的三態。
