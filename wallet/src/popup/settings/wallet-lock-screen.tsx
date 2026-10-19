/**
 * Popup wallet-lock hub: idle auto-lock controls and link to change password.
 * Does not run the change-password form itself.
 */
import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicSettings } from "../../shared/storage-keys";
import { IconChevronDown } from "../components/StrokeIcon";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import { patchSettingsPartial, useSettingsIo } from "./settings-logic";

function IdleAutoLockSection({ settings }: { settings: PublicSettings }): JSX.Element {
  const io = useSettingsIo();
  const { locale, t } = useT();
  const [minutesDraft, setMinutesDraft] = useState(String(settings.idleAutoLockMinutes));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMinutesDraft(String(settings.idleAutoLockMinutes));
  }, [settings.idleAutoLockMinutes]);

  const commitMinutes = useCallback(
    (raw: string) => {
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1440) {
        setMinutesDraft(String(settings.idleAutoLockMinutes));
        return;
      }
      if (parsed === settings.idleAutoLockMinutes) return;
      void patchSettingsPartial({ idleAutoLockMinutes: parsed }, io, locale);
    },
    [io, locale, settings.idleAutoLockMinutes],
  );

  const bumpMinutes = (delta: number): void => {
    const parsed = Number.parseInt(minutesDraft, 10);
    const base = Number.isInteger(parsed) ? parsed : settings.idleAutoLockMinutes;
    const next = Math.min(1440, Math.max(1, base + delta));
    if (next === settings.idleAutoLockMinutes) {
      setMinutesDraft(String(next));
      return;
    }
    setMinutesDraft(String(next));
    void patchSettingsPartial({ idleAutoLockMinutes: next }, io, locale);
  };

  return (
    <section className="idle-lock-config-card" aria-labelledby="idle-lock-config-card-title">
      <h2 className="idle-lock-config-card-title" id="idle-lock-config-card-title">
        {t("settings.idleAutoLock.enable")}
      </h2>
      <div className="idle-lock-config-body">
        <div className="idle-lock-config-row">
          <span className="hub-label">{t("settings.txAiAnalysis.enable")}</span>
          <button
            type="button"
            className="tx-ai-switch"
            role="switch"
            aria-checked={settings.idleAutoLockEnabled}
            onClick={() => {
              void patchSettingsPartial(
                { idleAutoLockEnabled: !settings.idleAutoLockEnabled },
                io,
                locale,
              );
            }}
          />
        </div>
        <div className="idle-lock-config-row idle-lock-config-duration-row">
          <label className="hub-label" htmlFor="settings-idle-lock-minutes">
            {t("settings.idleAutoLock.lockAfter")}
          </label>
          <div className="idle-lock-minutes-stepper">
            <input
              id="settings-idle-lock-minutes"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={minutesDraft}
              onChange={(e) => {
                const v = e.target.value;
                setMinutesDraft(v);
                if (debounceRef.current) clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(() => commitMinutes(v), 400);
              }}
              onBlur={() => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                commitMinutes(minutesDraft);
              }}
            />
            <div className="idle-lock-minutes-spin" role="group" aria-label={t("settings.idleAutoLock.lockAfter")}>
              <button
                type="button"
                className="idle-lock-minutes-step"
                title={t("settings.idleAutoLock.increase")}
                aria-label={t("settings.idleAutoLock.increase")}
                onClick={() => bumpMinutes(1)}
              >
                <span className="idle-lock-minutes-chevron-up" aria-hidden="true">
                  <IconChevronDown size={14} />
                </span>
              </button>
              <button
                type="button"
                className="idle-lock-minutes-step"
                title={t("settings.idleAutoLock.decrease")}
                aria-label={t("settings.idleAutoLock.decrease")}
                onClick={() => bumpMinutes(-1)}
              >
                <IconChevronDown size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function WalletLockSettingsScreen({ settings }: { settings: PublicSettings }): JSX.Element {
  const { navigateTo } = usePopupContext();
  const { t } = useT();
  return (
    <div className="wallet-lock-settings">
      <IdleAutoLockSection settings={settings} />
      <ul className="settings-hub-list">
        <li>
          <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-password")}>
            <span className="hub-label">{t("settings.hub.walletLockPassword")}</span>
            <span className="hub-summary">{t("settings.hub.changePassword")}</span>
          </button>
        </li>
      </ul>
    </div>
  );
}
