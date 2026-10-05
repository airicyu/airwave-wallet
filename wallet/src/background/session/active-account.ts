import type { AccountMeta } from "../../shared/storage-keys";
import { readAccounts, readActiveAccountId } from "../storage";

export async function getActiveAccountMeta(): Promise<AccountMeta | null> {
  const accounts = await readAccounts();
  const activeId = await readActiveAccountId();
  if (!activeId) return null;
  return accounts.find((a) => a.id === activeId) ?? null;
}
