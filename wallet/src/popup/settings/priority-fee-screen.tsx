/**
 * Popup settings screen for the default v1 priority fee in lamports.
 * Does not edit the legacy CU price.
 */
import type { JSX } from "react";
import { useCallback, useRef, useState } from "react";
import { DEFAULT_PRIORITY_FEE_LAMPORTS, parsePriorityFeeLamports, type PublicSettings } from "../../shared/protocol";
import { useT } from "../state/useT";
import { patchSettingsPartial, useSettingsIo } from "./settings-logic";

export function PriorityFeeScreen({ settings }: { settings: PublicSettings }): JSX.Element {
  const io = useSettingsIo();
  const { locale } = useT();
  const [draft, setDraft] = useState(settings.defaultPriorityFeeLamports);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        setDraft(DEFAULT_PRIORITY_FEE_LAMPORTS);
        if (settings.defaultPriorityFeeLamports !== DEFAULT_PRIORITY_FEE_LAMPORTS) {
          void patchSettingsPartial({ defaultPriorityFeeLamports: DEFAULT_PRIORITY_FEE_LAMPORTS }, io, locale);
        }
        return;
      }
      const parsed = parsePriorityFeeLamports(trimmed);
      if (parsed == null) {
        setDraft(settings.defaultPriorityFeeLamports);
        return;
      }
      const next = parsed.toString();
      if (next === settings.defaultPriorityFeeLamports) {
        setDraft(next);
        return;
      }
      void patchSettingsPartial({ defaultPriorityFeeLamports: next }, io, locale);
    },
    [io, locale, settings.defaultPriorityFeeLamports],
  );

  return (
    <div className="field">
      <label htmlFor="settings-default-priority-fee">lamports</label>
      <input
        id="settings-default-priority-fee"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          if (debounceRef.current != null) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            debounceRef.current = null;
            commit(v);
          }, 500);
        }}
        onBlur={() => {
          if (debounceRef.current != null) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
          }
          commit(draft);
        }}
      />
    </div>
  );
}
