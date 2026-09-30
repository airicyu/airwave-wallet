# Implementation review — 0.1.0 Airwave Wallet

- **日期：** R1 2026-09-30；**R2** 2026-09-30（Asia/Hong_Kong，複審）
- **輪次：** R2（複審；同一份報告累加，**未**重編舊 ID）
- **角色：** 實作審查（不改程式、不加功能、不 commit）
- **對照基準：** [`../INDEX.md`](../INDEX.md) 已定案＋驗收；架構禁區見 [`../../GUIDELINES.md`](../../GUIDELINES.md)
- **契約 HOW／WHY：** [`message-flow-how.md`](./message-flow-how.md)、[`storage-custody-how.md`](./storage-custody-how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)、[`../CHECKPOINT.md`](../CHECKPOINT.md)
- **現行程式：** `wallet/`、`test-web/` working tree（不以 chat history／實作脈絡為準）

---

## 總評

R1 阻擋項 **H1** 與約定修復項 **M1–M4** 已於現碼關閉；`wallet` 與 `test-web` 的 `npm run build` 本輪再過。**無未關閉 HIGH。** INDEX 出貨 checklist 除建置外，Chrome 載入未封裝與端到端手驗仍**無瀏覽器手驗證據**。就 **HIGH 與建置** 而言本輪門檻通過；完整 shipped 仍不可（手驗未做、尚有 MEDIUM）。

---

## Findings

下列 H1、M1–M4、L1–L6 為 **R1 原文**（ID 不變）。R2 狀態見「修復追蹤」與「R2 核對」。

### HIGH

| ID | 標題 | 說明 | 建議（實作收斂；本審查不改碼） |
|----|------|------|--------------------------------|
| H1 | 頁面可繞過 popout 自行批准 pending | INDEX 已定案：連線／簽名「使用者於 **popout** 批准」。content 將任何 `source: "airwave-inject"` 的 `command` 原樣轉 SW（[`wallet/src/content/index.ts`](../../../wallet/src/content/index.ts)）；SW [`dispatch`](../../../wallet/src/background/index.ts) **不**依 `sender.url`／`sender.tab` 區分擴充頁與網頁。網頁可自選 `requestId` 先發 `dapp.connect`／`dapp.sign*`，再發 `ui.resolvePending` `{ decision: "approve" }`，無需點擊 popout。同通道亦可呼叫 `wallet.lock`、`wallet.unlock`、`storage.patchSettings`、`wallet.setActiveAccount` 等。違反已定案審批模型與 GUIDELINES「簽名發生在擴充 UI、不在 page script」的精神（批准閘門被跳過）。 | SW：僅當 `sender.url` 為本擴充 origin（popup／popout）時接受 `ui.*`、`wallet.*`、`storage.*`；content 只轉發 `dapp.*` 與 `debug.ping`。 |

### MEDIUM

| ID | 標題 | 說明 | 建議 |
|----|------|------|------|
| M1 | Vault 內秘密格式偏離 HOW | [`storage-custody-how.md`](./storage-custody-how.md) 定解密後為 `{ secrets: Record<accountId, base58Secret> }`。實作 [`secretToStored`](../../../wallet/src/background/index.ts) 寫入 `JSON.stringify(Array.from(kp.secretKey))`（數字陣列字串），[`session.loadSecrets`](../../../wallet/src/background/session.ts) 再 `JSON.parse`。加密盒本身仍是 PBKDF2＋AES-GCM，但與本版 custody 契約內文格式不一致。 | 改為 HOW 所述 base58，或把 HOW 改成與現碼一致（須規劃收斂契約，非本審查範圍）。 |
| M2 | inject 未依 `settings.cluster` 回傳 chain | HOW Wallet Standard：依 `settings.cluster` 回傳對應 `chain`。inject [`wallet.ts`](../../../wallet/src/inject/wallet.ts) 固定 `solana:mainnet`＋`solana:devnet`，且 page script 無 `chrome.storage`，也無 SW 推送 cluster。popup 可 persist cluster／RPC（Track 4 寫入路徑存在），但 WS 帳戶 `chains` 不跟隨設定。 | SW 在 connect 結果或獨立推送中帶 cluster；inject 據此標 active chain。 |
| M3 | test-web 未做 Track 7「base58 顯示」 | INDEX Track 7：完整 UX（狀態、錯誤、**base58 顯示**）。[`test-web/src/main.ts`](../../../test-web/src/main.ts) Connect 有印 address；Sign message／tx 只 log **byte 長度**，沒有 signature／signed tx 的 base58。 | 成功路徑用 base58（或明確 hex）印出結果。 |
| M4 | README 切帳標成可選，與出貨 checklist 不一致 | INDEX 驗收要求切換帳戶後已連線 tab 收到 `airwave-bridge-account-changed` 且 dApp 見 WS `change`。[`test-web/README.md`](../../../test-web/README.md) 將切帳列為「（可選）」。 | README 改為必做步驟，與 INDEX 驗收對齊。 |

