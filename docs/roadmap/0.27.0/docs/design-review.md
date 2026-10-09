# Design review — 0.27.0 Airwave Wallet

- 日期：2026-10-10（Asia/Hong_Kong）
- 輪次：**第 3 輪複審**（累加；ID 不重編）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 上游對照：[0.26.0](../../0.26.0/INDEX.md)（schema 世代仍是 1，本版維持）、[0.11.0](../../0.11.0/INDEX.md) 與 [sign-tx-budget-how](../../0.11.0/docs/sign-tx-budget-how.md)、[0.9.0](../../0.9.0/INDEX.md)、[0.5.0](../../0.5.0/INDEX.md)、[0.17.0](../../0.17.0/INDEX.md)。構想：[storage-migration](../../backlog/storage-migration.md)（非本版契約；KDF「解鎖成功才重加密、寫入失敗不覆蓋」仍與該構想第 4、5 點同向）、[sign-tx-durable-nonce-alert](../../backlog/sign-tx-durable-nonce-alert.md)（本版非目標，維持）。INDEX 未點名 `docs/brainstorm/`，本輪不把它當契約
- 現行程式抽樣：見文末。現碼尚未做本版，不因此升 HIGH
- **總評：** 無未關閉 HIGH。提案可行，審查門檻**通過**。第 2 輪仍開的 H3、M6、M7 已寫進現 INDEX／HOW／HANDOFF，本輪關閉。L3 仍開，維持非阻擋。待拍板仍空。HANDOFF 仍有 paste-ready。不可行：否。

## Findings（累加至第 3 輪）

關閉＝已寫進 INDEX／HOW／HANDOFF（或 reasoning，若該項本來就指到那裡）；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH

#### H1 — 切換帳戶改寫全部連線綁定，與已出貨 0.5.0 相反 — **關閉**

初審題旨：本版要求簽名前 `connections[origin].accountId` 等於 active id，但又要 `setActiveAccount` 改寫每一筆綁定；當時 INDEX 沒寫推翻 0.5.0「該欄不變」，也沒寫此後切聚合目前錢包與刪帳戶看的是改綁之後的欄。

第 2 輪：現 INDEX「須先連線」已有初審建議的整句（推翻 0.5.0、改寫全部 `accountId`、不刪 origin、不改 `tabIds`、維持 `notifyAccountChanged`、切聚合與刪帳戶改看當下欄位）。HOW「連線」同文。HANDOFF paste-ready 有「`setActiveAccount` 推翻 0.5.0：每筆 `connection.accountId` 改成新 active id」。不重開。升級前已經寫在 storage 裡的舊欄，見 M7（第 3 輪已關）。

#### H2 — 本地 CU 斷言要求 header 全同，驗收那筆交易寫不進 workingTx — **關閉**

初審題旨：尚未含 Compute Budget program 時，header 的 `numReadonlyUnsignedAccounts` 必須加 1，header 全同的斷言會讓 test-web 自轉交易寫不進 `workingTx`，與「自訂 CU 後只差 limit／price」的驗收不能同時成立。

第 2 輪：現 INDEX「簽名位元組」與 HOW「本地 Compute Budget」第 4 點、斷言段，已改成附加於 static accounts 最末、既有 index 不變、header 只有 `numReadonlyUnsignedAccounts` 可加 1，並寫明 0.11.0「插入後重對 index」只在這種附加方式下成立。HANDOFF paste-ready 有同一句。test-web 那種沒有 lookup、也還沒有該 program 的交易，斷言與驗收可以同時成立。不重開。lookup 區間的 index 見 H3（第 3 輪已關）。

#### H3 — 「index 數字不變」會讓 address lookup 交易簽到別的帳戶 — **關閉**

第 2 輪題旨：Solana 編譯訊息的 program index／account index 指的是一條合併清單：先是 static accounts，其後才是 address lookup 載入的帳戶（先可寫、後唯讀）。index ≥ 原 static accounts 長度，指的是 lookup 帳戶，不是 static 清單裡的某一格。附加一格 static account 之後，合併清單的分界往後移一格。數字不變的 lookup index 會改指到別的帳戶。當時斷言比的是數字與原文相同，這種錯誤寫入會通過，然後被核准簽下去。

