/**
 * Pure helpers to normalize Helius activity payloads into home rows, labels, timestamps, and explorer links.
 * Does not perform HTTP fetches or update popup React state.
 */
import { t, type UiLocale } from "./ui-i18n";

export type HomeActivityKind = "send" | "receive" | "swap" | "tx";

export type HomeActivityLead = "fail" | "ok" | null;

export type HomeActivityIcon = {
  mint: string;
  iconUrl: string;
};

export type HomeActivityRow = {
  signature: string;
  kind: HomeActivityKind;
  /** `fail`／`ok` 由畫面加「失敗」「成功」；金額列為 null */
  lead: HomeActivityLead;
  detail: string;
  timestampSec: number | null;
  orbUrl: string;
  mints: string[];
  icons: HomeActivityIcon[];
};

const SOL_MINT = "So11111111111111111111111111111111111111112";
const MINT_SYMBOL: Record<string, string> = {
  [SOL_MINT]: "SOL",
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "USDT",
};

const ACTIVITY_LIMIT = 20;

export function homeActivityLimit(): number {
  return ACTIVITY_LIMIT;
}

export function orbTxUrl(signature: string, cluster: "mainnet" | "devnet"): string {
  const sig = encodeURIComponent(signature);
  const q = cluster === "devnet" ? "devnet" : "mainnet-beta";
  return `https://orb.helius.dev/tx/${sig}?cluster=${q}`;
}

