/**
 * Account list, combined-account, and onboarding copy.
 * The catalog entry is ui-messages.ts. Callers outside shared/i18n do not import this file.
 */
import type { UiLocale } from "../../protocol";

export const accountsMessages = {
  "accounts.changeCurrentWallet": {
    "zh-Hant": "切換主錢包",
    "zh-Hans": "切换主钱包",
    "en": "Change main wallet",
  },
  "onboarding.createSeedWallet": {
    "zh-Hant": "建立助記詞錢包",
    "zh-Hans": "建立助记词钱包",
    "en": "Create seed wallet",
  },
  "onboarding.createBurner": {
    "zh-Hant": "建立拋棄式錢包",
    "zh-Hans": "建立抛弃式钱包",
    "en": "Create burner wallet",
  },
  "onboarding.importWallet": {
    "zh-Hant": "匯入錢包",
    "zh-Hans": "导入钱包",
    "en": "Import wallet",
  },
  "onboarding.createWatch": {
    "zh-Hant": "建立觀察帳戶",
    "zh-Hans": "建立观察账户",
    "en": "Create watch-only",
  },
  "onboarding.createCombined": {
    "zh-Hant": "建立聚合錢包帳戶",
    "zh-Hans": "建立聚合钱包账户",
    "en": "Create Combined",
  },
  "onboarding.chooser.seed": {
    "zh-Hant": "產生新的 12 詞助記詞",
    "zh-Hans": "产生新的 12 词助记词",
    "en": "Create a new 12-word seed phrase",
  },
  "onboarding.chooser.burner": {
    "zh-Hant": "本機暫用，不長期保管",
    "zh-Hans": "本机暂用，不长期保管",
    "en": "Temporary on this device",
  },
  "onboarding.chooser.import": {
    "zh-Hant": "助記詞或密鑰",
    "zh-Hans": "助记词或密钥",
    "en": "Seed phrase or secret key",
  },
  "onboarding.chooser.watch": {
    "zh-Hant": "只讀地址，無法簽名",
    "zh-Hans": "只读地址，无法签名",
    "en": "Read-only address, cannot sign",
  },
  "onboarding.chooser.combined": {
    "zh-Hant": "合併多帳戶資產視圖",
    "zh-Hans": "合并多账户资产视图",
    "en": "One view of several accounts",
  },
  "onboarding.seedPhrase": {
    "zh-Hant": "助記詞",
    "zh-Hans": "助记词",
    "en": "Seed phrase",
  },
  "onboarding.secretKey": {
    "zh-Hant": "密鑰",
    "zh-Hans": "密钥",
    "en": "Secret key",
  },
  "onboarding.secretPlaceholder": {
    "zh-Hant": "base58 或 [bytes]",
    "zh-Hans": "base58 或 [bytes]",
    "en": "base58 or [bytes]",
  },
  "onboarding.bytesArray": {
    "zh-Hant": "位元組陣列",
    "zh-Hans": "字节数组",
    "en": "Byte array",
  },
  "onboarding.base58": {
    "zh-Hant": "base58",
    "zh-Hans": "base58",
    "en": "base58",
  },
  "onboarding.standardPath": {
    "zh-Hant": "標準",
    "zh-Hans": "标准",
    "en": "Standard",
  },
  "onboarding.customPath": {
    "zh-Hant": "自訂",
    "zh-Hans": "自定义",
    "en": "Custom",
  },
  "onboarding.seedBackupWarn": {
    "zh-Hant": "離開後無法再顯示助記詞",
    "zh-Hans": "离开后无法再显示助记词",
    "en": "Seed phrase will not be shown again",
  },
  "onboarding.regenerateDraft": {
    "zh-Hant": "再產生一組",
    "zh-Hans": "再生成一组",
    "en": "Roll again",
  },
  "onboarding.start": {
    "zh-Hant": "開始",
    "zh-Hans": "开始",
    "en": "Get started",
  },
  "onboarding.passwordAgain": {
    "zh-Hant": "再次輸入",
    "zh-Hans": "再次输入",
    "en": "Re-enter",
  },
  "onboarding.generate": {
    "zh-Hant": "產生",
    "zh-Hans": "生成",
    "en": "Generate",
  },
  "onboarding.solanaPubkey": {
    "zh-Hant": "Solana 公鍵",
    "zh-Hans": "Solana 公钥",
    "en": "Solana public key",
  },
  "onboarding.secretPlaceholderExample": {
    "zh-Hant": "base58 或 [193, 240, …]",
    "zh-Hans": "base58 或 [193, 240, …]",
    "en": "base58 or [193, 240, …]",
  },
  "onboarding.seedWordPlaceholder": {
    "zh-Hant": "word",
    "zh-Hans": "word",
    "en": "word",
  },
  "onboarding.cliLedger": {
    "zh-Hant": "CLI／Ledger",
    "zh-Hans": "CLI／Ledger",
    "en": "CLI / Ledger",
  },
  "onboarding.pasteAddress": {
    "zh-Hant": "地址，或貼上",
    "zh-Hans": "地址，或粘贴",
    "en": "Address or paste",
  },
  "onboarding.pasteMulti": {
    "zh-Hant": "地址，或貼上多行",
    "zh-Hans": "地址，或粘贴多行",
    "en": "Address or paste multiple lines",
  },
  "accounts.members": {
    "zh-Hant": "成員",
    "zh-Hans": "成员",
    "en": "Members",
  },
  "accounts.alreadyIn": {
    "zh-Hant": "已加入",
    "zh-Hans": "已加入",
    "en": "Already added",
  },
  "accounts.pickLocalToAdd": {
    "zh-Hant": "選擇要加入的錢包帳戶",
    "zh-Hans": "选择要加入的钱包账户",
    "en": "Select the wallet accounts that you want to add",
  },
  "accounts.memberCount": {
    "zh-Hant": "{count} 個成員地址",
    "zh-Hans": "{count} 个成员地址",
    "en": "{count} member addresses",
  },
  "accounts.removeConfirm": {
    "zh-Hant": "確定移除此錢包帳戶？",
    "zh-Hans": "确定移除此钱包账户？",
    "en": "Remove this wallet account?",
  },
  "accounts.removeCombinedConfirm": {
    "zh-Hant": "確定移除此綜合錢包帳戶？",
    "zh-Hans": "确定移除此综合钱包账户？",
    "en": "Remove this combined wallet account?",
  },
  "accounts.removeMemberConfirm": {
    "zh-Hant": "確定移除此成員地址？",
    "zh-Hans": "确定移除此成员地址？",
    "en": "Remove this member address?",
  },
  "accounts.currentWalletAddress": {
    "zh-Hant": "主錢包地址",
    "zh-Hans": "主钱包地址",
    "en": "Main wallet address",
  },
  "accounts.sectionMembers": {
    "zh-Hant": "成員地址",
    "zh-Hans": "成员地址",
    "en": "Member addresses",
  },
  "accounts.sectionAddFromLocal": {
    "zh-Hant": "本機錢包帳戶",
    "zh-Hans": "本地钱包账户",
    "en": "Local wallet accounts",
  },
  "accounts.revealWarn": {
    "zh-Hant": "請勿分享或截圖保存私鑰。",
    "zh-Hans": "请勿分享或截图保存私钥。",
    "en": "Do not share or screenshot your private key.",
  },
  "accounts.walletPassword": {
    "zh-Hant": "錢包密碼",
    "zh-Hans": "钱包密码",
    "en": "Wallet password",
  },
  "accounts.combinedCreate": {
    "zh-Hant": "建立聚合錢包帳戶",
    "zh-Hans": "建立聚合钱包账户",
    "en": "Create Combined",
  },
  "accounts.renameAccount": {
    "zh-Hant": "重新命名帳戶",
    "zh-Hans": "重命名账户",
    "en": "Rename account",
  },
  "accounts.accountName": {
    "zh-Hant": "帳戶名稱",
    "zh-Hans": "账户名称",
    "en": "Account name",
  },
  "accounts.newNamePlaceholder": {
    "zh-Hant": "新名稱",
    "zh-Hans": "新名称",
    "en": "New name",
  },
  "accounts.active": {
    "zh-Hant": "使用中",
    "zh-Hans": "使用中",
    "en": "Active",
  },
  "accounts.badgeCombined": {
    "zh-Hant": "聚合錢包帳戶",
    "zh-Hans": "聚合钱包账户",
    "en": "Combined",
  },
  "accounts.badgeReadOnly": {
    "zh-Hant": "唯讀",
    "zh-Hans": "只读",
    "en": "Read-only",
  },
  "accounts.kindSigning": {
    "zh-Hant": "簽名錢包",
    "zh-Hans": "签名钱包",
    "en": "Signing",
  },
  "accounts.kindReadOnly": {
    "zh-Hant": "唯讀",
    "zh-Hans": "只读",
    "en": "Read-only",
  },
  "accounts.kindCombined": {
    "zh-Hant": "聚合錢包帳戶",
    "zh-Hans": "聚合钱包账户",
    "en": "Combined",
  },
  "accounts.copyAddress": {
    "zh-Hant": "複製地址",
    "zh-Hans": "复制地址",
    "en": "Copy address",
  },
  "accounts.manageAccount": {
    "zh-Hant": "管理帳戶",
    "zh-Hans": "管理账户",
    "en": "Manage account",
  },
  "accounts.manageCombined": {
    "zh-Hant": "管理聚合錢包帳戶",
    "zh-Hans": "管理聚合钱包账户",
    "en": "Manage combined wallet account",
  },
  "accounts.removeCombined": {
    "zh-Hant": "移除聚合錢包帳戶",
    "zh-Hans": "移除聚合钱包账户",
    "en": "Remove combined wallet account",
  },
  "accounts.revealPrivateKey": {
    "zh-Hant": "顯示私鑰",
    "zh-Hans": "显示私钥",
    "en": "Reveal private key",
  },
  "accounts.removeWalletAccount": {
    "zh-Hant": "移除錢包帳戶",
    "zh-Hans": "移除钱包账户",
    "en": "Remove wallet account",
  },
  "accounts.disconnect": {
    "zh-Hant": "斷開連線",
    "zh-Hans": "断开连接",
    "en": "Disconnect",
  },
  "accounts.currentWalletSuffix": {
    "zh-Hant": " · 主錢包",
    "zh-Hans": " · 主钱包",
    "en": " · Main wallet",
  },
  "accounts.copyPrivateKey": {
    "zh-Hant": "複製私鑰",
    "zh-Hans": "复制私钥",
    "en": "Copy private key",
  },
} as const satisfies Record<string, Record<UiLocale, string>>;
