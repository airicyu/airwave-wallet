import { sendExtensionRequest } from "../shared/ext-api";
import type { PendingRecord } from "../shared/commands";

const params = new URLSearchParams(location.search);
const requestId = params.get("requestId");

const originEl = document.getElementById("origin")!;
const kindEl = document.getElementById("kind")!;
const detailEl = document.getElementById("detail")!;
const errorEl = document.getElementById("error")!;

function showError(msg: string): void {
  errorEl.hidden = false;
  errorEl.textContent = msg;
}

async function load(): Promise<void> {
  if (!requestId) {
    showError("缺少 requestId");
    return;
  }
  const res = await sendExtensionRequest("ui.getPending", { requestId });
  if (!res.ok) {
    showError(res.error?.message ?? "無法載入請求");
    return;
  }
  const p = res.result as PendingRecord;
  originEl.textContent = p.origin;
  if (p.kind === "connect") {
    kindEl.textContent = "這個網站想連線到你的錢包";
    detailEl.hidden = true;
    detailEl.textContent = "";
  } else {
    kindEl.textContent = p.kind === "signMessage" ? "簽署訊息" : "簽署交易";
    detailEl.hidden = false;
    detailEl.textContent = JSON.stringify(p.payload, null, 2);
  }
}

async function resolve(decision: "approve" | "reject"): Promise<void> {
  if (!requestId) return;
  const res = await sendExtensionRequest("ui.resolvePending", { requestId, decision });
  if (!res.ok) {
    showError(res.error?.message ?? "失敗");
    return;
  }
  window.close();
}

document.getElementById("approve")!.addEventListener("click", () => void resolve("approve"));
document.getElementById("reject")!.addEventListener("click", () => void resolve("reject"));

void load();
