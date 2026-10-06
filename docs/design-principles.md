# Airwave — Popup UI／UX 原則

給做 **popup／popout 畫面** 的 agent 與人。視覺概念稿見 [`design-demos/`](design-demos/)（非正式契約；衝突時以某版 **INDEX／HOW** 為準，INDEX 沉默時以**本檔**為準）。

架構禁區（pending、custody、訊息）仍只看 [`roadmap/GUIDELINES.md`](roadmap/GUIDELINES.md)。本檔不管鏈上語意，只管 **怎麼操作、何時寫入、按鈕長什麼樣子**。

**視覺改版流程：** 先在 [`design-demos/`](design-demos/) 寫可直接開啟的 HTML 概念稿（popup 寬高、現有 CSS 變數），給使用者看完並同意後，才改 `wallet/` 產品 CSS／markup。禁止先改產品再補 demo。小修（對齊、sticky 失效、漏 `min-height: 0`）不必走 demo。

---

## 1. 表面與密度

- 主表面是 Chrome **popup**：寬約 **384px**、高約 **600–640px**。所有列、按鈕、輸入必須在此寬度內可掃、可點，**禁止**為了完整字串把列折成兩行當主顯示。
- 一屏只做一件事。第一層是 **選項列表**（Accounts 的 Add、Settings 的分區）；選了再進 **操作頁或展開列**。禁止把產生／匯入／觀察／Combined 的表單全攤在同一頁。
- 頂欄沿用方案 A：Home 為 widget；子頁為 **Back + 標題 + Menu**。Bottom Token／Activity **只**在 Home。
- 色票與圓角對齊 [`design-demos/wallet-030-ui-concepts.html`](design-demos/wallet-030-ui-concepts.html) 的 CSS 變數（`--bg`、`--fill`、`--accent` 等）。不要另開一套高對比主題。
- **頁殼（popup 與 popout 每一個有頂欄／殼底主行動的新 SCREEN 都要過這關，不是某一版特例）：**
  1. 整窗 **直欄 flex**，`html`／`body`／頁根 **高度 100%、`overflow: hidden`**。禁止整份文件跟著內容長高、讓視窗捲軸捲走頂欄與底欄。
  2. **頂欄**（帳戶 widget 或 Back＋標題＋Menu）：`flex-shrink: 0`，永遠釘在視窗頂。
  3. **中間內容：** `flex: 1; min-height: 0; overflow: auto`。**漏寫 `min-height: 0` 會讓頂欄／底欄被整頁捲走。這是已知反覆錯誤，開新畫面第一件事核對。**
  4. **殼底主行動**（拒絕／批准、匯入、產生、建立）：`flex-shrink: 0` 釘在視窗底。主按鈕在這列，**不**進內容捲動。
  5. **禁止**用 `position: fixed`／`absolute`／`sticky` 冒充頁殼。沒有頁級主行動的選項列表不畫底列。
- **鎖定／解鎖全屏：** 無頂欄、無殼底 dock。垂直置中：鎖徽章（`--accent` 描邊圖示、`--bg-elevated` 圓角方塊）＋置中標題 Airwave＋「錢包已鎖定」＋全寬密碼欄＋內容區「解鎖」。背景為中檔 Solana 北極光（左下 `#9945FF` 11%、右上 `#14F195` 8%、中下 `#5B8CFF` 7% 光斑），**不要**正中 `--accent` 光。欄位 `--fill` 底、focus `--accent` 邊框且 `outline: none`。主按鈕 `flex: none; width: 100%`，禁止沿用殼底批准的 `flex: 1`。錢包密碼用類 B 遮罩（`type="text"` + `-webkit-text-security`）。popup／popout／審批鎖定同一套。概念稿：[`design-demos/unlock-aurora-ux.html`](design-demos/unlock-aurora-ux.html)「中檔」。
- **錢包送出確認中／已確認：** **禁止**帶邊框大卡、也**不要**解鎖頁那種 radial 漸變底。確認中：置中 112px Solana 經典色 dash-ring（頭 `#14F195`、中 `#5B8CFF`、尾 `#9945FF`），dash 從 0 伸長再被 offset 抽走、重來（旋轉 4s、伸縮 2.4s）；標題「確認中」、說明「等待鏈上確認」。已確認：同一位置換成 `--ok` 勾＋「已確認」＋可選簽名前 4…後 4，**停留 1s** 再 auto-exit。語意仍是同一畫面轉換。概念稿：[`design-demos/send-status-spinner-ux.html`](design-demos/send-status-spinner-ux.html) 右側。

