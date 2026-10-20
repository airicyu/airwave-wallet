/**
 * Popup settings screen for default compute-unit price (micro-lamports per CU).
 * Does not edit RPC URLs or API keys.
 */
import type { JSX } from "react";
import { useCallback, useRef, useState } from "react";
import type { PublicSettings } from "../../shared/protocol";
import { useT } from "../state/useT";
import { parseDefaultCuPriceInput, patchSettingsPartial, useSettingsIo } from "./settings-logic";

export function CuPriceScreen({ settings }: { settings: PublicSettings }): JSX.Element {
  const io = useSettingsIo();
  const { locale } = useT();
  const [draft, setDraft] = useState(String(settings.defaultCuPrice));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = useCallback(
    (raw: string) => {
      const parsed = parseDefaultCuPriceInput(raw);
      if (parsed == null) {
        setDraft(String(settings.defaultCuPrice));
        return;
      }
      if (parsed === settings.defaultCuPrice) return;
      void patchSettingsPartial({ defaultCuPrice: parsed }, io, locale);
    },
    [io, locale, settings.defaultCuPrice],
  );

  return (
    <div className="field">
      <label htmlFor="settings-default-cu-price">micro-lamports / CU</label>
      <input
        id="settings-default-cu-price"
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
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
