/**
 * One settings page for the v1 priority fee and the legacy CU price.
 * Does not write a value until the row's confirm control is pressed.
 */
import { useState, type JSX } from "react";
import { parsePriorityFeeLamports, type PublicSettings } from "../../shared/protocol";
import { IconCheck, IconX } from "../components/StrokeIcon";
import { useT } from "../state/useT";
import { parseDefaultCuPriceInput, patchSettingsPartial, useSettingsIo } from "./settings-logic";

function FeeField({
  id,
  label,
  saved,
  onCommit,
}: {
  id: string;
  label: string;
  saved: string;
  onCommit: (raw: string) => boolean;
}): JSX.Element {
  const { t } = useT();
  const [draft, setDraft] = useState(saved);
  const [seen, setSeen] = useState(saved);
  if (saved !== seen) {
    setSeen(saved);
    setDraft(saved);
  }
  const dirty = draft !== saved;

  return (
    <div className="field fee-field">
      <label htmlFor={id}>{label}</label>
      <div className="fee-edit-line">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        {dirty ? (
          <>
            <button
              type="button"
              className="icon-btn confirm-tick"
              title={t("common.confirm")}
              aria-label={t("common.confirm")}
              onClick={() => {
                if (onCommit(draft)) return;
                setDraft(saved);
              }}
            >
              <IconCheck />
            </button>
            <button
              type="button"
              className="icon-btn discard-cross"
              title={t("common.discard")}
              aria-label={t("common.discard")}
              onClick={() => setDraft(saved)}
            >
              <IconX />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function FeeSettingsScreen({ settings }: { settings: PublicSettings }): JSX.Element {
  const io = useSettingsIo();
  const { t, locale } = useT();

  return (
    <>
      <FeeField
        id="settings-default-priority-fee"
        label={t("settings.fee.priority")}
        saved={settings.defaultPriorityFeeLamports}
        onCommit={(raw) => {
          const parsed = parsePriorityFeeLamports(raw.trim());
          if (parsed == null) return false;
          const next = parsed.toString();
          if (next !== settings.defaultPriorityFeeLamports) {
            void patchSettingsPartial({ defaultPriorityFeeLamports: next }, io, locale);
          }
          return true;
        }}
      />
      <FeeField
        id="settings-default-cu-price"
        label={t("settings.fee.cuPrice")}
        saved={String(settings.defaultCuPrice)}
        onCommit={(raw) => {
          const parsed = parseDefaultCuPriceInput(raw);
          if (parsed == null) return false;
          if (parsed !== settings.defaultCuPrice) {
            void patchSettingsPartial({ defaultCuPrice: parsed }, io, locale);
          }
          return true;
        }}
      />
    </>
  );
}
