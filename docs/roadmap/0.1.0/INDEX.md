# 0.1.0 — Minimal wallet MVP + test-web

- **狀態：** `shipped`
- **上游版本：** （無）
- **Changelog：** [`CHANGELOG.md`](../../CHANGELOG.md)
- **Backlog：** 已出貨，構想檔已刪

## 產品句

開發者與使用者能在 Chrome 載入未封裝 **Airwave** 擴充，於本機 **test-web** dApp 完成 Wallet Standard **connect**、**signMessage**、**signTransaction**（使用者於 popout 審批）；popup 可建立／匯入帳戶、以**使用者密碼**解鎖 vault，且持久設定以 `chrome.storage` 為真相。

## 文件地圖（閱讀順序）

1. 本檔（已定案、Track、驗收）
2. [docs/message-flow-how.md](./docs/message-flow-how.md)
3. [docs/storage-custody-how.md](./docs/storage-custody-how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. [HANDOFF.md](./HANDOFF.md)（閘門通過後實作用）

## 已定案

| 題 | 決定 |
|----|------|
| 專案布局 | `wallet/` = Chrome MV3 擴充；`test-web/` = 靜態 Vite 最小 dApp，預設 `http://localhost:5173` |
| 建置 | `wallet` 與 `test-web` 各自 `package.json`；TypeScript + Vite；允許 `@solana/web3.js`、Wallet Standard（`@wallet-standard/*` 或等價官方包）、`@crxjs/vite-plugin` 或同等 CRX 建置 |
| Pending | 僅 SW 記憶體 `Map<requestId, PendingRecord>`；popout `?requestId=` + `ui.getPending`；**不**寫入 `chrome.storage`／`storage.session` 供 rehydrate；SW 重啟則 in-flight 逾時失敗 |
| 結果路由 | 審批／簽名結果只 `tabs.sendMessage` 回發起 `tabId`（含 `frameId` 若需）；預設禁止全 tab 廣播 |
| Page bridge | `airwave-inject` / `airwave-content` envelope；content 核對 origin；content **只轉發** `debug.ping` 與 `dapp.*`；`ui.*`／`wallet.*` 僅擴充 popup／popout |
| 簽名位置 | 使用者於 **popout** 批准；**SW** 在 unlock 狀態下解密並簽名；inject 不持有私鑰 |
| 持久 state | `chrome.storage.local` keys 見 storage HOW；UI 靠 `onChanged` 鏡像 |
| Vault | 使用者密碼 + PBKDF2 + AES-GCM；**無** hardcode 密碼；解鎖金鑰僅 SW 記憶體 |
| Wallet Standard | 註冊名 **`Airwave`**；本版實作 **`connect`**、**`signMessage`**、**`signTransaction`**；**不**宣告 `signIn`、`signAllTransactions`、legacy `window.solana` |
| 帳戶 | 支援 **生成**、**匯入 base58 私鑰**、**切換**；單一 active；本版不做 read-only／rename／delete |
| 網路 | devnet／mainnet 切換 + 可編輯 RPC URL；**預設 devnet** |
| Shell | **popup** 必做；**sidebar** 不做 |
| test-web | 按鈕：Connect、Sign message、Sign transaction（建一筆 simple transfer 或 memo tx）；顯示結果／錯誤 |
| 釣魚防護 | `signMessage` 在 SW 依 [storage-custody-how](./docs/storage-custody-how.md) heuristic 拒絕疑似 VersionedTransaction 的 bytes |
| 測試 | 尚無整包 CI；本版驗收以 **手驗** 為主（見下）；各 Track 結束跑該 Track 相關 narrow 檢查 |

## 非目標

- Agent harness、query-only agent（②③）
- Sidebar（C2）、token 首頁（E1）、交易 simulation／send 代廣
- 助記詞／HD、硬體錢包、SIWS、signAllTransactions
- inject 訊息層 RSA
- 改動 `../solibra-wallet`

## 開工前仍須拍板

（空）

## 實作 Track

### Track 1 — 腳手架

- **做：** `wallet/` MV3 manifest（service worker、content_scripts、web_accessible inject、popup、popout）；空 entry 可載入；`npm run build` 產出 `dist/`。
- **不做：** 業務邏輯。
- **驗收：** `cd wallet && npm install && npm run build` 成功。

### Track 2 — 訊息骨架

- **做：** 依 [message-flow-how.md](./docs/message-flow-how.md) 實作 inject／content／SW typed router；inject ping 測試 command 來回（可內建 SW self-test 或 test-web 占位）。
- **不做：** vault、Wallet Standard。
- **驗收：** 從 content script 測試頁或 `test-web` 看到 round-trip（document 在 HOW 錨點）。

### Track 3 — Storage + vault

- **做：** [storage-custody-how.md](./docs/storage-custody-how.md)；popup 解鎖／鎖定；建立第一個帳戶（生成）。
- **不做：** dApp 連線。
- **驗收：** 重開 popup 仍見帳戶 meta；鎖定後 SW 拒簽；storage 無明文私钥。

### Track 4 — Popup 帳戶與設定

- **做：** 匯入私钥、切換帳戶、cluster／RPC 設定寫入 storage。
- **驗收：** 切換 active 後 storage `activeAccountId` 變更；RPC 欄位 persist。

### Track 5 — Wallet Standard + connect

- **做：** inject 註冊 Wallet Standard；connect 走 pending + popout；持久 `connections`。
- **不做：** sign 系列。
- **驗收：** test-web Connect 成功，popout 顯示 origin，拒絕可恢復未連線。

### Track 6 — signMessage + signTransaction

- **做：** F1／F2 完整 popout 審批 + SW 簽名 + 回原 tab；signTransaction 回傳已簽 tx bytes，**不**代 send。
- **驗收：** test-web 兩按鈕成功／拒絕路徑各走一次。

### Track 7 — test-web 拋光

- **做：** `test-web/` 完整 UX（狀態、錯誤、base58 顯示）；README 手驗步驟。
- **驗收：** 新 clone 依 README 可完成端到端手驗。

## 驗收（出貨 checklist）

- [x] `cd wallet && npm run build` 成功
- [x] `cd test-web && npm run dev` 可開頁（本機 `http://localhost:5173` HTTP 200）
- [x] Chrome「載入未封裝」指向 `wallet/dist`（或建置輸出目錄）
- [x] 首次 popup：設密碼 + 生成帳戶
- [x] test-web Connect → popout approve → 顯示 pubkey
- [x] Sign message → 批准 → dApp 收到 signature
- [x] Sign transaction → 批准 → dApp 收到 signed tx（可自行 `sendRawTransaction` 或僅 log）
- [x] 拒絕任一路徑 dApp 收到錯誤、無幽靈 pending
- [x] 切換帳戶後已連線 tab 收到 `airwave-bridge-account-changed` 且 dApp 見 WS `change`（無需 reconnect）
- [x] 無 hardcode 密碼；無 storage pending hydrate（靜態核對；implementation-review R2）

使用者於 2026-10-01 確認 Chrome + test-web 功能手驗通過（報告不記載任何密碼、助記詞或地址）。

## 手驗指令（整包）

```text
cd wallet && npm install && npm run build
cd test-web && npm install && npm run dev
# Chrome → 擴充功能 → 開發人員模式 → 載入未封裝 → wallet/dist
# 開 http://localhost:5173 → 依 test-web/README.md 逐步操作
```

## 錨點檔案（實作後預期）

| 路徑 | 用途 |
|------|------|
| `wallet/manifest.json` 或 Vite 產生 manifest | MV3 入口 |
| `wallet/src/background/` | SW hub、vault、pending |
| `wallet/src/inject/` | Wallet Standard |
| `wallet/src/content/` | Bridge |
| `wallet/src/popup/` | 帳戶／設定 |
| `wallet/src/popout/` | 審批 UI |
| `wallet/src/shared/` | types、commands、storage keys |
| `test-web/src/` | dApp |
| `test-web/README.md` | 手驗 |
