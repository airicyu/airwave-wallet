# 實作審查 — 0.23.0

## 第 1 輪（2026-10-08）

**總評：** Track 1–2 主體已落地（`Settings.locale`、`ui-i18n`／`ui-messages`、Settings 語言頁、方案 B 字體、解鎖標題無 `0.02em`、`design-principles` 第 1／3／6／8 節已對齊 locale）。`npm run typecheck` 與 `npm run build` 通過。仍有 SW→UI 中文進度／結案句與 popout 靜態 markup 未收乾淨，違 INDEX「錯誤選 A」與英文 chrome 驗收。瀏覽器擴充手驗未在本環境執行（CI 亦未封裝）。

### 測試

| 項目 | 結果 |
|------|------|
| `cd wallet && npm run typecheck` | pass |
| `cd wallet && npm run build` | pass |
| 擴充手驗（三語 Settings／解鎖／審批／422px 英文列） | 未執行 |

### 契約抽查（本輪）

| 檢查項 | 結果 |
|--------|------|
| 無 `i18next`／`react-intl` | pass |
| `airwave.settings.v1` 含 `locale`；`normalizeSettings` 三碼／缺省 `zh-Hant`；不讀 `navigator.language` | pass |
| SW 未 import／呼叫 `t()` | pass |
| Settings 樞紐第一列＋`settings-locale` 三列立刻 `patchSettings`；摘要 endonym | pass |
| popup／popout `body` 方案 B 字體；`.unlock-screen h1` 無 `0.02em`（徽章／Max 鈕等保留） | pass |
| `docs/design-principles.md` 第 1、3、6、8 節跟 catalog／locale | pass |
| SW 錢包可見進度／結案／command 中文 `message` 全改 code；UI 只認 code | **fail**（見 HIGH） |
| popout／審批殼英文 locale 無寫死繁中 chrome | **fail**（見 HIGH） |
| `wallet/package.json`／`manifest.config.ts`／`version.md`／`changelog.md` 對齊 `0.23.0` | pass（INDEX 狀態仍 `in progress`，見 LOW） |

### Findings

| ID | 級 | 狀態 | 說明 |
|----|----|------|------|
| 023-H01 | HIGH | 開 | **SW 仍推繁中結案句到錢包 chrome。** `pending-timeout.ts`、`sign-and-send-finish.ts`（含 `airwave-wallet-send-settled` 的 `error` 欄）、`wallet-send-abort.ts` 仍傳 `"已送出、確認未知"` 字面，而非穩定 code `BROADCAST_UNCONFIRMED`。`approval/shell.ts` 的 `progressUserMessage`／`usePopupAppState`→`TokenSendForm` 會直接把該字串顯示在 UI；`en` locale 仍見繁中。違 INDEX「錯誤」選 A、HOW「SW 不譯」表列與涵蓋規則。 |
| 023-H02 | HIGH | 開 | **popout 靜態 HTML 與 `applyShellLocaleToStaticChrome` 未收完。** `popout/index.html` 寫死「審批」「請求已過期」「站點」「簽署訊息」「拒絕／批准」等；`showGone()` 只更新 `#gone-lead`，不更新 expired `h1`。`applyShellLocaleToStaticChrome` 未設定 `#sign-approve`、`#legacy-approve`、`#legacy` 標題、`.site-label`、`document.title` 初值。popup 內 `ApprovalHost` 已用 `buildApprovalRootHtml(t)`，但 **獨立 popout 視窗**在 `en` 下仍會露出繁中 chrome（含請求過期／legacy connect 路徑）。 |
| 023-H03 | HIGH | 開 | **送出／close-empty 等 command 有 `code` 但 catalog 缺鍵，UI 回落 SW 繁中 `message`。** `send-command.ts` 對 `INVALID_ADDRESS`／`INVALID_PAYLOAD`／`INSUFFICIENT_FUNDS` 附繁中 `message`；`ui-messages.ts` 無對應 `error.code.*`。`apiErrorMessage` 在 code 未映射時回傳 `error.message`，違 INDEX「command 已有 code 者 UI **只認 code**」。`close-empty-service.ts` 若干 `INVALID_PAYLOAD` 仍附「空清單」等中文 `message`，同樣可能經 `apiErrorMessage` 露出。 |
| 023-M01 | MEDIUM | 開 | `settings-logic.ts` 的 `patchRpcByCluster`／`patchSettingsPartial` 失敗時用 `res.error?.message`，未走 `apiErrorMessage(locale, …)`；若 command 回繁中 `message` 會直接進 toast。 |
| 023-M02 | MEDIUM | 開 | `ApprovalHost` 的 `useEffect` 僅依 `requestId` 掛載 shell；`approvalHtml` 隨 locale 更新但 mid-flight 換語言時可能與已綁定的 vanilla DOM 不同步（shell 有 `onChanged` 部分重繪，popup 內 expired 無 `h1` 與 popout 不同）。手驗「切語言後已顯示錯誤列隨 locale 更新」需確認 approval 宿主邊界。 |
| 023-M03 | MEDIUM | 開 | INDEX 驗收 checklist（三語走 Home／Settings／解鎖／審批、422px 英文不擠殼底）與 HANDOFF「完成檢查」仍未勾；本輪僅靜態審查＋建置，**未載入未封裝擴充手測**。 |
| 023-L01 | LOW | 開 | `popout/index.html` `<html lang="zh-Hant">` 與 `<title>Airwave — 審批</title>` 固定；runtime 會改 title，但初始 flash／無 JS 路徑仍偏繁中。 |
| 023-L02 | LOW | 開 | `changelog.md`／`version.md` 已寫 `0.23.0`，INDEX 狀態仍 `in progress`；出貨須使用者同意 `shipped` 並清 backlog（INDEX 驗收末項）。 |

