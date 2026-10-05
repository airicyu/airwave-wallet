# Design review — 0.12.0 Airwave Wallet

- 日期：2026-10-05（Asia/Hong_Kong）
- 輪次：**第 3 輪複審**
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`send-token-how.md`](./send-token-how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`wallet/src/shared/commands.ts`、`wallet/src/background/index.ts`（`sendBridgeResult`、`unbindPopoutByRequest`、`finishSignTransaction`、`ui.resolvePending`）、`wallet/src/background/pending.ts`、`wallet/src/popout/main.ts`、`wallet/src/inject/wallet.ts`、`wallet/src/content/index.ts`、`wallet/src/shared/home-tokens.ts`、`wallet/src/background/home-tokens-service.ts`
- **總評：** 無未關閉 HIGH。M6–M8 已寫進 INDEX／HOW，無「未關且應修」MEDIUM。設計閘門 **通過**。提案 **非不可行**。剩餘僅 LOW 非阻擋。

## Findings（本輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。舊 ID 不重編。本輪新增 L6、L7。

### HIGH

#### H1 — 畫面小數轉最小單位未寫死禁 `Number` — **關閉**

INDEX「數字」、HOW `wallet.beginSend` 步驟 2、HANDOFF starter：通過 `^\d+(\.\d+)?$` 且小數位 ≤ `decimals` 後只做十進位字串補零／去小數點再 `BigInt`；禁止 `Number`／`parseFloat`／`Math.round`／`10 ** n` 當 number；本版不引 `big.js`。

#### H2 — `walletSend` 收尾不得走 dApp 橋 — **關閉**

INDEX「Pending」「命令」、HOW Popout／通知：禁止 `sendBridgeResult`／`tabs.sendMessage`／`finishSignTransaction`；逾時、關窗、拒絕只 `runtime` `ui.walletSendSettled`；進入送出後取消該筆 `PENDING_TIMEOUT_MS`。現碼仍一律橋回，屬實作須分叉，不再是契約缺口。

#### H3 — 再批准未區分已上鏈與未送出 — **關閉**

INDEX「批准」：`broadcastSig` 後再批准只重等 `confirmed`、禁止第二次 send；關窗不撤回鏈上；已送出則 `settled` `ok: false` 且可短錯誤「已送出、確認未知」。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | **關閉** | INDEX「組交易」／「批准」、HOW 步驟 5：組交易時 `getLatestBlockhash`（`lastValidBlockHeight` 可存記憶體）；再批准不換 blockhash、不重組；簽 `workingTx ?? 原始`；過期則短錯誤、須拒絕後重走 `beginSend`。 |
| M2 | **關閉** | INDEX「開戶」、HOW 步驟 3–4：Associated Token Program；token program id＝列上 `tokenProgram`；payer＝送出者；建 ATA 時 SOL 須另夠租金（native 另加轉出額）＋預留費，否則 `INSUFFICIENT_FUNDS`、不 pending。 |
| M3 | **關閉（program 側）** | INDEX「組交易」：同 mint 合併列時 `tokenProgram`＝管線**先寫入**該 mint 的一側（現行先 legacy 再 Token-2022）。可動用定義見 M6。 |
| M4 | **關閉** | INDEX「審批」「批准」、HOW Popout：`walletSend` 與 `signTransaction` 同一簽署殼；`ui.simulatePendingTx` 接受 `walletSend`；`resolvePending` 立刻 `{ accepted: true }`；僅 `walletSend` 不立刻 `window.close`，改「確認中」。 |
| M5 | **關閉** | INDEX「數字」「命令」、HOW 步驟 2：缺 `decimals` 或 SPL 缺 `tokenProgram` → `INVALID_PAYLOAD`，禁止猜 9 或猜 program。 |
| M6 | **關閉** | INDEX「組交易」：**可動用**＝該 `tokenProgram` 上來源 token account 的鏈上 amount，**不是** Home 合併加總；超過則 `INSUFFICIENT_FUNDS`。「全部」SPL／wSOL＝該 mint **可動用**最小單位全額。送出不會把合併加總當單側 TransferChecked 上限。詳情列仍可顯示加總，見 L7。 |
| M7 | **關閉** | INDEX「開戶」：租金 lamports＝`getMinimumBalanceForRentExemption(n)`；無擴充 `n`＝**165**（帳戶資料長度，非寫死租金）；Token-2022 有擴充則 `n`＝對應 token account 資料長度（`getAccount` mint 後依官方帳本長度；對不出 → `INSUFFICIENT_FUNDS`、不 pending）。HOW 步驟 3 只寫「另須夠租金」，數額以 INDEX 為準。 |
| M8 | **關閉** | HOW Popout：`walletSend` **不得**因第一次 `ui.resolvePending` 呼叫 `unbindPopoutByRequest`，直到 settled 關窗或拒絕／逾時結束。確認／送出失敗：pending 仍在；僅擴充頁 `chrome.runtime.sendMessage` `ui.walletSendProgress` `{ requestId, error: string }`；popout 據此畫短錯誤並可再批准。INDEX「命令」未列該命令名，見 L6。 |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **仍開／非阻擋** | 詳情／送出為新 SCREEN：INDEX 未複述頁殼 `min-height: 0`；沉默時仍守 `docs/design-principles.md`。 |
| L2 | **關閉** | INDEX「批准」、HOW：`sendRawTransaction`（`skipPreflight: false`）；`confirmed`、上限 60 秒。 |
| L3 | **關閉／非阻擋** | 0.11.0「只擴 `signTransaction`」已由本版明文擴 `walletSend`；公式預留取代 backlog「查不到費則停用全部」。無需再拍板。 |
| L4 | **仍開／非阻擋** | `beginSend` 失敗碼已列，popup 如何呈現（殼底句／不開 popout）未寫；實作沿用既有 command 錯誤即可。 |
| L5 | **仍開／非阻擋** | Token-2022 transfer fee／hook 額外帳戶未寫；本版可失敗為鏈上錯，不宣告支援。 |
| L6 | **仍開／非阻擋** | `ui.walletSendProgress` 只在 HOW Popout；INDEX「命令」僅列 `beginSend`／`walletSendSettled`。實作讀 HOW 即可，不擋開工。 |
| L7 | **仍開／非阻擋** | Home／詳情仍可顯示同 mint 合併加總（現碼 `mergeWalletBalances` 亦然）；「全部」與 `beginSend` 用單側鏈上可動用。使用者可能看到詳情數量大於可送額，確認時 `INSUFFICIENT_FUNDS`。契約已選此取捨，不要求本版改列加總語意。 |

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 單一可簽：點列進詳情；列版面同 0.11.0；名稱下有框「送出」 | 可 | 無 |
| 聚合／觀察：可進詳情，無「送出」 | 可 | 無 |
| 確認後開既有簽署 popout；預期變動、交易費卡、明細；站點 Airwave | 可 | 無（M4 已關） |
| 批准後送出；轉圈至 confirmed＋500ms；關窗；popup 回 Tokens 且餘額更新 | 可 | 無（M8 已關） |
| 拒絕／關窗：未上鏈；popup 仍在送出填寫 | 可 | 無（M8：批准後不得先 unbind） |
| dApp `signTransaction` 仍只回已簽、不廣播 | 可 | 契約已與 `walletSend` 分叉（H2 已關） |
| 無 ATA 同筆代建；租金出送出者（模擬可見 SOL） | 可 | 無（M7 已關） |
| pending 不進 storage；結果不廣播內容 tab | 可 | 契約已禁橋；現 content 只轉發 `airwave-bridge-*`，`settled`／`progress` 不得借用該 `type` |
| `npm run typecheck`／`build` | 可 | 現碼未做本版 ≠ 設計失敗 |
| 文件與程式無真實秘密 | 可 | 抽樣提案無助記詞／私鑰／密碼／個人地址 |

## 與現碼抽樣

現碼未做本版 ≠ 設計 HIGH。下列為**若照抄現路徑會與已定案互斥**（實作須改，契約已寫）：

- `PendingKind` 僅三態；`ui.simulatePendingTx` 非 `signTransaction` → `NOT_FOUND`。本版加 `walletSend`。
- `ui.resolvePending` 先 `unbindPopoutByRequest` 再 `finishSignTransaction`＋`sendBridgeResult`。與 `walletSend` 禁橋、禁第一次批准解綁、pending 仍在、批准後等 confirmed **互斥**（H2／H3／M8 契約已關）。
- 逾時與 `windows.onRemoved` 一律橋回 `tabId`。須對 `walletSend` 改 `settled` only。
- `inject/wallet.ts` 只宣告 `SolanaSignMessage`、`SolanaSignTransaction`。與「不宣告新方法」**一致**。
- `content/index.ts` 只把 `type === "airwave-bridge-result"` 等轉進頁面。`ui.walletSendSettled`／`ui.walletSendProgress` 不得用該 `type`。
- `HomeTokenRow` 尚無契約要求的 `tokenProgram`（抽樣檔亦無 `decimals` 欄）；合併同 mint **加總**（列展示；送出可動用以契約單側鏈上額為準，M6 已關）。
- popout 簽署殼只認 `signTransaction`，批准後 `window.close()`。
- pending 僅 SW `Map`、popout URL 只帶 `requestId`、storage 無 pending：與提案**一致**。未抽到硬編碼密碼或 inject 持有長期私鑰。

未把 `brainstorm/` 或 `../solibra-wallet` 當已定案。概念稿 `send-token-ux.html` 非正式。待拍板仍空。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | 關閉 | INDEX「數字」；HOW `wallet.beginSend` 步驟 2；HANDOFF starter |
| H2 | HIGH | 關閉 | INDEX「Pending」「命令」；HOW Popout／通知 |
| H3 | HIGH | 關閉 | INDEX「批准」 |
| M1 | MEDIUM | 關閉 | INDEX「組交易」「批准」；HOW 步驟 5 |
| M2 | MEDIUM | 關閉 | INDEX「開戶」；HOW 步驟 3–4 |
| M3 | MEDIUM | 關閉 | INDEX「組交易」（先寫入側）；可動用見 M6 |
| M4 | MEDIUM | 關閉 | INDEX「審批」「批准」；HOW Popout |
| M5 | MEDIUM | 關閉 | INDEX「數字」「命令」；HOW 步驟 2 |
| M6 | MEDIUM | 關閉 | INDEX「組交易」可動用≠合併加總；「全部」用可動用 |
| M7 | MEDIUM | 關閉 | INDEX「開戶」`getMinimumBalanceForRentExemption` |
| M8 | MEDIUM | 關閉 | HOW Popout：禁第一次 approve unbind；`ui.walletSendProgress` |
| L1 | LOW | 仍開 | 非阻擋 |
| L2 | LOW | 關閉 | INDEX「批准」；HOW Popout |
| L3 | LOW | 關閉 | 非阻擋 |
| L4 | LOW | 仍開 | 非阻擋 |
| L5 | LOW | 仍開 | 非阻擋 |
| L6 | LOW | 仍開 | 非阻擋（INDEX 命令未列 progress） |
| L7 | LOW | 仍開 | 非阻擋（詳情加總 vs 單側可動用） |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-05 | 可行，但有未關閉 HIGH（H1–H3）。閘門未過。應修 M1–M5。非不可行。 |
| 第 2 輪複審 | 2026-10-05 | H1–H3、M1–M5、L2–L3 關閉。無未關 HIGH。閘門通過。應修 M6–M8。非不可行。 |
| 第 3 輪複審 | 2026-10-05 | H1–H3、M1–M8 關閉。無未關 HIGH。無未關且應修 MEDIUM。閘門通過。新增 L6、L7（非阻擋）。非不可行。 |
