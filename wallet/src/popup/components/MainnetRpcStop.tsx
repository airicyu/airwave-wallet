import type { JSX } from "react";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";

export function MainnetRpcStop(): JSX.Element {
  const { navigateTo } = usePopupContext();
  const { t } = useT();
  return (
    <div className="home-rpc-stop">
      <p>{t("home.mainnetRpcRequired")}</p>
      <button type="button" className="home-rpc-stop-btn" onClick={() => navigateTo("settings-rpc")}>
        {t("home.goSetRpc")}
      </button>
    </div>
  );
}