---

## 2. 寫入時機（整產品預設）

**預設自動保存。禁止同一頁混用「有的立刻存、有的要按大 Save」。**

| 動作 | 何時寫入 `chrome.storage`／生效 |
|------|--------------------------------|
| 切換（cluster、作用中 RPC、開關、radio、分段控制） | **立刻** |
| 新增／刪除清單項（RPC、成員勾選若定為即時等） | **立刻** |
| 單行文字設定（Helius URL、Jupiter key、RPC 自訂 URL） | **失焦**或短 debounce（約 400–800ms）寫入；正在打字不算完成 |
| 展開列裡改長字串 | 列內 **確認圖示**＝提交這一格；收合／Esc＝放棄未提交的編輯。這不是「整頁儲存」 |
| 不可逆、高代價（刪帳戶、Reveal 解密、斷開全部站點） | **必須**明確確認（對話或二次點擊），禁止靜默 auto-save 當成刪除 |

底部不要放「儲存設定」來涵蓋整頁。若舊畫面有整頁 Save，新做或重做該頁時拿掉，改走本表。

互動本身就是儲存。不要在畫面上寫「改了就會存」。

---

## 3. 按鈕：圖示為主

**工具列、列尾、重複性動作 → icon button + `title` + `aria-label`（同一句）。**  
不要用「加入」「刪除」「重新整理」這類佔寬文字當列內主按鈕。

適用：加入項目、刪除列、複製、重新整理、返回、選單、鎖定、展開／收合。

**文字按鈕只留給：**

- 頁級 **主行動**（建立 Combined、產生簽名帳戶、匯入、解鎖）
- 破壞性確認（Remove wallet account）
- 沒有公認圖示、或圖示會造成誤解的動作

同一頁不要又有文字「加入」又有加號圖示做同一件事。

Icon 用現有 stroke SVG 風格（約 16–18px、2px stroke），按鈕熱區約 **28–34px**。Tooltip 用繁中短語（「加入」「刪除」「複製」）。

---

## 4. 長字串（URL、公鑰、mint）

- **列表／摘要永遠單行**：`nowrap` + `ellipsis`。禁止 URL 把 radio 擠到上一行、自己掉到下一行（常見原因：全域 `input { width:100% }` 套到 radio——列內 radio 必須是固定寬、不可 `display:block; width:100%`）。
- **要看全文或編輯：點該列（或 URL 文字）展開**。內建／不可改的值展開後唯讀；自訂值展開後可編輯，確認圖示提交，垃圾桶刪（若允許刪）。
- 公鑰縮寫展示用 **前 4…後 4**；複製永遠是 **完整** 字串。
- 不要用 hover-only tooltip 當讀取全文的主路徑（popup 不一定有穩定 hover）。`title` 只是輔助。

---

## 5. 選擇與狀態

- **互斥選擇**用 radio 或整列可點的單選列（例如 Settings「網路」兩列）。**不要**用分段 tab 來表示「目前是 Devnet 還是 Mainnet」——那看起來像在切另一份清單，不是在選作用中網路。
- **作用中狀態**（目前網路、目前 RPC、目前帳戶）放在區塊最上方，用短標籤 + 單行值，不要只靠列表裡哪顆 radio 被勾。
- 編輯「另一個情境的清單」（例如活網路是 mainnet、卻在編 devnet RPC 列表）必須有 **一句狀態提示**，避免改錯對象。
- 切換活情境時，可見清單應對齊活情境，或清楚標成「僅編輯、非目前使用」。

---

## 6. 文案：少說話

