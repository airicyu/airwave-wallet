# 0.27.0 — 怎麼做

← [INDEX](../INDEX.md)

本檔是路徑與欄位。使用者可見的 CU 上下界、費用卡、模擬失敗仍可核准，以 [0.11.0](../../0.11.0/INDEX.md) 與 [0.22.0](../../0.22.0/INDEX.md) 為準。本檔只寫本版改掉的機制。

## Session

啟動順序（`wallet/src/background/index.ts` 載入時，註冊 listener 之後、第一筆 command 之前）：

1. 呼叫 `chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" })`。
2. 例外則吞掉，繼續。不要把例外訊息寫進會含 secret 的 log（本倉庫本來就不 `console.log`）。

`chrome.storage.session` 鍵名仍是 `airwave.unlocked.session.v1`。值：

```ts
type UnlockedSessionBlob = {
  version: 2;
  saltB64: string;
  keyRawB64: string;
};
```

沒有 `secrets`。`persistUnlockedSession` 只在已解鎖且握有 `CryptoKey` 與 salt 時寫入。

`hydrateFromSessionStore`：

- `version !== 2`，或缺少 `saltB64`／`keyRawB64`：`remove` 該鍵，保持鎖定。
- vault blob 不存在，或 blob 的 salt 與 `saltB64` 不同：`remove` 該鍵，保持鎖定。
- 用 `importVaultKeyRaw` 得 key，再 `decryptVaultWithKey(key, blob)` 得到明文，然後走既有 `loadSecrets`。解密失敗：`remove` 該鍵，保持鎖定。
- 公鑰綁定失敗：與解鎖命令同一錯誤路徑（見下），不留半套解鎖。

新增 `decryptVaultWithKey(key, blob)`：用 blob 的 cipher text 與 key 解 AES-GCM，不重新 PBKDF2。迭代檢查仍要做（見 KDF）：iterations 不是 310000 或 600000 則丟錯。

## 公鑰綁定

`loadSecrets` 在 `accountsById` 填完之後、把 `unlocked` 設為 true 之前：

讀 `readAccounts()`。對每一筆 `kind === "signing"`：

- vault 沒有該 id 的 secret：跳過（既有簽門會給 `NO_KEY`）。
- 有 secret：推出的地址必須 **字串相等** 於 `publicKeyBase58`。
- 不等：清記憶體與 session，`unlocked` 維持 false，拋出或回 `ACCOUNT_KEY_MISMATCH`（訊息固定 `"Account address does not match the stored key"`，不要附地址）。

`loadedAccountForAccountId` 先依既有規則把參數解析成 signing 列（聚合會落到目前錢包那筆 signing）。比對的是**那一列**的 `publicKeyBase58` 與 secret 地址。參數本身是聚合或唯讀：不對參數 id 取 `publicKeyBase58`。解析後那筆 signing 不符：先 `lock()`，簽命令回 `ACCOUNT_KEY_MISMATCH`。

聚合（`kind === "combined"`）與 `readOnly` 不拿自己的 id 去對 secret。

## 建立 vault 密碼

`handleCreateVault`：`typeof password !== "string" || password.length < 8` → `WEAK_PASSWORD`，與改密相同，不寫 blob、不開 session。

## 本地 Compute Budget

`writeCuToTransactionBytes` 不再呼叫 `decompileTransactionMessageFetchingLookupTables`，也不為了重編去 `getAccount`。

允許的改寫（與 0.11.0 已定案相同，此處寫成可執行的檢查）：

1. 本地 `decodeWireTransaction` + compiled message decode。失敗 → `{ ok: false }`，不改 `workingTx`。
2. 同一 disc（2 或 3）多於一條 → 失敗，不改 `workingTx`。
3. 已有該 disc：只替換該指令 data（limit 為 disc `2` + u32 LE；price 為 disc `3` + u64 LE）。static accounts 與其他指令不動。
4. 已有 Compute Budget program、但缺 disc 2 或 disc 3：只插入缺的那幾條指令，program index 指向既有的那個 program。不新增 static account，不改 header，不改其他指令的 index。禁止只改寫已經存在的那一條、讓另一欄沒寫進 `workingTx` 仍算成功。
5. 尚未有 Compute Budget program：先看既有指令。任一 program index 或 account index ≥ 原 static accounts 長度（指向 address lookup 載入的帳戶）時，禁止附加，回 `{ ok: false }`，不寫 `workingTx`。費用卡用 0.11.0 的「無法寫入計算預算」，核准簽原文。本版不把 lookup index 加 1，也不為了重對去讀 lookup table。
6. 通過第 5 點的檢查後，才把 `ComputeBudget111111111111111111111111111111` **附加在 static accounts 最末**（唯讀非簽名）。不放進 index 0，不改 `numRequiredSignatures`，不改既有帳戶的 index，不把既有指令的 account index 或 program index 改成新數字。header 只有 `numReadonlyUnsignedAccounts` 加 1。然後插入缺的 limit／price 指令（新指令的 program index 指向上面附加的那個最末帳戶）。v0 的 address table lookups **原樣複製**。0.11.0「插入後重對 index」在本版只在這一種附加方式下成立。
7. 重編碼後長度 > 1232 → 失敗，不改 `workingTx`。

