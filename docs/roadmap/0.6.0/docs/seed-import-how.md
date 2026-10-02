# HOW — 0.6.0 助記詞匯入

繼承 0.1.0 vault／session 與 0.2.0 `importAccount` 寫 signing 的規則。本檔只寫助記詞預覽與匯入增量。

## 錯誤碼

| code | 何時 |
|------|------|
| `WALLET_LOCKED` | session 未解鎖 |
| `INVALID_MNEMONIC` | 非 12／24、非 English BIP39、validate 失敗 |
| `INVALID_PATH` | `custom` 且 trim 後不含 `{n}`，或衍生拋錯 |
| `ACCOUNT_EXISTS` | 該公鑰已在 signing 或 read-only（與既有 `pubkeyExists`） |
| `BAD_INDEX` | index 非 0–19 整數 |

## Path

`n` 為 account index（0–19）。

| `pathKind` | 模板 | UI |
|------------|------|-----|
| `phantom` | `m/44'/501'/{n}'/0'` | 標準 |
| `cli` | `m/44'/501'/{n}'` | CLI／Ledger |
| `change` | `m/44'/501'/0'/{n}'` | **無**（請用 `custom` 填同模板） |
| `custom` | 使用者字串，`{n}` → 十進位 `n` | 自訂 |

衍生：BIP39 `mnemonicToSeed`（無 passphrase）→ SLIP-0010 ed25519 `derivePath` → `Keypair.fromSeed`（32 bytes）。

## Commands

### `wallet.previewSeedAccounts`

Payload：`{ mnemonic: string, pathKind: "phantom"\|"cli"\|"change"\|"custom", customPath?: string }`

結果：`{ pathPreview: string, accounts: { index: number, publicKeyBase58: string }[] }` 長度 20。

`pathPreview`＝該 `pathKind` 的**模板字串**（`phantom`／`cli`／`change` 用上表；`custom` 用使用者 trim 後字串）。單行 ellipsis。字面 `{n}` **不**替換成數字。**不**呼叫 RPC。


### `wallet.importSeedAccount`

Payload：`{ mnemonic, pathKind, customPath?, index: number, label?: string }`

行為對齊 `importAccount`：須已解鎖；衍生該 index 的 Keypair；寫 secrets＋meta；`kind:"signing"`。省略 `label` 時 label＝``Imported ${accounts.length + 1}``（`accounts` 為寫入前清單）。成功後 **不**改 `activeAccountId`。

助記詞不得寫入任何 `chrome.storage` key，也 **禁止** `console`／擴充 log 印出助記詞原文。


## Popup

1. `add-import-seed` 預設 **12** 個詞格。可貼完整片語：以空白切開、小寫、填入格；詞數 24 則擴成 24 格。已填 12 詞後再於末格繼續輸入／貼上，擴成 24 格。殼底「下一步」僅已填格數為 **12 或 24** 時可點；詞數不對則不送 `previewSeedAccounts`。checksum／詞表仍只在 SW `validateMnemonic`。
2. 點「下一步」後同一 view 切挑帳戶。預設 `pathKind`＝`phantom`。三鈕：「標準」「CLI／Ledger」「自訂」→ `phantom`／`cli`／`custom`。僅 `custom` 顯示 path 輸入。20 列（index＋縮寫公鑰）；殼底「匯入」未選 index 或 `busy` 則 disabled。
3. Back：挑帳戶→詞格（**保留**詞與格數，清預覽選列）；詞格→`add-import` 並清詞、預覽、選列，自訂 path 輸入重置為 `m/44'/501'/{n}'/0'`。關掉 popup（卸載腳本）亦必須丟掉助記詞記憶體。進入挑帳戶屏時若使用者尚未改過自訂字串，該輸入的初始值同此字串。
4. 切 `pathKind` 或自訂 path **失焦** → 再 preview。連發時只採用**較新**一次回應（序號或等價）；過期回應不覆寫列。忙碌時主鈕 disabled；**允許**切方案（新請求取代舊的）。列表可顯示「讀取中」。
5. 錯誤：當屏內容區一句短句（對應 SW `error.message`）。`INVALID_MNEMONIC` 留在詞格屏。`INVALID_PATH`（含 custom 空字或不含 `{n}`）在挑帳戶屏：列清空、不可匯入。`WALLET_LOCKED` 走既有鎖屏，不把助記詞寫進 toast 以外的持久層（toast 亦不得含助記詞原文）。

## 產生新錢包／Burner

### `wallet.generateSeedAccount`

Payload：`{ label?: string }`

結果：`{ account, mnemonic }`。`mnemonic` 為 12 個英文 BIP39 詞。衍生 `pathKind:"phantom"`、`index:0`。寫入對齊 `generateAccount`（signing、省略 label＝`Account ${accounts.length+1}`、不改 active）。助記詞僅此 payload，禁止 persist／log。

Popup：`add-generate-seed` 單屏。進入即在 popup 產生 12 詞並顯示公鑰（不寫 vault）。名稱選填＋警告一句＋唯讀 12 格（每列 3）＋地址列。殼底「建立」→ `importSeedAccount`（phantom、index 0）。Back 回 Add 並清詞。離開 view 清 popup 詞。

### Burner

既有 `wallet.generateAccount`。Add 列文案「建立 Burner 錢包」。成功短地址。Reveal 不變。

