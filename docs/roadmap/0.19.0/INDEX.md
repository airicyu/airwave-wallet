# 0.19.0 — 簽署交易：靜態指令解讀與 Explorer Inspector

- **狀態：** `shipped`
- **上游版本：** [0.18.0](../0.18.0/INDEX.md)。本版只改簽署交易審批的**交易明細解讀**與預期變動列的 **Explorer Inspector 連結**。不改差額模擬公式、CU 寫入、批准／廣播、Home Activity
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** [backlog/sign-transaction-ix-decode.md](../backlog/sign-transaction-ix-decode.md) 的**靜態層**。Anchor IDL **不**在本版（仍留 backlog）。畫面以使用者同意的 [`docs/design-demos/sign-transaction-ix-decode-ux.html`](../../design-demos/sign-transaction-ix-decode-ux.html) 為準（含強調過的重試／Explorer 鈕）；欄位名單與 URL 以本檔為準
- **畫面：** [`docs/design-principles.md`](../../design-principles.md)；本版預期變動列兩顆工具鈕依概念稿做成有底有框，不把頂欄複製鈕一併加重
- **秘密欄位：** 無新密碼欄

## 產品句

簽署交易審批裡，交易明細對 **已知常見 program** 用靜態 parser 解出指令名與欄位；解不開的那一條維持帳戶縮寫加 hex。預期變動列提供一顆外連鈕，用目前待簽交易的 **message bytes** 打開 Solana Explorer Transaction Inspector。不解 Anchor IDL，也不用解讀結果取代模擬差額。

## 文件地圖

