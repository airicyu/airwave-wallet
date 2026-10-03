# HANDOFF — 0.7.0

## 讀檔順序

1. 倉庫根 [AGENTS.md](../../../AGENTS.md)、[docs/roadmap/GUIDELINES.md](../GUIDELINES.md)
2. [INDEX.md](./INDEX.md)
3. [docs/token-holdings-how.md](./docs/token-holdings-how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 0.5.0 combined-how（owners 串行）；0.4.0 token-data-how（佇列，DAS 段作廢）

## 產品摘要

有 Helius query key + mainnet → Wallet Balances 管 SPL；native／wSOL 仍走 rpcUrl 分列。否則整表 RPC。native 第一、有 wSOL 第二（Wrapped SOL／wSOL）。Jupiter 不改這兩列 name／symbol。不要 getAssetsByOwner。

## Track

1 RPC → 2 Wallet API → 3 Jupiter 名稱

## 禁區

GUIDELINES；勿把真實 api-key 寫進文件；popup 不直連。

## Paste-ready starter prompt

```text
只認檔案，不認 chat history。先讀 AGENTS.md、docs/roadmap/GUIDELINES.md、docs/roadmap/0.7.0/HANDOFF.md、INDEX.md 與其連結的 HOW 與 reasoning。跟 Track 順序：RPC Token-2022 → Wallet Balances → Jupiter 名稱。禁非目標。不要改 ../solibra-wallet。INDEX 已定案不要再問；沉默才提問，沉默時仍守 GUIDELINES 架構禁區。

可解析 api-key（或 apiKey）且 cluster 為 mainnet 才打 https://api.helius.xyz Wallet Balances（SPL）。native 與 wSOL 用 rpcUrl 拆開：getBalance + token accounts。不要 getAssetsByOwner。native-sol 永遠第一（Solana／SOL）；有 wSOL 則第二（Wrapped SOL／wSOL）。Jupiter 不可把 wSOL 的 symbol 改成 SOL。不要 commit。
```

## 完成檢查

- [x] INDEX 狀態 `shipped`（2026-10-03；`npm run build` 通過；驗收已勾）
- [x] [`changelog.md`](../../../changelog.md)、[`version.md`](../../../version.md)、`wallet/package.json` → `0.7.0`
- [x] 本版無獨立 backlog 檔（見 INDEX）
