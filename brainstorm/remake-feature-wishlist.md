# Airwave Wallet — Remake Feature Wishlist

> 目標：在 `airwave-wallet` 重做 Solana Chrome Extension 錢包時的**意向功能清單**（尚未排版本／估點）。  
> 對照：
> - [full-picture.md](./full-picture.md)（整盤產品／架構總覽與三步 roadmap）
> - [lessons-from-solibra-wallet.md](./lessons-from-solibra-wallet.md)（Solibra 教訓）
> - [solibra-feature-summary.md](./solibra-feature-summary.md)（Legacy 做過什麼）
> - [research/extension-message-flow.html](./research/extension-message-flow.html)（多 runtime 訊息流）

本文是 **wishlist**，不是 roadmap 定稿。實作順序與切版本另用 roadmap / `version.md` 管理。

---

## 設計約束（Remake 硬規則）

從 Solibra 反省直接帶進來的約束，寫進 wishlist 以免做功能時又繞回去：

### 1. 壓低第三方依賴

- Wallet **擴充本體**盡量少引 3rd-party library，降低供應鏈／依賴風險。
- 優先：瀏覽器原生 Web Crypto、Chrome Extension API、必要的 Solana / Wallet Standard 官方套件。
- 引入任何新依賴前要能回答：能否自己寫一小段？是否只在 build／UI 工具鏈、而不是進 runtime 關鍵路徑？
- UI 框架若採用，選型要克制；避免「為了一個小 widget 拉一整棵生態」。

### 2. 訊息傳遞保持簡單（不要重蹈 Solibra RSA 橋）

- **不要**再對 inject ↔ content ↔ background ↔ popout 的每筆 operation result 做一層 RSA encrypt/decrypt「防護劇場」。
- 信任邊界靠：**正確的 runtime 隔離 + SW 作為 pending 權威 + 只回原 tab + origin 校驗**，而不是把 payload 再加密一次增加複雜度。
- Event / command bus：**typed 訊息 + `requestId`** 即可；結果走擴充內部通道，不廣播全 tab。

### 3. State / Custody（與功能綁定的預設）

- 持久設定與加密 vault：`chrome.storage` 為真相，`onChanged` 同步各 UI 鏡像；不要手寫 hydrate 同步總線。
- Pending 簽名／連線請求：活在 **background（SW）**，不要當「持久 Zustand store」。
- 私鑰：**使用者密碼加密的 password-boxed vault** 進 secure storage；解鎖後金鑰只活在記憶體（或嚴格 session），可鎖定。

---

## Feature Wishlist

粗分層方便以後切 MVP。編號僅供引用，**不是**實作優先序。

---

### A. Infrastructure

#### A1. Message flow between different runtimes

- 建立 inject / content / background / popup / sidebar（及若需要的 approval UI）之間的**穩定訊息基礎設施**。
- SW 為 pending request hub：`requestId → { tabId, frameId, origin, payload }`。
- UI 只向 SW 取請求／回傳 approve／reject；結果只回發起的 tab。
- 對齊 research：[extension-message-flow.html](./research/extension-message-flow.html)。
- **明確不做：** Solibra 式 per-request RSA 加解密結果。

#### A2. Wallet extension secure storage and settings layer

- 統一的 secure storage / settings 抽象層（包住 `chrome.storage.local`／必要時 `session`）。
- 區分：持久設定、加密 vault、會話態、純 UI 態（見 lessons）。
- Settings 與 vault 的讀寫透過此層，避免各 runtime 各自亂寫。

#### A3. Password-boxed private key store

- 用 **使用者密碼** 加密私鑰（password-boxed vault），再寫入 secure storage。
- Access 前需密碼解鎖；鎖定後清記憶體中的金鑰材料。
- 開發階段可有「dev 預設密碼」開關，**正式路徑禁止 hardcode 密碼當安全機制**（Solibra 教訓）。
- At-rest 保護磁碟／profile 外洩；不解鎖後的全能安全（見先前 custody 討論）。

---

### B. Account & Network

#### B1. Read-only wallet support

- 僅公鑰、不可簽名的觀察用帳戶。
- 出現在帳戶列表；簽消息／簽交易 UI 應拒絕或禁用。

#### B2. Settings for cluster & RPC

- 可選 cluster（至少 mainnet / devnet；可再擴充）。
- 每 cluster 可設定／選擇 RPC endpoint。
- **真正的 `Connection`／simulation／send 必須讀這層設定**，禁止再寫死單一 proxy 卻留空 Settings UI（Solibra 教訓）。

---

### C. Shell UI

#### C1. Popup window UI for wallet

