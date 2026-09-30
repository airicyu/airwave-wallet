# Implementation review — 0.2.0 Airwave Wallet

- **日期：** R1 2026-10-01（Asia/Hong_Kong）
- **輪次：** R1（初審；同一份報告累加，**未**重編舊 ID）
- **角色：** 實作審查（不改程式、不加功能、不 commit）
- **對照基準：** [`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`accounts-home-how.md`](./accounts-home-how.md)、[`disconnect-how.md`](./disconnect-how.md)；架構禁區見 [`../../GUIDELINES.md`](../../GUIDELINES.md)
- **上游契約（未改行為仍有效）：** [0.1.0 message-flow-how](../../0.1.0/docs/message-flow-how.md)、[0.1.0 storage-custody-how](../../0.1.0/docs/storage-custody-how.md)
- **現行程式：** `git diff`＋working tree（含未 commit 變更）；不以 chat history 為準

---

## 總評

0.2.0 四 Track 主路徑與 INDEX／HOW 對齊：pending 仍僅 SW、disconnect 兩段式接線完整、delete 先檢查後寫入、createVault 保留 read-only、拒簽 `ACCOUNT_READ_ONLY` 優先於 `WALLET_LOCKED`、能力表含 `standard:disconnect` 且無空廣告、content 白名單增量正確、popup 鎖定仍可看首頁資產、無 hardcode 密碼。**無未關 HIGH。** `wallet`／`test-web` 建置本輪通過；INDEX 出貨 checklist 之 Chrome／端到端手驗**本環境未執行**（見下）。

---

## Findings

### HIGH

（本輪無 HIGH。）

### MEDIUM

| ID | 標題 | 說明 | 建議 |
|----|------|------|------|
| M1 | inject 未向 dApp 保留 SW 錯誤碼 | Track 1／INDEX 驗收要求 read-only 拒簽為 **`ACCOUNT_READ_ONLY`**。SW [`signGateError`](../../../wallet/src/background/index.ts) 與 content 轉發的 `error` 物件含 `code`；[`bridge-client.ts`](../../../wallet/src/inject/bridge-client.ts) 僅 `reject(new Error(error.message))`，page script／test-web 無法讀取 `ACCOUNT_READ_ONLY`，只能比對 message 字串。SW 契約已滿足，dApp 可觀測性與驗收字面略差。 | 拒絕時附帶 `code`（自訂 Error 或 result 型別），或 test-web 改走能讀 ext 回應的除錯路徑；至少 README 手驗改為「訊息含 Read-only」若維持現 bridge。 |
| M2 | roadmap 表狀態與版本漂移 | [`docs/roadmap/README.md`](../../../docs/roadmap/README.md) 仍列 0.2.0 為 `planned`；[`changelog.md`](../../../changelog.md)、[`version.md`](../../../version.md)、`package.json` 已 `0.2.0`。 | 出貨前將 README 狀態改 `in progress`／`shipped` 與 INDEX 一致。 |
| M3 | changelog 早於 INDEX shipped | 工作樹已追加 0.2.0 changelog 條目，[`../INDEX.md`](../INDEX.md) 仍 `in progress`。 | 手驗通過後再勾驗收、改 INDEX 狀態，避免 shipped 前 changelog 先行。 |

### LOW

| ID | 標題 | 說明 |
|----|------|------|
| L1 | WS `icon` 仍為 1×1 data URI | 自 0.1.0 延續；非 0.2.0  regression。 |
| L2 | `tabs.sendMessage` 未帶 `frameId` | 自 0.1.0 延續；disconnect／account-changed 仍 targeted tabId。 |
| L3 | delete 多步寫入無交易性 | `deleteAccount` 在檢查通過後依序寫 accounts／connections／vault；若 `persistVaultFromSession` 失敗可能短暫不一致（極端）。 |

---

## R1 架構／契約抽樣（使用者指定項）

| 檢查項 | 結論 | 靜態證據 |
|--------|------|----------|
| Pending 僅 SW | **符合** | [`pending.ts`](../../../wallet/src/background/pending.ts) `Map`；popout [`ui.getPending`](../../../wallet/src/popout/main.ts) 向 SW 取 payload，無 storage hydrate |
| disconnect 兩段式接線 | **符合** | SW [`notifyDisconnected`](../../../wallet/src/background/index.ts) → content [`airwave-bridge-disconnected`](../../../wallet/src/content/index.ts) → `postMessage` `event: "disconnected"` → [`bridge-client`](../../../wallet/src/inject/bridge-client.ts) → [`wallet.ts`](../../../wallet/src/inject/wallet.ts) 清 `currentPublicKey`；WS `disconnect` 亦呼叫 `dapp.disconnect` 後本地清空 |
| delete 先檢查後寫入 | **符合** | `ACCOUNT_NOT_FOUND`／signing 且 `WALLET_LOCKED` 皆在 **無** `writeAccounts` 前返回 |
| createVault 保留 read-only | **符合** | `writeAccounts([...existingAccounts, meta])`；公鑰衝突 `ACCOUNT_EXISTS` 且不寫 vault |
| 拒簽 `ACCOUNT_READ_ONLY` 優先 | **符合** | [`signGateError`](../../../wallet/src/background/index.ts) 順序：NO_ACCOUNT → readOnly → WALLET_LOCKED；`dapp.sign*` 建 pending 前；`finishSign*` approve 後再檢查 |
| 能力表含 disconnect、無空廣告 | **符合** | [`wallet.ts`](../../../wallet/src/inject/wallet.ts)：`StandardConnect`／`StandardDisconnect`／`StandardEvents`／`SolanaSignMessage`／`SolanaSignTransaction`；無 signIn／signAll／signAndSend |
| content 白名單 | **符合** | [`PAGE_COMMANDS`](../../../wallet/src/content/index.ts) 在 0.1.0 四項上 **僅** 增 `dapp.disconnect` |
| popup 鎖定可看 home | **符合** | [`render`](../../../wallet/src/popup/main.ts)：`home.hidden` 只綁 `hasAccounts`＋`activeAccountId`，不綁 `unlocked`；[`refreshHomeAssets`](../../../wallet/src/popup/main.ts) popup 直連 RPC |
| 無 hardcode 密碼 | **符合** | 密碼僅表單輸入；vault PBKDF2；repo 內無預設密碼常數 |
| 結果不廣播全 tab | **符合** | `sendBridgeResult`／`notifyDisconnected`／`notifyAccountChanged` 皆用記錄之 `tabId` |
| 頁面不可呼叫 `wallet.*`／`ui.*` | **符合**（0.1.0 修復延續） | content 白名單 + SW [`isExtensionPage`](../../../wallet/src/background/index.ts) |

---

## 驗收對照（INDEX 出貨 checklist）

證據：**建置／靜態碼**、**無瀏覽器手驗證據**（本審查環境未載入 Chrome 擴充、未跑 test-web dev）。

| 驗收項 | 結果 | 證據 |
|--------|------|------|
| `cd wallet && npm run build` | **通過** | R1：`tsc --noEmit && vite build` exit 0（約 1.43s） |
| `cd test-web && npm run build`／dev | **建置通過** | R1：`npm run build` exit 0（約 1.06s）；**未**啟動 dev server |
| Popup rename／storage 一致 | **無瀏覽器手驗** | 靜態：`wallet.renameAccount` |
| read-only → 拒簽 `ACCOUNT_READ_ONLY` | **無瀏覽器手驗** | 靜態：SW 碼正確；dApp 層見 M1 |
| delete／切 active／dApp change | **無瀏覽器手驗** | 靜態：delete 副作用 + `notifyAccountChanged` |
| 首頁 SOL＋token（鎖定亦可） | **無瀏覽器手驗** | 靜態：legacy `TOKEN_PROGRAM_ID`、`getParsedTokenAccountsByOwner` |
| test-web Disconnect／重連 | **無瀏覽器手驗** | 靜態：[`test-web/src/main.ts`](../../../test-web/src/main.ts) `StandardDisconnect` |
| popup 斷開單一 origin | **無瀏覽器手驗** | 靜態：`wallet.disconnectOrigin` |
| WS 含 disconnect、無空廣告 | **靜態通過** | 見上表 |
| 無 hardcode 密碼；pending 不進 storage | **靜態通過** | 見上表 |

### Track 對照（靜態）

| Track | 靜態是否具備 | 備註 |
|-------|----------------|------|
| 1 帳戶 meta／CRUD／拒簽 | **是** | kind、rename／delete／addReadOnly、signGate |
| 2 disconnect＋站點 UI | **是** | dapp／wallet disconnect*、popup 列表 |
| 3 首頁資產 | **是** | popup RPC、loading／錯誤態 |
| 4 test-web／文件 | **是** | Disconnect 按鈕、README 0.2.0 步驟；根 README 指 0.2.0 INDEX |

---

## 測試結果

| 輪次 | 指令 | cwd | 結果 |
|------|------|-----|------|
| R1 | `npm run build` | `wallet/` | **通過** |
| R1 | `npm run build` | `test-web/` | **通過** |
| R1 | Chrome 載入 `wallet/dist`、依 test-web README 手驗 | — | **未執行**（使用者本輪亦未在實作環境手驗） |

隱私：本報告未寫入助記詞、私鑰、密碼、個人地址。

---

## 修復追蹤

| ID | 級 | 狀態 | 關閉依據 |
|----|----|------|----------|
| M1 | MEDIUM | **關閉** | `bridge-client` reject 附 `error.code`；test-web log 可見 |
| M2 | MEDIUM | **關閉** | `docs/roadmap/README.md` → `in progress` |
| M3 | MEDIUM | **非阻擋** | changelog 於實作末期預寫；`shipped` 時與 INDEX 一併對齊 |
| L1–L3 | LOW | **開** | 非 0.2.0 阻擋項 |

---

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| **R1 初審** | 2026-10-01 | 建置通過；0.2.0 契約抽樣無 HIGH。**M1–M3 開。** 瀏覽器手驗無證據；不宜標 INDEX `shipped`。 |

---

## 出貨門檻（對照 agent-workflow）

- [x] 無未關閉 HIGH ← **R1：無 HIGH**
- [ ] 同意的 MEDIUM 已修或標非阻擋 ← M1–M3 開（M2／M3 多為文件流程；M1 視團隊是否要求 dApp 讀碼）
- [ ] INDEX 驗收全勾 ← 需 Chrome 手驗
- [ ] 該版約定測試／手驗通過 ← 建置已過；手驗待做
- [ ] INDEX 狀態 → `shipped` 與 changelog 一致 ← 待使用者確認

**建議：** 就 **HIGH＋建置** 可進入 **Chrome／test-web 手驗**；**不建議**在未手驗下宣告 0.2.0 shipped。M2／M3 應在手驗通過出貨時一併收斂。
