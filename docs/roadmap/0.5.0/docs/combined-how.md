# HOW — Combined wallet account（0.5.0）

繼承 0.2.0 帳戶／連線、0.3.0 `HomeTokenRow` 與方案 A 畫面、0.4.0 `owners[]` pipe。用語見 [DOMAIN.md](../../../DOMAIN.md)。本檔寫聚合帳戶增量。產品上 **sub＝成員地址、main＝目前錢包**；command 欄位名用 `subPubkeys`／`mainPubkey`。

## Meta（覆寫 0.2.0 `AccountMeta`）

`airwave.accounts.v1` 存 **判別聯合**。舊資料缺 `kind` 仍視為 `"signing"`。

```ts
type SigningOrWatchMeta = {
  id: string;
  label: string;
  kind: "signing" | "readOnly";
  publicKeyBase58: string;
};

type CombinedAccountMeta = {
  id: string;
  label: string;
  kind: "combined";
  subPubkeys: string[]; // 去重、保序；長度 >= 1；每項合法 base58 公鑰
  mainPubkey: string; // 必須 ∈ subPubkeys
  // 禁止 publicKeyBase58 欄（讀到也忽略，不得當暴露公鑰）
};

type AccountMeta = SigningOrWatchMeta | CombinedAccountMeta;
```

**暴露公鑰**（connect 回傳、`account-changed`、Home owners、widget 複製）：

- signing／read-only → `publicKeyBase58`
- combined → `mainPubkey`

`getState` 原樣回傳 meta；popup **不得**對 combined 讀 `publicKeyBase58`。

### 公鑰唯一性（覆寫 0.2.0 `ACCOUNT_EXISTS`）

`ACCOUNT_EXISTS` **只**在 **signing＋read-only** 列之間比對 `publicKeyBase58`。Combined **不**佔用此碼：同一地址可同時是一條 signing（或 read-only）**加上**任意個 combined 的成員。兩個 combined 可共享同一成員地址。生成／匯入／`addReadOnlyAccount` 撞到既有 signing／read-only 公鑰仍 `ACCOUNT_EXISTS`；**不**因某 combined 已含該地址而擋。

禁止巢狀：`subPubkeys` 只接受可解析為 Solana 公鑰的字串，**不**接受另一 combined 的 `id`。

## 解析 `resolvePubkey(pubkey)`

純函式 + 讀 accounts／vault 是否有 secret：

1. 找到 `kind === "signing"`、公鑰相同、且 **vault 該 `accountId` 有 secret**（不論 session 是否鎖定）→ `{ role: "signing", accountId }`  
   （鎖定不在此步改成 read-only。）
2. 找到 `kind === "readOnly"` 同地址 → `{ role: "readOnly", accountId }`
3. 否則 → `{ role: "readOnly", accountId: null }`（含從未入隊、或 **剛被 delete 的前 signing**）

**禁止**用 combined `id` 當 vault／session 密鑰鍵。

## Commands（僅擴充頁；content 不轉發；非擴充 origin → `FORBIDDEN`）

| Command | Payload | 行為 |
|---------|---------|------|
| `wallet.createCombinedAccount` | `{ label?, subPubkeys: string[], mainPubkey? }` | 每項必須可解析為公鑰，否則 **`INVALID_PUBLIC_KEY`**。去重保序後長度 0 → `INVALID_PUBLIC_KEY`。`mainPubkey` 省略＝第一個；若提供且 ∉ 去重後列表 → `INVALID_PUBLIC_KEY`。新建 `kind:"combined"`，**不**寫 vault。鎖定／無 vault **允許**（與 `addReadOnlyAccount` 同級）。 |
| `wallet.addCombinedSub` | `{ combinedId, publicKeyBase58 }` | combined 不存在 → `ACCOUNT_NOT_FOUND`。公鑰無效 → `INVALID_PUBLIC_KEY`。已在列表 → 冪等成功（不變）。否則 append。 |
| `wallet.removeCombinedSub` | `{ combinedId, publicKeyBase58 }` | 不在列表 → `ACCOUNT_NOT_FOUND`（無副作用）。`subPubkeys.length === 1` → **`LAST_SUB_ACCOUNT`**。否則刪除；若刪的是目前錢包，`mainPubkey`＝**剩餘列表第一個**（寫入結果）。 |
| `wallet.setCombinedMain` | `{ combinedId, mainPubkey }` | 須 ∈ subs，否則 `INVALID_PUBLIC_KEY`。成功後見「連線與切目前錢包」。 |
| `wallet.renameAccount` | 既有 | **適用** combined（只改 label）。鎖定允許。 |
| `wallet.deleteAccount` | 既有 | `kind === "combined"`：**允許鎖定時刪**（不改 vault secrets）。斷開 `connections.accountId === 該 combined id` 的 origin（0.2.0 刪帳戶）。若刪的是 active：沿用 0.2.0 切 `accounts[0]`（若還有），`account-changed` 的公鑰＝新列的**暴露公鑰**。 |
| `wallet.setActiveAccount` | 既有 | 可切到 combined。`account-changed` 新暴露公鑰；**不改**各 origin 的 `connections.accountId`（繼承 0.2.0）。通知範圍沿用 0.2.0（既有連線 origins）。 |
| `wallet.exportAccountSecret` | 既有 | combined 本體、或成員只有地址沒有對應 signing 列 → **`ACCOUNT_READ_ONLY`**（不得對 combined `id` 找 secret）。Reveal **只**對 storage 裡的 signing `accountId`。 |

