import {
  DEFAULT_SETTINGS,
  STORAGE,
  type AccountMeta,
  type ConnectionsMap,
  type Settings,
} from "../shared/storage-keys";
import type { VaultBlob } from "../shared/crypto-vault";

export async function readSettings(): Promise<Settings> {
  const r = await chrome.storage.local.get(STORAGE.settings);
  return (r[STORAGE.settings] as Settings | undefined) ?? { ...DEFAULT_SETTINGS };
}

export async function writeSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE.settings]: settings });
}

export async function readAccounts(): Promise<AccountMeta[]> {
  const r = await chrome.storage.local.get(STORAGE.accounts);
  return (r[STORAGE.accounts] as AccountMeta[] | undefined) ?? [];
}

export async function writeAccounts(accounts: AccountMeta[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE.accounts]: accounts });
}

export async function readActiveAccountId(): Promise<string | null> {
  const r = await chrome.storage.local.get(STORAGE.activeAccountId);
  return (r[STORAGE.activeAccountId] as string | undefined) ?? null;
}

export async function writeActiveAccountId(id: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE.activeAccountId]: id });
}

export async function clearActiveAccountId(): Promise<void> {
  await chrome.storage.local.remove(STORAGE.activeAccountId);
}

export async function readConnections(): Promise<ConnectionsMap> {
  const r = await chrome.storage.local.get(STORAGE.connections);
  return (r[STORAGE.connections] as ConnectionsMap | undefined) ?? {};
}

export async function writeConnections(map: ConnectionsMap): Promise<void> {
  await chrome.storage.local.set({ [STORAGE.connections]: map });
}

export async function readVaultBlob(): Promise<VaultBlob | null> {
  const r = await chrome.storage.local.get(STORAGE.vault);
  return (r[STORAGE.vault] as VaultBlob | undefined) ?? null;
}

export async function writeVaultBlob(blob: VaultBlob): Promise<void> {
  await chrome.storage.local.set({ [STORAGE.vault]: blob });
}

export async function getActivePublicKey(): Promise<string | null> {
  const accounts = await readAccounts();
  const activeId = await readActiveAccountId();
  const acc = accounts.find((a) => a.id === activeId);
  return acc?.publicKeyBase58 ?? null;
}
