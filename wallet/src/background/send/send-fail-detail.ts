/**
 * Pulls RPC preflight / Kit error `err` + program logs into a display string.
 * Does not broadcast progress or confirm signatures.
 */

const DETAIL_MAX = 8000;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function stringifyPart(value: unknown): string {
  try {
    const text = JSON.stringify(value, null, 2);
    return text && text !== "{}" ? text : "";
  } catch {
    return String(value);
  }
}

function collectLogs(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const lines = value.filter((line): line is string => typeof line === "string");
  if (!lines.length) return undefined;
  return lines.length <= 20 ? lines : lines.slice(-20);
}

export function formatSendFailureDetail(error: unknown): string {
  let txErr: unknown;
  let logs: string[] | undefined;
  const messages: string[] = [];
  const seen = new Set<unknown>();

  const walk = (node: unknown, depth: number): void => {
    if (node == null || depth > 6) return;
    if (typeof node === "string") {
      if (
        node &&
        !node.includes("npx @solana/errors") &&
        !node.startsWith("Solana error #") &&
        !messages.includes(node)
      ) {
        messages.push(node);
      }
      return;
    }
    if (typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);
    if (node instanceof Error) {
      walk(node.message, depth + 1);
      walk((node as Error & { cause?: unknown }).cause, depth + 1);
      walk((node as Error & { context?: unknown }).context, depth + 1);
      return;
    }
    const rec = asRecord(node);
    if (!rec) return;
    if (txErr == null && rec.err != null) txErr = rec.err;
    if (txErr == null && rec.instructionError != null) txErr = rec.instructionError;
    if (txErr == null && rec.transactionError != null) txErr = rec.transactionError;
    if (!logs) logs = collectLogs(rec.logs);
    walk(rec.data, depth + 1);
    walk(rec.context, depth + 1);
    walk(rec.cause, depth + 1);
    walk(rec.error, depth + 1);
    walk(rec.transactionError, depth + 1);
    if (typeof rec.message === "string") walk(rec.message, depth + 1);
  };

  walk(error, 0);

  const parts: string[] = [];
  const errText = txErr != null ? stringifyPart(txErr) : "";
  if (errText) parts.push(errText);
  if (logs?.length) parts.push(logs.join("\n"));
  if (!parts.length && messages.length) parts.push(messages[0]);
  if (!parts.length && error instanceof Error && error.message) parts.push(error.message);
  return parts.join("\n\n").slice(0, DETAIL_MAX);
}
