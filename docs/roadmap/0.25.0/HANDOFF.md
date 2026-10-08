# HANDOFF — 0.25.0

## 讀檔順序

1. 倉庫根 [AGENTS.md](../../../AGENTS.md)、[docs/roadmap/GUIDELINES.md](../GUIDELINES.md)、[docs/design-principles.md](../../design-principles.md)
2. [INDEX.md](./INDEX.md)
3. [docs/how.md](./docs/how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 設計審查：[docs/design-review.md](./docs/design-review.md)（第 3 輪契約層通過；本檔不是契約）
6. 上游：[0.24.0](../0.24.0/INDEX.md)、[0.13.0](../0.13.0/INDEX.md)、[0.13.0 approval-host-how](../0.13.0/docs/approval-host-how.md)

## 產品摘要

Home 頂欄一顆圖示，在錢包視窗（`src/popup/index.html`，viewport 360×600）與 Chrome 側欄（`src/sidepanel/index.html`，寬 100%）之間切換。無工具列 popup。`settings.shell` 預設 `"window"`。網站請求仍開審批 popout。錢包送出的 `uiHost` 跟發起頁路徑，走 0.13.0 的殼內離開規則。

## Track

1 manifest、`settings.shell`、工具列、找回視窗 → 2 Home 按鈕互切 → 3 拉滿寬度、`uiHost`、原則檔、typecheck＋build

## 禁區

GUIDELINES pending／custody／不廣播。不新增 storage key。不加 npm 依賴。不宣告 Wallet Standard 方法。不把網站請求放進側欄。不共用 `openPopout`／`bindPopoutWindow`。SW 醒來不新建、不聚焦錢包視窗。`sidePanel.open` 必須在點擊同步呼叫。payload 只有 `shell` 時不 `notifyAccountChanged`。不拆 `PopupMarkup.tsx` 與 `popup/style.css`。不改審批 420×640，不改 `--popup-w` 定義。不要改 `../solibra-wallet`。文件不寫真實秘密。**Do not commit unless the user asks.**

## 錨點

見 INDEX「錨點檔案」。只改 `wallet/src/background/wallet/commands/send-command.ts` 的 `uiHost`；舊路徑 `wallet/src/background/wallet/send-command.ts` 若還在，不要兩份同時寫 host。

## Paste-ready starter prompt

```text
只認檔案，不認 chat history。先讀 AGENTS.md、docs/roadmap/GUIDELINES.md、docs/roadmap/0.25.0/HANDOFF.md、INDEX.md、docs/how.md、docs/reasoning.md。跟 Track。settings.shell 為 window|sidebar，缺省 window，放進既有 airwave.settings.v1。拿掉 default_popup，加 sidePanel。錢包視窗沿用 src/popup/index.html；側欄新建 src/sidepanel/index.html，同一 React 入口。SW 啟動只 setPopup("") 與 setPanelBehavior，不 windows.create、不聚焦。只有 shell===window 的 action.onClicked 才用 getAll 找回 src/popup/index.html（排除 popout/index.html）；找到則聚焦且不校正，沒有才新建並用 shell.fitWalletWindow 校正 viewport 到 360×600 一次。sidebar 的啟動與點擊不碰錢包視窗。Home 頂欄鎖定左側一顆圖示，只在 isHomeView。切到側欄必須同步 chrome.sidePanel.open，成功後才 patchSettings({shell}) 再關另一面。切換失敗不寫入、不關目前這一面。lastNormalWindowId 只在記憶體，推送只給錢包殼，禁止廣播 content script。beginSend 的 uiHost 跟發起頁路徑 window|sidebar，不再寫 popup；這兩個值沿用 0.13.0 殼內規則，禁止 closePopout，失焦不 abort。payload 只有 shell 時 handlePatchSettings 不 notifyAccountChanged。側欄與錢包視窗寬高 100%，不改 --popup-w 定義，不改審批 420×640。PopupMarkup.tsx 與 popup/style.css 不拆。三語 shell.toSidebar／shell.toWindow。Track 3 改 design-principles 第 1 節。不要改 ../solibra-wallet。INDEX 已定案不要再問。不要 commit。
```

## 完成檢查

- [x] 設計審查無未關 HIGH（第 3 輪複審，2026-10-09）
- [x] INDEX 狀態改 `in progress` 後實作 Track 1–3（程式已合入；瀏覽器手驗待本機）
- [x] `cd wallet && npm run typecheck` 與 `npm run build` 通過
- [ ] INDEX 手驗走完（含 SW 回收後再點圖示、SW 醒來不自己開窗）
- [ ] 出貨前 changelog／version 對齊 `0.25.0`；`shipped` 與清 backlog 須使用者同意
