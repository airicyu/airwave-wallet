/**
 * Hard checks before an agent-driven e2e run: Solana CLI on PATH, and the five
 * in-repo mock fixtures under test/e2e/fixtures. Soft-warns when the mock is
 * down or wallet/dist is missing. Never prints secrets.
 * Run: bun test/e2e/preflight.mjs  (or: bun run e2e-preflight)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
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
];

function onPath(bin) {
  const r = spawnSync(bin, ["--version"], { encoding: "utf8" });
  return r.status === 0;
}

function print(msg) {
  console.log(msg);
}

function warn(msg) {
  console.warn(`WARN: ${msg}`);
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
}

const hardFails = [];

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
if (!fs.existsSync(fixturesDir) || !fs.statSync(fixturesDir).isDirectory()) {
  hardFails.push(`fixtures directory missing: ${fixturesDir}`);
} else {
  for (const rel of REQUIRED_FIXTURES) {
    const full = path.join(fixturesDir, rel);
    if (!fs.existsSync(full)) {
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
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
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
