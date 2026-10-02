import { Keypair } from "@solana/web3.js";
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { derivePath } from "ed25519-hd-key";

export type SeedPathKind = "phantom" | "cli" | "change" | "custom";

export const SEED_PREVIEW_COUNT = 20;

export function normalizeMnemonic(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

export function createEnglishMnemonic12(): string {
  return generateMnemonic(wordlist, 128);
}

export function parseMnemonic(raw: string): string {
  const mnemonic = normalizeMnemonic(raw);
  const words = mnemonic.split(" ");
  if (words.length !== 12 && words.length !== 24) {
    throw new Error("INVALID_MNEMONIC");
  }
  if (!validateMnemonic(mnemonic, wordlist)) {
    throw new Error("INVALID_MNEMONIC");
  }
  return mnemonic;
}

export function pathTemplate(kind: SeedPathKind, customPath?: string): string {
  if (kind === "phantom") return "m/44'/501'/{n}'/0'";
  if (kind === "cli") return "m/44'/501'/{n}'";
  if (kind === "change") return "m/44'/501'/0'/{n}'";
  const t = (customPath ?? "").trim();
  if (!t.includes("{n}")) throw new Error("INVALID_PATH");
  return t;
}

export function pathForIndex(kind: SeedPathKind, index: number, customPath?: string): string {
  return pathTemplate(kind, customPath).replaceAll("{n}", String(index));
}

export function keypairFromMnemonic(
  mnemonic: string,
  kind: SeedPathKind,
  index: number,
  customPath?: string,
): Keypair {
  const path = pathForIndex(kind, index, customPath);
  try {
    const seed = mnemonicToSeedSync(mnemonic);
    const hex = Array.from(seed, (b) => b.toString(16).padStart(2, "0")).join("");
    const { key } = derivePath(path, hex);
    return Keypair.fromSeed(Uint8Array.from(key));
  } catch {
    throw new Error("INVALID_PATH");
  }
}