`getState` 的 accounts 含 `kind: "combined"` 列。

## 從 combined 移除成員 vs 刪 storage 帳戶

| 操作 | 行為 |
|------|------|
| combined：移除一個成員地址 | 見 `removeCombinedSub` |
| storage：`deleteAccount` 刪 **signing／read-only** | 各 combined 的 `subPubkeys`／`mainPubkey` **字串不變**。該地址之後走解析第 3 步 |
| storage：刪 **combined 本體** | 見上表 `deleteAccount` |

## 連線與切目前錢包

- Connect 時 active 為 combined → `connections[origin].accountId = combined.id`；inject 公鑰＝`mainPubkey`。目前錢包已是觀察／無 signing 列時 **仍允許 connect**。
- `wallet.setCombinedMain` 成功後：只對 **仍連線且 `accountId` 等於該 combined id** 的 origin 推 **account-changed**（與切真實帳戶同一兩段式），payload＝新 `mainPubkey`。**不**對綁其他帳戶的 origin 推。不發 `disconnected`。**禁止**預設 `tabs.query` 全 tab 廣播。
- inject 帳戶 `features` 仍列 signMessage／signTransaction（對齊 0.2.0：runtime 拒簽，不因 combined／觀察目前錢包動態剝除）。本版 **不**宣告未實作的 Standard 方法。

## 簽名（建 pending 前與 `ui.resolvePending` 批准後同一套閘）

active 為 combined 時，對 **`mainPubkey`**（不是 combined `id`）依序：

1. 無 active → 既有 `NO_ACCOUNT`。
2. `resolvePubkey` 為 `readOnly`（含無列／已刪）→ **`ACCOUNT_READ_ONLY`**（**先於**鎖定）。
3. `resolvePubkey` 為 `signing` 且 session **鎖定** → **`WALLET_LOCKED`**。
4. 其餘對齊 0.2.0（signMessage heuristic 等）後建 pending／簽名。
5. 批准後用 **該 signing 列的 `accountId`** 呼叫 `session.getKeypair`。**禁止** `getKeypair(combined.id)`。

`resolvePending` 防禦：不得只檢查 `active.kind === "readOnly"`；必須跑上列閘（否則 combined 會誤走 `getKeypair(activeId)`）。

## 方案 A UI

- **Add account** 第一層 **只**四個選項按鈕（產生簽名帳戶、匯入 base58 私鑰、觀察帳戶公鑰、Combined）。**禁止**在此頁展開任何輸入欄。點選後進入對應操作頁（`Back` 回類型列表）。Combined 填表頁：
  - 名稱（label）選填。
  - 可貼 **≥1** 個 base58（一行一個或逗號）。
  - **可選**：從本機既有 signing／watch 勾選加入（列：左 checkbox、中名稱、右短地址 前 4…後 4）。勾選不是必填。
  - 目前錢包＝合併去重後 **第一個有效地址**。Create 頁不另選 main。
  - 有效公鑰數為 0 → 不可送出。成功回 `accounts`。
  - 視覺意圖見 [`docs/design-demos/combined-create-050.html`](../../../design-demos/combined-create-050.html)（非正式契約；衝突以本節為準）。
  - 不必先把地址建成 signing／watch。之後加成員／改目前錢包走 **Manage**。
