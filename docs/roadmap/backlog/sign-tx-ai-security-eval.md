# 簽署交易：AI 安全評估 — backlog

構想**尚未排程**，不是契約。曾排進 0.28.0（確定性旗標 → 一次 LLM 報告），**2026-10-10 撤排程**。錢包審批卡等到 [bubble-harness](./bubble-harness-runtime.md) 完成後**一次做完**（旗標下限 + 多輪唯讀分析），不要先出蓋印短文卡。

> 2026-10-08 對齊方向；2026-10-10 POC 與撤排程。  
> **不要**再開 0.28.0 實作審批卡，除非新的 INDEX 明文排程。

## 為何不先出「旗標＋一次短文」

`test-web/sign-risk.html` 已證明：沒有 tool loop 時，模型只是把本機 JSON／旗標編成白話。香港地區 Anthropic／OpenAI／Gemini 常不可用；Instruct（如 `moonshotai/kimi-k2-0905`）適合當文案，不適合作鑑識引擎。先把這張卡寫進設定與 catalog，harness 完成後多半要改觸發與文案，成本高過現在等。

現行出貨版本維持 [0.27.0](../0.27.0/INDEX.md)。POC 可留在 test-web 當研究，**不是**產品路徑。

與 harness 的分工（之後排版時再寫進 INDEX）：

| 層 | 職責 |
|----|------|
| 確定性 decode／旗標 | 可測下限（例如 `authority_change`、`unlimited_approve` 不得顯示低） |
| bubble-harness | 模型多輪呼叫唯讀 tool（decode、帳戶、模擬、token meta） |
| Chat | 只用工具結果寫短文；不准發明旗標或「這筆安全」 |

## 現況

簽署審批已有模擬差額、靜態 common ix decode（[0.19.0](../0.19.0/INDEX.md)），**沒有**簽名前安全掃描卡。Durable nonce 獨立 notice 仍見 [簽署交易 Durable Nonce 提醒](./sign-tx-durable-nonce-alert.md)。

POC：`test-web/sign-risk.html`（連線頁是 `test-web/index.html`）。可組樣本、貼 mainnet signature、經 Vite `/solana-rpc` 轉送 `getTransaction`／`getMultipleAccounts`、一次 OpenRouter chat。

## 硬約束（任一未來版本仍有效）

- 唯讀：公開鏈上／索引與待簽 payload；**不碰 vault、不代簽、不 auto-approve**。
- 數字與鏈上事實由程式產出；模型不當第一手資料源。缺資料標未知，不准寫成安全。
- 評估失敗或等級為高，都不禁用核准。

## 前 0.28.0 草案（撤排程，供之後 INDEX 擷取）

產品句當時是：簽署三種 kind 在核准前，SW 做確定性旗標；有 OpenRouter key 時問 Decisions 危害分；留意或高才短文。

當時已定案摘要（**不是**現行契約）：

- 只 `signTransaction`、`signAndSendTransaction`、`walletSend`。只在 service worker。與模擬並行，不寫 `workingTx`。
- 旗標只由本地規則產生，模型不增刪改名。`displayedSignRiskLevel`：模型分數、本地下限、資料是否齊全。缺資料不准顯示「低」。
- 白名單：System、Token、Token-2022、ATA、Compute Budget、Memo、Memo v1。其它 `unknown_program` 為 **info**，本身不抬級。
- `getMultipleAccounts` 用目前 `rpcUrl` 的 static keys，不讀 lookup table。Jupiter `tokens/v2/search` 最多 100 mint。
- Durable nonce：第一條 System `AdvanceNonceAccount`（u32＝4 且 data 恰 4 bytes）→ info 旗標，三點文案，不抬級、不禁用核准。
- Decisions：`liquid/d1` 只問 `harm`。短文當時寫死 `google/gemini-2.5-flash`（香港 POC 打不通；若再排程須改香港可用 Instruct，例如 Kimi K2 0905）。
- Key：`settings.openRouterApiKey` 在 `airwave.settings.v1`，不進 vault；`getState` 只附 `openRouterConfigured`。
- 命令草案：`ui.assessPendingTx`。不加 npm。金額用 `BigInt`。

旗標 id 草案：`unknown_program`、`durable_nonce`、`owner_mismatch`、`mint_mismatch`、`account_kind_mismatch`、`authority_change`、`mint_authority_active`、`freeze_authority_active`、`transfer_hook`、`permanent_delegate`、`scam_token`、`token_unknown`、`lookup_account_unchecked`、`token_2022_unparsed`。

POC 另驗證、未寫進當時 HOW：`unlimited_approve`（u64 最大）、`close_account_external`、`system_assign`、`create_account_with_seed`；指令帳戶應標 `ixRole`（source／delegate／owner）。Mint／餘額／既有授權來自 RPC，不是再 decode instruction。

權限指令（Token／Token-2022，長度與 disc 都要對）：Approve disc 4 長 9；ApproveChecked disc 13 長 10；SetAuthority disc 6 且新權限 COption＝1（總長 38）才標；CloseAccount disc 9 長 1 且 destination 不在 signer 集合。Revoke 不標。`authorityType`：0 MintTokens、1 FreezeAccount、2 AccountOwner、3 CloseAccount。

本地下限草案：`owner_mismatch`、`authority_change`、`mint_mismatch`、`account_kind_mismatch`、`scam_token` 至少高。

## 開工前仍須拍板（再排進 INDEX 時）

- 快路徑旗標卡是否還要、還是只在 harness 中高風險後出現。
- 短文模型（香港可用者）；是否仍用 Decisions。
- OpenRouter key 存放。
- 與 durable nonce notice、0.19.0 明細的 UI 疊加。
- `unlimited_approve` 是否獨立旗標。

## 非目標（構想層）

- 在 harness 可多輪查詢之前，把一次 LLM 蓋印當產品出貨
- Agent 代簽、auto-approve、以等級禁用核准
- 以模型臆造取代 RPC／規則事實
- 通用錢包內聊天、代操作 swap
- 掃 GitHub 當 IDL 或安全證明