### LOW

| ID | 標題 | 說明 |
|----|------|------|
| L1 | `debug.ping` 無呼叫端 | SW 已實作 ping；inject／test-web **沒有**按鈕或 self-test 呼叫。Track 2 驗收「看得到 round-trip」目前只能靠日後 Connect 等業務路徑或瀏覽器手驗，ping 本身無靜態證據。 |
| L2 | WS `icon` 為 1×1 data URI | HOW：擴充內建 PNG、與 manifest icons 同源。inject 使用 1×1 透明 PNG data URI，未用 `public/icon*.png`。 |
| L3 | popup 初值走 `wallet.getState` 而非 `storage.local.get` | HOW 寫 popup 啟動先 `chrome.storage.local.get`。現碼以 SW 快照為主，並用 `onChanged` 再 `getState`。解鎖態本來就不在 storage，此混合合理，但與 HOW 字面不完全一致。**不是** Zustand rehydrate 禁區。 |
| L4 | `connections` 多 `tabIds`；過期 tab 不清理 | HOW storage 表僅 `{ accountId, connectedAt }`。實作為推送 `account-changed` 存了 `tabIds`（與 HOW「對每個 tabId 推送」一致）。關閉的 tab 仍留在陣列，送訊失敗被忽略。 |
| L5 | `dapp.sign*` 不要求 origin 已連線 | 未連線站點仍可開 sign popout（使用者仍須按批准，除非 H1 被利用）。INDEX 未強制「先 connect 才能簽」，僅記錄。 |
| L6 | `tabs.sendMessage` 未帶 `frameId` | HOW 本版僅 top frame、`frameId: 0`。`chrome.tabs.sendMessage(tabId, msg)` 會送到該 tab **所有 frame** 的 content。非全 tab 廣播，但比「只回發起 frame」寬。 |

---

## R2 核對（R1 約定關閉項）

對照修復意圖：**H1** content 只轉 `dapp.*`／`debug.ping`、SW 拒非擴充頁的 `ui.*`／`wallet.*`；**M1** vault base58；**M2** cluster 隨 connect／account-changed；**M3** test-web base58 log；**M4** README 切帳必做。

| ID | R2 結論 | 靜態證據 |
|----|---------|----------|
| H1 | **關** | [`content/index.ts`](../../../wallet/src/content/index.ts) `PAGE_COMMANDS` 僅 `debug.ping`、`dapp.connect`、`dapp.signMessage`、`dapp.signTransaction`；非集合內 command 直接 return。SW [`isExtensionPage`](../../../wallet/src/background/index.ts) 要求 `sender.url` 以 `chrome.runtime.getURL("")` 開頭；`ui.*`／`wallet.*`／`storage.patchSettings` 否則回 `FORBIDDEN`。manifest **無** `externally_connectable`；WAR 僅 inject script、不含 popout HTML。雙層閘門對上 HOW。 |
| M1 | **關** | [`secretToStored`](../../../wallet/src/background/index.ts) 為 `bs58.encode(kp.secretKey)`；[`session.loadSecrets`](../../../wallet/src/background/session.ts) 以 `bs58.decode(stored)` 還原。與 HOW `{ secrets: Record<accountId, base58Secret> }` 一致。 |
| M2 | **關** | 新連線 `finishConnect`、已信任重連、以及 [`notifyAccountChanged`](../../../wallet/src/background/index.ts) 均帶 `cluster: settings.cluster`。inject [`applyCluster`](../../../wallet/src/inject/wallet.ts) 於 connect 結果與 `airwave-account-changed` 更新 `currentCluster`，帳戶 `chains` 為 `[activeChain()]`。**不含**僅改 settings 的即時推送（見 **M5**）。 |
| M3 | **關** | [`test-web/src/main.ts`](../../../test-web/src/main.ts) 成功路徑 `Signature base58:`／`Signed tx base58:` 使用 `bs58.encode`。 |
| M4 | **關** | [`test-web/README.md`](../../../test-web/README.md) 步驟 5 為 popup 切換帳戶（無「可選」標註），與 INDEX 出貨 checklist 切帳項對齊。 |

R2 **未**再開新 HIGH。

---

## R2 新增 Findings

ID 自 M5／L7 起，不重用 R1 編號。

### MEDIUM（R2）

| ID | 標題 | 說明 | 建議 |
|----|------|------|------|
| M5 | 僅儲存 cluster／RPC 不推送已連線 tab | M2 已在 connect 與切帳路徑帶 cluster。[`storage.patchSettings`](../../../wallet/src/background/index.ts) 只寫 storage，不呼叫 `notifyAccountChanged`。已連線頁在「只改 cluster、不切帳、不重連」時，inject `currentCluster` 可與 `settings.cluster` 脫節，與 HOW「依 `settings.cluster` 回傳對應 chain」的次要路徑不一致。INDEX 驗收未要求此路徑。 | 設定變更後對已連線 `tabIds` 推送 cluster（或文件將「須重連／切帳才更新 chain」寫死）。 |

