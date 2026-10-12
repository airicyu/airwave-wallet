# 0.37.0 — 為何這樣定

## 待批

頁面自帶 `requestId`，批准窗核准時只把 id 送回 service worker。若同一個 id 可以覆寫 map，使用者看到的第一筆和按下時簽的 payload 可以不是同一份。

否決「改由 service worker 發 id」：頁面仍要用自己的 id 對上橋接結果；本版只要在途的那筆不能被換掉。另一個 id 本來就是另一筆請求。

否決「覆寫時讓舊 popout 重繪」：舊窗的批准鍵仍只帶 id，重繪慢一拍就還是簽到新內容。拒絕第二次寫入才讓畫面上的那筆保持是 map 裡的那筆。

側欄改 popout 會對同一個 id 再呼叫一次寫入。那次只准改 `uiHost`，否則安全修復會拆掉既有的側欄後備。

## 連線分頁

`connections` 以 origin 為鍵。`tabIds` 是「這個分頁現在還開著該 origin」的清單，不是永久授權的分頁編號。分頁導去別的網站後，編號還在舊 origin 上，帳戶變更會由 content script 轉給新頁面。

否決「連帶刪掉 origin」：那會把已信任的網站打回未連線，下次要再審批。本版只拿掉分頁編號。

否決「對新頁面送斷線」：斷線訊息帶舊 origin，新網站會得知先前的連線。離開後靜默拿掉 tabId。

否決「網址未知或 `about:` 就拿掉」：導頁過程會短暫沒有最終 http(s) 網址。那時拿掉會讓同 origin 重新載入收不到帳戶變更，直到網站再 connect。`tabOriginStill` 把 `about:`、讀不到的網址、別的 origin、離開網頁都收成 `"changed"`，所以不能拿「不是 ok」來刪 tabId。送出前改看 `classifyTabUrl`：`unknown` 不送也不刪；`left-web` 或另一個 http(s) origin 才刪。

否決「各處各自 read-modify-write」：兩次導頁或帳戶通知重疊時，後寫入的舊快照會把已剪掉的 tabId 寫回去。同一條 Promise 鏈讓後一步讀到前一步寫完的 map。切換帳戶與刪帳戶也在這條鏈上。已經占住鏈的步驟若再 await 鏈的下一個名額，斷線與帳戶對齊會等自己結束，所以內部通知要在同一步做完。

id 上限 80 字元，是避免頁面用超長字串當 map key。不是密碼學長度。不是字串與空字串同一類，都不插入。
