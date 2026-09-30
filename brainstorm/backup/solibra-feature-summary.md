# Solibra Wallet — Legacy Feature Summary

> 來源專案：`../solibra-wallet`（已失敗的 Solana Chrome Extension 錢包）  
> 用途：用人話梳理「當時實際做出了什麼」，供 `airwave-wallet` 重做時對照 MVP / 取捨。  
> 相關文件：
> - [full-picture.md](./full-picture.md)（Airwave 整盤構想）
> - [lessons-from-solibra-wallet.md](./lessons-from-solibra-wallet.md)（架構與教訓）
> - [remake-feature-wishlist.md](./remake-feature-wishlist.md)（重做意向功能）
> - [research/extension-message-flow.html](./research/extension-message-flow.html)（多 runtime 訊息流）

README 自稱（約 2024-10-08）已支援：隨機生成錢包、只讀錢包、簽消息、帶 simulation 的簽交易；RPC 設定「尚未實作」。下文以代碼為準，比 README 更細。

---

## 一句話

Solibra 做成了一個**開發者自測向**的擴充錢包原型：能造帳戶、能被 Wallet Standard dApp 發現、能彈窗審批，尤其交易 Simulation UI 做得相對深。  
首頁資產、設定、真實密碼託管、網路切換、斷開/批量簽/Sign In 等大多是空殼或未收口。

---

## 產品外觀：用戶會碰到的入口

| 入口 | 是什麼 | 實際完成度 |
|------|--------|------------|
| **Toolbar Popup** | 點擴充圖示；約 500×600；深色 MUI | 導航架可用；首頁內容幾乎空 |
| **Key Store 頁** | 帳戶生成 / 只讀 / 選切刪 / 複製 | **端到端可用**（開發級 UI） |
| **Settings 頁** | 「Cluster & RPC」一行 | **點不動的 stub** |
| **Approval Popout** | dApp 請求時另開約 550×800 小窗 | Connect / 簽消息 / 簽交易 / 簽並發送 **可用** |
| **Content + Inject** | 幾乎所有網頁 `document_start` 注入 | 可用；`all_frames: true` |
| **Wallet Standard「Solibra」** | 註冊進 dApp 錢包列表 | 支援 Standard 的站可用 |
| **Legacy `window.solana`** | Phantom 風格 provider | **沒做** |

權限僅：`storage`、`tabs`。手動測試站（README）：Jupiter、drip.haus、Kamino。

---

## 一、Popup：點開擴充之後

### 1. 錢包首頁（殼）

- 頂欄：當前帳戶名（公鑰前幾位當 display name）
- 左：帳戶圖示 → Key Store
- 右：齒輪 → Settings
- 正文：`"Placeholder content"`
- 底欄：原本打算 Tokens / Collectibles / Activities，代碼註解掉，只留無意義 Placeholder tab

**人話：** 看起來像錢包殼，沒有餘額、代幣列表、活動流水。

### 2. Key Store（最完整的帳戶管理）

| 功能 | 行為 | 狀態 |
|------|------|------|
| Generate new wallet | `Keypair.generate()`，私鑰加密進 `privateKeyBox`，名字≈公鑰前 5 字元 | ✅ 可用 |
| Add view only wallet | 貼公鑰 → `viewOnly: true`，無私鑰盒 | ✅ 可用 |
| Select | 切換 `currentKey` | ✅ 可用 |
| Copy | 剪貼簿複製地址 | ✅ 可用 |
| Remove | 刪除並重算 index | ✅ 可用 |
| 重新命名 | — | ❌ |
| 助記詞 / 匯入私鑰 / 匯出備份 | — | ❌ |
| 設密碼 / 解鎖 / 鎖屏 UI | `lockKey` 寫死 `"Qwer1234!"` | ❌（安全上不合格） |
| 審批時再選帳戶 | 直接用當前選中帳戶 | ❌ |

**人話：** 能造多個帳戶、切換、複製、刪除、加只讀觀察錢包；沒有正規建立/匯入/備份流程。

### 3. Settings（空殼 + 半成品資料層）

- UI：標題 + 一行「Cluster & RPC」，無 `onClick`
- Store 已寫：mainnet/devnet、自訂 cluster、每 cluster 多條 RPC 增刪選
- 預設 RPC URL 在 store 裡是空字串
- **簽交易完全不讀 settings**，寫死 Cloudflare Worker：  
  `https://rpc-proxy.airic-yu.workers.dev`  
  （devnet proxy 常數有寫、未接上）

Install 時還會生成 **device RSA keypair** 存進 settings——之後簽名路徑幾乎不用（死架構）。

---

## 二、dApp 側：Wallet Standard 能力表

註冊名稱：`Solibra`。宣稱支援 connect / disconnect / events、signMessage / signTransaction / signAndSendTransaction、signIn，以及自訂 `solibra:` namespace。鏈宣稱含 mainnet/devnet/testnet/localnet，實際 RPC 鎖 mainnet。

