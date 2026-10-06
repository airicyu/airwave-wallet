# 0.15.0 — 為何 popup 上 React，審批殼不上

## 為何現在做

0.14.0 已把 popup 依畫面分資料夾。接下來痛點是命令式 DOM：`navigateTo` 之後各 `render*` 手動改節點，狀態一多就容易漏 hidden／disabled／錯誤列。React functional component 讓「這一屏 = props／state 的函數」，持倉列、帳戶卡、設定列也比較好重用。

目錄化剛完成，適合單獨開一版改渲染，避免與搬家差分纏在一起。

## 否決：同一版重寫審批殼

`approval/shell.ts` 同時服務 popup 與 popout，含模擬、CU、確認中／已確認、dispose 契約。0.10.0–0.13.0 才收斂。與整包 popup 遷移同一版，失敗時分不清是導航錯還是簽署 UI 錯。本版用 ref 容器繼續 `mountApprovalShell`。

## 否決：Zustand／Router

錢包真相已在 `chrome.storage` + `wallet.getState`。再加客戶端 store 容易讓人把 pending 或解鎖材料放進去，踩 GUIDELINES。`View` 聯集有限，條件渲染足夠，不上 React Router。

## 否決：SW／inject 上 React

Service worker 與 page script 不是 React 的執行環境契約；簽名與 vault 必須留在擴充 TypeScript。React 只屬於 popup（本版）與日後可能的擴充頁。

## 為何改 HTML 薄 root

現行 `index.html` 含數百行靜態 markup，與命令式 `getElementById` 綁死。React 主路徑若繼續 hydrate 那棵樹，會變成兩套真相。薄 `#root` 一次切乾淨；視覺靠沿用 class，不靠重寫 CSS。

## 依賴為何只三個

Vite 已在專案內。執行期只需 `react`／`react-dom`；建置需 `@vitejs/plugin-react`。多裝狀態庫或 UI kit 違反「依賴須能說明必要理由」，且本版目標是遷移而非換設計系統。
