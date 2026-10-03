# HANDOFF — 0.5.0

實作前：0.3.0、0.4.0 均 shipped。建議設計審查閘門（除非使用者明示跳過）。

## 讀檔順序

1. [INDEX.md](./INDEX.md)
2. [docs/combined-how.md](./docs/combined-how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. 0.4.0 token-data-how、0.3.0 popup-shell-how、0.2.0 accounts／disconnect HOW

## 產品摘要

Combined = 地址集合 + 目前錢包；加總餘額；展開列只列餘額>0 的成員；連線綁 combined id；schema 為聯合型別、ACCOUNT_EXISTS 不含 combined；簽名取 signing 列 id、鎖定為 WALLET_LOCKED；刪真實目前錢包 → runtime read-only；不可移除最後一個成員。

## Track

1 → 2 → 3 → 4

## 禁區

GUIDELINES；勿改 `../solibra-wallet`；勿巢狀 combined；真實密鑰不進文件。

## 完成檢查

- [x] 驗收全勾；INDEX `shipped`（2026-10-03）
- [x] changelog 0.5.0 條目（見 [`changelog.md`](../../../changelog.md)）
- [x] backlog `combined-wallet-account.md` 已刪
- [ ] Do not commit unless asked

---

## Paste-ready starter prompt

```text
你是 Airwave Wallet 實作 agent。倉庫根。繁體中文。只認檔案。
讀 AGENTS.md、GUIDELINES.md、docs/roadmap/0.5.0/HANDOFF.md、INDEX.md、docs/combined-how.md、docs/reasoning.md，以及 0.4.0／0.3.0／0.2.0 相關 HOW。
確認 0.3.0 與 0.4.0 已 shipped。INDEX → in progress。Track 1→4。
Combined subs 永遠 ≥1；移除最後一個 sub 必須失敗。刪 storage 真實 main 後地址留在 combined、runtime read-only、不自動改 main。
Combined 為判別聯合，禁止用 combined.publicKeyBase58 當暴露公鑰。ACCOUNT_EXISTS 只比 signing+watch。取鑰用 signing accountId，禁止 getKeypair(combined.id)。鎖定可簽目前錢包 → WALLET_LOCKED。廢除 owners 長度 1 守衛。任一 owner 失敗整輪失敗。
不要 commit 除非使用者要求。不要改 ../solibra-wallet。
```
