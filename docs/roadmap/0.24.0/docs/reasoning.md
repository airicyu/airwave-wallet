# WHY — 0.24.0

## 為什麼這次走版本契約

分檔規則（100 words、400 行、150 行）若只留在對話，下一個 agent 不會在新檔寫註解，也不會知道 150 行不能再套一層資料夾。0.14.0 已證明「行為不變的搬家」需要寫明哪些 export 名與命令字串不能變，否則實作會順手改語意。

## 為什麼不是一命令一檔

帳戶命令會一起改的是同一塊：助記詞的產生、預覽、匯入共用推導；密鑰的產生、匯入、匯出共用位元組；改名、切換、刪除、觀察帳戶只動帳戶紀錄。拆成十個檔會讓這三塊的共同前置（標籤驗證、vault 寫入）散落。資料夾是邊界，檔是內聚模組。

150 行只決定 `wallet/` 這一層要不要進 `commands/<組>/`。若在資料夾內再依 150 行套資料夾，`seed-accounts.ts` 這種單一職責模組會被切碎。所以 150 不遞迴，400 行才是下一道 review。

「禁止一命令一檔」指的是不要把會一起改的同一職責按命令名切開。建立聚合與增刪成員是兩件職責，所以 `create-combined.ts` 可以只有 `handleCreateCombinedAccount`。

`commands/` 本身是資料夾，必須有 `index.ts`。否則 `wallet/index.ts` 會直接 import `connection-commands.ts`，違反 0.14.0「資料夾之間只 import `index.ts`」。

## 為什麼 unlock 跟改密碼放一起

`handleGetState` 與 `handleLock` 不碰密碼。`handleUnlock`、`handleCreateVault`、`handleChangeVaultPassword` 都會解密或加密 vault。把 unlock 跟 lock 放同一檔，那個檔的註解必須同時寫「讀狀態」和「用密碼解密」，已經是兩件事。

## 為什麼模擬不開子資料夾

`simulate/` 已經是功能邊界，裡面還有 CU 改寫與靜態指令解讀。`simulate-pending-tx.ts` 過長，是因為金鑰展開、RPC、差額三件事堆在一檔，不是因為資料夾錯了。再開 `pending/` 會讓 `sign-tx-simulate.ts` 跨層去接同一條管線。

## 為什麼刪掉 close-empty-service

`close-empty/` 裡的 scan、cache、plan-store、組交易已經拆出。service 檔仍同時擁有列出、計畫、送出，所以資料夾看起來拆過，職責沒有切開。共用狀態已在 `plan-store` 與 `closable-cache`，三步不需要再留一個總檔來互相呼叫。

## 為什麼不在本版拆審批殼、CSS、字串表、持倉

那些檔也超過 400 行，但本版的產品句是把已經講定的三處切開，並把規則寫進 `AGENTS.md`。一併拆審批殼會改 DOM 組裝，拆 CSS 會改層疊順序，都不是「行為不變」能靠 typecheck 守住的範圍。`ui-messages.ts` 是產生器寫出的單張表，拆檔不增加職責；本版連產生器都不跑，避免字串表被重寫。

沒改到的檔不批量補註解：幾百個只加註解的 diff 會蓋過真正的分檔，也沒有在「改檔時重寫註解」這件事上施力。規則改為下次碰到該檔就必須補。
