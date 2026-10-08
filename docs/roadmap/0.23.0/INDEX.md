# 0.23.0 — Wallet UI 多語言＋系統雙字體

- **狀態：** `in progress`
- **上游版本：** 行為接 [0.22.0](../0.22.0/INDEX.md) 出貨契約＋其後 **0.22.1** 修補（Orb URL 無 `/history`）。實作時以當時 `wallet/` 為準；**不**推翻 0.22 畫面語意。
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** [backlog/wallet-ui-i18n.md](../backlog/wallet-ui-i18n.md)；字體方案 B 已於規劃對話選定
- **畫面：** [`docs/design-principles.md`](../../design-principles.md)（本版出貨時須改第 1、3、6、8 節，見已定案）；概念稿 [`docs/design-demos/i18n-type-ux.html`](../../design-demos/i18n-type-ux.html)（非正式；衝突以本 INDEX／HOW 為準）
- **秘密欄位：** 無新密碼欄；vault blob 不改 schema。`locale` 明文寫在既有 `airwave.settings.v1`

## 產品句

已解鎖使用者可在 Settings 第一列選繁體中文、简体中文或英文；選擇立刻寫入設定，popup、popout 審批殼與解鎖頁立刻改文案。錢包 chrome 不再寫死單一語文。UI 字體為 Segoe UI 加同一套繁簡中文（微軟正黑體 UI／蘋方 TC）。不引入第三方 i18n 套件。

## 文件地圖

