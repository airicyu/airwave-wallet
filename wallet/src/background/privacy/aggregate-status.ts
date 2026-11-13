/**
 * Builds private-balance rows for one signing account or a combined aggregate.
 * Members without a vault key, or not registered, are omitted. Does not sign.
 */
import { address } from "@solana/kit";
import { Wallet } from "@heliuslabs/spr/transaction";
import { isWalletRegistered, syncWallet } from "@heliuslabs/spr/wallet";
import type { SprClient } from "@heliuslabs/spr/client";
import bs58 from "bs58";
import {
  isSigningOrWatch,
  parsePublicKeyBase58,
} from "../../shared/accounts";
import { accountKind, type AccountMeta, type CombinedAccountMeta, type Settings } from "../../shared/protocol";
import { SOL_MINT } from "../../shared/privacy/sol-mint";
import { getLoadedAccount } from "../session";
import { shieldedKeysFor } from "./keys";
import { privateUsdByMint } from "./usd";
import { debugLogInfo } from "../debug-log";

export type PrivacyNoteOut = {
  id: string;
  amount: string;
  amountRaw: string;
  mergeable: boolean;
};

export type PrivacyMemberOut = {
  pubkey: string;
  amount: string;
  amountRaw: string;
  percent: number;
  notes: PrivacyNoteOut[];
};

export type PrivacyRowOut = {
  mint: string;
  amount: string;
  amountRaw: string;
  notes: PrivacyNoteOut[];
  members?: PrivacyMemberOut[];
  usdLabel?: string;
};