寫入函式內斷言，失敗就當 `cannot_write`、不寫 `workingTx`：拿掉 disc 2 與 disc 3 之後，其餘指令的 program index、account index 與 data 與原文相同；static accounts 去掉最末新增的那個 program 之後與原文相同；lookups 與 recent blockhash 與原文相同。已含該 program、只改 data 時，header 與 static accounts 必須與原文全同。

phase 1（0.22.0 的 `estimateResourceLimitsFactory`）可以繼續為了**估計**去打 RPC，包含套件內部讀 lookup table。那份探針 bytes 禁止傳給 `tryCommitWorkingTx`。真正 commit 的是上一節的本地改寫，用的 limit／price 是建議值或使用者套用的值。

`finishSignTransaction` 與 `runWalletSendAfterApprove` 仍是 `getWorkingTx(requestId) ?? 原始 payload`。

## dApp 邊界

### 誰可以叫 `dapp.*`

`handleDappCommand` 要收到 sender。`background/index.ts` 把 `sender` 傳進去。

```ts
function tabOrigin(sender: chrome.runtime.MessageSender): { origin: string; tabId: number; frameId: number } | null
```

- `sender.tab?.id` 與 `sender.tab.url` 都要有。
- `new URL(url)` 成功，`protocol` 為 `http:` 或 `https:`。
- `origin` 用 `URL.origin`。
- `frameId` 用 `sender.frameId ?? 0`。

否則該 command（含 `debug.ping`）回 `BAD_CONTEXT`。不要採用 `req.origin`。

`sendBridgeResult`（含逾時、拒絕、`signAndSend` 與核准）在該 pending 有 `frameId` 時，`chrome.tabs.sendMessage` 傳 `{ frameId }`。`all_frames` 仍 false，頂層仍是 0。`notifyAccountChanged` 沒有單一 frame 時維持對該 tab 的頂層送（省略 frameId 即頂層）。本版不改廣播範圍：仍只送 `connections` 裡記下的 tabId，不對所有 tab 送。

### 核准前再讀分頁

新增 `assertPendingTabOrigin(pending): Promise<"ok" | "changed">`。

- `chrome.tabs.get(pending.tabId)` 失敗（含分頁已關）→ `"changed"`。分頁已關時只結束 pending，不必再 `sendBridgeResult`（送不達）。分頁還在、只是 origin 變了，才送 `ORIGIN_CHANGED`。
- URL 的 origin（規則同上，必須 http(s)）≠ `pending.origin` → `"changed"`。

用在：靜默 connect 成功回傳前、`reconnectWhileLocked` 自動完成前、`finishConnect`／`finishSignMessage`／`finishSignTransaction`／`signAndSend` 真正簽名或寫入連線前。`"changed"` 時 `takePending` 清掉，不簽名。分頁還在才 `sendBridgeResult`，錯誤碼 `ORIGIN_CHANGED`，訊息 `"Tab origin changed"`。分頁已關則只結束 pending。

`walletSend` 的 pending 不呼叫這個函式。

### Chain

`SignTransactionPayload` 加上 `chain: string`（與 `SignAndSendTransactionPayload` 相同的合法值）。

inject `signTransaction`：`chain: input.chain`。頁面沒傳就不補。SW：缺欄、非字串、不在 `solana:devnet`｜`solana:mainnet` → `INVALID_CHAIN`。與 `settings.cluster` 不一致 → `CHAIN_MISMATCH`。兩者都不 `presentDappApproval`。

`test-web/src/main.ts` 三個 `signTx.signTransaction({...})` 都加上 `chain: "solana:devnet"`。

### 連線

簽名三命令在既有 read-only／無帳戶檢查之後：

```text
connections[origin] 不存在，或 rec.accountId !== activeId → NOT_CONNECTED
```

`activeId` 是即將寫進 `signAccountId` 的那個 id。

本版推翻 0.5.0「`setActiveAccount` 之後 `connections.accountId` 不變」。`handleSetActiveAccount` 在 `writeActiveAccountId` 成功後：讀 connections，每個 origin 的 `accountId` 改成新 id，寫回，然後維持既有 `notifyAccountChanged`。不刪 origin、不改 `tabIds`。

`setCombinedMain` 仍只通知**當下** `accountId` 等於該聚合 id 的 origin。刪帳戶仍只斷開 `accountId` 等於被刪 id 的 origin。帳戶一旦被 `setActiveAccount` 改綁走，再刪舊 id 不會斷開那些站。

