# Airwave 領域用語（Domain language）

跨版本共用。寫 INDEX、HOW、註解、UI 時以本檔為準。  
某版 INDEX **明文覆寫**時以該版為準，並回寫本檔。

每條詞：**中文（規範）**、**英文（規範）**、**定義**。  
**Alias**（含短稱）允許，但能不用就不用；新文件優先寫規範全稱。首次出現用規範名，後文才可用該條列出的 alias。

---

## 詞條格式

```text
中文：…
英文：…
定義：…
程式：…          （若有 storage／型別／欄位）
Alias：…         （可省略；短稱、UI 用詞）
勿用：…          （易混、已廢棄）
```

---

## 產品與程式樹

### Airwave

- **中文：** Airwave；本擴充
- **英文：** Airwave
- **定義：** 本產品，即 Solana Chrome 擴充（wallet app）。清單裡切換的是 **錢包帳戶**。
- **Alias：** 錢包產品、wallet app
- **勿用：** 用「wallet」單指錢包地址；用「wallet」單指聚合錢包帳戶整戶（那是 wallet account）

### 擴充套件目錄

- **中文：** 擴充原始碼目錄
- **英文：** extension package
- **定義：** 倉庫內 `wallet/`，實作 Airwave 的程式，不是領域裡的一戶。
- **程式：** `wallet/`

---

## 理解用詞 vs 真實模型

**真實最底層 domain（能存、能連、能切）：只有錢包帳戶。**  
錢包／簽名錢包／唯讀錢包是 **理解概念**，用來說明「一戶一地址、有鑰或無鑰」；**沒有**獨立的 wallets 表。

```text
理解：                              真實模型（一張 accounts 表）：
  wallet                             錢包帳戶 wallet account
    ├─ signing wallet                  ├─ 單一錢包帳戶  → 嵌 1 個 keypair 或 1 條公鑰
    └─ watch-only wallet               └─ 聚合錢包帳戶  → 嵌 N 條地址 + 目前要用哪一條
```

### 地址

- **中文：** 地址
- **英文：** address
- **定義：** Solana **公鑰**（public address），base58。業界 **wallet address／錢包地址** 即此。
- **程式：** `publicKeyBase58`；pubkey
- **Alias：** pubkey、公鑰；錢包地址、wallet address
- **勿用：** 當成一列錢包帳戶

---

## 理解概念（不單獨持久化）

### 錢包

- **中文：** 錢包
- **英文：** wallet
- **定義：** 理解用：一戶一條地址，不論有沒有私鑰。能力：持產、sign message、sign transaction（無鑰則簽名 runtime 失敗）。**不是** storage 列。
- **程式：** 無。落實見單一錢包帳戶
- **勿用：** 與錢包帳戶、Airwave、錢包地址互代

### 簽名錢包

- **中文：** 簽名錢包
- **英文：** signing wallet
- **定義：** 理解用：有 keypair 的錢包。對應真實模型裡「單一錢包帳戶 + 金庫有該 id 的密鑰」。
- **Alias：** signing account（舊 INDEX）
- **勿用：** real；signable（當種類）；當成第二張表的列

### 唯讀錢包

- **中文：** 唯讀錢包
- **英文：** watch-only wallet
- **定義：** 理解用：只有公鑰的錢包。對應「單一錢包帳戶、金庫無密鑰」，或聚合成員地址在清單裡找不到簽名列。簽名介面仍在，runtime `ACCOUNT_READ_ONLY`。
- **勿用：** watch wallet（無 -only）

---

## 真實模型：錢包帳戶

### 錢包帳戶

- **中文：** 錢包帳戶
- **英文：** wallet account
- **定義：** Domain 最底層實體：App 清單、connect、Home 的一戶。兩種：單一、聚合。
- **程式：** `airwave.accounts.v1` 每一列；`AccountMeta`
- **Alias：** account（清單語境）；儲存帳戶（技術舊稱）

### 單一錢包帳戶

- **中文：** 單一錢包帳戶
- **英文：** single wallet account
- **定義：** 一種錢包帳戶：wrap **一個**理解上的錢包——列上嵌 **一條地址**；若有 keypair，密文在金庫 `secrets[同一 id]`，否則為唯讀。持產／簽名都對這一條（無鑰則簽名 runtime 失敗）。
- **程式：** `kind: "signing"` 或 `"readOnly"`

### 聚合錢包帳戶

