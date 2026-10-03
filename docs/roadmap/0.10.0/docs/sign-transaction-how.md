# HOW — 0.10.0 簽署交易審批

上游生命週期：[0.1.0 message-flow-how](../../0.1.0/docs/message-flow-how.md)。鎖定／類 B／凍結帳戶對齊 [0.9.0 sign-message-how](../../0.9.0/docs/sign-message-how.md)。INDEX 衝突以 INDEX 為準。

## 不改的契約

- pending 只在 SW 記憶體；popout query 只有 `requestId`
- `dapp.signTransaction` payload `{ transaction: number[] }`；批准成功仍 `VersionedTransaction.deserialize` → `tx.sign([keypair])` → `signedTransaction: number[]`，經 `airwave-bridge-result` 只回原 `tabId`
- inject **不**持有私鑰；UI 批准才簽；**不** `sendTransaction`
- **不**宣告新的 Wallet Standard 方法
- `connect`／`signMessage` 畫面與閘門維持上一版（signMessage 已是鎖定仍開窗；connect 鎖定仍可維持既有 connect 閘門，本版不改）

## `dapp.signTransaction` 閘門（相對 0.9.0）

與 0.9.0 的 `signMessageEnqueueGateError` 相同邏輯（可抽共用，名稱自訂）：

| 條件 | 行為 |
|------|------|
| 無作用中帳戶 | 立刻 `NO_ACCOUNT`，不 pending |
| 作用中唯讀／不能簽 | 立刻 `ACCOUNT_READ_ONLY`，不 pending |
| vault 鎖定 | **仍** `addPending`＋`openPopout`（不要立刻 `WALLET_LOCKED`） |

Enqueue 寫入（僅記憶體）：

- `signAccountId`：當時 `activeAccountId`（可簽，否則應已早退）
- `kind: "signTransaction"`
- payload 原樣

`finishSignTransaction`：**不要**再呼會因鎖定而失敗的舊 `signGateError` 當「改簽別人」；改為：未批准 → `USER_REJECTED`；已批准仍鎖定 → `WALLET_LOCKED` 不簽；否則只對 `signAccountId` 取 key（`keypairForAccountId`／`signingErrorForAccountId`）。禁止 `keypairForActiveSigning` 當本筆主路徑。

關窗：既有 listener；本 kind 拒絕碼 `USER_REJECTED`（與誤關解鎖頁相同）。逾時 `TIMEOUT`。

無法 deserialize 的 bytes：仍允許 pending＋開窗（讓人拒絕）。`finishSignTransaction` 在 approve 且 deserialize 失敗時：對 dApp `INVALID_TRANSACTION`（`"Invalid transaction"`），**禁止** `tx.sign`。拒絕／關窗仍 `USER_REJECTED`。UI `unparseable` 時批准 disabled；仍須防直接 `ui.resolvePending` approve。

## `ui.simulatePendingTx`

- 呼叫者：popout。payload `{ requestId }`。
- SW：`getPending(requestId)`。不存在或 `kind !== "signTransaction"` → `ok: false`、`NOT_FOUND`（不要 `UNKNOWN`）。
- 讀 Settings 目前 cluster 的 `rpcUrl`，`Connection`。整段模擬（含 pre-fetch、`simulateTransaction`、`getFeeForMessage`）共用 **15 秒** AbortSignal；逾時 → `outcome: "rpc"`，`reason` 可寫「逾時」。
- `VersionedTransaction.deserialize` 失敗 → `ok: true`、`outcome: "unparseable"`（無法模擬、批准 disabled）。`instructions` 空；手續費「未知」；不要當 RPC 掛了。
- **差額（必須寫在本節，不是模組註解）：**
  1. 解析 message 帳戶：legacy 用 `staticAccountKeys`；v0 再載入 address lookup table。Lookup 載入失敗 → `outcome: "rpc"`，不要附 `deltas`。
  2. 對凍結公鑰＋上述已解析公鑰做模擬**前** `getMultipleAccounts`（或同等）。
  3. 分類：凍結公鑰的 native lamports；帳戶 `owner` 為 Token／Token-2022 **且** token account 的 token-owner 等於凍結公鑰者，列入該戶 SPL。
  4. `simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true, accounts: { encoding: "base64", addresses } })`。`addresses` **至少**含凍結公鑰＋步驟 3 的 token account。禁止出貨範圍「先只帶 signer」。
  5. `deltas` ＝ post（模擬 `value.accounts` 對應同一 `addresses` 順序）減 pre。SOL：凍結公鑰 lamports 差。SPL：按 mint 加總 token amount 差。零差不列入。**禁止**把 post 存量當增減。
  6. **帳戶不存在**（該槽 `getMultipleAccounts`／模擬 `accounts` 為 `null`）視為該槽存量 **0** 再相減（新建 ATA 入帳等）。僅 RPC 失敗、回傳對不上 `addresses`、encoding 解不出時才不附可信 `deltas`（預期變動「無法估計變動」）。不要把「帳戶尚未存在」當成缺資料。
  7. 前後齊且所有差為 0 → `deltas: []`，UI「無餘額變動」。
