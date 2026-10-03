# 0.8.0 — 變更錢包密碼＋Settings 樞紐

- **狀態：** `shipped`
- **上游版本：** [0.7.0](../0.7.0/INDEX.md)（持倉／settings 欄位語意不變）
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **Backlog：** 變更錢包密碼；出貨後已自 `docs/roadmap/backlog/` 刪列與檔
- **畫面：** [`docs/design-principles.md`](../../design-principles.md) 第 8 節；概念稿 [`design-demos/settings-hub-ux.html`](../../design-demos/settings-hub-ux.html)、[`design-demos/change-wallet-password-ux.html`](../../design-demos/change-wallet-password-ux.html)（非正式契約；衝突以本 INDEX／HOW 為準）
- **秘密欄位：** [`docs/research/secret-field-autofill.md`](../../research/secret-field-autofill.md) 類 B／C（作法摘要；本版已定案覆寫衝突處）

## 產品句

已解鎖使用者可在 Settings **錢包密碼**子頁用目前密碼改金庫密碼：SW 解開 `airwave.vault.v1`、以**新 salt** 重加密寫回、session 工作金鑰換成新的，不必立刻再解鎖。Settings 第一層改成四列樞紐（網路、RPC、API keys、錢包密碼），避免 Helius／Jupiter 與改密表單攤在同一屏。錢包密碼欄（建庫、解鎖、Reveal 再確認、改密）**不得**用 `type="password"`，以免進 Google 密碼管理器。

## 文件地圖

