# Design review — 0.16.0 Airwave Wallet

- 日期：2026-10-06（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`popup-react-cleanup-how.md`](./popup-react-cleanup-how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 上游行為契約：[`../../0.15.0/INDEX.md`](../../0.15.0/INDEX.md)、[`../../0.13.0/INDEX.md`](../../0.13.0/INDEX.md)（審批宿主／`uiHost`／pending／abort 語意本版不推翻；送出草稿以本版已定案所寫之 0.15.0 `performNavigate` 為準）
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`wallet/src/popup/lib/session.ts`、`runtime.ts`、`App.tsx`、`accounts/AccountsScreens.tsx`（現碼未實作本版 ≠ 設計 HIGH）
- **總評：** 無未關閉 HIGH。初審 H1／M1–M6／L1–L3 已寫進 INDEX／HOW／HANDOFF（及必要的 reasoning／paste-ready）。本輪新增 M7、M8，預設應修，不擋開工。提案可行，待拍板仍空。**本輪設計審查門檻通過。** 非不可行。

## Findings（第 2 輪複審）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。穩定 ID 不重編號。

### HIGH

#### H1 — 跨畫面暫存清單漏 `focusAccountId`，與 HOW 導航表／現碼 Manage→Reveal 互斥 — **關閉**

初審建議 A 已寫死。INDEX 已定案⑤：`focusAccountId` 在 App 層；`navigateTo(view, accountId?)` 有傳第二參則寫入、**未傳則保留**；Manage／Reveal／Rename／刪除／combined 讀此欄（並點名今日 Manage→Reveal 不帶 id）。HOW App 層表、reasoning App 層清單、HANDOFF 禁區與 paste-ready 同向。

抽樣仍成立：`AccountsScreens.tsx` `account-manage` 帶 `a.id`；Reveal 為 `navigateTo("account-reveal-key")` **不帶 id**；Reveal／刪除／Rename 讀 `session.focusAccountId`。契約已要求實作保留此語意，不再與「其餘草稿皆畫面本地」打架。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | **關閉** | INDEX 已定案寫死送出 amount／recipient／錯誤在 `TokenSendForm` **本地**（不放 App 層）；進入／離開清空規則一併寫死。Track 2「送出表單用 `TokenSendForm` 本地 state」。reasoning／HANDOFF 同向。與初審「已定案可選 App 層 vs Track 2 寫死 App 層」的分叉已消除。 |
| M2 | **關閉** | HOW「審批」：失敗 settled **先** `navigateTo("token-send")`（進入清空含 `sendFormError`），**再**寫 `notice.error ?? "已取消"`；Back／殼上拒絕只清空、不另寫錯誤。HANDOFF 禁區與 paste-ready 有「失敗 settled 先 navigate 再寫表單錯誤」。對齊現碼 `usePopupController`。 |
| M3 | **關閉** | INDEX 已定案：清空規則以 0.15.0 `performNavigate` 為準，**明確覆蓋** 0.13.0「點拒絕：popup 留在 token-send（欄位保留）」；本版不恢復保留草稿。reasoning「否決」表同句。 |
| M4 | **關閉** | 原缺口（App 層未列展開列／`homeAssetsForce`）已補：INDEX ⑥⑦、HOW App 層 `expandedTokenRowIds`／`homeAssetsForce`、reasoning App 層清單。鎖定是否也清這兩欄改由 **M8** 追（勿把已列欄位的關閉與鎖定語意分叉混為一項）。 |
| M5 | **關閉** | INDEX「範圍」允許出貨改 version 檔，並允許刪無主路徑 popup vanilla 殘留；死碼條點名 `icons.ts`、兩支 scripts、以及 `main.ts`／`dom.ts`／`*-ui.ts`／`send-flow.ts` 等。HOW「刪檔」同列。允許改 `popup/lib/index.ts` re-export。 |
| M6 | **關閉** | Track 1 改為「已定案①–⑦跨畫面暫存」，與已定案閉集成員一致（含 `focusAccountId`、展開列、`homeAssetsForce`）。 |
| M7 | **仍開** | HOW 把離開表（含「有傳 `accountId`」「每次成功導航：關選單；清 toast」以及表內「進入 token-send／settings-password」）整段包在「若 `current !== next`」。進入重置另寫「改 view 之後」。INDEX ⑤對 focus 寫入**沒有**同 view no-op 條件。現碼 `performNavigate`：同 view 仍寫 focus（若有傳 id）、仍關選單、仍清 toast，且 `next` 命中 `add-combined`／`add-generate` 等仍跑進入重置。若實作嚴格跟 HOW 閘門，同 view 帶新 `accountId` 不會更新 focus，亦可能漏掉進入重置。**建議寫死（擇一）：** **A（對齊 0.15.0，建議）：** 僅「離開畫面」副作用以 `current !== next` 為閘；每次 `navigateTo` 都：有傳 id 則寫 focus、關選單、清 toast；進入重置在 `next` 命中時執行（含同 view 再進）。**B：** INDEX／HOW 寫死「`current === next` 時 `navigateTo` 為 no-op（仍可寫 focus 則須例外列出）」，並承認偏離現碼。 |
| M8 | **仍開** | INDEX ④⑥與 HOW App 層表寫持倉快取／展開列在「切 `activeAccountId` **或鎖定**」時清。HOW 文末鎖定節卻只寫：關選單、清 `detailTokenId`、清空送出表單（**未**清持倉／展開）。現碼 `syncWalletSideEffects` 鎖定路徑與此鎖定節相同，**不清** `lastSuccessfulTokenRows`／`expandedTokenRowIds`；該兩項只在 `activeAccountId` 變更時清。這與「行為與 0.15.0 相同」打架。**建議寫死（擇一）：** **A（對齊現碼，建議）：** 鎖定＝關選單＋清 `detailTokenId`＋清送出表單；持倉快取與展開列**僅**在 `activeAccountId` 變更時清；INDEX ④⑥與 HOW App 層表刪「或鎖定」。**B：** 鎖定也清持倉／展開，並承認相對 0.15.0 的可見差異（解鎖回 Home 無快取／展開塌縮）。 |

### LOW

| ID | 狀態 | 說明 |
|----|------|------|
| L1 | **關閉**（非阻擋） | HOW 審批／dock：未列 view（含 `send-approval`、`home-activity`、Home Token）殼底 dock 隱藏；不要為審批再做 `shell-dock` 主鈕。 |
| L2 | **關閉**（非阻擋） | HOW parent 表已列 `settings`、`connected-sites`、`about`、`accounts`、`home-activity` → `home-token`。 |
| L3 | **關閉**（非阻擋） | INDEX Track 1「禁止每 render 再 bind 一份 runtime」；HANDOFF 禁區與 paste-ready「禁止每 render `bindPopupRuntime`」。抽樣：`App.tsx` 與 `usePopupController.ts` **現仍**各 bind 一次（現碼未改 ≠ 未關閉契約）。 |

### 本輪另核過、不另開 ID

- **Pending／廣播／storage／custody：** INDEX 凍結 pending 只在 SW `Map`、不進 `chrome.storage`、不進 React 權威 store；結果不廣播；類 B 不變。與 GUIDELINES 一致。
- **審批殼不上 React、網站仍 popout、錢包送出仍 popup、onChanged 四 key：** 與 0.15.0／0.13.0 及現碼 `ApprovalHost` 同向。
- **Manage→Reveal 不帶 id：** 現碼仍如此；H1 關閉後契約要求 App 層保留 focus。
- **待拍板：** 仍空。
- **HANDOFF：** paste-ready 已含 focus、進入 `token-send` 清空、settled 順序、禁每 render bind。未寫 M7／M8（規劃收斂時應補一句）。
- **數字／Wallet Standard／brainstorm：** 本版不改；未當已定案。
- **隱私：** 本輪報告無真實助記詞／私鑰／密碼／個人地址。
- **殼底主鈕命令：** HOW 指「與今日 `handleDockPrimary` 相同」；實作須讀 `runtime.ts`，表內只列標籤／disabled。足以跟行為不變，不另開 ID。

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 無模組級 `session`／`bindPopupShell` 畫面主路徑；輸入不以全樹 tick | 可（Track 4 靜態） | 無（M5 已關） |
| 無新增 npm；無 Router／Zustand／Redux | 可 | 無 |
| background／approval／popout／content／inject 未改 React；審批橋接＝0.15.0 | 可 | 無 |
| 命令字串與 storage key 與 0.15.0 相同 | 可 | 無 |
| `cd wallet && npm run typecheck`／`build` | 可 | 範圍已明示可改 version 檔 |
| 手驗：建庫／解鎖、Home、Settings、新增／匯入、popup 審批不開 popout、拒絕或 Back 後可再送、連續兩次、離審批 pending 結束、網站仍 popout | 可 | H1 已關；M2 已關。M8 可能讓「鎖定再解鎖回 Home」快取／展開與 0.15.0 不一致（手驗若要比展開態須寫死 A／B）。M7 主路徑（換 view 的 Manage→Reveal）仍可測 |
| 類 B 未改回 `type="password"` | 可 | 無 |
| HOW 點名死碼已刪或 INDEX 改口留下 | 可 | M5 已關 |
| 文件與程式無真實秘密 | 可 | 無 |

## 與現碼抽樣（第 2 輪）

現碼未做本版 ≠ 設計 HIGH。

| 錨點 | 現行 | 與 0.16.0 契約（收斂後） |
|------|------|-------------------------|
| `lib/session.ts` | 模組級 `session`＋`bindPopupShell`／`bumpUi`；含 `focusAccountId` | 出貨廢止主路徑；focus 改 App 層（H1 關） |
| `runtime.ts` `performNavigate` | 同 view 仍寫 focus／關選單／清 toast；進入重置不要求 view 變更；進入 `token-send` 即 `clearSendForm` | HOW 閘門 `current !== next` 過寬（M7） |
| `runtime.ts` `syncWalletSideEffects` | 鎖定：關選單、清 `detailTokenId`、清送出；**不清**持倉／展開。切 `activeAccountId` 才清持倉／展開並可能 `navigateTo("home-token")` | INDEX ④⑥／HOW App 層「或鎖定」與現碼／HOW 鎖定節分叉（M8） |
| `runtime.ts` `handleBack`／`computeDock` | 與 HOW 表同向；未列 → `home-token`／dock 隱藏 | L1／L2 關 |
| `AccountsScreens.tsx` | Manage `navigateTo("account-manage", a.id)`；Reveal **不帶 id** | INDEX ⑤已點名；實作不得改成只靠即將卸載的列表 `useState` |
| `App.tsx`／`usePopupController.ts` | 每 render `bindPopupRuntime`；settled 失敗先 navigate 再寫 `sendFormError` | L3／M2 契約已關；現碼仍雙 bind |
| `ApprovalHost.tsx` | `host:"popup"`、完整 `appr-*`、成功 exit 設 `homeAssetsForce` 回 Home | 本版維持；INDEX ⑦覆蓋 force |

不要把 brainstorm 或 Solibra 原始碼當成現行程式。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | 關閉 | INDEX 已定案「跨畫面必須存活」⑤；HOW App 層 `focusAccountId`；HANDOFF 禁區／paste-ready |
| M1 | MEDIUM | 關閉 | INDEX 已定案送出表單本地；Track 2；HOW 離開／進入 `token-send` |
| M2 | MEDIUM | 關閉 | HOW「審批」順序段；HANDOFF |
| M3 | MEDIUM | 關閉 | INDEX 已定案覆蓋 0.13.0 欄位保留；reasoning 否決表 |
| M4 | MEDIUM | 關閉 | INDEX ⑥⑦；HOW App 層；鎖定語意見 M8 |
| M5 | MEDIUM | 關閉 | INDEX 範圍／死碼；HOW 刪檔 |
| M6 | MEDIUM | 關閉 | INDEX Track 1（①–⑦） |
| M7 | MEDIUM | 仍開 | （待：HOW 離開表閘門 vs `performNavigate`／INDEX ⑤） |
| M8 | MEDIUM | 仍開 | （待：INDEX ④⑥「或鎖定」vs HOW 鎖定節／現碼 `syncWalletSideEffects`） |
| L1 | LOW | 關閉 | HOW dock／審批 |
| L2 | LOW | 關閉 | HOW Back parent 表 |
| L3 | LOW | 關閉 | INDEX Track 1；HANDOFF |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-06 | 有未關閉 HIGH（H1）；提案非不可行；門檻未過 |
| 第 2 輪複審 | 2026-10-06 | 無未關閉 HIGH；H1／M1–M6／L1–L3 關閉；新增 M7、M8；**門檻通過**；非不可行 |

---

## 初審（2026-10-06）

- 日期：2026-10-06（Asia/Hong_Kong）
- 輪次：**初審**
- **總評（當輪）：** 有未關閉 HIGH。提案本身可行（清 popup 過渡層、不上 Router／Zustand、不改審批殼／SW），待拍板為空，HANDOFF 含 paste-ready。**設計審查門檻未通過**，須先把跨畫面暫存清單與 HOW／現碼導航對齊後再開工。非不可行。

### Findings（初審）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

#### H1 — 跨畫面暫存清單漏 `focusAccountId`，與 HOW 導航表／現碼 Manage→Reveal 互斥 — **當時仍開**

INDEX「跨畫面必須存活」只列 ① `currentView` ② `detailTokenId` ③ `activeWalletSendRequestId` ④ Home 持倉快取，並把「其餘表單草稿」預設為畫面本地。HOW「App 層必備欄位」與 reasoning「App 層只放 … view、detailTokenId、送出 requestId、持倉快取、toast」同樣沒有 `focusAccountId`。

同一份 HOW 卻要求：`navigateTo` 有傳 `accountId` 則寫入 `focusAccountId`；進入 `account-rename` 用 focus 帳戶填草稿。現碼 `AccountsScreens`：`account-manage`／`account-rename` 帶 `a.id`；**Manage→Reveal 為 `navigateTo("account-reveal-key")` 不帶 id**，Reveal／刪除／combined 子操作全讀 `session.focusAccountId`。

若實作嚴格跟 INDEX／reasoning 的 App 層閉集，把 focus 放在會隨 `accounts` 卸載的本地 state，Manage／Reveal／Rename 主畫面會丟帳戶。這違反本版「行為與 0.15.0 相同」，屬契約自相矛盾，不是「現碼還沒改」。

**建議寫進已定案的完整句子（擇一須寫死）：**

- **A（對齊現碼，建議）：** App 層（或同等不隨 `View` 卸載的 context）還必須持有 `focusAccountId`：`navigateTo(view, accountId?)` 在有傳第二參時寫入；未傳時保留既有值；Manage／Reveal／Rename／刪除／combined 子操作讀此欄，不得只放會隨帳戶列表卸載的 `useState`。
- **B：** 廢止模組級 focus；每一個進入 `account-manage`／`account-rename`／`account-reveal-key` 的呼叫都必須帶 `accountId`，且該 id 由 App 層導航 state 持有直到 Back 出該帳戶流。

#### MEDIUM（初審當時皆仍開）

| ID | 當時狀態 | 依據 |
|----|----------|------|
| M1 | 仍開 | INDEX 已定案允許送出草稿放 `TokenSendForm` 本地 **或** App 層；Track 2 卻寫死「送出表單讀寫 **App 層** 送出草稿」。reasoning 亦說進入即清空故本地卸載可接受。三處擇一寫死，否則 Track 驗收與已定案打架。 |
| M2 | 仍開 | 失敗 settled／拒絕回 `token-send` 與「進入 `token-send` 即 `clearSendForm`」的**順序**未寫。現碼 `usePopupController`：先 `navigateTo("token-send")`（清空含 `sendFormError`）再寫 `session.sendFormError`。HOW 只寫「失敗 settled 回 token-send 並設表單錯誤」。若先設錯誤再 navigate，錯誤會被清掉，偏離 0.15.0。須寫死：進入清空在前，表單錯誤在清空之後寫入；Back 離審批則清空草稿（與現碼 `performNavigate` 一致）。 |
| M3 | 仍開 | 0.13.0 已定案「點拒絕：popup 留在 token-send（**欄位保留**）」；本版已定案與 HOW 明確「進入 `token-send` 即清空（含從審批回來），不改成拒絕後保留」，並稱複製 0.15.0 `performNavigate`。現碼確實進入即清 amount／recipient。應在已定案加一句：**送出草稿以 0.15.0 `performNavigate` 為準，明確覆蓋 0.13.0「拒絕後欄位保留」**，避免實作 agent 把 0.13.0 當不可推翻而保留草稿。 |
| M4 | 仍開 | HOW 切 `activeAccountId`／鎖定要清「展開列」；現碼 `expandedTokenRowIds`、`homeAssetsForce` 活在 `session`（成功審批設 force 以重抓持倉）。INDEX／HOW App 層必備未列。展開列若只放 `HomeTokenList` `useState`，離開 Home 再回來會塌縮；`homeAssetsForce` 若隨卸載丟失，與現碼送出成功後強制重抓不一致。應標為 App 層（或 Home 領域且 App 不卸載的 provider）欄位，或明文「展開可隨 Home 卸載重置」（若選定則承認偏離現碼）。 |
| M5 | 仍開 | INDEX「範圍：只改 `wallet/src/popup/`＋點名腳本」與「版本號：出貨時改 `wallet/package.json`、`manifest.config.ts`、`version.md`、`changelog.md`」字面衝突。刪檔僅點名 `icons.ts` 與兩支 scripts；現樹仍有無主路徑引用的 vanilla 殘留（至少 `popup/main.ts`、`lib/dom.ts`、`accounts/accounts-ui.ts`／`combined-ui.ts`、`home/tokens-ui.ts`、`send/send-flow.ts`、`settings/settings-ui.ts`、以及 `lib/index.ts` 仍 `export * from "./icons"`／`session`）。Track 4「全倉 popup 無 `bindPopupShell`／畫面權威 `session.`」會逼刪這些檔，但已定案死碼表沒寫。範圍應允許出貨檔版本對齊，HOW 刪檔表應列殘留 vanilla（或寫「凡仍含 `bindPopupShell`／畫面 `session` 賦值且無主路徑引用者一律刪」）。 |
| M6 | 仍開 | Track 1「跨畫面必須存活的**五類**暫存」與已定案①–④（外加可選送出草稿）數量／成員不對。應改成與已定案同一閉集（並納入 H1／M4 拍板結果），避免實作把 toast 或送出草稿誤算成第五類權威 store。 |

#### LOW（初審）

| ID | 當時狀態 | 說明 |
|----|----------|------|
| L1 | 仍開（非阻擋） | HOW dock 表把 `send-approval` 標「隱藏」；現碼 `computeDock` 對未列 view 回 `hidden: true`，語意相同。可一句「未列 view（含 `send-approval`、`home-activity`）dock 隱藏」以免有人為審批再做一顆殼底主鈕。 |
| L2 | 仍開（非阻擋） | HOW Back「其餘／未列則 `home-token`」涵蓋 `home-activity`、`accounts` 等，與現碼 `handleBack` 末端一致；未在 parent 表列出 `accounts`／`home-activity`。可補列，減少漏讀。 |
| L3 | 仍開（非阻擋） | `App.tsx` 現在每次 render 呼叫 `bindPopupRuntime`（`usePopupController` 內再 bind 一次）。Track 1 已要求收掉「每 render bind」；HANDOFF 可再點一次，免實作只改 context 卻留下雙 bind。 |
