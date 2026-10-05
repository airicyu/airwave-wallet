# 0.12.0 — 代幣詳情與錢包送出

- **狀態：** `shipped`
- **上游版本：** [0.11.0](../0.11.0/INDEX.md)（持倉列版面、簽署交易 popout、pending／custody 不變）
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 原 backlog「從持倉送出代幣」（出貨後已刪檔）；聚合送出仍在 [backlog/send-token-combined.md](../backlog/send-token-combined.md)
- **畫面：** [`docs/design-principles.md`](../../design-principles.md)；概念稿 [`design-demos/send-token-ux.html`](../../design-demos/send-token-ux.html)（非正式；衝突以本 INDEX／HOW 為準）
- **秘密欄位：** 本版無新密碼欄

## 產品句

點 Home 持倉列進入這一顆代幣的詳情。單一可簽帳戶可從詳情「送出」填數量與地址；確認後錢包組一般轉帳，打開**現有**簽署交易審批。批准後由錢包送出並等到 `confirmed`。聚合與觀察可看詳情，沒有送出。不宣告 `signAndSendTransaction`。

## 文件地圖

1. 本檔
2. [docs/send-token-how.md](./docs/send-token-how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. 上游：[0.11.0](../0.11.0/INDEX.md) 簽署／CU、[0.10.0](../0.10.0/INDEX.md) 模擬差額、[0.7.0](../0.7.0/INDEX.md) 持倉列
5. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 範圍 | Popup：持倉列點進詳情；詳情可「送出」；送出填寫後組交易並走既有 popout。SW：組轉帳、新 pending 種 `walletSend`、批准後 `sendTransaction` 並等到 `confirmed`。`connect`／`signMessage`／dApp `signTransaction` 畫面與「只簽不廣播」維持 0.11.0。禁止 Agent、改 vault、地址簿管理、聚合送出、歸集 |
| 持倉列 | **版面不改**（名稱、verified、score、數量加符號、USD、圖示）。整張卡可點進詳情。聚合展開鈕既有 `stopPropagation` 維持，點展開不進詳情。沒有列上「送出」圖示 |
| 詳情 | 圖示、名稱、mint、數量（`uiAmountLabel`＋symbol）、Verified、Jupiter score。原生 SOL（`id === native-sol`）mint 列寫「原生」，沒有複製。其餘 mint 為列 `id`，縮寫前 4…後 4，複製圖示給完整 mint。無 score 寫「—」。無 verified 寫「—」。頂欄 Back＋名稱＋Menu |
| 送出按鈕 | 名稱正下方。圖示＋「送出」文字、有外框、寬度只包內容，**不是**列滿寬主鈕。僅當目前錢包帳戶 `kind === "signing"` 且金庫已解鎖。聚合、觀察、簽不了：**不畫**這顆 |
| 送出填寫 | 資產鎖定為進詳情的那一列，不能改 mint。頁頂左側大字顯示目前帳戶該 token 餘額（`餘額 {uiAmountLabel} {symbol}`）。下一列同一行：標籤「數量」、數量輸入、「50%」、「全部」。收款只手貼 base58。「50%」＝餘額最小單位 `raw / 2`（整除向下）。地址簿未做，不留空圖示。殼底文字主鈕「確認」。無手續費列。wSOL 當該 mint 的 token 送，不 unwrap |
| 「全部」SOL | 可動用＝餘額 lamports − **預留費**。預留＝`5_000`（一個簽名）＋ `ceil(200_000 × defaultCuPrice / 1_000_000)`（與 0.11.0 優先費同一進位）。`defaultCuPrice` 讀 Settings。不打 RPC 估費。預留大於餘額則「全部」disabled、確認不可把數量送到把餘額打穿。SPL／wSOL「全部」＝該 mint 可動用最小單位全額（不扣 SOL 預留進代幣數量） |
| 開戶 | 無目的 ATA：同一筆加 Associated Token Program 的建立指令；token program id 用該列 `tokenProgram`。payer＝送出者。租金 lamports＝`getMinimumBalanceForRentExemption(n)`：無擴充用 **165**；Token-2022 mint 有擴充則 `n`＝該 mint 對應 token account 資料長度（`getAccount` mint 後依官方帳本長度；對不出 → `INSUFFICIENT_FUNDS`、不 pending）。送出者 SOL 須另夠租金＋預留費（native 再加轉出額） |
| 數字 | 數量字串在 SW 用該列 `decimals` 轉最小單位 `BigInt`。算法：通過 `^\d+(\.\d+)?$` 且小數位 ≤ `decimals` 後，**只**做十進位字串補零／去小數點再 `BigInt`。禁止 `Number`、`parseFloat`、`Math.round`、`10 ** n` 當 number。本版不引 `big.js`。持倉列必帶整數 `decimals`；SPL 另帶 `tokenProgram`：`"spl-token"` 或 `"token-2022"`。原生無 `tokenProgram`。`beginSend` 時列上缺 `decimals` 或 SPL 缺 `tokenProgram` → `INVALID_PAYLOAD`，禁止猜 9 或猜 program；popup 應重查持倉 |
| Pending | 新 kind **`walletSend`**。只活在 SW `Map`。popout URL **只**帶 `requestId`。`origin` 記憶體寫 `"airwave:wallet"`（畫面站點「Airwave」）。`tabId`／`frameId` 可用 `0`。**禁止** `sendBridgeResult`／`tabs.sendMessage`／`finishSignTransaction`。逾時、關窗、拒絕只 `runtime` `ui.walletSendSettled`（`ok: false`）並結束 pending。`signAccountId` 凍結開始時的簽名列 id。payload `{ transaction: number[] }` |
| 審批 | **同一套** `kind === "signTransaction"` 的 popout 殼：預期變動、交易費卡、交易明細、拒絕／批准、鎖定解鎖。`ui.simulatePendingTx` **也接受** `walletSend`（規則同未簽 signTransaction：phase 1／1.5／2、CU dirty、writeSeq）。站點列「Airwave」。不另做審批頁 |
| 批准 | `ui.resolvePending` 對 `walletSend` **立刻**回 `{ accepted: true }`，popout 進入「確認中」、**不** `window.close`。SW 背景：對凍結帳戶簽名。一旦已有交易簽名字串：記憶體標 `broadcastSig`；`sendRawTransaction`（`skipPreflight: false`）→ 等該簽名 **`confirmed`**（上限 **60 秒**）。成功再 500ms、關窗、`settled` `ok: true`。進入送出後**取消**該筆既有 `PENDING_TIMEOUT_MS`，改以確認等待為準。若已有 `broadcastSig`：再批准**只**重等 `confirmed`，禁止第二次 send。確認失敗：pending 仍在、短錯誤；再批准只重等。send 尚未成功：可再批准，簽同一份 `workingTx ?? 原始`（不重組、不換 blockhash）。blockhash 過期則短錯誤，使用者須拒絕後重走 `beginSend`。關窗／拒絕：結束 pending、不撤回鏈上；若已有 `broadcastSig`，popup `settled` `ok: false` 且可短錯誤「已送出、確認未知」，仍留填寫頁 |
| 離開 | 成功路徑：popout **關窗**。popup 收到僅擴充內部的 `ui.walletSendSettled`（`ok: true`）後回到 **home-token** 並重查持倉。離開送出填寫頁（返回／進其他 view）或切換作用中帳戶／鎖定時：**清空**數量與收款欄。日後 sidebar 同樣回主畫面（本版不做 sidebar）。dApp `signTransaction` **仍不**廣播、不等 confirmed |
| 命令 | 新增 popup→SW：`wallet.beginSend` payload `{ tokenId: string, amountUi: string, recipient: string }`。`tokenId`＝`native-sol` 或 mint。失敗碼：`NO_ACCOUNT`／`ACCOUNT_READ_ONLY`／`WALLET_LOCKED`／`INVALID_PAYLOAD`／`INSUFFICIENT_FUNDS`／`INVALID_ADDRESS`。成功 `{ requestId }` 並 `openPopout`。鎖定：popup 本就無詳情／送出；若仍呼叫則 `WALLET_LOCKED`、不 pending。擴充頁通知：`ui.walletSendSettled` `{ requestId, ok: boolean }`，**只** `runtime` 擴充頁，禁止內容腳本／全 tab |
| 組交易 | 未簽 `VersionedTransaction`。組交易時 `getLatestBlockhash`（含 `lastValidBlockHeight` 可存記憶體僅供錯誤判斷）。**先不帶** Compute Budget；第一次 `ui.simulatePendingTx` 省略 cu。native：System Transfer。SPL：**TransferChecked**。來源帳戶與列上 `tokenProgram` 一致。同 mint 兩 program 合併為一列時：`tokenProgram`＝持倉管線**先寫入該 mint** 的那一側（現行串行先 legacy Token 再 Token-2022，則先命中 legacy）。**可動用**＝該 program 上來源 token account 的鏈上 amount，**不是** Home 合併加總。超過則 `INSUFFICIENT_FUNDS`。再批准不換 blockhash、不重組 |
| Storage | 不新增 local key。pending／未簽 bytes 不進 chrome.storage |
| test-web | 不宣告新 Wallet Standard 方法。手驗走 popup，不必新 dApp 入口 |

## 非目標

- 聚合送出、歸集（[send-token-combined.md](../backlog/send-token-combined.md)）
- 地址簿管理（[address-book.md](../backlog/address-book.md)）
- `signAndSendTransaction`、dApp 代廣播
- 互換、wrap／unwrap、一次多資產
- 改 connect／signMessage；改 dApp signTransaction 成功語意
- Agent、vault、Sidebar、i18n、storage 遷移
- 指令 IDL 解析
- 用模擬取代批准

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.11.0／現況 | 0.12.0 |
|--------------|--------|
| 持倉列不可點進詳情 | 整列進詳情 |
| 無錢包組交易 | `wallet.beginSend`＋`walletSend` pending |
| 批准只簽名交回 dApp | `walletSend` 批准後錢包送出並等 confirmed |
| 無 `decimals`／`tokenProgram` 在列上 | 持倉列帶這兩欄（原生無 program） |

## 實作 Track

### Track 1 — 持倉列欄位與詳情頁

- **做：** `HomeTokenRow.decimals`、SPL `tokenProgram`；popup 詳情；列可點；送出鈕規則。
- **不做：** 組交易、popout。
- **驗收：** `cd wallet && npm run typecheck`；聚合／觀察無送出鈕；原生 mint 寫「原生」。

### Track 2 — SW 組交易與 `walletSend`

- **做：** `wallet.beginSend`；組未簽 tx；pending `walletSend`；`ui.simulatePendingTx` 接受該 kind；批准簽＋送＋等 confirmed；`ui.walletSendSettled`。
- **不做：** 重做審批視覺。
- **驗收：** typecheck；靜態：dApp `signTransaction` 路徑仍不 `sendTransaction`。

### Track 3 — 送出填寫接審批

- **做：** 送出頁；確認呼叫 beginSend；settled 回 Home；拒絕留填寫。
- **不做：** 地址簿、另做審批頁。
- **驗收：** 本檔 checklist 畫面項。

### Track 4 — build

- **做：** `cd wallet && npm run build`。
- **不做：** 新 Wallet Standard 方法。

## 驗收（出貨 checklist）

- [x] 單一可簽：點持倉列進詳情；列版面與 0.11.0 相同；名稱下有框的「送出」
- [x] 聚合／觀察：可進詳情，無「送出」
- [x] 填合法數量與地址後確認：開既有簽署 popout；可見預期變動、交易費卡、收合交易明細；站點 Airwave
- [x] 批准後錢包送出；轉圈至 confirmed 再約 500ms；popout 關；popup 回 Tokens 且餘額更新
- [x] 拒絕／關窗：未上鏈；popup 仍在送出填寫
- [x] dApp `signTransaction` 仍只回已簽交易、不廣播
- [x] 對方無 ATA 時同一筆代建；租金出在送出者（模擬差額可見 SOL 減少含 rent）
- [x] pending 不進 storage；結果不廣播內容 tab
- [x] `cd wallet && npm run typecheck` 與 `npm run build` 通過
- [x] 文件與程式無真實密碼／助記詞／私鑰

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/shared/home-tokens.ts` | `decimals`／`tokenProgram` |
| `wallet/src/background/home-tokens-service.ts` | 填新欄 |
| `wallet/src/popup/index.html`／`main.ts`／`style.css` | 詳情、送出 |
| `wallet/src/shared/commands.ts` | `wallet.beginSend`、`PendingKind`、`ui.walletSendSettled` |
| `wallet/src/background/index.ts` | 組交易、finish walletSend |
| `wallet/src/popout/main.ts` | simulate 接受 `walletSend`；成功等 confirmed 的轉圈 |
| `docs/design-demos/send-token-ux.html` | 非正式視覺 |
