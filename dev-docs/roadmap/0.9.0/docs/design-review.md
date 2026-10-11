# Design review — 0.9.0 Airwave Wallet

- 日期：2026-10-04（Asia/Hong_Kong）
- 輪次：**第 3 輪複審**
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`sign-message-how.md`](./sign-message-how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)；上游 [`../../0.1.0/docs/message-flow-how.md`](../../0.1.0/docs/message-flow-how.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`wallet/src/background/index.ts`（`dapp.signMessage`、`finishSignMessage`、`windows.onRemoved`、`looksLikeVersionedTransaction`、`signGateError`）、`wallet/src/background/pending.ts`、`wallet/src/shared/commands.ts`、`wallet/src/popout/*`、`wallet/src/popup/style.css`、`wallet/src/popup/index.html` `#locked`
- **總評：** 無未關閉 HIGH。審查門檻**通過**。M6 已在現 INDEX「解鎖後連點」與驗收「僅本窗剛按解鎖／popup 先解鎖則不必」關閉，HOW 第 3 點、HANDOFF paste-ready、reasoning 鎖定節一致。提案不可行＝否。剩餘 L1–L4（非阻擋）。應修 MEDIUM＝無。

## Findings（本輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。  
舊 ID 不重編；本輪只核對現契約檔。

### HIGH

#### H1 — 帳戶 widget 與實際簽名帳戶的時序未釘死 — **關閉**

**初審題旨：** INDEX 當時規定顯示對象＝`getState` 作用中簽名帳戶，批准仍走既有 `keypairForActiveSigning`。簽署頁開著時 popup 仍可 `setActiveAccount`，可見公鑰可與實際簽名帳戶不同。

**第 2／3 輪：** 已定案「站點與帳戶」凍結 enqueue 時 `signAccountId`（僅 SW Map）；widget 只顯示該帳戶 meta；`finishSignMessage` 只對該 id 取 key；已刪／唯讀／無密鑰則失敗、禁止改簽別戶；popup 切帳戶不改本筆。HOW「`dapp.signMessage` 閘門」寫入欄；「結束 pending」批准對 `signAccountId` 取 key。HANDOFF paste-ready 同句。reasoning「為何凍結簽名帳戶」對齊。

#### H2 — 交易當訊息畫面與 UTF-8／hex 卡的優先序未寫死 — **關閉**

**初審題旨：** 未寫交易判定優先於文字卡；先 UTF-8 成功可能畫 Message payload 並啟用批准，違反「僅短句」。

**第 2／3 輪：** 已定案「交易當訊息 UI」：**優先於** UTF-8／hex；popout **只信** `ui.getPending` 的 `messageLooksLikeTx` 畫主體，不要自己 parse；短句「不能把交易當成訊息簽署。」；不畫 payload／Raw binary；批准 disabled。HOW「popout 資料」第 6 點主體分支；判定節規定 popout 不要自 parse。HANDOFF 同。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | **關閉** | 初審：popup 先解鎖時審批窗可能卡在解鎖屏。現 INDEX「鎖定仍開窗」：本窗 `wallet.unlock` **或** popup 解鎖使 `getState.unlocked === true`；須訂閱既有 `chrome.storage.onChanged` 與／或重拉 `getState`，禁止自寫 rehydrate；popup 先解鎖則不必 700ms hold。HOW「popout 資料」第 3 點。HANDOFF paste-ready 同。 |
| M2 | **關閉** | 初審：「整段佔滿」未寫死。現 INDEX「交易當訊息」與 HOW「交易 message 判定」：`serialize()` 的 `byteLength ===` 原 `bytes.length`；長度不等或丟錯則否。HANDOFF 同。 |
| M3 | **關閉** | 初審：getPending 未帶旗標。現 INDEX「命令」SW pending 可加欄；「交易當訊息 UI」只信旗標。HOW 閘門：`ui.getPending` 的 `result` 帶 `signAccountId` 與 `messageLooksLikeTx`。HANDOFF enqueue 兩欄。 |
| M4 | **關閉** | 初審：HOW 範例只有 `:focus`。現 INDEX「Focus」與 HOW「焦點 CSS」皆含 `:focus` **與** `:focus-visible`。 |
| M5 | **關閉** | 初審：載入失敗標題未寫死。現 INDEX「載入失敗」與 HOW「popout 資料」第 1 點：無 `requestId` 或 getPending 失敗／NOT_FOUND → 標題「審批」、主體「請求已不在」。成功且 `kind === "signMessage"` →「簽署訊息」。 |
| M6 | **關閉** | 第 2 輪：INDEX「解鎖後連點」與驗收 700ms 句未寫 popup 例外，與「鎖定仍開窗」／HOW／HANDOFF 分叉。**第 3 輪：** 已定案「解鎖後連點」寫 **僅本窗剛按解鎖** 才 700ms；popup 先解鎖 **不必** hold；批准點下後至關窗前批准再 disabled。驗收同句。HOW 第 3 點兩分支、HANDOFF paste-ready、reasoning 鎖定節已對齊。對照表「700ms 批准 hold」、Track 2「700ms hold」未再複述例外，不重開本題（見 L4）。 |

本輪**無新增 MEDIUM**。

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | 仍開，非阻擋 | Track 1 驗收仍偏靜態；關窗交易碼手驗可留到 Track 4。出貨仍靠 checklist。 |
| L2 | 仍開，非阻擋 | 現碼 popup `style.css` 仍有全域 `input` 寬度風險；INDEX 已禁焦點規則壓扁 radio。實作時與 radio 重置並存即可。 |
| L3 | 仍開，非阻擋 | 0.1.0 message-flow 關窗一律 `USER_REJECTED`、`wallet.unlock` 寫 popup。0.9.0 已增量覆寫。可選出貨後回寫一句。 |
| L4 | 仍開，非阻擋 | **本輪新增。** INDEX「與上一版對照」與 Track 2 仍寫「700ms hold」未複述「僅本窗」。已定案列與驗收已閉 M6；實作以已定案為準即可。 |

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 已解鎖 UTF-8：非 JSON；標題、origin、凍結 widget、Message payload、收合 Raw binary；切帳戶不改簽名者 | 可測 | H1 已關 |
| 非 UTF-8：無文字卡；hex 主卡；複製無空白小寫 hex | 可測 | 無 |
| 整段交易 message：僅短句；批准 disabled；拒絕 → 交易碼；不簽名 | 可測 | H2、M2、M3 已關 |
| 同上關窗：同一錯誤碼 | 可測 | HOW 已寫；現碼尚未做（≠設計 HIGH） |
| 鎖定簽訊息：不立刻 `WALLET_LOCKED`；解鎖屏無殼底；解鎖後簽署頁；**僅本窗剛按解鎖** 700ms disabled（popup 先解鎖則不必） | 可測 | M1、M6 已關 |
| `ui.getPending` 失敗：請求已不在；兩鈕 disabled | 可測 | M5 已關（標題「審批」在已定案） |
| connect／signTransaction 內容契約與 0.8.0 相同 | 可測 | 範圍清楚 |
| 解鎖欄非 `type="password"` | 可測 | 類 B 已寫 |
| popup／popout 文字欄 accent focus；radio 不壓扁 | 可測 | M4 已關；L2 現碼注意 |
| pending 不進 storage；結果只回原 tab | 可測 | 與禁區一致 |
| `cd wallet && npm run build` | 可測 | 無 |
| 文件與程式無真實秘密 | 可測 | 本審查未見違規 |

待拍板＝空。GUIDELINES：pending 僅 SW Map、不 storage hydrate、不廣播、custody 類 B、解鎖訂閱既有 `onChanged` 而非自寫 rehydrate 總線——現 INDEX／HOW 未推翻禁區。

## 與現碼抽樣

現碼未做本版 ≠ 設計 HIGH。下列為**現行行為與提案互斥**（實作 Track 應改掉），不是對契約的否決。抽樣與第 2 輪一致。

| 現碼 | 0.9.0 提案 |
|------|------------|
| `dapp.signMessage` 先 `signGateError()`，鎖定立刻 `WALLET_LOCKED` | 鎖定仍 `addPending`＋`openPopout`；`NO_ACCOUNT`／`ACCOUNT_READ_ONLY` 仍立刻失敗（須拆閘門，不可整包沿用 `signGateError`） |
| `looksLikeVersionedTransaction`：長度 ≥ 80 且首字節 `0x80`／`0x81`，enqueue 前立刻回交易碼 | SDK 整段佔滿；仍開窗；該碼只在拒絕／關窗／誤 approve |
| `finishSignMessage` 拒絕一律 `USER_REJECTED`；approve 不檢驗交易 message 即 `nacl.sign.detached`；簽名走作用中帳戶 | 交易 message 永不簽；只簽 `signAccountId` |
| `windows.onRemoved` 一律 `USER_REJECTED`＋`Approval window closed` | 須讀 pending kind＋同一判定；交易 message 用交易碼 |
| popout 三種 kind 共用 origin＋一句＋JSON `<pre>` | 僅 `signMessage` 專用頁；另兩種維持 |
| `pending.ts`：記憶體 Map＋`windowId` 綁定；無 storage | 與提案一致，勿改成 hydrate |
| `commands.ts`：不擴 command 名；pending 型別尚無 `signAccountId`／`messageLooksLikeTx` | 原則不擴 command 名；可擴記憶體 pending 欄 |
| popup `#locked.unlock-screen` 已接近 HOW；缺全域文字欄 `:focus`／`:focus-visible` | Track 3 |
| `isExtensionPage` 允許擴充 origin 的 `wallet.*` | popout 呼 unlock／getState 相容 |
| inject 仍宣告 `solana:signMessage`／`signTransaction`，未宣告 `signIn`／`signAllTransactions` | 本版不改註冊表 |

未把 `brainstorm/` 或 `../solibra-wallet` 當現行程式。backlog／概念稿非正式。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | 關閉 | INDEX 已定案「站點與帳戶」；HOW「閘門」enqueue 欄、「結束 pending」取 key、「popout 資料」第 4 點；HANDOFF paste-ready |
| H2 | HIGH | 關閉 | INDEX「交易當訊息 UI」；HOW「交易 message 判定」＋「popout 資料」第 6 點；HANDOFF paste-ready |
| M1 | MEDIUM | 關閉 | INDEX「鎖定仍開窗」；HOW「popout 資料」第 3 點；HANDOFF paste-ready |
| M2 | MEDIUM | 關閉 | INDEX「交易當訊息」；HOW「交易 message 判定」步驟 1–3 |
| M3 | MEDIUM | 關閉 | INDEX「命令」＋「交易當訊息 UI」；HOW 閘門末段 getPending 帶兩欄 |
| M4 | MEDIUM | 關閉 | INDEX「Focus」；HOW「焦點 CSS」 |
| M5 | MEDIUM | 關閉 | INDEX「載入失敗」；HOW「popout 資料」第 1 點 |
| M6 | MEDIUM | 關閉 | INDEX「解鎖後連點」＋驗收 700ms 句；HOW「popout 資料」第 3 點兩分支；HANDOFF paste-ready |
| L1 | LOW | 仍開 | 非阻擋 |
| L2 | LOW | 仍開 | 非阻擋 |
| L3 | LOW | 仍開 | 非阻擋 |
| L4 | LOW | 仍開 | 非阻擋；對照表／Track 2 未複述僅本窗 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-04 | 有未關閉 HIGH（H1、H2）。提案不可行＝否。禁區未違。現碼啟發式早退與關窗一律拒絕與提案互斥，屬實作範圍。 |
| 第 2 輪複審 | 2026-10-04 | 無未關閉 HIGH。H1、H2、M1–M5 已在契約檔關閉。新增 M6（INDEX 700ms 列未寫 popup 例外）。審查門檻通過。提案不可行＝否。 |
| 第 3 輪複審 | 2026-10-04 | 無未關閉 HIGH。M6 已在 INDEX 已定案＋驗收關閉，HOW／HANDOFF／reasoning 對齊。審查門檻通過。應修 MEDIUM＝無。新增 L4（對照表／Track 2 未複述，非阻擋）。提案不可行＝否。 |
