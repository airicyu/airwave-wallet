# Popup React（未排程）

構想，不是契約。0.14.0 明確不做。

## 意向

錢包擴充頁（popup、之後才是 popout／審批殼）改為 Vite + React，畫面用 functional component。目的是讓「畫面是 state 的函數」取代命令式 DOM。

## 邊界（若日後排程，寫進該版 INDEX 前仍須重審）

- Service worker、content script、inject 維持 TypeScript，不上 React。
- Pending 仍只活在 service worker。禁止把待審批請求放進 Zustand 或任何會持久化的客戶端 store。
- 建議順序：一個葉畫面試點 → 其餘 popup → 審批殼最後。審批殼與 popup、popout 共用，不宜與目錄重構同一版重寫。
- 既有 class 名可先沿用，避免同時重寫 CSS。

## 現況

0.14.0 只做目錄化，見 [0.14.0 INDEX](../0.14.0/INDEX.md)。
