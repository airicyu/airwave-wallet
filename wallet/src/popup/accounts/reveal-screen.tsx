/**
 * Popup screen to reveal a signing account secret after password confirmation.
 * Does not export seed phrases or manage combined members.
 */
import type { JSX } from "react";
import { useState } from "react";
import { isSigningOrWatch } from "../../shared/accounts";
import { sendExtensionRequest } from "../../shared/ext-api";
import { IconCopy, IconEye } from "../components/StrokeIcon";
import { WalletPasswordInput } from "../components/WalletPasswordInput";
import { apiErrorMessage } from "../../shared/ui-i18n";
import { shortAddr } from "../lib/format";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import type { State } from "../types";

export function RevealScreen({ wallet }: { wallet: State }): JSX.Element {
  const { focusAccountId, clearError, showError } = usePopupContext();
  const { t, locale } = useT();
  const acc = wallet.accounts.find((a) => a.id === focusAccountId);
  const [password, setPassword] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);

  if (revealed) {
    return (
      <>
        <p id="reveal-hint" className="muted">
          {acc && isSigningOrWatch(acc) ? `${acc.label} · ${shortAddr(acc.publicKeyBase58)}` : ""}
        </p>
        <div id="reveal-secret-block">
          <div className="secret-card">
            <div className="secret-value-row">
              <div className="secret-value" id="reveal-secret-text">
                {revealed}
              </div>
              <button
                type="button"
                className="icon-btn primary ghost-inline"
                id="btn-copy-secret"
                title={t("accounts.copyPrivateKey")}
                aria-label={t("accounts.copyPrivateKey")}
                onClick={() => {
                  void navigator.clipboard.writeText(revealed);
                }}
              >
                <IconCopy size={18} />
              </button>
            </div>
          </div>
          <p className="muted small">{t("accounts.revealWarn")}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <p id="reveal-hint" className="muted">
        {acc && isSigningOrWatch(acc) ? `${acc.label} · ${shortAddr(acc.publicKeyBase58)}` : ""}
      </p>
      <div id="reveal-mask-block">
        <div className="secret-card">
          <div className="secret-mask">••••••••••••••••</div>
        </div>
        <div className="field">
          <label htmlFor="reveal-password">{t("accounts.walletPassword")}</label>
          <WalletPasswordInput id="reveal-password" value={password} onChange={setPassword} />
        </div>
        <button
          type="button"
          className="icon-btn primary"
          id="btn-reveal-submit"
          title={t("accounts.revealPrivateKey")}
          aria-label={t("accounts.revealPrivateKey")}
          onClick={async () => {
            clearError();
            if (!focusAccountId) return;
            const res = await sendExtensionRequest("wallet.exportAccountSecret", {
              accountId: focusAccountId,
              password,
            });
            if (!res.ok) {
              showError(apiErrorMessage(locale, res.error, "error.exportFailed"));
              return;
            }
            const { secretBase58 } = res.result as { secretBase58: string };
            setRevealed(secretBase58);
            setPassword("");
          }}
        >
          <IconEye size={18} />
        </button>
      </div>
    </>
  );
}
