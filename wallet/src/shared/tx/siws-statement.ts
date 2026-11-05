/**
 * Composes the Sign In With Solana statement from fields the site sent.
 * Does not choose the signing account or check the page origin.
 */

export type SiwsFields = {
  domain: string;
  address: string;
  statement?: string;
  uri?: string;
  version?: string;
  chainId?: string;
  nonce?: string;
  issuedAt?: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: readonly string[];
};

export function domainFromOrigin(origin: string): string {
  const url = new URL(origin);
  if (url.port && url.port !== "80" && url.port !== "443") return `${url.hostname}:${url.port}`;
  return url.hostname;
}

export function composeSiwsStatement(fields: SiwsFields): string {
  const lines = [`${fields.domain} wants you to sign in with your Solana account:`, fields.address];
  if (fields.statement) lines.push("", fields.statement);
  const labeled: string[] = [];
  const push = (label: string, value: string | undefined) => {
    if (value) labeled.push(`${label}: ${value}`);
  };
  push("URI", fields.uri);
  push("Version", fields.version);
  push("Chain ID", fields.chainId);
  push("Nonce", fields.nonce);
  push("Issued At", fields.issuedAt);
  push("Expiration Time", fields.expirationTime);
  push("Not Before", fields.notBefore);
  push("Request ID", fields.requestId);
  const resources = fields.resources ?? [];
  if (labeled.length > 0 || resources.length > 0) lines.push("");
  lines.push(...labeled);
  if (resources.length > 0) {
    lines.push("Resources:");
    for (const entry of resources) lines.push(`- ${entry}`);
  }
  const text = lines.join("\n");
  if (labeled.length > 0 && resources.length === 0) return `${text}\n`;
  return text;
}
