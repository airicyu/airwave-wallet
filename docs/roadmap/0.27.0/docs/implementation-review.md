# Implementation review — 0.27.0 Airwave Wallet

- 日期：2026-10-10（Asia/Hong_Kong）
- 輪次：**初審**
- 角色：實作審查（不改程式）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；HOW／reasoning／HANDOFF 只作路徑對照
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- **總評：** 無未關閉 HIGH。`cd wallet && npm run typecheck` 通過。2026-10-10 使用者以未封裝擴充走過流程並確認沒問題。INDEX 狀態 `shipped`。尚未 commit。

抽查架構禁區：pending 與 `workingTx` 在 service worker 記憶體；結果以 `tabs.sendMessage` 帶回該 tab，並帶 pending 的 `frameId`；session blob 沒有帳戶 secret；沒有硬編碼密碼；沒有新的 Wallet Standard 方法；manifest 的 content script 沒有 `all_frames: true`。未見用這些禁區當主路徑。

## Findings

關閉＝已符合 INDEX，或出貨項尚未到。仍開＝現碼與已定案分叉。非阻擋＝不擋主路徑。

### HIGH

（無）

### MEDIUM

（無）

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **關閉** | 初審：30 秒後 `writeText(" ")` 沒接住 rejection。修復後兩次 `writeText` 的失敗都 `.catch` 忽略，不寫 log。 |

## 驗收對照

倉庫無整包測試指令。瀏覽器欄一律是：本輪沒有可載入的未封裝擴充可操作，Cursor 內建瀏覽器不能裝擴充，**下列手驗都沒有在瀏覽器走完**。靜態讀碼與暫存探針不算手驗通過。

