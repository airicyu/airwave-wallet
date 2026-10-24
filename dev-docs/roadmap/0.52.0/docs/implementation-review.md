# Implementation review — 0.52.0

Reviewed at: working tree（HEAD `a572baf` 加上未提交變更）
Tracks: 1

- 日期：2026-10-24
- 輪次：**1**。後續輪次沿用既有 ID，往下追加。
- 角色：實作審查。不改程式、不加功能、不 commit。
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案與驗收；[`how.md`](./how.md)；[`reasoning.md`](./reasoning.md)；[`../HANDOFF.md`](../HANDOFF.md) 只核對交接是否越權；架構禁令見 [`../../GUIDELINES.md`](../../GUIDELINES.md)。
- 範圍：`AddAccountChooser`、`StrokeIcon` 三個新圖形、`onboarding.chooser.*`、`onboarding.css` 的 chooser 區塊。同一 working tree 另有 Debug mode 與相關設定（INDEX 標成 unversioned、不在本版契約），本輪不把它們算進 0.52.0 的實作。

## Round 1（2026-10-24）

**總評：** Track 1 的五列、圖示、既有標題、副標文案與 `navigateTo` 目標與 INDEX、how 一致；`AddImportChooser` 仍是標題加 chevron。架構禁令未破。`cd wallet && npm run typecheck` 結束碼 0。未封裝擴充的 popup 與 sidebar 手驗未走完。沒有未關閉的 HIGH。

### Match to how.md

| 步驟 | 結果 |
|------|------|
| 五列順序、圖示、標題鍵、副標鍵、`navigateTo` | 完成（`add-chooser.tsx`） |
| `AddImportChooser` 不改 | 完成。仍是 `kind-btn` 加 `kind-chev`，目標仍是 `add-import-seed` 與 `add-import-secret` |
| `IconPin`、`IconFlame`、`IconDownload` 走 `StrokeIcon`，路徑與 demo 相同，選擇器傳 size 20 | 完成 |
| Watch 用 `IconEye`、combined 用 `IconLayers` | 完成 |
| `.chooser-list` / `.chooser-row` / well / title / subtitle 的間距、圓角、字級與色票 | 完成。`.kind-btn` 沒有被這段 CSS 改寫 |
| 五個副標在 `ui-messages.ts`，三語與 INDEX 定案字句相同 | 完成 |
| Popup 與 sidebar 同一元件、同一 CSS，沒有第二密度或依寬度的 padding | 靜態完成。`AccountViews` 仍由 `PopupMarkup` 渲染這一個 `AddAccountChooser`；chooser CSS 沒有 media query |

### Findings

| ID | Sev | Status | Notes |
|----|-----|--------|-------|
| IR-052-1 | MEDIUM | Open（出貨門檻） | INDEX 驗收勾選仍是空的。本輪沒有載入 Chrome 未封裝擴充。popup 與 sidebar 的「讀五個副標、每列各開一次、匯入子選擇器仍是標題加 chevron」都未走完，不記為通過。 |

**未關閉 HIGH：** 無。

### 架構禁令

| 檢查 | 結果 |
|------|------|
| Pending 不進 UI 自行灌 storage | 通過。本版沒有新的 pending |
| 耐久狀態以 `chrome.storage` 為準 | 通過。沒有新的 storage key，也沒有 rehydrate 主路徑 |
| 託管：無硬編密碼、無明文長存解鎖金鑰 | 通過。本範圍未碰 vault |
| 訊息只回原分頁 | 通過。沒有新指令 |
| 不對每次 inject 結果做 RSA | 通過。未碰該路徑 |
| 金額不用 JavaScript `number` | 通過。本範圍沒有金額運算 |
| 新的第三方依賴 | 通過。沒有為本版改 `package.json` |
| 指令或權限 | 通過。INDEX 禁止新指令、storage key、權限；chooser diff 沒有這些 |

### INDEX 驗收

| 驗收列 | 結果 | 依據 |
|--------|------|------|
| 新增帳戶五列，順序為 seed、burner、import、watch、combined；各有指定圖示、既有標題、目前語系副標 | 靜態通過 | `add-chooser.tsx` 與 `onboarding.chooser.*` 三語字句與 INDEX 相同 |
| Popup 與 sidebar 同一列版面 | 靜態通過 | 單一元件與 `onboarding.css` 一組規則；手驗未走完，見 IR-052-1 |
| 各列仍開啟原本下一屏 | 靜態通過 | `add-generate-seed`、`add-generate`、`add-import`、`add-watch`、`add-combined` |
| 匯入子選擇器（助記詞／密鑰）仍是標題加 chevron | 靜態通過 | `AddImportChooser` 未改 |
| `cd wallet && npm run typecheck`。本版沒有 `test-web` 步驟 | 通過 | 結束碼 0（2026-10-24）。無整包測試指令，沒有跑 `bun test` |
| 未封裝擴充：popup 與 sidebar 開啟新增帳戶、讀五個副標、每列各開一次 | 未走完 | 本輪無法載入 Chrome，不記為通過。見 IR-052-1 |

無整包測試指令。INDEX 寫明的指令只有 `cd wallet && npm run typecheck`。

### 測試結果

工作目錄 `wallet/`。本輪執行。

| 指令 | 結束碼 |
|------|--------|
| `npm run typecheck`（`tsc --noEmit`，套件版本印出 `@airwave/wallet@0.51.0`） | 0 |

版號仍是已出貨的 0.51.0，與本版 INDEX `in progress` 一致，等使用者說 ship 再對齊。這不是缺陷。

### Fix log

| ID | Status | 追蹤 |
|----|--------|------|
| IR-052-1 | Open | 在未封裝擴充走完 INDEX 最後一列（popup 與 sidebar），再勾驗收。這不是程式修補。 |

### 歷審摘要

| 輪次 | 日期 | 總評 |
|------|------|------|
| 1 | 2026-10-24 | 靜態與 typecheck 通過。手驗未走完。未關閉 HIGH：無。未關閉：IR-052-1（MEDIUM）。 |