### LOW（R2）

| ID | 標題 | 說明 |
|----|------|------|
| L7 | README 簽名步驟仍寫「長度」 | M3 程式已印 base58；[`test-web/README.md`](../../../test-web/README.md) 步驟 2–3 仍寫 signature／signed tx **長度**。不擋主路徑。 |

L2–L6 現碼與 R1 描述仍相符，**維持開**（可不擋 shipped）。

L1 **關**：[`inject/index.ts`](../../../wallet/src/inject/index.ts) 註冊後呼叫 `bridgeRequest("debug.ping", { text: "airwave" })`。仍無瀏覽器可見 ping UI；Track 2 round-trip 手驗仍無證據。

---

## 驗收對照

對照 [INDEX](../INDEX.md)「驗收（出貨 checklist）」。證據分：**建置／靜態碼**、**無瀏覽器手驗證據**。

| 驗收項 | 結果 | 證據 |
|--------|------|------|
| `cd wallet && npm run build` 成功 | **通過** | R2 2026-09-30：`tsc --noEmit && vite build` exit 0（約 1.45s） |
| `cd test-web && npm run dev` 可開頁 | **無證據** | R2 改跑 `npm run build`（含 `tsc --noEmit`）**成功**（約 1.25s）；**未**啟動 `vite` dev server，亦無瀏覽器開 `http://localhost:5173` |
| Chrome「載入未封裝」指向 `wallet/dist` | **無瀏覽器手驗證據** | 本審查環境無 Chrome 擴充載入／操作能力 |
| 首次 popup：設密碼 + 生成帳戶 | **無瀏覽器手驗證據** | 靜態：`wallet.createVault`＋popup 表單存在；未在擴充 UI 走完 |
| test-web Connect → popout approve → 顯示 pubkey | **無瀏覽器手驗證據** | 靜態：pending＋popout＋`publicKey` 回傳；H1 靜態已關，敵意頁繞過路徑不再成立（仍未手驗成功路徑） |
| Sign message → 批准 → dApp 收到 signature | **無瀏覽器手驗證據** | 靜態：SW `nacl.sign.detached` 後回 `signature` 陣列；test-web 印 base58（M3 關） |
| Sign transaction → 批准 → dApp 收到 signed tx | **無瀏覽器手驗證據** | 靜態：`VersionedTransaction.deserialize`＋`tx.sign`，不代 send；test-web 印 base58 |
| 拒絕任一路徑 dApp 收到錯誤、無幽靈 pending | **無瀏覽器手驗證據** | 靜態：reject／關窗 → `USER_REJECTED`＋`takePending`；inject／SW 雙 120s 逾時。未手驗幽靈 pending |
| 切換帳戶 → `airwave-bridge-account-changed` 且 WS `change` | **無瀏覽器手驗證據** | 靜態：`notifyAccountChanged` 含 pubkey＋cluster；inject emit `change`。README 切帳為必做（M4 關） |
| 無 hardcode 密碼；無 storage pending hydrate | **靜態通過** | 密碼僅使用者輸入；vault 無預設密碼字串。pending 僅 [`pending.ts`](../../../wallet/src/background/pending.ts) 的 `Map`。未寫 `chrome.storage.session` pending |

INDEX 手驗指令中的 Chrome／localhost 逐步操作：**全部無瀏覽器手驗證據**。

### Track 對照（靜態）

| Track | 靜態是否具備 | 該 Track 驗收 |
|-------|----------------|---------------|
| 1 腳手架 | 是：MV3、popup／popout、content、inject WAR、`dist/` | build **通過**（R2 再過） |
| 2 訊息骨架 | 是：envelope、origin 核對、`debug.ping`；inject 啟動時呼叫 ping（L1 關） | ping round-trip **無瀏覽器證據** |
| 3 Storage + vault | 是：keys、PBKDF2／AES-GCM、lock 拒簽、vault 秘密 base58（M1 關） | 重開 popup／storage 無明文私鑰：**無瀏覽器證據** |
| 4 帳戶與設定 | 是：匯入 base58、切帳、cluster／RPC patch | persist：**無瀏覽器證據**；僅改 cluster 不推送（M5） |
| 5 WS + connect | 是：註冊名 Airwave；connect pending＋popout；`connections`；connect 帶 cluster（M2 關） | Connect 手驗：**無瀏覽器證據** |
| 6 signMessage／signTransaction | 是：popout＋SW 簽；釣魚 heuristic `0x80`／`0x81` 且 ≥80 bytes | 兩按鈕成功／拒絕：**無瀏覽器證據** |
| 7 test-web 拋光 | 是：README 切帳必做；簽名 log base58（M3 關）；README 步驟 2–3 仍寫「長度」（L7） | 依 README 端到端：**無瀏覽器證據** |

