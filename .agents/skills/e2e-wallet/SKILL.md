---
name: e2e-wallet
description: >-
  Runs Airwave Wallet e2e scenarios in Chrome against a local solana-test-validator
  and the test/e2e mock server. Use when the user asks to run e2e, a scenario
  under test/e2e/scenarios, or to exercise the wallet with the local validator.
---

# Airwave e2e

劇本在 [`test/e2e/scenarios/`](../../../test/e2e/scenarios/)。服務怎麼起、錢包要設成什麼，以 [`test/e2e/README.md`](../../../test/e2e/README.md) 為準。錄製檔在錢包倉庫外面，不要複製進這個倉庫。

對使用者用繁體中文回報。不要把密碼、助記詞寫進劇本或回報。

## 開跑前

1. 這台機器上的擴充功能是本次要測的那個未封裝目錄（通常是 `wallet/dist`）。
2. 啟動 `bun run e2e-mock`，確認 `http://127.0.0.1:8787/health` 回 `ok: true`。
3. 每一則劇本單獨執行 `bun run e2e-validator`，等 RPC `http://127.0.0.1:8899` 可連。不要沿用上一則的帳本。
4. 照 README 的「錢包設定」在 popup 設好。Mainnet 不要選自訂 RPC。
5. 領取測試 SOL 用 `solana airdrop`，URL 為 `http://127.0.0.1:8899`。

## 操作

- 只做該劇本寫的步驟。核准、拒絕、連線允許都在擴充功能另外打開的視窗裡，不在原本的網頁分頁。
- `test-web` 必須帶劇本寫的 `rpc` 與 `otherRpc`。Log 裡的 RPC 和劇本不一致就停止，不要繼續簽名。
- 簽名探針會打 Devnet RPC 與 Mainnet blockhash RPC。前者是驗證器，後者是 mock。Mock 只對它自己的固定 blockhash 回有效。
- 活動、Jupiter、OpenRouter 的回應來自錄製 fixture。不要改那些檔來湊過一則劇本；要換資料時改錄製目錄的 fixture，再重跑 mock。

## 判定

劇本的「期望」每一條都要核對。通過時列出劇本檔名。失敗時寫哪一步和畫面上看到的文字。不要把沒跑的劇本書成通過。
