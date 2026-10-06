import type { JSX } from "react";
import { useEffect } from "react";
import { PopupMarkup } from "./PopupMarkup";
import { PopupProvider, usePopupContext } from "./state/PopupContext";
import { usePopupAppState } from "./state/usePopupAppState";
import { usePopupController } from "./usePopupController";
import { navigateTo, session } from "./lib/session";
import { bindPopupRuntime, syncWalletSideEffects } from "./runtime";

function PopupAppInner(): JSX.Element {
  const api = usePopupContext();
  bindPopupRuntime(api);
  usePopupController(api);

  useEffect(() => {
    if (api.wallet) syncWalletSideEffects(api.wallet);
  }, [api.wallet]);

  const onOpenTokenDetail = (tokenId: string) => {
    session.detailTokenId = tokenId;
    navigateTo("token-detail");
  };

  const onTokenSend = () => {
    navigateTo("token-send");
  };

  return (
    <PopupMarkup
      wallet={api.wallet}
      currentView={api.currentView}
      tick={api.tick}
      onOpenTokenDetail={onOpenTokenDetail}
      onTokenSend={onTokenSend}
    />
  );
}

export function App(): JSX.Element {
  const api = usePopupAppState();
  return (
    <PopupProvider value={api}>
      <div id="app">
        <PopupAppInner />
      </div>
    </PopupProvider>
  );
}