| 方法 | 人話狀態 | 備註 |
|------|----------|------|
| **connect** | ✅ 可用 | 彈 Connect 審批；`onlyIfTrusted` / silent **忽略**；無已信任站點庫 |
| **disconnect** | ⚠️ 空實作 | 只 log；不清公鑰、不發 disconnect 事件 |
| **events（change 等）** | ⚠️ 部分 | connect 路徑有；disconnect 路徑沒用上 |
| **signMessage** | ✅ 可用 | 拒絕可解析成 `VersionedMessage` 的「消息」（防釣魚） |
| **signTransaction** | ✅ 單筆可用 | 多筆走 `signAllTransactions` → **throw** |
| **signAndSendTransaction** | ✅ 可用 | 擴充自己 `sendTransaction`，回 signature |
| **signIn** | ❌ 廣告未做 | 一調就 throw |
| **signAllTransactions** | ❌ | throw；拖垮多筆 signTransaction |
| **Legacy provider** | ❌ | 只有 Wallet Standard |

帳戶切換通知 dApp：background 有發 `ChangedAccount`，但協定不完整（公鑰常丟／inject 常先清成 null 再逼重連）→ **實務上不可靠**。

---

## 三、Popout 審批流（產品主戰場）

共用管線（人話版）：

1. dApp 經 Wallet Standard 呼叫 Solibra  
2. 頁面產生一次性 **RSA-OAEP 4096** 密鑰對，公鑰隨請求帶走  
3. inject → content → background  
4. background 把 operation 寫入 store（約 3 分鐘過期）並開 popout（帶 `requestId`）  
5. 用戶同意/拒絕 → 結果用請求公鑰加密 → 轉回 inject → 頁面輪詢解密  

（此管線的架構問題見 lessons 文；此處只記「做了什麼功能」。）

### Connect

- 顯示：當前錢包名 + 網站 origin  
- 按鈕：拒絕 / 連接  
- 成功：回 `{ publicKey }`  
- 關窗且仍 PENDING → 當拒絕  
- 無帳戶選擇器、無密碼確認  

### Sign Message

- 顯示 UTF-8 明文  
- `nacl.sign.detached`  
- 只讀錢包禁用簽名  
- 含「消息其實是交易」的拒絕邏輯  

### Sign Transaction / Sign And Send

- 開啟自動 simulate；可 re-simulate  
- 支援 legacy / versioned；versioned 盡量解析 ALT  
- Approve / Reject；只讀錢包不能簽  
- **Sign Tx**：回傳簽好的交易（hex），由 dApp 廣播  
- **Sign And Send**：擴充用硬編碼 mainnet RPC 送出，回 `{ signature }`  

### Simulation UI（意外地深 —— 不是 stub）

這是整個 legacy 專案**最有產品味**的一塊：

- `simulateTransaction` + 帳戶 post 狀態  
- 區分可寫 / 簽名者等角色  
- 計算 **SOL** 與 **SPL / Token-2022** 餘額前後差  
- Jupiter API 拉代幣 name / symbol / logo：`https://api.jup.ag/tokens/v1/{mint}`  
- UI：錯誤橫幅、「You」/「Your Token Account」標籤、before→after、複製地址/mint  

證據檔：`transactionUtils.ts`、`SimulateTransactionResultView.tsx`、`AccountBalanceChangeView.tsx`。

README 建議測：Jupiter 單筆簽、drip.haus 簽消息、Kamino 只讀地址。

---

## 四、表面看不到、但代碼裡有的能力

| 能力 | 說明 | 用戶能否直接用 |
|------|------|----------------|
| PBKDF2（60 萬次）+ AES-GCM | 私鑰落盤加密 | 被硬編碼密碼架空 |
| 每請求臨時 RSA + 分塊加密回傳 | 審批結果不走明文 | 對用戶透明，有做 |
| Device RSA on install | 進 settings | ❌ 簽名路徑未用 |
| Operation 多筆記錄 + TTL | 非單槽簡陋佇列 | 內部；hydrate 不穩時仍卡 |
| Typed command 信封 + uuid | 跨 runtime 協定 | 內部 |
| Cluster/RPC settings 資料模型 | 增刪切換邏輯齊 | ❌ UI/簽鏈未接 |
| Popout 靠近請求頁定位 | 傳 left/top | ✅ 體驗細節 |
| 訊息預設廣播全 tab | 實作如此 | 副作用大（見 lessons） |

無：生物辨識、硬體錢包、2FA、域名權限庫、自動化測試、CI。

---

## 五、明確沒做 / 只留坑

- 首頁：餘額、Tokens、NFT、Activities  
- 助記詞、匯入私鑰、匯出/備份還原  
- 真實密碼引導、鎖屏、自動鎖定  
- 網路 / RPC 設定 UI（與真正 `Connection` 接線）  
- 已連接站點管理、撤銷授權、靜默重連  
- disconnect / signIn / signAllTransactions 收口  
- Legacy `window.solana`  
- 帳戶重新命名、審批時選帳戶  
- 法幣、Swap、硬體等進階產品  

