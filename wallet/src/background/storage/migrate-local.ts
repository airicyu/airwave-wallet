/**
 * Runs ordered chrome.storage.local schema steps on service-worker startup.
 * Does not re-encrypt the vault blob or migrate chrome.storage.session.
 */
import { CURRENT_SCHEMA_GENERATION, STORAGE } from "../../shared/storage-keys";

let migrateGate: Promise<void> | null = null;

function readGeneration(raw: unknown): number {
  if (typeof raw === "number" && Number.isInteger(raw) && raw >= 0) return raw;
  return 0;
}

/** 0 → 1: stamp generation only. Leaves settings, accounts, vault, connections untouched. */
async function migrate0to1(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE.schemaGeneration]: 1 });
}

async function runLocalMigration(): Promise<void> {
  const got = await chrome.storage.local.get(STORAGE.schemaGeneration);
  let from = readGeneration(got[STORAGE.schemaGeneration]);
  if (from > CURRENT_SCHEMA_GENERATION) return;
  while (from < CURRENT_SCHEMA_GENERATION) {
    if (from === 0) {
      await migrate0to1();
      from = 1;
      continue;
    }
    throw new Error("STORAGE_MIGRATION_FAILED");
  }
}

export function ensureLocalMigrated(): Promise<void> {
  if (!migrateGate) {
    migrateGate = runLocalMigration().catch((err: unknown) => {
      migrateGate = null;
      throw err;
    });
  }
  return migrateGate;
}
