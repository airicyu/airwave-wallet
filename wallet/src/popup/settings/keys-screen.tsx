/**
 * Popup settings screen for Helius and Jupiter API credentials.
 * Does not edit RPC cluster lists or OpenRouter tx-ai models.
 */
import type { JSX } from "react";
import { useState } from "react";
import type { PublicSettings } from "../../shared/protocol";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import { persistHeliusField, persistJupiterField, useSettingsIo } from "./settings-logic";
import { SecretKeyField } from "./SecretKeyField";

export function KeysScreen({ settings }: { settings: PublicSettings }): JSX.Element {
  const { wallet } = usePopupContext();
  const io = useSettingsIo();
  const { locale } = useT();
  const [claimedId, setClaimedId] = useState<string | null>(null);
  const release = (rowId: string): void => {
    setClaimedId((current) => (current === rowId ? null : current));
  };

  return (
    <>
      <SecretKeyField
        id="helius-api-url"
        label="Helius API URL"
        configured={settings.heliusConfigured}
        secretName="heliusApiUrl"
        claimedId={claimedId}
        onClaim={setClaimedId}
        onRelease={release}
        persist={(value) => {
          if (!wallet) return Promise.resolve(false);
          return persistHeliusField({ draft: value, io, locale });
        }}
      />
      <SecretKeyField
        id="jupiter-api-key"
        label="Jupiter API key"
        configured={settings.jupiterConfigured}
        secretName="jupiterApiKey"
        claimedId={claimedId}
        onClaim={setClaimedId}
        onRelease={release}
        persist={(value) => {
          if (!wallet) return Promise.resolve(false);
          return persistJupiterField({ draft: value, io, locale });
        }}
      />
    </>
  );
}
