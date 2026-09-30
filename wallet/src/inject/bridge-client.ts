import type { AirwaveCommand } from "../shared/commands";

const pending = new Map<
  string,
  { resolve: (v: unknown) => void; reject: (e: Error) => void }
>();

const TIMEOUT_MS = 120_000;

export function bridgeRequest(command: AirwaveCommand, payload?: unknown): Promise<unknown> {
  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error("Request timed out"));
    }, TIMEOUT_MS);

    pending.set(requestId, {
      resolve: (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      reject: (e) => {
        clearTimeout(timer);
        reject(e);
      },
    });

    window.postMessage(
      { source: "airwave-inject", requestId, command, payload },
      "*",
    );
  });
}

window.addEventListener("message", (e) => {
  if (e.source !== window) return;
  const data = e.data;
  if (!data || typeof data !== "object") return;

  if (data.source === "airwave-content" && data.requestId) {
    const entry = pending.get(data.requestId as string);
    if (!entry) return;
    pending.delete(data.requestId as string);
    if (data.ok) entry.resolve(data.result);
    else {
      const errBody = data.error as { code?: string; message?: string } | undefined;
      const err = new Error(errBody?.message ?? "Request failed") as Error & {
        code?: string;
      };
      if (errBody?.code) err.code = errBody.code;
      entry.reject(err);
    }
    return;
  }

  if (data.source === "airwave-content" && data.event === "account-changed") {
    window.dispatchEvent(
      new CustomEvent("airwave-account-changed", {
        detail: {
          publicKeyBase58: data.publicKeyBase58 as string,
          cluster: data.cluster as string | undefined,
        },
      }),
    );
  }

  if (data.source === "airwave-content" && data.event === "disconnected") {
    window.dispatchEvent(
      new CustomEvent("airwave-disconnected", {
        detail: { origin: data.origin as string },
      }),
    );
  }
});
