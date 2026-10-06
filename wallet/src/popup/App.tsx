import type { JSX } from "react";
import { PopupMarkup } from "./PopupMarkup";
import { PopupProvider } from "./state/PopupContext";
import { DockProvider } from "./state/dock";
import { usePopupAppState } from "./state/usePopupAppState";

export function App(): JSX.Element {
  const api = usePopupAppState();
  return (
    <PopupProvider value={api}>
      <DockProvider>
        <div id="app">
          <PopupMarkup />
        </div>
      </DockProvider>
    </PopupProvider>
  );
}
