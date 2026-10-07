# Design review — 0.19.0 Airwave Wallet

- 日期：2026-10-07（Asia/Hong_Kong）
- 輪次：**第 3 輪複審**（初審、第 2 輪同日）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收（狀態 `planned`）；[`ix-decode-how.md`](./ix-decode-how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 上游：[`../../0.18.0/INDEX.md`](../../0.18.0/INDEX.md)（本版不改 Home Activity）；明細／CU：[`../../0.11.0/INDEX.md`](../../0.11.0/INDEX.md)；差額：[`../../0.10.0/docs/sign-transaction-how.md`](../../0.10.0/docs/sign-transaction-how.md)；共用殼：[`../../0.17.0/INDEX.md`](../../0.17.0/INDEX.md)
- 構想（非本版契約）：[`../../backlog/sign-transaction-ix-decode.md`](../../backlog/sign-transaction-ix-decode.md)（靜態層已排進本版；Anchor IDL 仍未排）
- 畫面：[`../../../design-demos/sign-transaction-ix-decode-ux.html`](../../../design-demos/sign-transaction-ix-decode-ux.html)（INDEX 點名；欄位／URL 以 INDEX 為準）
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`wallet/src/shared/simulate-pending-tx-types.ts`、`wallet/src/background/simulate/simulate-pending-tx.ts`、`wallet/src/approval/shell.ts`、`wallet/src/popout/style.css`、`wallet/src/popup/style.css`（現碼未實作本版 ≠ 設計 HIGH）
- **總評：** 無未關閉 HIGH。H1、M1–M7 已寫進現 INDEX／HOW（HANDOFF 對 M7 僅複述 `dataHex`，見 L9）。應修 MEDIUM：**無**。待拍板為空。審查門檻**通過**。提案可行。本檔不是已定案。

## Findings（累加；穩定 ID 勿重編）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH

#### H1 — hex 路徑是否仍帶 `desc`：HOW「現況」與 INDEX「不要半套」分叉 — **關閉**

**初審：** INDEX 靜態名單要求長度不吻合走 hex、不要半套；當時 HOW 寫「現況」易沿用 0.11.0 寬鬆 `instructionDesc`（只看首 byte）在 hex 列上畫指令名。

**第 2／3 輪：** INDEX「半套禁止」：僅 `decoded === true` 才填 `name`／`fields`；hex 不填 `name`／`desc`、不設 `decoded`；舊 `instructionDesc` 不得當本版解讀成功、不得畫在 hex 列；UI 見非 `decoded` 忽略 `desc`。HOW `instructions[]` 同句；HANDOFF／paste-ready「hex 路徑禁止 name／desc」。分叉仍消除。現碼 `instructionDesc` 仍寬鬆、`renderTxDetails` 仍見 `desc` 就畫——屬 Track 應改掉的現行行為，不是契約 HIGH。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | **關閉** | INDEX 驗收「Track 1 純函式對 HOW 向量」；Track 1 點名 CB 兩變體、Token TransferChecked、ATA、Memo UTF-8、長度不吻合、帳戶不足、Memo 非 UTF-8；HOW「測試向量」。明示本版不引入測試 runner。殘差見 L7。 |
| M2 | **關閉** | INDEX「已解則 SW 省略 `dataHex`…」；HOW 吻合路徑省略 `dataHex`；Track 1 驗收「已解省略 `dataHex` 且 `decoded === true`」；HANDOFF「已解省略 dataHex」。 |
| M3 | **關閉** | HOW Memo「畫面**單行 ellipsis**」，與 INDEX 對齊。 |
| M4 | **關閉** | INDEX 變體：只看 compiled ix 的 data 長度與 disc；不要讀 mint／token account 的 TLV／extensions；多簽多出來的標籤 `帳戶`。 |
| M5 | **關閉** | INDEX 開頁：CU dirty 時 Explorer 仍可用，打開上次模擬的 `inspectorUrl`（`workingTx ?? 原始`，不是 CU 草稿）。HOW／HANDOFF 同句。 |
| M6 | **關閉** | HOW：`ok`／`fail`／`rpc` 只要 deserialize 成功就附 `inspectorUrl`。INDEX Track 1 與 HANDOFF 同。 |
| M7 | **關閉** | 第 2 輪擇一已寫死兩邊：INDEX「一條長什麼樣」已解則 SW 省略 `dataHex` **與 `accounts`**，UI 亦不畫 hex、不畫帳戶縮寫清單（雙保險）。HOW `instructions[]`：吻合省略 `accounts`；UI 見 `decoded` 不畫 `accounts` 清單。INDEX「命令」與 HANDOFF starter 仍只寫省略 `dataHex`（L9）；不推翻「一條長什麼樣」／HOW。現碼 `buildInstructions` 一律填 `accounts`、`renderTxDetails` 有就畫 `<ul>`——Track 應改掉。 |

本輪無新增 MEDIUM。

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **關閉** | INDEX：`decoded` 只在成功時設 `true`，未解省略該欄。HOW Result 為 `decoded?: true`。 |
| L2 | 仍開，非阻擋 | ATA Create 與 CreateIdempotent 指令名皆「建立關聯代幣帳戶」。無法從名稱區分 idempotent。INDEX 沿用既有短句。 |
| L3 | **關閉** | HOW：角色寫在 `fields.label`，不要另做 `accounts.role`；Result `accounts` 僅 `short`／`unresolved`。 |
| L4 | **關閉** | HOW：`fields` 的 `value` 一律可用 monospace。 |
| L5 | **關閉** | INDEX「鈕的樣子」：頂欄複製與全域 `.icon-btn` 不要改成預期變動那套；錨點 `popout/style.css`（popup 若共用則一併）。HOW：不要改全域 `.icon-btn` 或頂欄複製。 |
| L6 | **關閉** | INDEX 數字／HOW Token `數量`：最小單位整數字串，不除 decimals。現碼 `formatAmount` 僅差額用；實作勿重用填 ix 欄。 |
| L7 | 仍開，非阻擋 | HOW 向量／INDEX 驗收未單列 Token Transfer（u8＝3、9 bytes）、ATA `[1]`、Token-2022 同分身。布局與已列向量相同。實作表須含；審查可靜態對照。 |
| L8 | 仍開，非阻擋 | 概念稿未知 program 列畫了 `.ix-name` 縮寫。INDEX／HOW：未解**無指令名**，只畫 program、帳戶縮寫、hex。衝突以 INDEX 為準。 |
| L9 | 仍開，非阻擋 | INDEX「命令」與 HANDOFF paste-ready 未複述「已解省略 `accounts`」。契約以 INDEX「一條長什麼樣」與 HOW 為準。規劃可選補一句，不擋開工。 |
| L10 | 仍開，非阻擋 | 已解列若仍設 instruction 級 `unresolved`，現碼會另畫「帳戶未解析」。INDEX 已規定對不出的帳戶值為「未解析」（寫在欄位）。實作見 `decoded` 勿再畫那句即可；未寫死不擋主路徑。 |

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 未簽可解析 System Transfer：展開見「轉移 SOL」與來源／收款／lamports，該條無 hex、無舊 `desc` 半套 | 可測 | H1／M2／M7 已關：無 hex、無半套 `desc`、無帳戶縮寫清單 |
| Track 1 純函式對 HOW 向量：CB limit／price、Token TransferChecked、ATA Create、Memo UTF-8 為 `decoded`；過長過短、帳戶不足、Memo 非 UTF-8 為 hex 且無 `name` | 可測（靜態對照；無測試 runner） | L7：未單列 Token Transfer／ATA `[1]`／Token-2022 |
| 未知 program：帳戶縮寫＋hex、無指令名；非 `unparseable` 仍可批准 | 可測 | L8：勿抄概念稿未知列的 `.ix-name` |
| 預期變動列重試＋Explorer（34px、Explorer accent）；點開 `https://explorer.solana.com/tx/inspector` 且含 `message=` | 可測；manifest 已有 `tabs` | 概念稿有 `<a href>`；INDEX 以 `chrome.tabs.create`＋前綴檢查為準；HOW 允許 `<a>`＋`preventDefault` 後 create |
| `cluster`：devnet→`devnet`，否則 `mainnet-beta`；URL 不含自訂 RPC | 可測（`Cluster` 僅 `devnet`／`mainnet`） | 與 reasoning 否決 `customUrl` 一致 |
| 套用 CU 成功後 Inspector 反映 `workingTx` | 可測 | M5 已關：dirty 未套用仍開上次 URL |
| `unparseable`：不畫 Explorer；批准 disabled | 可測 | M6 已關：`rpc`／`fail` 已 deserialize 仍附 URL |
| `signAndSendTransaction` 與 `walletSend` 同一套明細與鈕；connect／signMessage 不變 | 可測；現碼三 kind 已共用殼與 `ui.simulatePendingTx` | 樣式須同時作用於 popup（walletSend）與 popout |
| 未加套件；解讀不進 `chrome.storage` | 可測 | 無 |
| `cd wallet && npm run typecheck` 與 `npm run build` | 可測 | 無 |
| test-web 手驗可解析交易＋Explorer | 可測（不強制新按鈕） | 無 |
| 文件與程式無真實密碼／助記詞／私鑰 | 本審查未見違規 | 無 |

待拍板欄＝空。GUIDELINES：pending 僅 SW、popout 只帶 `requestId`、結果只回原 tab、禁止手寫 rehydrate 當主同步、pending 不進持久 Zustand、無硬編碼密碼、inject 不持長期私鑰、不宣告未實作 Wallet Standard 方法——INDEX／HOW／HANDOFF **未推翻**。解讀與 `inspectorUrl` 明確不寫 storage、不新增 command、UI 不組 message bytes、不宣告新 Wallet Standard 方法。

## 與現碼抽樣

現碼未做本版 ≠ 設計 HIGH。下列為**現行行為與提案互斥**（Track 應改掉）。不要把 backlog 或 Solibra 當成現行程式。

| 現碼 | 0.19.0 提案 |
|------|-------------|
| `SimulateTxInstruction` 僅 `program`／`desc`／`accounts`／`dataHex`；無 `inspectorUrl` | 可加 `name`、`fields`、`decoded?: true`、`inspectorUrl`；未解省略 `decoded`／`name`；已解省略 `dataHex` 與 `accounts` |
| `buildInstructions`：一律 hex；`instructionDesc` 寬鬆（System 只看 `data[0]`） | 變體表精確長度＋ disc 才 `decoded`；hex 不填 `name`／`desc` |
| `renderTxDetails`：有 `desc` 就畫；永遠畫 `dataHex` 或「（空）」；永遠畫 `accounts` ul；有 `unresolved` 另畫「帳戶未解析」 | `decoded` 畫鍵值、忽略 `desc`、不畫該條 hex、不畫帳戶縮寫清單；對不出寫在 `fields` 值「未解析」 |
| `renderDeltaCard`：`delta-card-head` 旁一顆透明 32px `.icon-btn` 重試 | HOW `.sim-head`／`.sim-tools` 34px 有底有框；右 Explorer accent；`chrome.tabs.create` |
| 頂欄複製為 `.copy-btn` 或 `.icon-btn.ghost-inline` | **不要**改成預期變動那套 |
| popup 先載 `popout/style.css` 再載 `popup/style.css` 全域 `.icon-btn` | 工具鈕樣式只掛 `.sim-tools` |
| `formatAmount` 用 decimals 做差額顯示 | ix `數量` 為最小單位整數字串，不除 decimals |
| `bytesToBase64` 已在 `simulate-pending-tx.ts` | HOW 允許沿用組 Inspector `message` |
| `runPhase2Simulation`：`unparseable` 無 URL；`rpc`／`fail` 仍可有 `instructions` | 已 deserialize 則附 `inspectorUrl`（含 RPC 失敗） |
| `workingTx` 為 SW 記憶體 `Uint8Array`，不進 storage | 解讀／URL 用 `workingTx ?? 原始`；不新增 storage key |
| `ui.simulatePendingTx` 已接受三 kind | 與 INDEX「哪些審批」一致 |
| manifest `permissions` 含 `tabs` | 與 `chrome.tabs.create` 可調和 |

與提案**不互斥**（維持）：pending Map、結果回發起 tab、模擬不 persist、批准閘仍只看 `unparseable`／CU dirty／hold。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | 關閉 | INDEX 半套禁止；HOW `instructions[]`；HANDOFF paste-ready |
| M1 | MEDIUM | 關閉 | INDEX 驗收 Track 1 向量句；Track 1 做；HOW 測試向量 |
| M2 | MEDIUM | 關閉 | INDEX 一條長什麼樣／命令／Track 1；HOW 吻合路徑 |
| M3 | MEDIUM | 關閉 | HOW 變體表 Memo |
| M4 | MEDIUM | 關閉 | INDEX 變體 |
| M5 | MEDIUM | 關閉 | INDEX 開頁；HOW `inspectorUrl`／CU dirty |
| M6 | MEDIUM | 關閉 | HOW `inspectorUrl`；INDEX Track 1；HANDOFF |
| M7 | MEDIUM | 關閉 | INDEX 一條長什麼樣；HOW `instructions[]`／UI（命令／HANDOFF 未複述 → L9） |
| L1 | LOW | 關閉 | INDEX 命令 |
| L2 | LOW | 仍開，非阻擋 | INDEX 一條長什麼樣（沿用短句） |
| L3 | LOW | 關閉 | HOW Result 形狀 |
| L4 | LOW | 關閉 | HOW Result 形狀 |
| L5 | LOW | 關閉 | INDEX 鈕的樣子／錨點；HOW 畫面 |
| L6 | LOW | 關閉 | INDEX 數字；HOW Token `數量` |
| L7 | LOW | 仍開，非阻擋 | （可選：HOW 向量補列） |
| L8 | LOW | 仍開，非阻擋 | INDEX 已寫死無指令名；實作勿抄概念稿 |
| L9 | LOW | 仍開，非阻擋 | INDEX 命令／HANDOFF 未複述已解省略 `accounts` |
| L10 | LOW | 仍開，非阻擋 | 已解勿沿用「帳戶未解析」旁註 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-07 | 提案可行。未關閉 HIGH：H1。應修 M1–M6。門檻未通過。 |
| 第 2 輪複審 | 2026-10-07 | 對照現 INDEX。H1、M1–M6 關閉。無未關閉 HIGH。應修 M7。門檻通過。非整份不可行。 |
| 第 3 輪複審 | 2026-10-07 | 對照現 INDEX。H1、M1–M7 關閉。無未關閉 HIGH。應修 MEDIUM：無。門檻通過。非整份不可行。 |
