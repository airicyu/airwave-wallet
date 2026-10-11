# 0.36.0 HANDOFF

**狀態：** 已出貨（0.36.0）。

只認檔案。先讀 `AGENTS.md`、`dev-docs/roadmap/GUIDELINES.md`、本版 `INDEX.md` 與 `docs/how.md`。

**核心：** Jupiter 類 tx 已有 limit+price 時不要 `workingTx`；缺欄才 partial `writeCuToTransactionBytes`；shell 用 `cuUserOverride` 區分顯示與寫入。

**驗收：** `cd wallet && npm run typecheck && npm run build`；手測 Jupiter swap 與無 CB 轉帳。