| INDEX 驗收句 | 結果 | 證據 |
|--------------|------|------|
| `npm run typecheck`（cwd：`wallet/`）通過 | **通過** | 2026-10-10 執行 `npm run typecheck`，exit 0 |
| Session：SW 重啟仍解鎖，且 session 鍵沒有帳戶 secret。content script 不在本版手驗假裝；以 `setAccessLevel("TRUSTED_CONTEXTS")` 且寫入物件沒有 `secrets` 為準 | **程式對照成立／瀏覽器未走** | `wallet/src/background/index.ts` 啟動時呼叫 `setAccessLevel`，失敗 `.catch` 不擋命令。`persistUnlockedSession` 只寫 `{ version: 2, saltB64, keyRawB64 }`。`version !== 2`、缺欄、salt 不符或解密失敗會 `remove` 並保持鎖定。未在擴充裡關 SW 後查看 session |
| 公鑰：正常解鎖成功。不製造真實不符資料；載入 signing 帳戶時比對地址，不符則不解鎖 | **程式對照成立** | `loadSecrets` 對 `kind === "signing"` 且 vault 有 secret 的列，要求推出的地址字串等於 `publicKeyBase58`，否則清記憶體與 session 並丟 `ACCOUNT_KEY_MISMATCH`。簽名前 `signingErrorForAccountId` 比對的是解析後的 signing 列，不符先 `lock()`。INDEX 本就不做真實不符手驗 |
| 建立錢包：7 個字元被拒，8 個字元可以建立 | **程式對照成立／瀏覽器未走** | `handleCreateVault`：非字串或 `length < 8` → `WEAK_PASSWORD`，不寫 vault。建立畫面同樣在送出前拒絕短於 8。未在擴充點按 |
| 簽名位元組：未簽 `signTransaction` 費用卡能出建議 CU；核准後非 Compute Budget 指令與送出前相同。套用自訂 CU 後只差 CB 的 limit／price | **本機結構探針通過／擴充未走** | `writeCuToTransactionBytes` 不再為了 `workingTx` 呼叫 lookup decompile。尚未有 CB program 時附在 static accounts 最末，`numSignerAccounts` 不變，`numReadonlyNonSignerAccounts` 加 1。已有 program 時第二次寫入不增加 static account、不改 header。任一 instruction index 超出原 static accounts 長度則 `{ ok: false }`，不寫 `workingTx`。phase 1 探針 bytes 沒有傳入 `tryCommitWorkingTx`；commit 的是對原文再做的本地改寫。暫存腳本（未留在倉庫）對一筆未簽 v0 轉帳得到：寫入成功、非 CB 指令的 program／account index 不變、CB 在最末、blockhash 不變、lookup index 得到 `cannot_write`。未把已簽交易交回 test-web |
| 模擬失敗仍可核准 | **程式對照成立／瀏覽器未走** | `applyApproveFromSimulation` 只在 `unparseable`、CU dirty 或套用中禁用核准。`fail`／`rpc` 仍可按。未在 test-web 點那筆會失敗的簽名 |
| dApp：未連線不開審批；連線後可開。不帶 chain 被拒；`solana:devnet` 且錢包在 devnet 可開；錢包 mainnet、頁面 devnet → `CHAIN_MISMATCH` | **程式對照成立／瀏覽器未走** | `handleDappCommand` 在三個簽名命令開 pending 前檢查 `connections[origin].accountId === activeId`，否則 `NOT_CONNECTED`。`signTransaction` 缺 chain 或不在 `solana:devnet`／`solana:mainnet` → `INVALID_CHAIN`；與 `settings.cluster` 不一致 → `CHAIN_MISMATCH`；兩者都不 `presentDappApproval`。inject 只轉 `input.chain`。`test-web/src/main.ts` 三處 `signTx.signTransaction` 都帶 `chain: "solana:devnet"`。未連線、切 cluster 都沒在瀏覽器走 |
| Origin：審批開著時把分頁導去另一個 http(s) origin 再核准，dApp 得到失敗，鏈上沒有這次簽名 | **程式對照成立／瀏覽器未走** | `finishConnect`／`finishSignMessage`／`finishSignTransaction` 在寫連線或簽名前呼叫 `tabOriginStill`。origin 變了才 `sendBridgeResult` `ORIGIN_CHANGED`（`"Tab origin changed"`）；分頁已關則不送。`runWalletSendAfterApprove` 只對 `signAndSendTransaction` 做同一檢查，通過後才簽與廣播。`walletSend` 不呼叫。未在瀏覽器導頁後按核准 |
| signMessage：compiled-message decoder 解得開的 bytes，核准鈕不可用 | **探針＋程式對照／瀏覽器未走** | `messageLooksLikeTransactionMessage` 是 decode 成功即 true。暫存探針：一般 UTF-8 句子為 false；一筆交易的 compiled message bytes 為 true。審批在 `messageLooksLikeTx` 時把核准設為 disabled，`finishSignMessage` 回 `SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION`。未在擴充 UI 點 |
| KDF：310000 的 vault 解鎖後 iterations 成為 600000，原密碼仍可解鎖。寫入替身失敗時舊 blob 仍在且本次仍算解鎖成功 | **部分探針／升級路徑只讀碼／瀏覽器未走** | 新 `encryptVault` 寫入 600000，探針解密成功。`iterations: 1` 在解密時丟錯，不會跑該數字。310000 不被「不支援的迭代」直接拒絕（會用 blob 上的次數做 PBKDF2）。`handleUnlock` 在 `loadSecrets` 成功且 blob 為 310000 時重加密；`writeVaultBlob` 失敗則留舊 key，仍 `ok: true`。沒有真實 310000 vault，也沒有寫入替身 |
| RPC：不能存 `http://example.test`；可以存 `http://127.0.0.1:8899` 與 `https:` URL | **函式探針通過／設定頁未走** | `isAllowedCustomRpc`：`http://example.test` 與帶 userinfo 的 https 為 false；`http://127.0.0.1:8899`、`http://localhost:8899`、一般 https 為 true。`storage.patchSettings` 對不合法自訂 URL 回 `INVALID_RPC` 且不寫。讀取時 `customRpcForCluster` 把不合法 URL 當成空，退回該 cluster 公開 RPC。設定頁未操作 |
| 設定：一般 `getState` 沒有 `jupiterApiKey`／`heliusApiUrl`。設定頁揭開後仍看得到已存的兩欄 | **程式對照成立／瀏覽器未走** | `handleGetState` 與 `handlePatchSettings` 用 `toPublicSettings`（兩把 key 換成 `jupiterConfigured`／`heliusConfigured`）。`wallet.readIntegrationSecrets` 回兩欄明文，且走既有擴充頁 sender 限制。設定頁揭開與遮罩還原呼叫該命令。Home activity 的 effect 依賴 `heliusConfigured`。SW 內部 `readSettings()` 仍含明文。未在擴充查看 getState 物件 |
| 剪貼簿：產生助記詞頁複製後，約 30 秒不再是那組單字（焦點仍在擴充頁） | **程式對照成立／瀏覽器未走** | 見 L1。複製鈕在寫入成功後 30 秒寫入單一字元空白。未在擴充等待 30 秒 |
| 版本號檔與 `0.27.0` 一致（出貨時） | **檔案已對齊／狀態仍 in progress** | 初審後已把 `wallet/package.json`、`wallet/manifest.config.ts`、`version.md`、`changelog.md` 寫成 0.27.0。INDEX 狀態維持 `in progress`：手驗未在擴充走完，且 `shipped` 須使用者同意。`CURRENT_SCHEMA_GENERATION` 仍是 1，`*.v1` 鍵名未改 |

## 測試結果

無整包測試指令。

```text
cd wallet
npm run typecheck
```

2026-10-10：exit 0。

另用未納入倉庫的暫存腳本，直接呼叫 `writeCuToTransactionBytes`、`messageLooksLikeTransactionMessage`、`isAllowedCustomRpc`、`encryptVault`／`decryptVault`。腳本已刪，報告不記錄密碼、助記詞、私鑰或地址。結果已寫進上表「本機結構探針」各列。這不是 INDEX 的手驗，也不能代替未封裝擴充。

未在瀏覽器走完的手驗：Session 重啟與 session 內容、7／8 字元建立錢包、test-web 簽名與自訂 CU、模擬失敗仍可核准、未連線／chain／`CHAIN_MISMATCH`、審批中改 origin、signMessage 核准鈕、310000 vault 升級、設定頁 RPC、設定頁揭開兩把 key、助記詞剪貼簿 30 秒。

## 修復追蹤

| ID | 級 | 狀態 | 備註 |
|----|----|------|------|
| L1 | LOW | 關閉 | 實作 session 在初審後補上 `writeText` 失敗忽略。未再 spawn 複審 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-10 | 無未關閉 HIGH，無 MEDIUM。typecheck 通過。INDEX 手驗未在未封裝擴充走完，不可出貨 |
| 出貨 | 2026-10-10 | 使用者確認未封裝擴充流程沒問題。INDEX 改 `shipped`。未 commit |
