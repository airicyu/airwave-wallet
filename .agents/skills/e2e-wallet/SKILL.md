---
name: e2e-wallet
description: >-
  Runs Airwave Wallet e2e scenarios in Chrome against a local solana-test-validator
  and the test/e2e mock server. Use when the user asks to run e2e, a scenario
  under test/e2e/scenarios, or to exercise the wallet with the local validator.
---

# Airwave e2e

劇本在 [`test/e2e/scenarios/`](../../../test/e2e/scenarios/)。服務怎麼起、錢包要設成什麼，以 [`test/e2e/README.md`](../../../test/e2e/README.md) 為準。

對使用者用繁體中文回報。不要把密碼、助記詞、API key 寫進劇本或回報。

## Mock 資料

執行期 mock 讀本倉庫 [`test/e2e/fixtures/`](../../../test/e2e/fixtures/)（可編輯、已消毒）。消毒規則見該目錄 `README.md`。可選 `AIRWAVE_E2E_FIXTURES` 覆寫根目錄。

倉庫外的 `airwave-wallet-api-recording`（若有）只是 capture 來源：e2e **不要**改它。要刷新 mock：從錄製 copy → sanitize → 替換 `test/e2e/fixtures/`。不要把未消毒錄製當 runtime store，也不要為了過劇本去改外部錄製樹。

## 開跑前

1. 執行 `bun run e2e-preflight`。硬失敗（`solana`／`solana-test-validator` 不在 PATH，或缺五份 in-repo fixture）就停，先修好再跑劇本。Mock 未起或 `wallet/dist` 缺檔是警告，可接著起服務或建置。
2. 載入未封裝擴充：Chrome → 管理擴充功能 →「載入未封裝的項目」→ 選本倉庫的 `wallet/dist`（須含 `manifest.json`）。
3. 打開錢包殼時**優先 Side panel**：先點工具列圖示開 popup，再在殼內切到側欄（sidebar）。**不要**直接開裸的 `popout`／`approval` URL。側欄開著時，連線與簽名核准會在側欄殼內；否則才會出現審批 popout 視窗。
4. 啟動 `bun run e2e-mock`，確認 `http://127.0.0.1:8787/health` 回 `ok: true`。
5. 每一則劇本單獨執行 `bun run e2e-validator`，等 RPC `http://127.0.0.1:8899` 可連。不要沿用上一則的帳本。
6. 啟動 `bun run test-web`。
7. 照 README 的「錢包設定」在 Side panel 設好。Mainnet 不要選自訂 RPC。
8. 領取測試 SOL 用 `solana airdrop`，URL 為 `http://127.0.0.1:8899`。

## 解鎖

解鎖密碼由執行端 out-of-band 提供（操作者自己的 secrets／vault）。需要解鎖時填入即可，**不要**讀寫密碼到劇本、截圖說明、或回報文字。

## 操作

- 只做該劇本寫的步驟。核准、拒絕、連線允許都在擴充功能殼內（Side panel）或另外打開的審批視窗裡，不在原本的網頁分頁。
- `test-web` 必須帶劇本寫的 `rpc` 與 `otherRpc`。Log 裡的 RPC 和劇本不一致就停止，不要繼續簽名。
- 簽名探針會打 Devnet RPC 與 Mainnet blockhash RPC。前者是驗證器，後者是 mock。Mock 只對它自己的固定 blockhash 回有效。
- 活動、Jupiter、OpenRouter 的回應來自 `test/e2e/fixtures`。要換資料時 sanitize 後改那裡的檔，再重跑 mock；不要改外部錄製目錄來湊過劇本。

## Alpenglow 與確認

本機 `solana-test-validator` 在 Alpenglow 後約 150ms 就會 finalize。錢包／劇本把「已確認」當成 finalized-only 即可，不必再等一段 confirmed 中間態。劇本 `01-devnet-sign-and-send` 仍核對 `test-web` **實際印出的** log：`Broadcast signature:` 與 `Confirmed:`（`test-web/src/main.ts` 在 `confirmed` 或 `finalized` 後都寫 `Confirmed:`，沒有改成 `Finalized:`）。

## 判定

劇本的「期望」每一條都要核對。通過時列出劇本檔名。失敗時寫哪一步和畫面上看到的文字。不要把沒跑的劇本書成通過。
