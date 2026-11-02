---
name: e2e-wallet
description: >-
  Runs Airwave Wallet e2e scenarios in Chrome against a local solana-test-validator
  and the test/e2e mock server. Use when the user asks to run e2e, a scenario
  under test/e2e/scenarios, or to exercise the wallet with the local validator.
---

# Airwave e2e

劇本在 [`test/e2e/scenarios/`](../../../test/e2e/scenarios/)。服務與設定以 [`test/e2e/README.md`](../../../test/e2e/README.md) 為準。

對使用者用繁體中文回報。不要把密碼、助記詞、API key 寫進劇本或回報。

## 架構（務必分開）

- **`solana-test-validator`（`:8899`）**＝**Solana JSON-RPC**（餘額、airdrop、送交易、確認）。每則劇本 `bun run e2e-validator` 重置帳本，需要 SOL 時再 `solana airdrop … --url http://127.0.0.1:8899`。不要把這條 RPC mock 掉。
- **mock（`:8787`）**＝**外掛 HTTP only**（Helius 活動、Jupiter token search、OpenRouter AI、另一叢集的 blockhash 探針）。回應是合成 fixture，見 [`test/e2e/fixtures/`](../../../test/e2e/fixtures/)。不要打真網。

## Mock 資料（合成）

執行期讀 [`test/e2e/fixtures/`](../../../test/e2e/fixtures/)（可選 `AIRWAVE_E2E_FIXTURES` 覆寫）。檔案是手寫／產生的假資料，不是生產錄音。規則見該目錄 `README.md`。

- `jupiter/tokens-v2-search.json`
- `helius/address-transactions-page1.json`
- `helius/address-transactions-page2.json`
- `openrouter/chat-completions.json`（須含 `What This Transaction Does`）
- `openrouter/decisions.json`

## 開跑前

1. `bun run e2e-preflight`（缺 `solana`／`solana-test-validator` 或缺五份 fixture → 硬失敗）。
2. 載入未封裝擴充：`wallet/dist`。
3. 優先 Side panel（工具列 popup → 側欄）；不要開裸 popout／approval URL。
4. `bun run e2e-mock`，確認 `http://127.0.0.1:8787/health` 為 `ok: true`。
5. **每一則** `bun run e2e-validator`，等 `:8899` 可連；不要沿用上一則帳本。
6. `bun run test-web`。
7. 依 README「錢包設定」設好；Mainnet 不要設自訂 RPC。
8. 需要 SOL：`solana airdrop <額> <地址> --url http://127.0.0.1:8899`（不要用 test-web 預設公開 Devnet airdrop）。

## 解鎖

密碼由執行端 out-of-band 提供。不要寫進劇本或回報。

## 操作與判定

只做該劇本步驟。`test-web` 的 `rpc`／`otherRpc` 必須與劇本一致，否則停止。通過時列出劇本檔名；失敗寫步驟與畫面文字。不要把沒跑的劇本書成通過。

劇本 `01` 核對 test-web log 的 `Broadcast signature:` 與 `Confirmed:`（confirmed 或 finalized 後都印 `Confirmed:`）。

## Alpenglow 與確認

本機 `solana-test-validator` 在 Alpenglow 後約 150ms 就會 finalize。錢包／劇本把「已確認」當成 finalized-only 即可，不必再等一段 confirmed 中間態。