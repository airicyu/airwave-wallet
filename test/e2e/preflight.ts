/**
 * Hard checks before an agent-driven e2e run: Solana CLI on PATH, and the five
 * in-repo mock fixtures under test/e2e/fixtures. Soft-warns when the mock is
 * down or wallet/dist is missing. Never prints secrets.
 * Run: bun test/e2e/preflight.ts  (or: bun run e2e-preflight)
 */
import { existsSync, statSync } from "node:fs";
import path from "node:path";

const e2eDir = import.meta.dir;
const repoRoot = path.resolve(e2eDir, "../..");
const fixturesDir = path.resolve(
  process.env.AIRWAVE_E2E_FIXTURES || path.join(e2eDir, "fixtures"),
);

const REQUIRED_FIXTURES = [
  "jupiter/tokens-v2-search.json",
  "helius/address-transactions-page1.json",
  "helius/address-transactions-page2.json",
  "openrouter/chat-completions.json",
  "openrouter/decisions.json",
] as const;

function onPath(bin: string): boolean {
  return Bun.which(bin) != null;
}

function print(msg: string) {
  console.log(msg);
}

function warn(msg: string) {
  console.warn(`WARN: ${msg}`);
}

function fail(msg: string) {
  console.error(`FAIL: ${msg}`);
}

const hardFails: string[] = [];

if (!onPath("solana")) {
  hardFails.push("`solana` not found on PATH");
} else {
  print("ok: solana on PATH");
}

if (!onPath("solana-test-validator")) {
  hardFails.push("`solana-test-validator` not found on PATH");
} else {
  print("ok: solana-test-validator on PATH");
}

print(`fixtures root: ${fixturesDir}`);
if (!existsSync(fixturesDir) || !statSync(fixturesDir).isDirectory()) {
  hardFails.push(`fixtures directory missing: ${fixturesDir}`);
} else {
  for (const rel of REQUIRED_FIXTURES) {
    const full = path.join(fixturesDir, rel);
    if (!existsSync(full)) {
      hardFails.push(`fixture missing: ${rel}`);
    } else {
      print(`ok: fixture ${rel}`);
    }
  }
}

const mockUrl = (process.env.MOCK_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
const healthUrl = `${mockUrl}/health`;
try {
  const res = await fetch(healthUrl, { signal: AbortSignal.timeout(2000) });
  if (res.ok) {
    print(`ok: mock health ${healthUrl}`);
  } else {
    warn(`mock health ${healthUrl} returned HTTP ${res.status} (start with: bun run e2e-mock)`);
  }
} catch {
  warn(`mock not reachable at ${healthUrl} (start with: bun run e2e-mock)`);
}

const manifestPath = path.join(repoRoot, "wallet/dist/manifest.json");
if (existsSync(manifestPath)) {
  try {
    const manifest = (await Bun.file(manifestPath).json()) as { version?: string };
    print(`ok: wallet/dist manifest version ${manifest.version ?? "(missing version field)"}`);
  } catch (e) {
    warn(`wallet/dist/manifest.json present but unreadable: ${e instanceof Error ? e.message : e}`);
  }
} else {
  warn("wallet/dist/manifest.json missing (build with: bun run build)");
}

if (hardFails.length > 0) {
  for (const msg of hardFails) fail(msg);
  process.exit(1);
}

print("e2e preflight: hard checks passed");
