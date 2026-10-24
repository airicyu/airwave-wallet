# Design review — 0.32.0 Airwave Wallet

- 日期：2026-10-11（Asia/Hong_Kong）
- 輪次：**第 3 輪複審**（累加於初審與第 2 輪；穩定 ID 未重編號）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[how.md](./how.md)、[reasoning.md](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 上一版與被推翻句：[0.31.0](../../0.31.0/INDEX.md)（Vite 8；過期 blockhash 文案留到後版）、[0.10.0](../../0.10.0/INDEX.md)「模擬參數」「預計失敗」、[0.11.0](../../0.11.0/INDEX.md) 交易費與 phase 1／2、[0.30.0](../../0.30.0/INDEX.md)「UI」「Refresh」。Backlog [`sign-tx-durable-nonce-alert.md`](../../backlog/sign-tx-durable-nonce-alert.md) 只是構想，不是本版契約
- 現行程式抽樣：見文末。倉庫有程式
- **總評（第 3 輪）：** 提案可行，**不是不可行**。**無未關閉 HIGH**。第 2 輪應修的 **M1 已關閉**：驗收已改成「尚無成對 CU 時交易費總額為『估計中』；第一次得到成對 CU 時寫上當地算出的總額；其後的模擬往返不改交易費文字」，與已定案「交易費」、HOW「模擬與交易費」同一句。L4 仍開且**非阻擋**。HANDOFF 已存在，含 paste-ready starter（實作 Track 1），文內 Track 順序與 INDEX 三軌一致，禁區不與已定案衝突。待拍板表是空的。審查門檻**通過**，可以開工。

## Findings（第 3 輪複審）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。前兩輪題旨保留，本輪只核對現檔。

### HIGH

#### H1 — 過期失敗畫在卡內，還是維持 0.10 卡外 notice — **關閉**

初審：0.10 在 `value.err` 非空時於預期變動上方插「預計交易失敗」（原因一行＋預設收合的「失敗詳情」）。0.32 同時寫失敗內容只在預期變動卡內、不在卡外插入會把交易費與明細往下推的節點，推翻清單卻沒點名這張 notice。主路徑（過期 blockhash → `fail`）無法同時滿足兩套。

第 2 輪：已採初審建議的第 2 種，並寫成完整句。INDEX 文件地圖第 6 點推翻 0.10「預計失敗」的卡外 notice。已定案「過期時看見什麼」寫明：`BlockhashNotFound`（或節點以同等 `value.err` 表示）時 `outcome` 仍是 `fail`；「預計交易失敗」、原因一行、「失敗詳情」（`err` 原文與 logs，預設收合）與「無法估計變動」都在預期變動卡內容區；不保留上一筆成功差額；交易費卡與交易明細維持原節點；不新增解釋 blockhash 的旁白；其他 `fail` 同樣只畫在這張卡內。HOW「模擬與交易費」寫每 3 秒唯一換掉的內容區含 `fail`，不再在卡外插該 notice。驗收「失效 blockhash」要求卡內有這兩句、卡外沒有 notice。0.31 把新的 blockhash 解釋文案留到後版；本版明文不新增該旁白，與此相容。關閉。

第 3 輪：上述句子仍在 INDEX、HOW、驗收。HANDOFF 禁區寫「在預期變動卡外再插『預計交易失敗』notice」，Track 順序第 2 點寫失敗畫在該卡內容區。維持關閉。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | **關閉** | 初審題旨：無成對 CU 時總額文案，以及第一次模擬回包能不能改交易費。第 2 輪：已定案「交易費」與 HOW「模擬與交易費」已寫死三句，分叉剩在驗收「交易費在模擬往返期間不改文字」沒有「第一次寫上」的例外。第 3 輪：該驗收句已改成「尚無成對 CU 時交易費總額為『估計中』；第一次得到成對 CU 時寫上當地算出的總額；其後的模擬往返不改交易費文字」。HOW 同段寫「第一次得到成對 CU 時寫上總額；之後的模擬刷新不改這段文字」。套用當下重算仍在已定案「交易費」與 Track 2 驗收（「套用 CU 後交易費變，且不是等模擬 JSON 回來才寫上」），與「模擬往返不改文字」分屬兩件事。關閉。 |
| M2 | **關閉** | 初審：未寫 `replaceRecentBlockhash` 是否含 phase 1。第 2 輪：已定案「其餘模擬參數」寫審批路徑每一次 JSON-RPC `simulateTransaction`（phase 2，以及 phase 1 若也打這個 method）都不得帶 `true`；`estimateResourceLimitsFactory` 內部若帶了 `true`，一併關掉。HOW 同句，並允許省略該欄或明確 `false`。AI tool 仍傳 `true`。第 3 輪：HANDOFF Track 順序第 1 點與 paste-ready starter 複述同一句。維持關閉。 |
| M3 | **關閉** | 初審：CU dirty 或尚無合法成對 CU 時，3 秒那拍未寫是略過還是仍送。第 2 輪：已定案「每 3 秒」寫重新整理鈕因模擬進行中、CU 草稿 dirty、或尚無合法成對 CU 而停用時，這拍也不送。HOW「重新整理鈕停用時，該拍不送」。第 3 輪句子仍在。維持關閉。 |
| M4 | **關閉** | 初審：驗收沒有「先成功、下一拍改失敗並清掉舊差額」。第 2 輪：驗收已有「先模擬成功並顯示差額，blockhash 失效後的下一拍只改預期變動內容，不再留下上一筆成功差額」。與已定案「不保留上一筆成功差額」同一句。第 3 輪句子仍在。維持關閉。 |
| M5 | **關閉** | 初審：驗收只有 `locale` 為 `en`。第 2 輪：驗收已有 `zh-Hans` 左側「AI分析」、右側「风险指数: …」。HOW 本來就有簡中 catalog。第 3 輪句子仍在。維持關閉。 |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **關閉** | 初審：推翻清單未點名 0.11 費用卡只讀模擬回包的三個 lamports 欄。第 2 輪：文件地圖第 7 點已寫推翻該句，改由簽名費與 CU 在當地算出。第 3 輪該點仍在。維持關閉。 |
| L2 | **關閉** | 初審：驗收未列複製成功約 1.6 秒改勾，以及複製鈕 `aria-label`。第 2 輪：驗收長 origin 那條已含勾與「複製站點」／「复制站点」／`Copy site`。overlay 底列 `aria-label` 初審已記為 HOW 可寫、畫面不放句子；該句仍在 HOW「AI 單列」。第 3 輪兩處都在。維持關閉。 |
| L3 | **關閉** | 初審：失敗且報告正文空時，overlay 顯示什麼未寫。第 2 輪：已定案「AI 完成後」寫報告正文空時仍可開，正文區空白，不發明新文案。第 3 輪該句仍在。維持關閉。 |
| L4 | **仍開**（非阻擋） | 第 2 輪新項。0.11 已簽且 message 解不出 limit／price：優先費與總費顯示「未知」，簽名費仍可算。0.32「尚無成對 CU → 估計中」若單獨套到這條，會改掉「未知」。文件地圖只推翻費用欄位來源，沒有推翻這句。並讀可以做成：未簽、尚在等成對 CU，用「估計中」；已簽且解不出，仍用「未知」。第 3 輪：已定案「交易費」仍只寫「尚無成對 CU 時總額顯示『估計中』（沿用 0.11）」，沒有補上「已簽且解不出仍為『未知』」。建議句尚未入 INDEX 或 HOW。並讀仍然成立，不另開待拍板。不擋本版 test-web 未簽主路徑，也不擋門檻。 |

架構禁區：本版不改 pending 權威、不廣播結果、不把 pending 寫進持久 store、不新增 Wallet Standard 方法、秘密欄位為無。抽樣未見與禁區不可調和的主路徑。3 秒刷新沿用既有 `ui.simulatePendingTx`（帶 `requestId`）即可，不必另做 storage 同步。`outcome: "rpc"` 的 0.10「無法模擬」notice 未列入推翻清單，仍在卡外；主路徑過期是 `value.err` → `fail`，已改畫在卡內，不另立 finding。

### HANDOFF

[`../HANDOFF.md`](../HANDOFF.md) 現已存在。讀檔順序、產品摘要、Track 順序、禁區、待拍板（無）、paste-ready starter 都有。Track 順序三點對得上 INDEX Track 1–3：審批模擬不再換 blockhash（含 phase 1；AI tool 仍 `true`）、每 3 秒只更新預期變動且失敗畫在卡內且交易費脫離模擬、站點與分隔線與 AI 單列。Starter 標題為「實作 Track 1」，正文要求 `ui.simulatePendingTx` 路徑上 phase 2 與 phase 1／`estimateResourceLimitsFactory` 不得帶 `replaceRecentBlockhash: true`、旗標由呼叫端傳入、AI tool 維持 `true`、不要做 Track 2–3。這與 INDEX Track 1 以及本倉庫既有「先貼 Track 1」的 HANDOFF 寫法一致，沒有改寫 Track 2–3 的產品句。合格。

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 審批模擬請求沒有 `replaceRecentBlockhash: true` | 可測 | 已定案已含 phase 1 與 factory 內部那次。M2 關閉 |
| 失效 blockhash：預期變動卡內容區為失敗（兩句都在卡內，卡外沒有 notice）；立刻批准則送出同樣被拒 | 可測 | H1 關閉。原因一行與「失敗詳情」在已定案，本條點了標題與「無法估計變動」 |
| 先模擬成功並顯示差額，失效後的下一拍只改預期變動內容，不再留下上一筆成功差額 | 可測 | M4 關閉 |
| 新 blockhash：預期變動仍可顯示差額；盡快批准可以送出 | 可測 | — |
| 開著審批約每 3 秒再模擬一次；進行中不疊成兩筆 | 可測 | 已定案另寫 dirty／尚無成對 CU／進行中時這拍不送。M3 關閉 |
| 刷新不重建重新整理鈕、Inspector、AI 卡、交易費、交易明細、站點列 | 可測 | `fail` 已收進卡內，不再靠卡外 notice 把交易費與明細往下推 |
| 預期變動卡第一次出現時右側已是重新整理、Inspector；查詢中點右側不會在結果回來後變成 Inspector | 可測 | — |
| 尚無成對 CU 時交易費總額為「估計中」；第一次得到成對 CU 時寫上當地算出的總額；其後的模擬往返不改交易費文字 | 可測 | M1 關閉。與已定案、HOW 同一句 |
| AI 的 `simulate` tool 仍帶 `replaceRecentBlockhash: true` | 可測 | — |
| 簽署頁帳戶 widget 下有滿寬分隔線；Home 頂欄沒有第二條 | 可測 | — |
| 長 origin 尾端 `…`；複製完整 origin；約 1.6 秒為勾；`aria-label` 三語 | 可測 | L2 關閉 |
| AI 分析中：標題下單列「AI分析」加進度條，沒有「風險指數」，點了不開 overlay | 可測 | — |
| AI 完成：右側「風險指數: …」（文字跟等級）；accent report 圓钮開 overlay；底列圖示捲回頂；關閉不重跑 | 可測 | 正文空時空白已在已定案。L3 關閉 |
| `locale` 為 `en` 時左側 `AI analysis`，右側 `Risk index: …` | 可測 | — |
| `locale` 為 `zh-Hans` 時左側「AI分析」，右側「风险指数: …」 | 可測 | M5 關閉 |

沒有整包測試指令。手驗範圍（未封裝 `wallet/dist`、`test-web` 簽署交易）與 GUIDELINES 現況一致。

## 與現碼抽樣

現碼未做本版，下列是要改的行為，不是設計 HIGH。第 3 輪重抽同一批錨點，與提案互斥的現況（卡外 fail notice、共用 RPC 寫死 `true`、`signBody` 整段重畫）都已有對應的已定案句子。

| 錨點 | 抽樣 |
|------|------|
| `wallet/src/background/simulate/simulate-rpc.ts` | `replaceRecentBlockhash: true` 寫在共用函式，沒有呼叫端旗標。審批與 AI 都叫它。提案要求呼叫端傳旗標，與「禁止改共用預設而悄悄改到 AI」一致，做得到 |
| `wallet/src/background/tx-ai/host-tools.ts` | `simulate` 直接呼叫共用函式。維持 `true` 的寫法已在已定案 |
| `wallet/src/background/simulate/sign-tx-simulate.ts` | `attachFees` 用 header 的 signer 數乘 5000，與 0.11 `numRequiredSignatures` 同一套。phase 1 用 `estimateResourceLimitsFactory`，不經 `simulateTransactionRpc`。倉庫內未搜到 kit 原始碼的 `replaceRecentBlockhash` 字面；契約已寫若該次 RPC 帶 `true` 就關掉。`close-empty` 另有一處 factory，不在「誰改」的 `ui.simulatePendingTx` 路徑 |
| `wallet/src/background/simulate/phase2-deltas.ts` | `value.err` → `outcome: "fail"`。`BlockhashNotFound` 會進這條。本版要求該 `fail` 畫在卡內 |
| `wallet/src/approval/cards/simulation-notice.ts` | `fail` 仍產出卡外「預計交易失敗」。`rpc`／`unparseable` 仍是另一張「無法模擬」。本版只搬走 `fail` |
| `wallet/src/approval/shell.ts` | `renderSignTransactionBody` 以 `signBody.innerHTML = ""` 重畫 notice、預期變動、交易費、明細。本版要求週期刷新只改預期變動內容區 |
| `wallet/src/approval/tx-ai-widget.ts` | 右上懸浮 pill。本版改成標題下單列；已定案禁止模擬刷新重掛 |
| `wallet/src/popout/index.html`、`wallet/src/popup/components/ApprovalHost.tsx` | 同一簽署殼。尚無 widget 下分隔線、尚無站點複製鈕。popup／popout／側欄共用殼，直向順序改一處即可。`signMessage` 走同一殼且沒有 AI，與 HOW 一致 |
| `dev-docs/design-demos/0.32.0/tx-ai-row-card-ux.html` | 方向稿。INDEX 已寫衝突時以 INDEX 與 HOW 為準 |
| `dev-docs/design-principles.md` 站點靠左 | 本版 INDEX 寫畫面句以 INDEX 為準，並明文推翻 0.30 站點靠左。不另記 HIGH |
| backlog durable nonce 提醒 | 本版非目標。不因為沒做提醒而判不可行 |

`dev-docs/brainstorm/` 與 `../solibra-wallet` 未當成已定案。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | 關閉 | INDEX 文件地圖第 6 點；已定案「過期時看見什麼」；HOW「模擬與交易費」；驗收「失效 blockhash」；HANDOFF 禁區 |
| M1 | MEDIUM | 關閉 | 已定案「交易費」；HOW「模擬與交易費」；驗收「尚無成對 CU 時…第一次得到成對 CU 時寫上…」 |
| M2 | MEDIUM | 關閉 | 已定案「其餘模擬參數」；HOW「模擬與交易費」；HANDOFF Track 1／starter |
| M3 | MEDIUM | 關閉 | 已定案「每 3 秒」；HOW「模擬與交易費」 |
| M4 | MEDIUM | 關閉 | 驗收「先模擬成功並顯示差額…」 |
| M5 | MEDIUM | 關閉 | 驗收 `zh-Hans` 條 |
| L1 | LOW | 關閉 | INDEX 文件地圖第 7 點 |
| L2 | LOW | 關閉 | 驗收長 origin 條；HOW「站點」「AI 單列」 |
| L3 | LOW | 關閉 | 已定案「AI 完成後」 |
| L4 | LOW | 仍開（非阻擋） | — |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-11 | 可行；門檻未過。未關 HIGH：H1 過期失敗的畫面位置。應修 M1–M5。HANDOFF 尚不存在。 |
| 第 2 輪複審 | 2026-10-11 | 可行，不是不可行。無未關閉 HIGH。H1、M2–M5、L1–L3 關閉。應修 M1 仍開（驗收未寫第一次成對 CU 寫上總額）。L4 非阻擋。門檻未過。HANDOFF 尚待規劃者補。 |
| 第 3 輪複審 | 2026-10-11 | 可行，不是不可行。無未關閉 HIGH。M1 關閉（驗收已寫第一次成對 CU 寫上總額）。L4 仍開且非阻擋。HANDOFF 含 paste-ready starter，Track 順序與 INDEX 一致。門檻通過。 |
