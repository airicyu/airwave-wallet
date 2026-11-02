# Airwave e2e

可重複劇本在 `scenarios/`。執行者是能操作 Chrome 的 agent（或人工），步驟見 [`.agents/skills/e2e-wallet/SKILL.md`](../../.agents/skills/e2e-wallet/SKILL.md)。

## 兩種後端（不要混用）

| 角色 | 位址 | 負責什麼 |
| --- | --- | --- |
| `solana-test-validator` | `http://127.0.0.1:8899` | **Solana JSON-RPC**（餘額、airdrop、送交易、確認）。每則劇本用 `bun run e2e-validator` **重置**帳本，再用 `solana airdrop` 等把狀態準備好。 |
| mock server | `http://127.0.0.1:8787` | **外掛 HTTP only**：Helius 活動、Jupiter token search、OpenRouter AI，以及「另一叢集」的 `getLatestBlockhash` / `isBlockhashValid`。回應來自合成 fixture，見 [`fixtures/`](./fixtures/)。 |

不要把 Solana 主叢集 RPC mock 掉——那是 validator 的工作。不要把外掛 API 打到真網——那是 mock 的工作。

**執行期 mock 資料**在 [`fixtures/`](./fixtures/)（合成、可編輯）。可選 `AIRWAVE_E2E_FIXTURES` 覆寫根目錄。

開跑前：

```text
bun run e2e-preflight
```

## 啟動順序

1. `bun run e2e-mock`（長駐）
2. **每一則劇本**重新 `bun run e2e-validator`（`--reset`；不要沿用上一則帳本）
3. 依劇本 `solana airdrop … --url http://127.0.0.1:8899`
4. `bun run test-web`（長駐）
5. 載入本倉庫建置的未封裝擴充：`wallet/dist`

```text
bun run e2e-mock
bun run e2e-validator
bun run test-web
```

Chrome 優先 Side panel（工具列 popup → 側欄）。不要直接開裸的 popout／approval URL。

解鎖密碼永不寫進倉庫或劇本；由執行端 out-of-band 提供。

## Mock 固定 blockhash

Mock 的 `getLatestBlockhash` 固定回 `11111111111111111111111111111111111111111111`。只有這個 blockhash 的 `isBlockhashValid` 為 `true`（給 cluster 不符劇本用）。

## 錢包設定（每則劇本開始前）

- Cluster：Devnet（活動劇本除外）
- Devnet RPC：`http://127.0.0.1:8899`（validator）
- Mainnet 不設自訂 RPC
- Debug mode 開
- Mainnet blockhash RPC：`http://127.0.0.1:8787`（mock；僅外掛探針）
- 需要代幣名稱時，Jupiter API URL：`http://127.0.0.1:8787`
- 需要簽交易 AI 時，OpenRouter base URL：`http://127.0.0.1:8787`
- 活動劇本另把 Helius API URL 設成 `http://127.0.0.1:8787`

`test-web` 預設仍可能打公開 Devnet。劇本要加：`http://127.0.0.1:5173/?rpc=http://127.0.0.1:8899`。Cluster 不符再加 `&otherRpc=http://127.0.0.1:8787`。
