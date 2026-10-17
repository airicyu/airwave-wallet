# Design review — 0.46.0 Airwave Wallet

- 日期：2026-10-16（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**（初審同日，見歷審摘要）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[how.md](./how.md)、[reasoning.md](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`wallet/src/popup/settings/SettingsScreens.tsx`（`KeysField`）、`TxAiSettingsScreen.tsx`、`settings-logic.ts` 的 `persist*Field`、`StrokeIcon.tsx`（`IconX` 已存在）、`ui-messages.ts`（已有 `common.confirm`／`common.show`／`common.optional`）
- **總評：** 無未關閉 HIGH。H1、M1、M2 已寫進 INDEX（H1、M2 亦在 HOW；M2 亦在驗收）。L1 已寫進錨點。本輪無新的應修 MEDIUM。提案可行。審查門檻通過。

## Findings（本輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH

#### H1 — 讀取未完成時確認空草稿會清掉已存秘密 — **關閉**

初審：進入編輯要等 `wallet.readIntegrationSecrets`，未完成就確認會把空字串送進 `persist*`，清掉已存秘密。

複審：INDEX「進入編輯」已寫死：明文放進草稿之前確認鈕不出現；讀取失敗回到 idle，不呼叫 `persist*`。HOW「列狀態」寫點鉛筆後先唯讀、不畫確認與捨棄，失敗則草稿不建立。與現有 `persist*Field`（trim 後與已存不同即 patch，空字串會覆寫）接得上，競態不再靠實作者猜。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | 關閉 | INDEX「原則檔」已點名出貨時改 `design-principles.md` 第 2 節「單行文字設定」：這三列只在列內確認圖示寫入，失焦與捨棄不寫入；RPC 自訂 URL 仍失焦或短 debounce。第 8 節仍一併改。現檔第 2 節尚未改，屬出貨時動作，不是契約缺口。 |
| M2 | 關閉 | INDEX「失焦與離開」與驗收已寫：編輯中輸入框失焦丟掉草稿、不寫入、回到遮罩。HOW「寫入」寫 `onBlur` 不寫入且離開 `editing`。確認／捨棄造成的失焦在 INDEX 與 HOW 都排除在這條之外。 |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | 關閉 | INDEX 錨點已寫捨棄用既有 `IconX`。HOW 編輯態按鈕表一致。現碼 `StrokeIcon.tsx` 已匯出 `IconX`。 |
| L2 | 非阻擋 | Track 1「做」與 HANDOFF 讀檔順序仍只點名第 8 節。第 2 節的改寫句已在已定案「原則檔」。實作跟已定案即可，不另開產品句。 |

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 三列平時只有顯示與鉛筆；有值時為 `••••••`，看不到確認或捨棄 | 可測 | 無 |
| 點鉛筆後，明文尚未放進草稿前沒有確認鈕；讀取失敗回到遮罩且已存值不變。讀取成功後可改字，並出現確認與捨棄；按下有縮小回饋 | 可測 | 無（H1 已關） |
| 確認後值寫入，離開編輯並回到遮罩；再點顯示看到 trim 後的字 | 可測 | 無 |
| 改字後點捨棄、編輯中讓輸入框失焦、或直接離開該頁：已存值不變，列回到遮罩 | 可測 | 無（M2 已關） |
| 一列編輯中去編另一列：前一列不寫入 | 可測 | 無。同頁只有 Helius／Jupiter；OpenRouter 在另一頁，卸載走捨棄 |
| `cd wallet && npm run typecheck` | 可測 | 無 |
| 未封裝擴充走 API keys 頁與交易 AI 設定頁各一輪 | 可測 | 無 |

## 與現碼抽樣

現碼尚未做本版，這不是設計 HIGH。

- `KeysField` 與 OpenRouter 列現為眼睛加常駐確認；`onBlur` 與空字串 `onChange` 會 `persist*`。本版要求刪掉這兩條寫入，是要改的行為，與提案不互斥。
- `persist*Field` 仍 trim、與已存相同則回 `false`、遮罩字串不當成新值。INDEX 聲明不改這些語意。把草稿清空再確認會依既有函式寫成空字串；本版刪的是「清除圖示立刻寫空」，不是禁止確認空草稿。
- 秘密仍經既有 `patchSettingsPartial` 與 `wallet.readIntegrationSecrets`。草稿不進持久 Zustand。不改 pending、不廣播、不改 vault、不宣告新的 Wallet Standard 方法。
- `common.edit` 與 `common.discard` 尚未在 `ui-messages.ts`，屬本版要加的文案，不是衝突。
- 0.45.0 是 Wallet Standard icon，與本版三列操作無交集。本版沒有獨立 backlog 檔；未把未排程構想當成已定案。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | 關閉 | INDEX「進入編輯」；HOW「列狀態」 |
| M1 | MEDIUM | 關閉 | INDEX「原則檔」 |
| M2 | MEDIUM | 關閉 | INDEX「失焦與離開」與驗收；HOW「寫入」 |
| L1 | LOW | 關閉 | INDEX 錨點 `StrokeIcon.tsx`；HOW「按鈕」 |
| L2 | LOW | 非阻擋 | — |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-16 | 方向可行。H1 未關閉，門檻未過，不開工。 |
| 第 2 輪複審 | 2026-10-16 | H1、M1、M2、L1 已寫入契約。無未關閉 HIGH。門檻通過。提案可行。 |
