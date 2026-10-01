import { Connection, PublicKey } from "@solana/web3.js";

export const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";
export const NATIVE_SOL_ID = "native-sol";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);

export type HomeTokenRow = {
  id: string;
  /** 展示用全名（Helius `content.metadata.name`；沒有則退回 symbol／mint 縮寫） */
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
};

export function shortMint(mint: string): string {
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

export function iconLetterForSymbol(symbol: string): string {
  if (symbol === "SOL") return "SO";
  const letters = symbol.replace(/[^a-zA-Z0-9]/g, "");
  if (letters.length >= 2) return letters.slice(0, 2).toUpperCase();
  return symbol.slice(0, 2).toUpperCase() || "?";
}

export function formatUsdLabel(price: number): string {
  if (!Number.isFinite(price)) return "—";
  return `$${price.toFixed(2)}`;
}

export function sortHomeTokenRows(rows: HomeTokenRow[]): HomeTokenRow[] {
  const sol: HomeTokenRow[] = [];
  const rest: HomeTokenRow[] = [];
  for (const row of rows) {
    if (row.id === NATIVE_SOL_ID) sol.push(row);
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
  return [...sol, ...rest];
}

type ParsedTokenAmount = {
  uiAmount: number | null;
  amount: string;
  decimals: number;
};

export function buildHomeTokenRows(
  lamports: number,
  parsedAccounts: { account: { data: { parsed?: { type?: string; info?: Record<string, unknown> } } } }[],
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
    },
  ];

  const byMint = new Map<string, { decimals: number; raw: bigint; symbol?: string; iconUrl?: string }>();

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

    const prev = byMint.get(mint);
    if (prev) {
      prev.raw += raw;
    } else {
      byMint.set(mint, { decimals: tokenAmount.decimals, raw });
    }
  }

  for (const [mint, { decimals, raw, symbol: sym, iconUrl }] of byMint) {
    if (raw === 0n) continue;
    const ui =
      decimals > 0 ? Number(raw) / 10 ** decimals : Number(raw);
    const symbol = sym ?? shortMint(mint);
    const mintUsd = usdByMint?.get(mint);
    rows.push({
      id: mint,
      name: symbol,
      symbol,
      uiAmount: ui,
      uiAmountLabel: ui.toLocaleString(undefined, {
        maximumFractionDigits: Math.min(decimals, 9),
      }),
      usdLabel: mintUsd != null ? formatUsdLabel(mintUsd) : "—",
      usdTotal: mintUsd != null && Number.isFinite(mintUsd) ? mintUsd : undefined,
      iconLetter: iconLetterForSymbol(symbol),
      iconUrl,
    });
  }

  return rows;
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

export async function fetchRpcHomeTokenRows(
  rpcUrl: string,
  ownerPublicKeyBase58: string,
  signal?: AbortSignal,
): Promise<HomeTokenRow[]> {
  const conn = new Connection(rpcUrl, "confirmed");
  const pk = new PublicKey(ownerPublicKeyBase58);
  throwIfAborted(signal);
  const lamports = await withAbort(conn.getBalance(pk), signal);
  throwIfAborted(signal);
  const tokenAccounts = await withAbort(
    conn.getParsedTokenAccountsByOwner(pk, {
      programId: TOKEN_PROGRAM_ID,
    }),
    signal,
  );
  return sortHomeTokenRows(buildHomeTokenRows(lamports, tokenAccounts.value));
}
