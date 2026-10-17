/**
 * Address-card add, rename, and remove against airwave.addressBook.v1.
 * Does not touch the vault, accounts, or schema generation.
 */
import { isAddress } from "@solana/kit";
import type { ExtensionRequest, ExtensionResponse } from "../../../shared/commands";
import type { AddressCard } from "../../../shared/storage-keys";
import { respond } from "../../messaging";
import { readAddressBook, writeAddressBook } from "../../storage";

function fail(req: ExtensionRequest, code: string, message: string): ExtensionResponse {
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: false,
    error: { code, message },
  });
}

function ok(req: ExtensionRequest, result: unknown): ExtensionResponse {
  return respond({ kind: "airwave-ext-res", requestId: req.requestId, ok: true, result });
}

function payload(req: ExtensionRequest): Record<string, unknown> {
  return req.payload && typeof req.payload === "object" ? (req.payload as Record<string, unknown>) : {};
}

export async function handleAddressBookAdd(req: ExtensionRequest): Promise<ExtensionResponse> {
  const body = payload(req);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const address = typeof body.address === "string" ? body.address.trim() : "";
  if (!isAddress(address)) return fail(req, "INVALID_ADDRESS", "Invalid address");
  const cards = await readAddressBook();
  if (cards.some((c) => c.address === address)) return fail(req, "DUPLICATE_ADDRESS", "Duplicate address");
  const card: AddressCard = { id: crypto.randomUUID(), name, address };
  await writeAddressBook([...cards, card]);
  return ok(req, card);
}

export async function handleAddressBookRename(req: ExtensionRequest): Promise<ExtensionResponse> {
  const body = payload(req);
  const id = typeof body.id === "string" ? body.id : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const cards = await readAddressBook();
  const index = cards.findIndex((c) => c.id === id);
  if (index < 0) return fail(req, "NOT_FOUND", "Not found");
  const next = cards.slice();
  next[index] = { ...cards[index], name };
  await writeAddressBook(next);
  return ok(req, next[index]);
}

export async function handleAddressBookReorder(req: ExtensionRequest): Promise<ExtensionResponse> {
  const body = payload(req);
  const orderedIds = body.orderedIds;
  const cards = await readAddressBook();
  if (!Array.isArray(orderedIds) || orderedIds.length !== cards.length) {
    return fail(req, "INVALID_ORDER", "Invalid address book order");
  }
  if (!orderedIds.every((id) => typeof id === "string")) return fail(req, "INVALID_ORDER", "Invalid address book order");
  const unique = new Set(orderedIds);
  if (unique.size !== cards.length) return fail(req, "INVALID_ORDER", "Invalid address book order");
  const byId = new Map(cards.map((c) => [c.id, c]));
  for (const id of orderedIds) {
    if (!byId.has(id as string)) return fail(req, "INVALID_ORDER", "Invalid address book order");
  }
  const next = (orderedIds as string[]).map((id) => byId.get(id)!);
  await writeAddressBook(next);
  return ok(req, { cards: next });
}

export async function handleAddressBookRemove(req: ExtensionRequest): Promise<ExtensionResponse> {
  const body = payload(req);
  const id = typeof body.id === "string" ? body.id : "";
  const cards = await readAddressBook();
  if (!cards.some((c) => c.id === id)) return fail(req, "NOT_FOUND", "Not found");
  await writeAddressBook(cards.filter((c) => c.id !== id));
  return ok(req, { id });
}