- 傳統 toolbar popup：快速查看、帳戶、進首頁／設定的入口。

#### C2. Sidebar UI for wallet

- 側邊欄（Side Panel）作為更完整的錢包工作區（相對 popup 更耐長操作）。
- 與 popup **共用**帳戶／settings／訊息協議，避免兩套業務邏輯。

---

### D. dApp 連接

#### D1. Register Wallet Standard

- 網站可經 Wallet Standard 發現並連接本擴充。
- 能力宣告與實作一致：做了才廣告（Solibra 教訓：signIn／signAll 空廣告）。
- Remake 初期是否做 legacy `window.solana`：wishlist **暫不強制**；若要加另開條目。

---

### E. Wallet Home & Account Widget

#### E1. UI — Wallet home — main tab: listing wallet tokens

- 首頁主 tab：列出當前帳戶持有的 tokens（餘額／基本資訊）。
- 依賴：當前帳戶 + cluster/RPC settings。

#### E2. UI — Wallet account widget

頂部帳戶元件，包含：

- **顯示**帳戶名稱 + **複製地址**按鈕
- **帳戶列表**
  - **新增帳戶**
    - 從 private key 匯入
    - 隨機生成新錢包
    - 用 public address 新増 read-only 錢包
  - **切換**帳戶
  - **重新命名**帳戶
  - **刪除**帳戶

（相對 Solibra Key Store：補上 import private key、rename；並做成正式 widget 而非開發用按鈕列表。）

---

### F. Common wallet functions（網站發起）

#### F1. Sign message

流程：

1. Website 請求 sign message  
2. 打開錢包簽消息 UI  
3. 顯示待簽訊息資訊  
4. 使用者確認後簽名並回傳  

建議保留：拒絕「其實是 VersionedMessage／交易」的釣魚型「消息」（Solibra 有做、值得留）。

#### F2. Approve transaction

流程：

1. Website 請求 approve transaction（簽交易；是否含「簽並發送」可在實作時拆成 F2a／F2b）  
2. 打開交易審批 UI  
3. 顯示交易資訊（後續可加 simulation／餘額變化；本 wishlist 先要求**可審批的清晰交易資訊**）  
4. 使用者批准或拒絕後回傳  

---

## 與 Solibra 的對照（取捨速記）

| 意向 | Solibra | Airwave wishlist |
|------|---------|------------------|
| 多 runtime 訊息 | 有，但 pending／廣播／hydrate 亂 | A1：SW hub，簡單 command |
| 結果 RSA 加密 | 有（複雜、效益低） | **明確不做** |
| 密碼盒私鑰 | 原語有、密碼 hardcode | A3：真密碼解鎖 |
| 只讀錢包 | 有 | B1：保留 |
| Cluster & RPC | store 半成品、UI／簽鏈未接 | B2：設定真正驅動 RPC |
| Popup | 有殼 | C1 |
| Sidebar | 無 | C2：新增 |
| Wallet Standard | 有（部分空廣告） | D1：做實再宣告 |
| Token 首頁 | Placeholder | E1 |
| 帳戶 widget | 簡陋 Key Store | E2：含 import／rename |
| Sign message / Approve tx | 有（simulation 深） | F1／F2；simulation 可作後續增強 |

---

## 建議的依賴哲學（實作時自查）

允許（預期必要）：

- Solana 官方／準官方：如 `@solana/web3.js` 或後續精簡棧、Wallet Standard 相關型別／介面  
- Chrome Extension types（dev）  
- 極克制的 UI 底層（若不用裸 DOM）

預設拒絕或需書面理由：

- 大型通用狀態／資料庫框架「為了同步多 runtime」  
- 自研重複的跨 context 加密封裝（訊息層）  
- 一堆 utility 巨獸只為少寫幾行  

---

## 不在本 wishlist（刻意先排除，免 scope 爆炸）

可後補，但**現在不寫進第一波意向**：

- 助記詞／HD 路徑／多帳從種子派生（若 import private key 已夠第一波）  
- 硬體錢包、法幣、內建 Swap  
- Sign In (SIWS)、signAllTransactions（需要時再開）  
- Legacy `window.solana`  
- NFT／Activity 完整頁  
- 生物辨識解鎖  

（若要把某一項升進 wishlist，另開條目並改本檔。）

---

## 後續

- 用本檔當「想做什麼」的單一來源；切版本時從 A → F 抽進 roadmap。  
- 建議第一刀垂直切片常是：`A1 + A2 + A3` → 帳戶最小集 → `D1 + F1 或 F2` 端到端，再補 E／C／B2。  
- 具體版本編號與 changelog 走 repo 的 roadmap-version 流程，不在本檔打版本號。
