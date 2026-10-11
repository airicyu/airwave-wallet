# 0.32.0 — 簽署頁怎麼排

契約在 [INDEX](../INDEX.md)。概念稿 [`dev-docs/design-demos/tx-ai-row-card-ux.html`](../../../design-demos/tx-ai-row-card-ux.html) 只供對位置，句子衝突時以 INDEX 為準。

## 直向順序

審批 popout、側欄／popup 的 dApp 審批、錢包送出確認，由上到下：

1. 帳戶 widget（hug 寬、靠左；與現況相同）
2. 滿寬分隔線
3. 站點列（置中）：方角卡＋右側複製鈕
4. 標題「簽署交易」（置中）
5. AI 單列卡（僅分析開關 on 且 key 非空，且 kind 是 `signTransaction`／`signAndSendTransaction`／`walletSend`）
6. 預期變動
7. 交易費
8. 交易明細
9. 殼底拒絕／批准

`signMessage` 沒有第 5 項，也不跑每 3 秒模擬。若它共用這個殼且 widget 不在 Home 頂欄，仍有第 2、3 項。

## 站點

- 卡內是標籤＋值同一列。圓角 `--radius-sm`。
- 值用單行省略。複製的字串是 pending 的 origin 原文。
- 複製成功：該圖示約 1.6 秒改為勾，不插入說明句。
- 新文案走 `wallet/src/shared/ui-messages.ts`（複製鈕的 `aria-label`：繁「複製站點」、簡「复制站点」、英 `Copy site`）。

## AI 單列

- 左側 **bot** 圖示（`--text-muted`，不跟等級變色）＋ catalog：繁／簡「AI分析」，英 `AI analysis`。
- 分析中：卡底一條無百分比的來回條；右側 catalog：繁／簡「AI 分析中」、英 `Analyzing`（`--text-dim`）。不放風險指數、無 report 鈕。卡不是按鈕。
- 結束後拿掉進度條。
- **逾時或單次 LLM 過慢**（`error` 且 `message` 為 `timeout` 或 `bridge_timeout`）：右側「分析逾時」／`Timed out`；`data-level=failed`、灰字；**無** report 鈕、不開空白 overlay。牆鐘 **60s**；sandbox 單次 chat／tool 往返 **55s**（`TX_AI_WALL_MS`／`TX_AI_LLM_BRIDGE_MS`）。
- **其他失敗**（`error` 其餘 `message`）：右側「分析沒有完成」／`Analysis did not finish`；同上無 report 鈕。**若已有 report 正文**（罕見）仍保留 report 鈕與 overlay。
- **成功定級**（`done`）右側 catalog：
  - 低／留意／高：「風險指數: …」／`Risk index: …`
  - 未知（資料不足或 Decisions 失敗，**但不是**上面的 `error`）：「風險指數: 未知」／`Risk index: Unknown`
- 「風險指數」文字顏色：低 `--ok`、留意現有留意色、高 `--danger`、未知 `--text-dim`。失敗列不走風險色。左 bot 與 report 圓钮不按等級上色；report 為實心 `--accent` 圓钮。
- 只有 **有正文時** report 圓钮開 overlay；整卡不可點，不重跑。overlay 標題下固定免責一句（catalog `approval.txAi.reportDisclaimer`，非 AI 生成）。底列向上圖示捲回頂，畫面不寫「回到頂部」句子。
- 模擬刷新不得拆掉這張卡，也不得重設進度條或風險指數。

## 模擬與交易費

- 審批路徑每一次 `simulateTransaction`（phase 2，以及 phase 1 若打同一個 method，含 `estimateResourceLimitsFactory` 內部送出的那次）省略 `replaceRecentBlockhash` 或明確 `false`。AI tool 呼叫處仍傳 `true`。
- 預期變動的內容區是唯一會被每 3 秒模擬換掉的區塊，含 `fail`：不再在卡外插「預計交易失敗」notice。重新整理與 Inspector 兩顆節點在卡建立時就在。重新整理鈕停用時，該拍不送。
- 交易費數字的計算維持 INDEX 的簽名費＋優先費公式，來源是交易與 CU 欄位，不是模擬 JSON。尚無成對 CU 時總額為「估計中」。第一次得到成對 CU 時寫上總額；之後的模擬刷新不改這段文字。
