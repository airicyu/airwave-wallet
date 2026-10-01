# HANDOFF — 0.4.0

**依賴：** [0.3.0](../0.3.0/INDEX.md) 應已 shipped（方案 A 卡片 + `HomeTokenRow`）。若 0.3.0 未完成，不要開始本版實作。

實作前建議跑 roadmap-version 設計閘門（除非使用者明示跳過）。

## 讀檔順序

1. [INDEX.md](./INDEX.md)
2. [docs/token-data-how.md](./docs/token-data-how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. [0.3.0 popup-shell-how](../0.3.0/docs/popup-shell-how.md)
5. 有則讀 design-review（非契約）

## 產品摘要

Settings：Helius URL + 選填 Jupiter key。SW 查 DAS（名稱／icon／底價）後，mainnet Tokens v2 只補勾／分數並可覆寫 USD。不打 Price v3。

## Track 順序

1 → 2 → 3 → 4

## 禁區

- 非目標見 INDEX
- 真實 API key 不進 git／roadmap
- content 不轉發 getHomeTokens
- 餘額不寫 chrome.storage 當真相
- 勿改 `../solibra-wallet`

## 完成檢查

- [x] INDEX 狀態 `shipped`（使用者 2026-10-02 接受現狀凍結 0.4.0）
- [ ] INDEX 部分手驗勾仍空（Settings／Jupiter 覆寫／排序）— 不當成未完成擋下一版，本機可再補驗
- [x] version 0.4.0
- [x] 連線審批不展示 `silent`；test-web 不重複訂 `change`
- [ ] Do not commit unless asked

**下一版：** Combined → [0.5.0](../0.5.0/INDEX.md)（使用者未點名則不要開工）。

---

## Paste-ready starter prompt

```text
你是 Airwave Wallet 實作 agent。工作目錄：airwave-wallet 倉庫根。繁體中文書面語。

只認檔案。先讀 AGENTS.md、docs/roadmap/GUIDELINES.md、docs/roadmap/0.4.0/HANDOFF.md、INDEX.md、docs/token-data-how.md、docs/reasoning.md、docs/roadmap/0.3.0/docs/popup-shell-how.md。

確認 0.3.0 已 shipped。INDEX 改 in progress。Track 1→4。
Helius URL 空則 SW 走 RPC fallback；有則 DAS 分頁串行。mainnet 打 Tokens v2 search（≤100 mint／批）。無 key＝不帶 header、批間隔 ≥2s（keyless 0.5 rps）；有 key＝帶 x-api-key、間隔 ≥1s（按 Free 1 rps 保守）。不打 Price v3。Jupiter 不覆寫名稱／icon。devnet 不打 Jupiter。
TTL 命中只回快取一次，不第二次交貨。快取鍵含 jupiterApiKey。wallet.getHomeTokens 僅擴充頁。
不要 commit 除非使用者要求。不要改 ../solibra-wallet。不要把真實 API key 寫進文件。
```