- **中文：** 聚合錢包帳戶
- **英文：** combined wallet account
- **定義：** 一種錢包帳戶：wrap **成員地址列表**（N≥1）與其中一個 **目前錢包**（一條成員地址）。持產＝各地址加總。sign message／sign transaction＝目前那條地址：若清單另有單一簽名列且金庫可簽則簽，否則 runtime 失敗。禁止再套聚合。[0.5.0](./0.5.0/INDEX.md)
- **程式：** `kind: "combined"`
- **Alias：** combined；聚合帳戶（舊稱）

### 目前錢包

- **中文：** 目前錢包
- **英文：** active wallet
- **定義：** 理解用：聚合錢包帳戶裡此刻用來露出地址、嘗試簽名的那條成員地址所代表的錢包。切換 → `account-changed`，連線仍綁聚合錢包帳戶 `id`。
- **程式：** 聚合列上的目前地址欄（如 `mainPubkey`）
- **勿用：** 與目前錢包帳戶互代

### 目前錢包帳戶

- **中文：** 目前錢包帳戶
- **英文：** active wallet account
- **定義：** 使用者選中的那一筆錢包帳戶（單一或聚合）。
- **程式：** `activeAccountId`


## 持久化形狀（一張表）

**一個** `airwave.accounts.v1` 陣列，每一列是一個錢包帳戶：

| 列的種類 | 列上嵌什麼 | 私鑰 |
|----------|------------|------|
| **單一錢包帳戶** | 一條公鑰地址、`label`、`id` | 有鑰：金庫 `secrets[同一 id]`（理解為簽名錢包）。無鑰：無（理解為唯讀錢包） |
| **聚合錢包帳戶** | `label`、`id`、**成員地址列表**、目前是哪一條成員地址 | 無。簽名時用該地址去對「有沒有單一簽名列＋金庫」 |

不要第二張 wallets 表。刪單一簽名列＝刪列＋刪金庫該 id；聚合列上的地址可以還在，理解成唯讀錢包。


---

## 鏈上身份（其餘地址詞）

### 成員地址

- **中文：** 成員地址
- **英文：** member address
- **定義：** 聚合錢包帳戶列上嵌的 **一條錢包地址**（公鑰）。列表裡的每一條都叫成員地址。不必先有對應的單一錢包帳戶列；沒有簽名列／金庫則理解成唯讀錢包，簽名 runtime 失敗。
- **程式：** `subPubkeys[]` 的元素（欄位名可日後改成 `memberAddresses`）
- **Alias：** 成員錢包地址、member wallet address
- **勿用：** 子地址（舊稱，易像 nested account）；member wallet／成員錢包（那是理解概念，不是列上的型別）；sub account

### 查詢地址

- **中文：** 查詢地址
- **英文：** query owner
- **定義：** DAS／RPC 的 owner 公鑰。目前錢包帳戶為單一：長度 1。為聚合：各**成員地址**（串行）。
- **程式：** pipe 參數 `owners: string[]`
- **Alias：** owner（HOW 技術段）
- **勿用：** 與錢包帳戶 `id` 混用

---

## 解析後的能力（runtime）

### 可簽

- **中文：** 可簽
- **英文：** signable
- **定義：** 對某條地址：**此刻**能簽名。必須已有對應**簽名錢包**，且金庫已解鎖、能取出私鑰。不是儲存種類名（鎖定中的簽名錢包 ≠ 可簽）。

### 僅可查看

- **中文：** 僅可查看
- **英文：** watch-only（capability）
- **定義：** 對某條地址不能簽名。包含：(1) 有對應唯讀錢包；(2) 清單中沒有該地址（從未加入，或簽名錢包／唯讀錢包已被刪）。聚合可仍保留該成員地址並計入持倉。簽名失敗碼沿用 `ACCOUNT_READ_ONLY`。
- **Alias：** 當唯讀（HOW 動詞短語）

---

## 金庫與連線

### 金庫

- **中文：** 金庫
- **英文：** vault
- **定義：** 以錢包密碼加密存放各**簽名錢包**私鑰的結構；解鎖後明文只在 service worker 記憶體。
- **程式：** `airwave.vault.v1`。session 只留 `saltB64` 與 `keyRawB64`；明文 secrets 只在 service worker 記憶體。

### 錢包密碼