1. 本檔
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. 上游：[0.22.0](../0.22.0/INDEX.md)、[0.8.0](../0.8.0/INDEX.md)（Settings 樞紐／網路單選列）
5. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 範圍 | Wallet **chrome**（popup、popout、審批宿主含鎖定／解鎖、onboarding 畫面裡的標籤按鈕錯誤空狀態 tooltip／`aria-label`）。**同一版**做完，不把 popout 留到下一版。不翻譯 dApp 頁、`test-web/`、inject／Wallet Standard 給網站看的方法名、鏈上 token 名稱／symbol、origin、URL、公鑰、錯誤碼原文、帳戶 `label` |
| 語言 | 僅 `zh-Hant`、`zh-Hans`、`en`。第四種語言與 RTL 為非目標 |
| 預設 | **固定** `zh-Hant`。不讀 `navigator.language`、不跟 Chrome UI 語言。舊 storage 無 `locale` 或值不是上列三碼 → `zh-Hant` |
| 入口 | Settings 樞紐**第一列**：列名走字串表（語言／语言／Language）；右側摘要永遠是該語言 **endonym**（`繁體中文`／`简体中文`／`English`），**不**隨介面語言改寫成「Traditional Chinese」這類譯名。點列進 `settings-locale` 子頁 |
| 語言頁 | 三列單選，版式對齊 [0.8.0](../0.8.0/INDEX.md) 網路頁（圓點、選中 accent 邊）。**禁止**頂部分段 tab（三個語言名在 popup 寬度會擠，也與網路選法不一致）。點列立刻 `storage.patchSettings({ locale })`。無儲存鈕、無說明句 |
| 寫入 | 既有 `storage.patchSettings`；payload 可含 `locale`。不新增 command、不新增 `chrome.storage` key。仍 `airwave.settings.v1`。`onChanged` 更新各 UI 鏡像（既有路徑）。鎖定時 settings 仍可讀，解鎖頁跟同一 `locale` |
| 查表 | 本倉庫 lightweight util：`wallet/src/shared/ui-i18n.ts`（型別＋`parseUiLocale`＋`t`）與 `wallet/src/shared/ui-messages.ts`（catalog）。**禁止** `i18next`／`react-intl`／同類套件。每個 key 必須同時有三語；catalog 型別是 `Record<MessageKey, Record<UiLocale, string>>`（或等價：`Record<UiLocale, Record<MessageKey, string>>` 且三語 key 集合用型別強制相等）。缺鍵＝typecheck 失敗。上線禁止空白字串當譯文 |
| `t` | `t(locale, key, vars?: Record<string, string>)` 只查表並把 `{name}` 換成 `vars`。未知 locale 先 `parseUiLocale` 成 `zh-Hant`。開發／typecheck 路徑禁止 silent fallback 到另一語來遮缺鍵。畫面與 vanilla 殼**禁止** `if (locale === "en")` 拼使用者句子 |
| 鍵名 | 點分隔、英文小寫，按畫面分組（`settings.hub.language`、`unlock.lead`、`copy.copied`、`error.rpcRateLimit`）。專有名詞不進表：RPC、Helius、Jupiter、Combined、Devnet、Mainnet、SOL、Airwave、API keys、Default CU price、Orb。徽章 `Devnet` 維持英文 |
| 錯誤 | **選 A。** SW **不得**呼叫 `t`，也不得為畫面語文呼叫 `friendlyErrorMessage`。凡 SW（或 popout 啟動）推到**錢包可見**的列、進度、toast、模擬解讀**標籤**（含「轉移 SOL」、欄位名「來源／收款」——這是錢包 chrome，不是鏈上 token 名），本版一律改穩定 **code 或 decoder kind**，UI render 再 `t`。command 已有 code 者 UI **只認 code**，不把中文 `message` 當 chrome。HOW 表是最低集合，實作掃漏網同等中文 chrome 一併改碼，不必再問。`friendlyErrorMessage` **只活在 UI**。狀態只存 code／raw／kind。技術原文不翻譯。限流 toast 走 `error.rpcRateLimit` |
| 法律 | About **列名與頂欄**走 catalog。`docs/legal/disclaimer.md`／terms **本文**本版不拆三語，維持現檔 |
| 版面 | 容器以產品 popup 寬 **`--popup-w`（422px）** 與高 600px 為準（design-principles 仍寫約 384 是歷史意向；本版驗收以 CSS 變數）。三語最長句仍單行；放不下 `ellipsis`，完整句同一語言放 `title` 與 `aria-label`。禁止為某一語把主列折兩行或把殼底主按鈕擠出視窗。數字、公鑰縮寫規則不變，不做完整數字／日期在地化 |
| 字體 | **方案 B。** `body`（popup 與 popout）`font-family: "Segoe UI", "Microsoft JhengHei UI", "PingFang TC", sans-serif`。繁簡**同一套**中文，不切雅黑、不打包 webfont、不引入 Google Fonts。`--mono` 維持給金額、地址、mint、RPC URL。解鎖標題與送出確認中標題：**去掉** `letter-spacing: 0.02em`（漢字會被拉開）。英文專有名詞與混排帳戶名靠字體 fallback，不為混排另做 `unicode-range` |
| 設計原則 | 出貨本版（Track 3）改 [`docs/design-principles.md`](../../design-principles.md)：**第 1 節**解鎖／確認中標題字距 0，例句改「走字串表」不寫死繁中句，並寫明產品圖位置（見下一列）；**第 3 節** tooltip 跟 locale；**第 6 節** UI 文案跟 `settings.locale`，限流 toast 例句改為 catalog 鍵說明而非只寫繁中一句；**第 8 節** Settings 樞紐列清單第一列改為語言 |
| 產品圖 | 用 manifest 同一張 `public/icon128.png`（`chrome.runtime.getURL`）。解鎖全屏（popup、popup 內審批、popout 審批）與首次建立密碼：置中 64px 圓角圖在標題 Airwave 上方；解鎖仍有鎖定說明，建立密碼沒有。關於頁：版本列上方 40px 同一張圖。Home 頂欄、帳戶縮寫、子頁返回列、Tokens／Activity／Settings 列、簽署審批主畫面不放。頂欄鎖定按鈕維持線稿鎖，不換成產品圖。圖本身不是文案，不進 catalog |
| 數字 | 鏈上整數繼續 `BigInt`／字串。本版不做金額運算 |
| 依賴 | 不新增 npm 套件 |
| test-web | 不新增按鈕、不翻譯 |
| 版本號 | 出貨時 `wallet/package.json`、`wallet/manifest.config.ts`、`version.md`、`changelog.md` 對齊 `0.23.0`。狀態改 `shipped` 須使用者同意 |

## 非目標

