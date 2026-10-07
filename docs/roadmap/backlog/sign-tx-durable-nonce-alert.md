# 簽署交易：Durable Nonce 檢查並提醒 — backlog

構想尚未排進某版 INDEX，**不是契約**。排程後以該版 INDEX 為準。

## 現況

`signTransaction`／`signAndSendTransaction` 的審批（`wallet/src/approval/`）不會檢查交易是否使用 durable nonce，也不會為此另開提醒。

[0.10.0](../0.10.0/INDEX.md) 只處理模擬副作用：`simulateTransaction` 帶 `replaceRecentBlockhash: true`，durable nonce 的差額可能失真，落入 `fail`／`rpc`，不要把差額當可信。那條沒有告訴使用者「這筆交易用了 durable nonce」。

## 產品意向

審批畫出一筆未簽交易時，在 service worker 對 message 做靜態檢查。**第一條** instruction 是 System Program 的 `AdvanceNonceAccount`（instruction enum index `4`）時，判定這筆交易使用 durable nonce。

判定只看交易位元組裡的這條指令。不要為了核對 nonce 帳戶餘額或帳戶資料再打 RPC。第一條不是 `AdvanceNonceAccount` 時，鏈上不會把它當 durable nonce，後面出現同名指令不算。

判定為是時，審批畫面顯示一張提醒（沿用現有 notice 卡即可），文案要讓使用者知道三件事：

1. 這筆交易使用 durable nonce，不會像一般 recent blockhash 那樣在短時間內過期。
2. 交易落地會推進（消耗）該 nonce。
3. 畫面上的模擬差額在 `replaceRecentBlockhash` 下可能失真，不要單靠差額判斷。

提醒**不**把批准 disabled。拒絕維持可按。`signMessage` 不適用。

## 開工前仍須拍板（排進 INDEX 時）

- 文案用哪一種語文（目前審批畫面是中文；多語言見 [Wallet UI 多語言](./wallet-ui-i18n.md)）。
- 提醒放在模擬 notice 之上，還是與「無法模擬／預計交易失敗」同一張卡。

## 非目標（構想層）

- 改 0.10.0 的模擬參數、`replaceRecentBlockhash`，或為了 nonce 改跑另一套模擬
- 偵測到就禁用批准，或自動拒絕
- 建立、匯入、列出 nonce 帳戶，或代使用者組 `AdvanceNonce`
- 用 RPC 確認 nonce 帳戶資料與 message 裡的 blockhash 是否一致
- 宣告新的 Wallet Standard 方法
