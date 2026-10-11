/**
 * Locale-specific system prompts for the transaction analysis loop.
 * Does not call a model or assign the risk level.
 */
import type { UiLocale } from "./storage-keys";
import { replyLanguage } from "./tx-ai";

const TOOLS = `Read-only tools (call decode_message first):
- decode_message
- get_accounts
- simulate
- rpc_get_balance, rpc_get_account_info, rpc_get_multiple_accounts
- rpc_get_token_accounts_by_owner, rpc_get_signatures_for_address
- rpc_get_transaction, rpc_get_latest_blockhash

unknown_program means the decoder has no label. It is not proof of malice.
A failed simulate on an old or already-landed transaction is common. Do not treat that alone as danger.
Do not invent on-chain facts. Do not say the transaction is safe. Do not tell the user to approve or reject.
Do not output a machine level line. The host assigns the level separately.`;

export function buildAssessPrompt(locale: UiLocale, kind: string): { systemMessage: string; userMessage: string } {
  const language = replyLanguage(locale);
  const systemMessage = [
    `You explain one Solana ${kind} to a non-expert wallet user.`,
    `Write the final report in ${language} only.`,
    "Write the report in Markdown: short headings, lists, and bold. No raw HTML, images, or links.",
    "Keep it short: what it does, which risk flags matter, and what is still unknown.",
    TOOLS,
  ].join("\n");
  const userMessage =
    locale === "en"
      ? "Inspect this pending transaction with the tools, then write the report."
      : locale === "zh-Hans"
        ? "请用工具查看这笔待签交易，然后写出报告。"
        : "請用工具查看這筆待簽交易，然後寫出報告。";
  return { systemMessage, userMessage };
}
