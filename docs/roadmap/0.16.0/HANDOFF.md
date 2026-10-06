# HANDOFF — 0.16.0

## 讀檔順序

1. 倉庫根 [AGENTS.md](../../../AGENTS.md)、[docs/roadmap/GUIDELINES.md](../GUIDELINES.md)、[docs/design-principles.md](../../design-principles.md)
2. [INDEX.md](./INDEX.md)
3. [docs/popup-react-cleanup-how.md](./docs/popup-react-cleanup-how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 上游 [0.15.0](../0.15.0/INDEX.md)、[0.13.0](../0.13.0/INDEX.md)（審批宿主不可推翻）

## 產品摘要

Popup React 收斂：廢止 `session`／`bindPopupShell`／輸入時全樹 tick；草稿改 React state；Back／離開清除／dock 以 HOW 表為準。行為與 0.15.0 相同。不加依賴。不把審批殼改成 React。

## Track

1 App 層 state＋導航 context → 2 各畫面本地 state＋清除表 → 3 Back／dock 表與殼拆檔 → 4 刪死碼與 build

## 禁區

GUIDELINES pending／custody／不廣播。pending 不進 React 權威 store。不重寫 `approval/shell.ts`。不加套件。不上 Router／Zustand。`focusAccountId` 在 App 層（每次 navigate 有傳 id 則寫入，**含同 view**；未傳則保留）。進入 `token-send` 仍清空表單（含從審批回來；覆蓋 0.13.0 拒絕保留欄位）。鎖定不清持倉快取／展開列（僅切帳戶才清）。僅「離開畫面」副作用以 `current !== next` 為閘；進入重置在 `next` 命中時執行（含同 view 再進）。禁止每 render `bindPopupRuntime`。不要改 `../solibra-wallet`。文件不寫真實秘密。

## Paste-ready starter prompt

```text
只認檔案，不認 chat history。先讀 AGENTS.md、docs/roadmap/GUIDELINES.md、docs/design-principles.md、docs/roadmap/0.16.0/HANDOFF.md、INDEX.md、docs/popup-react-cleanup-how.md、docs/reasoning.md，以及 0.15.0／0.13.0 INDEX。跟 Track：App 層鏡像＋context 導航（廢 bindPopupShell；focusAccountId 每次有傳 id 則寫，含同 view）→ 各畫面 useState，送出草稿在 TokenSendForm 本地，離開／進入清除抄 HOW 表（離開副作用僅 current!==next；進入重置含同 view 再進）→ Back／dock 用表；可拆 PopupMarkup → 刪 icons.ts、遷移腳本、無引用 vanilla 殘留 → cd wallet && npm run typecheck && npm run build。不上 Router／Zustand。不把 approval/shell 改成 React。進入 token-send 仍清空表單（含從審批回來）。失敗 settled 先 navigate 再寫表單錯誤。鎖定不清持倉／展開。行為與命令字串不變。不要改 ../solibra-wallet。INDEX 已定案不要再問。不要 commit。
```

## 完成檢查

- [x] INDEX 驗收 checklist（手驗由使用者於未封裝擴充確認）
- [x] changelog／version／package.json／manifest 對齊 0.16.0
- [x] INDEX 狀態 `shipped`（使用者同意出貨）
- [x] 未 commit，除非使用者要求
