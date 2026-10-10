# Reasoning — 0.29.0

## 為何官方 Mainnet 不當後備

`api.mainnet-beta.solana.com` 對錢包常用方法會 403 或限流。填在 `effectiveRpcUrl` 裡只會讓 Settings 看起來已設定、Home 卻空白。Devnet 公用節點仍堪用手測，所以只改 Mainnet。

已把官方 URL 當「內建選項」的安裝：選它等於以前的空 active，本版一律當未設定，避免繼續 fetch。

## 為何不把 Helius API 拿去當 RPC

使用者可能 RPC 用 Triton／自己的節點，Helius 只給 Activity。兩欄混用會在只填 Helius 時誤以為餘額會好，或在只填 RPC 時誤打 enhanced。通道維持 0.27.0：`helius-api-target.ts` 註解已寫不當 JSON-RPC。

Helius、Jupiter 選填：沒有它們仍可在 Mainnet 查餘額與送出（只要 RPC 就緒）。沒有 RPC 則連餘額都不查。

## 為何引導可略過但 Home 不可假裝就緒

全屏只出現一次，避免每次開 popup 擋操作。略過只表示看過說明。Mainnet 未就緒時 Tokens 仍停住，否則商店使用者會以為壞掉。

即使當下在 Devnet 也出一次：之後切 Mainnet 才發現要填，不如建完第一個帳戶就講。

## 為何不連外申請頁

綁單一供應商（Helius 註冊）會過時、也暗示「必須用 Helius 當 RPC」。文案只要求 JSON-RPC。
