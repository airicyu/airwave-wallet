/**
 * Fetches and parses getTokenAccountsByOwner JSON-RPC results into normalized SPL token account rows.
 * Does not close accounts, transfer tokens, or enrich mint icons.
 */
import { address } from "@solana/kit";
import type { TokenProgramKind } from "./home-tokens";
import { solanaRpcForUrl } from "./solana-rpc";

const LEGACY_TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

export type ParsedOwnerTokenAccount = {
  pubkey: string;
  lamports: bigint;
  mint: string;
  amount: string;
  decimals: number;
  owner: string;
  frozen: boolean;
  closeAuthority?: string;
  extensions?: unknown[];
  program: TokenProgramKind;
};

function parseTokenAccountValue(
  pubkey: string,
  lamports: bigint,
  program: TokenProgramKind,
  account: {
    data: { parsed?: { type?: string; info?: Record<string, unknown> } };
  },
): ParsedOwnerTokenAccount | null {
  const parsed = account.data.parsed;
  if (parsed?.type !== "account") return null;
  const info = parsed.info ?? {};
  const mint = typeof info.mint === "string" ? info.mint : "";
  const owner = typeof info.owner === "string" ? info.owner : "";
  const tokenAmount = info.tokenAmount as { amount?: string; decimals?: number } | undefined;
  const amount = tokenAmount?.amount ?? "";
  const decimals =
    typeof tokenAmount?.decimals === "number" && Number.isFinite(tokenAmount.decimals)
      ? tokenAmount.decimals
      : 0;
  const state = info.state as string | undefined;
  const frozen = state === "frozen";
  const closeAuthority =
    typeof info.closeAuthority === "string" ? info.closeAuthority : undefined;
  const extensions = Array.isArray(info.extensions) ? info.extensions : undefined;
  if (!mint || !owner) return null;
  return {
    pubkey,
    lamports,
    mint,
    amount,
    decimals,
    owner,
    frozen,
    closeAuthority,
    extensions,
    program,
  };
}

/** 對單一 owner 各 token program 掃一次（legacy + Token-2022）。 */
export async function fetchParsedTokenAccountsForOwner(
  rpcUrl: string,
  owner: string,
): Promise<ParsedOwnerTokenAccount[]> {
  const rpc = solanaRpcForUrl(rpcUrl);
  const pk = address(owner);
  const [legacy, token2022] = await Promise.all([
    rpc
      .getTokenAccountsByOwner(
        pk,
        { programId: address(LEGACY_TOKEN_PROGRAM) },
        { encoding: "jsonParsed", commitment: "confirmed" },
      )
      .send(),
    rpc
      .getTokenAccountsByOwner(
        pk,
        { programId: address(TOKEN_2022_PROGRAM) },
        { encoding: "jsonParsed", commitment: "confirmed" },
      )
      .send(),
  ]);

  const out: ParsedOwnerTokenAccount[] = [];
  for (const { pubkey, account } of legacy.value as unknown as {
    pubkey: string;
    account: { lamports: bigint; data: { parsed?: { type?: string; info?: Record<string, unknown> } } };
  }[]) {
    const p = parseTokenAccountValue(pubkey, BigInt(account.lamports), "spl-token", account);
    if (p) out.push(p);
  }
  for (const { pubkey, account } of token2022.value as unknown as {
    pubkey: string;
    account: { lamports: bigint; data: { parsed?: { type?: string; info?: Record<string, unknown> } } };
  }[]) {
    const p = parseTokenAccountValue(pubkey, BigInt(account.lamports), "token-2022", account);
    if (p) out.push(p);
  }
  return out;
}

export function tokenProgramByMintFromParsed(
  parsed: ParsedOwnerTokenAccount[],
): Map<string, TokenProgramKind> {
  const byMint = new Map<string, TokenProgramKind>();
  for (const row of parsed) {
    if (!byMint.has(row.mint)) byMint.set(row.mint, row.program);
  }
  return byMint;
}
