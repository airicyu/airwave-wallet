# Design review — 0.51.0

審查只認檔案。本檔是審查紀錄，不是已定案。

## 各輪日期

| 輪次 | 日期 | 範圍 |
|------|------|------|
| 1 | 2026-10-21 | 初審。無既有 `design-review.md`，無 `HANDOFF.md` |
| 2 | 2026-10-21 | 核對 DR-051-1、DR-051-2、DR-051-3 是否寫進 INDEX、`how.md`、`reasoning.md`。未改契約與程式 |

## 對照基準

- 已定案與驗收：[`INDEX.md`](../INDEX.md)（status `draft`）
- 做法與取捨：[`docs/how.md`](./how.md)、[`docs/reasoning.md`](./reasoning.md)
- 交接：[`HANDOFF.md`](../HANDOFF.md) 只指向契約，沒有另立產品規則
- 上一版：[0.50.0](../../0.50.0/INDEX.md) 只拆檔，不改建立聚合的產品形狀
- 管理頁來源：[0.47.0](../../0.47.0/INDEX.md)。該版非目標含「建立聚合的第一頁」，本版把它排進來，沒有改管理頁契約
- Backlog：`account-avatar.md` 只構想整戶頭像，不是本版契約
- 架構禁區：[`GUIDELINES.md`](../../GUIDELINES.md) 第 4、8 節。本版不碰 pending、廣播、保管或 inject
- 現碼只用來核對提案是否和已出貨行為打架。建立頁仍是 chip／checkbox，代表本版尚未實作，不是設計 HIGH

## 總評

可以開工。門檻通過：沒有未關閉的 HIGH。第 1 輪兩項 MEDIUM 與一項 LOW 都已寫進 INDEX 與 `how.md`，本輪關閉。提案可行。

Verdict: proceed

## Load-bearing decisions

`reasoning` 寫明要對齊管理頁，並放下三條：建立時不編 `memberNames`、不換 `wallet.createCombinedAccount`、貼上時丟掉無法解析的字而不做 chip。視覺基準是已出貨的管理頁，沒有另開 demo。這些和 INDEX 的 Out of scope 一致。

草稿放在畫面旁的 module、不進 `chrome.storage`，INDEX 已寫明。它不是持久配置，也不是 pending，不構成手寫 rehydrate 主路徑。第 2 輪起，離開四個建立 view 的任何導頁都清草稿，寫在 INDEX、`how.md`，以及 `reasoning` 的 Dropped。

## Findings

### High

（無）

### Medium

#### DR-051-1 — 草稿清除只寫了 Back 那一條邊

狀態：關閉（第 2 輪）。

INDEX 已定案：從 `add-account` 進入 `add-combined` 時草稿是空的；只有成功建立，以及 Back 離開 `add-combined` 回到 `add-account`，才清除。`how.md` 只寫「離開 `add-combined` 走向 `add-account` 時清除」。

Popup 選單可以從建立流程直接到 `accounts`、設定或其他畫面（`PopupMarkup`），不必經過那條 Back。同一份 popup 文件還在時，module 草稿還在。使用者再從 `add-account` 進入 `add-combined`，會看到上次的名稱、成員與主錢包，和「進入時為空」衝突。驗收列只手測 Back，所以這是次要出口，不是主路徑斷掉。

補法：離開那四個建立 view 的任何導頁都清除草稿；四個 view 之間不清除。成功建立仍清除。

第 2 輪核對：INDEX「Draft lifetime」寫明四個 view 之外的導頁都清除，並點名選單跳頁；驗收列也手測選單離開。`how.md` 的 Views 寫同一句，並要求清草稿發生在改 `currentView` 的那一處。`reasoning` 的 Dropped 放下「只在 Back 清除」。現碼 `usePopupNavigation` 只有一處 `setCurrentView`，這句做得到。

#### DR-051-2 — 名稱上限沒有寫進做法

狀態：關閉（第 2 輪）。

INDEX：名稱最長 `ACCOUNT_LABEL_MAX`，沒有計數、沒有提示；空白不送。現碼輸入框有 `maxLength`。`wallet.createCombinedAccount` 經 `parseOptionalAccountLabel`，過長回 `INVALID_LABEL`，不寫帳戶。

`how.md` 只寫 trim 後空白就省略 `label`。沒寫輸入上限，也沒寫命令失敗時留在 `add-combined`、保留草稿、把錯誤畫在哪。只跟 HOW 做，上限會從「打不進去」變成「送出後失敗」，而且失敗表面沒有著落。

補法：沿用現有 `maxLength={ACCOUNT_LABEL_MAX}`。命令失敗不清除草稿、不換頁，錯誤用這一頁既有的一行錯誤（或與管理頁相同的 `showError`，擇一寫死）。

第 2 輪核對：INDEX 的 Name 列寫 `maxLength={ACCOUNT_LABEL_MAX}`、無計數、空白不送，失敗留在 `add-combined`、保留草稿、錯誤用 `#combined-err`。`how.md` 的 Create page 寫同一組，並寫死不用 `showError`。現碼 `combined-create-screen.tsx` 已有 `id="combined-err"`。`reasoning` 沒有重述上限與錯誤列；產品規則在 INDEX 與 `how.md`，不因此維持開放。

