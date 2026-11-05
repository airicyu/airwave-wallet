/**
 * Checks signOffchainMessage and signIn inputs before a pending record exists.
 * Does not enqueue, sign, or read the vault.
 */
import bs58 from "bs58";
import type { SignInPayload, SignOffchainMessagePayload } from "../../shared/protocol";
import { composeSiwsStatement, domainFromOrigin } from "../../shared/tx";

export type InputError = { code: string; message: string };

const INVALID = { code: "INVALID_INPUT", message: "Invalid sign input" };

function same32(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== 32 || b.length !== 32) return false;
  for (let i = 0; i < 32; i++) if (a[i] !== b[i]) return false;
  return true;
}

function cmp32(a: Uint8Array, b: Uint8Array): number {
  for (let i = 0; i < 32; i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return 0;
}

export function prepareOffchainPayload(
  raw: unknown,
  activePublicKey: Uint8Array,
): { ok: true; payload: SignOffchainMessagePayload } | { ok: false; error: InputError } {
  if (!raw || typeof raw !== "object") return { ok: false, error: INVALID };
  const body = raw as {
    messageVersion?: unknown;
    message?: unknown;
    requiredSigners?: unknown;
    accountPublicKey?: unknown;
  };
  if (body.messageVersion !== 1) return { ok: false, error: INVALID };
  if (typeof body.message !== "string" || body.message.length === 0) return { ok: false, error: INVALID };
  if (!Array.isArray(body.requiredSigners) || body.requiredSigners.length === 0) {
    return { ok: false, error: INVALID };
  }
  if (body.requiredSigners.length > 255) return { ok: false, error: INVALID };
  if (!Array.isArray(body.accountPublicKey)) return { ok: false, error: INVALID };
  const accountKey = Uint8Array.from(body.accountPublicKey as number[]);
  if (!same32(accountKey, activePublicKey)) return { ok: false, error: INVALID };

  const keys: Uint8Array[] = [];
  for (const item of body.requiredSigners) {
    if (!Array.isArray(item)) return { ok: false, error: INVALID };
    const key = Uint8Array.from(item as number[]);
    if (key.length !== 32) return { ok: false, error: INVALID };
    keys.push(key);
  }
  keys.sort(cmp32);
  for (let i = 1; i < keys.length; i++) {
    if (same32(keys[i - 1]!, keys[i]!)) return { ok: false, error: INVALID };
  }
  if (!keys.some((key) => same32(key, accountKey))) return { ok: false, error: INVALID };
  return {
    ok: true,
    payload: {
      message: body.message,
      requiredSigners: keys.map((key) => Array.from(key)),
    },
  };
}

function optionalString(value: unknown): string | undefined | null {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") return null;
  return value;
}

export function prepareSignInPayload(
  raw: unknown,
  origin: string,
  activeAddress: string,
): { ok: true; payload: SignInPayload } | { ok: false; error: InputError } {
  const body = (raw ?? {}) as Record<string, unknown>;
  if (typeof body !== "object") return { ok: false, error: INVALID };
  let offchain = false;
  if (body.useOffchainMessage != null) {
    const flag = body.useOffchainMessage;
    if (!flag || typeof flag !== "object" || Array.isArray(flag)) return { ok: false, error: INVALID };
    const rec = flag as Record<string, unknown>;
    if (rec.messageVersion !== 1 || Object.keys(rec).length !== 1) return { ok: false, error: INVALID };
    offchain = true;
  }
  const statement = optionalString(body.statement);
  const uri = optionalString(body.uri);
  const version = optionalString(body.version);
  const chainId = optionalString(body.chainId);
  const nonce = optionalString(body.nonce);
  const issuedAt = optionalString(body.issuedAt);
  const expirationTime = optionalString(body.expirationTime);
  const notBefore = optionalString(body.notBefore);
  const requestId = optionalString(body.requestId);
  if (
    [statement, uri, version, chainId, nonce, issuedAt, expirationTime, notBefore, requestId].includes(
      null,
    )
  ) {
    return { ok: false, error: INVALID };
  }
  let resources: string[] | undefined;
  if (body.resources != null) {
    if (!Array.isArray(body.resources) || body.resources.some((item) => typeof item !== "string")) {
      return { ok: false, error: INVALID };
    }
    if (body.resources.length > 0) resources = body.resources as string[];
  }
  const statementText = composeSiwsStatement({
    domain: domainFromOrigin(origin),
    address: activeAddress,
    statement: statement ?? undefined,
    uri: uri ?? undefined,
    version: version ?? undefined,
    chainId: chainId ?? undefined,
    nonce: nonce ?? undefined,
    issuedAt: issuedAt ?? undefined,
    expirationTime: expirationTime ?? undefined,
    notBefore: notBefore ?? undefined,
    requestId: requestId ?? undefined,
    resources,
  });
  return { ok: true, payload: { statementText, offchain } };
}

export function activeKeyBytes(base58: string): Uint8Array | null {
  try {
    const bytes = bs58.decode(base58);
    return bytes.length === 32 ? bytes : null;
  } catch {
    return null;
  }
}
