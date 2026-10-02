# HANDOFF — 0.7.0

## 讀檔順序

1. [INDEX.md](./INDEX.md)
2. [docs/token-holdings-how.md](./docs/token-holdings-how.md)
3. 0.5.0 combined-how（owners 串行）；0.4.0 token-data-how（佇列，DAS 段作廢）

## 產品摘要

有 Helius query key + mainnet → Wallet Balances。否則 RPC（Token+2022）。Jupiter 覆寫名稱／icon／價／勾。不要 `getAssetsByOwner`。

## Track

1 RPC → 2 Wallet API → 3 Jupiter 名稱

## 禁區

GUIDELINES；勿把真實 api-key 寫進文件；popup 不直連。

## Paste-ready starter prompt

```text
讀 docs/roadmap/0.7.0/INDEX.md 與 token-holdings-how.md。把 getAssetsByOwner 主路徑換成 Wallet Balances；RPC 加 Token-2022；Jupiter 覆寫 name/symbol/icon。不要 commit。
```