第 3 輪：現 INDEX「簽名位元組」已有拒絕句：任一 program index 或 account index ≥ 原 static accounts 長度時，禁止附加 Compute Budget program，不寫 `workingTx`，費用卡用 0.11.0 的「無法寫入計算預算」，核准簽原文；並寫明不在本地把 lookup index 加 1，也不為了重對 index 去讀 lookup table。HOW「本地 Compute Budget」第 5 點在附加之前做同一檢查，失敗回 `{ ok: false }`。HANDOFF paste-ready 有「任一 index 指向 address lookup 則不寫 workingTx、簽原文」。沒有 lookup index 時才允許附加於最末、既有 index 數字不變。不重開。

### MEDIUM

#### M1 — 剪貼簿覆寫被畫面卸除取消 — **關閉**

初審題旨：產生助記詞後若 `navigateTo` 卸除該畫面並 `clearTimeout`，30 秒空白蓋寫不會發生，與驗收「焦點仍在擴充頁」衝突。

第 2 輪：INDEX「剪貼簿」已寫計時不因離開該畫面而取消、卸除只禁止對已卸除元件 `setState`、30 秒內另複製的內容仍會被蓋掉。HOW「剪貼簿」寫計時器掛在模組層、不 `clearTimeout`。關閉。

#### M2 — `getState` 拿掉兩把 key 之後，設定頁仍從那裡讀明文 — **關閉**

初審題旨：`settings-logic.ts` 的 fingerprint、樞紐摘要、遮罩還原都讀 `settings.jupiterApiKey`／`heliusApiUrl`。

第 2 輪：HOW「getState 與 integration secrets」已點名該模組與 `KeysScreen`：fingerprint 改布林、摘要用兩個 configured、揭開與寫入用 `wallet.readIntegrationSecrets` 的回傳，不要從 `getState` 拿明文。Home activity 改依賴 `heliusConfigured`，並寫明本版接受不切頁就不刷新。關閉。

#### M3 — DOMAIN 金庫條仍寫 session secrets — **關閉**

初審題旨：GUIDELINES 要求覆寫領域用語時回寫 DOMAIN。

第 2 輪：INDEX「領域用語」已寫出貨時把金庫條改成 session 只留 `saltB64` 與 `keyRawB64`，明文 secret 只在 service worker 記憶體。設計層關閉；DOMAIN 檔本身留到出貨再改。

#### M4 — 簽聚合時「再查該 id」可能對到聚合列 — **關閉**

初審題旨：比對對象必須是解析後的 signing 列。

第 2 輪：INDEX「公鑰綁定」與 HOW「公鑰綁定」已寫：簽名前查解析後的 signing 列；參數本身是聚合或唯讀則不對該 id 取公鑰。現碼 `loadedAccountForAccountId` 本來就先 `resolvePubkey` 再取 signing 列，與這句同向。關閉。

#### M5 — 未寫推翻 0.17.0 的 chain 與 frameId — **關閉**

初審題旨：0.17.0 仍寫不改 `dapp.signTransaction` 語意，且 `sendBridgeResult` 的 `frameId` 固定 0。

第 2 輪：INDEX「Chain」已寫只推翻那兩處；`signTransaction` 仍只簽、不代廣播；`all_frames` 仍 false，頂層 `frameId` 仍是 0；逾時、拒絕、`signAndSend` 與核准同一規則。HOW「誰可以叫 dapp.*」同文，並寫明不改廣播範圍。關閉。

#### M6 — 已有 Compute Budget program、但缺一條 disc 時，HOW 的步驟會漏插 — **關閉**

第 2 輪題旨：已有該 program（例如已有 heap 或其他 disc）、但 disc 2 或 disc 3 缺一條或兩條都缺。若實作只覆蓋「已有 disc 就只改 data」與「尚未有 program 才附加」，已有 price、沒有 limit 的交易會只改 price，使用者套用的 limit 不會進 `workingTx`。