service worker 啟動、`chrome.storage` 已可讀、且已有 active id 時：若任一 connection 的 `accountId` 不等於該 active id，把每一筆改成這個 active id，不刪 origin、不改 `tabIds`，並 `notifyAccountChanged` 一次目前暴露公鑰。沒有 active id 則跳過。這一步在任何 `NOT_CONNECTED` 判斷之前，包含 hydrate 之後的第一筆 dApp 簽名。不要等使用者再手動切換一次。

## signMessage

`messageLooksLikeTransactionMessage`：

```text
try { decoder.decode(bytes); return true; } catch { return false; }
```

刪掉「encode 回去要等長才算」。`finishSignMessage` 與審批 UI 仍看這個布林：true 則拒絕簽、核准 disabled。

## KDF

`PBKDF2_ITERATIONS = 600_000` 只用在**新**加密（`encryptVault`）。

解密：

```text
iterations = blob.kdfParams.iterations
若 iterations 不是 310000 也不是 600000 → 丟錯（解鎖命令維持 INVALID_PASSWORD 介面；不要另暴露「迭代不對」給頁面）
deriveKey 使用該 iterations，不用常數硬蓋
```

`handleUnlock` 在 `loadSecrets` 成功之後：若 blob iterations 是 310000，呼叫 `encryptVault(password, secrets)` 得新 blob 與新 key，`writeVaultBlob`。成功則 `setVaultCrypto` 新 key 並 `persistUnlockedSession`。`writeVaultBlob` 丟錯：不要再寫，session 用**舊** key 與舊 salt，解鎖仍 `ok: true`。

改密路徑本來就 `encryptVault`，自然變成 600000。

不要改 `CURRENT_SCHEMA_GENERATION`。

## RPC

`customRpcForCluster`／`normalizeClusterRpc` 在接受字串前先 `isAllowedCustomRpc(url)`：

- `https:` 且 host 非空、沒有 username／password。
- 或 `http:` 且 host 是 `localhost` 或 `127.0.0.1`，沒有 username／password。port 可有可無。
- 其他（含 `http://example.test`、`https://user:pass@host`）→ 不當自訂 URL。

讀取正規化：不合法的自訂 URL 丢掉，效果與空字串相同（公開 RPC）。

`storage.patchSettings` 的 payload 裡若出現不合法自訂 URL（使用者正在儲存，不是舊資料）：整次 `ok: false`、`INVALID_RPC`、不 `set`。設定頁 inline error 沿用既有 catalog 鍵 `error.invalidRpcUrl`（0.23.0 三語已有）。不要新開 `error.rpcUrl`。

## getState 與 integration secrets

`handleGetState` 的 `settings` 用一個給 UI 的形狀：

```ts
type PublicSettings = Omit<Settings, "jupiterApiKey" | "heliusApiUrl"> & {
  jupiterConfigured: boolean;
  heliusConfigured: boolean;
};
```

`jupiterConfigured` = `jupiterApiKey.trim().length > 0`，Helius 同理。

SW 內部 `readSettings()` **仍**含兩把明文，給持倉、activity、close-empty 用。不要改那些 SW 呼叫去打新命令。

新命令 `wallet.readIntegrationSecrets`：無 payload。回 `{ jupiterApiKey: string, heliusApiUrl: string }`。未建 vault 也允許讀（這兩欄不在 vault）。sender 限制與其他 `wallet.*` 相同。

`wallet/src/popup/settings/settings-logic.ts` 不得再從 `getState` 的 settings 讀 `jupiterApiKey`／`heliusApiUrl`。`settingsFingerprint` 改用兩個布林（或去掉這兩欄）。`apiKeysHubSummary` 用 `jupiterConfigured`／`heliusConfigured`。揭開與寫入（含遮罩字串還原）用 `wallet.readIntegrationSecrets` 的回傳當 stored 值，再 `patchSettings`。`KeysScreen` 同樣不從 `getState` 拿明文。

Home activity 的 effect 依賴若目前含 `heliusApiUrl`，改為依賴 `heliusConfigured`。使用者把一條 Helius URL 換成另一條時，popup 不一定會因為布林不變而重抓；SW 的 `getHomeActivity` 每次仍讀 storage 裡的新 URL。本版接受「不切頁就不刷新」這一個缺口，不為它加 epoch。

## 剪貼簿

`OnboardingScreens` 產生助記詞的複製：`writeText(words.join(" "))` 成功後 `setTimeout` 30_000，再 `writeText(" ")`。計時器掛在不會因該畫面 `navigateTo` 卸除而清掉的地方（例如模組層的 timeout id）。離開產生畫面只避免對已卸除元件 `setState`，**不** `clearTimeout`。30 秒內使用者另外複製的內容仍會被這一格空白蓋掉。不要把單字寫進 log。
