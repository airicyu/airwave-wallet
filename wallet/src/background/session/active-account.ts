/**
 * This file reads the active account id from storage and returns that account record. Callers that need the current account use this instead of repeating the lookup.
 */
import type { AccountMeta } from "../../shared/protocol";
import { readAccounts, readActiveAccountId } from "../storage";

export async function getActiveAccountMeta(): Promise<AccountMeta | null> {
  const accounts = await readAccounts();
  const activeId = await readActiveAccountId();
  if (!activeId) return null;
  return accounts.find((a) => a.id === activeId) ?? null;
}