export function isOrbTxUrl(url: string): boolean {
  return url.startsWith("https://orb.helius.dev/tx/");
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local timezone `YYYY-MM-DD HH:MM:SS`. Empty if the unix second is missing. */
export function activityWhen(timestampSec: number | null): string {
  if (timestampSec == null || !Number.isFinite(timestampSec)) return "";
  const d = new Date(timestampSec * 1000);
  if (!Number.isFinite(d.getTime())) return "";
  const y = String(d.getFullYear()).padStart(4, "0");
  const mo = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const h = pad2(d.getHours());
  const min = pad2(d.getMinutes());
  const sec = pad2(d.getSeconds());
  return `${y}-${mo}-${day} ${h}:${min}:${sec}`;
}

export function kindLabel(kind: HomeActivityKind, locale: UiLocale): string {
  if (kind === "send") return t(locale, "activity.kind.send");
  if (kind === "receive") return t(locale, "activity.kind.receive");
  if (kind === "swap") return t(locale, "activity.kind.swap");
  return t(locale, "activity.kind.tx");
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function asString(raw: unknown): string {
  return typeof raw === "string" ? raw : "";
}

function shortAddr(pk: string): string {
  if (pk.length <= 8) return pk;
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

export function activityDetailWithSymbols(
  detail: string,
  mints: string[],
  symbols: Map<string, string>,
): string {
  let out = detail;
  for (const mint of mints) {
    const symbol = symbols.get(mint)?.trim();
    if (!symbol) continue;
    const short = shortAddr(mint);
    if (!short || short === symbol || !out.includes(short)) continue;
    out = out.split(short).join(symbol);
  }
  return out;
}

function symbolForMint(mint: string): string {
  return MINT_SYMBOL[mint] ?? shortAddr(mint);
}

function formatUnits(amount: bigint, decimals: number): string {
  const d = Math.min(Math.max(0, decimals), 18);
  const neg = amount < 0n;
  const v = neg ? -amount : amount;
  if (d === 0) return neg ? `-${v.toString()}` : v.toString();
  const base = 10n ** BigInt(d);
  const whole = v / base;
  const frac = (v % base).toString().padStart(d, "0").replace(/0+$/, "");
  const body = frac ? `${whole.toString()}.${frac}` : whole.toString();
  return neg ? `-${body}` : body;
}

function asLamports(raw: unknown): bigint | null {
  if (typeof raw === "string" && /^-?\d+$/.test(raw)) {
    try {
      return BigInt(raw);
    } catch {
      return null;
    }
  }
  if (typeof raw === "number" && Number.isSafeInteger(raw)) return BigInt(raw);
  return null;
}

function displayUiNumber(raw: unknown): string | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  if (Number.isInteger(raw)) return String(raw);
  const s = raw.toFixed(9).replace(/\.?0+$/, "");
  return s || "0";
}

function tokenLabel(raw: unknown): string | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const mint = asString(rec.mint);
  const rawAmt = asRecord(rec.rawTokenAmount);
  if (rawAmt) {
    const units = asLamports(rawAmt.tokenAmount);
    const decimals = rawAmt.decimals;
    if (units != null && typeof decimals === "number" && Number.isInteger(decimals)) {
      return `${formatUnits(units, decimals)} ${symbolForMint(mint || SOL_MINT)}`;
    }
  }
  const ui = displayUiNumber(rec.tokenAmount);
  if (!ui) return null;
  return `${ui} ${symbolForMint(mint || SOL_MINT)}`;
}

type Leg = { outgoing: boolean; label: string; counterparty: string; mint: string };

function uniqueMints(mints: string[]): string[] {
  const out: string[] = [];
  for (const mint of mints) {
    if (!mint || out.includes(mint)) continue;
    out.push(mint);
    if (out.length >= 2) break;
  }
  return out;
}

function legsForOwner(tx: Record<string, unknown>, owner: string): Leg[] {
  const tokenLegs: Leg[] = [];
  const nativeLegs: Leg[] = [];
  const tokens = Array.isArray(tx.tokenTransfers) ? tx.tokenTransfers : [];
  for (const item of tokens) {
    const rec = asRecord(item);
    if (!rec) continue;
    const from = asString(rec.fromUserAccount);
    const to = asString(rec.toUserAccount);
    const label = tokenLabel(rec);
    if (!label) continue;
    const mint = asString(rec.mint) || SOL_MINT;
    if (from === owner) tokenLegs.push({ outgoing: true, label, counterparty: to, mint });
    else if (to === owner) tokenLegs.push({ outgoing: false, label, counterparty: from, mint });
  }
  const natives = Array.isArray(tx.nativeTransfers) ? tx.nativeTransfers : [];
  for (const item of natives) {
    const rec = asRecord(item);
    if (!rec) continue;
    const from = asString(rec.fromUserAccount);
    const to = asString(rec.toUserAccount);
    const lamports = asLamports(rec.amount);
    if (lamports == null) continue;
    const label = `${formatUnits(lamports, 9)} SOL`;
    if (from === owner) nativeLegs.push({ outgoing: true, label, counterparty: to, mint: SOL_MINT });
    else if (to === owner) nativeLegs.push({ outgoing: false, label, counterparty: from, mint: SOL_MINT });
  }
  return tokenLegs.length > 0 ? tokenLegs : nativeLegs;
}

function classifyTransfer(legs: Leg[]): HomeActivityKind {
  const out = legs.some((l) => l.outgoing);
  const inn = legs.some((l) => !l.outgoing);
  if (out && !inn) return "send";
  if (inn && !out) return "receive";
  return "tx";
}

function detailFromLeg(kind: HomeActivityKind, legs: Leg[], signature: string): string {
  const leg =
    kind === "send"
      ? legs.find((l) => l.outgoing)
      : kind === "receive"
        ? legs.find((l) => !l.outgoing)
        : undefined;
  if (!leg) return shortAddr(signature);
  if (kind === "send") {
    const to = leg.counterparty ? shortAddr(leg.counterparty) : "";
    return to ? `−${leg.label} → ${to}` : `−${leg.label}`;
  }
  if (kind === "receive") return `+${leg.label}`;
  return shortAddr(signature);
}

function amountText(raw: unknown, native: boolean): string | null {
  if (native) {
    const rec = asRecord(raw);
    const lamports = asLamports(rec?.amount ?? raw);
    if (lamports == null) return null;
    return `${formatUnits(lamports, 9)} SOL`;
  }
  return tokenLabel(raw);
}

type SwapSide = { text: string; mint: string };

function firstSwapSide(
  items: unknown,
  owner: string,
  native: boolean,
): SwapSide | null {
  const list = Array.isArray(items) ? items : items != null ? [items] : [];
  const matched: SwapSide[] = [];
  const any: SwapSide[] = [];
  for (const item of list) {
    const rec = asRecord(item);
    const text = amountText(native ? rec : item, native);
    if (!text) continue;
    const mint = native ? SOL_MINT : asString(rec?.mint) || SOL_MINT;
    const side = { text, mint };
    any.push(side);
    const who = asString(rec?.account ?? rec?.userAccount);
    if (!who || who === owner) matched.push(side);
  }
  return matched[0] ?? any[0] ?? null;
}

function swapSides(tx: Record<string, unknown>, owner: string): { inn: SwapSide | null; out: SwapSide | null; legs: Leg[] } {
  const events = asRecord(tx.events);
  const swap = asRecord(events?.swap);
  let inn: SwapSide | null = null;
  let out: SwapSide | null = null;
  if (swap) {
    inn =
      firstSwapSide(swap.tokenInputs, owner, false) ??
      firstSwapSide(swap.nativeInput, owner, true);
    out =
      firstSwapSide(swap.tokenOutputs, owner, false) ??
      firstSwapSide(swap.nativeOutput, owner, true);
  }
  const legs = legsForOwner(tx, owner);
  if (!inn || !out) {
    const spent = legs.find((l) => l.outgoing);
    const got = legs.find((l) => !l.outgoing);
    if (!inn && spent) inn = { text: spent.label, mint: spent.mint };
    if (!out && got) out = { text: got.label, mint: got.mint };
  }
  return { inn, out, legs };
}

function mintsForKind(kind: HomeActivityKind, legs: Leg[], inn: SwapSide | null, out: SwapSide | null): string[] {
  if (kind === "swap") return uniqueMints([inn?.mint ?? "", out?.mint ?? ""]);
  if (kind === "send") {
    const leg = legs.find((l) => l.outgoing);
    return uniqueMints(leg ? [leg.mint] : []);
  }
  if (kind === "receive") {
    const leg = legs.find((l) => !l.outgoing);
    return uniqueMints(leg ? [leg.mint] : []);
  }
  return uniqueMints(legs.map((l) => l.mint));
}

export function rowFromEnhanced(
  raw: unknown,
  owner: string,
  cluster: "mainnet" | "devnet",
): HomeActivityRow | null {
  const tx = asRecord(raw);
  if (!tx) return null;
  const signature = asString(tx.signature);
  if (!signature) return null;
  const type = asString(tx.type).toUpperCase();
  const failed = tx.transactionError != null;
  let kind: HomeActivityKind = "tx";
  let detail = shortAddr(signature);
  let mints: string[] = [];
  if (type === "SWAP") {
    kind = "swap";
    const sides = swapSides(tx, owner);
    detail = sides.inn && sides.out ? `${sides.inn.text} → ${sides.out.text}` : shortAddr(signature);
    mints = mintsForKind(kind, sides.legs, sides.inn, sides.out);
  } else if (type === "TRANSFER") {
    const legs = legsForOwner(tx, owner);
    kind = classifyTransfer(legs);
    detail = detailFromLeg(kind, legs, signature);
    mints = mintsForKind(kind, legs, null, null);
  } else {
    const legs = legsForOwner(tx, owner);
    mints = mintsForKind("tx", legs, null, null);
  }
  const timestamp = tx.timestamp;
  return {
    signature,
    kind,
    lead: failed ? "fail" : null,
    detail,
    timestampSec: typeof timestamp === "number" && Number.isFinite(timestamp) ? timestamp : null,
    orbUrl: orbTxUrl(signature, cluster),
    mints,
    icons: [],
  };
}

export function rowsFromEnhanced(
  raw: unknown,
  owner: string,
  cluster: "mainnet" | "devnet",
): HomeActivityRow[] {
  if (!Array.isArray(raw)) return [];
  const out: HomeActivityRow[] = [];
  for (const item of raw) {
    const row = rowFromEnhanced(item, owner, cluster);
    if (!row) continue;
    out.push(row);
    if (out.length >= ACTIVITY_LIMIT) break;
  }
  return out;
}

export function rowFromSignature(
  signature: string,
  err: unknown,
  blockTime: number | null,
  cluster: "mainnet" | "devnet",
): HomeActivityRow {
  const failed = err != null;
  return {
    signature,
    kind: "tx",
    lead: failed ? "fail" : "ok",
    detail: shortAddr(signature),
    timestampSec: blockTime,
    orbUrl: orbTxUrl(signature, cluster),
    mints: [],
    icons: [],
  };
}
