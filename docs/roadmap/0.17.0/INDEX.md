# 0.17.0 — Wallet Standard `signAndSendTransaction`

- **狀態：** `shipped`
- **上游版本：** [0.16.0](../0.16.0/INDEX.md)（popup React 收斂；本版**不**改 popup 導航／session 語意）。審批宿主與 `walletSend` 時序以上游 [0.13.0](../0.13.0/INDEX.md) 為準，本版**只**為網站發起的 Standard `solana:signAndSendTransaction` 補一條「錢包代廣播並等 confirmed」路徑
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 規劃訪談（2026-10-06）；test-web 需要可測的 Standard sign-and-send；**不是** 0.13.0 的非目標推翻聊天紀錄，以**本檔**為準
- **畫面：** [`docs/design-principles.md`](../../design-principles.md)「錢包送出確認中／已確認」（112px Solana dash-ring；已確認 hold **1s**）。不重畫主題。網站路徑仍 **popout**
- **秘密欄位：** 無新密碼欄。popout 鎖定解鎖維持類 B

## 產品句

Airwave 宣告並實作 Wallet Standard `solana:signAndSendTransaction`：dApp 交未簽（或已部分簽）交易，網站路徑開 **popout** 審批；使用者批准後由 **錢包** 簽名、`sendRawTransaction`、等到鏈上 `confirmed`，同一畫面「確認中」→「已確認」停留 **1s** 再關窗，並把 **signature** 只回發起 tab。既有 `solana:signTransaction` 仍只簽、立刻關、不廣播。

## 文件地圖

