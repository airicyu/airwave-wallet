# 0.14.0 — 原始碼目錄化（行為不變）

- **狀態：** `shipped`
- **上游版本：** [0.13.0](../0.13.0/INDEX.md)（審批宿主、`uiHost`、`walletSend`、共用審批殼語意不變；本版只改檔案位置與剩餘大檔的內部分檔）
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 規劃訪談（2026-10-05）。0.13.0 [refactor-plan](../0.13.0/docs/refactor-plan.md) 已寫明下一刀拆 `wallet-handlers.ts`
- **畫面：** 不改。沿用 [`docs/design-principles.md`](../../design-principles.md) 與 0.13.0 已出貨畫面
- **秘密欄位：** 無新密碼欄；既有類 B 欄行為不變

## 產品句

把 `wallet/src` 裡已經平鋪的 service worker、popup、審批殼，收成依職責分層的資料夾；`wallet-handlers.ts` 與 `approval/shell.ts` 拆成「一件事一個檔」。使用者可見行為、訊息名、storage key、pending 生命週期與 0.13.0 相同。

## 文件地圖

1. 本檔
2. [docs/folder-plan.md](./docs/folder-plan.md)（搬哪裡、誰當入口、什麼留在原檔）
3. [docs/reasoning.md](./docs/reasoning.md)
4. 上游：[0.13.0](../0.13.0/INDEX.md)
5. [HANDOFF.md](./HANDOFF.md)
6. 日後 UI 框架：[0.15.0](../0.15.0/INDEX.md)（本版不做）

## 已定案

| 題 | 決定 |
|----|------|
| 與 0.13.0 | 宿主矩陣、`uiHost`、`ui.abortPending`、`walletSend` 成功時序、網站請求仍 popout、pending 只在 SW `Map`、不進 `chrome.storage`、結果不廣播全 tab：**全部不變**。本版不改這些語意的句子，只改實作檔的路徑與內部分檔 |
| 行為 | 重構前後使用者可見行為相同。禁止借搬家改文案、DOM id、class、焦點、導航、逾時、CU、模擬或送出規則 |
| 入口路徑 | 下列路徑**禁止搬移**（manifest／Vite 入口）：`wallet/src/background/index.ts`、`wallet/src/popup/index.html`、`wallet/src/popout/index.html`、`wallet/src/content/index.ts`、`wallet/src/inject/index.ts`。`popup/main.ts`、`popout/main.ts`、`popup/style.css`、`popout/style.css` 留在原目錄 |
| 不動的樹 | `wallet/src/shared/`、`wallet/src/inject/`、`wallet/src/content/`、`wallet/src/popout/` **不**新建子資料夾、不拆檔。`shared` 仍是契約層。popout 仍是薄宿主，只允許為了新相對路徑而改 import |
| 目錄契約 | 目標樹以 [folder-plan.md](./docs/folder-plan.md) 為準。每個新子資料夾有 `index.ts`，**只** re-export 該資料夾對外函式。資料夾之間只 import 對方的 `index.ts`。同一資料夾內部檔可互相 import。禁止 `background/index.ts` 再變成「什麼都 re-export」的桶 |
| 循環 | 下層（`storage`、`messaging`、`session`、`pending`、`simulate`、`send`、`home-tokens`）不可 import `handlers/` 或 `wallet/`。上層命令檔只依賴下層 `index.ts`。出現循環時，把共用葉留在下層，**禁止**把邏輯搬回 `background/index.ts` 來消循環 |
| `wallet-handlers.ts` | 刪除平鋪巨檔。命令分派留在 `background/handlers/wallet-dispatch.ts`（只依 `req.command` 呼叫，不含業務步驟）。實作依 folder-plan 的命令分組拆到 `background/wallet/`。`wallet.getHomeTokens` 的命令本體改放 `background/home-tokens/`，仍呼叫既有 `getHomeTokensForOwners`。`storage.patchSettings` 放 `background/wallet/settings-command.ts`。命令字串不變 |
| 審批殼 | `approval/shell.ts` 仍是唯一掛載入口：`mountApprovalShell`、`disposeApprovalShell` 的函式名與對 popup／popout 的呼叫方式不變。純函式（格式化、回傳 `HTMLElement` 且不讀 shell 模組級 `let` 的卡片）抽到 `approval/format.ts` 與 `approval/cards/`。抽出去的函式用**明確參數**；新檔禁止再讀 `shell.ts` 的模組級 DOM／旗標。做不到這一點的函式**留在** `shell.ts`。dispose 仍須重設全部模組狀態（含抽出檔若有模組狀態，必須由 `disposeApprovalShell` 呼叫其 reset） |
| Popup | 只搬家，不重寫 `navigateTo`／`render`。畫面檔進 `home/`、`send/`、`accounts/`、`settings/`、`onboarding/`；`password-input.ts`、`dom.ts`、`format.ts`、`icons.ts`、`session.ts` 進 `lib/`。各 `index.ts` re-export **其他資料夾今日會用到的符號**（含 icon、`navigateTo`、`NATIVE_SOL_ID`、`findTokenRowById` 等，見 folder-plan），不是只抄 `main.ts` 的 import。`main.ts` 改 import 各資料夾 `index.ts`。對外函式名維持 0.13.0 結束時的 export 名 |
| 檔名 | 整檔搬家時**保留原檔名**。只有從巨檔拆出的新檔才用 folder-plan 的新名 |
| CSS／HTML | `popup/style.css`、`popout/style.css`、`popup/index.html`、`popout/index.html` **不拆、不重排**。禁止為了對齊資料夾而改選擇器 |
| 依賴 | 不加 npm 依賴、不上 React、不上狀態庫 |
| 數字 | 不改金額運算。本版不引入 `big.js` |
| 版本號 | 出貨時 `wallet/package.json`、`wallet/manifest.config.ts` 的 `version`、倉庫根 `version.md`、`changelog.md` 對齊 `0.14.0`。狀態改 `shipped` 仍須使用者同意出貨 |

