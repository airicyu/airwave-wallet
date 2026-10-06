# Implementation review — 0.17.0 Airwave Wallet

- 日期：2026-10-07（Asia/Hong_Kong）
- 輪次：**初審**
- 角色：實作審查（不改程式、不改 INDEX／HOW、不 commit）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收
- HOW／WHY／HANDOFF：[`sign-and-send-how.md`](./sign-and-send-how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 上游：[`../../0.16.0/INDEX.md`](../../0.16.0/INDEX.md)（popup session；本版不重做）、[`../../0.13.0/INDEX.md`](../../0.13.0/INDEX.md)（宿主／confirmed）、[`../../0.12.0/INDEX.md`](../../0.12.0/INDEX.md)（`broadcastSig`／60s）、[`../../0.11.0/docs/sign-tx-budget-how.md`](../../0.11.0/docs/sign-tx-budget-how.md)、[`../../0.10.0/INDEX.md`](../../0.10.0/INDEX.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 對照範圍：**未提交** working tree（`git status`／`git diff`；含 0.17.0 sign-and-send 與同批未 commit 的 0.16.0 popup 收斂等變更）
- 現行程式抽樣（磁碟）：`wallet/src/inject/wallet.ts`、`bridge-client.ts`、`content/index.ts`、`shared/commands.ts`、`background/handlers/dapp-handlers.ts`、`ui-handlers.ts`、`background/index.ts`、`pending/pending-timeout.ts`、`send/wallet-finish-send.ts`、`send/sign-and-send-finish.ts`、`approval/shell.ts`、`popout/main.ts`、`test-web/src/main.ts`
- **總評：** 無未關閉 HIGH。靜態主路徑成立；`typecheck`／`build` 通過。第 2 輪：使用者已於未封裝擴充手驗通過，同意出貨。INDEX 已標 `shipped`。

## Findings（本輪）

關閉＝對照 INDEX／磁碟已滿足；仍開＝實作相對契約仍缺或未驗。穩定 ID 本檔內不重編號。

### HIGH

（無）

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | **關閉** | 使用者 2026-10-07 於未封裝擴充手驗通過（含 test-web Standard signAndSend）。 |
| M2 | **關閉**（非阻擋） | 0.16.0 與 0.17.0 一併出貨；使用者手驗涵蓋 popup 與網站 popout。 |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **關閉** | INDEX 已 `shipped`；版本檔對齊 `0.17.0`。 |
| L2 | **仍開**（非阻擋） | `dapp.signAndSendTransaction` enqueue 未驗 `payload.transaction` 是否存在（與 `dapp.signTransaction` 同級；壞 payload 會開 popout，批准後 `runWalletSendAfterApprove` 以 progress 失敗）。 |
| L3 | **仍開**（非阻擋） | 殼 `resolve("approve")` 對 `walletSend`／`signAndSendTransaction` 可能在請求前與 `{ accepted: true }` 後各呼叫一次 `enterWalletSendConfirming`（與既有 walletSend 模式一致）。 |

## 驗收對照

| INDEX 驗收句 | 通過／失敗 | 證據 |
|--------------|------------|------|
| inject 宣告 `solana:signAndSendTransaction`；account.features 含此字串 | **通過**（靜態） | `wallet.ts`：`features[SolanaSignAndSendTransaction]`、`accountFromPublicKey` features 含三項 Standard 簽名相關 feature。 |
| 未實作的其它 Standard 方法仍未宣告 | **通過**（靜態） | inject 無 `signIn`／`signAllTransactions`；僅 Connect／Disconnect／Events／SignMessage／SignTransaction／SignAndSendTransaction。 |
| 網站請求 popout；`walletSend` 仍 popup | **通過**（靜態） | `dapp-handlers`：`signAndSendTransaction` → `uiHost: "popout"`＋`openPopout`。`walletSend` 路徑未改宿主（抽樣 `wallet-begin-send`／既有 enqueue）。 |
| 批准後確認中→confirmed→已確認 1s→關窗；dApp confirmed 後才 signature | **通過** | SW／殼靜態對契約；使用者手驗通過。 |
| `signTransaction` 仍只簽立刻關、不廣播 | **通過**（靜態）／**手驗未做** | `ui.resolvePending` 本 kind 走 `finishSignTransaction`＋`unbindPopoutByRequest` 支；非 `runWalletSendAfterApprove`。殼非 broadcast kind 批准後仍 `closeHost()`。 |
| 拒絕／關窗／abort 碼與 60s 可再批 | **通過**（靜態）／**手驗未做** | `finishSignAndSendRejected`／`finishSignAndSendWindowClosed`：無 sig → `USER_REJECTED`；有 sig → `BROADCAST_UNCONFIRMED`；拒絕路徑 `unbindPopoutByRequest`＋`takePending`。`onRemoved`：空 pending no-op；本 kind 專支。`waitConfirmOnly` 逾時／`val.err` 僅 `notify.progress`。`ui.abortPending` 本 kind → `finishSignAndSendWindowClosed`。 |
| inject 本命令 ≥180s；其餘 120s | **通過**（靜態） | `PENDING_TIMEOUT_MS`＝120_000；`bridge-client` `SIGN_AND_SEND_TIMEOUT_MS`＝`PENDING_TIMEOUT_MS + 60_000`。 |
| 結果只回發起 tab；pending 不進 storage | **通過**（靜態） | `sendBridgeResult(p.tabId, …)`；`addPending` 僅 SW `Map`（`pending/pending.ts`）。 |
| 錯 chain 不開窗 | **通過**（靜態）／**手驗未做** | `ACCEPTED_CHAIN_IDS`＋`settingsChainId` 比對 → `INVALID_CHAIN`／`CHAIN_MISMATCH`，無 `openPopout`。 |
| `typecheck`／`build` | **通過** | 見「測試結果」。 |
| test-web Standard signAndSend／對照鈕 | **通過**（靜態）／**手驗未做** | `test-web/src/main.ts` 呼叫 `SolanaSignAndSendTransaction`；README 手驗句已更新。 |
| 類 B 未改回 `type="password"` | **通過**（靜態） | `wallet/src` 無 `type="password"`（審批仍 `hardenWalletPasswordInput`）。 |
| 文件與程式無真實秘密 | **通過**（抽樣） | 本報告與已讀契約檔未見真實助記詞／私鑰／密碼。 |

## 測試結果

指令（INDEX）：`cd wallet && npm run typecheck`、`npm run build`。

| 指令 | 結果 |
|------|------|
| `npm run typecheck`（cwd `wallet/`） | 通過（`tsc --noEmit`，exit 0） |
| `npm run build`（cwd `wallet/`） | 通過（`tsc --noEmit && vite build`，Vite 6.4.3，234 modules，約 1.92s，exit 0） |

未載入未封裝擴充；手驗見 M1。

## 重點核對（對照 INDEX／HOW）

| 項 | 結論 |
|----|------|
| 禁止只宣告不實作 | inject feature＋`dapp.signAndSendTransaction` 端到端 SW／殼已接。 |
| 批准不 `unbindPopoutByRequest`、不當下 bridge 成功 | `ui-handlers` 本 kind 在共用 `unbind` 塊之前 return `{ accepted: true }`；`runWalletSendAfterApprove` 內 `cancelPendingTimeout`。 |
| confirmed 後 bridge signature `number[]` | `bs58.decode(signature)` → `Array.from` 放入 `result.signature`（非整段 tx bytes）。 |
| 禁止 SW sleep 再回 dApp；禁止搶關 confirmed 頁 | `waitConfirmOnly` 確認後即 bridge；關窗由殼 1s hold。 |
| `ui.simulatePendingTx` 允許本 kind | `ui-handlers` kind 白名單含 `signAndSendTransaction`。 |
| 殼三閘：不落入批准後 `closeHost()` 預設支 | `isSignTxKind`／`isBroadcastAfterApproveKind`；`resolve` 與 settled listener 分流。 |
| `enterWalletSendConfirming` 清 `armExpiry` | `expiryTimer` clear；`showGone` 受 `isSendStatusLocked()` 阻擋。 |
| 不加 npm 套件 | `package.json` 未新增依賴（仍用既有 `@solana/wallet-standard-features`）。 |
| pending 批准前逾時 `TIMEOUT` 非 `USER_REJECTED` | `pending-timeout.ts` signAndSend 無 `broadcastSig` 時 `TIMEOUT`。 |

## 修復追蹤

| ID | 級 | 狀態 | 關閉位置／下一步 |
|----|----|------|------------------|
| M1 | M | 關閉 | 使用者手驗通過 |
| M2 | M | 關閉 | 0.16／0.17 一併 shipped |
| L1 | L | 關閉 | INDEX `shipped` |
| L2 | L | 仍開 | 可選：enqueue 驗 transaction（與 signTransaction 對齊即可） |
| L3 | L | 仍開 | 可選：合併重複 `enterWalletSendConfirming`（非阻擋） |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-07 | 無 HIGH；typecheck／build 通過；靜態主路徑對契約；手驗未在瀏覽器走完（M1） |
| 第 2 輪 | 2026-10-07 | 複核閘門仍無 HIGH；使用者手驗通過；M1／M2／L1 關閉；INDEX `shipped` |
