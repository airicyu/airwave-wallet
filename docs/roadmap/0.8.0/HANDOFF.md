# HANDOFF — 0.8.0

## 讀檔順序

1. 倉庫根 [AGENTS.md](../../../AGENTS.md)、[docs/roadmap/GUIDELINES.md](../GUIDELINES.md)
2. [INDEX.md](./INDEX.md)
3. [docs/change-password-how.md](./docs/change-password-how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 上游 [0.1.0 storage-custody-how](../0.1.0/docs/storage-custody-how.md)
6. 畫面：[design-principles.md](../../design-principles.md) 第 8 節；概念稿非正式

## 產品摘要

`wallet.changeVaultPassword`：已解鎖 + 目前密碼解開 vault → 新 salt 重加密 → session 換工作金鑰。Settings 四列樞紐。類 B 密碼欄不用 `type=password`。

## Track

1 SW 改密 → 2 類 B 欄 → 3 Settings 樞紐＋改密頁

## 禁區

GUIDELINES custody；密碼／密文不進 log 與文件；不改 `../solibra-wallet`；不改 KDF；不發明忘記密碼。

## Paste-ready starter prompt

```text
只認檔案，不認 chat history。先讀 AGENTS.md、docs/roadmap/GUIDELINES.md、docs/roadmap/0.8.0/HANDOFF.md、INDEX.md 與其連結的 HOW 與 reasoning。跟 Track：SW changeVaultPassword → 類 B 密碼欄 → Settings 樞紐。禁非目標。不要改 ../solibra-wallet。INDEX 已定案不要再問；沉默才提問，沉默時仍守 GUIDELINES 架構禁區。

wallet.changeVaultPassword：須已解鎖，仍用 currentPassword 做 decryptVault；失敗不寫 vault。成功則記憶體 encryptVault（新 salt）後先 remove 舊 session blob，再寫 airwave.vault.v1，立刻換記憶體新 key，再 persistUnlockedSession。session salt 與 vault salt 不一致則丟 session、禁止用舊 key 寫 vault。新密碼原字串 ≥8、不 trim。Settings 第一層四列；網路兩列單選非 tab；RPC 兩卡；API keys 標籤與 ••••••。建庫／解鎖／Reveal／改密皆 type=text 打碼，禁止 type=password 與 current-password／new-password。不要 commit。
```

## 完成檢查

- [x] INDEX 狀態 `shipped`（2026-10-03；使用者同意出貨）
- [x] [`changelog.md`](../../../changelog.md)、[`version.md`](../../../version.md)、`wallet/package.json` → `0.8.0`
- [x] 已刪 backlog「變更錢包密碼」列與檔
