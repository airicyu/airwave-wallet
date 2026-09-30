# HOW — Disconnect 與已連線站點（0.2.0）

繼承 [0.1.0 message-flow-how](../../0.1.0/docs/message-flow-how.md)；本檔為增量。

## Wallet Standard

inject `airwaveWallet.features` **新增**：

```ts
import { StandardDisconnect } from "@wallet-standard/features";
// features[StandardDisconnect] = { version: "1.0.0", disconnect: async () => { ... } }
```

`disconnect` 實作：

1. `bridgeRequest("dapp.disconnect", {})`（content 附帶 page origin）。
2. 成功後：`currentPublicKey = null`；`emitChange()` 使 `accounts` 為 `[]`。
3. **不**開 popout；**不**要求 unlock。

## Command

| Command | 方向 | 行為 |
|---------|------|------|
| `dapp.disconnect` | inject→content→SW | 刪除 `connections[origin]`（若無則仍 ok）；SW 對該 record 內已知 `tabIds`（至少含 `sender.tab.id`）發送斷開事件；`sendResponse` `{ ok: true }` |
| `wallet.disconnectOrigin` | popup→SW | payload `{ origin: string }`；同上刪除並通知 tabIds |
| `wallet.disconnectAllOrigins` | popup→SW | 清空 `connections`；對所有曾記錄的 tabIds 去重後通知 |

Content **白名單**在 0.1.0 的 `debug.ping`／`dapp.connect`／`dapp.signMessage`／`dapp.signTransaction` 上增加 **`dapp.disconnect`**。

## 斷開事件（與現碼 account-changed 同一兩段式接線）

現碼路徑（必須對稱延伸，**不得**另發明平行推送）：

1. SW → content：`tabs.sendMessage(tabId, { type: "airwave-bridge-disconnected", origin })`
2. content → page：`window.postMessage({ source: "airwave-content", event: "disconnected", origin }, …)`（與 account-changed 相同 postMessage 入口）
3. inject `bridge-client`（現有 `message` 監聽）：若 `data.source === "airwave-content" && data.event === "disconnected"` → 清 `currentPublicKey` 並 `emitChange()`（可再 `dispatchEvent(new CustomEvent("airwave-disconnected", …))` 供 `wallet.ts` 訂閱，但 **不得**只改 content 卻漏改 `bridge-client`／wallet 狀態）

`airwave-bridge.ts`／shared 型別可新增 `AirwaveBridgeDisconnected`，與 `airwave-bridge-account-changed` 並列。

仍 targeted `tabId`，禁止 `tabs.query({})` 廣播。

**popup 斷開／刪帳戶觸發的斷開**同樣走上述 push；dApp 頁若曾連線，inject 必須清帳戶，否則驗收失敗。

## 與 connect／帳戶切換的關係

| 動作 | connections | inject 公鑰 |
|------|--------------|-------------|
| connect 批准 | 寫入／更新 origin | 設為 active 公鑰 |
| 切換 active（0.1.0） | **保留** origin | 更新為新 active 公鑰 + `account-changed` |
| disconnect／popup 斷開 | **刪除** origin | 清空 + `disconnected` |
| 刪除帳戶且 connection.accountId 匹配 | **刪除** 該 origin | 對那些 tab 發 `disconnected` |

## Popup UI

- 區塊「Connected sites」：列出 origins；每列 Disconnect；可選 Disconnect all。
- `wallet.getState` 擴充回傳 connections 摘要（origin、accountId、connectedAt）；訂閱 `airwave.connections.v1` 的 `onChanged`。

## onlyIfTrusted／靜默重連

origin 自 connections 移除後，下次 `dapp.connect`（含 silent）**必須**再走 popout 審批。

## test-web

Disconnect 按鈕：與 Connect 相同，透過 Wallet Standard 發現已註冊名為 `Airwave` 的 wallet，呼叫其 `features[StandardDisconnect].disconnect()`（或庫封裝等價）。成功後 UI 顯示未連線；後續 Sign 應失敗或提示需 Connect。

## 明確不做

- 進階權限矩陣、自動閒置斷開、iframe 多 frameId 特例（仍僅 top frame）
