/**
 * Approval, instruction, sign, and simulation copy.
 * The catalog entry is ui-messages.ts. Callers outside shared/i18n do not import this file.
 */
import type { UiLocale } from "../../protocol";

export const approvalMessages = {
  "approval.txAi.running": {
    "zh-Hant": "AI 分析中",
    "zh-Hans": "AI 分析中",
    "en": "Analyzing",
  },
  "approval.txAi.stop": {
    "zh-Hant": "停止分析",
    "zh-Hans": "停止分析",
    "en": "Stop analysis",
  },
  "approval.txAi.rowLabel": {
    "zh-Hant": "AI分析",
    "zh-Hans": "AI分析",
    "en": "AI analysis",
  },
  "approval.txAi.riskIndex.low": {
    "zh-Hant": "風險指數: 低",
    "zh-Hans": "风险指数: 低",
    "en": "Risk index: Low",
  },
  "approval.txAi.riskIndex.watch": {
    "zh-Hant": "風險指數: 留意",
    "zh-Hans": "风险指数: 留意",
    "en": "Risk index: Watch",
  },
  "approval.txAi.riskIndex.high": {
    "zh-Hant": "風險指數: 高",
    "zh-Hans": "风险指数: 高",
    "en": "Risk index: High",
  },
  "approval.txAi.riskIndex.unknown": {
    "zh-Hant": "風險指數: 未知",
    "zh-Hans": "风险指数: 未知",
    "en": "Risk index: Unknown",
  },
  "approval.txAi.backToTop": {
    "zh-Hant": "回到頂部",
    "zh-Hans": "回到顶部",
    "en": "Back to top",
  },
  "approval.copySite": {
    "zh-Hant": "複製站點",
    "zh-Hans": "复制站点",
    "en": "Copy site",
  },
  "approval.txAi.level.low": {
    "zh-Hant": "等級低",
    "zh-Hans": "等级低",
    "en": "Low",
  },
  "approval.txAi.level.watch": {
    "zh-Hant": "留意",
    "zh-Hans": "留意",
    "en": "Watch",
  },
  "approval.txAi.level.high": {
    "zh-Hant": "等級高",
    "zh-Hans": "等级高",
    "en": "High",
  },
  "approval.txAi.level.unknown": {
    "zh-Hant": "尚無法判定",
    "zh-Hans": "尚无法判定",
    "en": "Unknown",
  },
  "approval.txAi.levelHint.low": {
    "zh-Hant": "未見權限外送",
    "zh-Hans": "未见权限外送",
    "en": "No privilege handoff seen",
  },
  "approval.txAi.levelHint.watch": {
    "zh-Hant": "有權限變更，請看報告",
    "zh-Hans": "有权限变更，请看报告",
    "en": "Privilege change — read the report",
  },
  "approval.txAi.levelHint.high": {
    "zh-Hant": "帳戶控制可能外流",
    "zh-Hans": "账户控制可能外流",
    "en": "Account control may leave you",
  },
  "approval.txAi.levelHint.unknown": {
    "zh-Hant": "資料不足或評估失敗",
    "zh-Hans": "资料不足或评估失败",
    "en": "Not enough data, or grading failed",
  },
  "approval.txAi.openReport": {
    "zh-Hant": "開啟分析報告",
    "zh-Hans": "开启分析报告",
    "en": "Open analysis",
  },
  "approval.txAi.closeReport": {
    "zh-Hant": "關閉分析報告",
    "zh-Hans": "关闭分析报告",
    "en": "Close analysis",
  },
  "approval.txAi.reportDisclaimer": {
    "zh-Hant": "以下為 AI 生成，僅供參考；請自行評估風險，本錢包不為此負責。",
    "zh-Hans": "以下为 AI 生成，仅供参考；请自行评估风险，本钱包不为此负责。",
    "en": "AI-generated for reference only. You accept the risk; this wallet is not liable.",
  },
  "approval.txAi.failed": {
    "zh-Hant": "分析沒有完成",
    "zh-Hans": "分析没有完成",
    "en": "Analysis did not finish",
  },
  "approval.txAi.rowTimedOut": {
    "zh-Hant": "分析逾時",
    "zh-Hans": "分析超时",
    "en": "Timed out",
  },
  "approval.txAi.reportEmpty": {
    "zh-Hant": "沒有可顯示的報告內容。",
    "zh-Hans": "没有可显示的报告内容。",
    "en": "No report content to show.",
  },
  "approval.txAi.reportTimeout": {
    "zh-Hant": "超過約 60 秒未完成，已停止。",
    "zh-Hans": "超过约 60 秒未完成，已停止。",
    "en": "Stopped after about 60 seconds.",
  },
  "approval.txAi.reportSlow": {
    "zh-Hant": "模型或網路過慢，分析未完成。",
    "zh-Hans": "模型或网络过慢，分析未完成。",
    "en": "Model or network was too slow.",
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
  "approval.signIn": {
    "zh-Hant": "登入",
    "zh-Hans": "登录",
    "en": "Sign in",
  },
  "sign.clusterMismatch.title": {
    "zh-Hant": "網路不符",
    "zh-Hans": "网络不符",
    "en": "Network mismatch",
  },
  "sign.clusterMismatch.devnetWallet": {
    "zh-Hant": "錢包目前是 Devnet，這筆交易的 blockhash 在 Mainnet 仍有效。",
    "zh-Hans": "钱包目前是 Devnet，这笔交易的 blockhash 在 Mainnet 仍有效。",
    "en": "This wallet is on Devnet. This transaction's blockhash is still valid on Mainnet.",
  },
  "sign.clusterMismatch.mainnetWallet": {
    "zh-Hant": "錢包目前是 Mainnet，這筆交易的 blockhash 在 Devnet 仍有效。",
    "zh-Hans": "钱包目前是 Mainnet，这笔交易的 blockhash 在 Devnet 仍有效。",
    "en": "This wallet is on Mainnet. This transaction's blockhash is still valid on Devnet.",
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
  "approval.connect": {
    "zh-Hant": "連線",
    "zh-Hans": "连接",
    "en": "Connect",
  },
  "approval.connecting": {
    "zh-Hant": "連線中",
    "zh-Hans": "连接中",
    "en": "Connecting",
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