**未關閉 HIGH：** 023-H01、023-H02、023-H03

### 已對齊片段（供後續輪次免重複）

- `ui-i18n.ts`／`ui-messages.ts`、持倉 `HOLDINGS_LOAD_FAILED`／`JUPITER_REFRESH_FAILED`、模擬 `reason` code、`decode-compiled-ix.ts` `kind`＋UI `ixKindLabel`、`wallet-finish-send.ts` 進度 code、`popout/main.ts` 缺 `requestId` 走 catalog、`MISSING_REQUEST_ID`。
- React popup 路徑 largely `useT()`／`t()`；無畫面級 `if (locale === "en")` 拼句。
- `HomeTokenList` 對 payload `error` code 字串走 `friendlyErrorMessage`（Jupiter 429 等）。

### 建議修復順序（非契約；實作 agent 自行取捨）

1. 023-H01：結案／progress 一律傳 code；UI 存 token 非譯文。
2. 023-H02：popout markup 改最小占位或 shell 啟動時掃描更新所有靜態節點（含 expired `h1`）。
3. 023-H03：補 catalog `error.code.INVALID_ADDRESS` 等；SW `message` 改英文識別或省略；`apiErrorMessage` 有 `code` 時禁止回落 `message`（若 INDEX 要嚴格「只認 code」）。

---

## 第 2 輪（2026-10-08，修復後自核）

**總評：** 023-H01–H03 已修（結案／progress 改 `BROADCAST_UNCONFIRMED`；`applyShellLocaleToStaticChrome` 補齊 popout 靜態節點與 expired `h1`；`error.code.INVALID_*`／`INSUFFICIENT_FUNDS` 入 catalog；`apiErrorMessage` 有 code 時不回落 SW `message`）。023-M01 已修（settings patch 走 `apiErrorMessage`）。`typecheck`／`build` pass。擴充三語手驗仍須本機未封裝擴充（023-M03）。

**未關閉 HIGH：** 無

**未關閉 MEDIUM：** 023-M03（手驗）

---

## 第 3 輪（2026-10-08，0.22／0.23 整體修復）

**總評：** **023-M02 關閉**——`ApprovalHost` 的 `mountApprovalShell` 依 `locale` 重掛；popup 審批過期區補 `h1` 與 popout 一致，`applyShellLocaleToStaticChrome` 可更新標題。連同 **0.22 M1**（phase 1 解編＋factory 同一 `SimDeadline`）。typecheck／build pass。

