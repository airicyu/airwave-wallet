/**
 * Popup screen to change the vault password from wallet-lock settings.
 * Does not unlock the wallet or edit idle auto-lock.
 */
import type { JSX } from "react";
import { useCallback, useState } from "react";
import { WalletPasswordInput } from "../components/WalletPasswordInput";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import { useRegisterDock } from "../state/dock";
import { changePasswordCanSubmit, submitChangePassword, useSettingsIo } from "./settings-logic";

export function ChangePasswordScreen(): JSX.Element {
  const io = useSettingsIo();
  const { clearError, navigateTo } = usePopupContext();
  const { locale, t } = useT();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");

  const onPrimary = useCallback(async () => {
    clearError();
    const result = await submitChangePassword({
      currentPassword: current,
      newPassword: next,
      confirm,
      locale,
      io,
    });
    if (!result.ok) {
      if (result.err) setErr(t(result.err));
      return;
    }
    navigateTo("settings-wallet-lock");
  }, [clearError, current, next, confirm, io, locale, navigateTo, t]);

  useRegisterDock({
    label: t("settings.password.change"),
    disabled: !changePasswordCanSubmit(current, next, confirm),
    onPrimary,
  });

  return (
    <>
      <div className="field">
        <label htmlFor="change-pwd-current">{t("settings.password.current")}</label>
        <WalletPasswordInput
          id="change-pwd-current"
          value={current}
          onChange={(v) => {
            setCurrent(v);
            setErr("");
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="change-pwd-new">{t("settings.password.new")}</label>
        <WalletPasswordInput
          id="change-pwd-new"
          value={next}
          onChange={(v) => {
            setNext(v);
            setErr("");
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="change-pwd-confirm">{t("settings.password.confirmNew")}</label>
        <WalletPasswordInput
          id="change-pwd-confirm"
          value={confirm}
          onChange={(v) => {
            setConfirm(v);
            setErr("");
          }}
        />
      </div>
      <p id="change-pwd-err" className="inline-err">
        {err}
      </p>
    </>
  );
}
