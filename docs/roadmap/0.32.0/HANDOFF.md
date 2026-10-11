# 0.32.0 HANDOFF

**狀態：** **已出貨**（`shipped`）。見 [`changelog.md`](../../../changelog.md) 0.32.0 條目。

## 讀檔順序

1. [INDEX.md](./INDEX.md)
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. [docs/design-review.md](./docs/design-review.md)
5. 被推翻句：[0.10.0](../0.10.0/INDEX.md) 模擬參數與卡外「預計失敗」；[0.11.0](../0.11.0/INDEX.md) 費用只讀模擬回包；[0.30.0](../0.30.0/INDEX.md) 懸浮 pill 與站點靠左
6. 方向稿：[`docs/design-demos/tx-ai-row-card-ux.html`](../../design-demos/tx-ai-row-card-ux.html)（衝突時以 INDEX 與 HOW 為準）

## 產品摘要

簽署交易審批用這筆交易自己的 blockhash 模擬。每 3 秒只更新預期變動。交易費由簽名費與 CU 在當地算出，不讀模擬 JSON。站點置中、過長省略、右側複製完整 origin。AI 改成標題下單列卡，完成後右側寫「風險指數: …」。

## Track 順序

1. 審批模擬不再換 blockhash（含 phase 1 若打 `simulateTransaction`）。AI tool 仍 `replaceRecentBlockhash: true`
2. 每 3 秒只更新預期變動；失敗畫在該卡內容區；交易費脫離模擬；兩顆圖示從第一屏並排
3. 站點、分隔線、AI 單列卡與三語 catalog

## 禁區

- 送出前改寫 blockhash，或另叫 `getLatestBlockhash` 再模擬
- 改 AI `simulate` 的 `replaceRecentBlockhash`
- 模擬刷新重建重新整理鈕、Inspector、AI 卡、交易費、明細、站點列
- 在預期變動卡外再插「預計交易失敗」notice
- Home 頂欄加第二條分隔線；`signMessage` 加 AI 卡或 3 秒模擬
- pending 改持久 store、結果廣播全 tab、硬編碼密碼

## 待拍板

無。

## Paste-ready starter（實作 Track 1）

```text
讀 docs/roadmap/0.32.0/INDEX.md、docs/how.md、HANDOFF.md、AGENTS.md、docs/roadmap/GUIDELINES.md。
實作 0.32.0 Track 1 — 審批模擬不再換 blockhash：ui.simulatePendingTx 路徑上每一次 simulateTransaction（phase 2，以及 phase 1／estimateResourceLimitsFactory 內部若打同一個 method）不得帶 replaceRecentBlockhash: true。旗標由呼叫端傳入。AI tool simulate 維持 true。
不要做 Track 2–3；不要 commit 除非使用者要求。
INDEX 狀態改 in progress。手驗：未封裝 wallet/dist，失效 blockhash 的審批模擬為失敗。
```
