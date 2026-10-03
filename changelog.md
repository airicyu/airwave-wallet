# Changelog

## 0.8.0 — 2026-10-03

Settings 可變更錢包密碼：`wallet.changeVaultPassword` 用目前密碼解開 `airwave.vault.v1`，新 salt 重加密後寫回，session 工作金鑰換成新的（先刪舊 session blob 再寫 vault）。Settings 改為四列樞紐（網路兩列單選、RPC Devnet／Mainnet 兩卡、API keys 標籤與 `••••••` 遮罩、錢包密碼子頁）。建庫／解鎖／Reveal／改密改為遮罩 `type="text"`，禁止 `type="password"` 與 `current-password`／`new-password`。無忘記密碼。

## 0.7.0 — 2026-10-03

Home 持倉不再走 Helius DAS `getAssetsByOwner`。mainnet 且 Helius URL 可解析 `api-key`（或 `apiKey`）時，SPL 改打 Helius Wallet API `GET /v1/wallet/{wallet}/balances`（`showNfts=false`、分頁串行）；native SOL 與 wSOL 仍用 `rpcUrl` 拆開（`getBalance` + wrapped mint token accounts），`native-sol` 永遠第一、有 wSOL 則第二列（Wrapped SOL／wSOL）。否則整表 `rpcUrl`：`getBalance` + legacy Token 與 Token-2022 的 `getParsedTokenAccountsByOwner`；濾 `decimals === 0` SPL。mainnet Jupiter Tokens v2 可覆寫其它 mint 的 name／symbol／https icon 與 USD；SOL／wSOL 名稱寫死。devnet 不打 Wallet API、不打 Jupiter。combined 跨 owner 有限 `usdTotal` 加總並重寫 `usdLabel`。

## 0.6.0 — 2026-10-03

助記詞匯入：英文 BIP39 12／24 詞；選 phantom／CLI／自訂 path；預覽 index 0–19 公鑰（每列三詞詞格）；挑一列寫入 signing。Add 拆成「建立助記詞錢包」與「建立 Burner 錢包」。助記詞錢包單屏：名稱＋12 詞＋地址，建立才寫 vault（phantom index 0）；離開不寫入、不把助記詞存進 storage。Burner 仍為隨機密鑰，之後可 Reveal。密鑰匯入語意不變。

## 0.5.0 — 2026-10-02

Combined 聚合帳戶：`AccountMeta` 判別聯合（signing／read-only／combined）；subs 永遠 ≥1；連線綁 combined id、暴露 main 公鑰；切 main 對已連 origin 發 `account-changed`（targeted）。簽名對 main 解析 signing 列 id；觀察／無列先於鎖定。Home `getHomeTokens` 對 subs 串行 DAS／RPC 加總並附 `members` 供展開列。popup 方案 A Add→Combined 填表（可貼地址、勾本機帳戶）與 Manage（本機帳戶勾選加刪成員、切目前錢包）。解鎖工作金鑰鏡到 `chrome.storage.session`（不存密碼）；SW 回收後仍維持解鎖直到按鎖或關閉瀏覽器。Reveal 仍須再輸入密碼。安裝後第一屏設密碼即建立保險庫；產生／匯入／觀察假設 vault 已存在，不再中途建庫或索密碼。錯誤 toast 換頁即清、約 4 秒自動消失（可點關閉）。頁級主行動貼 popup 殼底（flex、不進內容捲動、不用 floating／sticky）。Settings：RPC 按 cluster 分清單、autosave、列內 icon 增刪。

## 0.4.0 — 2026-10-01

Home Token 持倉由 service worker 查詢：可選 Helius DAS（名稱、icon、底價）或 `rpcUrl` fallback。mainnet Jupiter Tokens v2 search 只補認證勾、organic score，並在有 `usdPrice` 時覆寫 USD。keyless 0.5 rps；有 portal key 按 Free 1 rps。不打 Price v3。App icon 採氣流疊浪（`wallet/public/icon{16,32,48,128}.png`）。連線 popout 不再顯示 `silent` JSON。test-web `change` 監聽只訂一次；公鑰未變更則 `connect` 不重發 `change`。

## 0.3.0 — 2026-10-01

Popup 方案 A：384px 殼、mini wallet 頂欄、Menu、Home Token／Activity（Activity empty）、Token 卡片（RPC legacy SPL、同 mint 加總、濾零 SPL、USD「—」）；Accounts／Rename／Manage／Add 整頁；`wallet.exportAccountSecret` Reveal 流程；鎖定後僅 `#locked`；Settings／Connected sites 沿用 0.2.0 能力。

## 0.2.0 — 2026-10-01

帳戶 rename／delete／read-only 觀察帳戶；popup 首頁 Tokens 列表（SOL 固定第一列＋legacy SPL；鎖定亦可看）；Wallet Standard `disconnect` 與 popup 已連線站點管理；`test-web` Disconnect 回歸。

## 0.1.0 — 2026-10-01

Minimal Solana Chrome 錢包 MVP：`wallet/` 擴充 + `test-web/` 手測 dApp。Wallet Standard connect／signMessage／signTransaction；SW pending hub、password-boxed vault、popout 審批。使用者已完成 Chrome 載入未封裝與 test-web 手驗。
