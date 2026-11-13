/**
 * Shared labels, copy feedback, errors, and about copy.
 * The catalog entry is ui-messages.ts. Callers outside shared/i18n do not import this file.
 */
import type { UiLocale } from "../../protocol";

export const commonMessages = {
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
  "common.edit": {
    "zh-Hant": "編輯",
    "zh-Hans": "编辑",
    "en": "Edit",
  },
  "common.discard": {
    "zh-Hant": "捨棄",
    "zh-Hans": "舍弃",
    "en": "Discard",
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
    "zh-Hant": "主錢包",
    "zh-Hans": "主钱包",
    "en": "Main wallet",
  },
  "common.setAsCurrentWallet": {
    "zh-Hant": "設為主錢包",
    "zh-Hans": "设为主钱包",
    "en": "Set as main wallet",
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
    "zh-Hant": "資產",
    "zh-Hans": "资产",
    "en": "Assets",
  },
  "common.activity": {
    "zh-Hant": "活動",
    "zh-Hans": "活动",
    "en": "Activities",
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
  "error.code.MEMBER_NAME_LOCKED": {
    "zh-Hant": "此成員名稱跟本機帳戶",
    "zh-Hans": "此成员名称跟本机账户",
    "en": "This member name follows the local account",
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
  "error.code.MAINNET_RPC_UNSET": {
    "zh-Hant": "Mainnet 尚未設定 RPC",
    "zh-Hans": "Mainnet 尚未设置 RPC",
    "en": "Mainnet RPC is not set",
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
  "error.activityOlderLoad": {
    "zh-Hant": "更舊的活動這次沒載到",
    "zh-Hans": "更旧的活动这次没加载到",
    "en": "Couldn't load older activity",
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
  "about.privacy": {
    "zh-Hant": "隱私權政策",
    "zh-Hans": "隐私权政策",
    "en": "Privacy policy",
  },
} as const satisfies Record<string, Record<UiLocale, string>>;