- 第四種語言、RTL、使用者自訂翻譯、跟瀏覽器語言
- 翻譯代幣名稱、dApp、`test-web/`、inject 對頁面 API
- 把操作說明寫回畫面
- Agent／LLM 文案、鏈上資料在地化
- 第三方 i18n 套件、打包 Noto／Inter
- 繁簡分兩套中文字體（雅黑／Noto Sans SC）
- Sidebar、地址簿、聚合送出、storage 世代遷移、Durable nonce、鏈上 IDL、AI 安全評估
- 改 vault、改 pending 生命週期、宣告新 Wallet Standard 方法
- 翻譯法律本文
- 改 `../solibra-wallet`

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.22.x／現況 | 0.23.0 |
|--------------|--------|
| UI 寫死繁中夾雜英文標題；`SUBPAGE_TITLES` 常數 | chrome 走一份三語 catalog；畫面只 `t(locale, key)` |
| 無 `settings.locale` | `airwave.settings.v1` 增 `locale`；缺省 `zh-Hant` |
| Settings 樞紐無語言列 | 第一列語言 → 三列單選，立刻 patch |
| `body` 只寫 Segoe UI；解鎖標題 `0.02em` 字距 | 方案 B 字體棧；標題字距 0 |
| design-principles「UI 用繁體中文」 | 出貨時改成跟使用者語言 |
| 解鎖徽章是通用鎖線稿；建立密碼與關於沒有產品圖 | 解鎖與建立密碼置中 64px `icon128`；關於 40px；Home 與簽署主畫面不放 |

## 實作 Track

### Track 1 — locale 欄、util、字體

- **做：** `Settings.locale`＋`normalizeSettings`／`DEFAULT_SETTINGS`；`parseUiLocale`；`t`＋空 catalog 骨架（至少含語言頁與解鎖各鍵的三語，後續 Track 填滿）；popup／popout `body` 字體棧；去掉解鎖與確認中標題 `0.02em`。
- **不做：** 把所有畫面鍵填完（Track 2）；Settings 語言列可在本 Track 先接上以便手驗寫入。
- **驗收：** `cd wallet && npm run typecheck`。故意從 catalog 刪一個語文編譯失敗（可在本地試完還原，不必把失敗提交）。無 `locale` 的舊 JSON 讀出來是 `zh-Hant`。無效字串 `"fr"` 讀出來是 `zh-Hant`。

### Track 2 — 收字串＋Settings 語言頁

- **做：** 掃使用者可見 chrome：**popup／popout／approval（含 `approval/cards/`）**、`popup/runtime.ts`（`subpageTitle`）、`popup/settings/settings-logic.ts`、`popup/onboarding/`、`shared/copy-pk-feedback.ts`、`shared/friendly-error-message.ts`（改為 UI 側、帶 locale）。SW 持倉／模擬把中文 `reason`／`error` 改成 HOW 的 code。Settings 樞紐第一列＋`settings-locale`。React hook 讀 `settings.locale`；vanilla 繪製時 `t`。`token-send` 頂欄 `t(..., { symbol })`，symbol 不譯。語言頁 endonym 與 `checked === locale` **不算**「畫面 if 拼句」。
- **不做：** 翻譯 legal markdown 本文；改 command 集合。
- **驗收：** typecheck。`settings-locale` 三列可切且 storage 立刻有對應碼。樞紐摘要為 endonym。上列路徑的使用者句子改為 key（允許 catalog 檔與測試裡出現三語原文）。切語言後已顯示的錯誤列／toast 隨 `onChanged` 換成新語（render 再 `t`，不是把譯文存在 state）。

### Track 3 — 版面＋原則檔＋建置

- **做：** 英文最長標籤在 422px 單行或 ellipsis（Settings 樞紐 `Wallet password`／`Language`、殼底主按鈕）。產品圖依已定案「產品圖」放在解鎖、首次建立密碼、關於。改 `design-principles.md` 第 1、3、6、8 節（見已定案「設計原則」）。`cd wallet && npm run typecheck && npm run build`。
- **不做：** test-web 新入口。
- **驗收：** 兩道指令 exit 0。手驗：三種語言走 Home、Settings 語言、解鎖、一條審批或送出確認中，無寫死繁中殘留在可見 chrome（專有名詞與 legal 本文除外）。

## 驗收（出貨 checklist）