1. 本檔
2. [docs/change-password-how.md](./docs/change-password-how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. 上游：[0.1.0 storage-custody-how](../0.1.0/docs/storage-custody-how.md)（vault／session；本版加 `wallet.changeVaultPassword`，**不**改 KDF／blob `version`）
5. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 入口 | 僅 popup Settings。第一層四列：**網路**、**RPC**、**API keys**、**錢包密碼**。點列進子頁，Back 回樞紐。鎖定時仍是既有解鎖屏，**沒有**鎖定態改密表單。popout **不做**改密 |
| 改密表單 | 三欄：目前密碼、新密碼、再次輸入。殼底主按鈕「變更密碼」：新密碼長度 ≥ **8**（與 `createVault` 相同）、兩次新密碼相同才可點。成功／失敗／Back／關 popup **立刻清空**三欄 DOM。禁止整頁「儲存設定」 |
| 最短長度 | 新密碼與建庫相同：以**原字串** `length >= 8`（**不** trim；空白算字元）。不足 → UI 不送、SW `WEAK_PASSWORD`，**不寫**金庫。`encryptVault`／之後 `unlock` 用同一原字串 |
| 鎖定 | command 前須 `session` 已解鎖，否則 `WALLET_LOCKED`、不讀 payload 當成功。**仍必須**用 `currentPassword` 對 `airwave.vault.v1` 做 `decryptVault`；禁止只信 session 工作金鑰當「已證明目前密碼」 |
| 成功路徑 | `decryptVault(currentPassword, blob)` → 在記憶體 `encryptVault(newPassword, secrets)` 得到新 blob（**新 salt**、既有 PBKDF2 310000／AES-GCM／`version: 1`）→ **先** `chrome.storage.session.remove` 舊 `airwave.unlocked.session.v1` → **再**寫 `airwave.vault.v1` → **立刻**把記憶體換成新 `key`／salt／同一 `secrets` → `persistUnlockedSession`。本 SW 生命週期保持解鎖。密碼字串用完即丟 |
| 失敗 | 無 vault → `VAULT_MISSING`。目前密碼解密失敗 → `INVALID_PASSWORD`。寫 local vault **之前**的失敗皆**不寫**金庫。`remove` 之後、寫 vault 之前若 SW 被殺：session 空、local 仍舊密文，使用者用**舊**密碼 `unlock`。禁止把新舊 ciphertext、密碼寫進 log |
| 並行 | 與其它會寫 vault 或 persist session 的路徑 **串行**（同一把佇列）。禁止兩次改密交錯把舊密文蓋回 |
| 寫入順序 | **禁止**出現「local 已是新密文、session 仍是舊 key」的持久組合（含 SW 中途被殺）。因此必須 **先刪舊 session，再寫新 vault**。自 `remove` 起到記憶體已是新 key 為止：**禁止** `persistUnlockedSession`、**禁止**用舊 key 做 `encryptVaultWithKey` 寫 vault。另：hydrate／任何「用 session 工作金鑰寫回 vault」之路，若 session `saltB64` 與 local vault `kdfParams.salt` 不一致 → 丟棄該 session、**禁止**用該 key 寫 vault（防漏網窗口） |
| 訊息 | 新增 typed `wallet.changeVaultPassword`；payload `{ currentPassword: string, newPassword: string }`（確認欄只在 popup，不進 SW）。`requestId`；只回發起的 extension page。**不**進 pending Map |
| 類 B 欄 | 建庫兩欄、解鎖、Reveal 再確認、改密三欄：皆 `type="text"` + CSS `-webkit-text-security: disc`；禁止 `type="password"`、禁止 `autocomplete="current-password"`／`"new-password"`、禁止 `name="password"`／`username`；套抗管理器屬性（與助記詞同等或 `hardenWalletPasswordInput`）；不要包 submit `<form>`；不要眼睛把密碼長駐顯示。成功／離開清空。這是產品要求，不是「盡量」 |
| Settings 網路 | 兩列單選 Devnet／Mainnet（圓點），**不要**分段 tab。點了立刻 `storage.patchSettings({ cluster })`。既有 `rpcUrl`＝該 cluster 的 `effectiveRpcUrl` |
| Settings RPC | 同一子頁兩張卡（Devnet、Mainnet），各編既有 `rpcByCluster`；radio + 單行 ellipsis；目前 cluster 的卡標「目前」。選／加／刪立刻寫入。**不**改 0.7.0 持倉資料源 |
| Settings API keys | 標籤 **Helius API URL**、**Jupiter API key**。`type="text"`，禁止 `type="password"`。有值時兩欄顯示 `••••••`；Reveal 圖示切換全文（單行 ellipsis），**不要**再要錢包密碼。空＝可貼上後確認圖示提交該列；清除立刻寫空。失焦或確認才 `patchSettings`。樞紐摘要「已設定／部分設定／未設定」，**不**寫 key、不含 `api-key` 的 URL |
| Storage | **不**新增 local key。仍 `airwave.vault.v1`、`airwave.settings.v1`、`airwave.unlocked.session.v1`（session 只換工作金鑰材料，**永不**存密碼明文） |
| 畫面原則 | INDEX 沉默時依 `design-principles.md`。概念稿不可當 storage／錯誤碼契約 |

## 非目標

- 忘記密碼、助記詞當恢復碼、雲端託管、每個帳戶一把密碼
- 更換 KDF／演算法／`VaultBlob.version`
- 保證 Google／第三方密碼管理器永遠不問（無此 API）；惡意擴充／錄屏
- Wallet UI 多語言、Sidebar、Home Activity、簽署頁改版、storage schema 世代遷移（見其它 backlog）
- 改 0.7.0 持倉路由、Wallet Standard 新方法、test-web 新流程
- 在文件、測試、log 寫入真實密碼／助記詞／私鑰／生產 API key

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.7.0／現況 | 0.8.0 |
|-------------|--------|
| 無改密 command；Settings 單頁含 seg cluster、RPC 分頁、Helius／Jupiter 攤開 | `changeVaultPassword`；樞紐四子頁；網路兩列；RPC 兩卡；API 遮罩 `••••••` |
| 建庫／解鎖／Reveal 為 `type="password"` | 類 B 遮罩 text，四處同一套 |
| 改密須拍板最短長度／鎖定態 | 最短 8；僅已解鎖；仍驗目前密碼 |

## 實作 Track

### Track 1 — SW 改密

- **做：** `wallet.changeVaultPassword`；vault 寫入串行；錯誤碼如上；session 換新 key。
- **不做：** popup 樞紐精修（可先最小呼叫）。
- **驗收：** 錯目前密碼不改 blob；成功後舊密碼解不開新 blob、新密碼可 `unlock`；`cd wallet && npm run typecheck`（或該子專案既有 typecheck）。

### Track 2 — 類 B 密碼欄

- **做：** 建庫、解鎖、Reveal、改密欄符合類 B；離開／成功清空。
- **不做：** 把助記詞改成 `type=password`。
- **驗收：** 四處皆非 `type="password"`；無 `current-password`／`new-password`。

### Track 3 — Settings 樞紐＋改密頁

- **做：** 四列樞紐與子頁；網路兩列；RPC 兩卡；API keys 標籤與 `••••••`；錢包密碼殼底主按鈕。
- **不做：** 新 settings storage 欄。
- **驗收：** 下列 checklist；`cd wallet && npm run build`。

## 驗收（出貨 checklist）

- [x] 已解鎖、正確目前密碼、新密碼原字串 ≥8 且兩欄相同 → vault 新 salt 寫入；popup 保持解鎖；舊密碼無法再 `unlock`
- [x] 錯誤目前密碼 → 短句「密碼錯誤」（或同等，**不含**使用者輸入）、金庫與 session 不變
- [x] 新密碼長度 < 8 若仍打到 SW → `WEAK_PASSWORD`、不寫 vault
- [x] 無 vault 時 command → `VAULT_MISSING`
- [x] 鎖定時無改密表單；若仍打 command → `WALLET_LOCKED`
- [x] 無「忘記密碼」
- [x] 建庫、解鎖、Reveal 再確認、改密：皆非 `type="password"`，無 `current-password`／`new-password`
- [x] Settings 第一層四列，Helius／Jupiter 不在第一層明文；Home 齒輪進樞紐；子頁 Back 回樞紐（不是直接回 Home）
- [x] popout 無改密表單、不處理 `changeVaultPassword`
- [x] 網路為兩列單選，非 seg tab；切 cluster 立刻生效
- [x] RPC 頁同時可見 Devnet 與 Mainnet 兩卡
- [x] API keys：標籤為 Helius API URL／Jupiter API key；已設定顯示 `••••••`；Reveal 不需錢包密碼
- [x] vault 寫入與改密同一串行（靜態：無並行雙寫路徑即可；不必造競態手驗）
- [x] `cd wallet && npm run build` 通過
- [x] 文件與程式無真實密碼／key

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/shared/commands.ts` | 加 `wallet.changeVaultPassword` |
| `wallet/src/shared/crypto-vault.ts` | `encryptVault`／`decryptVault`（新 salt 已在 encrypt） |
| `wallet/src/background/index.ts` | command 處理與 vault 寫入 |
| `wallet/src/background/session.ts` | 換 key／salt 並 persist session |
| `wallet/src/background/storage-io.ts` | 讀寫 vault blob |
| `wallet/src/shared/storage-keys.ts` | settings 既有欄；不新增 local key |
| `wallet/src/popup/index.html` | 樞紐、子頁、類 B 欄 |
| `wallet/src/popup/main.ts` | 導航、patchSettings、改密送 command |
| `docs/roadmap/0.1.0/docs/storage-custody-how.md` | 上游 custody；本版 HOW 為增量 |
