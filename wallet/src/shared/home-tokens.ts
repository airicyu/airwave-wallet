import { address } from "@solana/kit";
import type { ParsedOwnerTokenAccount } from "./parsed-token-accounts";
import { fetchParsedTokenAccountsForOwner } from "./parsed-token-accounts";
import { solanaRpcForUrl } from "./solana-rpc";

export const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";
export const NATIVE_SOL_ID = "native-sol";

export type TokenProgramKind = "spl-token" | "token-2022";

const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

export type HomeTokenMemberShare = {
  pubkey: string;
  uiAmount: number;
  uiAmountLabel: string;
  percent: number;
};

export type HomeTokenRow = {
  id: string;
  /** 展示用全名（Wallet API／Jupiter；沒有則退回 symbol／mint 縮寫） */
  name: string;
  symbol: string;
  /** 數值持倉量（供 Jupiter 等計價；勿從 uiAmountLabel 反推） */
  uiAmount: number;
  uiAmountLabel: string;
  usdLabel: string;
  /** 該列持倉 USD 總額（不是單價）；無效或「—」則省略。供排序，勿從 usdLabel 回推為主路徑 */
  usdTotal?: number;
  iconLetter: string;
  iconUrl?: string;
  isVerified?: boolean;
  organicScore?: number;
  organicScoreLabel?: string;
  /** 鏈上最小單位小數位；原生 SOL＝9 */
  decimals: number;
  /** SPL mint 所屬 token program；原生無此欄 */
  tokenProgram?: TokenProgramKind;
  /** combined 展開列；單一帳戶路徑不附 */
  members?: HomeTokenMemberShare[];
};

export function shortMint(mint: string): string {
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

export function iconLetterForSymbol(symbol: string): string {
  if (symbol === "SOL") return "SO";
  if (symbol === "wSOL" || symbol === "WSOL") return "WS";
  const letters = symbol.replace(/[^a-zA-Z0-9]/g, "");
  if (letters.length >= 2) return letters.slice(0, 2).toUpperCase();
  return symbol.slice(0, 2).toUpperCase() || "?";
}

export function formatUsdLabel(price: number): string {
  if (!Number.isFinite(price)) return "—";
  return `$${price.toFixed(2)}`;
}

export function sortHomeTokenRows(rows: HomeTokenRow[]): HomeTokenRow[] {
  const native: HomeTokenRow[] = [];
  const wrapped: HomeTokenRow[] = [];
  const rest: HomeTokenRow[] = [];
  for (const row of rows) {
    if (row.id === NATIVE_SOL_ID) native.push(row);
    else if (row.id === WRAPPED_SOL_MINT) wrapped.push(row);
    else rest.push(row);
  }
  rest.sort((a, b) => {
    const ua = Number.isFinite(a.usdTotal) ? a.usdTotal : undefined;
    const ub = Number.isFinite(b.usdTotal) ? b.usdTotal : undefined;
    const aOk = ua != null;
    const bOk = ub != null;
    if (aOk && !bOk) return -1;
    if (!aOk && bOk) return 1;
    if (aOk && bOk && ua !== ub) return ub - ua;
    return a.symbol.localeCompare(b.symbol, "en", { sensitivity: "base" });
  });
  return [...native, ...wrapped, ...rest];
}

type ParsedTokenAmount = {
  uiAmount: number | null;
  amount: string;
  decimals: number;
};

function programKindFromOwner(owner: string): TokenProgramKind | undefined {
  if (owner === TOKEN_PROGRAM_ID) return "spl-token";
  if (owner === TOKEN_2022_PROGRAM_ID) return "token-2022";
  return undefined;
}

type ParsedTokenAccountEntry = {
  account: {
    owner?: string;
    data: { parsed?: { type?: string; info?: Record<string, unknown> } };
  };
};

export function buildHomeTokenRows(
  lamports: number,
  parsedAccounts: ParsedTokenAccountEntry[],
  usdByMint?: Map<string, number>,
): HomeTokenRow[] {
  const solAmount = lamports / 1e9;
  const solUsd = usdByMint?.get(NATIVE_SOL_ID);
  const rows: HomeTokenRow[] = [
    {
      id: NATIVE_SOL_ID,
      name: "Solana",
      symbol: "SOL",
      uiAmount: solAmount,
      uiAmountLabel: solAmount.toLocaleString(undefined, { maximumFractionDigits: 9 }),
      usdLabel: solUsd != null ? formatUsdLabel(solUsd) : "—",
      usdTotal: solUsd != null && Number.isFinite(solUsd) ? solUsd : undefined,
      iconLetter: "SO",
      decimals: 9,
    },
  ];

  const byMint = new Map<
    string,
    {
      decimals: number;
      raw: bigint;
      symbol?: string;
      iconUrl?: string;
      tokenProgram?: TokenProgramKind;
    }
  >();

  for (const { account } of parsedAccounts) {
    const parsed = account.data.parsed;
    if (parsed?.type !== "account") continue;
    const info = parsed.info;
    if (!info) continue;
    const mint = info.mint as string;
    const tokenAmount = info.tokenAmount as ParsedTokenAmount;
    const raw = BigInt(tokenAmount.amount);
    if (raw === 0n) continue;
    if (tokenAmount.uiAmount === 0) continue;
    if (tokenAmount.decimals === 0) continue;

    const ownerKind = account.owner ? programKindFromOwner(account.owner) : undefined;
    const prev = byMint.get(mint);
    if (prev) {
      prev.raw += raw;
    } else {
      byMint.set(mint, {
        decimals: tokenAmount.decimals,
        raw,
        tokenProgram: ownerKind,
      });
    }
  }

  for (const [mint, { decimals, raw, symbol: sym, iconUrl, tokenProgram }] of byMint) {
    if (raw === 0n) continue;
    const ui =
      decimals > 0 ? Number(raw) / 10 ** decimals : Number(raw);
    const isWrappedSol = mint === WRAPPED_SOL_MINT;
    const symbol = isWrappedSol ? "wSOL" : (sym ?? shortMint(mint));
    const name = isWrappedSol ? "Wrapped SOL" : symbol;
    const mintUsd = usdByMint?.get(mint);
    rows.push({
      id: mint,
      name,
      symbol,
      uiAmount: ui,
      uiAmountLabel: ui.toLocaleString(undefined, {
        maximumFractionDigits: Math.min(decimals, 9),
      }),
      usdLabel: mintUsd != null ? formatUsdLabel(mintUsd) : "—",
      usdTotal: mintUsd != null && Number.isFinite(mintUsd) ? mintUsd : undefined,
      iconLetter: iconLetterForSymbol(symbol),
      iconUrl,
      decimals,
      tokenProgram,
    });
  }

  return rows;
}

/** 由單次 GTAO 掃描結果組持倉列（非零餘額）。 */
export function buildHomeTokenRowsFromOwnerParsed(
  lamports: number,
  parsed: ParsedOwnerTokenAccount[],
): HomeTokenRow[] {
  const solAmount = lamports / 1e9;
  const rows: HomeTokenRow[] = [
    {
      id: NATIVE_SOL_ID,
      name: "Solana",
      symbol: "SOL",
      uiAmount: solAmount,
      uiAmountLabel: solAmount.toLocaleString(undefined, { maximumFractionDigits: 9 }),
      usdLabel: "—",
      iconLetter: "SO",
      decimals: 9,
    },
  ];

  const byMint = new Map<
    string,
    { decimals: number; raw: bigint; tokenProgram: TokenProgramKind }
  >();

  for (const row of parsed) {
    const raw = BigInt(row.amount);
    if (raw === 0n) continue;
    if (row.decimals === 0) continue;
    const prev = byMint.get(row.mint);
    if (prev) {
      prev.raw += raw;
    } else {
      byMint.set(row.mint, {
        decimals: row.decimals,
        raw,
        tokenProgram: row.program,
      });
    }
  }

  for (const [mint, { decimals, raw, tokenProgram }] of byMint) {
    const ui = decimals > 0 ? Number(raw) / 10 ** decimals : Number(raw);
    if (ui === 0) continue;
    const isWrappedSol = mint === WRAPPED_SOL_MINT;
    const symbol = isWrappedSol ? "wSOL" : shortMint(mint);
    const name = isWrappedSol ? "Wrapped SOL" : symbol;
    rows.push({
      id: mint,
      name,
      symbol,
      uiAmount: ui,
      uiAmountLabel: ui.toLocaleString(undefined, {
        maximumFractionDigits: Math.min(decimals, 9),
      }),
      usdLabel: "—",
      iconLetter: iconLetterForSymbol(symbol),
      decimals,
      tokenProgram,
    });
  }

  return sortHomeTokenRows(rows);
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
}

async function withAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  throwIfAborted(signal);
  if (!signal) return promise;
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (v) => {
        signal.removeEventListener("abort", onAbort);
        resolve(v);
      },
      (e) => {
        signal.removeEventListener("abort", onAbort);
        reject(e);
      },
    );
  });
}

