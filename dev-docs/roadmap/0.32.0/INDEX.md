# 0.32.0 — 審批模擬跟交易自己的 blockhash，簽署頁改單列 AI

- **狀態：** `shipped`
- **上游版本：** [0.31.0](../0.31.0/INDEX.md)。審批模擬沿用 [0.10.0](../0.10.0/INDEX.md)、[0.11.0](../0.11.0/INDEX.md)，但推翻該版 `replaceRecentBlockhash: true`。簽署 AI 的 runtime、tool、Decisions 沿用 [0.30.0](../0.30.0/INDEX.md)；**推翻**該版「右上懸浮 pill」與「站點靠左」
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 2026-10-11 手測。審批停太久後送出被拒，`err` 為 `BlockhashNotFound`，畫面上的模擬仍成功。畫面概念稿：[`dev-docs/design-demos/0.32.0/tx-ai-row-card-ux.html`](../design-demos/0.32.0/tx-ai-row-card-ux.html)（使用者已看過並同意這個方向）
- **畫面：** [`dev-docs/design-principles.md`](../design-principles.md)。本版畫面句以本 INDEX 為準
- **秘密欄位：** 無

## 產品句

簽署交易審批用**這筆交易自己的 blockhash** 模擬；每 3 秒只更新「預期變動」；交易費不跟模擬走。站點置中，過長省略，右側可複製完整網址。AI 改成標題下的單列卡，完成後右側寫「風險指數: …」，點開仍是 overlay。

## 文件地圖

1. 本檔
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. 被推翻的模擬參數：[0.10.0](../0.10.0/INDEX.md)「模擬參數」
5. 被推翻的 AI 外觀：[0.30.0](../0.30.0/INDEX.md)「UI」裡的懸浮 pill 與站點靠左
6. 被推翻的失敗位置：[0.10.0](../0.10.0/INDEX.md)「預計失敗」的卡外 notice。審批 `fail` 改畫在預期變動卡內容區
7. 被推翻的費用來源：[0.11.0](../0.11.0/INDEX.md) 費用卡只讀模擬回包的 `sigFeeLamports`／`priorityLamports`／`totalFeeLamports`。本版由簽名費與 CU 在當地算出

## 已定案

