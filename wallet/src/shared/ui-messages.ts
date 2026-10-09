import type { UiLocale } from "./storage-keys";

const messages = {
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
    "zh-Hant": "API keys",
    "zh-Hans": "API keys",
    "en": "API keys",
  },
  "nav.settingsCuPrice": {
    "zh-Hant": "Default CU price",
    "zh-Hans": "Default CU price",
    "en": "Default CU price",
  },
  "nav.settingsPassword": {
    "zh-Hant": "錢包密碼",
    "zh-Hans": "钱包密码",
    "en": "Wallet password",
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
  "send.titleWithSymbol": {
    "zh-Hant": "送出 {symbol}",
    "zh-Hans": "发送 {symbol}",
    "en": "Send {symbol}",
  },
  "menu.walletAccounts": {
    "zh-Hant": "錢包帳戶",
    "zh-Hans": "钱包账户",
    "en": "Wallet accounts",
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
    "zh-Hant": "API keys",
    "zh-Hans": "API keys",
    "en": "API keys",
  },
  "settings.hub.cuPrice": {
    "zh-Hant": "Default CU price",
    "zh-Hans": "Default CU price",
    "en": "Default CU price",
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
  "common.add": {
    "zh-Hant": "加入",
    "zh-Hans": "加入",
    "en": "Add",
  },
  "common.delete": {
    "zh-Hant": "刪除",
    "zh-Hans": "删除",
    "en": "Delete",
  },
  "common.confirm": {
    "zh-Hant": "確認",
    "zh-Hans": "确认",
    "en": "Confirm",
  },
  "common.copy": {
    "zh-Hant": "複製",
    "zh-Hans": "复制",
    "en": "Copy",
  },
  "common.show": {
    "zh-Hant": "顯示",
    "zh-Hans": "显示",
    "en": "Show",
  },
  "common.refresh": {
    "zh-Hant": "重新整理",
    "zh-Hans": "刷新",
    "en": "Refresh",
  },
  "common.optional": {
    "zh-Hant": "選填",
    "zh-Hans": "选填",
    "en": "Optional",
  },
  "common.name": {
    "zh-Hant": "名稱",
    "zh-Hans": "名称",
    "en": "Name",
  },
  "common.loading": {
    "zh-Hant": "載入中",
    "zh-Hans": "加载中",
    "en": "Loading",
  },
  "common.loadingEllipsis": {
    "zh-Hant": "載入中…",
    "zh-Hans": "加载中…",
    "en": "Loading…",
  },
  "common.done": {
    "zh-Hant": "完成",
    "zh-Hans": "完成",
    "en": "Done",
  },
  "common.next": {
    "zh-Hant": "下一步",
    "zh-Hans": "下一步",
    "en": "Next",
  },
  "common.import": {
    "zh-Hant": "匯入",
    "zh-Hans": "导入",
    "en": "Import",
  },
  "common.create": {
    "zh-Hant": "建立",
    "zh-Hans": "创建",
    "en": "Create",
  },
  "common.saveName": {
    "zh-Hant": "儲存名稱",
    "zh-Hans": "保存名称",
    "en": "Save name",
  },
  "common.return": {
    "zh-Hant": "返回",
    "zh-Hans": "返回",
    "en": "Back",
  },
  "common.version": {
    "zh-Hant": "版本",
    "zh-Hans": "版本",
    "en": "Version",
  },
  "common.address": {
    "zh-Hant": "地址",
    "zh-Hans": "地址",
    "en": "Address",
  },
  "common.path": {
    "zh-Hant": "路徑",
    "zh-Hans": "路径",
    "en": "Path",
  },
  "common.members": {
    "zh-Hant": "成員",
    "zh-Hans": "成员",
    "en": "Members",
  },
  "common.current": {
    "zh-Hant": "目前",
    "zh-Hans": "当前",
    "en": "Current",
  },
  "common.currentWallet": {
    "zh-Hant": "目前錢包",
    "zh-Hans": "当前钱包",
    "en": "Current wallet",
  },
  "common.setAsCurrentWallet": {
    "zh-Hant": "設為目前錢包",
    "zh-Hans": "设为当前钱包",
    "en": "Set as current wallet",
  },
  "accounts.changeCurrentWallet": {
    "zh-Hant": "切換目前錢包",
    "zh-Hans": "切换当前钱包",
    "en": "Change current wallet",
  },
  "common.localAccounts": {
    "zh-Hant": "本機帳戶",
    "zh-Hans": "本地账户",
    "en": "Local accounts",
  },
  "common.allDisconnect": {
    "zh-Hant": "全部斷開",
    "zh-Hans": "全部断开",
    "en": "Disconnect all",
  },
  "common.tokens": {
    "zh-Hant": "代幣",
    "zh-Hans": "代币",
    "en": "Tokens",
  },
  "common.activity": {
    "zh-Hant": "活動",
    "zh-Hans": "活动",
    "en": "Activity",
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
  "copy.copied": {
    "zh-Hant": "已複製",
    "zh-Hans": "已复制",
    "en": "Copied",
  },
  "error.generic": {
    "zh-Hant": "發生錯誤，請稍後再試",
    "zh-Hans": "发生错误，请稍后再试",
    "en": "Something went wrong. Try again later.",
  },
  "error.rpcRateLimit": {
    "zh-Hant": "RPC 速率限制，請稍後再試",
    "zh-Hans": "RPC 速率限制，请稍后再试",
    "en": "RPC rate limit. Try again later.",
  },
  "error.rpcRequestFailed": {
    "zh-Hant": "RPC 請求失敗，請稍後再試",
    "zh-Hans": "RPC 请求失败，请稍后再试",
    "en": "RPC request failed. Try again later.",
  },
  "error.code.HOLDINGS_LOAD_FAILED": {
    "zh-Hant": "無法載入持倉",
    "zh-Hans": "无法加载持仓",
    "en": "Could not load holdings",
  },
  "error.code.JUPITER_REFRESH_FAILED": {
    "zh-Hant": "Jupiter 資料更新失敗",
    "zh-Hans": "Jupiter 数据更新失败",
    "en": "Jupiter refresh failed",
  },
  "error.code.CANCELLED": {
    "zh-Hant": "已取消",
    "zh-Hans": "已取消",
    "en": "Cancelled",
  },
  "error.code.TX_UNPARSEABLE": {
    "zh-Hant": "無法解析交易",
    "zh-Hans": "无法解析交易",
    "en": "Could not parse transaction",
  },
  "error.code.SIM_TIMEOUT": {
    "zh-Hant": "逾時",
    "zh-Hans": "超时",
    "en": "Timed out",
  },
  "error.code.SIM_RPC": {
    "zh-Hant": "RPC 錯誤",
    "zh-Hans": "RPC 错误",
    "en": "RPC error",
  },
  "error.code.ALT_LOAD_FAILED": {
    "zh-Hant": "無法載入 address lookup table",
    "zh-Hans": "无法加载 address lookup table",
    "en": "Could not load address lookup table",
  },
  "error.code.ACCOUNTS_LOAD_FAILED": {
    "zh-Hant": "無法載入帳戶",
    "zh-Hans": "无法加载账户",
    "en": "Could not load accounts",
  },
  "error.code.SEND_TX_INVALID": {
    "zh-Hant": "交易無效",
    "zh-Hans": "交易无效",
    "en": "Invalid transaction",
  },
  "error.code.SEND_CONFIRM_TIMEOUT": {
    "zh-Hant": "確認逾時，可再按批准重試",
    "zh-Hans": "确认超时，可再按批准重试",
    "en": "Confirmation timed out. Approve again to retry.",
  },
  "error.code.SEND_BROADCAST_FAILED": {
    "zh-Hant": "送出失敗",
    "zh-Hans": "发送失败",
    "en": "Send failed",
  },
  "error.code.SEND_CHAIN_FAILED": {
    "zh-Hant": "鏈上確認失敗",
    "zh-Hans": "链上确认失败",
    "en": "On-chain confirmation failed",
  },
  "error.code.SEND_BLOCKHASH_EXPIRED": {
    "zh-Hant": "Blockhash 已過期，請拒絕後重試",
    "zh-Hans": "Blockhash 已过期，请拒绝后重试",
    "en": "Blockhash expired. Reject and try again.",
  },
  "error.code.SEND_CONFIRM_FAILED": {
    "zh-Hant": "確認失敗",
    "zh-Hans": "确认失败",
    "en": "Confirmation failed",
  },
  "error.code.CLOSE_EMPTY_SCAN_FAILED": {
    "zh-Hant": "掃描失敗",
    "zh-Hans": "扫描失败",
    "en": "Scan failed",
  },
  "error.code.CLOSE_EMPTY_CU_FAILED": {
    "zh-Hant": "無法估算 CU",
    "zh-Hans": "无法估算 CU",
    "en": "Could not estimate CU",
  },
  "error.code.CLOSE_EMPTY_STALE_LIST": {
    "zh-Hant": "清單已過期",
    "zh-Hans": "清单已过期",
    "en": "List expired",
  },
  "error.code.STALE_LIST": {
    "zh-Hant": "清單已過期",
    "zh-Hans": "清单已过期",
    "en": "List expired",
  },
  "error.code.CU_WRITE_FAILED": {
    "zh-Hant": "無法寫入計算預算",
    "zh-Hans": "无法写入计算预算",
    "en": "Could not write compute budget",
  },
  "error.code.SIM_INCOMPLETE_DELTAS": {
    "zh-Hant": "模擬結果缺少餘額欄位",
    "zh-Hans": "模拟结果缺少余额字段",
    "en": "Simulation missing balance fields",
  },
  "error.code.MISSING_REQUEST_ID": {
    "zh-Hant": "缺少 requestId",
    "zh-Hans": "缺少 requestId",
    "en": "Missing requestId",
  },
  "error.code.INVALID_PASSWORD": {
    "zh-Hant": "密碼錯誤",
    "zh-Hans": "密码错误",
    "en": "Wrong password",
  },
  "error.code.WEAK_PASSWORD": {
    "zh-Hant": "新密碼過短",
    "zh-Hans": "新密码过短",
    "en": "New password too short",
  },
  "error.code.WALLET_LOCKED": {
    "zh-Hant": "請先解鎖錢包",
    "zh-Hans": "请先解锁钱包",
    "en": "Unlock wallet first",
  },
  "error.code.BROADCAST_UNCONFIRMED": {
    "zh-Hant": "已送出、確認未知",
    "zh-Hans": "已发送、确认未知",
    "en": "Sent; confirmation unknown",
  },
  "error.code.INVALID_ADDRESS": {
    "zh-Hant": "地址無效",
    "zh-Hans": "地址无效",
    "en": "Invalid address",
  },
  "error.code.INVALID_PAYLOAD": {
    "zh-Hant": "數量或代幣資料無效",
    "zh-Hans": "数量或代币数据无效",
    "en": "Invalid amount or token data",
  },
  "error.code.INSUFFICIENT_FUNDS": {
    "zh-Hant": "餘額不足",
    "zh-Hans": "余额不足",
    "en": "Insufficient funds",
  },
  "error.passwordTooShort": {
    "zh-Hant": "密碼至少 8 字",
    "zh-Hans": "密码至少 8 字",
    "en": "Password must be at least 8 characters",
  },
  "error.passwordMismatch": {
    "zh-Hant": "密碼不一致",
    "zh-Hans": "密码不一致",
    "en": "Passwords do not match",
  },
  "error.passwordNewMismatch": {
    "zh-Hant": "新密碼不一致",
    "zh-Hans": "新密码不一致",
    "en": "New passwords do not match",
  },
  "error.saveRpcFailed": {
    "zh-Hant": "儲存 RPC 失敗",
    "zh-Hans": "保存 RPC 失败",
    "en": "Could not save RPC",
  },
  "error.saveSettingsFailed": {
    "zh-Hant": "儲存設定失敗",
    "zh-Hans": "保存设置失败",
    "en": "Could not save settings",
  },
  "error.changePasswordFailed": {
    "zh-Hant": "變更失敗",
    "zh-Hans": "变更失败",
    "en": "Change failed",
  },
  "error.invalidRpcUrl": {
    "zh-Hant": "請輸入有效的 https RPC URL",
    "zh-Hans": "请输入有效的 https RPC URL",
    "en": "Enter a valid https RPC URL",
  },
  "error.unrecognizedSecret": {
    "zh-Hant": "無法辨識",
    "zh-Hans": "无法识别",
    "en": "Unrecognized",
  },
  "error.importFailed": {
    "zh-Hant": "匯入失敗",
    "zh-Hans": "导入失败",
    "en": "Import failed",
  },
  "error.createFailed": {
    "zh-Hant": "建立失敗",
    "zh-Hans": "创建失败",
    "en": "Create failed",
  },
  "error.unlockFailed": {
    "zh-Hant": "解鎖失敗",
    "zh-Hans": "解锁失败",
    "en": "Unlock failed",
  },
  "error.invalidAddress": {
    "zh-Hant": "地址無效",
    "zh-Hans": "地址无效",
    "en": "Invalid address",
  },
  "error.addFailed": {
    "zh-Hant": "新增失敗",
    "zh-Hans": "新增失败",
    "en": "Could not add",
  },
  "error.switchFailed": {
    "zh-Hant": "切換失敗",
    "zh-Hans": "切换失败",
    "en": "Could not switch",
  },
  "error.renameFailed": {
    "zh-Hant": "重新命名失敗",
    "zh-Hans": "重命名失败",
    "en": "Rename failed",
  },
  "error.deleteFailed": {
    "zh-Hant": "刪除失敗",
    "zh-Hans": "删除失败",
    "en": "Could not delete",
  },
  "error.removeFailed": {
    "zh-Hant": "移除失敗",
    "zh-Hans": "移除失败",
    "en": "Could not remove",
  },
  "error.exportFailed": {
    "zh-Hant": "無法匯出",
    "zh-Hans": "无法导出",
    "en": "Could not export",
  },
  "error.disconnectFailed": {
    "zh-Hant": "斷開失敗",
    "zh-Hans": "断开失败",
    "en": "Could not disconnect",
  },
  "error.minOneAddress": {
    "zh-Hant": "至少一個有效地址",
    "zh-Hans": "至少一个有效地址",
    "en": "At least one valid address",
  },
  "error.previewFailed": {
    "zh-Hant": "預覽失敗",
    "zh-Hans": "预览失败",
    "en": "Preview failed",
  },
  "error.genericFailed": {
    "zh-Hant": "失敗",
    "zh-Hans": "失败",
    "en": "Failed",
  },
  "error.sendBuildFailed": {
    "zh-Hant": "無法建立交易",
    "zh-Hans": "无法创建交易",
    "en": "Could not build transaction",
  },
  "error.sendFailed": {
    "zh-Hant": "送出失敗",
    "zh-Hans": "发送失败",
    "en": "Send failed",
  },
  "error.planFailed": {
    "zh-Hant": "無法建立計畫",
    "zh-Hans": "无法创建计划",
    "en": "Could not create plan",
  },
  "error.tokenNotFound": {
    "zh-Hant": "找不到此代幣，請返回重試。",
    "zh-Hans": "找不到此代币，请返回重试。",
    "en": "Token not found. Go back and try again.",
  },
  "error.accountNotFound": {
    "zh-Hant": "找不到帳戶",
    "zh-Hans": "找不到账户",
    "en": "Account not found",
  },
  "error.activityLoad": {
    "zh-Hant": "活動暫時無法載入",
    "zh-Hans": "活动暂时无法加载",
    "en": "Activity unavailable",
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
  "about.disclaimer": {
    "zh-Hant": "免責聲明",
    "zh-Hans": "免责声明",
    "en": "Disclaimer",
  },
  "about.terms": {
    "zh-Hant": "使用條款",
    "zh-Hans": "使用条款",
    "en": "Terms of use",
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
  "accounts.removeMemberConfirm": {
    "zh-Hant": "確定移除此成員地址？",
    "zh-Hans": "确定移除此成员地址？",
    "en": "Remove this member address?",
  },
  "accounts.currentWalletAddress": {
    "zh-Hant": "目前錢包地址",
    "zh-Hans": "当前钱包地址",
    "en": "Current wallet address",
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
    "zh-Hant": " · 目前錢包",
    "zh-Hans": " · 当前钱包",
    "en": " · Current wallet",
  },
  "accounts.copyPrivateKey": {
    "zh-Hant": "複製私鑰",
    "zh-Hans": "复制私钥",
    "en": "Copy private key",
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
  "activity.when.justNow": {
    "zh-Hant": "剛剛",
    "zh-Hans": "刚刚",
    "en": "Just now",
  },
  "activity.when.minutesAgo": {
    "zh-Hant": "{min} 分鐘前",
    "zh-Hans": "{min} 分钟前",
    "en": "{min} min ago",
  },
  "activity.when.hoursAgo": {
    "zh-Hant": "{hr} 小時前",
    "zh-Hans": "{hr} 小时前",
    "en": "{hr} hr ago",
  },
  "activity.when.yesterday": {
    "zh-Hant": "昨天",
    "zh-Hans": "昨天",
    "en": "Yesterday",
  },
  "activity.when.daysAgo": {
    "zh-Hant": "{days} 天前",
    "zh-Hans": "{days} 天前",
    "en": "{days} days ago",
  },
  "activity.when.weeksAgo": {
    "zh-Hant": "{weeks} 週前",
    "zh-Hans": "{weeks} 周前",
    "en": "{weeks} wk ago",
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
  "approval.confirming": {
    "zh-Hant": "確認中",
    "zh-Hans": "确认中",
    "en": "Confirming",
  },
  "approval.waitingChain": {
    "zh-Hant": "等待鏈上確認",
    "zh-Hans": "等待链上确认",
    "en": "Waiting for confirmation",
  },
  "approval.signTx": {
    "zh-Hant": "簽署交易",
    "zh-Hans": "签署交易",
    "en": "Sign transaction",
  },
  "approval.signMsg": {
    "zh-Hant": "簽署訊息",
    "zh-Hans": "签署消息",
    "en": "Sign message",
  },
  "approval.approved": {
    "zh-Hant": "已確認",
    "zh-Hans": "已确认",
    "en": "Confirmed",
  },
  "approval.sendFailedTitle": {
    "zh-Hant": "交易失敗",
    "zh-Hans": "交易失败",
    "en": "Transaction failed",
  },
  "approval.sendNotLanded": {
    "zh-Hant": "未上鏈：RPC preflight 拒絕此交易",
    "zh-Hans": "未上链：RPC preflight 拒绝此交易",
    "en": "Did not land: RPC preflight rejected this transaction",
  },
  "approval.sendLandedFailed": {
    "zh-Hant": "已送出，鏈上執行失敗",
    "zh-Hans": "已送出，链上执行失败",
    "en": "Sent, then failed on-chain",
  },
  "approval.reviewTx": {
    "zh-Hant": "回顧交易",
    "zh-Hans": "回顾交易",
    "en": "Review transaction",
  },
  "approval.retrySend": {
    "zh-Hant": "重試",
    "zh-Hans": "重试",
    "en": "Retry",
  },
  "approval.exitSend": {
    "zh-Hant": "離開",
    "zh-Hans": "离开",
    "en": "Exit",
  },
  "approval.expired": {
    "zh-Hant": "請求已過期",
    "zh-Hans": "请求已过期",
    "en": "Request expired",
  },
  "approval.review": {
    "zh-Hant": "審批",
    "zh-Hans": "审批",
    "en": "Review",
  },
  "approval.legacyTitle": {
    "zh-Hant": "審批請求",
    "zh-Hans": "审批请求",
    "en": "Approval request",
  },
  "approval.approve": {
    "zh-Hant": "批准",
    "zh-Hans": "批准",
    "en": "Approve",
  },
  "approval.approving": {
    "zh-Hant": "批准中",
    "zh-Hans": "批准中",
    "en": "Approving",
  },
  "approval.reject": {
    "zh-Hant": "拒絕",
    "zh-Hans": "拒绝",
    "en": "Reject",
  },
  "approval.site": {
    "zh-Hant": "站點",
    "zh-Hans": "站点",
    "en": "Site",
  },
  "approval.connectLead": {
    "zh-Hant": "這個網站想連線到你的錢包",
    "zh-Hans": "这个网站想连接到你的钱包",
    "en": "This site wants to connect to your wallet",
  },
  "page.connect": {
    "zh-Hant": "連線",
    "zh-Hans": "连接",
    "en": "Connect",
  },
  "approval.cannotSignTxAsMsg": {
    "zh-Hant": "不能把交易當成訊息簽署。",
    "zh-Hans": "不能把交易当成消息签署。",
    "en": "Cannot sign a transaction as a message.",
  },
  "approval.goneTx": {
    "zh-Hant": "這筆交易已不能簽署。",
    "zh-Hans": "这笔交易已不能签署。",
    "en": "This transaction can no longer be signed.",
  },
  "approval.goneMsg": {
    "zh-Hant": "這筆訊息已不能簽署。",
    "zh-Hans": "这条消息已不能签署。",
    "en": "This message can no longer be signed.",
  },
  "approval.goneGeneric": {
    "zh-Hant": "這筆請求已不能繼續。",
    "zh-Hans": "这笔请求已不能继续。",
    "en": "This request can no longer continue.",
  },
  "approval.expectedDelta": {
    "zh-Hant": "預期變動",
    "zh-Hans": "预期变动",
    "en": "Expected changes",
  },
  "approval.retrySim": {
    "zh-Hant": "重新查詢",
    "zh-Hans": "重新查询",
    "en": "Retry",
  },
  "approval.simExplorer": {
    "zh-Hant": "在 Explorer 模擬",
    "zh-Hans": "在 Explorer 模拟",
    "en": "Simulate in Explorer",
  },
  "approval.querying": {
    "zh-Hant": "查詢中",
    "zh-Hans": "查询中",
    "en": "Querying",
  },
  "approval.cannotEstimateDelta": {
    "zh-Hant": "無法估計變動",
    "zh-Hans": "无法估计变动",
    "en": "Cannot estimate changes",
  },
  "approval.noBalanceChange": {
    "zh-Hant": "無餘額變動",
    "zh-Hans": "无余额变动",
    "en": "No balance change",
  },
  "approval.txFee": {
    "zh-Hant": "交易費",
    "zh-Hans": "交易费",
    "en": "Transaction fee",
  },
  "approval.estimating": {
    "zh-Hant": "估計中",
    "zh-Hans": "估计中",
    "en": "Estimating",
  },
  "approval.unknown": {
    "zh-Hant": "未知",
    "zh-Hans": "未知",
    "en": "Unknown",
  },
  "approval.sigFeeCu": {
    "zh-Hant": "簽名費 · CU",
    "zh-Hans": "签名费 · CU",
    "en": "Signature fee · CU",
  },
  "approval.sigFee": {
    "zh-Hant": "簽名費",
    "zh-Hans": "签名费",
    "en": "Signature fee",
  },
  "approval.priorityFee": {
    "zh-Hant": "優先費",
    "zh-Hans": "优先费",
    "en": "Priority fee",
  },
  "approval.cuApplying": {
    "zh-Hant": "套用中",
    "zh-Hans": "应用中",
    "en": "Applying",
  },
  "approval.cuApply": {
    "zh-Hant": "套用 CU",
    "zh-Hans": "应用 CU",
    "en": "Apply CU",
  },
  "approval.cuCannotApply": {
    "zh-Hant": "無法套用",
    "zh-Hans": "无法应用",
    "en": "Cannot apply",
  },
  "approval.cuApplied": {
    "zh-Hant": "已套用",
    "zh-Hans": "已应用",
    "en": "Applied",
  },
  "approval.txDetailsIx": {
    "zh-Hant": "交易明細 · 指令",
    "zh-Hans": "交易明细 · 指令",
    "en": "Details · instructions",
  },
  "approval.cannotListIx": {
    "zh-Hant": "無法列出指令",
    "zh-Hans": "无法列出指令",
    "en": "Cannot list instructions",
  },
  "approval.feePayer": {
    "zh-Hant": "費用付款人 {payer}",
    "zh-Hans": "费用付款人 {payer}",
    "en": "Fee payer {payer}",
  },
  "approval.rawTx": {
    "zh-Hant": "原始交易",
    "zh-Hans": "原始交易",
    "en": "Raw transaction",
  },
  "approval.emptyData": {
    "zh-Hant": "（空）",
    "zh-Hans": "（空）",
    "en": "(empty)",
  },
  "approval.accountMissing": {
    "zh-Hant": "找不到簽名帳戶",
    "zh-Hans": "找不到签名账户",
    "en": "Signing account not found",
  },
  "sim.cannotSimulate": {
    "zh-Hant": "無法模擬",
    "zh-Hans": "无法模拟",
    "en": "Cannot simulate",
  },
  "sim.willFail": {
    "zh-Hant": "預計交易失敗",
    "zh-Hans": "预计交易失败",
    "en": "Transaction likely to fail",
  },
  "sim.failDetails": {
    "zh-Hant": "失敗詳情",
    "zh-Hans": "失败详情",
    "en": "Failure details",
  },
  "ix.unresolved": {
    "zh-Hant": "未解析",
    "zh-Hans": "未解析",
    "en": "Unresolved",
  },
  "ix.role.from": {
    "zh-Hant": "來源",
    "zh-Hans": "来源",
    "en": "From",
  },
  "ix.role.to": {
    "zh-Hant": "收款",
    "zh-Hans": "收款",
    "en": "To",
  },
  "ix.role.authority": {
    "zh-Hant": "授權",
    "zh-Hans": "授权",
    "en": "Authority",
  },
  "ix.role.amount": {
    "zh-Hant": "數量",
    "zh-Hans": "数量",
    "en": "Amount",
  },
  "ix.role.lamports": {
    "zh-Hant": "lamports",
    "zh-Hans": "lamports",
    "en": "lamports",
  },
  "ix.role.mint": {
    "zh-Hant": "mint",
    "zh-Hans": "mint",
    "en": "mint",
  },
  "ix.role.decimals": {
    "zh-Hant": "decimals",
    "zh-Hans": "decimals",
    "en": "decimals",
  },
  "ix.role.payer": {
    "zh-Hant": "付款",
    "zh-Hans": "付款",
    "en": "Payer",
  },
  "ix.role.account": {
    "zh-Hant": "帳戶",
    "zh-Hans": "账户",
    "en": "Account",
  },
  "ix.role.wallet": {
    "zh-Hant": "錢包",
    "zh-Hans": "钱包",
    "en": "Wallet",
  },
  "ix.role.content": {
    "zh-Hant": "內容",
    "zh-Hans": "内容",
    "en": "Content",
  },
  "ix.role.units": {
    "zh-Hant": "單位",
    "zh-Hans": "单位",
    "en": "Units",
  },
  "ix.role.unitPrice": {
    "zh-Hant": "單價",
    "zh-Hans": "单价",
    "en": "Unit price",
  },
  "ix.system.transfer": {
    "zh-Hant": "轉移 SOL",
    "zh-Hans": "转移 SOL",
    "en": "Transfer SOL",
  },
  "ix.computeBudget.setLimit": {
    "zh-Hant": "設定計算單位上限",
    "zh-Hans": "设定计算单位上限",
    "en": "Set compute unit limit",
  },
  "ix.computeBudget.setPrice": {
    "zh-Hant": "設定優先費單價",
    "zh-Hans": "设定优先费单价",
    "en": "Set priority fee",
  },
  "ix.token.transfer": {
    "zh-Hant": "轉移代幣",
    "zh-Hans": "转移代币",
    "en": "Transfer token",
  },
  "ix.ata.create": {
    "zh-Hant": "建立關聯代幣帳戶",
    "zh-Hans": "建立关联代币账户",
    "en": "Create associated token account",
  },
  "ix.memo": {
    "zh-Hant": "Memo",
    "zh-Hans": "Memo",
    "en": "Memo",
  },
} as const satisfies Record<string, Record<UiLocale, string>>;

export type MessageKey = keyof typeof messages;
export { messages };