1. 本檔
2. [docs/ix-decode-how.md](./docs/ix-decode-how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. 概念稿 [`docs/design-demos/sign-transaction-ix-decode-ux.html`](../../design-demos/sign-transaction-ix-decode-ux.html)
5. 上游：[0.11.0 INDEX／HOW](../0.11.0/INDEX.md)（明細 hex、CU）、[0.10.0 HOW](../0.10.0/docs/sign-transaction-how.md)（模擬差額）、[0.17.0 INDEX](../0.17.0/INDEX.md)（`signAndSendTransaction` 共用殼）
6. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 與上一版 | pending 只在 SW、不進 `chrome.storage`、結果只回原 tab、custody、CU／`workingTx`、差額主舞台、`unparseable` 批准 disabled、CPI 不列：**維持**。本版**推翻** 0.11.0「明細不解欄位語意」與 0.11.0 非目標「依 common program layout 解 ix」——僅限下表 program／變體 |
| 哪些審批 | 凡走共用審批殼且呼叫 `ui.simulatePendingTx` 的 kind：**`signTransaction`、`signAndSendTransaction`、`walletSend`**。`connect`／`signMessage` 不改 |
| 誰解讀 | **只在 service worker**。popout／popup **只信**本次 `ui.simulatePendingTx` 回的 `instructions[]` 與 `inspectorUrl`。禁止 UI 自己對 program id 表或組 Explorer query 的 message bytes |
| 主舞台 | 仍是 phase 2 預期變動。解讀**只**出現在預設收合的交易明細。解讀失敗**不**擋批准（整筆 `unparseable` 除外，沿用 0.10.0） |
| 靜態名單 | 只解這些 program id（與 0.10.0 熟名表相同字串）。**其它 program、或同 program 但不在變體表的 disc／**compiled ix **data 精確長度不吻合：該條走 hex 路徑**，不要半套欄位。不加 `@solana/spl-token`；layout 手寫，對齊 HOW 節「變體表」 |
| 變體 | **System** 只 `Transfer`（u32 disc＝2 且 data 恰 12 bytes）。**Compute Budget** 只 `SetComputeUnitLimit`（u8＝2 且恰 5 bytes）與 `SetComputeUnitPrice`（u8＝3 且恰 9 bytes）。**Token** 與 **Token-2022** 各只 `Transfer`（u8＝3 且恰 9 bytes）與 `TransferChecked`（u8＝12 且恰 10 bytes）。只看 **compiled ix 的 data 長度與 disc**，不要讀 mint 或 token account 的 TLV／extensions。帳戶 metas 多於表列（多簽）仍可解，多出來的標籤 `帳戶`。**ATA** 只 `Create`（0）與 `CreateIdempotent`（1），data 恰 1 byte。**Memo**（`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`）整段 data 當 UTF-8 字串（畫面單行 ellipsis）；不是合法 UTF-8 則該條 hex。Stake、Address Lookup Table、其它 System／CB／Token disc：**本版 hex** |
| 半套禁止 | **僅** `decoded === true` 才填 `name` 與 `fields`，UI 才畫指令名與鍵值。hex 路徑：**不**填 `name`、**不**填 `desc`、不設 `decoded`。0.11.0 的寬鬆 `instructionDesc`（只看首 byte、不核對長度）**不得**當本版解讀成功，也不得畫在 hex 列上。UI 見非 `decoded` **忽略** `desc` |
| 一條長什麼樣 | 已解：上行 program 熟名、指令名（沿用既有繁中短句：轉移 SOL／設定計算單位上限／設定優先費單價／轉移代幣／建立關聯代幣帳戶；Memo 指令名「Memo」）、其下鍵值列（角色或欄位標籤＋值，單行 ellipsis）。**已解則 SW 省略 `dataHex` 與 `accounts`，UI 亦不畫 hex、不畫帳戶縮寫清單**（雙保險）。未解：program 熟名或縮寫、**無指令名**、帳戶前 4…後 4（無角色）、data 小寫 hex（空則「（空）」）。lookup 對不出的帳戶值為「未解析」，不要錯配下一個 key |
| 數字 | 從 instruction data 讀的 lamports／token amount／CU 整數用 `DataView`／bytes 建成 **`BigInt` 或無號整數**，再 `toString()` 顯示。**禁止**先經 JS `number` 做加減乘除。小數 UI 不在本版（Token amount 顯示最小單位整數字串，不除 decimals） |
| Inspector URL | SW 對**目前會拿去簽的那份**（`workingTx` 若有，否則原始 payload）serialize **message**（不是帶空簽名的整筆 tx）為標準 base64，組成 `https://explorer.solana.com/tx/inspector?cluster={cluster}&message={encodeURIComponent(base64)}`。`settings.cluster === "devnet"` → `cluster=devnet`；否則 `cluster=mainnet-beta`。**禁止**把 `rpcUrl`／Helius／`customUrl` 寫進 query。`unparseable` 或不存在可 serialize 的 message → `inspectorUrl` 省略或 `null`，UI **不畫** Explorer 鈕 |
| 開頁 | 預期變動標題列右側工具組：左重試、右 Explorer。點 Explorer：`chrome.tabs.create({ url })`；URL 必須以 `https://explorer.solana.com/tx/inspector` 開頭否則忽略。整張預期變動卡不可點。tooltip／`aria-label`：「在 Explorer 模擬」。重試維持既有「重新查詢」語意與 disabled 規則（模擬中、CU dirty、未簽尚無合法 CU 對）。**CU dirty 時 Explorer 仍可用**，打開的是**上次模擬結果**的 `inspectorUrl`（即當時的 `workingTx ?? 原始`，不是尚未套用的 CU 草稿） |
| 鈕的樣子 | 對齊概念稿第二稿：熱區 **34×34**；兩顆都有 `--fill` 底與可見邊框，圖示接近正文色、stroke 略粗。Explorer **另**用 `--accent` 描邊與淡藍底（`--accent` 圖示）。樣式只掛在預期變動 `.sim-tools`。頂欄複製鈕與全域 `.icon-btn`**不要**改成這套。無法解析時仍可畫重試（若模擬路徑允許），不畫 Explorer |
| 命令 | 不新增 command。擴充 `SimulatePendingTxResult`：`inspectorUrl?: string \| null`；`instructions[]` 元素可加 `name`、`fields`（`{ label, value }[]`）。`decoded` **只**在該條解讀成功時設 `true`，未解**省略**該欄。已解**省略** `dataHex` 與 `accounts`。hex 路徑可填 `program`／`accounts`／`dataHex`，不填 `name`／`desc`。payload 形狀不變 |
| 依賴 | **不加** npm 套件 |
| Storage | **不**新增 key。解讀與 URL **不**寫入 `chrome.storage` |
| test-web | 不強制新按鈕。手驗可用既有簽交易／送出 |
| 版本號 | 出貨時 `wallet/package.json`、`wallet/manifest.config.ts`、`version.md`、`changelog.md` 對齊 `0.19.0`。狀態改 `shipped` 須使用者同意 |

## 非目標

- Anchor IDL、Program Metadata、ELF、鏈上查 IDL、通用任意 program
- 用解讀取代模擬差額當主舞台；為等解析而禁用批准
- CPI inner instruction、ALT／Stake parser
- Explorer 選擇（Solscan／Orb）；把 Helius RPC 當 Inspector `customUrl`
- 在擴充內嵌 Inspector；把 base64 畫在畫面上
- 改 CU／差額／批准廣播語意；新 Wallet Standard 方法
- 多語言、Sidebar、地址簿、agent
- 改 `../solibra-wallet`

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.18.0／明細現況 | 0.19.0 |
|------------------|--------|
| Home Activity 列尾開 Solscan | 簽署殼預期變動開 Explorer Inspector（未上鏈 message） |
| 明細：帳戶縮寫＋ hex | 常見變體改欄位；其餘仍 hex |
| 重試為透明 icon | 重試與 Explorer 改為有底有框；Explorer 用 accent |

## 實作 Track

### Track 1 — SW 解讀與 Inspector URL

- **做：** 抽出純函式依 HOW 變體表解頂層 compiled ix（含 HOW 測試向量：CB 兩變體、Token TransferChecked、ATA、Memo UTF-8、長度不吻合、帳戶不足、Memo 非 UTF-8）；組 `inspectorUrl`；附在 `ui.simulatePendingTx` 結果。用 `workingTx ?? 原始`。本版**不**引入測試 runner；向量與函式給實作審查靜態對照。
- **不做：** UI 樣式；查鏈上 IDL。
- **驗收：** `cd wallet && npm run typecheck`。已解省略 `dataHex` 且 `decoded === true`；hex 路徑無 `name`／`desc`；`unparseable` 無 URL；`fail`／`rpc` 只要 message 可 serialize 仍附 URL。

### Track 2 — 審批殼畫面

- **做：** 交易明細依 `decoded` 畫鍵值；預期變動列 34px 重試＋Explorer；`chrome.tabs.create`。
- **不做：** 改 connect／signMessage；改頂欄複製鈕樣式。
- **驗收：** 對齊概念稿密度；無法解析不畫 Explorer；點 Explorer 的 URL 前綴正確。

### Track 3 — build

- **做：** `cd wallet && npm run typecheck` 與 `npm run build`。
- **不做：** 新依賴。

## 驗收（出貨 checklist）

- [x] 未簽可解析的 System Transfer：明細展開見「轉移 SOL」與來源／收款／lamports，該條無 hex、無舊 `desc` 半套
- [x] Track 1 純函式對 HOW 向量：CB limit／price、Token TransferChecked、ATA Create、Memo UTF-8 為 `decoded`；data 過長或過短、帳戶不足、Memo 非 UTF-8 為 hex 且無 `name`
- [x] 未知 program 的那一條見帳戶縮寫與 hex、無指令名；批准仍可按（非 `unparseable`）
- [x] 預期變動列有重試與 Explorer（34px、Explorer accent）；點 Explorer 開新分頁且 URL 為 `https://explorer.solana.com/tx/inspector` 並含 `message=`
- [x] `cluster` 為 currently settings：devnet → `cluster=devnet`，否則 `mainnet-beta`；URL 不含自訂 RPC
- [x] 套用 CU 成功後，Inspector 反映寫入後的 message（至少 CB 欄位與 URL 來自 `workingTx`）
- [x] `unparseable`：不畫 Explorer；批准 disabled
- [x] `signAndSendTransaction` 與 `walletSend` 同一套明細與鈕；connect／signMessage 不變
- [x] 未加套件；解讀不進 `chrome.storage`
- [x] `cd wallet && npm run typecheck` 與 `npm run build` 通過
- [x] 手驗：test-web 簽一筆可解析交易，展開明細見欄位，Explorer 能打開 Inspector（使用者同意出貨）
- [x] 文件與程式無真實密碼／助記詞／私鑰

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `docs/design-demos/sign-transaction-ix-decode-ux.html` | 同意的畫面 |
| `wallet/src/shared/simulate-pending-tx-types.ts` | `instructions`／`inspectorUrl` |
| `wallet/src/background/simulate/simulate-pending-tx.ts` | `buildInstructions`、現有 desc |
| `wallet/src/approval/shell.ts` | 預期變動列、交易明細 |
| `wallet/src/popout/style.css` | 審批樣式（popup 若共用則一併） |