| 題 | 決定 |
|----|------|
| 用誰的 blockhash | 審批這條 `simulateTransaction` **不**傳 `replaceRecentBlockhash: true`。用送審 wire 裡已經寫上的 recent blockhash（durable nonce 就是該筆 message 裡的那個）。不另叫 `getLatestBlockhash`，也不在送出前改寫這筆交易的 blockhash |
| 其餘模擬參數 | `encoding: "base64"`、`sigVerify: false` 維持 [0.10.0](../0.10.0/INDEX.md)。仍不傳 `accounts.addresses`。仍不在算差前用 `getMultipleAccounts` 當主路徑。15 秒上限不變。審批路徑上每一次 JSON-RPC `simulateTransaction`（phase 2，以及 phase 1 若也打這個 method）都不得帶 `replaceRecentBlockhash: true`。`estimateResourceLimitsFactory` 若內部送出的 `simulateTransaction` 帶了 `true`，一併關掉 |
| 誰改、誰不改 | 只改簽署審批的 `ui.simulatePendingTx` 路徑（`signTransaction`、`signAndSendTransaction`、`walletSend`）。[0.30.0](../0.30.0/INDEX.md) 的 AI tool `simulate` **繼續** `replaceRecentBlockhash: true`。兩者若共用 `simulateTransactionRpc`，旗標由呼叫端傳入，禁止改共用預設而悄悄改到 AI |
| 過期時看見什麼 | 推翻 0.10「預計失敗」的卡外 notice。blockhash 不在節點近期集合、模擬 `value.err` 為 `BlockhashNotFound`（或節點以同等 `value.err` 表示）時，`outcome` 仍是 `fail`。**不**在預期變動卡外插入節點。「預計交易失敗」、原因一行、「失敗詳情」（`err` 原文與 logs，預設收合）與「無法估計變動」都放在預期變動卡的內容區。不保留上一筆成功差額。交易費卡與交易明細維持原節點。不新增解釋 blockhash 的旁白。其他 `fail`（非 blockhash）同樣只畫在這張卡的內容區，不再使用卡外 notice |
| 核准 | 沿用 0.10.0：這種模擬失敗**不**禁用核准。無法 deserialize 仍禁用核准。AI 等級仍不禁用核准 |
| 每 3 秒 | 審批的簽署交易頁可見時，每 3 秒自動再呼一次與重新整理鈕相同的模擬。上一筆尚未回來則這拍略過，不疊兩筆。重新整理鈕因模擬進行中、CU 草稿 dirty、或尚無合法成對 CU 而停用時，這拍也不送。頁面關掉、請求結束、或進入送出狀態後停止。`signMessage` 不跑這條模擬 |
| 只更新預期變動 | 週期模擬與手動重新整理**只**改預期變動卡的內容區。不拆除、不重建：重新整理鈕、Inspector、AI 單列卡、交易費卡、交易明細、站點列、帳戶 widget。不重掛 AI、不重啟動 assess |
| 預期變動右側兩顆 | 重新整理與 Inspector 從預期變動卡**第一次畫出來**就同時在，順序固定：左重新整理、右 Inspector。還沒有 Inspector 網址時，右顆停用，不拿掉。模擬進行中可停用重新整理。禁止先只放重新整理、結果回來才插入 Inspector |
| 交易費 | 交易費不讀模擬回傳的費欄位。數字在當地算出：簽名費（每個 signer 5000 lamports）加上優先費（`ceil(cuLimit × cuPrice / 1_000_000)` lamports）。尚無成對 CU 時總額顯示「估計中」（沿用 0.11），優先費不顯示成 0。第一次得到成對 CU 時，用該對寫上總額，不讀模擬 JSON。其後的重新整理與每 3 秒刷新不得改交易費文字。使用者套用新的 CU limit／price 時，交易費在套用當下用新的一對重算 |
| 套用 CU | 套用成功後交易明細若指令變了，可更新明細那一塊。仍不重建重新整理鈕、Inspector、AI 卡。預期變動仍只靠模擬結果更新 |
| 帳戶分隔線 | 帳戶 widget **不在** Home 頂欄時（審批 popout、側欄／popup 的 dApp 審批、錢包送出確認），widget 下面加一條滿寬 `1px` 分隔線（`--stroke-soft`）。Home 頂欄已有底線，**不加**第二條。`signMessage` 若走同一殼、widget 同樣不在頂欄，也畫這條線 |
| 站點列 | 上述簽署殼的站點改為**置中**。標籤與值在同一張方角卡（圓角用 `--radius-sm`，**不要** `999px` 膠囊）。值過長時尾端省略（`…`），不換行。卡的右側一顆複製圖示，寫入剪貼簿的是**完整** origin，不是省略後的字。成功後該鈕約 1.6 秒變成勾，不另加「已複製」句子 |
| AI 位置與外觀 | 條件仍是 0.30.0：分析開關 on 且 OpenRouter key 非空，才顯示、才 assess。卡片在「簽署交易」標題**下面**、預期變動卡**上面**，一列：左 **bot** 圖示（中性色 `--text-muted`，**不**跟等級變色）＋「AI分析」（英文 `AI analysis`）。**不再**用右上懸浮 pill，**不再**把等級詞當這列的主標 |
| AI 分析中 | 卡內底部一條沒有百分比的來回進度條；右側「AI 分析中」／`Analyzing`。不開 overlay、不放風險指數、無 report 鈕 |
| AI 逾時／過慢 | `error` 且 `timeout` 或 `bridge_timeout`：右側「分析逾時」／`Timed out`，灰字、無 report 鈕。整段 assess **60s**；單次 LLM 往返 **55s** |
| AI 其他失敗 | 其餘 `error`：右側「分析沒有完成」／`Analysis did not finish`，無 report 鈕（除非已有 report 正文） |
| AI 完成後 | `done`：右側「風險指數: 低／留意／高／未知」（英文 `Risk index: …`）；**僅風險指數文字**跟等級上色。有正文時列末 **accent report 圓钮**開 overlay；整卡不可點、不重跑 |
| AI overlay | 中層 overlay、標題下固定免責（hardcode i18n）。正文為允許清單 Markdown；底列向上圖示捲回頂。關閉不重跑 |
| 版本號 | 出貨時 `wallet/package.json`、`wallet/manifest.config.ts`、`version.md`、`changelog.md` 對齊 `0.32.0` |

## 非目標

- 送出前幫 dApp 換新的 blockhash
- 改送出失敗頁的 `npx @solana/errors decode` 長文
- 改 AI tool `simulate` 的 `replaceRecentBlockhash`
- 做 durable nonce 提醒文案（仍見 [backlog/sign-tx-durable-nonce-alert.md](../backlog/sign-tx-durable-nonce-alert.md)）
- 用模擬失敗或 AI 等級禁用核准
- 升依賴或改 Vite 設定
- 改 Home 頂欄的帳戶 widget
- `signMessage` 的 AI 分析

## 開工前仍須拍板

（無。）

## 與上一版對照

| 舊 | 0.32.0 |
|----|--------|
| 0.10.0 審批模擬帶 `replaceRecentBlockhash: true` | 審批模擬用交易自己的 blockhash。過期則模擬失敗 |
| 每次模擬重畫預期變動、交易費、明細 | 週期模擬與重新整理只改預期變動 |
| 查詢中只有重新整理，成功後才插入 Inspector | 兩顆從第一屏就佔位。沒有網址時 Inspector 停用 |
| 交易費跟在模擬結果裡畫 | 交易費由簽名費與 CU 決定，模擬不寫它 |
| 0.30.0 右上懸浮「AI」pill；站點靠左膠囊 | 標題下單列「AI分析」（左 bot、右風險指數文字＋accent report 圓钮）；站點置中方角卡，過長省略，右側複製完整網址 |
| 帳戶 widget 在簽署頁與下面的內容沒有分隔 | widget 不在 Home 頂欄時，下面一條滿寬線 |

