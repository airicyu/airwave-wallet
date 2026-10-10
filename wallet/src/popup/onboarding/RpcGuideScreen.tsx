import type { JSX } from "react";
import { useCallback } from "react";
import { sendExtensionRequest } from "../../shared/ext-api";
import { FirstRunBrand } from "../components/FirstRunBrand";
import { usePopupContext } from "../state/PopupContext";
import { useRegisterDock } from "../state/dock";
import { useT } from "../state/useT";

const HELIUS_SIGNUP_URL = "https://www.helius.dev/";

export function RpcGuideScreen(): JSX.Element {
  const { refresh, navigateTo, wallet } = usePopupContext();
  const { t } = useT();
  const noAccounts = (wallet?.accounts.length ?? 0) === 0;

  const dismissThen = useCallback(
    async (next: "settings-rpc" | "home-token" | "add-account") => {
      await sendExtensionRequest("storage.patchSettings", { rpcGuideDismissed: true });
      await refresh();
      navigateTo(next);
    },
    [navigateTo, refresh],
  );

  useRegisterDock({
    label: t("rpcGuide.setRpc"),
    disabled: false,
    onPrimary: () => void dismissThen("settings-rpc"),
    secondaryLabel: t("rpcGuide.skip"),
    onSecondary: () => void dismissThen(noAccounts ? "add-account" : "home-token"),
  });

  return (
    <section id="screen-rpc-guide" className="screen rpc-guide first-run-page">
      <FirstRunBrand />
      <div className="first-run-main rpc-guide-copy">
        <h3>{t("rpcGuide.title")}</h3>
        <p className="rpc-guide-body">{t("rpcGuide.body")}</p>
        <button
          type="button"
          className="rpc-guide-link"
          onClick={() => void chrome.tabs.create({ url: HELIUS_SIGNUP_URL })}
        >
          {t("rpcGuide.heliusLink")}
        </button>
      </div>
    </section>
  );
}
