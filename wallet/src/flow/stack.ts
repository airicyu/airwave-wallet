/**
 * Logical flow stack helpers. Navigation owns mount/transition; this file
 * only pushes and pops entries. Does not render pages or talk to chrome.
 */
import type { FlowEntry } from "./types";

export function pushFlow(stack: FlowEntry[], entry: FlowEntry): FlowEntry[] {
  const rest = stack.filter((e) => e.requestId !== entry.requestId);
  return [...rest, entry];
}

export function popFlow(stack: FlowEntry[]): FlowEntry[] {
  if (stack.length === 0) return stack;
  return stack.slice(0, -1);
}

export function topFlow(stack: FlowEntry[]): FlowEntry | null {
  return stack.length === 0 ? null : stack[stack.length - 1]!;
}
