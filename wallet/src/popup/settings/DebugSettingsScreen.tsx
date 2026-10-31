/**
 * Debug settings: a master switch, then vendor base URLs used only while debug is on.
 * Does not change API keys or the default origins used when debug is off.
 */
import type { JSX } from "react";
import { useState } from "react";
import type { PublicSettings } from "../../shared/protocol";
import { DEFAULT_JUPITER_API_URL, DEFAULT_OPENROUTER_API_URL } from "../../shared/rpc";
import { PUBLIC_RPC_BY_CLUSTER } from "../../shared/protocol";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import { ApiUrlField } from "./ApiUrlField";
import { patchSettingsPartial, useSettingsIo } from "./settings-logic";

export function DebugSettingsScreen({ settings }: { settings: PublicSettings }): JSX.Element {
  const { wallet } = usePopupContext();
  const io = useSettingsIo();
  const { locale, t } = useT();
  const [claimedId, setClaimedId] = useState<string | null>(null);
  const release = (rowId: string): void => {
    setClaimedId((current) => (current === rowId ? null : current));
  };

  return (
    <>
      <div className="tx-ai-toggle-row">
        <span className="name">{t("settings.debug.enable")}</span>
        <button
          type="button"
          className="tx-ai-switch"
          role="switch"
          aria-checked={settings.debugModeEnabled}
          onClick={() => {
            void patchSettingsPartial({ debugModeEnabled: !settings.debugModeEnabled }, io, locale);
          }}
        />
      </div>
      {settings.debugModeEnabled ? (
        <>
          <ApiUrlField
            id="jupiter-api-url"
            label="Jupiter API URL"
            value={settings.jupiterApiUrl}
            placeholder={DEFAULT_JUPITER_API_URL}
            claimedId={claimedId}
            onClaim={setClaimedId}
            onRelease={release}
            persist={(value) => {
              if (!wallet) return Promise.resolve(false);
              return patchSettingsPartial({ jupiterApiUrl: value.trim() }, io, locale);
            }}
          />
          <ApiUrlField
            id="openrouter-base-url"
            label="OpenRouter base URL"
            value={settings.openRouterApiUrl}
            placeholder={DEFAULT_OPENROUTER_API_URL}
            claimedId={claimedId}
            onClaim={setClaimedId}
            onRelease={release}
            persist={(value) => {
              if (!wallet) return Promise.resolve(false);
              return patchSettingsPartial({ openRouterApiUrl: value.trim() }, io, locale);
            }}
          />
          <ApiUrlField
            id="mainnet-blockhash-rpc-url"
            label="Mainnet blockhash RPC"
            value={settings.mainnetBlockhashRpcUrl}
            placeholder={PUBLIC_RPC_BY_CLUSTER.mainnet}
            claimedId={claimedId}
            onClaim={setClaimedId}
            onRelease={release}
            persist={(value) => {
              if (!wallet) return Promise.resolve(false);
              return patchSettingsPartial({ mainnetBlockhashRpcUrl: value.trim() }, io, locale);
            }}
          />
        </>
      ) : null}
    </>
  );
}