- Durable nonce：`replaceRecentBlockhash: true` 可能失真 → 當成 `fail`／`rpc`，不要把差額當可信。
- `getFeeForMessage`：成功則 `feeLamports`；失敗或 `unparseable` → `feeLamports: null`（UI「未知」，禁止 0）。`feePayerShort`：已 deserialize 則從 `tx.message` 寫 payer 前 4…後 4；`unparseable` 則省略。
- **指令列：** 同一 response 附 `instructions[]`（序號順序、program 熟名或縮寫、可選 desc、可選 `unresolved`）。popout **只信此陣列**畫明細，不要自己 deserialize 畫列。SW 列不出 → 空陣列，UI「無法列出指令」。
- **不**把 result 寫入 `chrome.storage`。可暫存在該筆 pending 物件供同窗重入；畫面以本次 command 回傳為準。
- `value.err == null`：`outcome: "ok"`。
- `value.err` 非空：`outcome: "fail"`，附 `err`、`logs`（至少最後約 20 行）、盡力 reason 一行；`deltas` 僅當步驟 5 可算才附。

Result 形狀（可加欄；popout 必須能區分 outcome）：

```text
{
  outcome: "ok" | "fail" | "rpc" | "unparseable",
  reason?: string,
  err?: unknown,
  logs?: string[],
  deltas?: { symbol: string, amount: string, sign: "plus" | "minus" }[],
  feeLamports?: number | null,
  feePayerShort?: string,
  instructions?: { program: string, desc?: string, unresolved?: boolean }[]
}
```

`amount` 已除 decimals，給人讀。

簡單 reason：掃描 `logs` 由尾向前找以 `Error:` 開頭的一行，過長截斷；否則 `JSON.stringify(err)` 截到約 80 字元；都沒有就省略。

## popout 畫面

1. 無 `requestId` 或 `getPending` 失敗 → 標題「審批」；「請求已不在」；兩鈕 disabled。
2. `kind === "signMessage"` → **整段走 0.9.0**，本版不改其主體。
3. `kind === "connect"` → 0.8.0 JSON 版面。
4. `kind === "signTransaction"`：
   - `unlocked === false` → 與 0.9.0 相同解鎖全屏（無頂欄無 dock）。`.primary`／`.primary-btn` 在解鎖屏必須 `flex: none`、一般按鈕高度。
   - 解鎖後殼：頂欄凍結 widget＋複製；中央「簽署交易」；站點 chip。
   - 進入簽署殼後立刻 `ui.simulatePendingTx`（不必等批准）。
   - 疊層由上而下：可選失敗／無法模擬 notice → 預期變動卡 → 交易明細 details（預設關）。
   - 明細內指令列：**只信**本次 `ui.simulatePendingTx` 的 `instructions[]`。空則「無法列出指令」。費用：`feePayerShort`／`feeLamports`（null →「未知」）。
   - 本窗解鎖 → 700ms 批准 hold；popup 先解鎖 → 不必 hold。
   - 模擬進行中：預期變動「查詢中」；批准**可按**（hold 期間除外）。
   - `unparseable`：批准 disabled。
   - 點批准後至結束：批准 disabled；文案「批准中」可選。

指令熟名（靜態，大小寫可比對 Base58）：

| programId | 顯示名 |
|-----------|--------|
| `11111111111111111111111111111111` | System Program |
| `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` | Token Program |
| `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` | Token-2022 |
| `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL` | Associated Token Account |
| `ComputeBudget111111111111111111111111111111` | Compute Budget |
| `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr` | Memo |

固定說明（僅當 data 能用公開 layout **確定**）：System Transfer →「轉移 SOL」；Compute Budget SetComputeUnitLimit／Price →「設定計算單位上限」／「設定優先費單價」；ATA Create／CreateIdempotent →「建立關聯代幣帳戶」；Token／Token-2022 Transfer／TransferChecked →「轉移代幣」。其它：不寫 desc。

解鎖 harden、焦點 CSS：沿用 0.9.0 HOW。視窗尺寸維持既有 create 約 420×640。

殼底（簽署頁）：左拒絕 ghost 約 38%、右批准 primary `flex:1`。鎖定頁 dock `display:none`。
