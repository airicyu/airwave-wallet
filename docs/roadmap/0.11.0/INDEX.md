# 0.11.0 — 簽署交易：交易費卡與 Compute Budget

- **狀態：** `shipped`
- **上游版本：** [0.10.0](../0.10.0/INDEX.md)（pending／custody／差額模擬／鎖定開窗不變；本版改 **未簽**交易可寫入 CU，以及交易費呈現）
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 原 backlog「簽署交易自訂 Compute Budget」（出貨後已刪檔）；契約以本 INDEX 為準
- **畫面：** [`docs/design-principles.md`](../../design-principles.md)；概念稿 [`design-demos/sign-transaction-cu-budget-ux.html`](../../design-demos/sign-transaction-cu-budget-ux.html)（非正式；衝突以本 INDEX／HOW 為準）
- **秘密欄位：** 類 B 沿用 0.9.0；本版新欄不是密碼

## 產品句

未簽名的 `signTransaction` 審批可改 **CU limit** 與 **CU price**（改寫 Compute Budget 後再模擬、再簽名）；畫面上獨立「交易費」卡顯示 **總費＝簽名費＋優先費**。已有任一簽名則不改 instruction，費用卡唯讀。批准仍只簽名、不代廣播。

## 文件地圖

1. 本檔
2. [docs/sign-tx-budget-how.md](./docs/sign-tx-budget-how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. 上游：[0.10.0 INDEX／HOW](../0.10.0/INDEX.md)（差額、失敗 notice、鎖定、`ui.simulatePendingTx` 差額公式）、[0.8.0 INDEX](../0.8.0/INDEX.md)（Settings 樞紐）
5. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 範圍 | **只**擴 `kind === "signTransaction"` 的 popout 與相關 SW 模擬／批准寫入，以及 Settings 一列 **Default CU price**。`connect`／`signMessage` 畫面與閘門維持 0.10.0／0.9.0／0.8.0。禁止 `signAndSendTransaction`、Agent、改 vault |
| 已簽名 | 進來的 `VersionedTransaction` **任一** signature 槽非全 0 → **禁止**插入／取代 Compute Budget。交易費卡 **唯讀**（能從原 message 解出 limit／price 則算優先費；解不出則優先費與總費顯示「未知」，簽名費仍可算）。模擬原樣 bytes（0.10.0 差額規則）。批准只附加本錢包簽名 |
| 未簽名 | 批准簽的是 **已寫入當下 CU limit／price** 的交易（每種 Compute Budget 變體最多一條：`SetComputeUnitLimit` disc 2、`SetComputeUnitPrice` disc 3；有則原地取代資料，沒有則插入；禁止 append 第二條同變體）。進來的 message **同 disc 已多於一條** → **不寫入**、交易費卡「無法寫入計算預算」（與封包失敗同一句）。其它 Compute Budget 變體（heap／loaded accounts size）原樣保留。改寫只在 SW：重編 message。靜態 keys **已含** Compute Budget program → 只動 compiled ix，**不**改 keys 序。**尚未含** → program id 加在 **unsigned 非付款人區**（readonly unsigned 即可）；**禁止**放進 `staticAccountKeys[0]` 或任何 signer 槽；維持 `numRequiredSignatures`；加入後重對 compiled ix 的 index。v0 lookups 原樣。插入後超過封包／lookup 組不出 → **不改** `workingTx`，短句「無法寫入計算預算」；批准則簽當下 `workingTx ?? 原始` |
| Phase 1 | 僅為估 CU limit。對 **副本**（**不得**把此副本寫入 `workingTx`）：limit＝1,400,000、price＝0（有則取代、無則插入，慣例最前）。`simulateTransaction` 與 0.10.0 相同參數。**不**用這次結果建 `deltas`／主舞台。成功且有 `unitsConsumed`：建議 limit＝`max(ceil(unitsConsumed×1.10), 原始 SetComputeUnitLimit 若有)`，clamp `[1, 1_400_000]`。失敗／逾時／無 `unitsConsumed`：有原始 limit 指令就用它；否則對 **已插入那兩條 CB 的副本** 的頂層 compiled ix：HOW **builtin 表**內各 3,000、**未列者**各 200,000，加總後建議 limit＝`ceil(sum × 1.25)` 再 clamp `[1, 1_400_000]`（先乘再 clamp，禁止先 clamp 再乘） |
| Phase 1.5 | 建議 limit 如上。CU price 初始＝Settings **Default CU price**（**不是** dApp 原 price）。然後進入 phase 2 |
| Phase 2 | 用當下 limit＋price 寫入後跑 0.10.0 差額模擬（parse pre／post）。這才是預期變動主舞台。**不要**在每個按鍵／`input`／失焦時寫入或模擬。不要把 phase 1 的 max-limit／price 0 當主舞台 |
| 第一次進簽署殼 | 未簽：SW 先 phase 1 再 1.5 再 phase 2（兩次 simulate RPC）。已簽：一次原樣模擬。每次 simulate 等待上限 **15 秒**；phase 1 逾時／rpc 仍用上列 fail 規則出建議 limit 並繼續 phase 2（若 phase 2 也死則預期變動「無法模擬」，費用卡仍可顯示建議值或「估計中」結束後的數字） |
| 批准時機 | 與 0.10.0：模擬中批准可按（`unparseable` 除外）。**CU 兩欄相對已提交值 dirty**（含越界草稿）時批准 **disabled**，點了也不簽。**`workingTx` 尚未寫入成功前**（含整個第一次模擬尚未把建議組合寫入）→ 簽 **原始 payload**。**有 `workingTx` 之後** → 簽該份。以 SW 記憶體為準。已簽路徑 **禁止**寫 `workingTx` |
| 交易費卡 | 預期變動下方、交易明細上方。標題「交易費」＋總費大數字（簽名費＋優先費，SOL）。**明細**預設收合（箭頭列，與交易明細同套可點樣式；hint「簽名費 · CU」）。展開：簽名費、優先費（唯讀）、同一行 **CU limit／CU price 加右側一顆狀態圖示**（兩欄一組，不是兩顆）。已提交：淡勾、disabled、`title`「已套用」。任一欄相對上次提交變 dirty：高對比勾可點、`title`「套用 CU」；點了才把兩欄寫入 ix 並立刻 phase 2。越界／缺欄：維持 dirty，圖示 pending 但 disabled。套用進行中：轉圈、欄位可維持可見。無 cap、「進階」、優先費不可直接編。簽名費＝5,000 lamports × `numRequiredSignatures`。優先費＝`ceil(limit × price / 1_000_000)` lamports（與鏈上進位相同；大於 0 且不足 1 lamport 時為 1）。總費格式同前。**不要**用 `value.fee`。phase 1：總費「估計中」，CU 欄 disabled |
| 交易明細 | 維持 0.10.0 指令列規則（program 熟名／縮寫、HOW 可確定才有 desc、不畫 CPI）。**本版每條 ix 另列**：該 ix 的 **account metas**（公鑰前 4…後 4；lookup 對不出則該列「未解析」）與 **data 連續小寫 hex**（無 `0x`；空 data 寫「（空）」）。不解讀欄位語意（common／IDL 解析見 backlog）。**刪除**明細內「預估手續費／簽名費／優先費」主路徑。費用付款人縮寫可留。`<summary>` 要有箭頭，收合 hint「指令」。密度對齊概念稿（比 0.10.0 略緊） |
| 命令 | 擴充 `ui.simulatePendingTx` payload：`{ requestId: string, cuLimit?: number, cuPrice?: number }`。已簽：忽略 cu、**不**寫 `workingTx`。未簽且 **兩欄都省略**：**僅當該 pending 尚無 `workingTx`** 才跑 phase 1→1.5→2 並在建議組合寫入成功後更新 `workingTx`；**已有 `workingTx`** 卻省略兩欄 → **只**對現有 `workingTx` 做 phase 2（不再 phase 1／1.5、不改 CU）。未簽且 **兩欄都有**：寫入該組合再 phase 2。只給一欄或越界 → `ok: false`、`INVALID_PAYLOAD`。popout 重試與「套用 CU」**必須帶齊已提交的兩欄**（第一次進殼才省略）。同一 `requestId`：SW 每次受理 `ui.simulatePendingTx` 遞增記憶體 `writeSeq`；寫入 `workingTx` 前若已有**更新的 seq 被接受**，本筆 **不得覆寫**。popout 丟棄過期回包（自備遞增 `gen`）。估計中（尚無合法 CU 兩欄）或 CU dirty 時重試 **disabled**。費用卡只用 `sigFeeLamports`／`priorityLamports`／`totalFeeLamports`；**禁止**再用 `feeLamports`／`value.fee`／`getFeeForMessage` 畫手續費。phase 2 **不必**為手續費打 `getFeeForMessage` |
| Default CU price | Settings 樞紐 **第五列**，插在 **API keys 與錢包密碼之間**。標籤 **Default CU price**，子頁單欄整數 micro-lamports／CU，Back 回樞紐。出廠 **25000**。Devnet／Mainnet **同一欄**。寫入 `airwave.settings.v1` 的 `defaultCuPrice`；`normalizeSettings` 缺欄或非有限數則 25000；clamp 到 price 上下界。失焦或 400–800ms debounce 寫入。樞紐摘要顯示該整數 |
| 輸入上下界 | CU limit：整數 **1…1_400_000**。CU price：整數 **0…1_000_000_000**。Default CU price 同 price 界。超出則不採用該次**套用**（維持 dirty、不寫入；command 則 `INVALID_PAYLOAD`）。正在打字不還原欄位 |
| 非目標內的舊 0.10.0 句 | 0.10.0 非目標「改寫 Compute Budget」由 **本版推翻**，僅限未簽＋上述變體 |
| Storage | 不新增獨立 local key；只加 settings 欄。pending／模擬結果仍不進 chrome.storage |
| test-web | 既有簽交易保留。不強制新 Wallet Standard 方法。可用手驗：未簽進審批見交易費卡；改 price 後須點套用，總費才變；dirty 時批准不可按 |

## 非目標

- `signAndSendTransaction`、錢包代廣播
- `connect`／`signMessage` 改版、`solana:signIn`、`signAllTransactions`
- 已簽名交易仍改 Compute Budget
- 可編輯「優先費上限／cap」、把優先費當輸入欄
- 按鍵／失焦自動寫入 CU
- 「進階」收合 CU 欄
- 用 phase 1 餘額差當主舞台
- 動態鏈上估價（`getRecentPrioritizationFees`／Helius priority API）當出廠值
- 改協議基底費數額（5,000 寫死為目前協議；若鏈上改價本版不自動跟）
- Agent、vault KDF、持倉、多語言、Sidebar、storage 世代遷移
- 用模擬取代批准；失敗自動拒絕
- 改 pending 為持久 store、廣播全 tab
- 文件／log／test-web 寫真實密碼、助記詞、私鑰
- 依 Anchor IDL 或 common program layout 解 ix 欄位（見 [backlog/sign-transaction-ix-decode.md](../backlog/sign-transaction-ix-decode.md)）

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.10.0 | 0.11.0 |
|--------|--------|
| 批准不改 instruction | 未簽寫入 CU 再簽；已簽仍不改 |
| 手續費在交易明細 | 獨立交易費卡；明細不再列費 |
| 無 Settings CU | Default CU price 25000 |
| 一次 simulate | 未簽第一次 phase 1＋phase 2 |

## 實作 Track

### Track 1 — Settings Default CU price

- **做：** `Settings.defaultCuPrice`；樞紐列＋子頁；normalize 出廠 25000。
- **不做：** popout CU 寫入。
- **驗收：** `cd wallet && npm run typecheck`；缺欄讀成 25000。

### Track 2 — SW：phase 1／2 與寫入 CU

- **做：** 擴 `ui.simulatePendingTx`；未簽寫入 disc 2／3；已簽忽略 cu；批准用最後成功寫入的 bytes；差額仍 0.10.0 HOW。
- **不做：** popout 視覺精修。
- **驗收：** typecheck；靜態：已簽路徑不 mutate message；未簽兩條同變體最多各一。

### Track 3 — popout 交易費卡與密度

- **做：** 依 HOW／概念稿畫交易費卡與明細收合；刪明細內手續費主路徑；字級略緊；CU 以確認圖示提交後才重模擬。
- **不做：** 重做 signMessage／connect。
- **驗收：** 本檔 checklist 畫面項；`cd wallet && npm run typecheck`。

### Track 4 — build

- **做：** `cd wallet && npm run build`。test-web 既有簽交易仍可用。
- **不做：** 新 Wallet Standard 方法。

## 驗收（出貨 checklist）

- [x] 未簽、可解析：可見交易費總費；明細預設收合；展開可改 limit／price；打字不重模擬；點「套用 CU」後預期變動會重查；dirty 時批准不可按；批准後 dApp 收到的已簽交易含（或已取代）對應 Compute Budget，錢包未廣播
- [x] 已簽（任一槽非空）：CU 欄不可改；批准不增新的第二條 limit／price
- [x] Settings Default CU price 出廠 25000；改了之後新的未簽審批初始 price 用新值
- [x] phase 1 進行中總費「估計中」；批准在 `unparseable` 以外仍可按
- [x] 預期變動仍只信 phase 2 差額；失敗 notice 規則同 0.10.0
- [x] connect／signMessage 維持上一版；pending 不進 storage；結果只回原 tab
- [x] 交易明細展開後，每條 ix 可見帳戶縮寫與 data hex（不解欄位）
- [x] 文件與程式無真實密碼／助記詞／私鑰

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/shared/storage-keys.ts` | `defaultCuPrice` |
| `wallet/src/popup/` Settings 樞紐 | Default CU price 列／子頁 |
| `wallet/src/background/simulate-pending-tx.ts` | phase 1／2、寫入 CB |
| `wallet/src/background/index.ts` | `ui.simulatePendingTx`、`finishSignTransaction` 用已寫入 bytes |
| `wallet/src/shared/commands.ts` | simulate payload 加 cu 欄 |
| `wallet/src/popout/index.html`／`main.ts`／`style.css` | 交易費卡 |
| `docs/design-demos/sign-transaction-cu-budget-ux.html` | 非正式視覺 |
