/**
 * The Mainnet empty state that asks the user to set an RPC before home data can load.
 * The button opens RPC settings. Token and activity lists decide when to show this stop.
 */
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
