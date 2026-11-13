/**
 * Navigation, menu, shell, and window title copy.
 * The catalog entry is ui-messages.ts. Callers outside shared/i18n do not import this file.
 */
import type { UiLocale } from "../../protocol";

export const navMessages = {
  "nav.accounts": {
    "zh-Hant": "帳戶",
    "zh-Hans": "账户",
    "en": "Accounts",
  },
  "nav.addAccount": {
    "zh-Hant": "新增帳戶",
    "zh-Hans": "新增账户",
    "en": "Add account",
  },
  "nav.addGenerate": {
    "zh-Hant": "拋棄式錢包",
    "zh-Hans": "抛弃式钱包",
    "en": "Burner wallet",
  },
  "nav.addGenerateSeed": {
    "zh-Hant": "助記詞錢包",
    "zh-Hans": "助记词钱包",
    "en": "Seed phrase wallet",
  },
  "nav.addImport": {
    "zh-Hant": "匯入錢包",
    "zh-Hans": "导入钱包",
    "en": "Import wallet",
  },
  "nav.addImportSecret": {
    "zh-Hant": "密鑰",
    "zh-Hans": "密钥",
    "en": "Secret key",
  },
  "nav.addImportSeed": {
    "zh-Hant": "助記詞",
    "zh-Hans": "助记词",
    "en": "Seed phrase",
  },
  "nav.addWatch": {
    "zh-Hant": "觀察帳戶",
    "zh-Hans": "观察账户",
    "en": "Watch-only account",
  },
  "nav.addCombined": {
    "zh-Hant": "聚合錢包帳戶",
    "zh-Hans": "聚合钱包账户",
    "en": "New combined",
  },
  "nav.accountRename": {
    "zh-Hant": "重新命名",
    "zh-Hans": "重命名",
    "en": "Rename",
  },
  "nav.accountManage": {
    "zh-Hant": "管理",
    "zh-Hans": "管理",
    "en": "Manage",
  },
  "nav.accountRevealKey": {
    "zh-Hant": "顯示私鑰",
    "zh-Hans": "显示私钥",
    "en": "Reveal key",
  },
  "nav.settings": {
    "zh-Hant": "設定",
    "zh-Hans": "设置",
    "en": "Settings",
  },
  "nav.settingsNetwork": {
    "zh-Hant": "網路",
    "zh-Hans": "网络",
    "en": "Network",
  },
  "nav.settingsRpc": {
    "zh-Hant": "RPC",
    "zh-Hans": "RPC",
    "en": "RPC",
  },
  "nav.settingsKeys": {
    "zh-Hant": "API 金鑰",
    "zh-Hans": "API 密钥",
    "en": "API keys",
  },
  "nav.settingsTxFee": {
    "zh-Hant": "交易手續費",
    "zh-Hans": "交易手续费",
    "en": "Transaction fee",
  },
  "nav.settingsWalletLock": {
    "zh-Hant": "錢包鎖定",
    "zh-Hans": "钱包锁定",
    "en": "Wallet lock",
  },
  "nav.settingsWalletLockPassword": {
    "zh-Hant": "錢包鎖定密碼",
    "zh-Hans": "钱包锁定密码",
    "en": "Wallet lock password",
  },
  "nav.about": {
    "zh-Hant": "關於此應用",
    "zh-Hans": "关于此应用",
    "en": "About this app",
  },
  "nav.aboutDisclaimer": {
    "zh-Hant": "免責聲明",
    "zh-Hans": "免责声明",
    "en": "Disclaimer",
  },
  "nav.aboutTerms": {
    "zh-Hant": "使用條款",
    "zh-Hans": "使用条款",
    "en": "Terms of use",
  },
  "nav.aboutPrivacy": {
    "zh-Hant": "隱私權政策",
    "zh-Hans": "隐私权政策",
    "en": "Privacy policy",
  },
  "nav.connectedSites": {
    "zh-Hant": "已連線網站",
    "zh-Hans": "已连接网站",
    "en": "Connected sites",
  },
  "nav.tokenDetail": {
    "zh-Hant": "代幣詳情",
    "zh-Hans": "代币详情",
    "en": "Token details",
  },
  "nav.tokenSend": {
    "zh-Hant": "送出",
    "zh-Hans": "发送",
    "en": "Send",
  },
  "nav.sendApproval": {
    "zh-Hant": "確認送出",
    "zh-Hans": "确认发送",
    "en": "Confirm send",
  },
  "nav.closeEmptyPick": {
    "zh-Hant": "收回租金",
    "zh-Hans": "收回租金",
    "en": "Reclaim rent",
  },
  "nav.closeEmptyConfirm": {
    "zh-Hant": "確認收回",
    "zh-Hans": "确认收回",
    "en": "Confirm reclaim",
  },
  "nav.closeEmptySending": {
    "zh-Hant": "確認中",
    "zh-Hans": "确认中",
    "en": "Confirming",
  },
  "nav.closeEmptyResult": {
    "zh-Hant": "結果",
    "zh-Hans": "结果",
    "en": "Result",
  },
  "nav.pickAccounts": {
    "zh-Hant": "選帳戶",
    "zh-Hans": "选账户",
    "en": "Pick accounts",
  },
  "menu.walletAccounts": {
    "zh-Hant": "錢包帳戶",
    "zh-Hans": "钱包账户",
    "en": "Wallet accounts",
  },
  "menu.addressCards": {
    "zh-Hant": "地址簿",
    "zh-Hans": "地址簿",
    "en": "Address book",
  },
  "menu.settings": {
    "zh-Hant": "設定",
    "zh-Hans": "设置",
    "en": "Settings",
  },
  "menu.connectedSites": {
    "zh-Hant": "已連線網站",
    "zh-Hans": "已连接网站",
    "en": "Connected sites",
  },
  "menu.about": {
    "zh-Hant": "關於此應用",
    "zh-Hans": "关于此应用",
    "en": "About this app",
  },
  "menu.back": {
    "zh-Hant": "返回",
    "zh-Hans": "返回",
    "en": "Back",
  },
  "menu.menu": {
    "zh-Hant": "選單",
    "zh-Hans": "菜单",
    "en": "Menu",
  },
  "menu.lockWallet": {
    "zh-Hant": "鎖定錢包",
    "zh-Hans": "锁定钱包",
    "en": "Lock wallet",
  },
  "shell.toSidebar": {
    "zh-Hant": "改到側欄",
    "zh-Hans": "改到侧栏",
    "en": "Move to sidebar",
  },
  "shell.toWindow": {
    "zh-Hant": "改到工具列",
    "zh-Hans": "改到工具栏",
    "en": "Move to toolbar",
  },
  "shell.closeSidebar": {
    "zh-Hant": "關閉側欄",
    "zh-Hans": "关闭侧栏",
    "en": "Close sidebar",
  },
  "nav.settingsTxAi": {
    "zh-Hant": "AI 設定",
    "zh-Hans": "AI 设置",
    "en": "AI settings",
  },
  "nav.settingsDebug": {
    "zh-Hant": "Debug mode",
    "zh-Hans": "Debug mode",
    "en": "Debug mode",
  },
  "nav.privateDetail": {
    "zh-Hant": "私人餘額",
    "zh-Hans": "私人余额",
    "en": "Private balance",
  },
  "page.connect": {
    "zh-Hant": "連線",
    "zh-Hans": "连接",
    "en": "Connect",
  },
  "window.title.wallet": {
    "zh-Hant": "錢包",
    "zh-Hans": "钱包",
    "en": "Wallet",
  },
  "window.title.approval": {
    "zh-Hant": "審批",
    "zh-Hans": "审批",
    "en": "Approval",
  },
} as const satisfies Record<string, Record<UiLocale, string>>;
