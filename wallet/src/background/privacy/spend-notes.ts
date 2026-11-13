/**
 * Builds one private spend from the note ids the form selected.
 * The service worker does not choose a second set of notes.
 * Send and Unshield both call this, then queue the built transaction for approval.
 *
 * More than 40 ids, a repeated id, an id this wallet does not hold, or a sum below the amount fails before a proof is requested.
 */
import { address } from "@solana/kit";
import bs58 from "bs58";
import {
  authorizePrivateTransaction,
  isPlainUtxo,
  reserveWalletEntries,
  resolveWithdrawalSettlement,
  selectUtxos,
  withdrawalSetupInstructions,
} from "@heliuslabs/spr/internal";
import { UnsignedPrivateTransaction } from "../../../node_modules/@heliuslabs/spr/dist/wallet/actions.js";
import type { Wallet as SprWallet } from "@heliuslabs/spr/transaction";
import { resolveRegisteredAddress } from "@heliuslabs/spr/wallet";
import type { SprClient } from "@heliuslabs/spr/client";
import type { LocalKeys } from "@heliuslabs/spr/wallet";

const MAX_NOTES = 40;

export type SpendKind = "transfer" | "withdrawal";

export async function buildSelectedSpend(input: {
  client: SprClient;
  wallet: SprWallet;
  keys: LocalKeys;
  feePayer: string;
  asset: string;
  amount: bigint;
  ids: string[];
  kind: SpendKind;
  recipient: string;
  splTokenProgram?: string;
}): Promise<Awaited<ReturnType<SprClient["assembleAuthorizedPrivateTransaction"]>>> {
  const unique = new Set(input.ids);
  if (input.ids.length === 0 || unique.size !== input.ids.length) throw new Error("INVALID_NOTES");
  if (input.ids.length > MAX_NOTES) throw new Error("TOO_MANY_NOTES");
  const asset = address(input.asset);
  const byId = new Map<string, ReturnType<SprWallet["utxos"]>[number]>();
  for (const entry of input.wallet.utxos()) {
    if (entry.spent || entry.utxo.asset !== asset) continue;
    const id = bs58.encode(entry.utxo.hash(input.keys.address().nullifierPublicKey, input.client.treeId));
    if (unique.has(id)) byId.set(id, entry);
  }
  if (byId.size !== input.ids.length) throw new Error("UNKNOWN_NOTE");
  let sum = 0n;
  for (const id of input.ids) sum += byId.get(id)!.utxo.amount;
  if (sum < input.amount) throw new Error("INSUFFICIENT_NOTES");
  const selection = selectUtxos({
    wallet: input.wallet,
    asset,
    target: { kind: "cover", amount: sum },
    policy: {
      eligible: (entry) => {
        const id = bs58.encode(entry.utxo.hash(input.keys.address().nullifierPublicKey, input.client.treeId));
        return unique.has(id) && isPlainUtxo(entry);
      },
      ordering: "largestFirst",
      maxInputs: MAX_NOTES,
      tree: { kind: "infer", maxTrees: 1 },
      errors: {
        insufficient: () => new Error("INSUFFICIENT_NOTES"),
        tooManyInputs: () => new Error("TOO_MANY_NOTES"),
        overflow: () => new Error("INSUFFICIENT_NOTES"),
        multipleTrees: () => new Error("INVALID_NOTES"),
      },
    },
  });
  if (selection.entries.length !== input.ids.length || selection.trees.length !== 1) throw new Error("INVALID_NOTES");
  const reservation = reserveWalletEntries(input.wallet, selection.entries);
  const payer = address(input.feePayer);
  const tree = selection.trees[0]!;
  const inputs = selection.entries.map((entry) => ({ entry }));
  if (input.kind === "transfer") {
    const registered = await resolveRegisteredAddress({ rpc: input.client, owner: address(input.recipient) });
    if (!registered) throw new Error("RECIPIENT_UNREGISTERED");
    const unsigned = new UnsignedPrivateTransaction({
      payer,
      tree,
      inputs,
      reservationId: reservation.id,
      action: {
        kind: "transfer",
        asset,
        payments: [{ recipient: registered.address, amount: input.amount }],
      },
      summary: "private transfer of the selected notes",
    });
    const authorized = await authorizePrivateTransaction(unsigned, input.wallet, input.keys);
    return input.client.assembleAuthorizedPrivateTransaction({
      authorized,
      feePayer: payer,
      keys: input.keys,
    });
  }
  const spl = input.splTokenProgram ? address(input.splTokenProgram) : undefined;
  const resolved = await resolveWithdrawalSettlement(address(input.recipient), asset, spl);
  const setup = await withdrawalSetupInstructions({
    payer,
    recipient: address(input.recipient),
    asset,
    ...(spl ? { splTokenProgram: spl } : {}),
  });
  const unsigned = new UnsignedPrivateTransaction({
    payer,
    tree,
    inputs,
    reservationId: reservation.id,
    action: { kind: "withdrawal", asset, amount: input.amount, target: resolved.target },
    withdrawal: resolved.accounts,
    summary: "private withdrawal of the selected notes",
  });
  const authorized = await authorizePrivateTransaction(unsigned, input.wallet, input.keys, setup);
  return input.client.assembleAuthorizedPrivateTransaction({
    authorized,
    feePayer: payer,
    keys: input.keys,
  });
}
