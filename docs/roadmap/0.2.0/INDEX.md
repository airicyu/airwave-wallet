# 0.2.0 — 帳戶生命週期 + 首頁資產 + disconnect

- **狀態：** `in progress`
- **上游版本：** [0.1.0](../0.1.0/INDEX.md)（`shipped`）
- **Changelog：** [`changelog.md`](../../../changelog.md)（本版 shipped 時追加）
- **Backlog：** （無獨立檔；scope 來自規劃對話）

## 產品句

使用者在 **popup** 可管理帳戶生命週期（重新命名、刪除、新增 **read-only** 觀察帳戶），於首頁主區看到當前帳戶在 **目前 RPC** 上的 **SOL 餘額與代幣帳戶列表**；dApp 可經 Wallet Standard **`disconnect`** 斷開，popup 可檢視／撤銷已連線站點；`test-web` 可回歸 disconnect 與切帳戶行為。本版**不**做 sidebar、交易 simulation、signAndSend、agent harness。

## 文件地圖（閱讀順序）

1. 本檔（已定案、Track、驗收）
2. [docs/accounts-home-how.md](./docs/accounts-home-how.md) — 帳戶 CRUD／read-only、首頁資產、storage 增量
3. [docs/disconnect-how.md](./docs/disconnect-how.md) — disconnect、connections UI、訊息增量
4. [docs/reasoning.md](./docs/reasoning.md)
5. 上游契約（行為未改則仍有效）：[0.1.0 message-flow](../0.1.0/docs/message-flow-how.md)、[0.1.0 storage-custody](../0.1.0/docs/storage-custody-how.md)
6. [HANDOFF.md](./HANDOFF.md)（設計閘門通過後）

## 已定案

| 題 | 決定 |
|----|------|
| 繼承 0.1.0 | Pending 僅 SW 記憶體；結果只回原 tab；`chrome.storage` + `onChanged`；password-boxed vault；簽名在 SW unlock 後執行；無 hardcode 密碼；無訊息層 RSA；無 pending storage hydrate |
| 帳戶 rename | Popup 可改 `AccountMeta.label`；經 SW command 寫 `airwave.accounts.v1`；不影響公鑰／vault secret |
| 帳戶 delete | Popup 確認後經 SW 刪除：從 `accounts` 移除；signing 帳戶刪除時若 vault 鎖定則 `WALLET_LOCKED`（見 HOW）；凡 `connections` 內紀錄的 **`accountId` 欄位**等於被刪者（**不是**「當前 active」），刪除該 origin 並對其 `tabIds` 推送斷開——即使使用者已切到別的帳戶再刪舊帳戶，仍斷開該 origin（連線紀錄綁定的是當初 connect 寫入的 accountId）；若刪的是 active：尚有帳戶則切到 `accounts[0]` 並對仍連線 origins 推 `account-changed`，若無剩餘則清 `activeAccountId` |
| Read-only 帳戶 | 可新增：使用者貼 **公鑰 base58** → meta 含 `kind: "readOnly"`（字面聯合 `"signing" \| "readOnly"`，不用布林）；**不**寫入 vault secrets；列表可切換為 active；當 active 為 read-only 時：`dapp.signMessage`／`dapp.signTransaction` **拒絕** `ACCOUNT_READ_ONLY`（建立 popout 前）；connect 仍可回傳該公鑰；`ui.resolvePending` approve 時再防禦一次；`createVault` **不得**抹掉既有 read-only（見 accounts-home HOW） |
| 生成／匯入 | 既有路徑保留；新帳戶 `kind: "signing"`（預設） |
| Wallet home 資產 | Popup 首頁在**有 active 公鑰時即可顯示**（**不要求** vault 已解鎖；鎖定態仍可看只讀餘額區）。用 `settings.rpcUrl` 建 `Connection`；顯示 **SOL lamports→SOL**；以及 `getParsedTokenAccountsByOwner` 列出 **SPL token 帳戶**（見 accounts-home HOW：legacy Token program id 寫死、本版**只查 legacy**）。mint 可縮寫、uiAmount／amount、decimals；**不**拉 Jupiter／外掛 metadata；失敗顯示錯誤、不崩潰；loading 態必有 |
| 資產誰查 RPC | **Popup 直連 RPC 只讀**（不經 SW 持鑰）；僅公鑰＋公開 RPC；私鑰永不進 popup |
| disconnect（WS） | inject **宣告並實作** `standard:disconnect`：呼叫 SW `dapp.disconnect` → 刪除該 `origin` 的 `connections` 條目 → 回 inject 清 `currentPublicKey` 並 `change` 為空帳戶列表；**不**開 popout |
| 已連線站點 UI | Popup 設定區或獨立區塊：列出 `connections` 的 origin；可「斷開此站」或「全部斷開」；經 SW 寫 storage 並對受影響 tab 推送斷開（與 WS disconnect 同效果） |
| 能力表 | 在 0.1.0 的 connect／signMessage／signTransaction／events 之上，**新增宣告** `standard:disconnect`；仍 **不**宣告 signIn、signAllTransactions、legacy `window.solana`、signAndSend |
| Content bridge | content 允許轉發之 command 新增 `dapp.disconnect`（僅此增量）；其餘 0.1.0 白名單不變 |
| test-web | 新增 **Disconnect** 按鈕；保留 Connect／Sign message／Sign transaction；README 補 disconnect 與「切帳戶後 change」手驗句 |
| 依賴 | 優先只用既有 `@solana/web3.js` 查餘額／parsed token accounts；**本版不新增** `@solana/spl-token` 除非 HOW 實作時證明 web3 不足（若新增須在 reasoning 記一筆）；不為 metadata 拉大型 UI 框架 |
| Shell | 仍僅 **popup**；**不做** sidebar |
| 測試 | 仍無整包 CI；驗收以手驗＋`wallet`/`test-web` build／typecheck 為準 |

