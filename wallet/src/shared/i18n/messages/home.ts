/**
 * Home tokens, send, activity, address book, and close-empty copy.
 * The catalog entry is ui-messages.ts. Callers outside shared/i18n do not import this file.
 */
import type { UiLocale } from "../../protocol";

export const homeMessages = {
  "send.titleWithSymbol": {
    "zh-Hant": "送出 {symbol}",
    "zh-Hans": "发送 {symbol}",
    "en": "Send {symbol}",
  },
  "addressCards.empty": {
    "zh-Hant": "還沒有地址",
    "zh-Hans": "还没有地址",
    "en": "No addresses yet",
  },
  "addressCards.add": {
    "zh-Hant": "加入",
    "zh-Hans": "加入",
    "en": "Add",
  },
  "addressCards.name": {
    "zh-Hant": "名稱",
    "zh-Hans": "名称",
    "en": "Name",
  },
  "addressCards.address": {
    "zh-Hant": "地址",
    "zh-Hans": "地址",
    "en": "Address",
  },
  "addressCards.deleteTitle": {
    "zh-Hant": "刪除",
    "zh-Hans": "删除",
    "en": "Delete",
  },
  "addressCards.invalid": {
    "zh-Hant": "地址無效",
    "zh-Hans": "地址无效",
    "en": "Invalid address",
  },
  "addressCards.duplicate": {
    "zh-Hant": "這條地址已在",
    "zh-Hans": "这条地址已在",
    "en": "Address already saved",
  },
  "addressCards.notFound": {
    "zh-Hant": "這筆已不在",
    "zh-Hans": "这笔已不在",
    "en": "No longer in the list",
  },
  "addressCards.tabWallet": {
    "zh-Hant": "錢包",
    "zh-Hans": "钱包",
    "en": "Wallet",
  },
  "addressCards.tabCards": {
    "zh-Hant": "地址簿",
    "zh-Hans": "地址簿",
    "en": "Address book",
  },
  "addressCards.pick": {
    "zh-Hant": "選擇地址",
    "zh-Hans": "选择地址",
    "en": "Choose address",
  },
  "addressCards.clear": {
    "zh-Hant": "清除",
    "zh-Hans": "清除",
    "en": "Clear",
  },
  "addressCards.open": {
    "zh-Hant": "地址簿",
    "zh-Hans": "地址簿",
    "en": "Address book",
  },
  "home.mainnetRpcRequired": {
    "zh-Hant": "Mainnet 需要你自己的 RPC 才能查餘額與送出。",
    "zh-Hans": "Mainnet 需要你自己的 RPC 才能查余额与发送。",
    "en": "Mainnet needs your own RPC to load balances and send.",
  },
  "home.goSetRpc": {
    "zh-Hant": "設定 RPC",
    "zh-Hans": "设置 RPC",
    "en": "Set RPC",
  },
  "home.tokens": {
    "zh-Hant": "代幣",
    "zh-Hans": "代币",
    "en": "Tokens",
  },
  "home.privateBalances": {
    "zh-Hant": "私人餘額",
    "zh-Hans": "私人余额",
    "en": "Private Balances",
  },
  "send.confirm": {
    "zh-Hant": "確認",
    "zh-Hans": "确认",
    "en": "Confirm",
  },
  "send.balance": {
    "zh-Hant": "餘額:",
    "zh-Hans": "余额:",
    "en": "Balance:",
  },
  "send.amount": {
    "zh-Hant": "數量",
    "zh-Hans": "数量",
    "en": "Amount",
  },
  "send.max": {
    "zh-Hant": "全部",
    "zh-Hans": "全部",
    "en": "Max",
  },
  "send.recipient": {
    "zh-Hant": "收款地址",
    "zh-Hans": "收款地址",
    "en": "Recipient",
  },
  "send.recipientPlaceholder": {
    "zh-Hant": "Base58 地址",
    "zh-Hans": "Base58 地址",
    "en": "Base58 address",
  },
  "send.action": {
    "zh-Hant": "送出",
    "zh-Hans": "发送",
    "en": "Send",
  },
  "token.native": {
    "zh-Hant": "原生",
    "zh-Hans": "原生",
    "en": "Native",
  },
  "token.mint": {
    "zh-Hant": "鑄幣",
    "zh-Hans": "铸币",
    "en": "Mint",
  },
  "token.verified": {
    "zh-Hant": "Jupiter 已驗證",
    "zh-Hans": "Jupiter 已验证",
    "en": "Jupiter verified",
  },
  "token.notVerified": {
    "zh-Hant": "未驗證",
    "zh-Hans": "未验证",
    "en": "Not verified",
  },
  "token.expandMembers": {
    "zh-Hant": "展開成員持倉",
    "zh-Hans": "展开成员持仓",
    "en": "Show member holdings",
  },
  "token.collapseMembers": {
    "zh-Hant": "收合成員持倉",
    "zh-Hans": "收起成员持仓",
    "en": "Hide member holdings",
  },
  "closeEmpty.title": {
    "zh-Hant": "收回租金",
    "zh-Hans": "收回租金",
    "en": "Reclaim rent",
  },
  "closeEmpty.selectAll": {
    "zh-Hant": "全選",
    "zh-Hans": "全选",
    "en": "Select all",
  },
  "closeEmpty.selectedMeta": {
    "zh-Hant": "已選 {selected} · {txCount} 筆交易",
    "zh-Hans": "已选 {selected} · {txCount} 笔交易",
    "en": "{selected} selected · {txCount} txs",
  },
  "closeEmpty.confirm": {
    "zh-Hant": "確認",
    "zh-Hans": "确认",
    "en": "Confirm",
  },
  "closeEmpty.planSummary": {
    "zh-Hant": "{accountCount} 個帳戶 · {txCount} 筆交易",
    "zh-Hans": "{accountCount} 个账户 · {txCount} 笔交易",
    "en": "{accountCount} accounts · {txCount} txs",
  },
  "closeEmpty.fee": {
    "zh-Hant": "手續費",
    "zh-Hans": "手续费",
    "en": "Fee",
  },
  "closeEmpty.sigFee": {
    "zh-Hant": "簽名費",
    "zh-Hans": "签名费",
    "en": "Signature fee",
  },
  "closeEmpty.priorityFee": {
    "zh-Hant": "優先費",
    "zh-Hans": "优先费",
    "en": "Priority fee",
  },
  "closeEmpty.txTitle": {
    "zh-Hant": "交易 {n}",
    "zh-Hans": "交易 {n}",
    "en": "Transaction {n}",
  },
  "closeEmpty.confirmingTitle": {
    "zh-Hant": "確認中",
    "zh-Hans": "确认中",
    "en": "Confirming",
  },
  "closeEmpty.confirmingLead": {
    "zh-Hant": "等待鏈上確認",
    "zh-Hans": "等待链上确认",
    "en": "Waiting for confirmation",
  },
  "closeEmpty.statusConfirmed": {
    "zh-Hant": "已確認",
    "zh-Hans": "已确认",
    "en": "Confirmed",
  },
  "closeEmpty.statusFailed": {
    "zh-Hant": "鏈上失敗",
    "zh-Hans": "链上失败",
    "en": "Failed on chain",
  },
  "closeEmpty.statusExpired": {
    "zh-Hant": "已過期",
    "zh-Hans": "已过期",
    "en": "Expired",
  },
  "activity.empty": {
    "zh-Hant": "尚無交易",
    "zh-Hans": "尚无交易",
    "en": "No transactions yet",
  },
  "activity.loadingOlder": {
    "zh-Hant": "載入更舊的活動",
    "zh-Hans": "加载更旧的活动",
    "en": "Loading older activity",
  },
  "activity.openOrb": {
    "zh-Hant": "在區塊瀏覽器開啟",
    "zh-Hans": "在区块浏览器打开",
    "en": "Open in explorer",
  },
  "activity.fail": {
    "zh-Hant": "失敗",
    "zh-Hans": "失败",
    "en": "Failed",
  },
  "activity.success": {
    "zh-Hant": "成功",
    "zh-Hans": "成功",
    "en": "Success",
  },
  "activity.kind.send": {
    "zh-Hant": "送出",
    "zh-Hans": "发送",
    "en": "Send",
  },
  "activity.kind.receive": {
    "zh-Hant": "收到",
    "zh-Hans": "收到",
    "en": "Receive",
  },
  "activity.kind.swap": {
    "zh-Hant": "互換",
    "zh-Hans": "互换",
    "en": "Swap",
  },
  "activity.kind.tx": {
    "zh-Hant": "交易",
    "zh-Hans": "交易",
    "en": "Transaction",
  },
} as const satisfies Record<string, Record<UiLocale, string>>;
