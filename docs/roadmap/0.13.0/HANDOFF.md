# HANDOFF — 0.13.0

## 讀檔順序

1. 倉庫根 [AGENTS.md](../../../AGENTS.md)、[docs/roadmap/GUIDELINES.md](../GUIDELINES.md)
2. [INDEX.md](./INDEX.md)
3. [docs/approval-host-how.md](./docs/approval-host-how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 上游 [0.12.0](../0.12.0/INDEX.md)（尤其 send-token-how）、[0.11.0](../0.11.0/INDEX.md)
6. [backlog/sidebar-mode.md](../backlog/sidebar-mode.md)（僅預留，不實作）

## 產品摘要

抽共用審批殼。網站請求仍 popout。`walletSend` 改 popup 殼內；`uiHost` 標記宿主。錢包 submit：pending confirm 全頁轉圈 → 同一畫面 confirmed → 0.5s → 回 Home。`signTransaction` 仍立刻關、不廣播。Popup 關閉＝拒絕。

## Track

1 共用殼＋popout 掛載 → 2 `walletSend` popup 宿主＋abort → 3 confirmed 頁／auto-exit → 4 檔案拆分（見 refactor-plan） → 5 build

## 禁區

GUIDELINES pending／custody／不廣播；不改 `../solibra-wallet`；不做 sidebar 殼、signAndSend、Agent、聚合送出、地址簿；不複製第二套審批 UI；文件不寫真實秘密。

## Paste-ready starter prompt

```text
只認檔案，不認 chat history。先讀 AGENTS.md、docs/roadmap/GUIDELINES.md、docs/roadmap/0.13.0/HANDOFF.md、INDEX.md、docs/approval-host-how.md、reasoning.md。跟 Track：抽出共用審批殼 → popout 薄宿主 → beginSend 不 openPopout、uiHost=popup → popup 審批＋pagehide／離審批 view→ui.abortPending → confirmed 成功時序：SW 立刻 settled、禁止 popup closePopout、批准後 pending confirm 全頁轉圈、同一畫面 confirmed 後 0.5s 再 home-token；signTransaction 立刻關不廣播 → typecheck／build。禁 sidebar、signAndSend、複製審批頁。不要改 ../solibra-wallet。INDEX 已定案不要再問。不要 commit。
```

## 錨點（實作後）

- `wallet/src/approval/shell.ts` — 共用審批殼

## 完成檢查

- [x] INDEX 狀態 `shipped`（使用者同意出貨後）
- [x] changelog／version／package.json 對齊 0.13.0
- [x] 驗收 checklist 全勾
