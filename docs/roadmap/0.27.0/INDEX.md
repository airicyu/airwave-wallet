# 0.27.0 — 保管與簽名邊界

- **狀態：** `shipped`
- **上游版本：** [0.26.0](../0.26.0/INDEX.md)（schema 世代仍是 1）。簽名 CU 的使用者規則接 [0.11.0](../0.11.0/INDEX.md)，phase 1 估 CU 接 [0.22.0](../0.22.0/INDEX.md)。連線與 `signAndSend` 的 chain 接 [0.17.0](../0.17.0/INDEX.md)。交易當訊息的拒絕接 [0.9.0](../0.9.0/INDEX.md)
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 本版是安全審查後的契約，不是 backlog 條目。storage 形狀變更仍見 [storage-migration](../backlog/storage-migration.md)（本版不排那份構想）
- **畫面：** [`docs/design-principles.md`](../../design-principles.md)。本版不改版面結構
- **秘密欄位：** 無。禁止把助記詞、私鑰、密碼、真實地址寫進本目錄

## 產品句

解鎖材料不讓 content script 讀到；核准簽下去的交易位元組不靠 RPC 重編；dApp 簽名必須已經連線、chain 與錢包一致，而且核准當下分頁仍停在當初的 origin。

## 文件地圖

1. 本檔
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. 上游 CU：[0.11.0 INDEX](../0.11.0/INDEX.md)。估 CU：[0.22.0 INDEX](../0.22.0/INDEX.md)
5. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 範圍 | 四條 Track：session 保管、簽名位元組、dApp 核准邊界、KDF 與設定洩漏。不改 Home 版面、不改帳戶拖曳、不宣告新的 Wallet Standard 方法 |
| Session 存取 | service worker 每次啟動先 `chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" })`，再處理 command。失敗不擋住命令（測試環境可能沒有此 API），成功後 content script 讀寫 `chrome.storage.session` 必須失敗 |
| Session 內容 | `airwave.unlocked.session.v1` 只留 `{ version: 2, saltB64, keyRawB64 }`。禁止再寫 `secrets`。service worker 重啟後用這把 key 解密 `airwave.vault.v1`，明文 secret 只活在 SW 記憶體。讀到 `version !== 2`（含舊的帶 `secrets` 的 session）：刪掉該鍵，維持鎖定，不把舊明文灌回記憶體。關瀏覽器仍清 session。不因此在 SW 空閒重啟時要求使用者再打密碼 |
| 公鑰綁定 | 可簽帳戶（`kind === "signing"`）的 `publicKeyBase58` 必須等於該 id 的 secret 推出的地址。解鎖載入時若有任一筆不符：不上鎖成功、清 session、回 `ACCOUNT_KEY_MISMATCH`。簽名前再查的是**解析後的 signing 列**；參數本身是聚合或唯讀則不對該 id 取公鑰。不符同樣上鎖並拒絕。聚合與唯讀不查自己的 secret |
| 建立密碼 | `wallet.createVault` 的密碼須為字串且長度 ≥ 8，否則 `WEAK_PASSWORD`，不寫 vault。`wallet.changeVaultPassword` 既有的 ≥ 8 維持 |
| 簽名位元組 | 未簽交易仍可改 CU limit／price，使用者可見規則維持 0.11.0（含 dirty 時不能核准、`unparseable` 不能核准、模擬 `fail`／`rpc` 仍可核准）。寫進 `workingTx` 的位元組只能是**本地**改 Compute Budget 的結果。尚未含 Compute Budget program 時，把該 program **附加在 static accounts 最末**（唯讀非簽名），不放進 index 0，不改 `numRequiredSignatures`，不改既有帳戶的 index，也不改既有指令的 account index／program index。header 只有 `numReadonlyUnsignedAccounts` 可以因此加 1。寫入斷言：拿掉 disc 2 與 disc 3 之後，其餘指令的 program index、account index 與 data 與原文相同；static accounts 去掉最末新增的那個 program 之後與原文相同；lookups 與 recent blockhash 與原文相同。做不到就不寫 `workingTx`，核准簽原文。0.11.0「插入後重對 index」在本版只在「附加於最末、既有 index 不變」時成立。寫入前先看既有指令：任一 program index 或 account index ≥ 原 static accounts 長度（指向 address lookup 載入的帳戶）時，禁止附加 Compute Budget program，也不寫 `workingTx`；費用卡用 0.11.0 的「無法寫入計算預算」，核准簽原文。本版不在本地把 lookup index 加 1，也不為了重對 index 去讀 lookup table。已有 Compute Budget program、但缺 disc 2 或 disc 3：只插入缺的那幾條指令，program index 指向既有的那個 program，不新增 static account，不改 header，不改其他指令的 index。禁止只改寫已經存在的那一條、讓另一欄沒寫進 `workingTx` 仍算成功。禁止用 RPC 讀 address lookup table 再 decompile／compile 來產生 `workingTx`。phase 1 估 CU 仍可打 RPC，該探針副本禁止寫入 `workingTx`（0.22.0 維持） |
| Origin | `dapp.*` 與 `debug.ping` 的 origin **只**取 `sender.tab.url` 的 `origin`。沒有 tab、URL 不是 `http:`／`https:`：`BAD_CONTEXT`，不開 pending。訊息裡自填的 `origin`／`frameId` 忽略。`frameId` 用 `sender.frameId`（沒有則 0）。結果 `chrome.tabs.sendMessage` 必須帶這個 `frameId` |
| 核准當下 | `connect`／`signMessage`／`signTransaction`／`signAndSendTransaction` 在真正完成（含靜默連上、鎖定中重連後自動完成）之前，`chrome.tabs.get(tabId)` 的 URL origin 必須仍等於 pending 記下的 origin。不等、分頁不存在、URL 讀不到：不簽名、不寫連線成功，對該 tab 回 `ORIGIN_CHANGED`（分頁已關則只結束 pending）。`walletSend` 不走這條 |
| Chain | 本版推翻 0.17.0「不改既有 `dapp.signTransaction` 語意」裡與 chain 有關的那一句，以及該版「結果 `sendBridgeResult(tabId)`、`frameId` 固定 0」。只改這兩處：`dapp.signTransaction` 的 payload 必須有字串 `chain`，且屬於 `solana:devnet`／`solana:mainnet`，並等於錢包 `settings.cluster` 對應的 chain，否則沿用 `signAndSend` 的 `INVALID_CHAIN`／`CHAIN_MISMATCH`，不開 pending；`tabs.sendMessage` 在呼叫端有 `frameId` 時傳入（逾時、拒絕、`signAndSend` 與核准同一規則）。`signTransaction` 仍只簽、不代廣播。`all_frames` 仍 false，頂層 `frameId` 仍是 0。inject 只轉送頁面傳入的 `input.chain`，不拿 `account.chains` 補。`signMessage` 不加 chain |
| 須先連線 | `dapp.signMessage`／`dapp.signTransaction`／`dapp.signAndSendTransaction` 在開 pending 前，`connections[origin]` 必須存在，且 `accountId` 等於這次要簽的 active 帳戶 id。否則 `NOT_CONNECTED`，不開視窗。本版推翻 0.5.0「`setActiveAccount` 之後 `connections.accountId` 不變」。`setActiveAccount` 成功寫入新 active id 後，每一筆 connection 的 `accountId` 改成這個新 id，不刪 origin、不改 `tabIds`，並維持既有 `notifyAccountChanged`。此後「切聚合目前錢包」仍只通知**當下** `accountId` 等於該聚合 id 的 origin。刪帳戶仍只斷開 `accountId` 等於被刪 id 的 origin；帳戶一旦被 `setActiveAccount` 改綁走，再刪舊 id 不會斷開那些站。每次 service worker 啟動、`chrome.storage` 已可讀、且已有 active id 時：若任一 connection 的 `accountId` 不等於該 active id，把每一筆改成這個 active id，不刪 origin、不改 `tabIds`，並依既有 `notifyAccountChanged` 推一次目前暴露公鑰。沒有 active id 則跳過。這一步在任何 `NOT_CONNECTED` 判斷之前 |
| signMessage | `messageLooksLikeTransactionMessage` 改為：compiled-message decode **沒有丟例外**就視為像交易（不必 round-trip 等長）。像交易則維持不能當訊息簽、核准鈕不可用。decode 丟例外才允許簽 |
| KDF | 新加密的 PBKDF2-SHA256 迭代為 **600000**。解密使用 blob `kdfParams.iterations`，只接受整數 **310000** 或 **600000**；其他值解密失敗，不跑該數字。解鎖成功且 blob 仍是 310000：用同一密碼重加密成 600000 再寫回 vault；寫入失敗則留下舊 blob，仍以舊 key 維持解鎖。`airwave.schemaGeneration` 維持 1，不改 `*.v1` 鍵名 |
| RPC | 自訂 RPC 只接受 `https:` 任意 host，或 `http:` 且 host 為 `localhost`／`127.0.0.1`（可帶 port）。拒絕 userinfo、其他 scheme、其他 http host。`storage.patchSettings` 寫入不合法 URL：`INVALID_RPC`，不寫。讀取時已存在的不合法自訂 URL 視為沒有，退回該 cluster 的公開 RPC |
| 第三方 key | `wallet.getState` 的 `settings` **不含** `jupiterApiKey`、`heliusApiUrl`。改附 `jupiterConfigured`、`heliusConfigured`（trim 後非空為 true）。設定頁要明文時呼叫新命令 `wallet.readIntegrationSecrets`（只允許擴充頁，與其他 `wallet.*` 相同），回 `{ jupiterApiKey, heliusApiUrl }`。chrome.storage.local 仍存這兩個明文欄；本版不放進 vault |
| 剪貼簿 | 產生助記詞那個複製鈕：寫入剪貼簿後 30 秒再寫入單一字元空白蓋掉。計時不因離開該畫面而取消；卸除只禁止對已卸除元件 `setState`。30 秒內使用者另複製的內容仍會被空白蓋掉，本版接受。第二次寫入失敗則忽略。不複製到 log |
| 領域用語 | 出貨時回寫 [`docs/DOMAIN.md`](../../DOMAIN.md) 金庫條的程式指標：session 只留 `saltB64` 與 `keyRawB64`，明文 secret 只在 service worker 記憶體，不再寫「session secrets」 |
| 版本號 | 出貨時 `wallet/package.json`、`wallet/manifest.config.ts`、`version.md`、`changelog.md` 對齊 `0.27.0`。`shipped` 須使用者同意 |

