# 0.39.0 HANDOFF

**狀態：** `shipped`（2026-10-14）。手驗通過；見 [implementation-review.md](./docs/implementation-review.md)。

## 讀檔順序

1. [INDEX.md](./INDEX.md)
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. [docs/design-review.md](./docs/design-review.md)
5. 概念稿 [`tx-ai-model-picker-ux.html`](../../design-demos/tx-ai-model-picker-ux.html)

## 產品摘要

- 側欄待簽：SW `SIDEBAR_SURFACE_PORT` 斷線且斷線前 `sidebarSurfaceOpen` → 結束最舊 sidebar `signTransaction`／`signAndSendTransaction`（對齊 popout 關窗）。側欄 unload 不再 `rejectFlowPending`。
- AI 設定：報告 apodex 預設 + Flash + 其他；定級 d1 + Drex + 其他；勾／Enter 存自訂 id；normalize 放行合法自訂字串。

## Track 順序

1. 側欄 port 斷線 + 移除 unload abort + `findOldestSidebarSignTxPendingId`
2. AI 設定模型 + normalize + i18n + select CSS + `tx-ai.test.ts`
3. `docs/user-guide.md`／features；版本號；出貨清 backlog

## 禁區

- pending 進 storage、全 tab 廣播、硬編碼密碼
- OpenRouter 模型目錄驗證
- 改 test-web sign-risk
- 擴 `handleShellSwitchToWindow` 到 sign-and-send

## Paste-ready starter

```text
讀 AGENTS.md、dev-docs/roadmap/GUIDELINES.md、dev-docs/design-principles.md、dev-docs/roadmap/0.39.0/INDEX.md、docs/how.md、HANDOFF.md、docs/design-review.md（最新輪）。

依 Track 1→3 實作 0.39.0。Track 1：側欄 port onDisconnect 在 setSidebarSurfaceOpen(false) 前先處理 sign tx pending；移除 usePopupAppState 側欄 unload 的 rejectFlowPending。Track 2：TxAiSettings 三選+其他+勾確認；tx-ai normalize 與 apodex 預設。手驗 test-web 側欄關閉與設定存模型。cd wallet && npm run typecheck && npm run build。不要 commit。
```