- UI 用 **繁體中文**；專有名詞可英文（RPC、Helius、Jupiter、Combined、devnet）。
- **禁止把操作說明寫進畫面。** 能靠版面、狀態、placeholder、icon tooltip 表達的，不要再加一句「互不共用」「失焦即儲存」「點選即生效」。那是設計原則給實作者看的，不是給使用者看的。
- 欄位只要 **標籤 + 輸入**；placeholder 最多幾個字（「留空＝不用」）。欄位下方不要再跟一段 hint。
- 區塊標題只要名詞（「RPC」「Helius」），不要括號裡的教學（「選填」「清單互不共用」）。
- 錯誤才用短句；空狀態才解釋下一步。平時畫面保持安靜。

---

## 7. 確認與危險

- 刪帳戶、Reveal、斷開全部：確認後才打 command。
- 刪自訂 RPC、從 combined 移除非最後一個成員：可立刻生效，但必須是 **明確點擊刪除圖示**，不可滑過或誤觸 radio。
- 最後一個 combined 成員不可刪（既有錯誤碼）；UI 應 disable 或點了給錯誤，列表不變。

---

## 8. 對照例子（Settings）

Settings **第一層是選項列表**，再進子頁。不要一打開就把 Helius URL／Jupiter key 攤在主頁（錄影／demo 會露出秘密）。概念稿：[`design-demos/settings-hub-ux.html`](design-demos/settings-hub-ux.html)。

列表意向（繁中短標）：網路、RPC、API keys、錢包密碼。列上可寫狀態摘要（Mainnet、已設定／未設定），**不**寫出 key 或含 `api-key` 的 URL。

- **網路：** 兩列單選（Devnet、Mainnet），圓點表示目前；立刻寫入。**不要**用分段 tab／seg 來選 cluster。
- **RPC：** 同一頁兩張卡（Devnet、Mainnet）各自編清單；radio + ellipsis URL。目前 cluster 的卡標「目前」。選／加／刪立刻寫入。
- **API keys：** 標籤寫 **Helius API URL**、**Jupiter API key**。皆 `type="text"`，**不要** `type="password"`。有值時兩欄都顯示 `••••••`（不要「已設定」、不要露出後 4 或 `?api-key=`）。Reveal 才給全文（單行 ellipsis），**不要**再要錢包密碼。空值＝可貼上後確認圖示提交該列；清除圖示立刻寫成空。失焦或確認才寫入，禁止整頁 Save。
- **錢包密碼：** 獨立子頁，殼底主按鈕；遮罩規則見 [`research/secret-field-autofill.md`](research/secret-field-autofill.md) 類 B 與 [`design-demos/change-wallet-password-ux.html`](design-demos/change-wallet-password-ux.html)。

舊稿 [`design-demos/settings-rpc-ux.html`](design-demos/settings-rpc-ux.html) 只保留 RPC 列互動細節；樞紐結構以 hub 稿為準。

Add account：第一層四個選項；各自進操作頁。Back 回選項列表。這與第 1 節相同。

---

## 9. 秘密輸入

助記詞與私鑰欄位不要被瀏覽器或密碼管理器當成可記住的登入資料。原因、現有屬性與做不到的部分見 [`research/secret-field-autofill.md`](research/secret-field-autofill.md)。

- 這類欄位維持一般文字輸入，套上該筆記裡的 harden；離開頁面就清空。
- 不要改成 `type="password"` 來藏助記詞或私鑰。
- 錢包密碼欄位才用 `type="password"`。
- 文件、測試、截圖不寫真實助記詞、私鑰或密碼。

## 10. 不要做

- 為了塞資料把 popup 做成寬桌面後台。
- 把頁級主按鈕做成 floating／sticky overlay，或放進可捲動內容末尾（長表單時按鈕被捲走或蓋住上層）。
- 新 SCREEN 讓頂欄或拒絕／批准跟著中間內容一起捲（內容區漏 `min-height: 0` 或讓 `html`／`body` 長高）。
- 同一設定既 auto-save 又要求 Save 才算數。
- 用文字按鈕堆列尾。
- 用說明文字教使用者「這頁怎麼存、清單怎麼分」。
- 在設計原則或 roadmap 寫真實 API key、助記詞、個人 gateway。

---

## 與版本契約

新畫面或重做舊畫面時：先讀該版 INDEX／HOW；再讀本檔補 INDEX 沒寫的互動。若 INDEX 明文要求整頁 Save 或文字按鈕，以 **INDEX** 為準，並在該版 reasoning 註明對本檔的例外。
