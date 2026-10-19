import type { JSX } from "react";
import type { PublicSettings } from "../../shared/storage-keys";
import { useT } from "../state/useT";
import { patchSettingsPartial, useSettingsIo } from "./settings-logic";

export function NetworkScreen({ settings }: { settings: PublicSettings }): JSX.Element {
  const io = useSettingsIo();
  const { locale, t } = useT();
  return (
    <div className="network-pick-list" role="radiogroup" aria-label={t("settings.network.aria")}>
      {(["devnet", "mainnet"] as const).map((cluster) => (
        <label key={cluster} className="network-pick-row">
          <input
            type="radio"
            name="settings-cluster"
            value={cluster}
            checked={settings.cluster === cluster}
            onChange={() => {
              if (cluster === settings.cluster) return;
              void patchSettingsPartial({ cluster }, io, locale);
            }}
          />
          <span className="network-pick-meta">
            <span className="network-pick-title">{cluster === "mainnet" ? "Mainnet" : "Devnet"}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
