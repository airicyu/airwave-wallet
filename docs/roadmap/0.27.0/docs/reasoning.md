# 0.27.0 — 為何這樣定

← [INDEX](../INDEX.md)

## 為何不解 SW 重啟就上鎖

審查要擋的是 content script 讀 `chrome.storage.session`。MV3 service worker 空閒幾十秒就會被關掉。若重啟就清鑰匙，使用者幾乎每次打開 popup 都要重打密碼，日常簽不了名。

啟動時仍呼叫 `setAccessLevel("TRUSTED_CONTEXTS")`，把「session 不給 content script」寫成明示，不依賴平台預設有沒有已經如此。失敗不擋命令。真正要做的第二層是 session 不放帳戶 secret：重啟時 SW 用 key 解 vault，明文只在記憶體。Popup 仍是信任頁，它本來就能請 SW 簽名；本版不假裝擋得住擴充頁自己的 XSS。

閒置上鎖是另一個產品（多久、鎖定時 pending 算不算拒絕）。本版不做，避免和「重啟仍保持解鎖」打架。

## 為何簽名仍可改 CU，但不能用 RPC 重編

0.11.0 已讓使用者改 limit／price，並規定 v0 lookup **原樣**、phase 1 探針不寫 `workingTx`。現碼的 `writeCuToTransactionBytes` 用 `decompileTransactionMessageFetchingLookupTables` 再 compile。lookup table 的帳戶來自 RPC。惡意或被改過的 RPC 可以換掉帳戶，而核准簽的是這份 `workingTx`。

本地只改 disc 2／3 能滿足 0.11.0 的費用卡，又讓待簽 bytes 不依賴 RPC 帳戶資料。估 CU 的 factory 仍可打 RPC，因為那份結果不進 `workingTx`。

模擬 `fail`／`rpc` 仍可核准：0.10.0 對 durable nonce 使用 `replaceRecentBlockhash`，差額可能本來就失敗。禁用核准會把那種合法交易擋死。提醒文案留在 backlog，不塞進本版。

## 為何 origin 以 tab URL 為準，還要再查一次

content script 今天用 `location.origin`，頁面改不了那個欄位。契約仍不採用訊息裡的 origin：擴充頁或以後的 content script 只要能組 `dapp.*`，就能帶一個已信任的 origin 去靜默連線。核准後分頁可以導走；畫面仍寫舊 origin，`tabs.sendMessage` 會把簽章交給新文件。所以完成前再 `tabs.get`。

`frameId` 用 sender 的，不用頁面填的。`all_frames` 維持預設 false，本版不擴大注入。

## 為何 signTransaction 缺 chain 就拒絕

`signAndSend` 已對 chain。只簽不送的路徑沒有對，模擬卻打錢包目前的 RPC。錢包在 devnet 時仍可簽出 mainnet 交易，網站自己廣播。Wallet Standard 把 `chain` 訂成可選；本版在邊界上改成必填，`test-web` 跟著帶 `solana:devnet`。不拿頁面上的 `account.chains` 填，那個物件是頁面給的。

`signMessage` 沒有 chain 欄，本版不加，避免把「簽一段 bytes」說成某條鏈。

## 為何簽名要先連線，而且切換帳戶要改 connection

未連線就能彈簽名，每個網站都能叫出核准窗。連線紀錄的 `accountId` 必須等於這次 active id，否則紀錄寫著帳戶 A、實際簽帳戶 B。

0.5.0 規定 `setActiveAccount` 不改 `connections.accountId`。若本版只加相等檢查、不改寫紀錄，使用者一切換錢包，已連線的站會全部 `NOT_CONNECTED`。所以本版明文推翻那句：切換時把每筆 connection 的 `accountId` 改成新 active id，與已經廣播的公鑰一致。不刪 origin。切聚合目前錢包、刪帳戶的通知範圍仍看**改綁之後**的 `accountId`。

## 為何 signMessage 的檢查失敗即拒絕

舊檢查要 decode 再 encode，長度一樣才算交易。decode 成功但長度不同時改放行。Solana 的交易簽章就是對 compiled message 做 detached sign。decode 成功就拒絕，誤殺的是「長得像交易」的 bytes，不是一般 UTF-8 登入句。

## 為何 KDF 不升 schema 世代

迭代次數已經寫在 vault blob 的 `kdfParams.iterations`。現碼解密卻忽略它、永遠用常數。把常數直接改成 600000 會讓舊 vault 解不開。

解密改讀 blob。只允許 310000 與 600000，避免有人把 local storage 裡的 iterations 改成極大值卡住解鎖，或改成 1 再配上被換過的密文。新加密寫 600000。升級發生在下一成功次解鎖，失敗不覆蓋舊 blob，與 [storage-migration](../../backlog/storage-migration.md) 第 4、5 點相同。鍵名與 `schemaGeneration` 不動，所以那份 backlog 仍未出貨。

## 為何第三方 key 只從 getState 拿掉

`chrome.storage.local` 沒有 `TRUSTED_CONTEXTS`。content script 仍可直接讀設定鍵。把 key 放進 vault 會讓鎖定時設定頁與持倉補資料都要先解鎖，超出本版。

`getState` 會進 popup 狀態。拿掉兩欄，減少平常畫面記憶體裡的 key。設定頁改走專用命令。SW 內部仍從 `readSettings()` 讀明文，持倉與 activity 不用先繞一圈命令。