## 非目標

- React／Vite React／functional component 重寫（已出貨：[0.15.0](../0.15.0/INDEX.md)）
- 拆或重寫 `style.css`、重排 `index.html`
- 改 custody、pending 形狀、`uiHost`、訊息名、storage key、Wallet Standard 能力表
- 再切 `home-tokens-service.ts` 的業務（只允許整檔搬進 `home-tokens/`，外加一個 getHomeTokens 命令薄檔）
- 為了行數把仍閉包 shell 狀態的函式硬搬出去
- Sidebar、聚合送出、地址簿、Agent
- 改 `../solibra-wallet`

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.13.0 結束時 | 0.14.0 |
|---------------|--------|
| `background/` 約三十個檔平鋪；`wallet-handlers.ts` 仍含全部 `wallet.*` | 依職責分子資料夾；命令分派與實作分開 |
| `popup/` 畫面檔平鋪在 `main.ts` 旁 | 畫面進 `home`／`send`／`accounts`／`settings`／`onboarding`，小工具進 `lib` |
| `approval/shell.ts` 單檔約 1200 行 | 純卡片與格式化抽出；掛載／卸載／接線可留在 `shell.ts` |
| 行為即契約 | **行為不變** |

## 實作 Track

### Track 1 — service worker 搬家（尚未拆命令）

- **做：** 依 folder-plan「整檔搬家」把 `background/` 平鋪檔移入子資料夾並加上各 `index.ts`。`wallet-handlers.ts` 本軌**整檔**搬到 `background/handlers/wallet-handlers.ts`，內容先不拆。`background/index.ts` 只改 import 路徑，仍只做監聽、dispatch、hydrate。修完全部相對 import。
- **不做：** 拆命令實作、改命令字串、動 popup／approval。
- **驗收：** `cd wallet && npm run typecheck` 通過。`background/index.ts` 仍是 manifest 的 service worker 路徑。

### Track 2 — 拆 `wallet-handlers`

