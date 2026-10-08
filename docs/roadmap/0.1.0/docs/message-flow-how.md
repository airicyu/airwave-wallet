# HOW — 多 runtime 訊息

對照圖：[extension-message-flow.html](../../../research/extension-message-flow.html)。

## Runtime 職責

| Runtime | 路徑（錨點） | 職責 |
|---------|--------------|------|
| inject | `wallet/src/inject/` | Wallet Standard 適配；`requestId` + Promise map；僅公鑰與 pending 回覆 |
| content | `wallet/src/content/` | 轉發 inject↔extension；核對 `event.origin`；不做業務 |
| service worker | `wallet/src/background/` | pending hub、vault 解鎖態、連線授權表、簽名、只回原 tab |
| popup | `wallet/src/popup/` | 帳戶、解鎖、設定；不處理進行中 dApp 請求 |
| popout | `wallet/src/popout/` | 單次 connect／sign 審批 UI；URL query `requestId` |

## Page bridge envelope

inject → content（`window.postMessage`，target `*`）：

```ts
type AirwaveInjectOut = {
  source: "airwave-inject";
  requestId: string;
  command: AirwaveCommand;
  payload: unknown;
};
```

content → inject：

```ts
type AirwaveContentIn = {
  source: "airwave-content";
  requestId: string;
  ok: boolean;
  result?: unknown;
  error?: { code: string; message: string };
};
```

content 只接受 `e.source === window` 且 `source === "airwave-inject"` 的訊息，且 **command 僅限** `debug.ping`、`dapp.connect`、`dapp.signMessage`、`dapp.signTransaction`；轉 SW 時附上 page `origin`（`location.origin`）、`tabId`（`sender.tab.id`）、**`frameId: 0`**（本版 **僅支援 top frame**；iframe 內 dApp 列非目標，不傳 `frameId` 動態值）。

SW 僅當 `sender.url` 為本擴充 origin（popup／popout）時接受 `ui.*`、`wallet.*`、`storage.patchSettings`；網頁 content 不得自行批准 pending。

## Extension 內部 command（typed）

所有跨 runtime 請求帶 `requestId: string`（`crypto.randomUUID()`）。

| Command | 方向 | 用途 |
|---------|------|------|
| `dapp.connect` | inject→SW | 新連線或 `onlyIfTrusted` 重連 |
| `dapp.signMessage` | inject→SW | 簽 message bytes |
| `dapp.signTransaction` | inject→SW | 簽 VersionedTransaction（序列化 bytes） |
| `ui.getPending` | popout→SW | 依 `requestId` 取審批 payload |
| `ui.resolvePending` | popout→SW | approve / reject |
| `wallet.unlock` | popup→SW | 密碼解鎖 vault |
| `wallet.lock` | popup→SW | 清 SW 金鑰材料 |
| `wallet.getState` | popup→SW | 快照（鎖定態、帳戶列表 meta） |
| `storage.patchSettings` | popup→SW | 寫 settings（經 SW 統一寫 storage） |
| `debug.ping` | inject→SW（Track 2） | payload `{ text?: string }`；SW 回 `{ pong: true, echo?: string }` |

SW 回覆使用同一 `requestId`（`sendResponse` 或 port 訊息），**禁止**對所有 tab `broadcast` 操作結果。

## dApp 結果（SW → content → inject）

SW 對 content（`tabs.sendMessage`）：

```ts
type AirwaveBridgeResult = {
  type: "airwave-bridge-result";
  requestId: string;
  ok: boolean;
  result?: unknown;
  error?: { code: string; message: string };
};
```

content 原樣轉成 `AirwaveContentIn`（`source: "airwave-content"`）給 inject。

## Pending 結構（僅 SW 記憶體）

```ts
type PendingRecord = {
  kind: "connect" | "signMessage" | "signTransaction";
  tabId: number;
  frameId: number;
  origin: string;
  payload: unknown;
  createdAt: number;
};
```

- `pendingRequests: Map<string, PendingRecord>`
- 若 `connections` 已有該 origin：不開 popout，立即回目前 active 公鑰（`onlyIfTrusted`／重連）
- 建立 pending 後 `chrome.windows.create` 開 popout：`popout.html?requestId=<uuid>`
- 使用者關閉 popout 而未按按鈕：SW 以 `USER_REJECTED` 回原 tab 並刪 pending
- popout 載入後 `ui.getPending` 顯示；使用者按鈕 → `ui.resolvePending`
- approve 後 SW 執行連線紀錄或簽名，再 `tabs.sendMessage(tabId, { type: "airwave-bridge-result", requestId, ... })` → content → inject

## 帳戶變更推送（非 pending）

popup 切換帳戶 → SW 更新 `chrome.storage` 的 `activeAccountId` → SW 對**已連線 origin** 記錄中的每個 `tabId` 推送（仍 targeted tab，非全網廣播）：

```ts
type AirwaveBridgeAccountChanged = {
  type: "airwave-bridge-account-changed";
  publicKeyBase58: string;
  cluster: "devnet" | "mainnet";
};
```

content → inject 後，inject 更新 Wallet Standard 帳戶並 emit **`change`**（features 內 `standard:change`）；**不** disconnect、**不**清連線紀錄、**不**強制 dApp 重跑 connect。

## 逾時

inject 側 pending Promise 預設 120s 逾時 reject，並 `pending.delete(requestId)`。

## Wallet Standard 註冊（inject）

- **name：** `Airwave`
- **icon：** 擴充內建 PNG（manifest icons 同源）
- **chains：** `solana:mainnet`、`solana:devnet`（依 `settings.cluster` 回傳對應 `chain`；另一條仍可在 features 宣告但 inactive）
- **features（本版實作才宣告）：** `standard:connect`、`solana:signMessage`、`solana:signTransaction`
- **不宣告：** `solana:signIn`、`solana:signAllTransactions`

## 明確不做

- inject↔content 每筆 result 的 RSA 加解密
- 用 `chrome.storage` 持久化 pending 供 popout hydrate
- 信任 `postMessage` 內自報的 `from` 而不核對 origin
