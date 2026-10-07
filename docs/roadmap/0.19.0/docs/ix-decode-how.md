# HOW — 0.19.0 靜態指令解讀與 Inspector

上游模擬差額／`unparseable`：[0.10.0 sign-transaction-how](../../0.10.0/docs/sign-transaction-how.md)。CU／`workingTx`：[0.11.0 sign-tx-budget-how](../../0.11.0/docs/sign-tx-budget-how.md)。INDEX 衝突以 INDEX 為準。

## 不改的契約

- pending 只在 SW；UI 只帶 `requestId`
- `ui.simulatePendingTx` 的呼叫時機、CU payload、seq、差額公式不變
- 批准是否可按：仍只看 `unparseable`、CU dirty、hold；**不**看某一條 ix 是否 `decoded`
- 不加套件；不寫 `chrome.storage`

## 對哪一份交易解讀／組 URL

與批准相同：`workingTx` 若已寫入成功則用它，否則用 pending 原始 `transaction` bytes。`VersionedTransaction.deserialize` → `tx.message`。

`inspectorUrl` 與 `instructions` 必須來自**同一份** message。CU 套用成功後的下一次模擬結果兩者都要更新。

## `inspectorUrl`

1. `message.serialize()`（`VersionedMessage`，含 v0 lookup meta，**不含** signature 陣列）。
2. bytes → 標準 base64（可沿用現檔 `bytesToBase64`）。
3. `clusterParam`：`settings.cluster === "devnet"` → `"devnet"`，否則 `"mainnet-beta"`（mainnet 也要帶此 query，不要省略到讓 Explorer 猜錯）。
4. 字串：`` `https://explorer.solana.com/tx/inspector?cluster=${clusterParam}&message=${encodeURIComponent(b64)}` ``
5. 禁止附加 `customUrl`、RPC、API key。

`outcome` 為 `ok`／`fail`／`rpc`：**只要** deserialize 已成功就附 `inspectorUrl`（模擬 RPC 失敗仍可開 Inspector 看 message）。僅 deserialize 失敗（`unparseable`）或不存在 message 時省略／`null`。

CU dirty：Explorer **不** disabled；仍開**上次**模擬回傳的 `inspectorUrl`（對應已提交的 `workingTx ?? 原始`，不是輸入框草稿）。

UI：只有 `inspectorUrl` 為以 `https://explorer.solana.com/tx/inspector` 開頭的字串才插入 `<a>`（或 button＋create）。點擊 `preventDefault` 後 `chrome.tabs.create({ url: inspectorUrl })`。

## `instructions[]`

對 `message.compiledInstructions` **頂層**逐條。帳戶表與 0.11.0 相同：legacy 用 static keys；v0 優先模擬回傳的 `loadedAddresses`，否則 lookup tables；對不出標未解析。**不**列 inner ix。

每條先對 `programId` 與 **精確 data 長度**走下表。吻合 → `decoded: true`，填 `name`、`fields`；**省略** `dataHex`、`desc`、`accounts`。不吻合或帳戶少於表上最低數量 → hex 路徑：`program` 標籤、`accounts` 僅 short、`dataHex` 小寫；**省略** `decoded`、`name`、`desc`。禁止沿用 0.11.0 `instructionDesc` 的寬鬆首 byte 判斷來填指令名。

UI：`decoded === true` 畫 `program`＋`name`＋`fields`，不畫 hex、不畫 `accounts` 清單、忽略 `desc`。否則只畫 program、帳戶縮寫、hex；忽略 `desc`。

`program` 顯示名沿用 0.10.0 熟名表。

### 變體表

多位元組整數皆 **little-endian**。disc 長度寫在「data 長度」；短一截或長一截都不解。