## 非目標

- 閒置自動上鎖、解鎖失敗鎖定次數
- service worker 每次重啟都要重打密碼
- 模擬 `fail`／`rpc` 時禁用核准（durable nonce 的模擬失真仍可核准；提醒仍是 [backlog](../backlog/sign-tx-durable-nonce-alert.md)，本版不做）
- 把 Jupiter／Helius 密文放進 vault，或對 `chrome.storage.local` 做 content script 隔離（平台沒有 session 那種 access level）
- 升 `schemaGeneration`、改 `*.v1` 鍵名、Argon2
- `all_frames`、新的 Wallet Standard 方法、頁面腳本偽造 in-page `postMessage` 的防護
- Home、Combined、拖曳、類型圖示的視覺改動

## 開工前仍須拍板

（無）

## 實作軌道

### Track 1 — Session 與公鑰綁定

- **做：** `setAccessLevel`、session blob v2、用 key 解密 vault 來恢復解鎖、不符的 signing 公鑰拒絕解鎖與簽名、`createVault` 密碼 ≥ 8。
- **不做：** 自動上鎖；把明文 secret 留在 session；升 schema 世代。
- **驗收：** 見下方「Session」手驗句。

### Track 2 — 本地 CU，簽名字元組不靠 RPC 重編

- **做：** `workingTx` 只接受本地 Compute Budget 修補。phase 1 探針不寫 `workingTx`。簽名與 `signAndSend` 廣播用 `workingTx ?? 原文`。
- **不做：** 改 0.11.0 的費用卡、上下界、dirty 規則；改 0.22.0 的建議 limit 公式。
- **驗收：** 見下方「簽名位元組」手驗句。

