# 0.5.0 — Combined wallet account

- **狀態：** `in progress`
- **上游版本：** [0.4.0](../0.4.0/INDEX.md)（實作本版前，**0.3.0 與 0.4.0 均須 `shipped`**）
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **Backlog：** [combined-wallet-account.md](../backlog/combined-wallet-account.md)（來源；**以本 INDEX 為準**）

## 產品句

使用者可建立 **combined** 帳戶：sub 是 **地址集合**（不必先在 storage 建檔），永遠有 **≥1 個 sub** 與一個 **active main**（必為其中之一）。Home 預設顯示各 sub **加總**的 SOL／token；每列可 **展開** 看各成員地址的數量與佔該列加總的 **%**。dApp 連線掛在 combined 上，暴露與簽名只用 **當時 main 的公鑰**；切 main 對已連線站走 **`account-changed`**。storage 刪掉原本的真實錢包後，該地址在 combined **runtime 當 read-only**。本版不做 sidebar、agent、助記詞。

## 文件地圖

1. 本檔
2. [DOMAIN.md](../DOMAIN.md)（用語：成員地址／目前錢包；下文 sub／main 為 alias）
3. [docs/combined-how.md](./docs/combined-how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 上游：[0.4.0 token-data-how](../0.4.0/docs/token-data-how.md)（`owners[]` pipe）、[0.3.0 popup-shell-how](../0.3.0/docs/popup-shell-how.md)、[0.2.0 accounts-home-how](../0.2.0/docs/accounts-home-how.md)、[0.2.0 disconnect-how](../0.2.0/docs/disconnect-how.md)
6. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 兩層 | **Storage** 仍存 signing、read-only、以及 combined 本體（有 id／label，**無**私鑰）。`AccountMeta` 為判別聯合：signing／read-only **必有** `publicKeyBase58`；`kind:"combined"` **禁止**用該欄當暴露公鑰，必有 `subPubkeys`／`mainPubkey`。**`ACCOUNT_EXISTS` 只比對 signing＋read-only**。同一地址可同時是真實列＋combined 成員。暴露公鑰：combined＝目前錢包 `mainPubkey` |
| 禁止巢狀 | subs **只放地址**，不放另一個 combined 的 id |
| 解析（runtime） | 該地址在 storage 為 **signing** 且 vault 有 secret → 可簽。為 read-only、或 **storage 沒有此地址**（含從未加入、或 **已 delete 該真實／觀察帳戶**）→ **當 read-only**：可計入餘額，簽名 **`ACCOUNT_READ_ONLY`**（與 0.2.0 相同碼） |
| Main 被刪 | Combined 的 main 原本指向某 **real** 帳戶，使用者在 storage **delete 該帳戶**（不是從 combined 移除 sub）：**sub 列表與 main 指標不變**；此後 runtime 該 main **當 read-only**。**不**自動改選其他 sub |
| 至少一 sub | Combined **永遠 ≥1 個** sub。建立時必須帶至少一個地址。從 combined **移除 sub** 時，若目前只剩 **1** 個 → **拒絕**（錯誤碼如 `LAST_SUB_ACCOUNT`），列表不變 |
| 刪 combined 本體 | 允許（與刪一般帳戶類似）：從 storage 移除 combined id；連線若綁此 id 則斷開。這不是「移除最後一個 sub」 |
| Active main | 永遠存在且 **∈ subs**。使用者可在 subs 間切換。切 main → 已連線 origin **`account-changed`**（新公鑰 = 新 main），**不斷開**。targeted tab，不廣播 |
| Connect | `connections[origin].accountId` = **combined 的 id**。WS 帳戶公鑰 = **main 地址**。Main 已是觀察時 **仍允許 connect**（對齊 0.2.0 read-only） |
| 簽名 | 閘門對 **目前錢包公鑰**，取鑰用 **signing 列 `accountId`**，禁止 `getKeypair(combined.id)`。優先序：無帳戶 → 目前錢包為觀察／無列 → `ACCOUNT_READ_ONLY`（先於鎖定）→ 可簽但鎖定 → `WALLET_LOCKED` → 其餘對齊 0.2.0。inject features 不因 combined 剝除 |
| Home | SOL／token **依 mint（及 native-sol）加總**；顯示規則沿用 0.3.0（0 SPL 不畫、SOL 加總為 0 仍第一列、沒價「—」）。**僅 combined：** 每列右側（或列尾）有展開控制；預設收合。展開後**只**列出 **持有該 token 且數量 > 0** 的成員地址：數量與 **佔該列加總的 %**（分母＝該列加總，不是全錢包 USD）。地址顯示 **前 4 後 4**。沒有該 mint／native SOL、或 `uiAmount`／最小單位為 0 的成員 **整行不畫**（不是畫 0%）。點展開／明細 **不** 改 main、不發 `account-changed`。單一簽名／觀察帳戶 **不** 畫展開控制。**不用** hover tooltip 當主路徑 |
| 查詢 | 沿用 0.4.0 **單一 pipe**：**廢除**「owners 長度必須為 1 才打網」。combined 時 `owners = subPubkeys`（≥1）**串行**（含 RPC fallback）。任一 owner 最終失敗 → 整輪失敗、保留快取＋error，不交部分加總。少打、排隊、可重試。禁止平行打 DAS |
| UI | 方案 A：Add 第一層四選一（產生／匯入／觀察／Combined），各自 **另開操作頁**（不在類型列表展開欄位）。Combined 表單：label 選填、可貼 ≥1 公鑰、可勾本機既有帳戶；目前錢包＝第一個有效地址。Accounts／Manage 可加刪成員、切目前錢包、rename；Manage 加成員與建立頁相同：可貼公鑰；本機 signing／watch 一律列出，已加入者勾選，勾選／取消立刻 `addCombinedSub`／`removeCombinedSub`；刪 combined 比照觀察（鎖定可刪）。Reveal **只**對 storage signing；對 combined 本體 → `ACCOUNT_READ_ONLY`。Widget 複製目前錢包公鑰。細節見 HOW |
| 依賴／測試 | 不為本版加 SDK；手驗 + build |

## 非目標

- 0.3.0／0.4.0 範圍重做
- Combined 再套 combined、助記詞、sidebar、agent、Activity 鏈上歷史
- 自動把「只剩觀察 main」改選成另一個可簽 sub

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.4.0 | 0.5.0 |
|-------|--------|
| `owners` 長度 1 | combined active 時 `owners = subs` |
| 帳戶僅 signing／read-only | ＋ combined |
| 切帳才 account-changed | 切 **main** 也 account-changed（連線仍在） |

## 實作 Track

### Track 1 — Storage／解析／CRUD

- **做：** combined meta（subs、mainPubkey）；建立 ≥1 sub；移除最後一個 sub 失敗；delete storage 真實帳戶後 combined 仍留地址；解析函式。
- **不做：** Home 加總 UI。
- **驗收：** 單 sub 無法從 combined 移除；刪真實 main 後該 combined 仍在且 main 地址不變、getState／解析為 read-only。

### Track 2 — Connect／切 main／簽名

- **做：** 連線綁 combined id；expose main；切 main → account-changed；main 觀察則拒簽。
- **驗收：** test-web 連上後切目前錢包見到新公鑰且不必重 Connect；觀察目前錢包 → `ACCOUNT_READ_ONLY`；鎖定且目前錢包可簽 → `WALLET_LOCKED`。

### Track 3 — Home 加總 + pipe

- **做：** `getHomeTokens` 對 subs 串行再合併；合併前 **保留每 owner 每 id 的數量**，供展開列；TTL／429 規則不變。
- **驗收：** 兩地址各有不同 mint 時列表為聯集加總；切 combined 不平行多輪；回傳結構含每列成員明細（即使 popup 尚未畫）。

### Track 4 — Popup UI 與拋光

- **做：** 建立：Add → Combined **新頁**填表（見 HOW）；編輯／切 main；combined Home 展開列；version `0.5.0`。
- **驗收：** 方案 A 可完成上列手勢；combined 下列可展開見數量與 %，再點收合；單一帳戶無展開鈕；build 通過。

## 驗收（出貨 checklist）

- [x] `cd wallet && npm run build` 成功
- [x] 可建 combined（≥1 地址，含已是 signing 列的地址、以及從未入隊的地址）；不能把成員刪到 0
- [x] `setActiveAccount` 切到另一 combined／切回單一：dApp 見新暴露公鑰，既有 `connections.accountId` 不變
- [x] 刪 storage 中原為 main 的 signing 帳戶後：combined 仍在、main 地址仍在、簽名 `ACCOUNT_READ_ONLY`
- [x] 切目前錢包：僅 `connections.accountId` 等於該 combined 的 origin 收到 `account-changed`；該欄仍為 combined id
- [x] 鎖定＋combined＋目前錢包對應可簽列：簽名 `WALLET_LOCKED`（不是 `ACCOUNT_READ_ONLY`）
- [x] Home 為加總；查詢走單一 pipe
- [x] Combined：展開 Token 列只見持有該 token 且餘額 > 0 的成員（數量與該列 %）；沒有該 token 或餘額 0 不畫該地址；展開不改 main
- [x] 非 combined：Token 列無展開控制
- [x] 無巢狀 combined
- [x] pending／custody 禁區未破

## 手驗指令

```text
cd wallet && npm run build
cd test-web && npm run dev
# 未封裝擴充：建 combined（含一從未在 storage 的地址，以及一已是 signing 的地址）
# 刪掉曾為 main 的 signing 帳戶 → 簽名被拒、列表仍在
# 僅一 sub 時嘗試移除 → 失敗
# test-web Connect 後在 popup 切 main → 頁面公鑰變、不斷開
# combined Home：展開一列 → 只見餘額>0 的地址與 %；再點收合；切單一帳戶無展開鈕
# 鎖定時對 combined（目前錢包可簽）簽名 → WALLET_LOCKED
# 切目前錢包：僅綁該 combined 的 test-web 公鑰變；connections 仍為 combined id
```

## 錨點

| 路徑 | 用途 |
|------|------|
| `wallet/src/shared/storage-keys.ts` | AccountMeta 聯合型別 |
| `wallet/src/shared/commands.ts` | 新增 combined commands |
| `wallet/src/background/index.ts` | CRUD、解析、連線、簽名閘 |
| `wallet/src/background/home-tokens-service.ts` | N-owner 串行、合併 `members` |
| `wallet/src/inject/wallet.ts` | 暴露目前錢包公鑰 |
| `wallet/src/popup/` | 方案 A combined UI |
