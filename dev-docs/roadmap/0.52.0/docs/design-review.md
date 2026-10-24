# Design review — 0.52.0 Airwave Wallet

- 日期：2026-10-24（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**（初審同日，見歷審摘要）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md) §4、§8
- 構想（非契約）：[`../../backlog/add-account-chooser-ui.md`](../../backlog/add-account-chooser-ui.md)、[`../../../design-demos/0.52.0/add-account-chooser-ux.html`](../../../design-demos/0.52.0/add-account-chooser-ux.html)
- 現行程式抽樣：`wallet/src/popup/onboarding/add-chooser.tsx`、`wallet/src/popup/components/StrokeIcon.tsx`、`wallet/src/shared/i18n/ui-messages.ts`、`wallet/src/popup/styles/onboarding.css`（樣式錨點）
- **總評：** 無未關閉 HIGH，無未關閉 MEDIUM。審查門檻通過，可以開工。提案可行。

## 承重決策

`reasoning.md` 寫明要出貨的是示範稿那一列（圖示＋標題＋一行說明），popup 與 sidebar 共用同一份清單，不另做密度。既有 `IconEye`、`IconLayers` 沿用；seed、burner、import 三個字形新增並留在 `StrokeIcon`。副標進目錄，建立流程、匯入子選單與指令不動。未排進本版的 Debug mode 與 Helius 文案維持 unversioned。已捨棄的做法（第二套密度、把副標寫死在 JSX、改下游表單）都有對應句子。INDEX「Still to decide」為空。第 2 輪重讀後，這組句子仍與 INDEX Decided、Out of scope、HOW 一致。

## Findings（本輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH

（無）

本版不新增指令、storage key、權限或 pending。持久狀態、custody、訊息路由都沒有被本契約改寫。現碼仍是標題加 chevron，屬尚未實作，不是設計 HIGH。

### MEDIUM

| ID | 狀態 | 依據 |
|----|------|------|
| M1 | **關閉**（第 2 輪） | 初審時 [`how.md`](./how.md) Styles 寫 subtitle「2px above the title line」，與 INDEX「先標題、再一行副標」以及示範稿 `.s { margin-top: 2px }` 相反。第 2 輪 HOW Styles 已改為「Subtitle: 12px, `var(--text-muted)`, 2px below the title」。標題在上、副標在下、間距 2px，與示範稿一致。 |
| M2 | **關閉**（第 2 輪） | 初審時驗收只寫未封裝擴充，沒有寫跳過 `test-web`。第 2 輪 INDEX Acceptance 寫「This version has no `test-web` step; the chooser is not on the dApp page」。HOW Checks 寫「Do not use `test-web` for this version; the chooser is not on the dApp page」。手驗路徑是未封裝擴充的 popup 與 sidebar。 |

### LOW

| ID | 狀態 | 依據 |
|----|------|------|
| L1 | 非阻擋 | HOW 未指定新列的 class 名稱，也未寫 hover／focus。實作須自訂 class，且不要改 `.kind-btn`（匯入子選單仍用它）。不必另開視覺規格；沿用現有按鈕的可聚焦行為即可。第 2 輪仍未寫進契約，維持非阻擋。 |

第 2 輪沒有新的 HIGH、MEDIUM 或 LOW。示範稿的列距 8px、列內距 14px、圓角 12、圖示井 36×36／圓角 10、標題 14px／字重 650、副標 12px 與 2px，HOW Styles 都有對應句。圖示 path 與示範稿相同。

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 新增帳戶五列，順序 seed、burner、import、watch、combined；具名圖示、既有標題、目前語系副標 | 可測 | 五個標題鍵已在 `ui-messages.ts`。副標三語文案在 INDEX Decided。產生助記詞流程是 12 詞，副標「12 詞」與該路徑一致。匯入列副標不限定 12 詞。 |
| Popup 與 sidebar 同一列版 | 可測 | 契約要求一個元件、一塊 CSS，禁止第二套 padding。 |
| 每一列仍進目前的下一頁 | 可測 | `navigateTo` 與現碼相同：`add-generate-seed`、`add-generate`、`add-import`、`add-watch`、`add-combined`。 |
| 匯入子選單（助記詞／密鑰）仍是標題加 chevron | 可測 | `AddImportChooser` 明訂不改，樣式不得動 `.kind-btn`。 |
| `cd wallet && npm run typecheck`。本版沒有 `test-web` 步驟 | 可跑 | M2 已關閉。無新依賴。 |
| 未封裝擴充：popup 與 sidebar 各讀五句副標並各開一列 | 可手驗 | 一條手驗路徑。 |

## 與現碼抽樣

| 錨點 | 現況 | 與提案 |
|------|------|--------|
| `add-chooser.tsx` | `AddAccountChooser` 五顆 `kind-btn`，導向契約上的五個 view；`AddImportChooser` 另兩列同形 | 提案只換前者。現碼未做新列，不是缺陷。 |
| `StrokeIcon.tsx` | `StrokeIcon` 為 stroke、`currentColor`、24 viewBox；`IconEye`、`IconLayers` 路徑與示範稿相同。尚無 Pin／Flame／Download | HOW 給的三條 path 與示範稿一致。尺寸由呼叫端傳 20。 |
| `ui-messages.ts` | 五個標題鍵為扁平鍵，zh-Hant 與示範稿標題一致。尚無 `onboarding.chooser.*` | 新鍵沿同一形狀即可。 |
| 示範稿 CSS | `.chooser-row .s` 為 `margin-top: 2px`；圖示井色為 `var(--text-muted)` | HOW 已寫副標在標題下方 2px。圖示色寫「muted」，示範稿用 `--text-muted`，不另開項目。 |

Backlog「Decide before scheduling」的三項（圖示、密度、副標用字）已在 INDEX Decided 寫死。本審查不把 backlog 剩餘句子當契約。

架構抽樣：本版文件沒有要求把 pending 寫進 `chrome.storage`、手寫 rehydrate、硬編碼密碼，或廣播結果。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| M1 | MEDIUM | 關閉 | HOW「Styles」：副標在標題下方 2px |
| M2 | MEDIUM | 關閉 | INDEX「Acceptance」與 HOW「Checks」：不經 `test-web` |
| L1 | LOW | 非阻擋 | 可留在實作，不必先改契約 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-24 | 無 HIGH。門檻通過，可以開工。M1、M2 仍開。提案可行。 |
| 第 2 輪複審 | 2026-10-24 | 對照現行 INDEX 與 HOW。M1、M2 已寫進契約，關閉。無新 HIGH／MEDIUM。門檻通過，可以開工。 |

## Waiver

（無）