註解與死碼訊號（意圖但未完成）：

- `WalletViewLayout`：Tokens / Collectibles / Activities 底欄註解  
- `SettingsMainPage`：Cluster 列無 handler  
- `background`：`openPopup` 即連、`onMessageExternal` connect 皆註解  
- `RefreshOperationStoreCommand`：有發、background 沒接  
- `LoadingOperationScreen`：輪詢錯 store / 錯 null 判斷  
- `ChangedAccountCommand.buildNew`：接受 `publicKey` 卻沒放進訊息  
- `fetchAccountAddresses`：空函式  

---

## 六、完成度總覽

```
[端到端能測、偏「真功能」]
  ├─ 隨機生成錢包 / 只讀錢包 / 選切刪 / 複製地址
  ├─ Wallet Standard 註冊為 Solibra
  ├─ Connect 審批
  ├─ Sign Message 審批（含防簽交易消息）
  ├─ Sign Tx / Sign&Send 審批
  └─ 交易 Simulation UI（SOL + SPL + Jupiter 元資料）← 最強產品點

[底層寫了、用戶摸不到或沒用上]
  ├─ settings 的 cluster / RPC 模型
  ├─ device RSA on install
  ├─ 認真的密碼學原語（被硬編碼密碼架空）
  └─ 多 operation 記錄與過期

[殼子 / 廣告 / 空實作]
  ├─ 首頁 Placeholder
  ├─ Settings 點不動
  ├─ disconnect / signIn / signAll
  └─ 信任站點、靜默連接
```

### 可用性矩陣（速查）

| 區塊 | 判決 |
|------|------|
| 生成 / 只讀 / 選切刪 / 複製 | ✅ E2E 可用（固定密碼、開發 UI） |
| Popup 首頁資產 | ❌ 僅 scaffold |
| Settings / cluster / RPC UI | ❌ stub；store 半成品 |
| Connect / signMessage / signTx / signAndSend | ✅ E2E（mainnet + Wallet Standard） |
| Simulation 展示 | ✅ E2E（mainnet + Jupiter API） |
| Disconnect / Sign In / signAll | ❌ stub 或 throw |
| 帳戶變更通知 dApp | ⚠️ 不完整／不可靠 |
| 密碼解鎖 / 匯入匯出 | ❌ 缺（僅有加密原語） |
| Device RSA + settings RPC | ⚠️ 建了未用 |

---

## 七、工作量體感（方便 Airwave 排優先）

粗估當時力氣落點：

| 比重 | 落在哪 |
|------|--------|
| ~½ | 審批鏈路 + Simulation UI |
| ~¼ | 跨 runtime 訊息與 store sync |
| ~¼ | 帳戶殼、未接上的 settings / 首頁 |

**Airwave 可直接繼承的產品意圖（不是代碼）：**

1. Popout 審批 + 交易 simulation（SOL/SPL 變化講清楚）  
2. Wallet Standard 為主入口  
3. 生成帳戶 + 只讀觀察帳戶  
4. 簽消息時拒絕「其實是交易」的 payload  

**不應繼承的實作套路：** 見 [lessons-from-solibra-wallet.md](./lessons-from-solibra-wallet.md)。

---

## 八、建議寫進 Airwave MVP 時的對照問句

重做時對每條功能問：

1. Solibra 做過嗎？做到哪個深度？  
2. 是「用戶功能」還是「只有 store/死碼」？  
3. 第一刀 MVP 要不要？（建議優先：真實 custody + SW pending hub + connect/sign 垂直切片；simulation 第二波；首頁資產更後）

---

## Smoking-gun / 證據路徑（回看舊碼）

| 路徑 | 對應功能 |
|------|----------|
| `solibra-wallet/src/ui/popup/page/KeyStorePage.tsx` | 帳戶 CRUD |
| `solibra-wallet/src/ui/popup/page/WalletViewLayout.tsx` | 首頁殼 / 註解掉的底欄 |
| `solibra-wallet/src/ui/popup/page/walletSubView/settings/SettingsMainPage.tsx` | Settings stub |
| `solibra-wallet/src/ui/popout/page/*.tsx` | 四種審批頁 |
| `solibra-wallet/src/ui/components/simulationResult/*` | Simulation UI |
| `solibra-wallet/src/common/transactionUtils.ts` | Simulate / 餘額差 / ALT |
| `solibra-wallet/src/inject/solibraWallet.ts` | Provider 方法實作與 stub |
| `solibra-wallet/src/wallet-standard/wallet.ts` | Standard 功能廣告表 |
| `solibra-wallet/src/store/keysStore.ts` | 硬編碼 `lockKey` |
| `solibra-wallet/src/store/settingsStore.ts` | 未接線的 cluster/RPC |
| `solibra-wallet/src/common/configConstants.ts` | 寫死 mainnet RPC proxy |
| `solibra-wallet/README.md` | 官方自稱功能與測試站 |
