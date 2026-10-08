/**
 * Expands v0 compiled messages with address lookup table fetches from RPC.
 * Does not simulate transactions or compute balance deltas.
 */
import {
  type AddressesByLookupTableAddress,
  type Address,
  type CompiledTransactionMessage,
  type CompiledTransactionMessageWithLifetime,
  fetchAddressesForLookupTables,
} from "@solana/kit";
import { compiledAddressTableLookups } from "../../shared/compiled-message";
import { solanaRpcForUrl } from "../../shared/solana-rpc";
import { SimDeadline } from "./sim-deadline";

type RpcLoadedAddresses = {
  writable?: string[];
  readonly?: string[];
};

type CompiledMessage = CompiledTransactionMessage & CompiledTransactionMessageWithLifetime;

export function keysFromLoaded(
  message: CompiledMessage,
  loaded: RpcLoadedAddresses | null | undefined,
): (string | undefined)[] {
  const staticKeys = [...message.staticAccounts];
  if (message.version === "legacy") return staticKeys;
  const writable = loaded?.writable ?? [];
  const readonly = loaded?.readonly ?? [];
  return [...staticKeys, ...writable, ...readonly];
}

export function v0LookupCount(message: CompiledMessage): number {
  if (message.version === "legacy") return 0;
  let n = 0;
  for (const lu of compiledAddressTableLookups(message)) {
    n += lu.writableIndexes.length + lu.readonlyIndexes.length;
  }
  return n;
}

export function expandV0AccountKeys(
  message: CompiledMessage,
  byTable: AddressesByLookupTableAddress,
): Address[] | null {
  if (message.version === "legacy") return [...message.staticAccounts];
  const keys = [...message.staticAccounts];
  for (const lookup of compiledAddressTableLookups(message)) {
    const addrs = byTable[lookup.lookupTableAddress as Address];
    if (!addrs) return null;
    for (const i of lookup.writableIndexes) {
      if (i >= addrs.length) return null;
      keys.push(addrs[i]);
    }
    for (const i of lookup.readonlyIndexes) {
      if (i >= addrs.length) return null;
      keys.push(addrs[i]);
    }
  }
  return keys;
}

export async function resolveAccountKeysFromTables(
  rpcUrl: string,
  message: CompiledMessage,
  deadline: SimDeadline,
): Promise<(Address | undefined)[] | "rpc" | "timeout"> {
  if (message.version === "legacy") {
    return [...message.staticAccounts];
  }
  try {
    const lookupAddrs = compiledAddressTableLookups(message).map((l) => l.lookupTableAddress);
    const byTable =
      lookupAddrs.length > 0
        ? await deadline.run(() =>
            fetchAddressesForLookupTables(
              lookupAddrs as Address[],
              solanaRpcForUrl(rpcUrl),
            ),
          )
        : {};
    const keys = expandV0AccountKeys(message, byTable);
    if (!keys) return "rpc";
    return keys;
  } catch (e) {
    if (e instanceof Error && e.message === "SIM_TIMEOUT") return "timeout";
    return "rpc";
  }
}