- **做：** 依 folder-plan 命令分組把 `handlers/wallet-handlers.ts` 拆成 `wallet-dispatch.ts` 與 `background/wallet/*`、`home-tokens` 的 get 命令薄檔。刪除 `wallet-handlers.ts`。分派檔不含解密、寫 vault、組交易等步驟。
- **不做：** 改任一 `command` 字串或回應 `result` 形狀；把 begin-send 的組交易從 `send/wallet-begin-send.ts` 再抄一份。
- **驗收：** `cd wallet && npm run typecheck` 通過。靜態檢查：全倉庫 `wallet.*` 與 `storage.patchSettings` 字串與 Track 2 開始前一致（對照 folder-plan 命令表）。

### Track 3 — popup 搬家

- **做：** 依 folder-plan 移動 popup 檔並加子資料夾 `index.ts`。`main.ts` 改從資料夾入口 import。修 import。
- **不做：** 重寫導航、改 `index.html`、改 `style.css`、改 view 名稱。
- **驗收：** `cd wallet && npm run typecheck` 通過。`popup/index.html` 與 `popup/style.css` 相對 0.13.0 工作樹無內容差分（僅允許檔案完全未改）。

### Track 4 — 審批殼抽出純函式

- **做：** 依 folder-plan 把不讀 shell 模組狀態的格式化與卡片抽到 `approval/format.ts` 與 `approval/cards/`。`shell.ts` 改呼叫它們。`mountApprovalShell`／`disposeApprovalShell` 仍由 `shell.ts` export，popup 與 popout 的 import 只改路徑若檔未動則路徑仍是 `../approval/shell`。
- **不做：** 改 DOM 結構、文案、id、class；把仍依賴模組級 `let` 的畫面流程硬搬出。
- **驗收：** `cd wallet && npm run typecheck` 通過。`disposeApprovalShell` 仍重置掛載狀態（讀函式本體：抽出檔若引入模組級狀態，dispose 有呼叫對應 reset；若無新模組狀態則無需新 reset）。

### Track 5 — build

- **做：** `cd wallet && npm run typecheck` 與 `npm run build`。
- **不做：** 新依賴。

## 驗收（出貨 checklist）

- [x] folder-plan 的目標樹存在；舊平鋪路徑（除保留的入口）不再有那些檔
- [x] `wallet-handlers.ts` 已不存在；`wallet-dispatch.ts` 只分派命令
- [x] 命令字串與 `chrome.storage` key 字串與 0.13.0 相同（無重新命名）
- [x] `popup/style.css`、`popout/style.css`、`popup/index.html`、`popout/index.html` 無內容修改
- [x] 無新 npm 依賴（`wallet/package.json` 的 dependencies／devDependencies 與本版開始前相同，僅 `version` 可改為 `0.14.0`）
- [x] `cd wallet && npm run typecheck` 與 `npm run build` 通過
- [x] 手驗（未封裝擴充）：網站 connect 或 sign 仍開 popout；錢包代幣送出仍在 popup 殼內進審批、不另開 popout；連續兩次送出都能進審批（第二次不是 gone 殘留）；拒絕與批准底欄可見。實作審查時環境無法載入擴充，逐條記「未在瀏覽器走完」；使用者於 2026-10-06 確認出貨
- [x] 文件與程式無真實密碼／助記詞／私鑰

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/background/index.ts` | SW 入口；本版只改 import |
| `wallet/src/background/wallet-handlers.ts` | 拆前的 `wallet.*` 命令集（Track 2 刪除） |
| `wallet/src/approval/shell.ts` | 掛載入口；抽出純函式後仍 export mount／dispose |
| `wallet/src/popup/main.ts` | 導航編排；改 import，不重寫流程 |
| `wallet/manifest.config.ts` | service worker 與 popup／content／inject 路徑不可改 |
| `wallet/vite.config.ts` | popup／popout HTML 入口不可改 |
| `docs/roadmap/0.13.0/INDEX.md` | 不可推翻的產品語意 |
| `docs/roadmap/0.13.0/docs/refactor-plan.md` | 上一刀拆分邊界與「下一刀再拆 wallet-handlers」 |
