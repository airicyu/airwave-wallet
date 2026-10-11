# Implementation review — 0.32.0 Airwave Wallet

- **日期：** R1 2026-10-11（Asia/Hong_Kong）
- **輪次：** R1（初審；穩定 ID 未重編號）
- **角色：** 實作審查（不改程式、不加功能、不 commit）
- **對照基準：** [`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)；[`reasoning.md`](./reasoning.md)；[`design-review.md`](./design-review.md)；[`../HANDOFF.md`](../HANDOFF.md)；架構禁區見 [`../../GUIDELINES.md`](../../GUIDELINES.md)
- **現行程式：** working tree（`main` ahead 2 ＋未 commit 變更）；含 **untracked** `wallet/src/approval/sign-tx-body.ts`（`shell.ts` 已 import，建置依賴此檔）。不以 chat history 為準

---

## 總評

**無未關閉 HIGH。** 靜態對照顯示 Track 1–3 主路徑已落在錨點檔：`replaceRecentBlockhash` 由呼叫端傳入、審批路徑為 `false`、AI tool 為 `true`；簽署殼拆出 `sign-tx-body` 做 3 秒只刷預期變動內容區與費用凍結；站點置中／複製／分隔線與 AI 單列卡與 catalog 已接線。**`cd wallet && bun run build` 通過。** INDEX 手驗條目**均未在瀏覽器載入 `wallet/dist` 驗證**（見下表）。INDEX 標 `shipped` 但驗收 checklist 仍全為 `[ ]`，與本審查結論不一致（見 032-M1）。

---

## 測試與建置

| 指令 | 結果 | 備註 |
|------|------|------|
| `cd wallet && bun run build`（`tsc --noEmit && vite build`） | **通過** | R1 執行 exit 0 |

---

## Findings

### HIGH

（R1 無 HIGH。架構禁區：未見 pending 持久 hydrate、全 tab 廣播、硬編碼密碼等主路徑違規。）

### MEDIUM

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| 032-M1 | INDEX `shipped` 與驗收 checklist 未勾、未手驗 | **仍開** | [`../INDEX.md`](../INDEX.md) 狀態為 `shipped`，但「驗收」區 16 條仍全 `[ ]`。本審查僅靜態＋建置，**未**未封裝載入擴充走 test-web 手驗。出貨門檻應：手驗通過後勾選 checklist，或將狀態改回 `in progress` 直至驗完。 | 手驗後更新 INDEX；勿在無手驗紀錄下維持 `shipped` |
| 032-M2 | 核心新檔仍 untracked | **仍開** | `wallet/src/approval/sign-tx-body.ts` 在 `git status` 為 `??`，但 [`shell.ts`](../../../../wallet/src/approval/shell.ts) 已 import；漏 add 會使他人 clone／CI 無此檔而建置失敗。 | 出貨 commit 時務必 `git add` 該檔 |

### LOW

| ID | 標題 | 狀態 | 說明 |
|----|------|------|------|
| 032-L1 | `renderSimulationNotice` 成死碼 | **仍開**（非阻擋） | [`simulation-notice.ts`](../../../../wallet/src/approval/cards/simulation-notice.ts) 仍 export，但 shell 已改走 `paintDeltaInner`；`fail` 不再插卡外 notice。可後續刪檔或收斂 export。 |
| 032-L2 | HANDOFF 與 INDEX 狀態句不一致 | **仍開**（非阻擋） | HANDOFF 仍寫「實作開始時 INDEX 改 `in progress`」；INDEX 已 `shipped`。不影響產品碼，出貨時順手改 HANDOFF 或標歷史。 |
| 032-L3 | 設計 L4（已簽且解不出 CU） | **仍開**（非阻擋） | 與 design-review L4 同旨：`updateFeeTotalEl` 在 `!txCuEditable` 且無總額時顯示「未知」，未成對 CU 的未簽路徑顯示「估計中」。並讀合理；契約未寫死已簽分支，test-web 主路徑不擋。 |
| 032-L4 | `rpc`／`unparseable` 也畫在預期變動內容區 | **仍開**（非阻擋） | INDEX 只推翻 `fail` 的卡外 notice；實作把「無法模擬」也移入 `.delta-inner`。行為更一致，非契約違反。 |

---

## R1 重點對照（INDEX／HOW）

| 檢查項 | 結論 | 靜態證據 |
|--------|------|----------|
| 審批 `simulateTransaction` 不帶 `replaceRecentBlockhash: true` | **符合** | [`phase2-deltas.ts`](../../../../wallet/src/background/simulate/phase2-deltas.ts) `false`；[`sign-tx-simulate.ts`](../../../../wallet/src/background/simulate/sign-tx-simulate.ts) phase1 probe `false`；[`simulate-rpc.ts`](../../../../wallet/src/background/simulate/simulate-rpc.ts) 旗標由 options 傳入 |
| AI tool `simulate` 仍 `true` | **符合** | [`host-tools.ts`](../../../../wallet/src/background/tx-ai/host-tools.ts) |
| `fail` 只在預期變動卡內容區 | **符合** | [`sign-tx-body.ts`](../../../../wallet/src/approval/sign-tx-body.ts) `paintDeltaInner`；shell 未再呼叫 `renderSimulationNotice` |
| 每 3 秒模擬、進行中／retry 停用／CU dirty 略過 | **符合** | `startAutoSim` 3000ms；`shouldSkip` 含 `simulating`、`retrySimDisabled()`（含 `cuDirty`、尚無成對 CU） |
| 週期模擬只改預期變動內容 | **符合** | `runSimulation`：`forceFull` 僅初次／CU 套用；否則 `paintDeltaOnly`；`feeFrozenForSim` 鎖總額 |
| 重新整理＋Inspector 第一屏並排 | **符合** | `mountSignTxBodyShell` 一次建立兩顆；Inspector 無 URL 時 `disabled` |
| 交易費當地計算、模擬往返不改總額文字 | **符合（靜態）** | `attachFees` 簽名費＋優先費；`refreshFeeTotal`／`localTotalFeeLamports`＋`feeFrozenForSim` |
| 站點置中、省略、複製完整 origin、1.6s 勾 | **符合（靜態）** | popout／`ApprovalHost` markup；`.site-v` ellipsis；`shell.ts` 1600ms 勾；`approval.copySite` catalog |
| 帳戶 widget 下滿寬線；Home 不加 | **符合（靜態）** | `<hr class="account-rule">`；[`tx-ai.css`](../../../../wallet/src/approval/tx-ai.css) `--stroke-soft` |
| AI 單列、bot 圖示、進度條、風險指數文字、accent report 鈕、overlay 回到頂部 | **符合（靜態）** | [`tx-ai-widget.ts`](../../../../wallet/src/approval/tx-ai-widget.ts)；[`tx-ai.css`](../../../../wallet/src/approval/tx-ai.css)；[`ui-messages.ts`](../../../../wallet/src/shared/ui-messages.ts) 三語 |
| 模擬刷新不重掛 AI | **符合（靜態）** | `attachTxAiToSignShell` 僅在 `renderSignShell` 簽署交易分支；`paintRow` 快取 key |
| 版本號 0.32.0 | **符合** | `wallet/package.json`、`version.md`、`changelog.md`（working tree） |

---

## 驗收對照（INDEX checklist）

證據：**建置／靜態碼**。**Chrome 未封裝擴充本審查未載入**（含失效 blockhash、3 秒 DOM 穩定性、實際送出、locale 切換、AI overlay）。

| # | 驗收句（摘要） | 結果 |
|---|----------------|------|
| 1 | 審批模擬無 `replaceRecentBlockhash: true` | **靜態通過**／**未手驗 RPC 封包** |
| 2 | 失效 blockhash：卡內失敗、可核准、送出仍拒 | **未手驗** |
| 3 | 先成功後失效：不留舊差額 | **靜態通過**（`fail` 分支不畫 deltas）／**未手驗** |
| 4 | 新 blockhash：差額與送出 | **未手驗** |
| 5 | 約每 3 秒再模擬、不疊兩筆 | **靜態通過**／**未手驗** |
| 6 | 刷新不重建鈕／Inspector／AI／費／明細／站點 | **靜態通過**／**未手驗 DOM** |
| 7 | 第一屏兩顆並排、查詢中右側不變圖示 | **靜態通過**／**未手驗** |
| 8 | 費用「估計中」→ 成對 CU 寫總額 → 模擬不改文字 | **靜態通過**／**未手驗** |
| 9 | AI `simulate` 仍 `true` | **靜態通過** |
| 10 | widget 下分隔線；Home 無第二條 | **靜態通過**／**未手驗 Home** |
| 11 | 長 origin 省略、複製、1.6s 勾、aria-label 三語 | **靜態通過**／**未手驗** |
| 12 | AI 分析中：單列＋進度條、不可點 | **靜態通過**／**未手驗** |
| 13 | AI 完成：風險指數文字、report 鈕開 overlay、回到頂部、關閉不重跑 | **靜態通過**／**未手驗** |
| 14 | `locale` en：AI analysis／Risk index | **靜態通過**（catalog）／**未手驗** |
| 15 | `locale` zh-Hans：AI分析／风险指数 | **靜態通過**（catalog）／**未手驗** |

---

## 修復追蹤表

| ID | 級 | 狀態 | 關閉條件 |
|----|----|------|----------|
| 032-M1 | MEDIUM | 仍開 | INDEX 手驗勾選＋狀態與事實一致 |
| 032-M2 | MEDIUM | 仍開 | `sign-tx-body.ts` 進入版本控制之 commit |
| 032-L1 | LOW | 仍開 | 刪除或收斂 dead code（可非本版） |
| 032-L2 | LOW | 仍開 | HANDOFF 與 INDEX 同步（可非本版） |
| 032-L3 | LOW | 仍開（非阻擋） | 可選：HOW 補已簽「未知」句 |
| 032-L4 | LOW | 仍開（非阻擋） | 記錄即可 |

---

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| R1 | 2026-10-11 | 無 HIGH；靜態主路徑對齊 INDEX／HOW。建置通過。手驗未做。032-M1、032-M2 仍開。 |