## 實作軌道

### Track 1 — 審批模擬不再換 blockhash

- **做：** `ui.simulatePendingTx` 的 `simulateTransaction` 使用送審交易的 blockhash
- **不做：** 改 AI `simulate`；改 `sigVerify`；送出前重寫 blockhash
- **驗收：** 拿一筆 blockhash 已失效的未簽交易開審批。預期變動為失敗。同一筆若改回 `replaceRecentBlockhash: true` 會成功——本版不得再成功

### Track 2 — 預期變動自己刷新，交易費脫離模擬

- **做：** 每 3 秒再模擬；只更新預期變動內容。交易費由交易／CU 繪製。重新整理與 Inspector 從第一屏並排
- **不做：** 重掛 AI；重建重新整理鈕、Inspector、明細（CU 套用成功除外）；查詢中藏起 Inspector
- **驗收：** 開著超過 3 秒，重新整理、Inspector、AI 卡、交易費、明細、站點列仍是原來的節點。只有預期變動內容變。套用 CU 後交易費變，且不是等模擬 JSON 回來才寫上

### Track 3 — 簽署頁站點、分隔線、AI 單列卡

- **做：** HOW 的直向順序、站點省略與複製、widget 下分隔線、AI 單列（進度條、風險指數、overlay 底列回到頂部）與三語 catalog
- **不做：** Home 頂欄再加線；`signMessage` AI；懸浮 pill
- **驗收：** 見下方驗收裡 UI 各條。概念稿只是方向，衝突時以本 INDEX 與 HOW 為準

## 驗收

手驗：未封裝載入 `wallet/dist`，用 `test-web` 開一筆簽署交易。沒有整包測試指令。

- [ ] 審批模擬請求沒有 `replaceRecentBlockhash: true`
- [ ] 失效 blockhash：預期變動卡內容區為失敗（「預計交易失敗」與「無法估計變動」都在卡內，卡外沒有 notice）；立刻批准則送出同樣被拒（`BlockhashNotFound`）
- [ ] 先模擬成功並顯示差額，blockhash 失效後的下一拍只改預期變動內容，不再留下上一筆成功差額
- [ ] 新 blockhash：預期變動仍可顯示差額；盡快批准可以送出
- [ ] 開著審批時約每 3 秒再模擬一次；進行中的那筆不會被疊成兩筆
- [ ] 這次刷新不重建重新整理鈕、Inspector、AI 卡、交易費、交易明細、站點列
- [ ] 預期變動卡第一次出現時，右側已是重新整理、Inspector 兩顆。查詢中點右側那顆不會在結果回來後變成 Inspector
- [ ] 尚無成對 CU 時交易費總額為「估計中」；第一次得到成對 CU 時寫上當地算出的總額；其後的模擬往返不改交易費文字
- [ ] AI 的 `simulate` tool 仍帶 `replaceRecentBlockhash: true`
- [ ] 簽署頁帳戶 widget 下有一條滿寬分隔線；Home 頂欄沒有第二條
- [ ] 長 origin 尾端是 `…`；複製鈕寫入的是完整 origin；成功後約 1.6 秒該圖示為勾；`aria-label` 為「複製站點」／「复制站点」／`Copy site`
- [ ] AI 分析中：單列「AI分析」、右側「AI 分析中」、底條進度條；無風險指數、無 report、不開 overlay
- [ ] AI 逾時：等超過約 60s 或單次 LLM 超 55s 後，右側「分析逾時」、無 report 鈕（不出現「風險指數: 未知」）
- [ ] AI 完成：右側「風險指數: …」+ report 鈕；overlay 有免責句與底列回頂；關閉不重跑
- [ ] `locale` 為 `en` 時左側是 `AI analysis`，右側是 `Risk index: …`
- [ ] `locale` 為 `zh-Hans` 時左側是「AI分析」，右側是「风险指数: 低／留意／高／未知」之一

## 錨點

| 路徑 | 用途 |
|------|------|
| `wallet/src/background/simulate/simulate-rpc.ts` | 現在寫死 `replaceRecentBlockhash: true`。審批與 AI tool 都呼叫它 |
| `wallet/src/background/simulate/sign-tx-simulate.ts` | `attachFees` 把簽名費與優先費塞進模擬結果 |
| `wallet/src/approval/shell.ts` | `runSimulation` 以 `signBody.innerHTML = ""` 重畫預期變動、交易費、明細 |
| `wallet/src/approval/tx-ai-widget.ts` | 現況是右上懸浮 pill。本版改成標題下的單列卡 |
| `wallet/src/background/tx-ai/host-tools.ts` | AI `simulate` 仍要換 blockhash |
| `wallet/src/popout/index.html`、`wallet/src/popup/components/ApprovalHost.tsx` | 簽署殼的帳戶 widget 與站點列 |
| `dev-docs/design-demos/0.32.0/tx-ai-row-card-ux.html` | 已同意的方向稿，不是契約 |
