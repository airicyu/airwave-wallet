# Backlog 目錄

這裡是構想清單，**不是契約**。排進某版之後以該版 `INDEX.md` 為準。出貨後刪該列與對應 `.md`。

新項目：在本目錄加一列，並寫 `backlog/<名稱>.md`。

## 未排程

| 項目 | 說明 |
|------|------|
| [版本升級與 storage 遷移](./storage-migration.md) | [0.26.0](../0.26.0/INDEX.md) 已蓋第 1 代戳；之後形狀變更仍走具名世代步驟 |
| [聚合錢包帳戶送出代幣](./send-token-combined.md) | 從目前可簽成員送；可動用≠加總；不含歸集。單一可簽送出已於 [0.12.0](../0.12.0/INDEX.md) 出貨 |
| [錢包地址簿](./address-book.md) | 名稱＋地址白名單；送出可選，仍可手貼 |
| [簽署交易 Anchor IDL 解析](./sign-transaction-ix-decode.md) | 靜態 common parser 已於 [0.19.0](../0.19.0/INDEX.md) 出貨；鏈上／metadata IDL 層仍未排程 |
| [簽署交易 Durable Nonce 提醒](./sign-tx-durable-nonce-alert.md) | 審批時若第一條是 System `AdvanceNonceAccount`，提醒這筆用了 durable nonce；不擋批准 |
| [簽署交易 AI 安全評估](./sign-tx-ai-security-eval.md) | 未排程。0.28.0 已撤。等 bubble-harness 再排審批卡。POC：`test-web/sign-risk.html` |
| [bubble-harness 多輪查詢 runtime](./bubble-harness-runtime.md) | 隔離 query-only JS harness；host 注入唯讀 tool。錢包評估卡排在本項之後 |
