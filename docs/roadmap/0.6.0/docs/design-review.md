# Design review — 0.6.0 Airwave Wallet

- 日期：2026-10-03（Asia/Hong_Kong）
- 輪次：**第 3 輪複審**
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`seed-import-how.md`](./seed-import-how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 上游（行為仍有效、非本版契約全文）：[`../../0.5.0/INDEX.md`](../../0.5.0/INDEX.md)；[`../../0.1.0/docs/storage-custody-how.md`](../../0.1.0/docs/storage-custody-how.md)、[`../../0.2.0/docs/accounts-home-how.md`](../../0.2.0/docs/accounts-home-how.md)
- 相關 backlog：本版 INDEX **未**掛 backlog 列。`docs/roadmap/backlog/` 現存項**僅構想**，不得當 0.6.0 契約。
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 畫面（INDEX 沉默才補）：[`../../../design-principles.md`](../../../design-principles.md)；概念稿 [`../../../design-demos/add-account-ux.html`](../../../design-demos/add-account-ux.html) **非正式契約**
- 現行程式抽樣：`wallet/src/shared/commands.ts`、`wallet/src/shared/seed-derive.ts`、`wallet/src/background/index.ts`、`wallet/src/popup/`（現碼已有切片 ≠ 設計通過；現碼未對齊 ≠ 設計 HIGH）
- **總評：** 無未關閉 HIGH。M1–M8 已同意並寫進 INDEX／HOW（HANDOFF 不互斥）。僅 L2／L3 仍開且標非阻擋。**本輪設計門檻通過。** 主路徑可行，與 pending／custody／storage 禁區無互斥。本檔不是已定案。

## Findings（第 3 輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉或缺口；非阻擋＝記錄即可。穩定 ID 勿重編。

### HIGH

（無）

未發現：pending 改走 storage hydrate、結果預設廣播、手寫 rehydrate 當主同步、硬編碼密碼、助記詞長期 persist、inject 持長期私鑰、宣告未實作 Wallet Standard 方法、或 INDEX↔HOW 互斥到主路徑不可用。

### MEDIUM

#### M1 — 12／24 詞格切換與貼上未寫死 — **關閉**

已寫進 INDEX UI 與 HOW Popup：預設 12 格；可貼完整片語（空白切開、小寫）；已填 12 後再於末格輸入／貼上則擴成 24；「下一步」僅格數 12 或 24 可點；詞數不對不送 preview；checksum／詞表只在 SW `validateMnemonic`。

#### M2 — 預設 `pathKind` 未定案 — **關閉**

INDEX 已定案：進入挑帳戶屏與第一次 preview 預設 `pathKind`＝`phantom`。HOW／HANDOFF／reasoning 一致。

#### M3 — 錯誤、忙碌、過期預覽未寫 — **關閉**

HOW Popup §4–5：連發只採較新回應；忙碌主鈕 disabled、允許切方案；可顯示「讀取中」；錯誤短句在當屏；`INVALID_PATH` 列清空且不可匯入、不是各列 `"—"`；`INVALID_MNEMONIC` 留詞格屏；`WALLET_LOCKED` 走鎖屏、toast 不得含助記詞原文。INDEX UI 與 HANDOFF Track 2 已對齊。

#### M4 — HOW 漏重述 INDEX 已定案的實作細節 — **關閉**

HOW commands：`getBalance` 並行上限 4；助記詞禁 `chrome.storage` **且**禁 `console`／擴充 log。HOW Popup：Back 到匯入方法清詞；關掉 popup（卸載腳本）丟掉助記詞記憶體。INDEX 助記詞生命列仍完整。

#### M5 — 方案短標易讀成五項 — **關閉**

INDEX／HOW：四鈕，標準＝`phantom`、CLI／Ledger＝`cli`、Change＝`change`、自訂＝`custom`；明文沒有第五種 path。

#### M6 — HANDOFF starter 低於工作流門檻 — **關閉**

HANDOFF 讀檔順序與 paste-ready 含：只認檔案、AGENTS／GUIDELINES／HANDOFF／INDEX＋連結、跟 Track、禁非目標、不改 `../solibra-wallet`、INDEX 沉默仍守禁區、概念稿非正式契約且自訂必須含字面 `{n}`。

#### M7 — `importSeedAccount` 的 `label` 與設為作用中未對齊 — **關閉**

INDEX／HOW：省略 `label` → `Imported ${寫入前 accounts.length + 1}`；成功後不改 `activeAccountId`／不呼叫 `setActiveAccount`。HANDOFF 產品摘要重述。

#### M8 — 自訂 path「預設模板」未寫死 — **關閉**

第 3 輪核對：INDEX UI 完整句子寫死自訂 path 輸入的**初始與重置**字串皆為 `m/44'/501'/{n}'/0'`（與 phantom 模板相同，含字面 `{n}`）。HOW Popup：詞格→`add-import` 時重置為同一字串；進入挑帳戶屏且使用者尚未改過自訂字串時，初始值同此字串。與 `{n}` 合法性、`INVALID_PATH` 判定不互斥。HANDOFF 未另寫 competing 預設。現碼預填同字串僅為對齊證據，關閉依據是契約句子。

### LOW

#### L1 — `pathPreview` 一句內兩種顯示 — **關閉**

HOW：`pathPreview`＝該 `pathKind` 的模板字串；`custom` 用 trim 後使用者字串；字面 `{n}` 不替換成數字。INDEX UI 同義。

#### L2 — 概念稿文案過時 — **仍開（非阻擋）**

`add-account-ux.html` 仍寫助記詞「尚未實作」。非正式契約；reasoning 已標非阻擋、不改產品句。勿把它當範圍。

#### L3 — INDEX 狀態已是 `in progress` — **仍開（非阻擋）**

複審時 INDEX 狀態仍為 `in progress`。程序記錄；reasoning 已標非阻擋。

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 12 或 24 英文有效助記詞可預覽 20 列（前4後4） | 是 | M1 已關 |
| 切 phantom／cli／change 列公鑰會變 | 是 | M2 已關 |
| 自訂無 `{n}` → 短錯誤、不匯入 | 是 | M3 已關；M8 已關（初始／重置為含 `{n}` 的 phantom 模板） |
| 選一列匯入後 Accounts 出現 signing；vault 可簽 | 是 | M7 已關 |
| 助記詞不進 storage（vault 以外抽樣） | 是 | M4 已關 |
| 主按鈕貼殼底 | 是 | 對齊 design-principles §1；INDEX 明文 |
| `cd wallet && npm run build` | 是（出貨時） | 無 |

非目標與 0.5.0「本版不做助記詞」：本版 INDEX／reasoning 已明示推翻該非目標、不改 Combined 契約。密鑰匯入語意本版不改。

## 與現碼抽樣

現碼已有 preview／import seed **≠** 設計審查通過，亦 **≠** 設計 HIGH。抽樣只問提案是否與必須保留的架構互斥。

| 錨點 | 現行（抽樣） | 與 0.6.0 提案 |
|------|----------------|----------------|
| `commands.ts` | typed `ExtensionRequest`＋`requestId`；已列 preview／import seed | 提案為 popup→SW command，**不是** dApp pending |
| `background/index.ts` | pending `Map`；結果回發起方；seed commands 解鎖後寫 secrets＋meta | 未提議 persist pending、全 tab 廣播、硬編碼密碼；助記詞僅 payload |
| `seed-derive.ts` | English `validateMnemonic`、四 `pathKind`、`{n}` 才合法 custom | 與 HOW 模板一致 |
| `popup/` | `onChanged` 鏡像；seed 走 `sendExtensionRequest`；自訂 path 變數預填 phantom 模板 | 符合持久配置禁區；預填字串與已關 M8 契約同字串，**不是**架構 HIGH |
| inject／WS 能力表 | 本版未要求新方法 | 禁區 6：不要為助記詞匯入宣告未做的 Standard 方法 |

未把 `brainstorm/` 或 `../solibra-wallet` 當已定案。預覽並行 `getBalance`（上限 4）與 0.5.0「禁止平行打 DAS」不是同一條契約。

## 修復追蹤表

| ID | 級 | 第 3 輪 | 建議落點（審查提議，非定案） |
|----|----|---------|------------------------------|
| M1 | MEDIUM | 關閉 | HOW／INDEX 已寫詞格 |
| M2 | MEDIUM | 關閉 | 預設 `phantom` |
| M3 | MEDIUM | 關閉 | HOW 錯誤／忙碌／過期 |
| M4 | MEDIUM | 關閉 | HOW 並行 4、清詞、禁 log |
| M5 | MEDIUM | 關閉 | 四鈕標籤表 |
| M6 | MEDIUM | 關閉 | HANDOFF starter |
| M7 | MEDIUM | 關閉 | label 省略與不切 active |
| M8 | MEDIUM | 關閉 | INDEX UI＋HOW Popup：初始／重置＝`m/44'/501'/{n}'/0'` |
| L1 | LOW | 關閉 | HOW `pathPreview` 一句 |
| L2 | LOW | 仍開（非阻擋） | 概念稿備註 |
| L3 | LOW | 仍開（非阻擋） | 程序 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-03 | 可行；0 HIGH；M1–M7 仍開應修；L1–L3 非阻擋 |
| 第 2 輪複審 | 2026-10-03 | 0 HIGH；M1–M7、L1 關閉（已入契約）；**M8 仍開應修**；L2／L3 非阻擋；**門檻不通過** |
| 第 3 輪複審 | 2026-10-03 | 0 HIGH；M1–M8、L1 關閉；L2／L3 非阻擋；**設計門檻通過** |

隱私：本報告未寫入助記詞、私鑰、密碼、個人地址或生產秘密。
