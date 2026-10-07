# 簽署交易：用 Kit 估算 compute units — backlog

已排進 [0.22.0](../0.22.0/INDEX.md)，**不是契約**。以該版 INDEX 為準。不在 [0.20.0](../0.20.0/INDEX.md)：該版只換庫，CU 規則維持 [0.11.0](../0.11.0/INDEX.md)。

## 現況

未簽交易第一次進審批時，service worker 做 phase 1：對**副本**把 compute unit limit 設成 1,400,000、price 設成 0，再 `simulateTransaction`，讀 `unitsConsumed`。建議 limit 仍是 `suggestedLimitFromPhase1`：`max(ceil(unitsConsumed × 1.1), 原 SetComputeUnitLimit 若有)`，再 clamp。模擬失敗或沒有 `unitsConsumed` 時，沿用 0.11.0 的 fallback（有原 limit 就用它，否則 builtin 表加總後 `ceil(sum × 1.25)`）。

這段探針在 `wallet/src/background/simulate/sign-tx-simulate.ts`。phase 1 副本不得寫入 `workingTx`。優先費單價仍是 Settings 的 Default CU price，不是 dApp 原來的 price。差額主舞台仍是 phase 2。

## 產品意向

只替換「把 limit 拉滿去模擬、讀出實際消耗」這一步。改用 Kit 的 `estimateResourceLimitsFactory`（`@solana/kit`）對同一份待估 message 做這次模擬，拿它回傳的 compute units 當現在的 `unitsConsumed`。

建議 limit 的公式、失敗 fallback、phase 1 不進 `workingTx`、Default CU price、phase 2 差額、使用者套用 CU、已簽不改 instruction，都維持 0.11.0。不要改用 `estimateAndSetResourceLimitsFactory` 把模擬原值直接寫回 message：那個寫入不乘 1.1、也不會在已有 limit 時改成 `max(消耗 × 1.1, 原 limit)`。

RPC 仍是當下 Settings 的 `rpcUrl`。不新增 command，不改 `chrome.storage`。

## 開工前仍須拍板（排進 INDEX 時）

- Kit 回傳的是 compute units 整數，還是還帶 loaded accounts data size。本項只用 compute units。v0 交易不要為了這個 factory 改去設 v1 的 loaded accounts data size。
- 模擬失敗時 factory 丟錯還是回空。無論哪種，建議 limit 仍走現有 fallback，不要改公式。

## 非目標（構想層）

- 改 0.11.0 的建議 limit、fallback、費用公式或審批畫面
- 用這個 factory 當「收回空帳戶」的 CU。那項要用一次量出的常數乘 1.1，不對每一筆再模擬
- 改差額模擬、靜態指令解讀、Inspector
- 宣告新的 Wallet Standard 方法
