import { mountApprovalShell } from "../approval/shell";
import { brandIconUrl } from "../shared/brand-icon";
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

  if (!requestId) {
    document.body.innerHTML = `<p>${t(locale, "error.code.MISSING_REQUEST_ID")}</p>`;
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
    document.getElementById("root")!,
  );
}

void boot();