1. 本檔
2. [docs/sign-and-send-how.md](./docs/sign-and-send-how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. 上游：[0.16.0](../0.16.0/INDEX.md)、[0.13.0](../0.13.0/INDEX.md)（宿主／confirmed 頁）、[0.12.0](../0.12.0/INDEX.md)（廣播／`broadcastSig`／60s）、[0.11.0](../0.11.0/INDEX.md) 與 [0.11.0 sign-tx-budget-how](../0.11.0/docs/sign-tx-budget-how.md)（CU／`workingTx`）、[0.10.0](../0.10.0/INDEX.md)（signTransaction 審批／凍結帳戶）
5. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 與上一版 | 0.13.0 宿主矩陣（網站＋popup mode → **popout**；`walletSend` → popup 殼內）、pending 只在 SW `Map`、不進 `chrome.storage`、結果不廣播全 tab、類 B、金額規則、`signTransaction` **只簽立刻關**、`walletSend` 成功時序（SW 立刻 settled、UI 確認中→已確認）：**維持**。本版**推翻** 0.10–0.16「不宣告 `signAndSendTransaction`」——**本版起宣告且必須實作**（GUIDELINES：做不到的方法不要宣告；禁止只改 inject 廣告） |
| 能力表 | inject `wallet/src/inject/wallet.ts`：wallet `features` 與每個 `WalletAccount.features` **加上** `solana:signAndSendTransaction`（`@solana/wallet-standard-features` 的 `SolanaSignAndSendTransaction`）。`version` `"1.0.0"`。`supportedTransactionVersions` 與現有 `signTransaction` 相同：`[0, "legacy"]`。方法名 `signAndSendTransaction`。輸出每筆 `{ signature: Uint8Array }`（64 bytes）。**禁止**宣告 `signIn`／`signAllTransactions`／其它未做方法 |
| 命令 | **新增** `dapp.signAndSendTransaction`。payload `{ transaction: number[], chain: string }`（`chain` 為 Wallet Standard 鏈 id，本錢包只接受 `"solana:devnet"` 或 `"solana:mainnet"`；`solana:mainnet-beta`／`testnet`／`localnet` 等一律 `INVALID_CHAIN`）。content script `PAGE_COMMANDS` 白名單加上此字串。inject 經既有 bridge，**禁止** page script 持鑰或自己打擴充 RPC。不改既有 `dapp.signTransaction` 語意。結果走既有 `sendBridgeResult(tabId)`（tab 級、`frameId` 固定 0，與 0.1.0 相同），**不是**新的 frame 廣播模型 |
| inject 等待 | `bridge-client.ts` 對 **僅** `dapp.signAndSendTransaction` 的 page-side timer 必須 ≥ `PENDING_TIMEOUT_MS`＋60s（寫死常數，建議 `180_000` 或 `PENDING_TIMEOUT_MS + 60_000`）。其餘命令維持現有 120s。content 對 `{ pending: true }` **不** resolve、亦不重置倒數。禁止用新 runtime 訊息在批准時重置 timer（本版不做） |
| Pending | 新 `PendingKind`：`"signAndSendTransaction"`。enqueue 規則對齊 `signTransaction`：簽名閘（鎖定仍開窗、無帳戶／唯讀立刻失敗不開窗）、凍結 `signAccountId`（註解與欄位含本 kind）、`uiHost: "popout"`、`openPopout`。批准**前**的 SW pending 逾時與 `signTransaction` 相同：`PENDING_TIMEOUT_MS` 觸發 → 對 dApp `TIMEOUT`（**不要**改成 `USER_REJECTED`）。payload 含交易 bytes 與 `chain`。**禁止**把 pending 寫進 storage 或 popup React store |
| 鏈／網路 | `chain` 必須與當時 Settings 作用中 cluster 一致：devnet ↔ `solana:devnet`，mainnet ↔ `solana:mainnet`。不一致：**不要**開 popout，立刻對 dApp `ok: false`，code `CHAIN_MISMATCH`，message 可用 `"Wallet cluster does not match request chain"`。缺 `chain` 或非上列二字：**不要**開窗，`INVALID_CHAIN` |
| 審批 UI | 與 `signTransaction` **同一套**共用殼（預期變動、交易費／CU、明細、鎖定解鎖、拒絕／批准）。**禁止**複製第二套審批頁。`ui.simulatePendingTx` 對 `kind === "signAndSendTransaction"` **與** `signTransaction`／`walletSend` 相同。本 kind 的 CU／`workingTx` **完整**走 [0.11.0 HOW](../0.11.0/docs/sign-tx-budget-how.md)：未簽可寫 Compute Budget；任一非零簽名則**禁止**改 instruction／`workingTx`。標題／文案可維持「簽署交易」。批准前行為（CU dirty 不可批、unparseable 禁用批准）與 0.11.0／0.10.0 相同。批准進入確認中時殼必須立刻清掉 `armExpiry`／`expiryTimer`；確認等待、確認失敗還原審批、已確認頁期間**禁止** `showGone`。殼過期頁只服務**批准前**（與 SW `PENDING_TIMEOUT_MS` 同界） |
| 批准後（本 kind） | 對齊 `walletSend` 的簽送，**不是** `signTransaction` 的立刻關窗：`ui.resolvePending` approve 成功回 `{ accepted: true }`（pending **先留著**）。批准當下 **`cancelPendingTimeout`**（與現碼 walletSend 相同）。**禁止**在批准本 kind 時呼叫 `unbindPopoutByRequest`（須與 walletSend 一樣在 unbind **之前** return `{ accepted: true }`，windowId↔requestId 維持到 pending 結束或視窗關閉）。UI **立刻**全頁「確認中」。SW：簽凍結帳戶 → `sendRawTransaction`（`skipPreflight: false`）→ 記憶 `broadcastSig` → 等到 `confirmed`／`finalized`（≤60s）。**禁止** dApp 在批准當下就拿到成功 result。60s 確認失敗或鏈上 `err`：**只** `ui.walletSendProgress` 短錯誤、pending 仍在、可再批准（已有 `broadcastSig` 則不重送、只再等）；**不** `sendBridgeResult`；**不**關窗。此 60s **不是**對 dApp 的逾時 |
| 成功時序 | 鏈上 `confirmed` 後 SW **立刻**：① `sendBridgeResult` 回發起 tab，`ok: true`，`result: { signature: number[] }`（64-byte 簽名的 0–255 整數陣列；inject 再 `Uint8Array.from`）；② 結束該 pending；③ 對擴充頁發既有 `airwave-wallet-send-settled` `{ ok: true, requestId, signature?: string }`。**禁止** SW `sleep` 再回 dApp。**禁止** SW `closePopout` 搶在 confirmed 頁之前關窗。共用殼收到 settled `ok: true` → 同一畫面「已確認」→ **再等 1s** → popout `window.close`。此時 pending 已結束，`onRemoved` **必須 no-op**（`getPending` 空則 return），**不得**再對 dApp 發 `USER_REJECTED` |
| 拒絕／關窗／abort | `ui.resolvePending` **reject**：尚無 `broadcastSig` → `sendBridgeResult` `USER_REJECTED` 並結束 pending；**已有** `broadcastSig` → 與關窗／abort 同一碼 `BROADCAST_UNCONFIRMED`（確認失敗還原審批後點拒絕亦然）。**禁止**只呼叫現有 `finishWalletSendUserAbort`（那條不 bridge）。批准前關 popout（無 `broadcastSig`）：`USER_REJECTED`（message 可維持 `"Approval window closed"`）。確認中殼無拒絕鈕；若使用者關窗或 `ui.abortPending` 且**已有** `broadcastSig`、尚未成功 confirmed：對 dApp `ok: false`，code `BROADCAST_UNCONFIRMED`，message「已送出、確認未知」；**不要**當成功 signature。`windows.onRemoved` 必須先辨識本 kind 再分流，不可當成普通 `signTransaction`。批准後 pending timer 已 cancel，**不會**再靠 `PENDING_TIMEOUT_MS` 對 dApp 發 `BROADCAST_UNCONFIRMED` 或 `USER_REJECTED` |
| 重送 | 同一 pending 已有 `broadcastSig` 則**禁止**再 `sendRawTransaction`；只再等 confirmed（抄 walletSend） |
| Standard options | dApp `options.skipPreflight`／`maxRetries`／commitment：**忽略**，一律錢包規則（`skipPreflight: false`、等 `confirmed`）。不把 options 當可改 CU 的後門 |
| 多筆 input | inject 對 `signAndSendTransaction(...inputs)` **串行**每筆各開一次 pending（對齊現有 `signTransaction` 迴圈）。禁止一次 enqueue 多筆 |
| `walletSend` | 錢包內送出路徑、popup 宿主、成功回 Home：**本版不改語意**。允許把「簽＋送＋等 confirmed」抽成 signAndSend 與 walletSend **共用函式**，但 walletSend 仍不 `sendBridgeResult` |
| `signTransaction` | 維持只簽、立刻 `closeHost`、回 `signedTransaction` bytes、不廣播 |
| 依賴 | **不加** npm 套件（`@solana/wallet-standard-features` 已在 wallet 與 test-web） |
| Storage | **不**新增 local／session key |
| test-web | **signAndSendTransaction** 按鈕改為呼叫 Standard feature（不再預期「無 feature」）。成功路徑：0 lamport 自轉、devnet、批准後 log signature／confirmed。保留「Sign and send transaction」＝`signTransaction` 後 **dApp** `sendRawTransaction`（對照只簽）。「預期模擬失敗」仍走 `signTransaction`。拒絕／關窗應在 log 見錯誤 |
| 版本號 | 出貨時 `wallet/package.json`、`wallet/manifest.config.ts`、`version.md`、`changelog.md` 對齊 `0.17.0`。狀態 `shipped` 須使用者同意 |

## 非目標

- `solana:signAllTransactions`、`solana:signIn`、legacy `window.solana`
- Sidebar 殼；網站請求改走已開 popup
- 改 `signTransaction` 為代廣播；改錢包內 `walletSend` 成功離開（Home／1s）語意
- Agent、聚合送出、地址簿、i18n
- 讓 dApp `skipPreflight: true` 生效
- 改 vault／storage schema
- 改 `../solibra-wallet`

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.13.0–0.16.0 | 0.17.0 |
|----------------|--------|
| 不宣告 `signAndSendTransaction`；test-web 該鈕預期無 feature | 宣告且實作；test-web 走真路徑 |
| 網站簽交易＝只簽立刻關 | **另**一種網站請求＝簽＋錢包廣播＋confirmed 頁 1s 再開 |
| `walletSend` 才有確認中／已確認 | 本 kind 的 **popout** 也走同一套確認畫面 |

## 實作 Track

### Track 1 — 宣告、命令、enqueue

- **做：** inject feature＋account.features；`dapp.signAndSendTransaction`；content 白名單；pending kind；鏈檢查；閘與凍結帳戶；`openPopout`。拒絕／批准前關窗回 dApp。尚未廣播。
- **不做：** 改 `signTransaction` 成功路徑；加套件。
- **驗收：** typecheck；未連／無 feature 不再發生於已載入擴充的 test-web；錯誤 chain 不開窗。

### Track 2 — 批准後簽送確認與 dApp result

- **做：** `ui.resolvePending` 對本 kind 批准走 `{ accepted: true }`＋`cancelPendingTimeout`＋**不** `unbindPopoutByRequest`＋共用簽送確認（`broadcastSig`、60s 只 progress 可再批、不重送）。confirmed 後 `sendBridgeResult` signature 陣列＋ settled notice。點拒絕：無 sig → `USER_REJECTED`；有 sig → `BROADCAST_UNCONFIRMED`（禁止只 `finishWalletSendUserAbort`）。`onRemoved`／`ui.abortPending`：無 pending → no-op；無 sig → `USER_REJECTED`；有 sig 未確認 → `BROADCAST_UNCONFIRMED`。`simulatePendingTx` 允許本 kind。inject 本命令等待 ≥ 180s。
- **不做：** popup 內 walletSend 改宿主；60s 確認失敗對 dApp 結束 pending；把批准前 `TIMEOUT` 改成 `USER_REJECTED`。
- **驗收：** 靜態：批准當下不 `sendBridgeResult` 成功；confirmed 後才回 signature。

### Track 3 — 審批殼確認中／1s 離開

- **做：** `kind === "signAndSendTransaction"` 納入 `isSignTxKind`。`resolve()` 批准成功與 settled `ok: true` **必須**走 `enterWalletSendConfirming`／`enterWalletSendConfirmedPage`（與 `walletSend` 同一閘），**禁止**落入文末 `closeHost()` 預設支。進入確認中立刻清 `armExpiry`；確認中／還原審批／已確認**禁止** `showGone`。確認失敗 `restoreWalletSendReviewAfterError`。成功 1000ms 後 `onWalletSendSuccessExit`。`signTransaction` 仍立刻 `closeHost()`。
- **不做：** 改 dash-ring 視覺；把 hold 改回 0.5s。
- **驗收：** 與 walletSend 同一套 status 畫面；`signTransaction` 仍立刻關。

### Track 4 — test-web 與 build

- **做：** test-web Standard 按鈕；README 手驗句；`cd wallet && npm run typecheck && npm run build`。出貨改版本號檔。
- **不做：** 刪掉 dApp 自廣播那顆對照鈕。
- **驗收：** typecheck／build；手驗見本檔 checklist。

## 驗收（出貨 checklist）

- [x] inject 宣告 `solana:signAndSendTransaction` 且方法可用；account.features 含此字串
- [x] 未實作的其它 Standard 方法仍未宣告
- [x] 網站此請求開 **popout**（popup 已開亦然）；`walletSend` 仍 popup 殼內
- [x] 批准後確認中 → 鏈上 confirmed → 已確認 hold 1s → 關窗；dApp 在 confirmed 後才拿到 signature
- [x] `signTransaction` 批准仍立刻關、不廣播
- [x] 拒絕／批准前關窗 → dApp `USER_REJECTED`；已廣播未確認關窗／abort → `BROADCAST_UNCONFIRMED`；60s 確認失敗仍可再批、不結束 dApp
- [x] inject 本命令等待足以涵蓋思考＋≤60s confirmed（≥180s）；其餘命令 120s 不變
- [x] 結果只回發起 tab；pending 不進 storage
- [x] 錯 chain 不開窗
- [x] `cd wallet && npm run typecheck` 與 `npm run build` 通過
- [x] test-web：Standard signAndSend 成功／拒絕；既有 signTransaction 與 dApp 自廣播仍可用
- [x] 類 B 未改回 `type="password"`
- [x] 文件與程式無真實密碼／助記詞／私鑰

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/inject/wallet.ts` | 宣告 feature、bridge 呼叫 |
| `wallet/src/content/index.ts` | `PAGE_COMMANDS` 白名單 |
| `wallet/src/shared/commands.ts` | 命令字串、`PendingKind`、payload 型別 |
| `wallet/src/background/handlers/dapp-handlers.ts` | enqueue |
| `wallet/src/background/handlers/ui-handlers.ts` | resolve／simulate 允許 kind |
| `wallet/src/background/send/wallet-finish-send.ts` | 簽送確認可共用 |
| `wallet/src/background/index.ts` | `windows.onRemoved` 分流 |
| `wallet/src/approval/shell.ts` | confirming／confirmed／立刻關 vs 1s |
| `wallet/src/popout/main.ts` | 關窗 callback |
| `test-web/src/main.ts`、`test-web/index.html` | 手測按鈕 |
| `wallet/src/inject/bridge-client.ts` | 僅本命令延長 page-side timer |
| `docs/roadmap/0.13.0/INDEX.md`、`docs/roadmap/0.10.0/INDEX.md`、`docs/roadmap/0.11.0/docs/sign-tx-budget-how.md` | 宿主、只簽、CU／`workingTx` |