## 非目標

- Agent harness、isolated agent、OpenRouter／MCP（full-picture ②③）
- Sidebar（C2）
- 交易 simulation、signAndSendTransaction、代廣播
- 助記詞／HD、硬體錢包、SIWS、signAllTransactions、legacy `window.solana`
- Token 圖示／法幣報價／Jupiter metadata（本版可不做）
- 自動鎖定逾時策略大改（沿用 0.1.0 lock／unlock）
- 改動 `../solibra-wallet`

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.1.0 | 0.2.0 |
|-------|-------|
| 生成／匯入／切換 | ＋ rename、delete、read-only |
| 無 disconnect | ＋ WS disconnect＋站點管理 |
| Popup 偏設定／帳戶列表 | ＋ 首頁 SOL＋token 列表 |
| test-web 三按鈕 | ＋ Disconnect |

## 實作 Track

### Track 1 — 帳戶 meta 與 rename／delete／read-only

- **做：** 依 [accounts-home-how.md](./docs/accounts-home-how.md) 擴充 `AccountMeta`；SW commands：rename、delete、addReadOnly；popup UI；delete 清 vault／connections 副作用；read-only active 時拒簽（含 signMessage **與** signTransaction）。
- **不做：** 首頁 RPC 資產、disconnect。
- **驗收：** 可 rename；可加 read-only 並切換；read-only 下 **signMessage 與 signTransaction** 均失敗碼 `ACCOUNT_READ_ONLY`；delete 後列表與 vault 無該 id；刪 active 時切到剩餘帳戶或清空。

### Track 2 — disconnect + 已連線站點

- **做：** 依 [disconnect-how.md](./docs/disconnect-how.md)：`dapp.disconnect`、WS `standard:disconnect`、popup 站點列表與斷開；推送／inject 清帳戶。
- **不做：** 首頁 token。
- **驗收：** test-web Disconnect 後需重新 Connect 才能簽；popup 斷開某 origin 後該 tab 見帳戶清空；connections storage 無該 origin。

### Track 3 — Wallet home 資產列表

- **做：** Popup 首頁：SOL + parsed token accounts；用目前 `rpcUrl`；loading／錯誤態；切帳戶或 `onChanged` active 後重新整理（可手動重新整理按鈕）。
- **不做：** 美化圖示、法幣、sidebar。
- **驗收：** devnet 有 SOL 的測試帳戶可見非零或零餘額（勿寫真實地址進文件）；無 RPC 時顯示錯誤；read-only 帳戶同樣可看餘額。

### Track 4 — test-web 與文件拋光

- **做：** Disconnect 按鈕：經與 Connect **同一** Wallet Standard 發現路徑取得已註冊 `Airwave` wallet，呼叫其 `standard:disconnect` feature（不得另發明平行協議）；README 手驗步驟；必要時更新倉庫根 README 一句；`wallet`／`test-web` `package.json` 的 `version` 對齊 `0.2.0`（實作末期改即可）。
- **驗收：** 新 clone 依 test-web README 可走完 0.2.0 手驗清單。

## 驗收（出貨 checklist）

- [x] `cd wallet && npm run build` 成功
- [x] `cd test-web && npm run build` 或 `npm run dev` 可開（與 0.1.0 相同本機埠）
- [ ] Popup：重新命名帳戶後列表與 storage meta 一致
- [ ] Popup：新增 read-only（公鑰）→ 可切換 → Sign message／Sign transaction 被拒（`ACCOUNT_READ_ONLY`）
- [ ] Popup：刪除非唯一帳戶 → 該帳戶消失；若刪 active 則自動切到另一帳戶並 dApp 見 change（若曾連線）
- [ ] Popup 首頁：在**鎖定或已解鎖**下，只要有 active 公鑰即可顯示 SOL 與「token 帳戶列」區域（空列表可接受）；RPC 錯誤可見
- [ ] test-web：Disconnect → 簽名失敗或需重連；再 Connect 成功
- [ ] Popup：已連線站點可斷開單一 origin
- [ ] Wallet Standard 宣告含 `standard:disconnect`；**無** signIn／signAll／signAndSend 空廣告
- [ ] 無 hardcode 密碼；pending 仍不進 storage；結果不廣播全 tab（靜態複核）

## 手驗指令（整包）

```text
cd wallet && npm install && npm run build
cd test-web && npm install && npm run dev
# Chrome → 載入未封裝 → wallet/dist
# http://localhost:5173 → 依 test-web/README.md（含 Disconnect）
# popup：rename／read-only／delete／首頁餘額／站點斷開
```

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/shared/storage-keys.ts` | `AccountMeta` 增量 |
| `wallet/src/shared/commands.ts` | 新 wallet.*／dapp.disconnect |
| `wallet/src/background/index.ts` | 帳戶／disconnect／拒簽 |
| `wallet/src/background/storage-io.ts` | 讀寫 |
| `wallet/src/inject/wallet.ts` | WS disconnect 宣告 |
| `wallet/src/content/index.ts` | command 白名單 |
| `wallet/src/popup/main.ts` | UI：帳戶／首頁／站點 |
| `test-web/src/` | Disconnect 按鈕 |
| `test-web/README.md` | 手驗 |
