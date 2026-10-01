# Changelog

## 0.4.0 — 2026-10-01

Home Token 持倉由 service worker 查詢：可選 Helius DAS（名稱、icon、底價）或 `rpcUrl` fallback。mainnet Jupiter Tokens v2 search 只補認證勾、organic score，並在有 `usdPrice` 時覆寫 USD。keyless 0.5 rps；有 portal key 按 Free 1 rps。不打 Price v3。App icon 採氣流疊浪（`wallet/public/icon{16,32,48,128}.png`）。連線 popout 不再顯示 `silent` JSON。test-web `change` 監聽只訂一次；公鑰未變更則 `connect` 不重發 `change`。

## 0.3.0 — 2026-10-01

Popup 方案 A：384px 殼、mini wallet 頂欄、Menu、Home Token／Activity（Activity empty）、Token 卡片（RPC legacy SPL、同 mint 加總、濾零 SPL、USD「—」）；Accounts／Rename／Manage／Add 整頁；`wallet.exportAccountSecret` Reveal 流程；鎖定後僅 `#locked`；Settings／Connected sites 沿用 0.2.0 能力。

## 0.2.0 — 2026-10-01

帳戶 rename／delete／read-only 觀察帳戶；popup 首頁 Tokens 列表（SOL 固定第一列＋legacy SPL；鎖定亦可看）；Wallet Standard `disconnect` 與 popup 已連線站點管理；`test-web` Disconnect 回歸。

## 0.1.0 — 2026-10-01

Minimal Solana Chrome 錢包 MVP：`wallet/` 擴充 + `test-web/` 手測 dApp。Wallet Standard connect／signMessage／signTransaction；SW pending hub、password-boxed vault、popout 審批。使用者已完成 Chrome 載入未封裝與 test-web 手驗。