| ID | 狀態 |
|----|------|
| 023-M02 | 關閉 |
| 023-M03 | 仍開（須本機擴充手驗） |

---

## 第 4 輪（2026-10-08，獨立複審；0.22.0＋0.22.1＋0.23.0 混合出貨候選）

- 角色：實作審查（不改程式／INDEX／HOW／commit）
- 對照：[`../INDEX.md`](../INDEX.md) 已定案＋驗收＋[`how.md`](./how.md)；[`../../0.22.0/INDEX.md`](../../0.22.0/INDEX.md)（含 0.22.1 Orb 無 `/history`）；[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 範圍：目前 working tree。**不** resume 舊對話；先前報告只核對 ID，本輪重新抽樣程式。
- **總評：** 混合樹上先前 HIGH（0.22 H1／H2／M1；023-H01–H03、M01–M02）抽樣均仍關閉，**無未關 HIGH**。剩餘為手驗（023-M03）與 SW／UI 漏網中文 `message`、popout 靜態 flash（MEDIUM／LOW）。`typecheck`／`build` 通過。**無手驗**（未載入 Chrome 擴充）。

### 抽樣證據（本輪重讀）

| 錨點 | 結果 |
|------|------|
| `home-activity.ts` `orbTxUrl` | `https://orb.helius.dev/tx/${sig}?cluster=${q}`，無 `/history`。`isOrbTxUrl` 前綴 `https://orb.helius.dev/tx/`。**0.22 H1 關閉** |
| `simulatePhase1ForLimit` | `decompileTxMessageFromBytes`＋`estimateResourceLimitsFactory` 同一 `SimDeadline.run`。無 `estimateAndSetResourceLimitsFactory`。**0.22 M1 關閉** |
| pending-timeout／sign-and-send-finish／wallet-send-abort | 結案／progress 為 `BROADCAST_UNCONFIRMED`，無「已送出、確認未知」字面。catalog 有 `error.code.BROADCAST_UNCONFIRMED`。**023-H01 關閉** |
| `popout/index.html`＋`applyShellLocaleToStaticChrome` | HTML 仍寫死繁中占位；runtime 更新 copy／拒絕批准／expired `h1`／legacy 標題／site-label／sign 標題／unlock lead／placeholder／按鈕／`html lang`。`showGone` 改 `goneLead`＋`document.title`。**023-H02 關閉**（靜態 flash 見 023-L01） |
| `apiErrorMessage`／`error.code.*` | 有 `error.code` 時只 `messageForErrorCode`，不回落繁中 `message`。`INVALID_ADDRESS`／`INVALID_PAYLOAD`／`INSUFFICIENT_FUNDS` 已入 catalog。**023-H03 關閉** |
| Settings 語言列／`normalizeSettings` | 樞紐第一列＋endonym；三列立刻 `patchSettingsPartial({ locale })`。`normalizeUiLocale` 僅三碼否則 `zh-Hant`；不讀 `navigator.language` |
| popup／popout `body` 字體 | `"Segoe UI", "Microsoft JhengHei UI", "PingFang TC", sans-serif`。`.unlock-screen h1`／`.send-status-title` 無 `0.02em`（徽章／Max 鈕／card-label 保留較大字距，契約允許） |
| `ApprovalHost` | `useEffect` 依 `[requestId, locale]` 重掛 `mountApprovalShell`。**023-M02 關閉** |
| `settings-logic` patch | 失敗走 `apiErrorMessage`。**023-M01 關閉** |
| grep `wallet/src/background` 中文短句 | 送出／模擬／持倉／close-empty／解讀 **無**「轉移 SOL」等 chrome 句。**仍有**帳戶／session／combined 的繁中 `message`（見 023-M05） |
| grep `i18next` | wallet 內無匹配 |
| SW `t()` | `wallet/src/background` 無 import `ui-i18n`／`friendlyErrorMessage`、無呼叫 `t(` |
| 畫面 `if (locale === "en")` 拼句 | 無 |
| `design-principles.md` 第 1／3／6／8 節 | 已跟 catalog／locale／語言列 |
| 版本檔 | `version.md`／`wallet/package.json`／`manifest.config.ts`／changelog 為 `0.23.0`。INDEX 仍 `in progress`（023-L02） |
| GUIDELINES | 未見 pending 改持久 store、新 storage hydrate 找請求、SW 譯 chrome、vault schema 變更 |

### Findings 狀態（穩定 ID 不重編）

| ID | 級 | 本輪狀態 | 說明 |
|----|----|---------|------|
| 023-H01 | HIGH | **關閉** | 見上 |
| 023-H02 | HIGH | **關閉** | 見上 |
| 023-H03 | HIGH | **關閉** | 見上 |
| 023-M01 | MEDIUM | **關閉** | 見上 |
| 023-M02 | MEDIUM | **關閉** | 見上 |
| 023-M03 | MEDIUM | **仍開** | INDEX 三語手驗／422px 英文列；本環境未載入未封裝擴充 |
| 023-L01 | LOW | **仍開** | `popout/index.html` `<html lang="zh-Hant">`、`<title>Airwave — 審批</title>` 與靜態繁中；JS 啟動後會改 |
| 023-L02 | LOW | **仍開** | INDEX 未 `shipped`；出貨須使用者同意並清 backlog |
| 023-M04 | MEDIUM | **新／開** | `applyShellLocaleToStaticChrome` 不更新 `#gone-lead` 與 `document.title`。獨立 **popout** 在過期／審批畫面中途切語言：標題鈕會改，說明句與 tab title 可能留舊語。popup 因 locale 重掛較不受影響。建議 `onChanged` 補 `goneLead`／現行 title，或 expired 時再跑 `showGone` 的文案分支。 |
| 023-M05 | MEDIUM | **新／開** | SW `account-commands.ts`／`session-commands.ts`／`combined-commands.ts` 仍附繁中 `message`（如「密碼錯誤」「請先解鎖錢包」「名稱最多 15 字」「路徑無效」「助記詞無效」「請選帳戶」）。多數畫面已 `apiErrorMessage` **只認 code**，缺 catalog 鍵（`INVALID_LABEL`／`VAULT_MISSING`／`BAD_INDEX`／`INVALID_PATH` 等）時顯示 **code 原文**（契約允許）。`HomeTokenList` command 失敗仍取 `res.error?.message` 再 `friendlyErrorMessage`：若 envelope 帶繁中且非 code 形狀，`en` 會露出。HOW「掃漏網同等中文」未收乾。應改識別字串、補 catalog、持倉失敗走 `apiErrorMessage(locale, res.error, …)`。 |

0.22 側（本混合樹）：H1／H2／M1 維持關閉（Orb 無 `/history`；版本檔已是 0.23.0 候選；SimDeadline 含解編）。

**未關閉 HIGH：** 無

**應修 MEDIUM：** 023-M03（手驗）、023-M04、023-M05

### 測試結果

| 項目 | 結果 |
|------|------|
| `cd wallet && npm run typecheck` | pass（exit 0，`@airwave/wallet@0.23.0`） |
| `cd wallet && npm run build` | pass（exit 0；Vite production） |
| `bun test` | 未跑（任務禁止） |
| 擴充手驗 | **無手驗** |

文件與抽樣 diff 未見真實助記詞／私鑰／密碼。

---

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 第 1 輪 | 2026-10-08 | 未關 HIGH：023-H01–H03 |
| 第 2 輪 | 2026-10-08 | 自核關閉 H01–H03、M01；M03 手驗仍開 |
| 第 3 輪 | 2026-10-08 | 自核關閉 023-M02；連同 0.22 M1 |
| **第 4 輪** | **2026-10-08** | **獨立複審。混合版無未關 HIGH。新 023-M04／M05。typecheck／build pass。無手驗。** |

## 出貨

（可出貨待使用者同意 `shipped`、本機手驗、commit；backlog 清檔依 INDEX 出貨程序。第 4 輪建議先收 023-M04／M05 或接受為出貨後修。）
