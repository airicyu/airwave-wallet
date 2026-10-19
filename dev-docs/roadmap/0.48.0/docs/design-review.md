# Design review — 0.48.0 Airwave Wallet

- 日期：2026-10-19（Asia/Hong_Kong）
- 輪次：**第 3 輪複審**（第 2 輪與初審題旨保留於下）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[reasoning.md](./reasoning.md)、[how.md](./how.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`session.lock`、`openPopout`、`POPOUT_PAGE_PATH`、`wallet-shell` 的 `getContexts`、`popup/main.tsx`。本版程式尚未寫。
- **總評：** 無未關閉 HIGH。審查門檻通過，可以開工。提案可行。H3、M2、M3 已寫進 INDEX／HOW，關閉。

## Findings（第 3 輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH

#### H1 — service worker 啟動會把進行中的倒數整段重設 — **關閉**

同第 2 輪。INDEX Clock 與 HOW 步驟 4 仍保留已排程的預定時間。

#### H2 — 已開著的 surface 在 worker 重啟後仍會被當成無人使用 — **關閉**

同第 2 輪。INDEX「Surfaces across worker restarts」與 HOW 的 start／alarm 表面定義仍在。

#### H3 — 最後一個 surface 剛關上時，`getContexts` 仍會取消這一次排程 — **關閉**

INDEX Clock：最後一個 port 斷線且計數歸零的那一次 create 不看 `getContexts`；尚未離開清單的 context 就是剛關上的文件；其他仍開著的 port 仍 clear、不 create。INDEX Surfaces 末句：該次 create 不用這一列的 `getContexts`。HOW 步驟 6–7：`replaceScheduled` 為 true 時只看 port 計數，不查 `getContexts`；計數歸零才 create。HOW 末段與 reasoning 第 4 段同一句。與第 2 輪建議的那一句相同。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | 關閉 | 同第 2 輪。INDEX Clock 末句與 HOW「rejected minute patch」。 |
| M2 | 關閉 | INDEX Clock：service worker 啟動永不 create；已排程則留預定時間；沒有則不補。HOW 步驟 4–5：`replaceScheduled` 為 false 時，有舊 alarm 就 return，沒有也不 create。啟動呼叫傳 false。與第 2 輪「不在啟動補一段」那一側相同。 |
| M3 | 關閉 | INDEX Surfaces：`documentUrl` **includes** `src/popout/index.html`，並寫明可帶 `requestId` query。HOW Surfaces：用 `includes`，與 `POPOUT_PAGE_PATH` 相同，不要求 path 全字相等。 |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | 關閉 | 同第 2 輪。HOW Hand test 第 3 步。 |

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 新安裝與舊 settings 都沒有這兩鍵：開關關、分鐘 10，計時不跑 | 可測 | 無 |
| 打開開關後關上最後的 popup、side panel、popout，經過所存分鐘數鎖上；解鎖仍要密碼；vault blob 不變 | 人可做 | 無。H3 已關閉：最後一次斷線不因 `getContexts` 仍列出該文件而取消 create |
| 開關開且已解鎖時，開著的 popup 或 side panel（含 Settings）不開始計時；關上才開始完整倒數 | 人可做 | 無 |
| 倒數中打開 popup、side panel 或 sign popout 會清掉；關上最後一個 surface 再從完整分鐘數開始 | 人可做 | 無 |
| 看得到的 sign-transaction 或 sign-message（shell 或 popout）不讓計時跑 | 人可做 | 無。M3 已關閉：popout URL 用 `includes`，query 不會被漏掉 |
| 已經鎖上：不留 alarm | 可測 | 無 |
| 分鐘在 1–1440 外不改 storage；關掉開關會清掉正在跑的 alarm | 可測 | 無 |
| Idle 列有眼與筆；編輯只有確認與捨棄、沒有眼；確認仍寫入、捨棄仍不寫 | 可測 | 無 |
| `cd wallet && npm run typecheck` | 可跑 | 無 |
| 未封裝擴充：開關與分鐘、關 popup 後鎖一次、編輯一列 secret 時沒有眼 | 可做 | 無。手驗在 HOW |

## 與現碼抽樣

現碼未做本版，不因此升為設計 HIGH。抽樣只看與提案互斥的現行行為。

- `session.lock()` 只清記憶體解鎖材料與 `chrome.storage.session` 的 `SESSION_UNLOCKED`。提案走同一條 lock、不拒絕 pending，與現碼相容。
- `openPopout` 的網址是 `src/popout/index.html?requestId=…`，`chrome.windows.create({ type: "popup" })`。`isPopoutApprovalUrl` 已用 `includes(POPOUT_PAGE_PATH)`。HOW 的比對與這條現碼相同。
- `wallet-shell` 已用 `getContexts` 只看 `SIDE_PANEL`。本版另定 idle 的表面集合，不改那條側欄開關。
- Popup 入口目前沒有長連 port。提案新增 `airwave-idle-surface`，側欄保留 `airwave-sidebar-surface`。
- 0.47.1 是缺 chain 的 sign 路徑，已出貨。本版不改 pending 的存放與回傳。
- Backlog 的 idle lock、API key 列只作構想。本輪不以 backlog 尚未寫進 INDEX 的句子當已定案。

架構禁區：設定走既有 `wallet.patchSettings` 與 `chrome.storage`；倒數不寫入 storage；不硬編碼密碼；inject 不持有長期私鑰；簽名仍在擴充 UI。沒有為本版另開 rehydrate bus，也沒有宣告未實作的 Wallet Standard 方法。結果回傳仍只到發起的 tab／frame。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | 關閉 | INDEX Clock；HOW `syncIdleLockAlarm` 步驟 4；reasoning 第 4 段 |
| H2 | HIGH | 關閉 | INDEX「Surfaces across worker restarts」；HOW Surfaces、Alarm |
| H3 | HIGH | 關閉 | INDEX Clock 與 Surfaces 末句；HOW 步驟 6–7；reasoning 第 4 段 |
| M1 | MEDIUM | 關閉 | INDEX Clock 末句；HOW Alarm「rejected minute patch」 |
| M2 | MEDIUM | 關閉 | INDEX Clock「start never creates」；HOW 步驟 4–5 |
| M3 | MEDIUM | 關閉 | INDEX Surfaces 的 `includes`；HOW Surfaces 的 URL 比對 |
| L1 | LOW | 關閉 | HOW Hand test 第 3 步 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-19 | 有未關閉 H1、H2。門檻未過，不可開工。提案可行，先寫死時鐘不被 worker 喚醒重設，以及已開表面在重啟後仍算使用中。 |
| 第 2 輪 | 2026-10-19 | H1、H2、M1、L1 關閉。H3 仍開。門檻未過，不可開工。提案可行。 |
| 第 3 輪 | 2026-10-19 | H3、M2、M3 關閉。無未關閉 HIGH。門檻通過，可以開工。提案可行。 |

## Findings（第 2 輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH

#### H1 — service worker 啟動會把進行中的倒數整段重設 — **關閉**

INDEX Clock：已排程的 `airwave.idleLock` 在 service worker 啟動時保留預定時間，不再 create。HOW 步驟 3：`replaceScheduled` 為 false 且 `chrome.alarms.get` 已有此 alarm 則 return。啟動呼叫傳 false。reasoning 寫明喚醒不是新的一段閒置。與初審建議的那一句相同。

#### H2 — 已開著的 surface 在 worker 重啟後仍會被當成無人使用 — **關閉**

INDEX「Surfaces across worker restarts」：文件仍開就重連 `airwave-idle-surface`；開著的表面是 live port 或 `getContexts` 的 popup、side panel、`src/popout/index.html`；有任一則 clear、不 create；上鎖前做同一檢查。HOW Surfaces 與 Alarm 的「surface is open」、以及 alarm 步驟 1 呼叫 `syncIdleLockAlarm(false)`，與該列同一句。

#### H3 — 最後一個 surface 剛關上時，`getContexts` 仍會取消這一次排程 — **仍開**

INDEX Clock：最後一個 surface 關上且允許計時時要 create。INDEX Surfaces 同時寫：port **或** `getContexts` 有任一則 clear、不 create。HOW 把「最後一個 port 斷線且計數歸零」訂成 `syncIdleLockAlarm(true)`，但步驟 2 在 surface 仍算開著時 clear 並 return，不會走到步驟 4。

`chrome.runtime.getContexts` 是非同步的。popup、side panel 或 `chrome.windows.create({ type: "popup" })` 的 popout 在 `onDisconnect` 當下，context 可能還沒從清單消失。依現在的步驟，主路徑「關上最後一個表面就排一整段」會被同一次呼叫否決，而且沒有下一次 create：文件正在卸載，不會重連。驗收「關上後有新 alarm、經過所存分鐘數就鎖」在這條寫法下不可測。

這與 H2 要補的重啟空窗是兩件事。H2 要的是「還沒重連的開著文件算使用中」。H3 是「剛剛斷線的那一份文件不算仍開著」。

建議寫死同一句：最後一個 `airwave-idle-surface` 斷線且計數歸零時，這一次 create 不以 `getContexts` 仍列出剛剛斷線的那份文件而取消。其他仍開著的 popup、side panel、popout 仍 clear、不 create。service worker 啟動與 alarm 開火繼續用 port 或 `getContexts`：有任一開著的表面則不上鎖、不 create。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | 關閉 | INDEX Clock：被拒的分鐘 patch 不寫 storage、也不 clear 或替換 alarm。HOW：非法 `idleAutoLockMinutes` 不呼叫 `writeSettings`，也不呼叫 `syncIdleLockAlarm()`。關開關仍走 `syncIdleLockAlarm(false)` 清 alarm。 |
| M2 | 仍開，預設應修 | INDEX Clock 的 create 只有兩處：最後一個 surface 關上，或允許計時且沒有 surface 時分鐘寫入成功。HOW 步驟 3–4：`replaceScheduled` 為 false、沒有舊 alarm、步驟 2 也不成立時仍 create。service worker 啟動因此會在「開關開、已解鎖、零 surface、尚未排程」時新開一整段。這不會改掉已在跑的預定時間。擇一寫死：把這個啟動補進 INDEX 的 create 清單；或 `replaceScheduled === false` 且沒有舊 alarm 時也不 create。 |
| M3 | 仍開，預設應修 | 現碼 `openPopout` 的網址是 `src/popout/index.html?requestId=…`。`POPOUT_PAGE_PATH` 用 `includes`。HOW 寫 extension page 的 URL path **等於** `src/popout/index.html`。`documentUrl` 的 pathname 是 `/src/popout/index.html`，後面還有 query。全字相等會在 port 重連前漏掉已開的 sign popout。寫死沿用 `includes(POPOUT_PAGE_PATH)`（或 pathname 以該路徑結尾）。 |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | 關閉 | HOW Hand test 第 3 步：鎖上之後開關仍是開，解鎖後在分鐘結束前打開 popup 則保持未鎖。不再寫「再打開開關」。 |

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 新安裝與舊 settings 都沒有這兩鍵：開關關、分鐘 10，計時不跑 | 可測 | 無 |
| 打開開關後關上最後的 popup、side panel、popout，經過所存分鐘數鎖上；解鎖仍要密碼；vault blob 不變 | 人可做 | H3：斷線當下 `getContexts` 仍看得到該文件時，步驟 2 不 create |
| 開關開且已解鎖時，開著的 popup 或 side panel（含 Settings）不開始計時；關上才開始完整倒數 | 人可做 | 開著的半句已由 H2 關閉。關上的半句仍是 H3 |
| 倒數中打開 popup、side panel 或 sign popout 會清掉；關上最後一個 surface 再從完整分鐘數開始 | 人可做 | 打開會清，已寫死。再開始仍是 H3 |
| 看得到的 sign-transaction 或 sign-message（shell 或 popout）不讓計時跑 | 人可做 | port 已連上則可測。worker 剛起來、port 未重連時，M3 的全字相等可能漏掉帶 query 的 popout |
| 已經鎖上：不留 alarm | 可測 | 無。`session.lock()` 完成後 `syncIdleLockAlarm(false)` |
| 分鐘在 1–1440 外不改 storage；關掉開關會清掉正在跑的 alarm | 可測 | M1 已關閉。兩半與 INDEX、HOW 一致 |
| Idle 列有眼與筆；編輯只有確認與捨棄、沒有眼；確認仍寫入、捨棄仍不寫 | 可測 | 無 |
| `cd wallet && npm run typecheck` | 可跑 | 無 |
| 未封裝擴充：開關與分鐘、關 popup 後鎖一次、編輯一列 secret 時沒有眼 | 可做 | 手驗在 HOW。關 popup 後的那一次鎖受 H3 影響。L1 已關閉 |

## 與現碼抽樣

現碼未做本版，不因此升為設計 HIGH。抽樣只看與提案互斥的現行行為。

- `session.lock()` 只清記憶體解鎖材料與 `chrome.storage.session` 的 `SESSION_UNLOCKED`。提案走同一條 lock、不拒絕 pending，與現碼相容。
- `openPopout` 用 `chrome.windows.create({ type: "popup" })`，網址含 `?requestId=`。popout 不是 toolbar popup 文件。計數必須認這條 URL，而不能只認 context type `POPUP`。HOW 有 URL 條件；M3 是比對寫法，不是現碼互斥。
- `wallet-shell` 已用 `getContexts` 只看 `SIDE_PANEL`。本版另定 idle 的表面集合，不改那條側欄開關。
- Popup 入口目前沒有長連 port。提案新增 `airwave-idle-surface`，側欄保留 `airwave-sidebar-surface`。
- 0.47.1 是缺 chain 的 sign 路徑，已出貨。本版不改 pending 的存放與回傳。
- Backlog 的 idle lock、API key 列只作構想。本輪不以 backlog 尚未寫進 INDEX 的句子當已定案。

架構禁區：設定走既有 `wallet.patchSettings` 與 `chrome.storage`；倒數不寫入 storage；不硬編碼密碼；inject 不持有長期私鑰；簽名仍在擴充 UI。沒有為本版另開 rehydrate bus，也沒有宣告未實作的 Wallet Standard 方法。結果回傳仍只到發起的 tab／frame。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | 關閉 | INDEX Clock；HOW `syncIdleLockAlarm` 步驟 3；reasoning 第 4 段 |
| H2 | HIGH | 關閉 | INDEX「Surfaces across worker restarts」；HOW Surfaces、Alarm |
| H3 | HIGH | 仍開 | 待寫入 INDEX Clock／Surfaces 與 HOW 步驟 2：最後一次斷線不得被剛關上的 context 否決 |
| M1 | MEDIUM | 關閉 | INDEX Clock 末句；HOW Alarm「rejected minute patch」 |
| M2 | MEDIUM | 仍開 | 待讓 INDEX「只在兩處 create」與 HOW 步驟 4 同一句 |
| M3 | MEDIUM | 仍開 | 待寫入 HOW 的 popout URL 比對（含 query） |
| L1 | LOW | 關閉 | HOW Hand test 第 3 步 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-19 | 有未關閉 H1、H2。門檻未過，不可開工。提案可行，先寫死時鐘不被 worker 喚醒重設，以及已開表面在重啟後仍算使用中。 |
| 第 2 輪 | 2026-10-19 | H1、H2、M1、L1 關閉。H3 仍開。門檻未過，不可開工。提案可行。 |

## Findings（初審）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH

#### H1 — service worker 啟動會把進行中的倒數整段重設 — **仍開**

INDEX 已定案：倒數是「最後一個 wallet surface 關上之後的完整分鐘數」；經過的時間不寫進 storage；`chrome.alarms.create` 同名會換掉舊 alarm，只用於「分鐘設定變更且當時已有 alarm」。reasoning 也寫明 worker 會停、alarm 要在 worker 停掉之後仍然在。

`how.md` 的 `syncIdleLockAlarm()` 在允許計時時一律 `chrome.alarms.create`，並且在 service worker 啟動（session hydrate 之後）必呼叫。Chrome 對同名 alarm 的 create 會清掉舊的預定時間，改成從這一刻起再等一整段 `delayInMinutes`。

因此只要倒數途中 worker 因其他事件醒來（dApp 訊息、storage、另一個 alarm），倒數就從頭開始。驗收「關上最後一個 surface 之後，經過所存分鐘數就鎖」在 MV3 的正常生命週期裡不可測、也做不到。這與已定案的 Clock／Reset 不可並存。

建議在已定案與 HOW 寫死同一句：service worker 啟動時，若 `airwave.idleLock` 已存在，保留它的預定時間，不要 create。只有「最後一個 surface 關上且允許計時」或「允許計時中、分鐘設定已成功寫入」才 create 新的一整段。

#### H2 — 已開著的 surface 在 worker 重啟後仍會被當成無人使用 — **仍開**

INDEX：計時只在開關開、已解鎖、且零個 wallet surface 時建立；任一 popup、side panel 或 popout 開著就不計時。`getContexts` 是上鎖前的第二道檢查。Port 用來在打開時清 alarm、在最後一個斷線時排程。

`how.md` 只要求三個文件在載入時各 connect 一次 `airwave-idle-surface`，沒有寫文件還開著、port 因 worker 停止而斷線時要重連。`syncIdleLockAlarm()` 的三步只看記憶體裡的 port 數，不看 `getContexts`。Worker 一啟動，port 數是 0，就會在 popup 或 side panel 仍開著時 create alarm。

`onAlarm` 雖說表面開著就不鎖，接著仍呼叫 `syncIdleLockAlarm()`。那時 port 數仍是 0，步驟 3 會再排一段。HOW 後句希望「開著的 surface 維持清除」，編號步驟做不到。

後果：表面開著時 alarm 仍在跑（違反「開著就不開始計時」）；使用者關上表面時沒有新的 disconnect，不會從關上那一刻重排完整分鐘數（違反 Reset 與驗收「關上後重新完整倒數」）。`getContexts` 只擋誤鎖，補不回「從關上起算」。

建議寫死：`syncIdleLockAlarm()` 與 alarm handler 把 `chrome.runtime.getContexts` 所見的 popup、side panel、以及 `wallet/src/popout/index.html` 與 port 數同等看待，有任一則 clear、不 create。三個表面文件在 port 斷線且文件仍在時重新 connect `airwave-idle-surface`。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | 仍開，預設應修 | INDEX Clock：分鐘 patch 被拒時清掉 alarm。HOW：非法 `idleAutoLockMinutes` 不呼叫 `writeSettings`，而 `syncIdleLockAlarm()` 只在寫入成功後跑，因此拒絕不會清 alarm。Settings 開著時 alarm 通常已經清掉，手驗主路徑仍可能過，但兩份契約相反。擇一寫死：拒絕的 patch 不改 storage、也不動已排程的 alarm；或拒絕時仍 clear。 |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | 非阻擋 | HOW 手驗第 3 步寫「再打開開關」。Track 1 檢查寫鎖上後設定裡的開關仍是開。手驗改成「開關仍為開，無需再撥」即可，避免測成把開關撥掉又撥回。 |

## 驗收對照（初審，當時的缺口）

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 新安裝與舊 settings 都沒有這兩鍵：開關關、分鐘 10，計時不跑 | 可測 | 無。讀取缺鍵與非法舊值回預設，與 patch 拒絕分開寫了 |
| 打開開關後關上最後的 popup、side panel、popout，經過所存分鐘數鎖上；解鎖仍要密碼；vault blob 不變 | 人可做 | H1：worker 中途醒來會把這段時間重設，鎖上時刻不是「關上後的所存分鐘數」 |
| 開關開且已解鎖時，開著的 popup 或 side panel（含 Settings）不開始計時；關上才開始完整倒數 | 人可做 | H2：worker 重啟後 port 數為 0 仍會排程 |
| 倒數中打開 popup、side panel 或 sign popout 會清掉；關上最後一個 surface 再從完整分鐘數開始 | 人可做 | H2：重啟後沒有 disconnect，關上不會重排 |
| 看得到的 sign-transaction 或 sign-message（shell 或 popout）不讓計時跑 | 人可做 | 與 H2 同一缺口；popout 文件路徑 `wallet/src/popout/index.html` 與現碼一致 |
| 已經鎖上：不留 alarm | 可測 | 與現碼 `session.lock()` 只清記憶體與 `SESSION_UNLOCKED` 相容；HOW 在 lock 完成後 sync |
| 分鐘在 1–1440 外不改 storage；關掉開關會清掉正在跑的 alarm | 可測 | M1：拒絕 patch 是否清 alarm，INDEX 與 HOW 不一致。關開關會清，這半句一致 |
| Idle 列有眼與筆；編輯只有確認與捨棄、沒有眼；確認仍寫入、捨棄仍不寫 | 可測 | 無。`loading` 三個都沒有，與 0.46.0 確認鍵缺席一致 |
| `cd wallet && npm run typecheck` | 可跑 | 無 |
| 未封裝擴充：開關與分鐘、關 popup 後鎖一次、編輯一列 secret 時沒有眼 | 可做 | 手驗在 HOW，步驟受 H1、H2 影響；L1 措辭 |

## 與現碼抽樣（初審）

現碼未做本版，不因此升為設計 HIGH。抽樣只看與提案互斥的現行行為。

- `session.lock()` 只丟掉記憶體中的解鎖材料並移除 `SESSION_UNLOCKED`，不拒絕 pending。提案「idle lock 呼叫同一條 lock、不另開鎖路、不拒絕 pending」與現碼相容。
- `normalizeSettings` 對未知鍵沒有保留通道；本版要在這裡補缺鍵預設，不是衝突。
- `toPublicSettings` 用剩餘欄位展開，新欄位會進入 `PublicSettings`，與 HOW「不要 omit」一致。兩欄不是 vault secret。
- `SecretKeyField` 在 `editing` 仍渲染眼，眼會把草稿打回遮罩與唯讀。這是本版要改的行為，不是與提案互斥的另一條產品規則。
- Side panel 已有 `airwave-sidebar-surface`，斷線會拒絕側欄上的簽章 pending。提案另開 `airwave-idle-surface`、不重用該斷線，與 0.39.0 路徑並行，不取代。
- Popup 入口目前沒有長連 port。提案新增 port，不是改寫既有 popup 生命週期的衝突。
- Backlog 的 idle lock、API key 列只作構想。本輪不以 backlog 裡尚未寫進 INDEX 的句子當已定案。

架構禁區：設定走既有 `wallet.patchSettings` 與 `chrome.storage`；倒數不寫入 storage；不硬編碼密碼；不碰 pending 的存放與回傳。沒有為本版另開 rehydrate bus，也沒有宣告未實作的 Wallet Standard 方法。

## 修復追蹤表（初審當時）

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | 仍開 | 待寫入 INDEX Clock 與 HOW `syncIdleLockAlarm` 的呼叫時機 |
| H2 | HIGH | 仍開 | 待寫入 INDEX Surfaces／Clock 與 HOW Surfaces、Alarm |
| M1 | MEDIUM | 仍開 | 待讓 INDEX「patch 被拒」與 HOW 拒絕路徑同一句 |
| L1 | LOW | 非阻擋 | HOW Hand test 第 3 步 |
