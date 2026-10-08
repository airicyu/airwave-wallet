# HOW — 頁面模組與宿主（0.25.0）

INDEX 衝突以 INDEX 為準。本檔只寫 **UI 怎麼切模組**。Pending 生命週期、custody、訊息仍以 GUIDELINES 與 0.13.0 審批規則為準。

不要用程式裡的 `legacy` 當產品詞。現碼 `view-legacy` 只是 connect 畫面湊在審批殼裡的一塊 DOM，**不是**一種 page。

## 三層，不要混

| 層 | 負責 | 不負責 |
|----|------|--------|
| **宿主 Host** | 哪一扇殼：工具列 popup、Chrome 側欄、審批 popout。打開／關掉這扇殼 | 某一頁的標題、內文、底欄、文案 |
| **導航 Navigation** | **邏輯 stack**（現在有哪些 Page、頂端是誰）＋ **怎麼過渡**（立刻換、從下彈上、返回滑出）。過渡期間可以同時掛兩頁 | 某一頁的標題與按鈕；怎麼開 Chrome 窗 |
| **頁面 Page** | 這一頁完整長什麼樣：頂欄標題、主內容、殼底按鈕、進入／離開時對 pending 做什麼 | 自己猜現在是 popup 還是 sidebar；自己做滑入動畫或卸載底層頁（需要時由宿主注入表面） |

宿主只做：**把已組裝好的 Page 顯示出來**。禁止在宿主裡拼 origin 一句、標題另接、按鈕從別頁借。

## Page 是什麼

一個 Page 是一份 **可 display 的完整畫面模組**，不是 `PopupMarkup` 裡一個 `currentView === "..."` 分支，也不是審批殼裡 `hidden` 切一塊 section。

每一個 Page 必須自足：

1. **id**（穩定英文，例如 `connect`、`sign-transaction`、`home`）
2. **標題**（走 catalog；這一頁自己的 key，不跟別頁共用）
3. **主內容**
4. **殼底主行動**（有則本頁提供；沒有則本頁明確「無 dock」）
5. **進入**：需要的 `requestId` 或其他參數
6. **離開**：pop 時要不要 `abort`／`reject` pending；回到哪一頁（由導航執行，Page 只聲明）

同一 Page 模組可掛在側欄或 popout。差別只在宿主：側欄 pop 回 Home；popout 關閉這扇窗。

## 導航

殼內是 **stack**，不是「一個叫 `dapp-approval` 的洞什麼都塞」。

基本網站請求（側欄）：

```text
[home]  --push connect-->  [home, connect]  --pop-->  [home]
[home]  --push sign-transaction-->  [home, sign-transaction]  --pop-->  [home]
```

多層錢包操作：

```text
[home] → [home, settings] → [home, settings, settings-rpc]  --pop-->  [home, settings]
```

規則：

- 使用者操作的永遠是 **stack 頂端** 那一個 Page（標題、底欄、焦點都跟它）。
- 網站請求在側欄：`push` 對應 Page，結束 `pop`。預設回到 push 前的頂端（通常是 Home）。
- 網站請求在 popup 模式：宿主改開審批 popout；popout 的 stack 通常只有那一個 Page。這不是另一套 Connect UI。

現有 `BACK_PARENT` 對照表是 stack 的雛形。重構後以真正的 stack 為準，不要為網站審批另開一條「特殊 view 名稱」。

## 邏輯 stack 與畫面過渡（現在立刻換，以後可從下彈）

**產品語意**是全頁 cover：新頁蓋住舊頁，不是半透明 modal。這不代表 DOM 永遠只能存在一頁。

分兩件事，導航擁有兩者，Page 不擁有：

| | 現況（本版預設） | 之後可加、架構要先留得住 |
|--|------------------|---------------------------|
| **邏輯** | `push`／`pop`，頂端是作用中 Page | 不變 |
| **畫面** | 只 **mount 頂端**，底下立刻卸載（原地 replace） | 過渡策略：立刻換、自下而上滑入蓋住、返回時頂頁滑走。動畫期間 **兩頁同時存在**；結束後底層可卸載，或留下掛著（sheet 式，pop 時不必重繪 Home） |

「從下彈出新頁」在動畫中必須看得到底下的 Home，所以 **不能** 用「`currentView === x` 只渲染一個小孩」當唯一真相。正確模型是：

```text
stack（邏輯，一直都在）     畫面槽（導航暫時掛上的 DOM）
[home, connect]            過渡中：home 槽 + connect 槽（connect 在上層）
                           結束後策略 A：只留 connect（home 卸載，pop 再 mount）
                           結束後策略 B：home 仍掛著但不可點，connect 蓋滿
```

本版實作仍可用策略 A 的 **結束態**（畫面上一次一頁），但 Page 模組必須滿足下面契約，之後換成彈出才不必拆 Page：