export function formatPrivacyAmount(mint: string, amount: bigint): string {
  if (mint !== SOL_MINT) return amount.toString();
  const negative = amount < 0n;
  const value = negative ? -amount : amount;
  const raw = value.toString().padStart(10, "0");
  const whole = raw.slice(0, raw.length - 9);
  const frac = raw.slice(raw.length - 9).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`;
}

function samePubkey(left: string, right: string): boolean {
  const a = parsePublicKeyBase58(left) ?? left;
  const b = parsePublicKeyBase58(right) ?? right;
  return a === b;
}

function percentOf(part: bigint, total: bigint): number {
  if (total <= 0n) return 0;
  return Number((part * 10000n) / total) / 100;
}

type MemberMint = {
  pubkey: string;
  amount: bigint;
  notes: PrivacyNoteOut[];
};

async function readRegisteredMember(
  accountId: string,
  pubkey: string,
  client: SprClient,
): Promise<Map<string, MemberMint> | "unregistered" | "skip"> {
  if (!getLoadedAccount(accountId)) return "skip";
  try {
    const owner = address(pubkey);
    const registered = await isWalletRegistered({ rpc: client, owner });
    if (!registered) return "unregistered";
    const keys = await shieldedKeysFor(accountId);
    const wallet = new Wallet({ identity: keys.address() });
    await syncWallet({ wallet, keys, client });
    const byMint = new Map<string, MemberMint>();
    for (const row of wallet.balances()) {
      if (row.amount <= 0n) continue;
      const notes = row.utxos.map((utxo) => {
        const hash = utxo.hash(keys.address().nullifierPublicKey, client.treeId);
        return {
          id: bs58.encode(hash),
          amount: formatPrivacyAmount(row.mint, utxo.amount),
          amountRaw: utxo.amount.toString(),
          mergeable: (utxo.data.utxoData()?.length ?? 0) === 0,
        };
      });
      byMint.set(row.mint, { pubkey, amount: row.amount, notes });
    }
    return byMint;
  } catch (error) {
    const message = error instanceof Error ? error.message : "member read failed";
    void debugLogInfo("wallet.privacyStatus", `member-skip ${accountId} ${message}`);
    return "skip";
  }
}

function mergeMemberMints(
  perMember: { pubkey: string; byMint: Map<string, MemberMint> }[],
): PrivacyRowOut[] {
  const mintOrder: string[] = [];
  const totals = new Map<string, bigint>();
  const membersByMint = new Map<string, MemberMint[]>();

  for (const entry of perMember) {
    for (const [mint, slice] of entry.byMint) {
      if (!totals.has(mint)) {
        mintOrder.push(mint);
        totals.set(mint, 0n);
        membersByMint.set(mint, []);
      }
      totals.set(mint, (totals.get(mint) ?? 0n) + slice.amount);
      membersByMint.get(mint)!.push(slice);
    }
  }

  return mintOrder.map((mint) => {
    const total = totals.get(mint) ?? 0n;
    const members = (membersByMint.get(mint) ?? [])
      .map((slice) => ({
        pubkey: slice.pubkey,
        amount: formatPrivacyAmount(mint, slice.amount),
        amountRaw: slice.amount.toString(),
        percent: percentOf(slice.amount, total),
        notes: [...slice.notes].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
      }))
      .sort((a, b) => {
        const left = BigInt(a.amountRaw);
        const right = BigInt(b.amountRaw);
        if (left > right) return -1;
        if (left < right) return 1;
        return a.pubkey.localeCompare(b.pubkey, "en", { numeric: true, sensitivity: "base" });
      });
    return {
      mint,
      amount: formatPrivacyAmount(mint, total),
      amountRaw: total.toString(),
      notes: [],
      members,
    };
  });
}

export async function privacyRowsForSigning(
  accountId: string,
  ownerAddress: string,
  client: SprClient,
  settings: Settings,
  canPayFee: () => Promise<boolean>,
): Promise<
  | { kind: "unregistered"; canPayFee: boolean }
  | { kind: "registered"; rows: PrivacyRowOut[] }
> {
  const owner = address(ownerAddress);
  const registered = await isWalletRegistered({ rpc: client, owner });
  if (!registered) {
    return { kind: "unregistered", canPayFee: await canPayFee() };
  }
  const keys = await shieldedKeysFor(accountId);
  const wallet = new Wallet({ identity: keys.address() });
  await syncWallet({ wallet, keys, client });
  const rows: PrivacyRowOut[] = wallet.balances().map((row) => ({
    mint: row.mint,
    amount: formatPrivacyAmount(row.mint, row.amount),
    amountRaw: row.amount.toString(),
    notes: row.utxos.map((utxo) => {
      const hash = utxo.hash(keys.address().nullifierPublicKey, client.treeId);
      return {
        id: bs58.encode(hash),
        amount: formatPrivacyAmount(row.mint, utxo.amount),
        amountRaw: utxo.amount.toString(),
        mergeable: (utxo.data.utxoData()?.length ?? 0) === 0,
      };
    }),
  }));
  const usd = await privateUsdByMint(rows, settings);
  return {
    kind: "registered",
    rows: rows.map((row) => ({ ...row, usdLabel: usd.get(row.mint) ?? "" })),
  };
}

export async function privacyRowsForCombined(
  accounts: AccountMeta[],
  combined: CombinedAccountMeta,
  client: SprClient,
  settings: Settings,
): Promise<{ kind: "unavailable" } | { kind: "registered"; rows: PrivacyRowOut[] }> {
  const perMember: { pubkey: string; byMint: Map<string, MemberMint> }[] = [];
  let sawVaultMember = false;
  let sawRegistered = false;

  for (const rawPk of combined.subPubkeys) {
    const pubkey = parsePublicKeyBase58(rawPk) ?? rawPk;
    const meta = accounts.find(
      (account) =>
        isSigningOrWatch(account) &&
        accountKind(account) === "signing" &&
        samePubkey(account.publicKeyBase58, pubkey),
    );
    if (!meta || !isSigningOrWatch(meta)) continue;
    if (!getLoadedAccount(meta.id)) continue;
    sawVaultMember = true;
    const result = await readRegisteredMember(meta.id, meta.publicKeyBase58, client);
    if (result === "skip") continue;
    if (result === "unregistered") continue;
    sawRegistered = true;
    perMember.push({ pubkey: meta.publicKeyBase58, byMint: result });
  }

  if (!sawVaultMember) {
    void debugLogInfo("wallet.privacyStatus", "combined no vault members");
    return { kind: "unavailable" };
  }
  if (!sawRegistered) {
    void debugLogInfo("wallet.privacyStatus", "combined no registered members");
    return { kind: "unavailable" };
  }

  const rows = mergeMemberMints(perMember);
  const usd = await privateUsdByMint(rows, settings);
  return {
    kind: "registered",
    rows: rows.map((row) => ({ ...row, usdLabel: usd.get(row.mint) ?? "" })),
  };
}
