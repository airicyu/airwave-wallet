# Airwave e2e

可重複劇本在 `scenarios/`。執行者是雲端 Chrome 裡的 Grok bot，步驟見 [`.agents/skills/e2e-wallet/SKILL.md`](../../.agents/skills/e2e-wallet/SKILL.md)。

錄製與 fixture 不放在這個倉庫。預設讀取同層目錄 `airwave-wallet-api-recording`，或環境變數 `AIRWAVE_RECORDINGS`。

## 兩個本機服務

| 服務 | 位址 | 用途 |
| --- | --- | --- |
| `solana-test-validator` | `http://127.0.0.1:8899` | 錢包 Devnet RPC。每則劇本由 `bun run e2e-validator` 重置 |
| mock server | `http://127.0.0.1:8787` | Helius、Jupiter、OpenRouter，以及另一叢集的 `isBlockhashValid` |

```text
bun run e2e-mock
bun run e2e-validator
```

Mock 的 `getLatestBlockhash` 固定回 `11111111111111111111111111111111111111111111`。只有這個 blockhash 的 `isBlockhashValid` 回 `true`，其餘回 `false`。

## 錢包設定（每則劇本開始前）

- Cluster：Devnet（活動劇本除外）
- Devnet RPC：`http://127.0.0.1:8899`
- Mainnet 不設自訂 RPC
- Debug mode 開
- Mainnet blockhash RPC：`http://127.0.0.1:8787`
- 需要代幣名稱時，Jupiter API URL：`http://127.0.0.1:8787`
- 需要簽交易 AI 時，OpenRouter base URL：`http://127.0.0.1:8787`
- 活動劇本另把 Helius API URL 設成 `http://127.0.0.1:8787`

`test-web` 預設仍打公開 Devnet。劇本要加查詢參數：`http://127.0.0.1:5173/?rpc=http://127.0.0.1:8899`。Cluster 不符劇本再加 `&otherRpc=http://127.0.0.1:8787`。頁面 log 會印出實際使用的 RPC。