1. **Page 是可獨立 mount 的根**（自己的標題＋內文＋底欄包在自己的根節點）。禁止一頁用 `hideAll()` 把別頁的 DOM 藏掉。禁止一頁寫死「我就是整份 `#app` 唯一內容」。
2. **導航決定同時掛幾頁、誰在上層、過渡何時結束。** Connect 不知道自己是滑上來還是瞬間出現。
3. **離開／pending 跟邏輯 pop 走，不跟 CSS 動畫走。** 動畫還沒播完也可以已 `push`；使用者按批准成功後先 `pop` 邏輯，畫面再滑走。禁止 Page 在 `transitionend` 才 reject pending。
4. **底層 Page 若仍掛著：不可點、不搶焦點、不重跑進入時的副作用**（不要 Home 在底下又刷一次持倉只因為上面蓋了 Connect）。`push` 不是重新 `enter` 底下那頁。
5. 頂欄若屬於 **殼**（帳戶 pill 只在 Home），殼聽 stack 頂端決定畫哪一種頂欄。若頂欄屬於 **Page**（Connect 的 Back＋標題），跟該 Page 根一起滑。不要讓「彈出」變成第二套頂欄邏輯寫在宿主裡。
6. 仍禁止半蓋、禁止 Page 用 `position: fixed` 冒充整窗殼。從下彈出是 **導航對 Page 根做位移**，不是 Page 自己 `fixed` 蓋住 Home。

本版 **不做** 從下彈出的動畫。契約先把「stack 與 mount 分離」寫死，避免現在的原地 replace 把之後的過渡路封死。

## 本版要先切開的 Page（網站請求）

這些現在被揉進 `approval/shell.ts` + `dapp-approval` + 兩份 HTML。重構目標是 **一個 kind 一個 Page 模組**：

| Page id | 產品畫面 | 現況問題 |
|---------|----------|----------|
| `connect` | 網站要連線 | 沒有獨立模組；側欄標題誤用送出；按鈕不在這份 markup |
| `sign-message` | 網站要簽訊息 | 畫面在 sign 殼裡，還過得去；仍不是獨立 Page |
| `sign-transaction` | 網站要簽／簽並送交易 | 同上 |
| `unlock` | 錢包已鎖定（殼內或審批前） | 審批殼與錢包殼各有一份；本輪不強制合併，但禁止再為 connect 複製第三份 |

錢包既有畫面（Home、Settings、收回租金選取／確認、送出填寫）**已經比較像 Page**。本輪不要為了整齊把它們全部搬家。先把 **網站請求這三個 Page** 切出來，側欄才能 `push` 真的畫面而不是湊 DOM。

確認中／已確認是 **`sign-transaction`（或錢包送出 Page）的內部狀態**，不是第四個網站 Page。收回租金確認中維持收回租金自己的 Page 狀態。

## 宿主怎麼 display

| 宿主 | 打開時顯示 | 網站 `connect`／簽署 |
|------|------------|----------------------|
| 工具列 popup | `home` | 另開 popout，display 同一個 Page 模組 |
| 側欄 | `home` | `push` 同一個 Page 模組；結束 `pop` 回 Home |
| 審批 popout | 只有被請求的那一個 Page | 結束關窗 |

禁止：

- 新增 `dapp-approval` 這種「什麼網站請求都進這裡」的假 Page
- 在宿主頂欄寫死「確認送出」，再讓內層自己畫 connect
- Connect 專用一份殘缺 HTML、popout 另用一份完整 HTML

**一份 Page 模組、兩處宿主掛載。** Markup 與標題、底欄屬於該模組。

## 和現碼的對照（給實作，不是產品詞）

| 現碼 | 重構後 |
|------|--------|
| `View = "dapp-approval"` | 刪掉這個 view。改為 stack 上的 `connect`／`sign-message`／`sign-transaction` |
| `SUBPAGE_TITLE_KEYS["dapp-approval"] = nav.sendApproval` | 刪。各 Page 自帶標題 key |
| `DappApprovalHost` + `buildApprovalRootHtml` 的 connect 區塊 | `pages/connect`（名稱實作時定，寫進 HANDOFF） |
| `approval/shell.ts` 同時畫 connect／解鎖／簽訊息／簽交易／送出確認中 | 拆到對應 Page；共用的只留「讀 pending、批准／拒絕 command、解鎖閘門」這類 **不含畫面** 的 session 幫手 |
| `popout/index.html` 整頁審批 | Popout 宿主：mount 同一 Page 模組，不要第二套 connect 畫面 |

`approval/shell.ts` 超過 400 行且職責超過一件事。切開網站 Page 時必須拆；不要在原檔再加第三套 DOM。

## 本輪不做

- 不把所有 Settings／Accounts 再拆一次目錄
- 不改批准／廣播／pending 只活在 SW
- 不把網站請求塞進工具列 popup（window 模式仍 popout）
- 不為了模組化改視覺風格或新增半蓋 overlay
- 本版不做從下彈出等過渡動畫；但 Page 必須可被導航同時掛兩份（見上節），禁止寫成永遠只能單頁 replace
