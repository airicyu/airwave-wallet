# 0.14.0 — 為何只做目錄

## 為何現在做

0.13.0 把 `popup/main.ts` 與 `background/index.ts` 從兩千行級拆成「一檔一件事」，調度層已經薄。剩下的問題是平鋪：`background/` 約三十個檔在同一層，`popup/` 畫面檔也平鋪，`wallet-handlers.ts`（約 1100 行）與 `approval/shell.ts`（約 1200 行）仍各包多件事。

目錄化讓下一個功能版能把 diff 放在一個資料夾裡。再拖下去，新命令會繼續堆進 `wallet-handlers.ts`。

## 否決：同一版改 React

討論過把 popup 改成 Vite + React functional component。否決放進 0.14.0：

- 審批殼從 0.10.0 到 0.13.0 才把宿主、模擬、CU、確認頁、dispose 收斂。搬家同時重寫渲染，失敗時無法分辨是路徑錯還是行為錯。
- Service worker、content、inject 不能改成 React。Pending 仍只活在 SW，框架解決不了命令集過大。
- 現有 UI state 已是 `wallet.getState` 的一個物件加 `View`。React 有助於之後的畫面函式，但不是本版阻塞點。

因此 React 只留在 [backlog/popup-react.md](../../backlog/popup-react.md)，且寫明 pending 不得進客戶端持久 store。

## 否決：硬性行數上限

0.13.0 已寫明 vanilla 殼的 `navigateTo` 本身會超過數百行。本版不設「每檔 ≤ N 行」。抽審批殼時，閉包模組級 DOM 的函式留在 `shell.ts`，避免為了變短而製造一圈互相指的全域。

## 否決：順手拆 CSS／HTML

`popup/style.css` 約 1800 行，但是選擇器與 `index.html`、指令式 DOM 綁在一起。和 TypeScript 搬家放同一版，就無法用「HTML／CSS 位元組不變」當作行為未改的靜態證據。

## 入口為什麼釘死

`manifest.config.ts` 與 `vite.config.ts` 用固定路徑指向 service worker、popup HTML、popout HTML、content、inject。搬這些入口會把重構變成載入失敗，收益只是目錄好看。`background/index.ts` 繼續當 SW 入口，不兼任 barrel，避免入口把全部子系統打成一個循環圖。

## 下層不可 import 命令層

`wallet.*` 實作若能回頭 import `handlers/`，分派與業務會再次纏在一起，下一個版本會把新檔又 import 回巨檔模式。命令層在上、儲存／pending／送出在下，是本版唯一新的結構規則；它不改變 runtime 行為。
