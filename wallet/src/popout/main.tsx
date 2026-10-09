/**
 * Approval popout boot: connect mounts ConnectPage; other kinds use the approval shell.
 * Does not open the wallet window or side panel.
 */
import { createRoot } from "react-dom/client";
import { mountApprovalShell } from "../approval/shell";
import { ConnectPage } from "../flow/ConnectPage";
import { brandIconUrl } from "../shared/brand-icon";
import type { PendingRecord } from "../shared/commands";
import { sendExtensionRequest } from "../shared/ext-api";
import { DEFAULT_UI_LOCALE, parseUiLocale, t } from "../shared/ui-i18n";
import { STORAGE } from "../shared/storage-keys";

const params = new URLSearchParams(location.search);
const requestId = params.get("requestId");

async function boot(): Promise<void> {
  document.querySelectorAll<HTMLImageElement>("[data-brand-mark]").forEach((img) => {
    img.src = brandIconUrl();
  });

  let locale = DEFAULT_UI_LOCALE;
  try {
    const data = await chrome.storage.local.get(STORAGE.settings);
    const raw = data[STORAGE.settings] as { locale?: unknown } | undefined;
    locale = parseUiLocale(raw?.locale);
  } catch {
    /* ignore */
  }

  const root = document.getElementById("root");
  if (!root) return;

  if (!requestId) {
    document.body.innerHTML = `<p>${t(locale, "error.code.MISSING_REQUEST_ID")}</p>`;
    return;
  }

  const pendingRes = await sendExtensionRequest("ui.getPending", { requestId });
  if (pendingRes.ok && (pendingRes.result as PendingRecord).kind === "connect") {
    root.innerHTML = "";
    createRoot(root).render(
      <ConnectPage requestId={requestId} onFinished={() => window.close()} />,
    );
    return;
  }

  mountApprovalShell(
    {
      requestId,
      host: "popout",
      callbacks: {
        onClose: () => window.close(),
        onWalletSendReject: () => window.close(),
        onWalletSendSuccessExit: () => window.close(),
      },
    },
    root,
  );
}

void boot();