- **Accounts** 列表：combined 列顯示 label＋可辨識為聚合的標記；點主區 `setActiveAccount`。可進 rename／manage。
- **Manage（combined）**：列出成員短地址；標出目前錢包；可切目前錢包（`setCombinedMain`）；可加／移除成員（最後一個移除失敗須顯示錯誤）；加成員＝可貼公鑰 **加上** 本機 signing／watch 勾選列（左 checkbox、中名稱、右短地址）。已在 `subPubkeys` 的列仍顯示且為勾選；再勾未加入者立刻 `addCombinedSub`；取消勾選立刻 `removeCombinedSub`（最後一個成員該列 disable，點了仍 `LAST_SUB_ACCOUNT`）。**無** Reveal 列。Remove 刪的是 **combined 本體**。
- **Manage（signing／watch）**：不變。刪 signing **不**從 combined 踢出該地址。
- **Widget**：active 為 combined 時名稱＝combined `label`；複製／短地址＝**目前錢包** `mainPubkey`（前 4 後 4）。
- 切目前錢包的控制在 Manage（及 HOW 允許的 Accounts 列內切換）；**不是** Token 展開列。

## Home tokens

### 覆寫 0.4.0 `owners` 長度 1

- active 為 signing／read-only → `owners = [暴露公鑰]`，長度 1（與 0.4.0 相同）。
- active 為 combined → `owners = subPubkeys`（去重保序），**允許 `owners.length >= 1`**。**廢除**「長度不是 1 就不打網」守衛。
- 快取指紋 `ownersJoin`＝去重保序後以固定分隔符 join，再加上 0.4.0 既有 settings／cluster 成分。TTL／單佇列／429／Abort 規則不變。禁止對 N 個地址 **平行** 打 DAS。

### 合併與成員明細

串行每個 owner：Helius DAS 路徑與 0.4.0 單 owner 相同；**無 Helius URL 時 RPC fallback 同樣串行 N 次** `getBalance`＋legacy token accounts，再依 `id` 加總。Jupiter 對 **合併後的 mint 列表**打 Tokens v2 search（≤100／批、無 key ≥2s、有 key ≥1s、同一佇列；不打 Price v3）。

依 `HomeTokenRow.id` **加總**（可用最小單位整數再格式化）。SOL 列 id 仍 `native-sol`。濾 0 SPL、SOL 0 仍保留。

合併時 **必須保留** 每個 owner 對該 `id` 的數量。不可只留加總。

```ts
type HomeTokenMemberShare = {
  pubkey: string;
  uiAmount: number;
  uiAmountLabel: string;
  percent: number; // 0–100；分母 = 該列加總
};

type HomeTokenRow = {
  // …0.4.0 欄位
  members?: HomeTokenMemberShare[];
};
```

`members` **僅** combined。只含管線裡該 owner 該 id **有列且數量 > 0** 的成員。沒有此 mint／沒有 native SOL／數量 0 → **不進陣列、UI 不畫該行**（禁止 0% 空行）。順序＝`subPubkeys` 保序（跳過省略者）。單一帳戶路徑 **不**附 `members`。

**%：** `percent = 100 * memberAmount / rowTotal`（與列同一數值來源，勿用 label 回推）。UI 四捨五入到整數；各成員加總可不為 100，不強制調平。SOL 加總為 0 → `members` 為空 → **不畫展開控制**（不另顯示「—%」）。

合併並覆寫 Jupiter 後走 **0.4.0 `sortHomeTokenRows`**（SOL 頂、其餘 `usdTotal` 高→低、無 USD 在底、同組 symbol）。

### 某一 owner 失敗

串行中任一 owner 在 0.4.0 重試後仍失敗 → **整輪失敗**：與 0.4.0 相同，**保留記憶體快取列**（若有）＋ `error` 字串，**不清空**成功過的列表；**不**把「其餘 owner 的部分加總」當成功交貨（避免 % 與合計謊報）。

### 展開 UI

僅 `kind === "combined"` 且該列 `members.length >= 1` 時畫 chevron。預設收合。展開：短地址（前 4…後 4）｜數量＋symbol｜n%。可同時展開多列。再點收合。點展開／明細 **不得** `setCombinedMain`、不發 `account-changed`。Hover tooltip **不是**主路徑。
