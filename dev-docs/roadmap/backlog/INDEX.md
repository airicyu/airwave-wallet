# Backlog 目錄

這裡是構想清單，**不是契約**。排進某版之後以該版 `INDEX.md` 為準。出貨後刪該列與對應 `.md`。

新項目：在本目錄加一列，並寫 `backlog/<名稱>.md`。

## 未排程

| 項目 | 說明 |
|------|------|
| [版本升級與 storage 遷移](./storage-migration.md) | [0.26.0](../0.26.0/INDEX.md) 已蓋第 1 代戳；之後形狀變更仍走具名世代步驟 |
| [SNS `.sol` 名稱解析](./sns-name.md) | 送出時把 `XXX.sol` 解成收款地址；不寫進地址簿 |
| [錢包帳戶指定頭像](./account-avatar.md) | 每個錢包帳戶可設一張 icon；沒設則維持現況 |
| [交易 AI 分析模型備援](./tx-ai-model-fallback.md) | 所選模型不可用時改打備援；承接的模型要看得到 |
| [簽署交易 Anchor IDL 解析](./sign-transaction-ix-decode.md) | 靜態 common parser 已於 [0.19.0](../0.19.0/INDEX.md) 出貨；鏈上／metadata IDL 層仍未排程 |
| [簽署交易 Durable Nonce 提醒](./sign-tx-durable-nonce-alert.md) | 審批時若第一條是 System `AdvanceNonceAccount`，提醒這筆用了 durable nonce；不擋批准 |
