# HANDOFF — 0.14.0

## 讀檔順序

1. 倉庫根 [AGENTS.md](../../../AGENTS.md)、[docs/roadmap/GUIDELINES.md](../GUIDELINES.md)
2. [INDEX.md](./INDEX.md)
3. [docs/folder-plan.md](./docs/folder-plan.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 上游 [0.13.0 INDEX](../0.13.0/INDEX.md) 與 [refactor-plan](../0.13.0/docs/refactor-plan.md)（行為契約；本版不推翻）

## 產品摘要

目錄化且行為不變。SW 平鋪檔進子資料夾；`wallet-handlers.ts` 拆成只做分派的 `wallet-dispatch.ts` 與 `wallet/*` 命令檔。Popup 畫面進子資料夾。審批殼只抽出不讀模組級狀態的純函式。不加 React、不改 CSS／HTML、不改訊息與 storage。

## Track

1 background 整檔搬家（`wallet-handlers.ts` 先整檔進 `handlers/`）→ 2 拆命令 → 3 popup 搬家 → 4 審批純函式 → 5 `typecheck` 與 `build`

## 禁區

GUIDELINES pending／custody／不廣播。不改 `../solibra-wallet`。不搬 manifest／Vite 入口。不拆 `style.css` 與 HTML。不引入依賴。閉包 shell 模組狀態的函式留在 `shell.ts`。文件不寫真實秘密。

## Paste-ready starter prompt

```text
只認檔案，不認 chat history。先讀 AGENTS.md、docs/roadmap/GUIDELINES.md、docs/roadmap/0.14.0/HANDOFF.md、INDEX.md、docs/folder-plan.md、docs/reasoning.md，以及 0.13.0 INDEX（行為不可推翻）。跟 Track：background 整檔搬家並加各 index.ts → 拆 wallet-handlers 成 wallet-dispatch 與 folder-plan 命令表 → popup 子資料夾搬家 → 只抽出審批殼裡不讀模組級 let 的純函式 → cd wallet && npm run typecheck && npm run build。命令字串與 storage key 不變。CSS 與 HTML 內容不改。不加依賴、不上 React。不要改 ../solibra-wallet。INDEX 已定案不要再問。不要 commit。
```

## 錨點

- `wallet/src/background/index.ts` — SW 入口，只改 import
- `wallet/src/background/wallet-handlers.ts` — Track 2 刪除前的命令集
- `wallet/src/approval/shell.ts` — mount／dispose 名稱不變
- `wallet/manifest.config.ts`、`wallet/vite.config.ts` — 入口路徑不改

## 完成檢查

- [x] 使用者於 2026-10-06 同意出貨；INDEX 狀態 `shipped`
- [x] changelog／version.md／wallet package.json／manifest `version` 對齊 0.14.0
- [x] 未 commit
