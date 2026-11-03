/**
 * Reset local solana-test-validator (optional), airdrop once, print balance.
 * Avoids the double-airdrop / stale-ledger mistakes from manual prep.
 *
 * Usage (repo root):
 *   bun run e2e-prep -- <address> [--sol 2]
 *   bun run e2e-prep -- <address> --no-reset   # airdrop only; keep current ledger
 *
 * Default: stop any listener on :8899, start solana-test-validator (--reset) in the
 * background, wait until RPC is healthy, airdrop exactly once, verify balance,
 * leave the validator running, exit 0.
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const RPC = (process.env.AIRWAVE_E2E_RPC || "http://127.0.0.1:8899").replace(/\/$/, "");
const RPC_PORT = Number(new URL(RPC).port || 8899);
const FAUCET_PORT = Number(process.env.AIRWAVE_E2E_FAUCET_PORT || 9900);

function usage(): never {
  console.error(
    [
      "Usage: bun run e2e-prep -- <address> [--sol 2] [--no-reset]",
      "  address     wallet pubkey to fund (required)",
      "  --sol N     airdrop amount (default 2)",
      "  --no-reset  skip validator kill/restart; only airdrop once",
    ].join("\n"),
  );
  process.exit(2);
}

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  let address = "";
  let sol = 2;
  let reset = true;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--no-reset") {
      reset = false;
      continue;
    }
    if (a === "--sol") {
      const n = Number(args[++i]);
      if (!Number.isFinite(n) || n <= 0) usage();
      sol = n;
      continue;
    }
    if (a.startsWith("-")) usage();
    if (address) usage();
    address = a;
  }
  if (!address || address.length < 32) usage();
  return { address, sol, reset };
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const body = (await res.json()) as { result?: T; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message || "RPC error");
  return body.result as T;
}

async function waitHealthy(timeoutMs = 60000) {
  const start = Date.now();
  let last = "";
  while (Date.now() - start < timeoutMs) {
    try {
      const health = await rpc<string>("getHealth", []);
      if (health === "ok") {
        console.log(`ok: validator healthy at ${RPC}`);
        return;
      }
      last = String(health);
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
    }
    await sleep(500);
  }
  throw new Error(`validator not healthy within ${timeoutMs}ms (${last})`);
}

async function getBalanceLamports(address: string): Promise<bigint> {
  const result = await rpc<{ value: number }>("getBalance", [
    address,
    { commitment: "confirmed" },
  ]);
  return BigInt(result.value);
}

function onPath(bin: string): boolean {
  return Bun.which(bin) != null;
}

async function stopValidatorOnPort(port: number) {
  if (process.platform === "win32") {
    const ps = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `$conns = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue; foreach ($c in $conns) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue }`,
      ],
      { stdio: "ignore" },
    );
    await new Promise<void>((resolve) => ps.on("exit", () => resolve()));
  } else {
    const ps = spawn(
      "bash",
      [
        "-lc",
        `fuser -k ${port}/tcp 2>/dev/null || (lsof -ti tcp:${port} | xargs -r kill -9) || true`,
      ],
      { stdio: "ignore" },
    );
    await new Promise<void>((resolve) => ps.on("exit", () => resolve()));
  }
  await sleep(800);
}

function startValidatorDetached() {
  const bin = Bun.which("solana-test-validator");
  if (!bin) throw new Error("`solana-test-validator` not found on PATH");
  const child = spawn(
    bin,
    [
      "--reset",
      "--quiet",
      "--bind-address",
      "127.0.0.1",
      "--rpc-port",
      String(RPC_PORT),
      "--faucet-port",
      String(FAUCET_PORT),
    ],
    {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    },
  );
  child.unref();
  console.log(`ok: started solana-test-validator --reset (pid ${child.pid}) on :${RPC_PORT}`);
}

async function airdropOnce(address: string, sol: number) {
  if (!onPath("solana")) throw new Error("`solana` not found on PATH");
  const before = await getBalanceLamports(address);
  console.log(`balance before airdrop: ${before} lamports`);

  const proc = Bun.spawn(
    ["solana", "airdrop", String(sol), address, "--url", RPC],
    { stdout: "pipe", stderr: "pipe" },
  );
  const out = (await new Response(proc.stdout).text()).trim();
  const err = (await new Response(proc.stderr).text()).trim();
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`solana airdrop failed (exit ${code}): ${err || out}`);
  }
  if (out) console.log(out);

  const expect = before + BigInt(Math.round(sol * 1_000_000_000));
  const start = Date.now();
  let after = before;
  while (Date.now() - start < 20000) {
    after = await getBalanceLamports(address);
    if (after >= expect) break;
    await sleep(400);
  }
  console.log(`balance after airdrop: ${after} lamports (${Number(after) / 1e9} SOL)`);
  if (after < expect) {
    throw new Error(
      `balance ${after} < expected ${expect} after single airdrop of ${sol} SOL`,
    );
  }
  console.log("ok: single airdrop applied (do not airdrop again for this scenario)");
}

const { address, sol, reset } = parseArgs(process.argv);

if (reset) {
  console.log(`prep: reset validator on ${RPC}, then airdrop ${sol} SOL once to ${address}`);
  await stopValidatorOnPort(RPC_PORT);
  startValidatorDetached();
  await waitHealthy();
  await sleep(1500);
} else {
  console.log(`prep: --no-reset; airdrop ${sol} SOL once to ${address} on ${RPC}`);
  await waitHealthy(15000);
}

await airdropOnce(address, sol);
console.log("e2e-prep: done");