第 3 輪：現 INDEX「簽名位元組」與 HOW「本地 Compute Budget」第 4 點已寫：只插入缺的那幾條指令，program index 指向既有的那個 program，不新增 static account，不改 header，不改其他指令的 index；禁止只改寫已經存在的那一條、讓另一欄沒寫進 `workingTx` 仍算成功。HANDOFF paste-ready 有「已有 program 但缺 disc 時只插入缺的指令」。第 3 點「已有該 disc：只替換該指令 data，其他指令不動」與第 4 點並存：存在的那一條只改 data，缺的那一條要插入。不重開。

#### M7 — 升級前的 `connection.accountId` 沒有對齊時機 — **關閉**

第 2 輪題旨：H1 的改寫只發生在本版上線之後的 `setActiveAccount`。0.5.0 已出貨的 storage 在使用者連線後又切換過帳戶時，`connections[origin].accountId` 仍是當初連線的 id。簽名閘會給 `NOT_CONNECTED`，直到使用者再手動切換一次。

第 3 輪：現 INDEX「須先連線」與 HOW「連線」已寫：service worker 啟動、`chrome.storage` 已可讀、且已有 active id 時，若任一 connection 的 `accountId` 不等於該 active id，把每一筆改成這個 active id，不刪 origin、不改 `tabIds`，並 `notifyAccountChanged` 一次；沒有 active id 則跳過；這一步在任何 `NOT_CONNECTED` 判斷之前。HANDOFF paste-ready 有「SW 啟動（已有 active id）都把每筆 connection.accountId 對齊 active id，且在 NOT_CONNECTED 判斷之前」。不重開。

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **關閉** | HOW「RPC」已寫沿用 `error.invalidRpcUrl`，不要新開 `error.rpcUrl`。現碼 catalog 已有該鍵。 |
| L2 | **關閉** | reasoning「為何不解 SW 重啟就上鎖」已改成：啟動時仍呼叫 `setAccessLevel("TRUSTED_CONTEXTS")`，當作明示鎖定，不依賴平台預設；失敗不擋命令；第二層是 session 不放帳戶 secret。 |
| L3 | **仍開**（非阻擋） | 見下方。主路徑（導去另一個 http(s) origin 再核准）不受影響。 |

#### L3 — 分頁已關時要不要送 `ORIGIN_CHANGED` — **仍開**（非阻擋）

INDEX「核准當下」：分頁已關則只結束 pending，不對該 tab 回 `ORIGIN_CHANGED`。

