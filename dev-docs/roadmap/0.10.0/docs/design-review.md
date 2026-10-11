# Design review — 0.10.0 Airwave Wallet

- 日期：2026-10-04（Asia/Hong_Kong）
- 輪次：**第 3 輪複審**（累加於初審同一檔；穩定 ID 未重編號）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`sign-transaction-how.md`](./sign-transaction-how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)；上游 [`../../0.9.0/INDEX.md`](../../0.9.0/INDEX.md)、[`../../0.1.0/docs/message-flow-how.md`](../../0.1.0/docs/message-flow-how.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 構想（非契約，出貨後已刪獨立檔）：簽署交易頁 UI／simulation 已併入 0.10.0
- 現行程式抽樣：本輪**未**重抽程式；現碼對照沿用第 2 輪表。契約核對以 INDEX／HOW 為準。
- **總評：** 無未關閉 HIGH。審查門檻**通過**。提案不可行＝否。無應修 MEDIUM。M6 已寫進 INDEX「餘額差」與 HOW 步驟 6。H1、M1–M5 維持關閉。

## Findings（累加）

關閉＝已寫進 INDEX／HOW／HANDOFF（契約分叉已消）；仍開＝契約仍分叉或本輪新缺口；非阻擋＝記錄即可。

### HIGH

#### H1 — 主舞台「增減」演算法未自足，HOW 還允許不出 SPL — **已關閉**

初審：HOW 允許「先只帶 signer」、差額只寫模組註解；與 INDEX 主舞台分叉。

第 2／3 輪核對（維持關閉）：

- INDEX「模擬參數」：先 `getMultipleAccounts`（或同等）再對 post 算差；禁止把 post 存量當增減；`addresses` 至少含凍結公鑰＋該戶 Token／Token-2022 token account；禁止以「先只帶 signer」當出貨範圍。
- INDEX「餘額差」：零差不列；全部零差且前後資料齊 →「無餘額變動」。帳戶不存在（pre／post 空）視為存量 0。僅 RPC／對不上地址／encoding 失敗才不附 `deltas`。`outcome: "fail"` 同樣規則。
- HOW `ui.simulatePendingTx` 步驟 1–7 寫死公式；lookup 失敗 → `rpc`、不附 `deltas`。步驟 6：null 視為存量 0，不要把「帳戶尚未存在」當成缺資料。
- HANDOFF starter：先 getMultipleAccounts 再對 post 算差；禁止只帶 signer。

### MEDIUM

| ID | 第 3 輪狀態 | 依據 |
|----|-------------|------|
| M1 | **已關閉** | INDEX「批准語意」＋驗收：無法 deserialize 仍 approve（含直接 `ui.resolvePending`）→ dApp `INVALID_TRANSACTION`、未簽名。HOW `finishSignTransaction` 同碼、禁止 `tx.sign`。HANDOFF starter 同句。 |
| M2 | **已關閉** | INDEX「命令」、HOW：pending 不存在**或** `kind !== "signTransaction"` → `ok: false`、`NOT_FOUND`（不要 `UNKNOWN`）。HANDOFF starter 同句。 |
| M3 | **已關閉** | INDEX「交易明細」、HOW popout：指令列**只信** SW `instructions[]`；空則「無法列出指令」。HANDOFF：popout 不自己 deserialize 畫列。 |
| M4 | **已關閉** | INDEX／HOW：整段模擬共用 **15 秒** AbortSignal；逾時 `outcome: "rpc"`，不擋批准（`unparseable` 除外）。HANDOFF starter 同句。 |
| M5 | **已關閉** | INDEX「交易明細」、HOW：`getFeeForMessage` 成功才寫 SOL；失敗／未 deserialize／`unparseable`／`rpc` 查不到 →「未知」，禁止 0；已 deserialize 則可寫 payer 縮寫。HANDOFF starter **未覆述**費用規則，與 INDEX 不衝突。 |
| M6 | **已關閉** | INDEX「餘額差」：某個 `addresses` 槽在 pre 或 post 為空（帳戶不存在）視為存量 0。僅 RPC／對不上地址／encoding 失敗才不附 `deltas`。`fail` 同樣規則。HOW 步驟 6：該槽 `getMultipleAccounts`／模擬 `accounts` 為 `null` 視為存量 0 再相減（新建 ATA 入帳等）；不要把「帳戶尚未存在」當成缺資料。HANDOFF starter 未覆述 null＝0，與 INDEX／HOW 不衝突。 |

本輪無新增 MEDIUM。

### LOW

| ID | 第 3 輪狀態 | 依據 |
|----|-------------|------|
| L1 | 仍開，非阻擋 | Track 1 驗收偏靜態。出貨仍靠 INDEX checklist 手驗。 |
| L2 | 仍開，非阻擋 | 0.1.0 `message-flow-how` 尚無 `ui.simulatePendingTx`。可選出貨後回寫一行。 |
| L3 | 仍開，非阻擋 | 第 2 輪抽樣：現碼 `.primary-btn { flex: 1 }`；`.unlock-screen .primary-btn` 僅 `margin-top`、**未** `flex: none`。INDEX 已禁解鎖屏沿用殼底 `flex: 1`。實作須覆寫。 |
| L4 | **已關閉** | INDEX「模擬參數」與 HOW：durable nonce 在 `replaceRecentBlockhash` 下失真 → `fail`／`rpc`，不要把差額當可信。 |
| L5 | 仍開，非阻擋 | 驗收未單列重試 icon、熟名表、原始交易 hex。已定案有；實作跟已定案即可。 |

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 已解鎖、可解析：非 JSON；標題「簽署交易」、站點、凍結 widget、預期變動（查詢中／無變動／無法估計）；明細預設收合；批准回已簽交易；不廣播；切帳戶不改簽名者 | 差額公式已可測（含帳戶不存在＝0） | M6 已關 |
| `value.err` 非空：notice「預計交易失敗」在上方；原因一行；失敗詳情同卡收合；不自動拒絕；仍可簽回 | 可測 | `fail` 的 `deltas` 規則與 ok 相同（INDEX 餘額差；HOW 步驟 6） |
| RPC 不可用：「無法模擬」；無失敗詳情 logs；可 deserialize 時批准仍可按 | 可測 | M4 已關 |
| 無法 deserialize：無法模擬；批准 disabled；拒絕 `USER_REJECTED`；誤 approve → `INVALID_TRANSACTION` | 可測 | M1 已關 |
| 鎖定簽交易：不立刻 `WALLET_LOCKED`；整頁解鎖無殼底、解鎖鈕非拉滿；僅本窗解鎖 700ms hold | 可測（對齊 0.9.0） | L3 現碼 flex（實作項） |
| `ui.getPending` 失敗：請求已不在；兩鈕 disabled | 可測 | 無 |
| connect 仍 0.8.0 JSON；signMessage 仍 0.9.0 | 可測 | 無 |
| 解鎖欄非 `type="password"`；pending／模擬不進 `chrome.storage`；結果只回原 tab | 可測；與禁區一致 | 無 |
| `cd wallet && npm run build` | 可測 | 無 |
| 文件與程式無真實秘密 | 本審查未見違規 | 無 |

待拍板欄＝空。GUIDELINES：pending 僅 SW Map、popout 只帶 `requestId`、模擬不寫 local／session、結果只回原 tab、禁止自寫 rehydrate、inject 不持有私鑰、不宣告新 Wallet Standard 方法——INDEX／HOW／HANDOFF **未推翻**。

## 與現碼抽樣

現碼未做本版 ≠ 設計 HIGH。下列為**現行行為與提案互斥**（Track 應改掉）。本輪未重抽程式；表沿用第 2 輪。

| 現碼 | 0.10.0 提案 |
|------|-------------|
| `dapp.signTransaction` 先整包 `signGateError()`，鎖定立刻 `WALLET_LOCKED` | 鎖定仍 `addPending`＋`openPopout`；僅 `NO_ACCOUNT`／`ACCOUNT_READ_ONLY` 早退（對齊 `signMessageEnqueueGateError`） |
| enqueue 無 `signAccountId`（signTx） | 寫入當時可簽 `activeAccountId` |
| `finishSignTransaction` 再呼 `signGateError`＋`keypairForActiveSigning`；deserialize 丟錯可能走 `INTERNAL` 且 `takePending` 已刪 | 只對 pending `signAccountId`；無法 deserialize 的 approve → `INVALID_TRANSACTION`，禁止 `tx.sign` |
| `handleUiCommand`／`AirwaveCommand` 無 `ui.simulatePendingTx` | 新增 UI command；僅擴充頁可呼 |
| popout：`kind !== "signMessage"` → `showLegacy` JSON | `signTransaction` 專用主舞台；connect 維持 JSON |
| `refreshAfterUnlock` 只處理 `signMessage` | 本 kind 同樣進簽署殼 |
| `.unlock-screen .primary-btn` 無 `flex: none` | 解鎖屏 `flex: none` |
| inject 無 `signAndSendTransaction`；content `PAGE_COMMANDS` 無 `ui.*` | 符合；模擬不得從頁面打 |

未把 `brainstorm/` 或 `../solibra-wallet` 當現行程式。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | 已關閉 | INDEX 模擬參數／餘額差；HOW `ui.simulatePendingTx` 步驟 1–7；HANDOFF starter |
| M1 | MEDIUM | 已關閉 | INDEX 批准語意＋驗收；HOW 閘門末段；HANDOFF starter |
| M2 | MEDIUM | 已關閉 | INDEX 命令；HOW `ui.simulatePendingTx`；HANDOFF starter |
| M3 | MEDIUM | 已關閉 | INDEX 交易明細；HOW 指令列／popout；HANDOFF starter |
| M4 | MEDIUM | 已關閉 | INDEX 模擬參數；HOW 15s AbortSignal；HANDOFF starter |
| M5 | MEDIUM | 已關閉 | INDEX 交易明細；HOW `getFeeForMessage`／popout 費用 |
| M6 | MEDIUM | 已關閉 | INDEX 餘額差（pre／post 空＝存量 0）；HOW `ui.simulatePendingTx` 步驟 6 |
| L1 | LOW | 仍開，非阻擋 | — |
| L2 | LOW | 仍開，非阻擋 | — |
| L3 | LOW | 仍開，非阻擋 | — |
| L4 | LOW | 已關閉 | INDEX 模擬參數；HOW Durable nonce |
| L5 | LOW | 仍開，非阻擋 | — |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-04 | 有未關閉 HIGH（H1）。門檻未通過。不可行＝否。應修 M1–M5。 |
| 第 2 輪複審 | 2026-10-04 | 無未關閉 HIGH。門檻通過。不可行＝否。H1／M1–M5 已關。應修 M6。 |
| 第 3 輪複審 | 2026-10-04 | 無未關閉 HIGH。門檻通過。不可行＝否。M6 已關。無應修 MEDIUM。 |
