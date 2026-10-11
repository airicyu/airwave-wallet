# Design review — 0.15.0 Airwave Wallet

- 日期：2026-10-06（Asia/Hong_Kong）
- 輪次：**複審**（第 2 輪；累加於初審同一檔）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`popup-react-how.md`](./popup-react-how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 上游行為契約：[`../../0.14.0/INDEX.md`](../../0.14.0/INDEX.md)、[`../../0.13.0/INDEX.md`](../../0.13.0/INDEX.md)（審批宿主／`uiHost`／pending／abort 語意本版不推翻）
- 構想（非契約；已出貨）：[`../INDEX.md`](../INDEX.md)
- 畫面（INDEX 沉默時）：[`../../../design-principles.md`](../../../design-principles.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣（第 2 輪）：`wallet/src/approval/shell.ts`（`mountApprovalShell` 內 `q(root, …)` 清單）、`wallet/src/popup/index.html`（`#approval-root`／`appr-*`）、`wallet/src/popup/main.ts`（`onChanged` 四 key、`pagehide`／`beforeunload` abort）
- **總評：** 規劃收斂已將初審 H1、M1–M4 寫進 INDEX／HOW／HANDOFF；審批骨架契約與現碼 `q` 清單一致。無未關閉 HIGH；同意的 MEDIUM 已關閉；待拍板為空；HANDOFF 含 paste-ready；非目標寫清。**設計審查門檻通過，可開工。** 非不可行。L1–L3 不擋。

## Findings

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH

#### H1 — 審批橋接：HOW 空容器與 `mountApprovalShell` 必備 DOM 骨架矛盾；且未規定 React 不得覆寫殼內 `hidden` — **已關閉**（第 2 輪核）

**初審問題（保留）：** HOW 曾示例空 `#approval-root`；`mountApprovalShell` 不建 markup、缺節點即 throw；且未規定 mount 後 React 不得 reconcile 殼子樹。

**關閉證據（契約已寫進）：**

| 檔 | 內容 |
|----|------|
| INDEX「審批橋接」 | 必須先輸出與今日 `#approval-root` 同等 `appr-*` 骨架；完整 id 見 HOW；禁止空容器；mount 後至 dispose 由 shell 擁有，React 不得覆寫；連續送出先 dispose 再 mount |
| HOW「審批橋接」 | 列出全部 base id；所有權四點；意向碼改為 `dangerouslySetInnerHTML`＋`APPROVAL_ROOT_HTML`；禁止空 div |
| HANDOFF paste-ready | 「先輸出完整 appr-* 骨架再 mountApprovalShell，mount 後 React 不覆寫該子樹」 |

**第 2 輪現碼對照：** `shell.ts` mount 段 `q` 的 base id（`view-unlock` … `btn-close-expired`，共 26）與 HOW「必備 id」清單一致；`popup/index.html` 內皆有對應 `appr-*` 節點。契約與現碼無分叉。

### MEDIUM

#### M1 — 「範圍：只改 `wallet/src/popup/`」與建置／Track 1 字面衝突 — **已關閉**

INDEX「範圍」已改為：產品畫面碼只遷 `wallet/src/popup/`；**允許且必須**改建置三檔（`package.json`、`vite.config.ts`、`tsconfig.json`）；其餘樹不上 React。

#### M2 — 未寫明必須廢止模組載入時 `getElementById` 總表 — **已關閉**

INDEX「舊檔」點名禁止模組頂層 `getElementById` 總表（今日 `popup/lib/dom.ts` 的 `el`／`elApprovalRoot` 等）。HOW 目錄意向與「明確不做」同句禁止該模式。HANDOFF paste-ready 含「廢止 dom.ts 頂層 el 表」。

#### M3 — 出貨手驗未覆蓋關窗／離審批 view 的 abort — **已關閉**

INDEX 驗收手驗已含：關 popup 或 Back／導離 `send-approval`（未 settled、無 broadcastSig）後該 pending 結束，且可再走送出。

#### M4 — `storage.onChanged` 觸發 refresh 的 key 清單只靠「與今日 main.ts 相同」 — **已關閉**

INDEX「錢包 state」與 HOW「State 鏡像」皆寫死僅四個 local key：`airwave.accounts.v1`、`airwave.activeAccountId.v1`、`airwave.settings.v1`、`airwave.connections.v1`。HANDOFF paste-ready 亦提「onChanged 僅四個 local key」。現碼 `main.ts` 監聽集合與此一致。

### LOW

| ID | 狀態 | 說明 |
|----|------|------|
| L1 | **已關閉** | HOW 已寫「函式名不強制叫 `ApprovalHost`」；示例名非契約。 |
| L2 | **已關閉** | INDEX／HOW 已選定 React root 建議 `id="root"`（今日殼為 `app`）；遷移時改名即可，非產品語意分叉。 |
| L3 | 仍開（非阻擋） | **第 2 輪新增。** HOW 意向碼的 mount `useEffect` cleanup 只回傳 `dispose`；abort 應留在離 view／`pagehide`／`beforeunload`（對齊今日 `abortWalletSendOnPopupUnload`）。若實作把 `ui.abortPending` 掛進同一 effect cleanup，開發模式 React StrictMode 雙調 effect 可能誤 abort。契約已分寫 dispose 與 abort 時機，實作跟 HOW 示例即可；可選一句寫進 HOW，不擋開工。 |

### 本輪另核過、不另開 ID

- **Pending／廣播／storage：** INDEX 凍結 pending 只在 SW `Map`、不進 `chrome.storage`、不進 React 權威 state；結果不廣播。與 GUIDELINES 一致；無回歸分叉。
- **Custody／類 B：** 禁止 `type="password"`／password autocomplete；HOW 有受控 `wallet-pwd-masked` 例句。
- **依賴／Router／Zustand：** 僅三套件；非目標與 reasoning 否決一致。
- **審批殼不上 React：** INDEX／非目標／reasoning／HANDOFF 一致；骨架由 popup 輸出 ≠ 重寫 `shell.ts`。
- **建置入口：** 提案不搬 `src/popup/index.html` 路徑。
- **待拍板：** 仍為空。
- **HANDOFF：** 含 Paste-ready starter prompt，含骨架／四 key／廢止 dom.ts／禁區要點。
- **非目標：** 寫清（審批殼／popout／SW React、Router／Zustand、改 custody／訊息／能力表等）。
- **數字：** 不引入 `big.js`、不以 `number` 做鏈上整數——不變。
- **隱私：** 本輪報告與契約抽樣無真實助記詞／私鑰／密碼／個人地址。

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| Popup 主路徑為 React；無第二套命令式全頁 render | 可 | M2 已關 |
| `package.json` 僅新三套件；無 Router／Zustand／Redux | 可 | M1 已關 |
| background／approval／popout／content／inject 未改 React | 可 | 非目標清楚 |
| 命令字串與 storage key 與 0.14.0 相同 | 可 | M4 已關 |
| `npm run typecheck` 與 `npm run build` | 可 | Track 已寫 cwd／指令 |
| 手驗：建庫／解鎖、Home、Settings、帳戶流、popup 審批、連續兩次、拒絕批准、關窗／離審批 abort、網站仍 popout | 可（實作後） | H1／M3 已關；手驗句自足 |
| 類 B 未改回 `type="password"` | 可 | 已定案＋HOW |
| 文件與程式無真實密碼／助記詞／私鑰 | 可 | 抽樣無違規 |

## 與現碼抽樣（第 2 輪）

- **`shell.ts` `q` 清單**＝HOW 必備 id（prefix 後）：`view-unlock`、`view-gone`、`gone-lead`、`view-legacy`、`view-sign`、`unlock-password`、`unlock-error`、`btn-unlock`、`legacy-origin`、`legacy-kind`、`legacy-detail`、`legacy-error`、`sign-origin`、`sign-body`、`sign-error`、`sign-page-title`、`sign-avatar`、`sign-label`、`sign-addr`、`btn-copy-pk`、`sign-reject`、`sign-approve`、`sign-dock`、`legacy-reject`、`legacy-approve`、`btn-close-expired`。
- **`index.html`：** 上列皆有 `appr-*` 對應節點於 `#approval-root` 內；證明骨架今日住在 popup HTML，與「React 須輸出同等骨架再 mount」一致。
- **`main.ts`：** `onChanged` 僅上述四 local key；`beforeunload`／`pagehide` → `abortWalletSendOnPopupUnload`。與 INDEX／HOW／驗收 abort 句一致。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉條件／備註 |
|----|----|------|----------------|
| H1 | HIGH | **已關閉** | INDEX＋HOW＋HANDOFF 已寫骨架／所有權／非空示例 |
| M1 | MEDIUM | **已關閉** | INDEX 範圍列已允許建置三檔 |
| M2 | MEDIUM | **已關閉** | INDEX／HOW／HANDOFF 已禁 dom.ts 頂層 el 表 |
| M3 | MEDIUM | **已關閉** | 驗收手驗已含關窗／離審批 abort |
| M4 | MEDIUM | **已關閉** | INDEX／HOW 已寫死四個 onChanged key |
| L1 | LOW | **已關閉** | HOW 已標示例名非強制 |
| L2 | LOW | **已關閉** | 契約已選定建議 `id="root"` |
| L3 | LOW | 仍開（非阻擋） | 可選：HOW 加一句「mount effect cleanup 僅 dispose，abort 勿掛同 cleanup」 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-06 | 方向可行，**非不可行**。未關閉 **H1** → **門檻未通過，不可開工**。應修 M1–M4；L1–L2 不擋。 |
| 複審 | 2026-10-06 | H1、M1–M4、L1–L2 契約已寫進並核對現碼。無未關閉 HIGH；**門檻通過，可開工**。新增 L3（非阻擋）。非不可行。 |
