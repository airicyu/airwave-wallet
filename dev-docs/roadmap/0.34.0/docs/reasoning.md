# 0.34.0 — 為何 preflight 進 prompt、而非讓模型自己 call tool

## 問題

[0.30.0](../../0.30.0/INDEX.md) 的 sandbox loop 預設路徑是：第一輪 LLM → `decode_message`（內含 decode + `getMultipleAccounts`）→ 再來 simulate／更多 RPC → 寫報告。每輪 LLM 經 offscreen bridge，常見 **3～15s** 僅第一輪；且 loop 結束後 SW 再跑一次 `enrichFlags` 定級，**重複** `getMultipleAccounts`。

審批自 [0.32.0](../../0.32.0/INDEX.md) 起用交易自己的 blockhash 模擬，畫面可先 `BlockhashNotFound`，但 AI tool 仍 `replaceRecentBlockhash: true`，分析與使用者所見脫節，且 loop 可拖到 wall timeout。

## 決策

1. **Host 先算好再問模型** — decode、simulate（與審批同參數）、token 來源 accounts 各一次，寫進 **initial user message**。省掉「只為了 decode 的第一輪 LLM」與 loop 內重複 RPC。
2. **從 tool 列表只拿掉 `decode_message`、`simulate`** — 省掉第一輪 decode／舊參數 simulate；**保留** `get_accounts`、`rpc_get_multiple_accounts` 與其他 `rpc_*`，避免分析只能照抄預檢、無法追連帶帳戶。
3. **定級重用 preflight flags** — 與報告依據同一套 enrich，避免第二次 owner 讀取。
4. **AI 與審批 blockhash 失效解耦** — 預期變動顯示 `BlockhashNotFound` 時，AI 仍完成報告；使用者可先讀分析，再由 dApp 重送新交易。不因審批模擬失敗而中止 assess。

## 否決

| 方案 | 原因 |
|------|------|
| 只縮短 `TX_AI_WALL_MS` | 不加快成功路徑，只提早 timeout |
| preflight simulate 仍 `replaceRecentBlockhash: true` | 與審批畫面不一致，blockhash 過期時 AI 仍「成功」 |
| 完全移除所有 RPC tool | 少數交易仍需 `getTransaction` 等；保留可選 |
| 審批 simulate 結果當 preflight 唯一來源 | CU 草稿、workingTx 與時序複雜；本版允許多打一次同參數 simulate |
| blockhash 失效時中止或覆寫 AI | 與「先讀報告、稍後再簽」衝突；審批卡已表達無法送出 |
