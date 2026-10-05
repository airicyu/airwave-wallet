# WHY — 0.13.0

## 宿主依發起方分流

網站請求常在使用者沒開錢包殼時進來，popup mode 必須能獨立開 popout。錢包內操作時人已在殼裡，再開第二窗打断、也難做一般化（send／swap／回收租金）。矩陣分開「誰發起」與「殼是哪一種」。

## 本版只做 popup 側

Sidebar 殼尚未出貨。先落地共用審批殼＋`walletSend` 進 popup，sidebar 列寫進契約，避免 0.13.0 膨脹成 Side Panel 專案。

## 共用模組而非複製頁

長期會有多個錢包內 operation。複製審批頁會讓模擬／費用卡／明細分叉。抽一模組、宿主只負責開／關／導航，之後只加 enqueue 與 `uiHost`。

## 等 confirm 只在錢包 submit

dApp `signTransaction` 只把已簽交易交回，鏈上是否送出由 dApp 決定；錢包不該空等 confirmed。`walletSend`（與日後同類）由錢包廣播，才進 pending confirm 全頁轉圈，再同一畫面變成 confirmed 後離開。

## Confirmed 與 0.5s

等待必須是獨立全頁，不能長在批准鈕上。成功回饋是同一張卡從轉圈變成「已確認」（勾），0.5s 才 exit——人已經在這頁等過，半秒不會再像另開一頁閃走。**0.5s 只在 UI confirmed 態**；SW 在鏈上 confirmed 後立刻 `settled`，不再自己 sleep，避免與 UI 雙延遲或搶關窗。

## Popup 關閉／離開審批＝拒絕

Chrome popup 失焦即關。若不把關閉當拒絕，pending 會掛在 SW 直到逾時，使用者以為已取消。與關 popout 語意對齊；已廣播則「已送出、確認未知」。

## 已開 popup 仍開 popout（網站）

避免「有時殼內、有時 popout」的雙路徑。popup mode 網站請求規則單一：永遠 popout。