| program | data | 指令名 `name` | 帳戶順序 → `fields`／角色標籤 | 其餘 bytes |
|---------|------|----------------|-------------------------------|------------|
| System `11111111111111111111111111111111` | 12 bytes；bytes 0–3 為 u32 `2`；4–11 為 u64 lamports | 轉移 SOL | [0] 來源 [1] 收款；lamports 用 `BigInt` 十進位字串，標籤 `lamports` | 其它 System disc → hex |
| Compute Budget `ComputeBudget111111111111111111111111111111` | 5 bytes；`data[0]===2`；1–4 為 u32 單位 | 設定計算單位上限 | 標籤 `單位`，值為該 u32 的十進位（此欄 ≤1_400_000，用無號整數即可） | |
| 同上 | 9 bytes；`data[0]===3`；1–8 為 u64 單價 | 設定優先費單價 | 標籤 `單價` | 其它 CB disc（heap 等）→ hex |
| Token `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` 或 Token-2022 `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` | 9 bytes；`data[0]===3`；1–8 為 u64 amount | 轉移代幣 | [0] 來源 [1] 收款 [2] 授權；標籤 `數量`＝amount 十進位（**不**除 decimals） | 多簽剩餘帳戶仍列，標籤 `帳戶` |
| 同上 | 10 bytes；`data[0]===12`；1–8 amount；`data[9]` decimals | 轉移代幣 | [0] 來源 [1] mint [2] 收款 [3] 授權；`數量`、`decimals` | 多簽同上 |
| ATA `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL` | 1 byte `0` 或 `1` | 建立關聯代幣帳戶 | [0] 付款 [1] 帳戶 [2] 錢包 [3] mint；其餘帳戶標籤 `帳戶` | 其它 disc → hex |
| Memo `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr` | 任意；`TextDecoder('utf-8', { fatal: true })` 成功 | Memo | 單一欄 `內容`，值為該字串；畫面**單行 ellipsis** | 解碼丟錯 → hex |

讀 u64：從 8 bytes 組 `BigInt`，禁止 `Number` 再乘。

帳戶不足表上最低數量：該條改走 hex，不要空白角色。

### Result 形狀（可加欄）

```text
{
  ...既有 SimulatePendingTxResult,
  inspectorUrl?: string | null,
  instructions?: {
    program: string,
    name?: string,
    decoded?: true,
    fields?: { label: string, value: string }[],
    accounts?: { short: string, unresolved?: boolean }[],
    dataHex?: string,
    desc?: string,
    unresolved?: boolean
  }[]
}
```

`fields` 的 `value` 一律可用 monospace。帳戶角色寫在 `fields.label`，不要另做 `accounts.role`。

## 測試向量（Track 1 純函式必須覆蓋）

對單條 compiled ix（假帳戶數足夠）：System Transfer 12 bytes disc 2 → decoded；同 disc 但 11 或 13 bytes → hex。CB disc 2 長度 5、disc 3 長度 9 → decoded；CB disc 2 長度 9 → hex。Token TransferChecked 10 bytes → decoded。ATA data `[0]` 且 ≥4 個帳戶 → decoded；僅 2 個帳戶 → hex。Memo 合法 UTF-8 → decoded；非法 UTF-8 一 byte（例如 `0xff`）→ hex。未知 program id → hex 且無 name。

## 畫面（共用殼）

預期變動 `.sim-head`：`h3`「預期變動」＋ `.sim-tools`。

- 重試：放在 `.sim-tools` 內，有底有框 34px；title「重新查詢」。不要改全域 `.icon-btn` 或頂欄複製。
- Explorer：僅當有合法 `inspectorUrl`。accent 描邊。title「在 Explorer 模擬」。CU dirty 仍顯示、仍可點上次 URL。

概念稿路徑：`docs/design-demos/sign-transaction-ix-decode-ux.html`。衝突以 INDEX／本 HOW 為準。

交易明細預設仍收合。展開才見解讀。費用付款人縮寫可留在明細底部。

## 明確不做

- 打 IDL 帳戶、GitHub、Program Metadata
- inner instructions
- 把 Inspector 當模擬 RPC 的替代（重試仍打 `ui.simulatePendingTx`）
