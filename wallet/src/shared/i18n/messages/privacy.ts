/**
 * Private-balance copy.
 * The catalog entry is ui-messages.ts. Callers outside shared/i18n do not import this file.
 */
import type { UiLocale } from "../../protocol";

export const privacyMessages = {
  "privacy.unavailable": {
    "zh-Hant": "不可用",
    "zh-Hans": "不可用",
    "en": "Unavailable",
  },
  "privacy.register": {
    "zh-Hant": "註冊",
    "zh-Hans": "注册",
    "en": "Register",
  },
  "privacy.registerFailed": {
    "zh-Hant": "註冊失敗",
    "zh-Hans": "注册失败",
    "en": "Registration failed",
  },
  "privacy.registering": {
    "zh-Hant": "帳號註冊中",
    "zh-Hans": "账号注册中",
    "en": "Registering this account",
  },
  "privacy.registered": {
    "zh-Hant": "這個錢包已註冊。",
    "zh-Hans": "这个钱包已注册。",
    "en": "This wallet is registered.",
  },
  "privacy.shield": { "zh-Hant": "轉入私人", "zh-Hans": "转入私人", "en": "Shield" },
  "privacy.shieldToken": { "zh-Hant": "轉入私人餘額", "zh-Hans": "转入私人余额", "en": "Shield token" },
  "privacy.selectToken": {
    "zh-Hant": "選擇要轉入私人餘額的代幣",
    "zh-Hans": "选择要转入私人余额的代币",
    "en": "Select a token to shield",
  },
  "privacy.privateSend": {
    "zh-Hant": "發送私人餘額",
    "zh-Hans": "发送私人余额",
    "en": "Private balance send",
  },
  "privacy.paste": { "zh-Hant": "貼上", "zh-Hans": "粘贴", "en": "Paste" },
  "privacy.utxoSelection": { "zh-Hant": "選擇 UTXO", "zh-Hans": "选择 UTXO", "en": "UTXOs selection" },
  "privacy.utxoList": { "zh-Hant": "UTXO 列表", "zh-Hans": "UTXO 列表", "en": "UTXO list" },
  "privacy.autoSelect": { "zh-Hant": "自動選擇", "zh-Hans": "自动选择", "en": "Auto select" },
  "privacy.insufficient": { "zh-Hant": "餘額不足", "zh-Hans": "余额不足", "en": "Insufficient balance" },
  "privacy.over40": { "zh-Hant": "超過上限 40 張 UTXO", "zh-Hans": "超过上限 40 张 UTXO", "en": "Over the limit of 40 UTXOs" },
  "privacy.unregisteredRecipient": { "zh-Hant": "這個地址尚未註冊", "zh-Hans": "这个地址尚未注册", "en": "This address is not registered" },
  "privacy.unshield": { "zh-Hant": "轉回公開", "zh-Hans": "转回公开", "en": "Unshield" },
  "privacy.unshieldToken": { "zh-Hant": "轉回公開餘額", "zh-Hans": "转回公开余额", "en": "Unshield token" },
  "privacy.selectUnshieldToken": {
    "zh-Hant": "選擇要轉回公開餘額的代幣",
    "zh-Hans": "选择要转回公开余额的代币",
    "en": "Select a token to unshield",
  },
  "privacy.privateBalance": { "zh-Hant": "私人餘額", "zh-Hans": "私人余额", "en": "Private balance" },
  "privacy.becomesPublic": {
    "zh-Hant": "這筆金額會變成公開餘額",
    "zh-Hans": "这笔金额会变成公开余额",
    "en": "This amount becomes public.",
  },
  "privacy.merge": { "zh-Hant": "合併 UTXO", "zh-Hans": "合并 UTXO", "en": "Merge UTXO" },
  "privacy.mergeTitle": { "zh-Hant": "合併 UTXO", "zh-Hans": "合并 UTXO", "en": "Merge UTXO" },
  "privacy.mergeGroups": {
    "zh-Hant": "將簽署 {count} 筆合併交易",
    "zh-Hans": "将签署 {count} 笔合并交易",
    "en": "This signs {count} merge transactions",
  },
  "privacy.selectAll": { "zh-Hant": "全選", "zh-Hans": "全选", "en": "Select all" },
  "privacy.clearAll": { "zh-Hant": "清除", "zh-Hans": "清除", "en": "Clear all" },
  "privacy.utxos": { "zh-Hant": "UTXO", "zh-Hans": "UTXO", "en": "UTXOs" },
  "privacy.utxoCount": {
    "zh-Hant": "UTXO 數量：{count}",
    "zh-Hans": "UTXO 数量：{count}",
    "en": "Number of UTXOs: {count}",
  },
  "privacy.utxoWarn": {
    "zh-Hant": "UTXO數量多於40個, 建議進行Merge UTXO操作",
    "zh-Hans": "UTXO数量多于40个, 建议进行Merge UTXO操作",
    "en": "More than 40 UTXOs. Merge UTXO is recommended.",
  },
  "privacy.registerConsent": {
    "zh-Hant": "這個錢包第一次使用前要先註冊。",
    "zh-Hans": "这个钱包第一次使用前要先注册。",
    "en": "Register this wallet before using it for the first time.",
  },
} as const satisfies Record<string, Record<UiLocale, string>>;
