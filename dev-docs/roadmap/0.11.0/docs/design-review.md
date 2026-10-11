# Design review — 0.11.0 Airwave Wallet

- 日期：2026-10-04（Asia/Hong_Kong）
- 輪次：**第 3 輪複審**（累加於初審同一檔；穩定 ID 未重編號）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`sign-tx-budget-how.md`](./sign-tx-budget-how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)；上游 [`../../0.10.0/INDEX.md`](../../0.10.0/INDEX.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣（本輪）：`wallet/src/background/simulate-pending-tx.ts`、`index.ts`（`ui.simulatePendingTx`／`finishSignTransaction`／`sendBridgeResult`）、`pending.ts`、`shared/commands.ts`、`shared/storage-keys.ts`、`background/storage-io.ts`、`inject/wallet.ts`、`popout/main.ts`、`popup/index.html` Settings 樞紐
- **總評：** 無未關閉 HIGH。H1–H3、M1–M7、L1–L2 已寫進 INDEX／HOW（HANDOFF 覆述批准 bytes、省略 cu、writeSeq、fail 公式、已簽不寫 `workingTx`）。審查門檻**通過**。提案**可行**。應修 MEDIUM：無。

## Findings（累加）

關閉＝已寫進 INDEX／HOW／HANDOFF（契約分叉已消）；仍開＝契約仍分叉或本輪新缺口；非阻擋＝記錄即可。

### HIGH

#### H1 — 批准簽哪份 bytes：`workingTx` 寫入時機與「尚未有建議值」不一致 — **已關閉**

初審：INDEX「建議值前簽原始」與 HOW「第一次即寫 `workingTx`」分叉；未禁 phase 1 副本進 `workingTx`。

第 2／3 輪核對（關閉）：

- INDEX「批准時機」：`workingTx` **尚未寫入成功前**（含第一次尚未把建議組合寫入）→ 簽原始 payload；**有**之後簽該份。以 **SW 記憶體**為準，與 popout 是否畫完無關。已簽路徑 **禁止**寫 `workingTx`。
- HOW「Compute Budget」：phase 1 **量測副本不得**寫入 `workingTx`；`workingTx` **只**在建議 limit（或使用者 limit）＋ Default CU price（或使用者 price）**寫入成功後**更新。批准：`workingTx ?? 原始`。簽名槽節：已簽禁止寫 `workingTx`。
- HANDOFF starter：Approve 看 SW；無 `workingTx` 簽原始；phase 1 副本不得進 `workingTx`；已簽不寫 `workingTx`。
- 對應初審建議 **A**。

#### H2 — 插入 Compute Budget program id 時靜態 keys 位置未寫死 — **已關閉**

初審：HOW 只說「加入若沒有」，未禁 `staticAccountKeys[0]`／signer 槽。

第 2／3 輪核對（關閉）：

- INDEX「未簽名」：靜態 keys **已含** → 只動 compiled ix、**不**改 keys 序。**尚未含** → program id 加在 **unsigned 非付款人區**（readonly unsigned 即可）；**禁止** `staticAccountKeys[0]` 或任何 signer 槽；維持 `numRequiredSignatures`；加入後重對 compiled ix index。v0 lookups 原樣。組不出 → 不改 `workingTx`。
- HOW 同句。HANDOFF 未覆述槽位，與 INDEX／HOW **不衝突**。

#### H3 — 省略兩欄的 `ui.simulatePendingTx` 會重跑 phase 1.5 並覆寫已改的 CU — **已關閉**

初審：省略兩欄永遠 phase 1→1.5→2，重試會覆寫使用者值。

第 2／3 輪核對（關閉）：

- INDEX「命令」：省略兩欄 **僅當尚無 `workingTx`** 才跑 phase 1→1.5→2；**已有**則只 phase 2、不改 CU。重試／debounce **必須帶齊兩欄**（第一次進殼才省略）。
- HOW 表同行。HANDOFF starter：省略 cu 只在尚無 `workingTx` 時跑 phase 1。
- 並行寫入世代：第 2 輪 **M7**；第 3 輪 M7 **已關**（不重開 H3）。

### MEDIUM

| ID | 第 3 輪狀態 | 依據 |
|----|-------------|------|
| M1 | **已關閉** | INDEX Phase 1 指向 HOW **builtin 表**；HOW 列出 12 個 program id（System／Vote／Stake／Compute Budget／Config／ALT／三個 BPF Loader／Ed25519／Secp256k1／Native Loader）；未列者各 200,000。HANDOFF 未覆述表，與 HOW 不衝突。 |
| M2 | **已關閉** | INDEX／HOW：進來的 message **同 disc 已多於一條** → 不寫入、不改 `workingTx`，交易費卡「無法寫入計算預算」（與封包失敗同一句）。 |
| M3 | **已關閉** | INDEX：費用卡只用 `sigFeeLamports`／`priorityLamports`／`totalFeeLamports`；**禁止**再用 `feeLamports`／`value.fee`／`getFeeForMessage` 畫手續費。phase 2 **不必**為手續費打 `getFeeForMessage`。明細刪手續費主路徑、可留付款人縮寫。HOW Result 欄與 popout 禁 `feeLamports` 同句。 |
| M4 | **已關閉** | INDEX：同一 `requestId` 以 **最後一次被接受的寫入** 為 `workingTx`；popout 自備遞增 `gen` 丟過期回包。HOW：回包用遞增世代。SW 過期寫入見 **M7**（已關）。 |
| M5 | **已關閉** | INDEX／HOW：Settings 樞紐 **第五列**，插在 **API keys 與錢包密碼之間**；標籤 Default CU price；子頁單欄整數；Back 回樞紐。 |
| M6 | **已關閉** | INDEX Phase 1 fail：對已插入兩條 CB 的副本頂層 compiled ix 加總後建議 limit＝`ceil(sum × 1.25)` 再 clamp `[1, 1_400_000]`（**先乘再 clamp，禁止先 clamp 再乘**）。HOW Builtin 表同句。HANDOFF starter：`fail 公式：ceil(sum×1.25) 再 clamp`。 |
| M7 | **已關閉** | INDEX「命令」：同一 `requestId` 每次受理 `ui.simulatePendingTx` 遞增記憶體 `writeSeq`；寫入 `workingTx` 前若已有**更新的 seq 被接受**，本筆 **不得覆寫**；估計中（尚無合法 CU 兩欄）重試 **disabled**；有兩欄後重試／debounce **必須帶齊**。HOW：較舊 seq **不得**覆寫較新已接受的 `workingTx`。HANDOFF starter：writeSeq 較舊不得覆寫較新 `workingTx`；估計中重試 disabled。 |

本輪無新增 HIGH、MEDIUM、LOW。

### LOW

| ID | 第 3 輪狀態 | 依據 |
|----|-------------|------|
| L1 | **已關閉** | INDEX 狀態現為 `planned`（不再是初審所見 `ready`），符合 GUIDELINES。 |
| L2 | **已關閉** | INDEX／HOW／HANDOFF：已簽禁止寫 `workingTx`。 |
| L3 | **非阻擋** | 概念稿非正式；INDEX 已聲明衝突以 INDEX／HOW 為準。 |
| L4 | **非阻擋** | `PendingRecord` 現碼仍無 `workingTx`——未實作本版 ≠ 設計洞。INDEX／HOW 已規定僅 SW 記憶體；收斂時 `commands.ts` 加欄即可。 |

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 未簽可見總費；明細預設收合；展開改 limit／price；改完重查；批准含 CB；不廣播 | 可測 | H3／M7 已關 |
| 已簽 CU 不可改；不增第二條 limit／price | 可測 | H2 已關 |
| Default CU price 出廠 25000；新審批用新值 | 可測 | M5 列位已關 |
| phase 1「估計中」；`unparseable` 外批准可按 | 可測 | H1 已關（估計中無 `workingTx` → 簽原始） |
| 預期變動只信 phase 2；失敗 notice 同 0.10.0 | 可測 | phase 1 不填 deltas（HOW 已有） |
| connect／signMessage 不變；pending 不進 storage；只回原 tab | 可測 | 與禁區一致 |
| `npm run build` | 出貨測 | 無 |
| 無真實秘密 | 文件已守 | 本報告未貼 |

待拍板欄＝空。0.10.0「批准不改 instruction」由本版 INDEX「非目標內的舊 0.10.0 句」**明示推翻**（僅未簽＋ disc 2／3）。GUIDELINES：pending 僅 SW Map、結果只回原 tab、模擬／pending 不進 storage、禁止自寫 rehydrate、inject 不持有私鑰、不宣告未做的 Wallet Standard 方法——INDEX／HOW／HANDOFF **未推翻**。

## 與現碼抽樣

現碼未做本版 **≠** 設計 HIGH。下列為**現行行為**；實作須依**已收斂契約**改。

| 錨點 | 現況 | 與提案 |
|------|------|--------|
| `ui.simulatePendingTx` | payload 僅 `requestId`；模擬 `p.payload.transaction`；無 cu／無 `workingTx` | Track 2 擴 payload；省略／帶齊分支依 INDEX |
| `finishSignTransaction` | 只簽原始 `payload.transaction` | 改 `workingTx ?? 原始`（H1 已定） |
| `PendingRecord` | 無 `workingTx`；Map 僅 SW | 掛記憶體欄；勿寫 storage（L4） |
| `normalizeSettings`／`Settings` | 無 `defaultCuPrice` | Track 1：缺欄 25000、clamp price 界 |
| popout 明細 | 主路徑「預估手續費」用 `feeLamports`；retry 不帶 cu | Track 3 刪費；retry 帶齊兩欄（H3／M3） |
| Settings 樞紐 | 四列（網路／RPC／API keys／錢包密碼） | 第五列插 keys 與密碼之間（M5） |
| `simulate-pending-tx.ts` | 仍 `value.fee`／`getFeeForMessage` → `feeLamports` | 改回 `sigFeeLamports` 等；phase 2 不必打 `getFeeForMessage` |
| `inject/wallet.ts` | Connect／Events／Disconnect／signMessage／signTransaction | 與非目標一致，勿宣告 signAndSend／signIn |
| 結果路徑 | `sendBridgeResult(tabId, …)` | 抽樣未見全 tab 廣播；本版勿改壞 |

未發現提案要求：storage hydrate pending、廣播、硬編碼密碼、inject 持有私鑰、宣告未實作 Wallet Standard 方法。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | 已關閉 | INDEX「批准時機」；HOW「Compute Budget」／簽名槽；HANDOFF starter |
| H2 | HIGH | 已關閉 | INDEX「未簽名」；HOW「Compute Budget」 |
| H3 | HIGH | 已關閉 | INDEX「命令」；HOW `ui.simulatePendingTx` 表；HANDOFF starter |
| M1 | MEDIUM | 已關閉 | INDEX Phase 1；HOW「Builtin 表」 |
| M2 | MEDIUM | 已關閉 | INDEX「未簽名」；HOW「Compute Budget」 |
| M3 | MEDIUM | 已關閉 | INDEX「命令」／「交易費卡」／「交易明細」；HOW「費用」 |
| M4 | MEDIUM | 已關閉 | INDEX「命令」；HOW 寫入／popout 世代。殘餘已併入 M7 |
| M5 | MEDIUM | 已關閉 | INDEX「Default CU price」；HOW「Settings」 |
| M6 | MEDIUM | 已關閉 | INDEX Phase 1 fail 公式；HOW Builtin 表；HANDOFF starter |
| M7 | MEDIUM | 已關閉 | INDEX「命令」writeSeq／估計中重試；HOW `ui.simulatePendingTx`；HANDOFF starter |
| L1 | LOW | 已關閉 | INDEX 狀態 `planned` |
| L2 | LOW | 已關閉 | INDEX「批准時機」；HOW 簽名槽；HANDOFF |
| L3 | LOW | 非阻擋 | — |
| L4 | LOW | 非阻擋 | 現碼未做本版 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-04 | 可行；門檻未過。未關 HIGH：H1 批准 bytes／workingTx 時機；H2 program id 插入位置；H3 省略 cu 重跑 phase 1.5。應修 M1–M5。 |
| 第 2 輪複審 | 2026-10-04 | 可行；門檻通過。H1–H3、M1–M5、L1–L2 已關。未關 HIGH：無。應修 M6（公式順序）、M7（SW 寫入世代）。不可行＝否。 |
| 第 3 輪複審 | 2026-10-04 | 可行；門檻通過。H1–H3、M1–M7、L1–L2 已關。未關 HIGH：無。應修 MEDIUM：無。不可行＝否。 |