第 3 輪：HOW「核准前再讀分頁」第一點已對上這句（`chrome.tabs.get` 失敗且分頁已關：只結束 pending，不必 `sendBridgeResult`）。同節收尾仍寫：只要結果是 `"changed"`，就 `takePending` 並 `sendBridgeResult` `ORIGIN_CHANGED`。分頁已關時 `sendMessage` 送不達，不簽名。HOW 可把收尾收成與第一點相同：分頁已關不送，分頁還在才送。不擋審查門檻。

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| `npm run typecheck`（cwd：`wallet/`）通過 | 可測 | 無。M2 已寫入 HOW，型別路徑有著落 |
| Session：SW 重啟仍解鎖，session 鍵沒有帳戶 secret；以呼叫 `setAccessLevel("TRUSTED_CONTEXTS")` 且寫入物件沒有 `secrets` 為準 | 可測 | 無 |
| 公鑰：正常解鎖成功；程式比對 signing 地址，不符則不解鎖 | 可測 | 無。M4 已寫明對象是解析後的 signing 列 |
| 建立錢包：7 字元拒絕，8 字元可建立 | 可測 | 無。只閘 `wallet.createVault`；改密既有 ≥ 8 |
| 簽名位元組：費用卡仍能出建議 CU；核准後非 CB 指令與送出前相同；自訂 CU 後只差 limit／price | test-web 自轉可測 | 無。沒有 lookup 的附加路徑，H2 已關。有 lookup index 則不寫 `workingTx`、簽原文（H3 已關）。已有 program 但缺 disc：M6 已關。驗收句不要求 lookup 夾具 |
| 模擬失敗仍可核准 | 可測 | 無 |
| dApp：未連線不開窗；連線後可開；缺 chain 拒絕；devnet 對 devnet 可開；mainnet 錢包配 devnet 頁面為 `CHAIN_MISMATCH` | 可測 | 無。M5、M7 已關。啟動對齊在 `NOT_CONNECTED` 之前 |
| Origin：審批開著時導去另一個 http(s) origin 再核准，dApp 失敗，鏈上沒有這次簽名 | 可測 | L3 只差在分頁已關的收尾句，非阻擋。`walletSend` 排除已寫明。manifest 已有 `tabs` |
| signMessage：compiled-message decoder 解得開的 bytes，核准鈕不可用 | 可測 | 無。本版已寫不必 round-trip 等長，取代 0.9.0 的等長條件 |
| KDF：310000 的 vault 解鎖後變 600000，原密碼仍可解；寫入替身失敗則舊 blob 仍在且本次仍算解鎖 | 可測 | 無。不升 `schemaGeneration`、不改 `*.v1` 鍵名 |
| RPC：無法儲存 `http://example.test`；可儲存 `http://127.0.0.1:8899` 與 `https:` URL | 可測 | 無。L1 已關。讀取時已存在的不合法 URL 視為沒有，已寫明 |
| 設定：一般 `getState` 沒有兩把 key；設定頁揭開後仍看得到已存的兩欄 | 可測 | 無。M2 已關 |
| 剪貼簿：複製後約 30 秒不再是那組單字（焦點仍在擴充頁） | 可測 | 無。M1 已關 |
| 版本號檔與 `0.27.0` 一致（出貨時） | 可測 | 無。`shipped` 仍須使用者同意。M3 的 DOMAIN 回寫掛在出貨 |

## 與現碼抽樣

第 3 輪再抽 INDEX 錨點。下列是本版要改的現行行為，**未實作 ≠ 設計 HIGH**。

| 錨點 | 現碼 | 與提案 |
|------|------|--------|
| `background/index.ts` | 未呼叫 `setAccessLevel`。`dapp.*` 只把 `sender.tab.id` 補上，不把 `sender` 交給 `handleDappCommand` | 本版要補。pending 仍在 SW `Map`，popout 仍只帶 `requestId` |
| `session/session.ts` | blob `version: 1`，含 `secrets`。hydrate 把該明文灌回記憶體 | 本版改 version 2，舊 blob 刪鍵並維持鎖定。這是規格變更，不是禁區裡的「用 storage hydrate 找 pending」 |
| `crypto-vault.ts` | 解密固定 `PBKDF2_ITERATIONS = 310000`，不讀 blob 的 iterations | 本版改讀 blob，只接受 310000 或 600000 |
| `compute-budget-tx.ts` | `writeCuToTransactionBytes` 呼叫 `decompileTransactionMessageFetchingLookupTables` | 本版禁止這條路產生 `workingTx`。lookup index 改為不寫 `workingTx`（H3 已關） |
| `sign-tx-simulate.ts` | phase 1 探針與真正 commit 共用 `writeCuToTransactionBytes`；探針那次沒有 `tryCommitWorkingTx` | 本版要求探針 bytes 不 commit。方向與 0.11.0 一致 |
| `dapp-handlers.ts` | origin 用訊息欄位。`signTransaction` 不查 chain、不查連線。未連線也開窗。`signAccountId` 寫的是 active id | 本版改由 `sender.tab.url`。連線欄比的也是這個 active id（聚合 id 時與 0.5.0 的 combined id 同欄）。`all_frames: false` 時頂層 `frameId` 仍是 0 |
| `origin-notify.ts` | `sendBridgeResult` 不帶 `frameId`。`notifyAccountChanged` 只送 `connections` 裡的 tabId | 本版要求有 `frameId` 就帶上。廣播範圍維持已連線 tab |
| `account-records.ts` | `setActiveAccount` 不改 `connection.accountId`。刪除作用中帳戶時，只斷開 `accountId` 等於被刪 id 的 origin，再把 active 改到下一筆 | 與已出貨 0.5.0 一致。本版推翻句與啟動對齊已寫入（H1、M7 關閉）。刪除路徑仍只斷開相等的 origin，與已定案相同 |
| `sign-message-tx.ts` | decode 再 encode，等長才算像交易 | 本版改為 decode 成功即拒絕 |
| `inject/wallet.ts` | `signTransaction` 不傳 `chain`。未宣告 `signIn` | 本版只補 chain 轉送，不新增 Wallet Standard 方法 |
| `OnboardingScreens.tsx` | 複製助記詞沒有 30 秒覆寫 | 契約已寫（M1 關閉），現碼尚未做 |
| `session-state.ts`／`KeysScreen` | `getState` 的 settings 含兩把明文 key；設定頁直接讀這兩欄 | 契約已寫（M2 關閉）。`chrome.storage.local` 仍存明文，本版非目標已寫明不做 content script 隔離 |
| `storage-keys.ts` | `customRpcForCluster` 幾乎照單接受非公開 URL | 本版要改成 https，或 localhost／127.0.0.1 的 http。現碼未改 ≠ 設計 HIGH |
| `secret-key-accounts.ts`／`seed-accounts.ts` | 新增帳戶不改 active id | 切換仍走 `setActiveAccount`，該路徑已要求改寫 connection。不是本輪缺口 |

