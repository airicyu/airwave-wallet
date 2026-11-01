# Airwave e2e

可重複劇本在 `scenarios/`。執行者是能操作 Chrome 的 agent（或人工），步驟見 [`.agents/skills/e2e-wallet/SKILL.md`](../../.agents/skills/e2e-wallet/SKILL.md)。

## Mock 資料

**執行期 mock 資料在本倉庫** [`test/e2e/fixtures/`](./fixtures/)（可編輯、已消毒的 response body）。`mock-server.mjs` 預設以該目錄為根（相對 mock 檔所在目錄的 `fixtures/`）。可選環境變數 `AIRWAVE_E2E_FIXTURES` 覆寫根目錄。消毒規則見 [`fixtures/README.md`](./fixtures/README.md)。

檔案：

- `jupiter/tokens-v2-search.json`
- `helius/address-transactions-page1.json`
- `helius/address-transactions-page2.json`
- `openrouter/chat-completions.json`
- `openrouter/decisions.json`

倉庫外的 `airwave-wallet-api-recording`（若有）只是 **capture 來源**：e2e **不要**改它，也不把它當 runtime mock store。要刷新 mock：從錄製 copy → sanitize → 替換 `test/e2e/fixtures/`。

開跑前先執行 preflight（硬失敗：Solana CLI 或缺上述五份 in-repo fixture；mock 未起或 `wallet/dist` 缺檔只警告）：

```text
bun run e2e-preflight
```

## 啟動順序

每一則劇本建議依此順序：

1. `bun run e2e-mock`（長駐）
2. `bun run e2e-validator`（**每則劇本重置**；不要沿用上一則帳本）
3. `bun run test-web`（長駐）
4. 載入本分支建置的未封裝擴充：`wallet/dist`（Chrome → 管理擴充功能 → 載入未封裝的項目）

```text
bun run e2e-mock
bun run e2e-validator
bun run test-web
```

Chrome 操作錢包殼時**優先用 Side panel**（先開工具列 popup，再切到側欄），不要直接開裸的 popout／approval URL。

解鎖密碼**永不**寫進倉庫、劇本或回報。密碼由執行端以 out-of-band 方式提供（例如操作者自己的 secrets／vault），解鎖時填入即可。

## 兩個本機服務

| 服務 | 位址 | 用途 |
| --- | --- | --- |
| `solana-test-validator` | `http://127.0.0.1:8899` | 錢包 Devnet RPC。每則劇本由 `bun run e2e-validator` 重置 |
| mock server | `http://127.0.0.1:8787` | Helius、Jupiter、OpenRouter，以及另一叢集的 `isBlockhashValid` |

Mock 的 `getLatestBlockhash` 固定回 `11111111111111111111111111111111111111111111`。只有這個 blockhash 的 `isBlockhashValid` 回 `true`，其餘回 `false`。

## 錢包設定（每則劇本開始前）

在 Side panel（或暫時的工具列 popup）設定：

- Cluster：Devnet（活動劇本除外）
- Devnet RPC：`http://127.0.0.1:8899`
- Mainnet 不設自訂 RPC
- Debug mode 開
- Mainnet blockhash RPC：`http://127.0.0.1:8787`
- 需要代幣名稱時，Jupiter API URL：`http://127.0.0.1:8787`
- 需要簽交易 AI 時，OpenRouter base URL：`http://127.0.0.1:8787`
- 活動劇本另把 Helius API URL 設成 `http://127.0.0.1:8787`

`test-web` 預設仍打公開 Devnet。劇本要加查詢參數：`http://127.0.0.1:5173/?rpc=http://127.0.0.1:8899`。Cluster 不符劇本再加 `&otherRpc=http://127.0.0.1:8787`。頁面 log 會印出實際使用的 RPC。
