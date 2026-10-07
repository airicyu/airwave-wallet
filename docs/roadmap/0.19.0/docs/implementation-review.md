# Implementation review — 0.19.0 靜態指令解讀與 Explorer Inspector

- 日期：2026-10-07（Asia/Hong_Kong）
- 輪次：**初審**
- 角色：實作審查（不改程式、不改 INDEX／HOW、不 commit）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收
- HOW／HANDOFF：[`ix-decode-how.md`](./ix-decode-how.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 對照範圍：**未提交** working tree（`git status`／`git diff`；含 `docs/roadmap/0.19.0/`、`wallet/src/background/simulate/decode-compiled-ix.ts`、simulate／approval／types／popout 樣式與相關 roadmap 索引）
- 現行程式抽樣（磁碟）：`wallet/src/background/simulate/decode-compiled-ix.ts`、`wallet/src/background/simulate/simulate-pending-tx.ts`、`wallet/src/background/simulate/sign-tx-simulate.ts`、`wallet/src/background/handlers/ui-handlers.ts`、`wallet/src/shared/simulate-pending-tx-types.ts`、`wallet/src/approval/shell.ts`、`wallet/src/popout/style.css`
- **總評：** 無未關閉 HIGH。Track 1–3 靜態對照 INDEX／HOW 主路徑成立；`typecheck`／`build` 通過。出貨前須對齊 `package.json`／manifest／`changelog.md`（見 L1）與瀏覽器手驗（見 M1）。

## Findings（本輪）

關閉＝對照 INDEX／磁碟已滿足；仍開＝實作相對契約仍缺或未驗。穩定 ID 本檔內不重編號。

### HIGH

（無）

未發現：UI 自行 serialize message 或組 Explorer query、解讀離開 SW、hex 路徑填 `name`／`desc`、沿用 0.11.0 寬鬆 `instructionDesc`、已解仍附 `dataHex`／`accounts`、解讀寫入 `chrome.storage`、pending 改 storage hydrate、新增 npm 依賴、把 RPC／`customUrl` 塞進 Inspector URL。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | **仍開** | INDEX 驗收「手驗：test-web 簽一筆可解析交易…Explorer 能打開 Inspector」及多項 UI 行為（System Transfer 明細、CU 套用後 Inspector、devnet `cluster`）未在本 agent 環境執行 Chrome 擴充手驗。 |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **關閉** | `version.md`、`wallet/package.json`、`manifest.config.ts`、`changelog.md` 已對齊 `0.19.0`。 |
| L2 | **非阻擋** | INDEX Track 1 明示本版**不引入測試 runner**；HOW 測試向量僅能靜態對照 `decodeCompiledIx`（見下節），無整包自動化測試指令。 |

## HOW 測試向量 — 靜態對照 `decode-compiled-ix.ts`

對 [`decodeCompiledIx`](../../../../wallet/src/background/simulate/decode-compiled-ix.ts) 邏輯與 [`ix-decode-how.md`](./ix-decode-how.md)「測試向量」逐條核對（假帳戶索引長度滿足表上最低數量；program id 用 HOW 字串）。**無** `npm test`／`bun test` 執行證據。

| 向量 | 預期 | 靜態結論 | 程式依據 |
|------|------|----------|----------|
| System Transfer：12 bytes、u32 disc＝2 | `decoded: true`，`name`「轉移 SOL」 | **通過** | `data.length === 12`、`readU32LE === 2`、≥2 帳戶 |
| System：同 disc 但 11 或 13 bytes | hex（`decoded: false`） | **通過** | 開頭 `data.length !== 12` → false |
| CB：`data[0]===2` 且長度 5 | decoded「設定計算單位上限」 | **通過** | L83–89 |
| CB：`data[0]===3` 且長度 9 | decoded「設定優先費單價」 | **通過** | L91–97 |
| CB：disc 2 但長度 9 | hex | **通過** | 長度 5 分支不匹配；長度 9 且 `[0]===3` 不匹配 → false |
| Token TransferChecked：10 bytes、disc 12 | decoded | **通過** | L115–128，≥4 帳戶 |
| ATA：`data` 為 `[0]` 或 `[1]`、≥4 帳戶 | decoded「建立關聯代幣帳戶」 | **通過** | L133–144 |
| ATA：僅 2 個帳戶 | hex | **通過** | `accountKeyIndexes.length < 4` |
| Memo：合法 UTF-8 payload | decoded「Memo」＋`內容` | **通過** | `TextDecoder` fatal |
| Memo：單 byte `0xff` | hex | **通過** | decode catch → false |
| 未知 program id | hex、無 `name` | **通過** | 末行 `{ decoded: false }`；`buildInstructions` hex 分支不填 `name` |

`buildInstructions` 整合：已解只 push `program`／`name`／`decoded: true`／`fields`；hex 只 push `program`／`accounts`／`dataHex`（L165–181）。`instructionDesc` 已自 simulate 目錄移除（grep 無匹配）。

## 驗收對照

| INDEX 驗收句 | 通過／失敗 | 證據 |
|--------------|------------|------|
| 未簽可解析 System Transfer：明細「轉移 SOL」、lamports、無 hex／半套 `desc` | **通過**（靜態）／**手驗未做** | SW 解碼＋UI `ix.decoded === true` 分支不畫 hex；無 `desc` 渲染 |
| Track 1 純函式對 HOW 向量 | **通過**（靜態） | 上表；**無整包測試指令** |
| 未知 program：帳戶縮寫＋ hex、無指令名；批准仍可按 | **通過**（靜態）／**手驗未做** | hex 分支；批准邏輯未因 `decoded` 改動（沿用 `unparseable`／CU） |
| 預期變動列重試＋Explorer（34px、Explorer accent）；URL 前綴與 `message=` | **通過**（靜態）／**手驗未做** | `shell.ts` `.sim-tools`、`validInspectorUrl`、`chrome.tabs.create`；`buildInspectorUrl` 含 `encodeURIComponent(b64)` |
| `cluster`：devnet／mainnet-beta；URL 不含自訂 RPC | **通過**（靜態） | `buildInspectorUrl` L143–146；`ui-handlers` 傳 `settings.cluster` |
| CU 套用後 Inspector 反映 `workingTx` message | **通過**（靜態）／**手驗未做** | `sign-tx-simulate.ts` `getWorkingTx`／`tryCommitWorkingTx` 後以 `working` bytes 跑 `runPhase2WithFees` → 同一 message 建 instructions＋URL |
| `unparseable`：不畫 Explorer；批准 disabled | **通過**（靜態） | SW 不附 URL；`validInspectorUrl`；既有 approve gating |
| `signAndSendTransaction`／`walletSend` 同殼；connect／signMessage 不變 | **通過**（靜態） | `ui-handlers` kind 白名單；`mountApprovalShell` popup＋popout 共用 |
| 未加套件；解讀不進 `chrome.storage` | **通過**（靜態） | `package.json` dependencies 未增；無新 storage key |
| `cd wallet && npm run typecheck` 與 `npm run build` | **通過** | 見「測試結果」 |
| 手驗 test-web | **未驗** | M1 |
| 文件與程式無真實密碼／助記詞／私鑰 | **通過**（抽樣） | 已讀契約與 diff 相關檔；本報告未貼秘密 |

## 測試結果

指令（INDEX Track 3）：`cd wallet && npm run typecheck`、`npm run build`。

| 指令 | 結果 |
|------|------|
| `npm run typecheck` | 通過（`tsc --noEmit`，exit 0） |
| `npm run build` | 通過（`tsc --noEmit && vite build`，Vite 6.4.3，240 modules，約 1.70s，exit 0） |

**整包測試：** 倉庫／INDEX **未**定義 0.19.0 專用 `npm test`；Track 1 明示不引入 runner。除上列 typecheck／build 外，驗收項以靜態對照與（未執行之）瀏覽器手驗為準。

## 重點核對（對照 INDEX／HOW）

| 項 | 結論 |
|----|------|
| 解讀只在 SW | `decodeCompiledIx`＋`buildInstructions` 僅在 `simulate-pending-tx.ts` |
| `inspectorUrl` 與 `instructions` 同源 message | `withInspector`／`runPhase2Simulation` 同一 `message` |
| `fail`／`rpc` 仍可 serialize 則附 URL | `withInspector(..., message, cluster)` 於 rpc／fail 分支 |
| `unparseable` 無 URL | early return 不呼叫 `withInspector` |
| 數字：ix data 用 `DataView`／`BigInt` | `readU64LE`、lamports／amount `toString()` |
| UI 忽略非 `decoded` 的 `desc` | `renderTxDetails` 不讀 `ix.desc` |
| CU dirty：Explorer 仍可用、重試 disabled | `retry.disabled` 含 `cuDirty`；Explorer 無 disabled |
| 樣式僅 `.sim-tools` | `popout/style.css` L517–554；popup `main.tsx` 匯入 `../popout/style.css` |
| Explorer 點擊 | `preventDefault`＋`chrome.tabs.create` |
| 半套禁止 | 無寬鬆首 byte 指令名；hex 無 `name` |

## 修復追蹤

| ID | 建議 |
|----|------|
| M1 | 出貨前以 test-web 手驗 INDEX checklist（含 Explorer 新分頁、devnet cluster、可解析明細）。 |
| L1 | 出貨時同步 `wallet/package.json`、`manifest.config.ts`、`version.md`、`changelog.md` 至 0.19.0。 |
