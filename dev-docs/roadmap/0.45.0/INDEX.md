# 0.45.0 — Wallet Standard icon 用產品 PNG

- **狀態：** `shipped`
- **上游版本：** [0.44.0](../0.44.0/INDEX.md)；Wallet Standard 註冊接 [0.1.0](../0.1.0/INDEX.md)
- **Changelog：** [`changelog.md`](../../../changelog.md)
- **構想來源：** 關閉 0.1.0 實作審查 L2／0.2.0 L1（WS `icon` 為 1×1 data URI）。沒有獨立 backlog 檔
- **畫面：** 不改錢包 popup／toolbar。dApp 連線面板顯示 Wallet Standard `icon`
- **秘密欄位：** 無

## 產品句

網站的錢包選擇器（Wallet Standard `icon`）顯示與擴充 toolbar 同一張產品圖 `public/icon128.png`，不再把 1×1 紅像素放大成紅方塊。

## 已定案

| 題 | 決定 |
|----|------|
| 欄位 | `airwaveWallet.icon` 是 Wallet Standard `WalletIcon`：`data:image/png;base64,…`。名稱仍是 `Airwave`。不宣告新方法 |
| 圖檔 | 位元組與 `wallet/public/icon128.png` 相同，與 manifest `icons`／`action.default_icon` 的 128 同源。不另做 SVG、不改圖稿 |
| 為什麼 data URI | inject 跑在網頁上下文，沒有 `chrome.runtime`。dApp 也不能載入 `chrome-extension://` 圖。建置時 Vite `import …/public/icon128.png?inline` 把 PNG 編進 inject bundle |
| 型別 | `wallet/src/vite-env.d.ts` 宣告 `*.png?inline`。`wallet.ts` 把匯入結果當成 `WalletIcon` |
| 擴充 UI | popup／解鎖／關於仍走 `brandIconUrl()` → `chrome.runtime.getURL("public/icon128.png")`。本版不改 |
| WAR | 不為這張 PNG 加 `web_accessible_resources`。圖只內嵌在 inject |
| 版本號 | `version.md`、`changelog.md`、`wallet/package.json`、`wallet/manifest.config.ts`、根 `README.md` 版本句對齊 **0.45.0** |

## 非目標

- 改 connect／sign／disconnect 語意或能力表
- 改 toolbar、解鎖、關於頁的產品圖路徑或尺寸
- 把 PNG 放到頁面可抓的 extension URL
- 在 inject 呼叫 `chrome.*`

## 驗收

- [x] `cd wallet && npm run typecheck && npm run build`
- [x] 建置後 inject chunk 含 128×128 PNG data URI；不含 0.1.0 的 1×1 紅像素
- [x] 使用者於 Jupiter 連線面板確認 Airwave 顯示波浪產品圖

## 錨點

| 路徑 | 用途 |
|------|------|
| `wallet/src/inject/wallet.ts` | `airwaveWallet.icon` |
| `wallet/public/icon128.png` | 產品圖；manifest 同源 |
| `wallet/src/vite-env.d.ts` | `*.png?inline` |
| `wallet/src/shared/brand-icon.ts` | 擴充 UI 圖（本版不改） |