### Track 3 — Origin、chain、連線、signMessage

- **做：** tab URL origin、核准前再核對、`frameId`、`signTransaction.chain`、未連線不能簽、切換帳戶時更新 connection.accountId、signMessage fail-closed。`test-web` 三處 `signTransaction` 帶 `chain: "solana:devnet"`。
- **不做：** `signMessage` 的 chain；`all_frames`。
- **驗收：** 見下方「dApp」手驗句。

### Track 4 — KDF、RPC、設定 key、剪貼簿

- **做：** 迭代 600000、解鎖時升級舊 blob、RPC scheme、`getState` 不帶兩把 key、`wallet.readIntegrationSecrets`、助記詞剪貼簿 30 秒覆蓋。
- **不做：** 把第三方 key 放進 vault。
- **驗收：** 見下方「KDF 與設定」手驗句。

## 驗收

倉庫無整包測試指令。窄測只跑：

```text
cd wallet
npm run typecheck
```

手驗用未封裝擴充（`wallet` 的 dev build）加 `test-web`。靜態截圖不算通過。

- [x] `npm run typecheck`（cwd：`wallet/`）通過
- [x] Session：解鎖後關掉 service worker 再打開，錢包仍解鎖，且 session 鍵裡沒有帳戶 secret 字串。content script 情境不在本版手驗裡假裝；以程式呼叫 `setAccessLevel("TRUSTED_CONTEXTS")` 且 session 寫入物件沒有 `secrets` 為準
- [x] 公鑰：正常解鎖成功。本版不製造真實不符資料來手驗；程式在載入 signing 帳戶時比對地址，不符則不解鎖
- [x] 建立錢包：7 個字元的密碼被拒，8 個字元可以建立
- [x] 簽名位元組：test-web 未簽 `signTransaction` 進審批，費用卡仍能出建議 CU；核准後 dApp 收到的已簽交易，其非 Compute Budget 指令與送出前相同。套用一組自訂 CU 後，簽下去的仍只差 CB 的 limit／price
- [x] 模擬失敗仍可核准：test-web 那筆會失敗的簽名，核准鈕可按（與 0.10.0／0.11.0 相同）
- [x] dApp：未連線時 `signTransaction` 不開審批視窗。連線後可開。`signTransaction` 不帶 chain 被拒；帶 `solana:devnet` 且錢包在 devnet 可開。錢包在 mainnet、頁面帶 devnet 時 `CHAIN_MISMATCH`
- [x] Origin：審批開著時把該分頁導去另一個 http(s) origin 再按核准，dApp 得到失敗，鏈上沒有這次簽名被交出去
- [x] signMessage：一段能被 kit compiled-message decoder 解開的 bytes，核准鈕不可用
- [x] KDF：已有 310000 迭代的 vault 解鎖後，blob 的 iterations 成為 600000，原密碼仍可再解鎖。寫入若用測試替身失敗，舊 blob 仍在且本次仍算解鎖成功（程式路徑；不必手造壞碟）
- [x] RPC：設定頁無法儲存 `http://example.test`；可以儲存 `http://127.0.0.1:8899` 與 `https://` URL
- [x] 設定：Home／一般 `getState` 的物件沒有 `jupiterApiKey`／`heliusApiUrl`。設定頁揭開後仍看得到已存的兩欄
- [x] 剪貼簿：產生助記詞頁複製後，約 30 秒剪貼簿不再是那組單字（焦點仍在擴充頁時）
- [x] 版本號檔與 `0.27.0` 一致（出貨時）

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/background/index.ts` | 啟動時 `setAccessLevel`；dApp sender 檢查 |
| `wallet/src/background/session/session.ts` | session blob 與 hydrate |
| `wallet/src/shared/crypto-vault.ts` | PBKDF2 迭代、加解密 |
| `wallet/src/background/wallet/commands/session/vault-password.ts` | 解鎖、建立、改密、重加密 |
| `wallet/src/background/simulate/compute-budget-tx.ts` | 本地 CU 寫入；禁止為了 `workingTx` 拉 lookup table |
| `wallet/src/background/simulate/sign-tx-simulate.ts` | 何時 `tryCommitWorkingTx` |
| `wallet/src/background/pending/finish-pending.ts` | 核准前 origin、簽哪一份 bytes |
| `wallet/src/background/send/wallet-finish-send.ts` | `signAndSend` 同樣簽 `workingTx ?? 原文` |
| `wallet/src/background/handlers/dapp-handlers.ts` | origin、chain、連線閘門 |
| `wallet/src/background/messaging/origin-notify.ts` | `sendMessage` 的 `frameId` |
| `wallet/src/content/index.ts` | 不自填可被頁面改的 origin |
| `wallet/src/inject/wallet.ts` | `signTransaction` 轉送 `chain` |
| `wallet/src/shared/sign-message-tx.ts` | fail-closed |
| `wallet/src/shared/storage-keys.ts` | RPC 字串規則；`getState` 設定形狀 |
| `wallet/src/background/wallet/commands/session/session-state.ts` | `getState` 去掉兩把 key |
| `wallet/src/background/wallet/commands/account/account-records.ts` | 切換帳戶時更新 connection |
| `wallet/src/popup/onboarding/OnboardingScreens.tsx` | 助記詞剪貼簿 |
| `wallet/src/popup/settings/SettingsScreens.tsx` | 讀 integration secrets、RPC 錯誤 |
| `test-web/src/main.ts` | `signTransaction` 帶 devnet chain |
