# bubble-harness：多輪唯讀查詢 runtime — backlog

構想尚未排進某版 INDEX，**不是契約**。排程後以該版 INDEX 為準。

> 2026-10-10：產品排程見 **[0.30.0](../0.30.0/INDEX.md)**——本倉抄 loop、**真 sandbox**、host 代打 LLM／Decisions。  
> POC：`test-web/sign-risk.html`。詳見 [bubble-harness-handoff](./bubble-harness-handoff.md)。

## 現況

- **POC**：vendored bubble-harness 多輪 tool；研究用。
- **產品（0.30.0）**：不依賴 npm 套件出貨；所需 source 進 `wallet/`，sandbox 跑 loop。旁倉 [airicyu/bubble-harness](https://github.com/airicyu/bubble-harness) 當參考。

## 產品意向

做一個**隔離、query-only、無 `chrome.*`** 的瘦 JS agent harness（黑盒 mini runtime）：

- Host（之後才是 wallet SW／offscreen／sandbox）只注入**唯讀**手腳，例如：`decode_message`、`get_accounts`、`simulate`、`token_meta`、可選由 host 代打的 `llm.chat`。
- 模型可多輪：decode → 見 Approve／SetAuthority → 再拉 token account／mint → 必要時補查 Jupiter／模擬。
- **不碰 vault、不代簽**。
- Session KV 預設 memory-only。MCP 先不做 stdio。

Decode 與 RPC **執行**仍在宿主；harness 讓模型決定下一步查什麼。神經網不當 binary codec。

## 開工前仍須拍板（排進 INDEX 時）

- 第一版 host tool 合約（名稱、參數、allowlist、逾時／max steps）。
- 先在 test-web／Node 驗證 loop，再進 extension。
- 審批 UI 觸發點（手動「深入分析」vs 中高風險才跑；**不要**把十輪推理塞進每次簽名的同步路徑）。
- Instruct 模型（香港可用者，少 thinking quota）。
- 確定性旗標是否仍作畫面下限。

## 非目標（構想層）

- 第一天就把 harness 綁死進每筆簽署的同步阻塞路徑
- Agent 讀 vault、代簽、auto-approve
- 桌面 `npx`／stdio MCP 進擴充
- 通用任意 shell／filesystem tools
