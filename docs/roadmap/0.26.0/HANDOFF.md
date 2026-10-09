# HANDOFF — 0.26.0

## 讀檔順序

1. [AGENTS.md](../../../AGENTS.md)、[GUIDELINES.md](../GUIDELINES.md)
2. [INDEX.md](./INDEX.md)
3. [docs/how.md](./docs/how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. [0.6.0 seed-import-how](../0.6.0/docs/seed-import-how.md)

## 產品摘要

小修：匯入預覽、Combined 展開、解鎖聚焦、類型圖示、卡片拖曳、storage 世代骨架（`airwave.schemaGeneration`＝1，不改 v1 資料）。

## Track

1 匯入預覽 → 2 Combined 展開 → 3 解鎖聚焦 → 4 類型圖示 → 5 卡片拖曳 → 6 storage 世代骨架

## 禁區

不要改 SW 衍生公式、命令名、vault、pending。不要在 updater 裡呼叫 `runPreview`。不要 commit，除非使用者要求。不要改 `../solibra-wallet`。

## Paste-ready starter prompt

```text
只認檔案。讀 docs/roadmap/0.26.0/HANDOFF.md 與 INDEX.md、docs/how.md。把 ImportSeedPick 方案鈕與自訂 blur 的 preview 移出 setDraft updater。runPreview 第一次 setDraft 必須帶上 snapshot 的 kind／customPath／selected 與新 previewGen。過期回應不蓋列。不要改 seed-accounts.ts 語意。不要 commit。
```

## 完成檢查

- [x] 手驗標準↔CLI 列會變
- [x] typecheck 通過
- [x] 未在 updater 內發 preview
