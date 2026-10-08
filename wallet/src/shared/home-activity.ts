import { t, type UiLocale } from "./ui-i18n";

export type HomeActivityKind = "send" | "receive" | "swap" | "tx";

export type HomeActivityLead = "fail" | "ok" | null;

export type HomeActivityRow = {
  signature: string;
  kind: HomeActivityKind;
  /** `fail`／`ok` 由畫面加「失敗」「成功」；金額列為 null */
  lead: HomeActivityLead;
  detail: string;
  timestampSec: number | null;
  orbUrl: string;
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

export function activityWhen(timestampSec: number | null, locale: UiLocale, nowMs = Date.now()): string {
  if (timestampSec == null || !Number.isFinite(timestampSec)) return "";
  const then = timestampSec * 1000;
  const diff = Math.max(0, nowMs - then);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return t(locale, "activity.when.justNow");
  if (min < 60) return t(locale, "activity.when.minutesAgo", { min: String(min) });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t(locale, "activity.when.hoursAgo", { hr: String(hr) });
  const startToday = new Date(nowMs);
  startToday.setHours(0, 0, 0, 0);
  const startThen = new Date(then);
  startThen.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((startToday.getTime() - startThen.getTime()) / 86_400_000);
  if (dayDiff <= 1) return t(locale, "activity.when.yesterday");
  if (dayDiff < 7) return t(locale, "activity.when.daysAgo", { days: String(dayDiff) });
  const weeks = Math.floor(dayDiff / 7);
  if (weeks < 5) return t(locale, "activity.when.weeksAgo", { weeks: String(weeks) });
  const d = new Date(then);
  return `${d.getMonth() + 1}/${d.getDate()}`;
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

type Leg = { outgoing: boolean; label: string; counterparty: string };

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
    if (from === owner) tokenLegs.push({ outgoing: true, label, counterparty: to });
    else if (to === owner) tokenLegs.push({ outgoing: false, label, counterparty: from });
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
    if (from === owner) nativeLegs.push({ outgoing: true, label, counterparty: to });
    else if (to === owner) nativeLegs.push({ outgoing: false, label, counterparty: from });
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

function firstSwapSide(
  items: unknown,
  owner: string,
  native: boolean,
): string | null {
  const list = Array.isArray(items) ? items : items != null ? [items] : [];
  const matched: string[] = [];
  const any: string[] = [];
  for (const item of list) {
    const rec = asRecord(item);
    const text = amountText(native ? rec : item, native);
    if (!text) continue;
    any.push(text);
    const who = asString(rec?.account ?? rec?.userAccount);
    if (!who || who === owner) matched.push(text);
  }
  return matched[0] ?? any[0] ?? null;
}

function swapDetail(tx: Record<string, unknown>, owner: string, signature: string): string {
  const events = asRecord(tx.events);
  const swap = asRecord(events?.swap);
  if (swap) {
    const inn =
      firstSwapSide(swap.tokenInputs, owner, false) ??
      firstSwapSide(swap.nativeInput, owner, true);
    const out =
      firstSwapSide(swap.tokenOutputs, owner, false) ??
      firstSwapSide(swap.nativeOutput, owner, true);
    if (inn && out) return `${inn} → ${out}`;
  }
  const legs = legsForOwner(tx, owner);
  const spent = legs.find((l) => l.outgoing);
  const got = legs.find((l) => !l.outgoing);
  if (spent && got) return `${spent.label} → ${got.label}`;
  return shortAddr(signature);
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
  if (type === "SWAP") {
    kind = "swap";
    detail = swapDetail(tx, owner, signature);
  } else if (type === "TRANSFER") {
    const legs = legsForOwner(tx, owner);
    kind = classifyTransfer(legs);
    detail = detailFromLeg(kind, legs, signature);
  }
  const timestamp = tx.timestamp;
  return {
    signature,
    kind,
    lead: failed ? "fail" : null,
    detail,
    timestampSec: typeof timestamp === "number" && Number.isFinite(timestamp) ? timestamp : null,
    orbUrl: orbTxUrl(signature, cluster),
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
  };
}