### Low

#### DR-051-3 — 無本機名稱時，第一行要不要留空

狀態：關閉（第 2 輪）。

INDEX：對到本機 signing 或 watch 才顯示該列 `label`，否則第一行不渲染。`how.md` 寫成員列照 `CombinedManagePanel` 的列結構、拿掉鉛筆。管理頁的 `.account-name` 即使名稱是空字串仍在。

驗收要的是圓形、種類槽、複製、垃圾桶、握把，兩份文件對這些一致。差的是空名稱那一行的節點。實作時以 INDEX 為準：沒有本機 label 就不渲染第一行。

第 2 輪核對：INDEX 的 Member row 寫沒有本機帳戶就不渲染第一行。`how.md` 寫成員列與主錢包卡都不渲染空的 `.account-name`。`reasoning` 的 Dropped 放下空白名稱行。主錢包卡「與該列相同名稱」因此是：該列沒有名稱行時，卡也不畫名稱行。

## 驗收對照

| 驗收 | 能否手測 | 備註 |
|------|----------|------|
| 有成員時主錢包卡與成員列（圓、種類槽、複製、垃圾桶、握把） | 能 | 無成員時主卡隱藏，和 Remove 列一致 |
| 加號、貼上只收有效新鑰並回建立頁、本機列再次點已在 | 能 | 貼上是多鑰；管理頁貼上仍是單鑰。本版 INDEX 已分開寫 |
| 圓形設主卡；垃圾桶可清到零並停用建立；握把順序等於送出的 `subPubkeys` | 能 | 現有 `normalizeSubPubkeysInput` 去重且保留順序，不改命令即可 |
| Back 回新增選擇器清草稿；貼上與本機 Back 保留；選單離開四個建立 view 也清 | 能 | DR-051-1 已關閉。驗收列已含選單 |
| 仍呼叫 `wallet.createCombinedAccount`，不寫 `memberNames` | 能 | 命令本體不在本版 |
| `cd wallet && npm run typecheck` | 能 | |
| 未打包擴充：貼上一條、本機一條、設主錢包、重排、建立、管理頁對主錢包與順序 | 能 | 一條路徑。此畫面不跟 dApp 說話，HOW 寫明不做 `test-web` |

沒有「等等」或無法執行的勾。

## 現碼抽樣

與提案沒有不可調和的衝突。下列是尚未改的現況，不是缺陷。

| 錨點 | 抽樣 |
|------|------|
| `combined-create-screen.tsx` | 名稱、chip、本機 checkbox、dock `accounts.combinedCreate`、`wallet.createCombinedAccount` 的 `{ label?, subPubkeys, mainPubkey }`。草稿在元件 `useState`，子頁卸載會丟。本版要改成 module。`#combined-err` 已在 |
| `combined-logic.ts` | `draftChips` 與 `pickedPks` 分開，再合併。貼上尚未先 `parsePublicKeyBase58`。本版要改成一條已正規化的 `members` |
| `CombinedManage.tsx` | `main-wallet`／`member-sheet`／`member-line`、`DRAG_PX = 6`、種類槽只在 signing、標題 `accounts.members`、加號在標題右。最後一員的垃圾桶在管理頁是停用；建立頁 INDEX 允許刪到零 |
| `combined-member-screens.tsx` | 兩個入口列可照抄，view id 要換成建立用的三個。管理貼上是單一公鑰，不要把那個停用條件抄進建立貼上 |
| `runtime.ts` / `types.ts` / `AccountViews.tsx` | 目前只有 `add-combined`，父頁 `add-account`。三個新 view 尚未登記 |
| `usePopupNavigation.ts` | `setCurrentView` 只在 `navigateTo`。送幣草稿已在離開該流程時於同一處清除。建立草稿可放同一處 |
| `create-combined.ts` | 不讀 `memberNames`。`mainPubkey` 必須在 `subPubkeys` 裡。順序由 `dedupePreserveOrder` 保留 |

## Waiver

（無）

## 修復追蹤

| ID | 狀態 | 寫進 INDEX／HOW／reasoning |
|----|------|--------------------------|
| DR-051-1 | 關閉 | INDEX Draft lifetime 與驗收；`how.md` Views；`reasoning` Dropped |
| DR-051-2 | 關閉 | INDEX Name；`how.md` Create page（含不用 `showError`）。`reasoning` 未重述，不影響關閉 |
| DR-051-3 | 關閉 | INDEX Member row；`how.md` Create page（含主錢包卡）；`reasoning` Dropped |

## 歷審摘要

- 2026-10-21 第 1 輪：可開工，無 HIGH。開放 MEDIUM `DR-051-1`、`DR-051-2`，LOW `DR-051-3`。當時 Verdict: proceed after fixes。
- 2026-10-21 第 2 輪：三項皆已進 INDEX 與 `how.md`，標關閉。無新 ID。Verdict: proceed。
