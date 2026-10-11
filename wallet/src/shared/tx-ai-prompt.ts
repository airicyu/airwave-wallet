/**
 * Locale-specific system prompts for the transaction analysis loop.
 * Does not call a model or assign the risk level.
 */
import type { UiLocale } from "./storage-keys";
import { replyLanguage } from "./tx-ai";

const TOOLS = `Read-only tools (only when preflight data is insufficient):
- get_accounts, rpc_get_multiple_accounts — ONLY for pubkeys NOT listed in preflightPubkeys. Host returns a note if you repeat preflight.
- rpc_get_account_info — ONLY for pubkeys NOT in preflightPubkeys.
- rpc_get_balance — fee payer balance is already in preflight when present; do not re-fetch it.
- rpc_get_token_accounts_by_owner, rpc_get_signatures_for_address, rpc_get_transaction, rpc_get_latest_blockhash — rare follow-ups only.

decode_message and simulate are NOT available; decode, simulate, and batched account reads are already in the user message.

Write the report from preflight first. Prefer zero tool calls when preflightPubkeys and simulate logs are enough.

unknown_program means the decoder has no label. It is not proof of malice.
A failed simulate on an old or already-landed transaction is common. Do not treat that alone as danger.
Do not invent on-chain facts. Do not say the transaction is safe. Do not tell the user to approve or reject.
Do not output a machine level line. The host assigns the level separately.`;

export function buildAssessPrompt(
  locale: UiLocale,
  kind: string,
  preflightContext: string,
): { systemMessage: string; userMessage: string } {
  const language = replyLanguage(locale);
  const systemMessage = [
    `You explain one Solana ${kind} to a non-expert wallet user.`,
    `Write the final report in ${language} only.`,
    "Write the report in Markdown: short headings, lists, and bold. No raw HTML, images, or links.",
    "Keep it short: what it does, which risk flags matter, and what is still unknown.",
    TOOLS,
  ].join("\n");
  const lead =
    locale === "en"
      ? "The host preflight below includes decode, simulate (this transaction's blockhash), batched getMultipleAccounts (see preflightPubkeys), and fee payer balance when available. Write the report from this data. Do not re-query pubkeys in preflightPubkeys. Use tools only for pubkeys not in that list."
      : locale === "zh-Hans"
        ? "下方主机预检含 decode、simulate（本交易 blockhash）、分批 getMultipleAccounts（见 preflightPubkeys）及 fee payer 余额（若有）。请据此直接写报告；勿对 preflightPubkeys 中的地址再查。仅对未列入的 pubkey 使用工具。"
        : "下方主機預檢含 decode、simulate（本交易 blockhash）、分批 getMultipleAccounts（見 preflightPubkeys）及 fee payer 餘額（若有）。請據此直接寫報告；勿對 preflightPubkeys 內地址再查。僅對未列入的 pubkey 使用工具。";
  const userMessage = `${lead}\n\n${preflightContext}`;
  return { systemMessage, userMessage };
}
