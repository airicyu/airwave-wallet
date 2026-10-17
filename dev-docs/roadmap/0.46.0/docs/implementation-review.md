# Implementation review — 0.46.0 Airwave Wallet

- 日期：2026-10-17（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**（累加；初審見文末）
- 角色：實作審查（不改程式）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收、[`how.md`](./how.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- **總評：** 無未關閉 HIGH，不可出貨。應修 MEDIUM 皆已關（M1、M2）。L1 仍開，不擋出貨條件裡的 HIGH／MEDIUM。`cd wallet && npm run typecheck` 通過。未封裝擴充手驗沒有走。

## Findings

### HIGH

（無）

### MEDIUM

#### M1 — 編輯中遮罩後打字會改寫草稿 — **第 2 輪關閉**

初審：`editing` 未揭示時 `value` 是遮罩常數，`onChange` 仍寫進草稿。

現碼：`readOnly={phase !== "editing" || !revealed}`，且 `onChange` 只在 `phase === "editing" && revealed` 時 `setDraft`。遮罩時草稿不改。再點顯示用 `setRevealed` 還原同一份 `draft`。確認仍把 `draft` 交給既有 `persist*Field`。

#### M2 — 平時顯示的慢回傳會蓋掉遮罩 — **第 2 輪關閉**

初審：`revealIdle` 沒有世代號，較慢的那次回傳仍 `setRevealed(true)`。

現碼：`revealTicket`。再點遮罩或另起一次讀取會把票號加一；回傳時票號不符則丟棄。`phaseRef.current !== "idle"` 也丟棄。點鉛筆時 `beginEdit` 把 `revealTicket` 加一，進行中的平時顯示不會在載入明文之前把欄位畫成明文。

### LOW

#### L1 — 讀取中這一列沒有鉛筆也沒有取消 — **仍開**

`phase === "loading"` 仍不畫鉛筆、確認、捨棄。讀取一直不回來時，交易 AI 頁這一列只能離開頁面卸載。API keys 頁可以改點另一列把編輯權搶走（`claimedId` 變化會 `idle()`，並讓進行中的讀取票號失效）。INDEX 只要求讀取未完成不能確認。不擋出貨。

## 驗收對照

| INDEX 驗收句 | 結果 | 證據 |
|--------------|------|------|
| 三列平時只有顯示與鉛筆；有值時為遮罩，看不到確認或捨棄 | 手驗未走 | 靜態：`idle` 只畫顯示與 `IconRename`；有 `configured` 時值為遮罩；空值 placeholder 為 `common.optional` 且唯讀。未封裝擴充沒走 |
| 點鉛筆後，明文尚未放進草稿前沒有確認鈕；讀取失敗回到遮罩且已存值不變。讀取成功後可改字，並出現確認與捨棄；確認與捨棄按下時有縮小回饋 | 手驗未走 | 靜態：`loading` 不畫確認；`res.ok` 失敗則回 `idle` 且不呼叫 `persist`；成功才 `editing` 並顯示全文。按下態 `PRESS_MS = 140`，CSS `scale(0.86)`。縮小是否看得見未手驗 |
| 確認後值寫入，離開編輯並回到遮罩；再點顯示看到的是剛確認的字（trim 後） | 手驗未走 | 靜態：確認約 140ms 後呼叫既有 `persist*Field`（仍 trim；與已存相同回 `true` 不發 patch）。失敗或 reject 留在編輯。M1 已關，遮罩後打字不會改草稿 |
| 改字後點捨棄、編輯中讓輸入框失焦、或直接離開該頁：已存值不變，列回到遮罩 | 手驗未走 | 靜態：捨棄與 `onBlur` 只 `idle()`，不呼叫 `persist`。卸載沒有寫入。按鈕 `onMouseDown` 的 `preventDefault` 與 `holdBlur` 用來讓按下確認／捨棄不先被失焦吃掉。未手驗 |
| 一列編輯中去編另一列：前一列不寫入 | 手驗未走 | 靜態：API keys 頁共用 `claimedId`；被搶走時 `idle()` 不寫入。兩頁不同時掛載。未手驗 |
| `cd wallet && npm run typecheck` | 通過 | 2026-10-17 第 2 輪於 `wallet/` 執行，`tsc --noEmit` 結束碼 0 |
| 未封裝擴充走 API keys 頁與交易 AI 設定頁各一輪（靜態截圖不算） | 未走 | 此環境沒有未封裝擴充可操作。靜態讀碼不算通過 |

無整包測試指令。本版 INDEX 只寫 `cd wallet && npm run typecheck` 與未封裝手驗。沒有假設 `bun test`。

## 測試結果

- 指令：`cd wallet && npm run typecheck`（cwd：`wallet/`）
- 結果：通過（2026-10-17，第 2 輪複審重跑）
- 無整包測試指令
- 未封裝手驗未走，涵蓋驗收表除 typecheck 以外的每一條（API keys 頁與交易 AI 設定頁都沒走）

INDEX 狀態仍是 `in progress`，驗收除 typecheck 外未勾。手驗未過，這次審查不把版本字串當成已出貨。

架構禁區：本版只改設定列操作與文案，沒有把 pending hydrate、全 tab 廣播或硬編碼密碼當成主路徑。`persist*Field` 的 trim 與相同值不發 patch 仍在。

## 修復追蹤

| ID | 級 | 狀態 | 關閉位置 |
|----|----|------|----------|
| M1 | M | 第 2 輪關閉 | `wallet/src/popup/settings/SecretKeyField.tsx`：遮罩時 `readOnly`，`onChange` 只在已揭示時寫草稿 |
| M2 | M | 第 2 輪關閉 | 同檔 `revealTicket`；再點遮罩、重讀、以及 `beginEdit` 都會使舊回傳失效 |
| L1 | L | 仍開 | — |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-17 | 無 HIGH。M1、M2 仍開。typecheck 通過。未封裝手驗未走。不可出貨 |
| 第 2 輪複審 | 2026-10-17 | 無 HIGH。M1、M2 已關。L1 仍開。無新 MEDIUM。typecheck 通過。未封裝手驗未走。不可出貨 |

## 初審紀錄（2026-10-17）

當時總評：無未關閉 HIGH，不可出貨。typecheck 通過。未封裝手驗沒有走。應修 MEDIUM 為 M1、M2。L1 已記錄。本輪只改狀態，不重編號。