---

## 測試結果

**整包單元測試：** 無。INDEX／GUIDELINES 均寫明本版以手驗為主；`wallet/package.json`、`test-web/package.json` **無** `test` script。**禁止假設 `bun test`。** 本輪未執行任何 bun／vitest。

| 輪次 | 指令 | cwd | 結果 |
|------|------|-----|------|
| R1 | `npm run build` | `wallet/` | 通過 |
| R1 | `npm run build` | `test-web/` | 通過 |
| **R2** | `npm run build` | `wallet/` | **通過**（`tsc --noEmit && vite build`，exit 0，約 1.45s） |
| **R2** | `npm run build` | `test-web/` | **通過**（`tsc --noEmit && vite build`，exit 0，約 1.25s） |
| R1／R2 | `npm run dev`（test-web） | `test-web/` | **未跑** |
| R1／R2 | Chrome 載入未封裝 `wallet/dist` | — | **無瀏覽器手驗證據** |
| R1／R2 | `http://localhost:5173` 依 README 逐步操作 | — | **無瀏覽器手驗證據** |

隱私：本報告未寫入助記詞、私鑰、密碼、個人地址。

---

## 架構禁區抽樣（GUIDELINES；INDEX 未推翻）

| 禁區 | R2 靜態結論 |
|------|-------------|
| Pending 權威在 SW；UI 不從 storage hydrate 找請求 | **符合**（`Map`＋`ui.getPending`；popout 僅 `?requestId=`） |
| 結果不廣播全部 tab | **符合**（`tabs.sendMessage(tabId)`；帳戶變更只打 `connections[].tabIds`） |
| 持久真相 `chrome.storage`＋`onChanged` | **大致符合**（見 L3） |
| Pending 不進持久 store | **符合** |
| Custody：無 hardcode 密碼；解鎖材料在 SW 記憶體；inject 不持私鑰 | **符合** |
| 能力表：不做的 WS 方法不宣告 | **符合**（無 `signIn`／`signAllTransactions`／`window.solana`） |
| Content 核對 origin，不信任自報 `from` | **符合**（`event.source === window` 且 `event.origin === location.origin`）；另限制 command 集合（H1 關） |
| 無 inject↔extension 每筆 RSA | **符合** |

---

## 修復追蹤

| ID | 級 | 狀態 | 關閉依據 |
|----|----|------|----------|
| H1 | HIGH | **關**（R2） | content 白名單＋SW `isExtensionPage`／`FORBIDDEN` |
| M1 | MEDIUM | **關**（R2） | vault 秘密 base58 encode／decode |
| M2 | MEDIUM | **關**（R2） | connect 結果與 `account-changed` 帶 cluster；inject `applyCluster` |
| M3 | MEDIUM | **關**（R2） | test-web 成功路徑 base58 log |
| M4 | MEDIUM | **關**（R2） | README 切帳為必做步驟 5 |
| M5 | MEDIUM | **關**（實作收斂，R2 後） | `storage.patchSettings` 寫入後若有 active 公鑰則 `notifyAccountChanged`（含 cluster） |
| L1 | LOW | **關**（R2） | inject 啟動呼叫 `debug.ping` |
| L2–L6 | LOW | **開** | 可不擋 shipped |
| L7 | LOW | **關**（實作收斂） | README 步驟 2–3 改為 base58 |

---

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| R1 初審 | 2026-09-30 | 建置通過；靜態主路徑與禁區大多符合。**未關 HIGH：H1**。瀏覽器手驗 **無證據**。不可 shipped。 |
| **R2 複審** | 2026-09-30 | **H1、M1–M4 關**；建置再過。**無未關 HIGH**。 |
| **出貨** | 2026-10-01 | INDEX `shipped`。使用者確認 Chrome 手驗通過。未 commit。 |

---

## 出貨門檻（對照 agent-workflow）

- [x] 無未關閉 HIGH ← **R2：H1 已關；無新 HIGH**
- [x] 同意的 MEDIUM 已修或標非阻擋 ← **M1–M5 已關**；L2–L6 非阻擋
- [x] INDEX 驗收全勾或本報告逐條通過 ← 使用者 2026-10-01 確認 Chrome + test-web 手驗通過
- [x] 該版約定測試／手驗通過 ← 無整包單元測試；手驗由使用者確認
- [x] backlog 該列已清 ← `docs/roadmap/backlog/minimal-wallet-mvp.md` 已刪
- [ ] 使用者同意後再 commit ← 尚未要求 commit

**完整出貨門檻（文件）：通過。** git commit 待使用者要求。
