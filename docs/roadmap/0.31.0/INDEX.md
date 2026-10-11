# 0.31.0 — Vite 8 建置鏈

- **狀態：** `shipped`
- **上游版本：** [0.29.0](../0.29.0/INDEX.md) 的產品版本號。簽署 AI 程式在 commit `0.30.0`，契約仍是 [0.30.0](../0.30.0/INDEX.md)，本版不把它標成出貨
- **Changelog：** [`changelog.md`](../../../changelog.md)
- **構想來源：** 建置鏈升級手測（2026-10-11）。沒有獨立 backlog 檔
- **畫面：** 不改。過期 blockhash 的失敗文案留到之後的版本
- **秘密欄位：** 無

## 產品句

使用者可見的簽署、送出與交易 AI 流程與升級前相同。本版只讓 `wallet/` 在 Vite 8 上建出能載入的擴充：審批頁不會執行 service worker 的監聽，交易 AI 可以走完多輪並打到 Decisions。

## 已定案

| 題 | 決定 |
|----|------|
| Vite | `vite` 精確 `8.3.4`。`@vitejs/plugin-react` 精確 `5.2.0`（仍用 Babel）。`typescript` 精確 `7.0.2`。`@types/chrome` 精確 `0.3.5` |
| crxjs | `@crxjs/vite-plugin` 維持精確 `2.7.1`。不升 `3.0.0` |
| 依賴版號 | `wallet/package.json` 的直接 dependencies 與 devDependencies 用精確版號，不寫範圍。鎖檔是 `wallet/bun.lock` 與 `wallet/package-lock.json` |
| 入口檔名 | Content script 是 `wallet/src/content/content-script.ts`。Inject 是 `wallet/src/inject/inject.ts`。`manifest.config.ts` 與此二路徑一致。Rolldown 以檔名當 chunk 名，`index.ts` 會和 `src/background/index.ts` 撞車 |
| 擴充頁資源 | `wallet/vite.config.ts` 的 `extension-relative-assets` 把 `src/<page>/*.html` 的 `="/assets/` 改成 `="../../assets/`，並拿掉 `crossorigin`。`build.rollupOptions.input` 保留，讓 crxjs 2.7.1 讀得到 HTML 入口 |
| Service worker 監聽 | `wallet/src/background/index.ts` 只在 service worker 全域裡註冊監聽與啟動。Rolldown 會把這支進入點分享給 popup、側欄與審批頁；那些頁面若執行同一支監聽，會先回 `assess.fail`，交易 AI 只留下一筆 `completions` |
| 手測 | 未封裝載入 `wallet/dist`。簽署交易的 AI 在 service worker Network 出現多筆 `completions`，最後有 `decisions`。重新發起、盡快批准的送出可以上鏈 |
| 版本號 | `wallet/package.json`、`wallet/manifest.config.ts`、`version.md`、`changelog.md` 為 `0.31.0` |

## 非目標

- 改過期 blockhash（`BlockhashNotFound`）的失敗文案
- 送出前改寫 dApp 交易的 blockhash
- 升 `@crxjs/vite-plugin` 到 3
- 升 `@vitejs/plugin-react` 到 6
- 把 [0.30.0](../0.30.0/INDEX.md) 標成 `shipped` 或改寫其驗收

## 驗收

- [x] `wallet` 以 Vite 8.3.4 建置成功，service worker 載入的是背景 chunk，不是 inject
- [x] 審批頁交易 AI 走完多輪 `completions` 並打到 `decisions`
- [x] 新發起的交易盡快批准可以送出
- [x] 版本號四處皆為 `0.31.0`
