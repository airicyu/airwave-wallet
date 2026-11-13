/**
 * Settings, RPC guide, first-run setup, and unlock copy.
 * The catalog entry is ui-messages.ts. Callers outside shared/i18n do not import this file.
 */
import type { UiLocale } from "../../protocol";

export const settingsMessages = {
  "settings.hub.language": {
    "zh-Hant": "語言",
    "zh-Hans": "语言",
    "en": "Language",
  },
  "settings.locale.title": {
    "zh-Hant": "語言",
    "zh-Hans": "语言",
    "en": "Language",
  },
  "settings.hub.network": {
    "zh-Hant": "網路",
    "zh-Hans": "网络",
    "en": "Network",
  },
  "settings.hub.rpc": {
    "zh-Hant": "RPC",
    "zh-Hans": "RPC",
    "en": "RPC",
  },
  "settings.hub.apiKeys": {
    "zh-Hant": "API 金鑰",
    "zh-Hans": "API 密钥",
    "en": "API keys",
  },
  "settings.keys.helius": {
    "zh-Hant": "Helius API 金鑰",
    "zh-Hans": "Helius API 密钥",
    "en": "Helius API key",
  },
  "settings.keys.jupiter": {
    "zh-Hant": "Jupiter API 金鑰",
    "zh-Hans": "Jupiter API 密钥",
    "en": "Jupiter API key",
  },
  "settings.hub.txFee": {
    "zh-Hant": "交易手續費",
    "zh-Hans": "交易手续费",
    "en": "Transaction fee",
  },
  "settings.fee.priority": {
    "zh-Hant": "預設優先費（V1 交易）",
    "zh-Hans": "预设优先费（V1 交易）",
    "en": "Default priority fee (V1 Tx)",
  },
  "settings.fee.cuPrice": {
    "zh-Hant": "預設 CU 單價（Legacy / V0 交易）",
    "zh-Hans": "预设 CU 单价（Legacy / V0 交易）",
    "en": "Default CU price (Legacy / V0 Tx)",
  },
  "settings.idleAutoLock.enable": {
    "zh-Hant": "閒置自動鎖定",
    "zh-Hans": "闲置自动锁定",
    "en": "Idle auto-lock",
  },
  "settings.idleAutoLock.minutes": {
    "zh-Hant": "分鐘",
    "zh-Hans": "分钟",
    "en": "Minutes",
  },
  "settings.idleAutoLock.lockAfter": {
    "zh-Hant": "閒置後鎖定（分鐘）",
    "zh-Hans": "闲置后锁定（分钟）",
    "en": "Lock after (minutes)",
  },
  "settings.idleAutoLock.increase": {
    "zh-Hant": "增加分鐘",
    "zh-Hans": "增加分钟",
    "en": "Increase minutes",
  },
  "settings.idleAutoLock.decrease": {
    "zh-Hant": "減少分鐘",
    "zh-Hans": "减少分钟",
    "en": "Decrease minutes",
  },
  "settings.hub.walletLock": {
    "zh-Hant": "錢包鎖定",
    "zh-Hans": "钱包锁定",
    "en": "Wallet lock",
  },
  "settings.hub.debug": {
    "zh-Hant": "Debug mode",
    "zh-Hans": "Debug mode",
    "en": "Debug mode",
  },
  "settings.debug.enable": {
    "zh-Hant": "Debug mode",
    "zh-Hans": "Debug mode",
    "en": "Debug mode",
  },
  "settings.hub.walletLockPassword": {
    "zh-Hant": "錢包鎖定密碼",
    "zh-Hans": "钱包锁定密码",
    "en": "Wallet lock password",
  },
  "settings.idleAutoLock.hubSummary": {
    "zh-Hant": "{minutes} 分鐘",
    "zh-Hans": "{minutes} 分钟",
    "en": "{minutes} min",
  },
  "settings.hub.walletPassword": {
    "zh-Hant": "錢包密碼",
    "zh-Hans": "钱包密码",
    "en": "Wallet password",
  },
  "settings.hub.changePassword": {
    "zh-Hant": "變更",
    "zh-Hans": "变更",
    "en": "Change",
  },
  "settings.hub.keysConfigured": {
    "zh-Hant": "已設定",
    "zh-Hans": "已设定",
    "en": "Configured",
  },
  "settings.hub.keysPartial": {
    "zh-Hant": "部分設定",
    "zh-Hans": "部分设定",
    "en": "Partially set",
  },
  "settings.hub.keysUnset": {
    "zh-Hant": "未設定",
    "zh-Hans": "未设定",
    "en": "Not set",
  },
  "settings.hub.txAi": {
    "zh-Hant": "AI 設定",
    "zh-Hans": "AI 设置",
    "en": "AI settings",
  },
  "settings.txAiAnalysis.enable": {
    "zh-Hant": "啟用",
    "zh-Hans": "启用",
    "en": "On",
  },
  "settings.txAiAnalysis.off": {
    "zh-Hant": "關閉",
    "zh-Hans": "关闭",
    "en": "Off",
  },
  "settings.txAiAnalysis.onSummary": {
    "zh-Hant": "已開啟 · {model}",
    "zh-Hans": "已开启 · {model}",
    "en": "On · {model}",
  },
  "settings.txAiAnalysis.defaultSummary": {
    "zh-Hant": "已開啟 · 預設",
    "zh-Hans": "已开启 · 预设",
    "en": "On · Default",
  },
  "settings.txAiAnalysis.modeDefault": {
    "zh-Hant": "預設",
    "zh-Hans": "预设",
    "en": "Default",
  },
  "settings.txAiAnalysis.modeCustom": {
    "zh-Hant": "自訂",
    "zh-Hans": "自定义",
    "en": "Custom",
  },
  "settings.txAiAnalysis.chainRequired": {
    "zh-Hant": "至少填一個合法模型 id",
    "zh-Hans": "至少填一个合法模型 id",
    "en": "Enter at least one valid model id",
  },
  "settings.openRouter.apiKey": {
    "zh-Hant": "OpenRouter API 金鑰",
    "zh-Hans": "OpenRouter API 密钥",
    "en": "OpenRouter API key",
  },
  "settings.openRouter.model": {
    "zh-Hant": "報告模型",
    "zh-Hans": "报告模型",
    "en": "Report model",
  },
  "settings.openRouter.model.deepseekFlash": {
    "zh-Hant": "DeepSeek Flash latest",
    "zh-Hans": "DeepSeek Flash latest",
    "en": "DeepSeek Flash latest",
  },
  "settings.openRouter.model.deepseekPro": {
    "zh-Hant": "DeepSeek Pro latest",
    "zh-Hans": "DeepSeek Pro latest",
    "en": "DeepSeek Pro latest",
  },
  "settings.openRouter.model.kimi": {
    "zh-Hant": "Kimi K2 0905",
    "zh-Hans": "Kimi K2 0905",
    "en": "Kimi K2 0905",
  },
  "settings.openRouter.model.glm": {
    "zh-Hant": "GLM 5.3 Flash",
    "zh-Hans": "GLM 5.3 Flash",
    "en": "GLM 5.3 Flash",
  },
  "settings.openRouter.model.other": {
    "zh-Hant": "其他",
    "zh-Hans": "其他",
    "en": "Other",
  },
  "settings.openRouter.decisionsModel": {
    "zh-Hant": "定級模型",
    "zh-Hans": "定级模型",
    "en": "Grading model",
  },
  "settings.openRouter.decisionsModel.d1": {
    "zh-Hant": "LiquidAI d1",
    "zh-Hans": "LiquidAI d1",
    "en": "LiquidAI d1",
  },
  "settings.openRouter.decisionsModel.drex": {
    "zh-Hant": "Nace.AI Drex v1.5",
    "zh-Hans": "Nace.AI Drex v1.5",
    "en": "Nace.AI Drex v1.5",
  },
  "settings.openRouter.decisionsModel.other": {
    "zh-Hant": "其他",
    "zh-Hans": "其他",
    "en": "Other",
  },
  "settings.network.aria": {
    "zh-Hant": "目前網路",
    "zh-Hans": "当前网络",
    "en": "Current network",
  },
  "settings.rpc.current": {
    "zh-Hant": "目前",
    "zh-Hans": "当前",
    "en": "Current",
  },
  "settings.rpc.builtin": {
    "zh-Hant": "內建",
    "zh-Hans": "内置",
    "en": "Built-in",
  },
  "settings.rpc.mainnetUnset": {
    "zh-Hant": "未設定",
    "zh-Hans": "未设置",
    "en": "Not set",
  },
  "setup.pickLanguage": {
    "zh-Hant": "請選擇語言",
    "zh-Hans": "请选择语言",
    "en": "Choose your language",
  },
  "setup.passwordLead": {
    "zh-Hant": "請設定用來鎖定錢包的密碼",
    "zh-Hans": "请设定用来锁定钱包的密码",
    "en": "Set a password to lock this wallet",
  },
  "rpcGuide.title": {
    "zh-Hant": "設定 Mainnet RPC",
    "zh-Hans": "设置 Mainnet RPC",
    "en": "Set Mainnet RPC",
  },
  "rpcGuide.body": {
    "zh-Hant": "Mainnet 必須填你自己的 RPC，才能查餘額與送出。",
    "zh-Hans": "Mainnet 必须填你自己的 RPC，才能查余额与发送。",
    "en": "You must set your own Mainnet RPC before you can load balances or send.",
  },
  "rpcGuide.heliusLink": {
    "zh-Hant": "向 Helius 申請 RPC endpoint",
    "zh-Hans": "向 Helius 申请 RPC endpoint",
    "en": "Request an RPC endpoint from Helius",
  },
  "rpcGuide.setRpc": {
    "zh-Hant": "設定 RPC",
    "zh-Hans": "设置 RPC",
    "en": "Set RPC",
  },
  "rpcGuide.skip": {
    "zh-Hant": "略過",
    "zh-Hans": "跳过",
    "en": "Skip",
  },
  "unlock.lead": {
    "zh-Hant": "錢包已鎖定",
    "zh-Hans": "钱包已锁定",
    "en": "Wallet locked",
  },
  "unlock.passwordPlaceholder": {
    "zh-Hant": "密碼",
    "zh-Hans": "密码",
    "en": "Password",
  },
  "unlock.submit": {
    "zh-Hant": "解鎖",
    "zh-Hans": "解锁",
    "en": "Unlock",
  },
  "unlock.brand": {
    "zh-Hant": "Airwave",
    "zh-Hans": "Airwave",
    "en": "Airwave",
  },
  "settings.password.change": {
    "zh-Hant": "變更密碼",
    "zh-Hans": "变更密码",
    "en": "Change password",
  },
  "settings.password.current": {
    "zh-Hant": "目前密碼",
    "zh-Hans": "当前密码",
    "en": "Current password",
  },
  "settings.password.new": {
    "zh-Hant": "新密碼",
    "zh-Hans": "新密码",
    "en": "New password",
  },
  "settings.password.confirmNew": {
    "zh-Hant": "再次輸入新密碼",
    "zh-Hans": "再次输入新密码",
    "en": "Confirm new password",
  },
} as const satisfies Record<string, Record<UiLocale, string>>;