架構禁區抽查：本版沒有把 pending 放進 `chrome.storage` 或持久 Zustand，沒有預設對所有 tab 廣播，沒有硬編碼密碼，沒有讓 inject 持有長期私鑰，簽名仍在擴充 UI。`hydrateFromSessionStore` 是 SW 重啟後用 session key 解 vault，不是跨 runtime 的 rehydrate 同步總線。未實作的 Wallet Standard 方法沒有要宣告。manifest 已有 `tabs`。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | 關閉 | INDEX「須先連線」；HOW「連線」；HANDOFF paste-ready |
| H2 | HIGH | 關閉 | INDEX「簽名位元組」；HOW「本地 Compute Budget」；HANDOFF paste-ready |
| H3 | HIGH | 關閉 | INDEX「簽名位元組」；HOW「本地 Compute Budget」第 5 點；HANDOFF paste-ready |
| M1 | MEDIUM | 關閉 | INDEX「剪貼簿」；HOW「剪貼簿」 |
| M2 | MEDIUM | 關閉 | HOW「getState 與 integration secrets」 |
| M3 | MEDIUM | 關閉 | INDEX「領域用語」（出貨時改 DOMAIN） |
| M4 | MEDIUM | 關閉 | INDEX「公鑰綁定」；HOW「公鑰綁定」 |
| M5 | MEDIUM | 關閉 | INDEX「Chain」；HOW「誰可以叫 dapp.*」 |
| M6 | MEDIUM | 關閉 | INDEX「簽名位元組」；HOW「本地 Compute Budget」第 4 點；HANDOFF paste-ready |
| M7 | MEDIUM | 關閉 | INDEX「須先連線」；HOW「連線」；HANDOFF paste-ready |
| L1 | LOW | 關閉 | HOW「RPC」 |
| L2 | LOW | 關閉 | reasoning「為何不解 SW 重啟就上鎖」 |
| L3 | LOW | 仍開（非阻擋） | HOW「核准前再讀分頁」收尾句與同節第一點、INDEX 括號對齊即可 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-10 | 可行，門檻未過。未關 HIGH：H1、H2。應修 MEDIUM：M1–M5。 |
| 第 2 輪複審 | 2026-10-10 | 可行，門檻未過。H1、H2、M1–M5、L1、L2 已寫入現契約，關閉。未關 HIGH：H3。應修 MEDIUM：M6、M7。L3 非阻擋。不可行：否。 |
| 第 3 輪複審 | 2026-10-10 | 可行，審查門檻通過。H3、M6、M7 已寫入現契約，關閉。未關 HIGH：無。應修 MEDIUM：無。L3 仍開且非阻擋。不可行：否。 |