function mapParsedTokenAccounts(
  value: readonly {
    pubkey: string;
    account: ParsedTokenAccountEntry["account"] & { owner: string };
  }[],
): ParsedTokenAccountEntry[] {
  return value.map(({ account }) => ({ account }));
}

export async function fetchRpcHomeTokenRows(
  rpcUrl: string,
  ownerPublicKeyBase58: string,
  signal?: AbortSignal,
): Promise<HomeTokenRow[]> {
  const rpc = solanaRpcForUrl(rpcUrl);
  const owner = address(ownerPublicKeyBase58);
  throwIfAborted(signal);
  const lamports = Number((await withAbort(rpc.getBalance(owner, { commitment: "confirmed" }).send(), signal)).value);
  throwIfAborted(signal);
  const parsed = await withAbort(
    fetchParsedTokenAccountsForOwner(rpcUrl, ownerPublicKeyBase58),
    signal,
  );
  return buildHomeTokenRowsFromOwnerParsed(lamports, parsed);
}

/** Wallet API 路徑用來拆 native／wSOL。wSOL 在 legacy Token program，用 mint 過濾即可。 */
export async function fetchNativeAndWrappedSolRows(
  rpcUrl: string,
  ownerPublicKeyBase58: string,
  signal?: AbortSignal,
): Promise<HomeTokenRow[]> {
  const rpc = solanaRpcForUrl(rpcUrl);
  const owner = address(ownerPublicKeyBase58);
  throwIfAborted(signal);
  const lamports = Number((await withAbort(rpc.getBalance(owner, { commitment: "confirmed" }).send(), signal)).value);
  throwIfAborted(signal);
  const wrapped = await withAbort(
    rpc
      .getTokenAccountsByOwner(
        owner,
        { mint: address(WRAPPED_SOL_MINT) },
        { encoding: "jsonParsed", commitment: "confirmed" },
      )
      .send(),
    signal,
  );
  return sortHomeTokenRows(buildHomeTokenRows(lamports, mapParsedTokenAccounts(wrapped.value)));
}