- [ ] Settings 第一列可進語言頁；三列單選立刻寫入 `locale`；無儲存鈕
- [ ] 樞紐摘要為 繁體中文／简体中文／English（endonym），不隨介面語改寫語言本名
- [ ] 切到 `en` 後 Home、Settings 其它列、解鎖、popout／審批殼可見 chrome 為英文（專有名詞與 legal 本文除外）；切回繁中還原
- [ ] 舊資料無 `locale` → 繁中；無效碼 → 繁中；不讀瀏覽器語言
- [ ] 無 i18next 等新依賴；`t` 無畫面級 locale if-else 拼句
- [ ] popup 與 popout body 為方案 B 字體棧；解鎖／確認中標題無 `0.02em`
- [ ] 無新 command、無新 storage key、無新 Wallet Standard 方法
- [ ] `cd wallet && npm run typecheck` 與 `npm run build` 通過
- [ ] 手驗未封裝擴充走完上列；422px 內英文列未把殼底擠出
- [ ] `design-principles.md` 已改文案跟 locale
- [ ] 解鎖（popup 與 popout／審批鎖定）與首次建立密碼為置中 64px 產品圖；關於為版本列上 40px；Home 頂欄與簽署主畫面沒有這張圖
- [ ] 文件與程式無真實密碼／助記詞／私鑰
- [ ] 版本號檔對齊 `0.23.0`；狀態 `shipped` 須使用者同意；出貨後刪 backlog 列與 `wallet-ui-i18n.md`

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/shared/storage-keys.ts` | `Settings.locale`、`DEFAULT_SETTINGS` |
| `wallet/src/background/storage/storage-io.ts` | `normalizeSettings` 認三碼 |
| `wallet/src/background/wallet/settings-command.ts` | 既有 patch 合併 locale |
| `wallet/src/shared/ui-i18n.ts` | 本版新增：locale 型別與 `t` |
| `wallet/src/shared/ui-messages.ts` | 本版新增：三語 catalog |
| `wallet/src/popup/settings/SettingsScreens.tsx` | 樞紐第一列＋語言頁 |
| `wallet/src/popup/types.ts` | `settings-locale` view、`SUBPAGE_TITLES` 改查表 |
| `wallet/src/popup/runtime.ts` | `subpageTitle` 查表 |
| `wallet/src/popup/onboarding/OnboardingScreens.tsx` | 解鎖／建庫文案與產品圖 |
| `wallet/src/popup/components/BrandMark.tsx` | 64px／40px 產品圖 |
| `wallet/src/shared/brand-icon.ts` | `chrome.runtime.getURL("public/icon128.png")` |
| `wallet/src/popup/components/ApprovalHost.tsx`、`wallet/src/popout/index.html` | 審批鎖定畫面同一張圖 |
| `wallet/public/icon128.png` | 產品圖檔；路徑對齊 manifest `icons` |
| `wallet/src/popup/PopupMarkup.tsx` | 子頁掛載 |
| `wallet/src/popup/settings/settings-logic.ts` | 改密等使用者短句改碼＋`t` |
| `wallet/src/shared/copy-pk-feedback.ts` | 「已複製」走 catalog |
| `wallet/src/background/home-tokens/home-tokens-service.ts` | 持倉失敗改回 code |
| `wallet/src/background/simulate/simulate-pending-tx.ts`、`sign-tx-simulate.ts` | 模擬 `reason` 改 code |
| `wallet/src/approval/cards/simulation-notice.ts` | 模擬卡 render 時 `t` |
| `wallet/src/popup/style.css`、`wallet/src/popout/style.css` | 字體棧、標題 letter-spacing |
| `wallet/src/approval/shell.ts` | vanilla 審批／鎖定文案 |
| `wallet/src/shared/friendly-error-message.ts` | 使用者短句改 `t` |
| `docs/design-principles.md` | 出貨時改第 1、3、6、8 節 |
| `wallet/src/background/simulate/decode-compiled-ix.ts` | 解讀標籤改穩定 kind，UI 再 `t` |
| `wallet/src/background/send/wallet-finish-send.ts` | 進度改 code |
| `wallet/src/background/close-empty/close-empty-service.ts` | 對 UI 的 `message` 改 code |
| `wallet/src/popout/` | 缺 `requestId` 等啟動句走 catalog |
| `docs/design-demos/i18n-type-ux.html` | 非正式概念稿 |
