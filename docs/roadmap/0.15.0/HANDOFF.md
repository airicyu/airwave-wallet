# HANDOFF — 0.15.0

## 讀檔順序

1. 倉庫根 [AGENTS.md](../../../AGENTS.md)、[docs/roadmap/GUIDELINES.md](../GUIDELINES.md)、[docs/design-principles.md](../../design-principles.md)
2. [INDEX.md](./INDEX.md)
3. [docs/popup-react-how.md](./docs/popup-react-how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 上游 [0.14.0](../0.14.0/INDEX.md)、[0.13.0](../0.13.0/INDEX.md)（審批宿主語意不可推翻）

## 產品摘要

Popup 改 Vite + React functional component。行為不變。審批殼維持 vanilla，用 ref 掛載。不加 Router／Zustand。SW／popout／inject 不上 React。

## Track

1 工具鏈 → 2 App 殼與 state 鏡像 → 3 遷移各畫面 → 4 審批橋接與卸載 → 5 清理與 build

## 禁區

GUIDELINES pending／custody／不廣播。pending 不進 React 權威 store。不重寫 `approval/shell.ts`。不加約定外依賴。不改 `../solibra-wallet`。文件不寫真實秘密。

## Paste-ready starter prompt

```text
只認檔案，不認 chat history。先讀 AGENTS.md、docs/roadmap/GUIDELINES.md、docs/design-principles.md、docs/roadmap/0.15.0/HANDOFF.md、INDEX.md、docs/popup-react-how.md、docs/reasoning.md，以及 0.13.0 INDEX（審批宿主不可推翻）。跟 Track：安裝 react／react-dom／@vitejs/plugin-react 並開 jsx → createRoot＋State 鏡像（onChanged 僅四個 local key）＋View 導航 → 遷移各畫面為 functional components（沿用 CSS class；廢止 dom.ts 頂層 el 表）→ send-approval 先輸出完整 appr-* 骨架再 mountApprovalShell，mount 後 React 不覆寫該子樹；pagehide／離 view 對齊 abort → 刪舊 vanilla 主路徑 → cd wallet && npm run typecheck && npm run build。不上 Router／Zustand。不把 approval/shell 改成 React。行為與命令字串不變。不要改 ../solibra-wallet。INDEX 已定案不要再問。不要 commit。
```

## 完成檢查

- [x] INDEX 驗收 checklist（手驗若未走完須在實作審查寫明）
- [x] changelog／version／package.json／manifest 對齊 0.15.0（出貨時）
- [x] INDEX 狀態 `shipped`（使用者同意出貨）
- [x] 未 commit，除非使用者要求
