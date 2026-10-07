# HANDOFF — 0.20.0

## 讀檔順序

1. 倉庫根 [AGENTS.md](../../../AGENTS.md)、[docs/roadmap/GUIDELINES.md](../GUIDELINES.md)
2. [INDEX.md](./INDEX.md)
3. [docs/kit-migration-how.md](./docs/kit-migration-how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 行為勿偏：0.9.0／0.10.0／0.11.0／0.12.0／0.17.0／0.19.0 的 INDEX（本版只換庫）

## 產品摘要

Solana 棧全轉 Kit；使用者可見行為與 0.19.0 相同。出貨零 `@solana/web3.js`、零 `@solana/compat`。Vault schema 不變。

## Track

1 依賴＋accounts／seed-derive／sign-message-tx＋message 判定（不要求整包 typecheck）→ 2 session／簽署／inject／`wallet-finish-send` 整檔（簽＋廣播）→ 3 home-tokens **兩檔**＋模擬 CU begin-send → 4 test-web 掃尾 build → 5 手驗（含 CU／Inspector）

## 禁區

不改畫面與產品語意。不做清空帳戶。inject 不持鑰、不建 Kit RPC client。unlocked 不得早於 signer 就緒。不要改 `../solibra-wallet`。文件不寫真實秘密。不要 commit。

## Paste-ready starter prompt

```text
只認檔案，不認 chat history。先讀 AGENTS.md、docs/roadmap/GUIDELINES.md、docs/roadmap/0.20.0/HANDOFF.md、INDEX.md、docs/kit-migration-how.md、docs/reasoning.md。跟 Track 1→5。禁非目標。INDEX 已定案不要再問；沉默才提問；沉默時仍遵守 GUIDELINES 架構禁區。全轉 @solana/kit 與 HOW 允許的 program／plugin；出貨刪 @solana/web3.js 與 @solana/compat。行為與 0.19.0 相同。Vault 仍 bs58 64-byte secrets。隨機帳戶用 CSPRNG seed 非 web3 Keypair.generate。RPC 用 Settings rpcUrl。wallet-finish-send 整檔（簽＋廣播）在 Track 2。交易當訊息＝Kit message codec round-trip 全長。0.19 解讀仍手寫精確長度。begin-send 用 program 套件但批准前不上鏈。inject 無 client／無密鑰。不要改 ../solibra-wallet。不要 commit。
```

## 完成檢查

- [x] INDEX 驗收 checklist（手驗：使用者 2026-10-07 確認）
- [x] changelog／version／package.json／manifest 對齊 0.20.0（lockfile 根 version 亦已對齊）
- [x] INDEX 狀態 `shipped`（使用者 2026-10-08 同意出貨）
- [x] 本版無對應 backlog 列可刪（Kit 遷移非 backlog 項）；清空帳戶仍留 backlog
