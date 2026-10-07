# 簽署交易：AI 安全評估（預先收集 context → Decisions → 必要時 chat）— backlog

構想尚未排進某版 INDEX，**不是契約**。排程後以該版 INDEX 為準。

> 2026-10-08 與 Airwave Wallet PM 對談對齊的方向草案。  
> **暫不做** bubble-harness／sandbox agent loop；先以 wallet 側確定性 pipeline + OpenRouter 為主。

## 現況

簽署審批已有模擬差額、靜態 common ix decode（[0.19.0](../0.19.0/INDEX.md)）等輔助，但**沒有**系統化的「簽名前安全掃描」：不明 program、可疑 token、假 ATA／owner、authority 變更、durable nonce 風險等，仍靠使用者自行解讀。

Durable nonce **純本地提醒**另見 [簽署交易 Durable Nonce 提醒](./sign-tx-durable-nonce-alert.md)（不擋批准、不打 RPC）。本項是更大一層的 **AI 輔助風險評估**，可與該提醒並存。

## 產品意向（源頭：錢包簽名前安全查詢）

優先服務：**signTransaction／signAndSendTransaction 審批前**，判斷這筆未簽交易是否有害。持倉白話、通用聊天等次要，暫不排。

硬約束：

- **唯讀**：只查公開鏈上／索引資料與待簽 payload；**不碰 vault／私鑰、不代簽、不 auto-approve**。
- **真相分層**：數字與鏈上事實由**程式確定性**產出；模型只做分類／白話，不當第一手資料源。缺資料標「未知」，不准瞎猜「安全」。

### Pipeline（建議順序）

1. **本地 decode**  
   把待簽 message／tx（可 mask 簽名位元後的 raw bytes）解成結構化 parsed tx：accounts、ix、programId、signer／writable 等。本地 script，幾乎零網路成本。

2. **Program 規則（本地）**  
   - Whitelist：System、Token、Token-2022、ATA、常見 DEX／lending 等 → 標已知。  
   - Unknown program：**不 eager 深挖**；列出「未知 program」旗標即可（深度說明留給中高風險後的 chat／之後版本）。

3. **Token 資訊（批次）**  
   交易涉及的 mint 一次查 [Jupiter Token Information](https://developers.jup.ag/docs/tokens/token-information)（最多約 100 mint／次）。

4. **Account 狀態（批次 RPC／Helius）**  
   Tx 內帳戶用 **`getMultipleAccounts`**（或 Helius 同等）一批查；核對 token account 的 **真實 owner／mint**（防「看起來像你的帳戶、owner 不是你」類騙案）。不必逐個串行。

5. **Token／權限規則旗標（確定性）**  
   對涉及 mint／帳戶跑規則，產出 pattern flags，例如：mint／freeze authority 仍在、transfer hook、凍結、holder／流動性異常（深度項可降級／逾時）、durable nonce（第一條 `AdvanceNonceAccount`）等。  
   規則與常見手法 checklist 蒸餾成**固定本地 markdown**，當 system／base context（省 token、可測）。

6. **OpenRouter Decisions API（快篩）**  
   把上述 context 當 `state`，問 typed questions，回傳：  
   - **風險等級／指數**  
   - **風險 tags**（你們定義的 flag model：`durable_nonce`、`scam_token`、`unknown_program`、`authority_change`、`owner_mismatch`…）  
   Decisions／System One（如 `liquid/d1`、`typesafe/jev-*`）**不產人話**，適合便宜快篩。Context 用精簡 JSON + 固定 checklist，一般遠低於 32k／65k。

7. **僅中高風險再打 chat LLM**  
   中高風險才 call 一般 chat 模型做詳細白話解讀；低風險可只顯示規則旗標／短提示。  
   **不需要 bubble harness**：查詢全在簽名前確定性 pipeline；agent 端可先是一次 Decisions（+ 條件式一次 chat）。

### Wallet vs「模型端」分工

| 區塊 | 誰做 |
|------|------|
| Decode、whitelist、batch RPC／Jupiter、規則 flags、組 context、OpenRouter key（host） | **Wallet／SW（或受控 bridge）** |
| Decisions 分類；必要時 chat 白話 | **模型 API**（非 sandbox harness） |
| 批准／拒絕 | **僅使用者 + wallet core** |

## 開工前仍須拍板（排進 INDEX 時）

- 第一版 risk tag／規則旗標名單與嚴重程度對應。  
- Decisions 用哪個 model id；中高風險門檻與是否可設定。  
- Chat 模型與輸出格式（審批 UI 卡片 vs 展開面板）；文案語文。  
- Jupiter／Helius／RPC 失敗或逾時時的降級（仍允許批准？只顯示「評估不完整」？）。  
- 與 [Durable Nonce 提醒](./sign-tx-durable-nonce-alert.md)、[ix decode](./sign-transaction-ix-decode.md) 的 UI 疊加方式。  
- OpenRouter API key 存放與是否允許使用者自備 key。

## 非目標（構想層）

- 本版導入 bubble-harness／MCP stdio／sandbox agent tool loop  
- Agent 代簽、auto-approve、或禁用批准當預設  
- 以模型臆造取代 RPC／規則事實  
- 通用錢包內 AI 聊天產品、代操作 swap  
- 掃 GitHub／任意開網當 IDL 或「安全證明」唯一來源  