- **中文：** 錢包密碼
- **英文：** wallet password
- **定義：** 解鎖金庫、以及 Reveal **簽名錢包**私鑰時再確認的密碼。不屬於單一儲存帳戶。
- **勿用：** account password

### 已連線站點

- **中文：** 已連線站點
- **英文：** connected site
- **定義：** 已批准 Wallet Standard connect 的網頁 origin，綁定一個**錢包帳戶** `id`（可為聚合錢包帳戶）。
- **程式：** `connections[origin].accountId`
- **Alias：** connection（技術段）

### 待審批

- **中文：** 待審批
- **英文：** pending request
- **定義：** 尚未被使用者批准或拒絕的 connect／簽名請求；只活在 service worker 記憶體。
- **程式：** `pending` Map
- **勿用：** operation store

### WS 帳戶

- **中文：** WS 帳戶
- **英文：** Wallet Standard account
- **定義：** 標準注入給 dApp 的物件，語意是 **一條錢包地址**。目前錢包帳戶為單一：該錢包的地址；為聚合：目前錢包的地址。

---

## 資產顯示

### Token 列

- **中文：** Token 列
- **英文：** token row
- **定義：** 首頁一張持倉卡片（原生 SOL 或某一 mint）。
- **程式：** `HomeTokenRow`
- **Alias：** 卡片列（UI）

### 原生 SOL 列

- **中文：** 原生 SOL 列
- **英文：** native SOL row
- **定義：** Token 列中代表該查詢範圍原生 SOL 的那一列；id 固定；數量為 0 仍顯示且固定第一列。
- **程式：** `id: "native-sol"`

### 持倉

- **中文：** 持倉
- **英文：** balance
- **定義：** 該 Token 列的數量。單一錢包帳戶：該錢包；聚合錢包帳戶：各成員錢包加總（預設只顯示加總）。

### 成員明細

- **中文：** 成員明細
- **英文：** member breakdown
- **定義：** 僅聚合錢包帳戶：使用者展開某一 Token 列後，列出 **持有該 token 且數量 > 0** 的成員地址、其數量與佔該列加總的百分比。沒有該 token 或餘額為 0 的成員不出現。不改變目前錢包。

### 報價

- **中文：** 報價
- **英文：** quote；USD value
- **定義：** 該 Token 列的法幣顯示。沒有可靠價格時為「—」，不得當成持倉為 0。
- **Alias：** USD（UI 右側）

---

## 簽署

### 簽署安全評估

- **中文：** 簽署安全評估
- **英文：** sign-risk check
- **定義：** 簽署交易審批上、尚未排程的輔助說明。構想見 backlog「簽署交易 AI 安全評估」與 bubble-harness。不代簽、不把模型輸出當成鏈上事實。
- **程式：** 未進擴充。POC 在 `test-web/sign-risk.html`
- **Alias：** 安全評估
- **勿用：** 把這張說明叫做 AI 聊天；假定 0.28.0 已出貨此卡

---

## 關係（不是詞條）

```text
理解：wallet → signing / watch-only
真實：錢包帳戶 → 單一（嵌地址±金庫密鑰）／聚合（嵌地址列表＋目前地址）
```

- 切換**目前錢包帳戶**：換 accounts 一列。
- 切換**目前錢包**：同一聚合列內改目前地址；`account-changed`；連線仍綁該列 id。
- 刪單一簽名列：聚合列上的地址仍在，理解成唯讀錢包。
- 聚合永遠 ≥1 條成員地址；不可移除最後一條；解散＝刪該錢包帳戶列。

---

## 歷史別名

左邊不當新規範名（除非已列為 Alias）。

| 舊稱 | 讀成 |
|------|------|
| 單地址帳戶 | 單一錢包帳戶（或理解上的錢包） |
| 舊稿「錢包＝storage 列」 | 錢包只是理解概念；列是錢包帳戶 |
| 舊稿「錢包帳戶不含聚合」 | 錢包帳戶含單一與聚合 |
| signing account／簽名帳戶 | 簽名錢包 |
| real wallet account | 簽名錢包 |
| signable wallet account（當種類） | 簽名錢包或可簽 |
| watch wallet（無 -only） | 唯讀錢包 |
| 聚合帳戶／combined account（舊「不是錢包帳戶」） | **聚合錢包帳戶**（是錢包帳戶的一種） |
| 主地址／active main | 目前錢包（或其地址） |
| 子地址／sub-address／sub account | **成員地址** |
