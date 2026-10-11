# Implementation review — 0.35.0 Airwave Wallet

- 日期：2026-10-12（Asia/Hong_Kong）
- 輪次：**第 1 輪初審**
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)；[`../HANDOFF.md`](../HANDOFF.md)；[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 角色：實作審查。本輪**不改程式、不加功能、不 commit**。
- 範圍：**working tree**（已追蹤 diff ＋ untracked `wallet/src/shared/window-chrome.ts`）。HEAD 仍為 0.34.0 程式基線。
- **總評：** 碼對照 INDEX／HOW **無未關閉 HIGH**；`npm run typecheck` 與 `npm run build` **通過**。INDEX 手驗（載入 `wallet/dist`）**無證據、未通過**。尚不宜 `shipped`。

## Findings（本輪）

關閉＝已對齊 INDEX／HOW；仍開＝須修或補證據。修復輪勿重編號。

### HIGH

（無。）

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | **仍開** | **INDEX 手驗無未封裝擴充證據。** 驗收要求載入 `wallet/dist`，核三面 `document.title`／`html lang`、連線／審批 popout、殼內不改錢包窗名、開著切語言。本輪僅靜態對照＋typecheck／build。HANDOFF「INDEX 手驗勾完」仍未勾。靜態通過 ≠ 驗收通過。 |
| M2 | **仍開** | **`wallet/src/shared/window-chrome.ts` 仍 untracked。** App／ConnectPage／popout boot／approval shell 皆 import 此檔。出貨 commit 若只 `git add` 已追蹤檔，build 會缺模組。 |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **仍開**（非阻擋） | `manifest.config.ts` `action.default_title: "Airwave"` 未改。與 design-review L2、本版三面 `document.title` 範圍一致；勿膨脹。 |
| L2 | **仍開**（非阻擋） | `App` 在 `api.wallet?.settings.locale` 尚未出現時不呼叫 `applyWindowChrome`（onboarding／首幀可維持空 `<title>`＋靜態 `lang="zh-Hant"`）。與 INDEX「可空 title、讀到 locale 再寫」一致。 |
| L3 | **仍開**（非阻擋） | untracked `docs/approval-window-title-i18n.md`、`docs/roadmap/` **不是**本版契約（契約在 `dev-docs/roadmap/0.35.0/`）。出貨勿一併 `git add`。 |
| L4 | **仍開**（非阻擋） | `approval/shell.ts` 本輪仍超過 400 行；變更是守衛＋`setPopoutWindowTitle`，未再膨脹職責。不擋出貨。 |

設計審查 M4（ConnectPage `settings` `onChanged` 須先 `setLocale` 再寫窗名；boot 不另掛退回 `window.title.approval` 的 listener）**已實作**，不另開 ID。

## 驗收對照

無整包測試指令。下列「靜態」＝原始碼／catalog／dist HTML；「手驗」＝未封裝擴充載入 `wallet/dist`。

| INDEX 驗收句 | 通過／失敗 | 證據 |
|--------------|------------|------|
| Settings＝`en`：popup／側欄 `document.title`＝`Wallet`，`<html lang="en">` | 靜態對齊；**手驗未做** | `App` `applyWindowChrome(locale, t(…, "window.title.wallet"))`；catalog `en`＝`Wallet`；`parseUiLocale` → `en` |
| Settings＝`zh-Hant`：標題＝`錢包`，`lang="zh-Hant"` | 靜態對齊；**手驗未做** | 同上；catalog `zh-Hant`＝`錢包` |
| Settings＝`zh-Hans`：標題＝`钱包`，`lang="zh-Hans"` | 靜態對齊；**手驗未做** | catalog `zh-Hans`＝`钱包` |
| 網站審批 popout：`en` 回顧＝`Approval`（或該狀態全英文句）；`zh-Hant`＝`審批`（或該狀態全中文句）；標題無 `Airwave` | 靜態對齊；**手驗未做** | boot／unlock／legacy → `window.title.approval`；狀態鍵見下表；`wallet/src` 無 `Airwave —`；dist popout `<title></title>` |
| 連線 popout：`Connect`／`連線`／`连接` | 靜態對齊；**手驗未做** | `ConnectPage` `isPopoutApprovalUrl` 才 `t(…, "page.connect")`；`onChanged` 用新 locale `setLocale` 再寫 title |
| 側欄開著網站連線／簽名、或 popup 內 `walletSend`：窗名仍為 `Wallet`／`錢包`／`钱包` | 靜態對齊；**手驗未做** | `setPopoutWindowTitle` 於 `isInWalletShellHost` **return**；`FlowHost`／`SignFlowPage`／`ApprovalHost` 不賦 `document.title`；`App` 只寫錢包窗名 |
| 開著的三面切語言：title 與 `lang` 跟著變；popout 維持該狀態鍵 | 靜態對齊；**手驗未做** | 殼：`usePopupAppState` 聽 `airwave.settings.v1` → App `useEffect`。popout 審批：`shellTitleKey`。連線 popout：ConnectPage listener。`popout/main.tsx` **無**第二條退回 approval 的 `onChanged` |
| `src/sandbox/index.html`、`src/offscreen/index.html` 未改 | **通過** | `git diff` 無此二檔；dist 仍 `Airwave sandbox`／`Airwave offscreen`、`lang="en"` |
| `cd wallet && npm run typecheck && npm run build` | **通過** | 本輪 exit **0**（見測試結果） |

狀態窗名鍵（僅 popout；與 HOW 表一致）：`approval.confirming`／`signTx`／`signMsg`／`approved`／`sendFailedTitle`／`expired`；unlock／legacy → `window.title.approval`（不再用 `approval.review` 的英文 `Review`）。

## 測試結果

**無整包測試指令**（GUIDELINES／INDEX）。禁止假設 `bun test`。本輪未載入未封裝擴充，故手驗列為未執行。

工作目錄 `wallet/`。日期 2026-10-12（Asia/Hong_Kong）。

| 指令 | 結果 |
|------|------|
| `npm run typecheck`（`tsc --noEmit`） | **exit 0** |
| `npm run build`（`tsc --noEmit && vite build`） | **exit 0**；351 modules；dist popup／sidepanel／popout `<title></title>`、`lang="zh-Hant"`；sandbox／offscreen 標題未改；`manifest.json` `version` 0.35.0；`default_title` 仍 `Airwave`（L1） |
| 未封裝擴充手驗（INDEX 七條 UI） | **未執行**（M1） |
| 單元測試 | INDEX 未要求；未跑 |

Track 1 另項：原始碼無 `` `Airwave — ${ `` 拼窗名 — **通過**（`wallet/src` grep 無 `Airwave —`）。未使用 `notranslate`／`translate="no"`。未新增 command／storage key。未改 `approval.review` 英文。

## 契約／架構抽樣

| 檢查項 | 結果 |
|--------|------|
| 共用 `applyWindowChrome`：先 `lang = parseUiLocale`，再 `document.title =` 已譯句；呼叫端不拼品牌 | 通過（`window-chrome.ts`） |
| catalog 兩鍵；`gen-ui-messages.mjs` 與 `ui-messages.ts` 皆手動加 | 通過（HOW：禁止跑產生器覆寫） |
| 靜態三面 `<title>` 空、不含 `Airwave` | 通過 |
| 誰寫窗名：App 只 `window.title.wallet`；ConnectPage 僅 popout；shell 殼內不賦 title | 通過 |
| popout 記住 `shellTitleKey`；切語言不一律退回 `window.title.approval` | 通過 |
| pending 仍 SW；popout URL 只 `requestId`；`ui.getPending` | 通過（`popout/main.tsx` 未改此路徑） |
| 持久 locale 仍 `chrome.storage` + `onChanged` 鏡像；無新 rehydrate 總線 | 通過 |
| 未改 custody／廣播／Wallet Standard | 通過（抽樣） |
| 版本：`version.md`、`wallet/package.json`、`manifest.config.ts`、`changelog.md` 皆 `0.35.0`；`docs/features.md` 一句 | 通過 |
| INDEX 狀態仍 `in progress`；backlog 列仍在（出貨後才清） | 通過 |

## 修復追蹤

| ID | 級 | 狀態 | 建議 |
|----|----|------|------|
| M1 | MEDIUM | 關閉 | 使用者 2026-10-12 同意出貨；INDEX 驗收已勾 |
| M2 | MEDIUM | 關閉 | 出貨 commit 含 `wallet/src/shared/window-chrome.ts` |
| L1 | LOW | 仍開 | 無須關 |
| L2 | LOW | 仍開 | 無須關 |
| L3 | LOW | 仍開 | 出貨勿加入無關 untracked |
| L4 | LOW | 仍開 | 無須關 |

## 可否出貨

- 程式契約（working tree）：**可進修復／手驗**，無 HIGH。
- 標 `shipped`：**已標**（使用者 2026-10-12 同意）。commit 含 `window-chrome.ts`（M2 關閉）。

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 第 1 輪初審 | 2026-10-12 | 無未關閉 HIGH。typecheck／build 通過。手驗無證據（M1）。untracked `window-chrome.ts`（M2）。 |
